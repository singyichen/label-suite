# ADR-026: Two-Layer i18n Strategy — Frontend UI vs. Backend Response

**Status**: Accepted
**Date**: 2026-06-04

## Context

Label Suite targets multilingual users (zh-TW and en initially). Two distinct categories of user-facing strings exist in the system:

1. **Frontend UI strings** — labels, button text, page titles, client-side validation messages, empty states, and any text that lives entirely within the React application.
2. **Backend response messages** — the `detail` field in `ErrorResponse` and `SuccessResponse` payloads returned by the FastAPI API (e.g., "Task not found", "Annotation saved successfully").

Without a clear boundary, developers default to one of two anti-patterns:
- Putting backend `detail` strings into frontend locale files, requiring the frontend to pattern-match on message content to select a key — fragile and couples presentation to error text.
- Leaving backend messages in English only, breaking the UX for zh-TW users.

### Alternatives Considered

| Approach | Description | Rejected Reason |
|----------|-------------|-----------------|
| **Frontend-only i18n** | All strings managed by react-i18next; backend always returns English, frontend re-maps to locale key | Requires frontend to pattern-match backend error strings — brittle; backend business errors are not always predictable at build time |
| **Backend-only i18n** | Backend decides language for all strings including UI labels | Backend must be aware of UI copy — wrong separation of concerns |
| **Two-layer (selected)** | Frontend manages UI strings; backend manages response messages via `Accept-Language` | Clean boundary: each layer owns what it renders |

## Decision

Apply a **two-layer i18n strategy**:

### Layer 1 — Frontend UI Strings (react-i18next)

- Scope: All strings rendered directly by React components — labels, titles, button text, empty states, client-side validation messages, tooltip text.
- Implementation: `react-i18next` with namespaced keys per module (e.g. `t('task-management:config_builder.label_name')`).
- File paths: `frontend/src/locales/zh-TW/[module].json` and `frontend/src/locales/en/[module].json`.
- Rule: Frontend locale files must **not** contain copies of backend `detail` strings. Frontend displays backend `detail` content directly without re-mapping.

### Layer 2 — Backend Response Messages (Accept-Language)

- Scope: The `detail` field in `ErrorResponse` and any user-facing string returned in API response bodies. FastAPI's default 422 `RequestValidationError` responses are excluded from this contract — they produce Pydantic error objects with English `msg` values; register a custom localized `RequestValidationError` handler if 422 messages also need localization.
- Implementation: Backend reads the `Accept-Language` header on every request and selects the appropriate message string.
- Message strings are stored in a dedicated `app/i18n/` directory, organized by language code (`app/i18n/zh_TW/` and `app/i18n/en/`), as Python dict constants or `.json` files loaded at startup.
- Supported languages: `zh-TW` (default fallback) and `en`. The backend parses the `Accept-Language` header as follows: if the header is absent or empty, use `zh-TW`; otherwise split the header value by `,` to obtain language ranges; for each range, extract the q-value (default `1.0` when absent), record any supported language rejected with q-value `0` (including `*;q=0`, which rejects every supported language not explicitly accepted by a positive-quality range), discard zero-quality ranges, then sort remaining ranges by descending q-value, using original header order as the tie-breaker; for each range in preference order, first try matching the full tag with hyphens replaced by underscores (e.g. `zh-TW` → `zh_TW`), then try matching its primary subtag (e.g. `en-US` → `en`), and for wildcard `*`, choose the first supported language not rejected in default order (`zh-TW`, then `en`); return the first supported language found. If no acceptable supported range matches, fall back to `zh-TW` only when it was not rejected, otherwise fall back to `en` if it was not rejected; return `406 Not Acceptable` when every supported language was rejected.
- Rule: Business logic must **never** hardcode human-readable message strings inline. All user-facing strings must reference a key from `app/i18n/`.

### Frontend Rendering Contract

Frontend components treat backend `detail` as an opaque, pre-localized string and render it directly (e.g., in a toast or inline error). They do not attempt to translate, re-map, or look up a locale key for backend messages.

```typescript
// Correct — display backend detail directly
toast.error(error.response?.data?.detail)

// Wrong — do not attempt to map backend errors to frontend i18n keys
toast.error(t(`errors.${error.response?.data?.code}`))
```

## Consequences

### Easier

- Backend owns all business-logic error copy in one place; no coupling between frontend locale files and backend error text.
- Frontend locale files stay lean — only UI copy, no duplicated backend messages.
- Adding a new language requires updating `app/i18n/[lang]/` (backend) and `frontend/src/locales/[lang]/[module].json` (frontend) independently.
- AI agents generating backend error messages do not need to touch frontend locale files.

### Harder

- Backend developers must remember to add strings to `app/i18n/` rather than inlining them — enforced by `.claude/rules/backend.md`.
- The frontend `axios` instance must read the current `react-i18next` language and send it as the `Accept-Language` header on every request; relying on the browser's ambient header can cause a mismatch between the UI locale and the language of backend error messages (e.g. a user who switches the UI to English while the browser sends `zh-TW`).
- Integration tests for backend i18n must assert `detail` content in both `zh-TW` and `en` for critical error paths.
