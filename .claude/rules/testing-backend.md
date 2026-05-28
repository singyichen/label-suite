# Testing Rules — Backend

## General

- TDD is required: write the failing test before writing implementation code
- Test files mirror source structure: `tests/[module]/test_[file].py`
- One assertion per logical behaviour; group related assertions in a single test only when they share setup

## Backend (pytest)

- Use `pytest` fixtures for all shared setup; avoid `setUp`/`tearDown` patterns
- Database tests must use a real test DB (no mocking the ORM layer) — see `tests/conftest.py` for the session fixture
- Use `pytest-asyncio` for async route/service tests
- Factory helpers go in `tests/factories/`; never inline large data construction in test bodies
- Mark slow/integration tests with `@pytest.mark.integration` so they can be skipped in fast runs

## Coverage

- New code must not decrease overall coverage
- Critical paths (auth, permission checks, score calculation) require ≥ 90% branch coverage
- Coverage report: `uv run pytest --cov=app tests/`
