# ADR-024: Tiered Database Strategy — SQLite for Quick Start, PostgreSQL for Production

**Status**: Accepted
**Date**: 2026-06-03
**Amends**: ADR-005 — quick-start scope only; ADR-005 PostgreSQL requirement remains binding for production deployments
**Amends**: ADR-001 — root `docker-compose.yml` no longer starts PostgreSQL by default; the ADR-001 single-compose full-stack model is preserved in `docker-compose.prod.yml`
**Amends**: ADR-008 — local `docker-compose.yml` default changes from PostgreSQL to SQLite; `docker-compose.prod.yml` preserves the ADR-008 full PostgreSQL stack

## Context

ADR-005 established PostgreSQL as the primary database for production use. However, requiring a running PostgreSQL instance creates friction for new users evaluating the project or running a local demo.

The project will be open-sourced. A core open-source DX goal is: **clone → `docker compose up` → working system in under 3 minutes**, with zero manual database setup.

Key tension:

- PostgreSQL (ADR-005): correct for production, concurrent multi-user, JSONB, ACID
- SQLite: zero-config, file-based, ideal for single-user demo and quick evaluation

### Reference

Label Studio (the most comparable open-source NLP labeling tool) uses the same tiered approach: SQLite by default, PostgreSQL as an opt-in upgrade via environment variable.

## Decision

Support two database tiers via environment configuration:

| Tier | Database | Target Use Case | How to Activate |
|------|----------|----------------|-----------------|
| **Quick Start** | SQLite | Local demo, single user, evaluation | Default (no config needed) |
| **Production** | PostgreSQL | Multi-user, concurrent writes, deployment | Set `DATABASE_URL` env var |

The application detects which tier to use based on the `DATABASE_URL` environment variable:

- Not set → SQLite:
  - **FastAPI (async):** `sqlite+aiosqlite:///./data/label_suite.db`
  - **Celery worker (sync):** `sqlite:///./data/label_suite.db` — the worker derives a sync URL by stripping the `+aiosqlite` scheme prefix, because Celery runs in synchronous Python threads and cannot use an async engine (foundation spec constraint)
  - The `./data` directory must be mounted as a persistent Docker volume; both the `backend` and `worker` containers must mount the same volume path so writes from the Celery worker are visible to API reads
- Set to `postgresql+asyncpg://...` → PostgreSQL (ADR-005 behavior); the worker derives `postgresql+psycopg2://...` the same way

Implementation PRs must add the required runtime drivers with the database configuration change:

- `aiosqlite` for the FastAPI async SQLite engine.
- `psycopg2`/`psycopg2-binary` for the synchronous PostgreSQL worker engine. ADR-005's existing `asyncpg` dependency remains required for the FastAPI async PostgreSQL engine.

`docker-compose.yml` will ship with SQLite as default (to be created in the implementation PR). A separate `docker-compose.prod.yml` will provide the full PostgreSQL stack with managed volumes and PostgreSQL monitoring (postgres-exporter, saturation alerts per foundation spec). The SQLite quick-start compose file substitutes a filesystem health check for the database — PostgreSQL monitoring requirements from the foundation spec apply to the production profile (`docker-compose.prod.yml`) only.

`.env.example` will document both options with inline comments (to be updated in the implementation PR alongside `docker-compose.yml`).

## Repo Directory Structure

The following repo-root layout ships with this tiered strategy. Implementation PRs must create these files before `docker compose up` can be used as the bootstrap command.

```text
label-suite/
├── backend/
│   ├── Dockerfile              # FastAPI production image
│   ├── Dockerfile.dev          # Development image with hot reload
│   └── app/                    # FastAPI source (created during implementation)
├── frontend/
│   ├── Dockerfile              # React production image (build + nginx static serving)
│   ├── Dockerfile.dev          # Development image (Vite dev server)
│   └── src/                    # React source (created during implementation)
├── nginx/
│   └── nginx.conf              # Reverse proxy: / → frontend, /api → backend
├── data/                       # SQLite database mount point (gitignored)
├── docker-compose.yml          # Quick start: SQLite, single command bootstrap
├── docker-compose.prod.yml     # Production: PostgreSQL + Redis
├── docker-compose.dev.yml      # Development: hot reload, source code mounts
├── .env.example                # Environment variable template with inline comments
└── README.md                   # Quick start instructions
```

## Consequences

### Easier

- New users reach a working system with a single command — no database provisioning required.
- CI can run lightweight *unit* tests against SQLite without spinning up a PostgreSQL service container. Integration tests (covering ORM behaviour, Alembic migrations, concurrent writes) must still use real PostgreSQL per foundation spec FR-031 — the two test tiers are complementary, not replacements for each other.
- Thesis Demo runs entirely from `docker compose up` — no infrastructure prerequisites for the professor.
- Open-source contributors can evaluate and submit PRs without a local PostgreSQL setup.

### Harder

- Application code must avoid PostgreSQL-specific features (JSONB operators, `array_agg`, etc.) in paths that must also work with SQLite. Use SQLAlchemy's database-agnostic abstractions; isolate any PostgreSQL-only queries behind a capability check.
- Two docker-compose files to maintain.
- Migration tooling (Alembic) must be tested against both dialects, utilizing batch operations (`with op.batch_alter_table`) to accommodate SQLite's limited `ALTER TABLE` capabilities; set `render_as_batch=True` in `env.py`.
- SQLite's lack of concurrent write support means the quick-start tier is explicitly **not recommended for multi-user production use** — this must be documented clearly in README.

### Dialect-Specific Paths

The following behaviors require explicit dialect-aware implementation. The SQLite quick-start tier accepts limited feature coverage because it targets single-user evaluation, not full-feature production use, but it must not weaken the foundation spec's data-integrity guarantees for background-job writes:

- **Atomic upsert (FR-083):** Celery background-job DB writes must remain atomic in both tiers. Use SQLAlchemy dialect detection to choose PostgreSQL `sqlalchemy.dialects.postgresql.insert().on_conflict_do_update()` / `on_conflict_do_nothing()` or SQLite `sqlalchemy.dialects.sqlite.insert().on_conflict_do_update()` / `on_conflict_do_nothing()`. Do not use `session.merge()` or check-then-act patterns in either tier.
- **JSONB task configs (ADR-010):** Declare the task config column with `JSON().with_variant(JSONB(), 'postgresql')` where `JSON` is from `sqlalchemy` and `JSONB` is from `sqlalchemy.dialects.postgresql`. On PostgreSQL this preserves JSONB storage and operators as required by ADR-010; on SQLite it maps to `TEXT`. JSONB-specific operators (e.g., `@>`, `#>>`) must be avoided in any code path that runs against the SQLite tier — use SQLAlchemy's dialect-agnostic JSON accessors instead.

### Out of Scope

- MySQL/MariaDB support is not planned (ADR-005 reasoning still applies).
- The SQLite tier does not support all features (e.g., full-text search via `tsvector` falls back to `LIKE` queries).
