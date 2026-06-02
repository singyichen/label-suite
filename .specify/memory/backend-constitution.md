# Backend Constitution — Tool Cache

> **This file is a tool cache, NOT the source of truth.**
>
> Source of truth: `specs/_governance/constitution.md` and `specs/_governance/backend-constitution.md`
>
> When amending, always edit the source file in `specs/_governance/` first, then copy the full content here.

Source of truth: `specs/_governance/constitution.md`, `specs/_governance/backend-constitution.md`, `docs/adr/001-monorepo-structure.md`, `docs/adr/002-package-managers.md`, `docs/adr/003-backend-framework-fastapi.md`, `docs/adr/005-database-postgresql.md`, `docs/adr/006-caching-queue-redis.md`, `docs/adr/007-async-tasks-celery.md`, `docs/adr/008-containerization-docker-compose.md`, `docs/adr/009-testing-strategy.md`, `docs/adr/010-config-driven-architecture.md`, and `docs/adr/013-email-service-resend.md`.

## I. Backend Stack

- Backend code lives under `backend/` in the modular monorepo.
- FastAPI is the backend framework.
- Request, response, task config, and external payload validation use Pydantic v2.
- Persistence uses PostgreSQL 16, async SQLAlchemy 2.0, asyncpg, and Alembic.
- Redis 7 is used for the Celery broker, Celery result backend, and application cache.
- Celery is used for background scoring and scheduled backend jobs.
- Docker Compose is the standard local orchestration model.
- Replacing any accepted backend technology requires an ADR update and constitution review.

## II. MVP And Simplicity

- Build the smallest backend behavior that satisfies the current spec and acceptance criteria.
- Do not add services, queues, tables, abstractions, or extension points for hypothetical future needs.
- Prefer direct service functions and explicit schemas until repeated real use justifies abstraction.
- Every backend rule must be testable through a unit, integration, contract, security, or performance test.
- Operational complexity must stay appropriate for a single-developer research MVP unless a spec or ADR requires more.

## III. FastAPI API Design

- Route handlers must be `async def` unless there is a documented reason not to.
- Blocking I/O must not run in request handlers.
- Routes must use FastAPI dependency injection for database sessions, authentication, authorization, and settings.
- Endpoints must follow REST semantics: correct HTTP methods, stable resource names, explicit status codes, and structured error responses.
- OpenAPI output is an API contract. Public schema changes must be intentional, reviewed, and tested.
- Every public endpoint must be represented in OpenAPI/Swagger with request bodies, response bodies, query parameters, path parameters, headers, auth requirements, and error responses.
- API contracts must define enum values, nullable fields, default values, validation constraints, pagination shape, and error schema.
- API behavior changes require contract updates in the same change.
- Annotator-facing API responses must never expose test-set answers, ground truth, hidden labels, scoring keys, answer file paths, or equivalent privileged data.

## IV. Pydantic Contracts

- Every request body, response body, task config, and external service payload must have an explicit Pydantic v2 model.
- Pydantic models are the validation boundary between external input and service logic.
- Use field constraints, `model_config`, validators, typed enums, and discriminated unions when they make invalid states unrepresentable.
- Do not pass untyped dictionaries through validated domain logic except at the PostgreSQL JSONB storage boundary.
- Response models must exclude sensitive fields by construction, not by caller discipline.

## V. Config-Driven Architecture

- Task behavior must be derived from validated JSON/YAML config stored as PostgreSQL JSONB.
- Core backend code must not contain task-specific branches such as `if task_type == "..."`.
- Adding a new task type must not require modifying core routing, persistence, scoring orchestration, or annotation logic.
- Task config must be validated by Pydantic before persistence.
- Evaluation metrics must be selected through a registry, not inlined into task-specific service branches.
- JSONB flexibility must be constrained by schemas, resource limits, and tests.

## VI. Database And Transactions

- Use async SQLAlchemy 2.0 sessions and PostgreSQL-native capabilities where appropriate.
- Writes that affect submissions, scoring, or leaderboard state must be transactional.
- Alembic migrations are required for schema changes.
- Database migration tasks must be split into three sequential tasks: `upgrade()`, `downgrade()` with no `pass`, and roundtrip verification.
- Database migration PRs must be independent from application code PRs. A migration must never be bundled with route, service, schema, or frontend changes.
- Every migration PR description must include a Rollback Plan section documenting expected state before and after rollback.
- Foreign key constraints must exist for relationships between core entities.
- Uniqueness invariants, such as one submission per annotator per item, must be enforced by database unique constraints.
- Multi-step mutations that must succeed or fail as a unit must execute within a database transaction.
- Conflicting concurrent updates must be prevented by optimistic or pessimistic locks or explicit conflict checks.
- Migrations that add constraints must include validation or a backfill strategy for existing data.
- Test-set answers must be stored separately from annotator-facing task data and protected by access control.
- List endpoints must be paginated with a maximum page size of 100.
- Service-layer code must avoid N+1 queries and unbounded database scans.
- Add indexes for filtering, joining, leaderboard ranking, task lookup, and JSONB access patterns when required by query behavior.

## VII. Redis And Celery

