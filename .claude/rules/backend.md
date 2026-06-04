# Backend Rules

## Python Code Style

- All functions must have docstrings in English (`Args:`, `Returns:`, `Raises:`) with complete type hints
- Use pytest, not unittest; prefer f-strings over format()
- All commands via `uv run` (e.g., `uv run pytest`, `uv run uvicorn app.main:app --reload`)

## i18n (Response Messages)

See [ADR-026](docs/adr/026-i18n-two-layer-strategy.md) for full rationale.

- Backend owns all user-facing response message strings; never hardcode them inline in route handlers or services.
- Message strings live in `app/i18n/zh_TW/` and `app/i18n/en/` as Python dict constants or JSON files loaded at startup.
- Read the `Accept-Language` header on every request to select the language; parse comma-separated language ranges — for each range extract the q-value (default `1.0` when absent), then sort by descending q-value using header order as the tie-breaker; for each range in preference order, use the primary subtag (e.g. `en-US` → `en`), replace hyphens with underscores (e.g. `zh-TW` → `zh_TW`), and return the first supported language; fall back to `zh-TW` if the header is absent, empty, or no range matches.
- Supported languages: `zh-TW` (default) and `en`.
- The `detail` field in `ErrorResponse` must look up an i18n key and return the resolved localized text string, never a raw English string literal or an i18n key itself.
- Integration tests for critical error paths must assert `detail` content in both `zh-TW` and `en`.
