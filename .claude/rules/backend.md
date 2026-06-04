# Backend Rules

## Python Code Style

- All functions must have docstrings in English (`Args:`, `Returns:`, `Raises:`) with complete type hints
- Use pytest, not unittest; prefer f-strings over format()
- All commands via `uv run` (e.g., `uv run pytest`, `uv run uvicorn app.main:app --reload`)

## i18n (Response Messages)

See [ADR-026](docs/adr/026-i18n-two-layer-strategy.md) for full rationale.

- Backend owns all user-facing response message strings; never hardcode them inline in route handlers or services.
- Message strings live in `app/i18n/zh_TW/` and `app/i18n/en/` as Python dict constants or JSON files loaded at startup.
- Read the `Accept-Language` header on every request to select the language; fall back to `zh-TW` if the header is absent or unsupported.
- Supported languages: `zh-TW` (default) and `en`.
- The `detail` field in `ErrorResponse` must always reference an i18n key, never a raw English string literal.
- Integration tests for critical error paths must assert `detail` content in both `zh-TW` and `en`.
