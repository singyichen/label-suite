# Backend Rules

## Python Code Style

- All functions must have docstrings in English (`Args:`, `Returns:`, `Raises:`) with complete type hints
- Use pytest, not unittest; prefer f-strings over format()
- All commands via `uv run` (e.g., `uv run pytest`, `uv run uvicorn app.main:app --reload`)

## i18n (Response Messages)

See [ADR-026](docs/adr/026-i18n-two-layer-strategy.md) for full rationale.

- Backend owns all user-facing response message strings; never hardcode them inline in route handlers or services.
- Message strings live in `app/i18n/zh_TW/` and `app/i18n/en/` as Python dict constants or JSON files loaded at startup.
- Read the `Accept-Language` header on every request to select the language; if the header is absent or empty, use `zh-TW`; otherwise parse comma-separated language ranges — for each range extract the q-value (default `1.0` when absent), record any supported language explicitly rejected with q-value `0`, discard zero-quality ranges, then sort remaining ranges by descending q-value using header order as the tie-breaker; for each range in preference order, first try matching the full tag with hyphens replaced by underscores (e.g. `zh-TW` → `zh_TW`), and if not supported, try matching its primary subtag (e.g. `en-US` → `en`); return the first supported language found; if no acceptable supported range matches, fall back to `zh-TW` only when it was not explicitly rejected, otherwise fall back to `en` if it was not explicitly rejected; return `406 Not Acceptable` when every supported language was explicitly rejected.
- Supported languages: `zh-TW` (default) and `en`.
- The `detail` field in `ErrorResponse` must look up an i18n key and return the resolved localized text string, never a raw English string literal or an i18n key itself.
- Integration tests for critical error paths must assert `detail` content in both `zh-TW` and `en`.
