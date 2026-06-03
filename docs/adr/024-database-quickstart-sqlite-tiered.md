# ADR-024: Tiered Database Strategy — SQLite for Quick Start, PostgreSQL for Production

**Status**: Accepted
**Date**: 2026-06-03
**Amends**: ADR-005 — quick-start scope only; ADR-005 PostgreSQL requirement remains binding for production deployments

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

- Not set → SQLite (`sqlite+aiosqlite:///./data/label_suite.db` — the `./data` directory must be mounted as a persistent Docker volume; both the `backend` and `worker` containers must mount the same volume path so writes from the Celery worker are visible to API reads)
- Set to `postgresql+asyncpg://...` → PostgreSQL (ADR-005 behavior)

`docker-compose.yml` will ship with SQLite as default (to be created in the implementation PR). A separate `docker-compose.prod.yml` will provide the full PostgreSQL stack with managed volumes.

`.env.example` will document both options with inline comments (to be updated in the implementation PR alongside `docker-compose.yml`).

## Consequences

### Easier

- New users reach a working system with a single command — no database provisioning required.
- CI can run lightweight tests against SQLite without spinning up a PostgreSQL service container (unit/integration split).
- Thesis Demo runs entirely from `docker compose up` — no infrastructure prerequisites for the professor.
- Open-source contributors can evaluate and submit PRs without a local PostgreSQL setup.

### Harder

- Application code must avoid PostgreSQL-specific features (JSONB operators, `array_agg`, etc.) in paths that must also work with SQLite. Use SQLAlchemy's database-agnostic abstractions; isolate any PostgreSQL-only queries behind a capability check.
- Two docker-compose files to maintain.
- Migration tooling (Alembic) must be tested against both dialects, utilizing batch operations (`with op.batch_alter_table`) to accommodate SQLite's limited `ALTER TABLE` capabilities; set `render_as_batch=True` in `env.py`.
- SQLite's lack of concurrent write support means the quick-start tier is explicitly **not recommended for multi-user production use** — this must be documented clearly in README.

### Out of Scope

- MySQL/MariaDB support is not planned (ADR-005 reasoning still applies).
- The SQLite tier does not support all features (e.g., full-text search via `tsvector` falls back to `LIKE` queries).
