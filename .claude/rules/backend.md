---
paths:
  - "backend/**"
---

# Backend Rules

## Python Code Style

- All functions must have docstrings in English (`Args:`, `Returns:`, `Raises:`) with complete type hints
- Use pytest, not unittest; prefer f-strings over format()
- All commands via `uv run` (e.g., `uv run pytest`, `uv run uvicorn app.main:app --reload`)

## i18n (Response Messages)

See [ADR-026](docs/adr/026-i18n-two-layer-strategy.md) for full rationale.

- Backend owns all user-facing response message strings; never hardcode them inline in route handlers or services.
- Message strings live in `app/i18n/zh_TW/` and `app/i18n/en/` as Python dict constants or JSON files loaded at startup.
- Read the `Accept-Language` header on every request to select the language; if the header is absent or empty, use `zh-TW`; otherwise parse comma-separated language ranges and extract each q-value (default `1.0` when absent). Use one matching function for both accepted and rejected ranges: normalize full tags by replacing hyphens with underscores (e.g. `zh-TW` → `zh_TW`), match exact supported tags first, then match primary ranges to supported regional tags with the same primary language (e.g. `zh` → `zh-TW`; `en-US` → `en`), and for wildcard `*`, choose supported languages in default order (`zh-TW`, then `en`). Build a rejected set from q-value `0` ranges using that same matching function; `*;q=0` rejects every supported language not explicitly accepted by a positive-quality range. Sort positive-quality ranges by descending q-value using header order as the tie-breaker, then return the first matched supported language that is not rejected. If no acceptable supported range matches, fall back to `zh-TW` only when it was not rejected, otherwise fall back to `en` if it was not rejected; return `406 Not Acceptable` when every supported language was rejected.
- Supported languages: `zh-TW` (default) and `en`.
- The `detail` field in `ErrorResponse` must look up an i18n key and return the resolved localized text string, never a raw English string literal or an i18n key itself.
- Integration tests for critical error paths must assert `detail` content in both `zh-TW` and `en`.
