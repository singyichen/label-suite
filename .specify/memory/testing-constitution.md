# Testing Constitution

Source of truth: `.specify/memory/constitution.md`, `docs/adr/003-backend-framework-fastapi.md`, `docs/adr/004-frontend-framework-react-vite.md`, `docs/adr/005-database-postgresql.md`, `docs/adr/006-caching-queue-redis.md`, `docs/adr/007-async-tasks-celery.md`, `docs/adr/009-testing-strategy.md`, `docs/adr/010-config-driven-architecture.md`, `docs/adr/012-frontend-testing-strategy.md`, and `docs/adr/014-prototype-playwright-testing.md`.

## I. Mandatory TDD

All behavior changes must follow Red-Green-Refactor.

1. Red: write a failing test that defines the expected behavior.
2. Green: implement the minimum code required to pass.
3. Refactor: improve structure while keeping all tests green.

No implementation may be considered complete unless the failing test was written and run before implementation. Bug fixes, new features, frontend components, backend services, API routes, scoring logic, security controls, and prototype behavior all require test-first development.

## II. Testable MVP Scope

- Test the smallest behavior that proves the current requirement, risk, or acceptance criterion.
- Do not add broad test infrastructure, generated matrices, or long end-to-end suites before they protect a real MVP path.
- Prefer unit and component tests for narrow logic; use integration and E2E tests only when they prove cross-boundary behavior.
- Every required test must have a clear failure reason tied to a spec, ADR, security invariant, or regression.
- Test data and fixtures must stay minimal, readable, and specific to the behavior under test.

## III. Backend Tests

- Backend tests must use pytest, pytest-asyncio, httpx, and pytest-cov.
- Unit tests cover scoring, validation, config parsing, and pure services.
- Integration tests cover FastAPI routes using `httpx.AsyncClient`.
- Async tests cover database, Redis, and Celery-facing behavior where applicable.
- Security tests cover all annotator-facing responses.
- Backend tests must not mock away FastAPI request/response validation, Pydantic schemas, or authorization boundaries.

## IV. Frontend Component Tests

- Frontend component and hook tests must use Vitest, React Testing Library, `@testing-library/user-event`, `@testing-library/jest-dom`, and MSW.
- Tests are co-located with source as `*.test.ts` or `*.test.tsx`.
- Component tests use real rendering and user interactions.
- HTTP calls are intercepted with MSW; do not mock internal API clients.
- Each test gets an isolated TanStack Query client.
- Tests must cover loading, success, empty, error, disabled, and permission-denied states where those states exist.
- Config-driven task widgets must be tested by config input, not by hardcoded task-type branches.

## V. Frontend E2E Tests

- Frontend E2E tests must use Playwright under `frontend/tests/`.
- Required coverage includes account login/profile flows, project leader task lifecycle, annotator dry-run and official annotation flows, reviewer audit and quality report flows, super admin user management, role-based access denial, direct URL access boundaries, empty states, and task status machine transitions.
- E2E tests should use role fixtures and deterministic API routing or seeded data.
- E2E tests must assert observable user behavior, not implementation details.

## VI. Prototype Tests

- Prototype-layer tests must use Playwright under `design/prototype/tests/`.
- Each prototype test maps to a spec acceptance criterion.
- Tests use `data-testid` selectors as the shared contract for prototype, React implementation, and frontend E2E.
- Navigation tests must assert both URL and HTTP response status.
- Prototype tests cover static HTML behavior only: UI presence, validation, simulated states, navigation, i18n toggles, and responsive layout.
- Backend-dependent scenarios are out of scope at this layer and must be covered by frontend E2E or backend tests.

## VII. Security Leakage Tests

- Every annotator-facing API response must have a security test proving ground-truth answers are absent.
- Leakage tests must be marked `@pytest.mark.security`.
- Tests must recursively inspect response JSON, including nested objects and arrays.
- Forbidden fields include ground-truth answer fields such as `answer`, `answers`, `ground_truth`, `gold_label`, `expected_label`, `correct_label`, `solution`, and equivalent schema fields.
- Test-set answers may be read only inside authorized scoring worker paths.
- Submission, assignment, task detail, annotation item, leaderboard, and status APIs must never expose hidden answers to annotators.

## VIII. Config-Driven Coverage

- Tests must prove behavior is derived from task config.
- Adding a task type must require adding config and test data, not modifying core branching logic.
- Tests must cover invalid config rejection through Pydantic validation.
- Scoring metric tests must exercise registry-based lookup.
- Tests must fail if service code introduces task-type-specific conditionals in core paths.

## IX. Coverage Thresholds

- Backend overall coverage must be at least 80%.
- Backend scoring engine coverage must be at least 90%.
- Security leakage acceptance criteria require 100% coverage.
- Frontend changed components and hooks require meaningful branch and state coverage for all changed behavior.
- Prototype changed pages require a Playwright test for every changed acceptance criterion.
- E2E coverage must include all P1 user journeys before merge.
- Lowering thresholds requires an explicit constitution or ADR update.

## X. Fixtures And Test Data Isolation

- Tests must be independent, deterministic, and order-agnostic.
- Backend tests use isolated fixtures, factories, transactions, or disposable test records.
- Tests must never read or mutate production data.
- PostgreSQL, Redis, and Celery test state must be isolated per test or reset between tests.
- Frontend component tests must reset MSW handlers and query cache after each test.
- Playwright tests must use isolated browser contexts and role-specific storage state.
- Test data must clearly distinguish public annotation data from hidden test-set answers.

## XI. CI And Reporting

- CI must run tests in layers with clear failure reporting.
- Backend checks include `uv run pytest`, coverage, security marker support, `uv run ruff check .`, and `uv run mypy .`.
- Frontend checks include `pnpm tsc --noEmit`, `pnpm lint`, Vitest, and Playwright.
- Prototype checks include Playwright tests from `design/prototype/`.
- Security leakage tests must be blocking.
- Test reports, coverage reports, and Playwright traces/screenshots must be retained for failed CI runs.
- No PR may merge with failing tests, skipped required security tests, or unexplained coverage regression.

## XII. Required Commands

Backend commands, run from `backend/`:

```bash
uv run pytest
uv run pytest -m security
uv run pytest --cov=app --cov-report=term-missing
uv run ruff check .
uv run mypy .
```

Frontend commands, run from `frontend/`:

```bash
pnpm test
pnpm tsc --noEmit
pnpm lint
pnpm playwright test
```

Prototype commands, run from `design/prototype/`:

```bash
pnpm test
pnpm playwright test
pnpm playwright test --headed
```

## XIII. Merge Gate

A change is test-complete only when Red-Green-Refactor evidence exists in local or PR history, all relevant backend/frontend/prototype/security/E2E tests pass, coverage thresholds are met, no debug `print` or `console.log` remains, and `/speckit.analyze` findings are resolved before PR creation.