- Celery handles scoring, leaderboard refresh, cleanup, and other work that must not block API responses.
- FastAPI routes may enqueue Celery tasks directly with `.delay()` for Redis-backed dispatch.
- Celery tasks must define retry policy, timeout, idempotency expectations, and observable status.
- Long-running jobs must be retryable or resumable without corrupting state.
- Background jobs must record attempt history with attempt number, start time, status, error if any, and duration.
- Scoring workers may access hidden test-set answers; API routes must not return them.
- Redis DB usage must remain logically separated: broker, result backend, and application cache.
- Shared Redis must not rely on global `maxmemory` eviction for cache control; every cache key must have an explicit TTL.
- Cache misses and Redis outages must degrade gracefully to database-backed behavior where feasible.
- Cache keys for user-scoped, role-scoped, task-scoped, dataset-scoped, or schema-scoped data must include those boundary identifiers.
- Test-set answers, scoring internals, and private dataset fields must not enter any shared or client-visible cache layer.
- Logout, role change, schema publish, annotation submission, review completion, assignment change, import completion, and export completion must invalidate or bypass affected cache entries.
- Permission-sensitive responses must not be served from cache without live authorization validation or a short TTL with a defined invalidation trigger.
- Cache behavior must be documented for cached resources.

## VIII. Security

- No hardcoded secrets, tokens, database URLs, email credentials, or API keys.
- `RESEND_API_KEY` and all credentials must come from environment-backed settings.
- CORS must list explicit origins; wildcard origins are forbidden.
- Authentication and authorization checks must be enforced at route or dependency boundaries.
- Password reset tokens must be single-use, time-limited, and protected according to implementation risk.
- Security tests must cover every annotator-facing response that could leak hidden answers.
- Logs must not contain secrets, reset tokens, raw answer keys, ground truth, or sensitive user data.

## IX. Logging And Observability

- Use structured logging for API requests, Celery tasks, scoring lifecycle events, cache failures, and external email delivery failures.
- Every HTTP request must generate or propagate a `request_id` or `correlation_id`; this identifier must appear in logs for that request.
- Correlation identifiers must be included in API error responses to enable client-side support escalation.
- Long-running operations must be queryable by correlation ID where practical.
- Exceptions must be logged with actionable context without leaking sensitive payloads.
- Debug `print()` statements are forbidden in committed backend code.
- Celery task failures must be visible through logs and task status APIs.

## X. Testing And TDD

- Backend changes follow Red-Green-Refactor: write the failing test first, confirm failure, implement, then refactor.
- Use pytest, pytest-asyncio, httpx, and pytest-cov for backend tests.
- General backend coverage target is at least 80%.
- Scoring engine coverage target is at least 90%.
- Leakage prevention security acceptance criteria require complete test coverage.
- Security tests for answer leakage must use `@pytest.mark.security`.
- Integration tests must cover FastAPI routes with PostgreSQL and Redis where behavior depends on them.
- Contract tests are required for public API schema changes.

## XI. Performance

- Core labeling and annotation API operations must target P95 response time of 500ms or less.
- Expensive scoring must run in Celery, not synchronously in API requests.
- Leaderboard and scoring-result reads should use bounded Redis caching with explicit TTLs.
- All list endpoints require pagination and bounded page sizes.
- Service-layer queries must be reviewed for N+1 patterns, missing indexes, and excessive JSONB scans.
- Config-driven flexibility must not permit unbounded metric execution, unlimited payload sizes, or uncontrolled worker runtime.

## XII. Backend Consistency And Domain Lifecycle

- Mutating endpoints must define idempotency, duplicate-submit behavior, or conflict behavior explicitly.
- Partial failures must leave data in a valid, recoverable state.
- Race-prone backend flows must include tests covering duplicate requests, concurrent updates, and retries.
- The following entities must have documented canonical states and valid transitions: task, batch, annotation item, annotation, review, adjudication, export, and dataset version.
- Invalid state transitions must be rejected at the service layer; UI button visibility is not a substitute for server-side enforcement.
- Each state transition must document permitted actors, authorization requirements, side effects, audit log event, and rollback or retry behavior.

## XIII. PR Boundaries

- Backend layer concerns must be split into separate PRs: Pydantic schemas, ORM models, service logic, and API routes are each distinct review units.
- Database migrations are always standalone PRs.
- Backend and frontend PRs must be independent when no breaking API contract change is involved.
- When a breaking API contract change does occur, backend and frontend PRs must cross-reference each other.

## XIV. Commands

All backend Python commands must run through `uv` from `backend/`.

```bash
uv sync --dev
uv run uvicorn app.main:app --reload
uv run pytest
uv run pytest -m security
uv run ruff check .
uv run ruff format .
uv run mypy .
uv run alembic upgrade head
uv add <package>
uv add --dev <package>
```

Do not use `pip install`. Do not modify package versions unless explicitly requested. Use Docker Compose when PostgreSQL, Redis, backend, and worker coordination is required.

## XV. Governance

This backend constitution refines but does not override `.specify/memory/constitution.md`. If this file conflicts with the main constitution, the main constitution wins. Backend architectural changes require SDD unless they are bug fixes matching existing specs. ADRs are binding until superseded by a newer accepted ADR.
