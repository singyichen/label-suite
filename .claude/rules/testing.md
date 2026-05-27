# Testing Rules

## General

- TDD is required: write the failing test before writing implementation code
- Test files mirror source structure: `tests/[module]/test_[file].py` (backend), `src/[module]/__tests__/[file].test.tsx` (frontend)
- One assertion per logical behaviour; group related assertions in a single test only when they share setup

## Backend (pytest)

- Use `pytest` fixtures for all shared setup; avoid `setUp`/`tearDown` patterns
- Database tests must use a real test DB (no mocking the ORM layer) — see `tests/conftest.py` for the session fixture
- Use `pytest-asyncio` for async route/service tests
- Factory helpers go in `tests/factories/`; never inline large data construction in test bodies
- Mark slow/integration tests with `@pytest.mark.integration` so they can be skipped in fast runs

## Frontend (Vitest + Testing Library)

- Test behaviour, not implementation: query by role/label/text, not by CSS class or internal state
- Mock only at the network boundary (`msw` handlers); never mock React components or hooks directly
- Avoid `act()` wrappers manually — use `userEvent` which handles it automatically
- Snapshot tests are banned; they break silently and carry no intent

## E2E (Playwright)

- E2E tests live in `e2e/` at the repo root; mirror page structure: `e2e/[module]/[page].spec.ts`
- Each spec covers one user journey end-to-end (login → action → assertion); don't mix journeys
- Use `page.getByRole()` / `page.getByLabel()` / `page.getByText()` — never CSS selectors or `data-testid` unless no semantic alternative exists
- Shared auth state: use `storageState` fixtures to avoid re-logging in on every test
- Never hard-code `localhost` ports; read from `playwright.config.ts` `baseURL`
- Run with: `pnpm exec playwright test` (headed: add `--headed`; specific file: append the path)

## Coverage

- New code must not decrease overall coverage
- Critical paths (auth, permission checks, score calculation) require ≥ 90% branch coverage
- Coverage reports: `uv run pytest --cov=app tests/` (backend) · `pnpm test --coverage` (frontend)
