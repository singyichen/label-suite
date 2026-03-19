# ADR-005: Use PostgreSQL as Primary Database

**Status**: Accepted
**Date**: 2026-03-19

## Context

The system stores annotation tasks, user submissions, evaluation results, and leaderboard data. Key requirements:

- Relational data model with foreign keys (tasks → submissions → scores → leaderboard).
- ACID transactions to ensure scoring integrity — a partial write must not corrupt leaderboard rankings.
- JSON/JSONB support for flexible task configuration storage (Config-driven architecture).
- Sufficient query capability for aggregation (leaderboard ranking, inter-annotator agreement).
- Compatible with the Python backend (SQLAlchemy async + asyncpg).
- Self-hostable via Docker for local development and production.

### Candidates Evaluated

| Database | ACID | JSONB | Async Python | Docker | Maturity |
|----------|:----:|:-----:|:------------:|:------:|:--------:|
| **PostgreSQL** | Full | Native | asyncpg | Official | Very High |
| MySQL / MariaDB | Full | Limited | aiomysql | Official | Very High |
| SQLite | Full | No | aiosqlite | N/A | Very High |
| MongoDB | Document | Native | motor | Official | High |

**MySQL rejected**: JSONB support is weaker (JSON type, no indexing parity). Row-level locking semantics differ. Less natural fit with SQLAlchemy's PostgreSQL-specific features.

**SQLite rejected**: Not suitable for concurrent multi-annotator writes. No server mode for multi-container deployment. Lacks JSONB and advanced indexing.

**MongoDB rejected**: Document model introduces schema-less complexity that conflicts with the strict relational structure of tasks → submissions → scores. Weaker transaction guarantees across collections.

## Decision

Use **PostgreSQL 16** as the primary relational database.

Supporting libraries:
- `asyncpg`: High-performance async PostgreSQL driver.
- `SQLAlchemy 2.0`: ORM with full async support and PostgreSQL-specific JSONB types.
- `Alembic`: Pure Python database migrations (autogenerate from SQLAlchemy models).

Key schema design decisions:
- Task configuration stored as `JSONB` — enables Config-driven template flexibility without schema changes per task type.
- Evaluation results stored with checksums to detect corruption.
- Test-set answers stored in a separate, access-controlled table (Data Fairness principle).

## Consequences

### Easier
- JSONB columns allow task configs (label types, evaluation metrics, display settings) to be stored and queried flexibly without schema migrations per new task type.
- ACID transactions ensure leaderboard updates are atomic — no partial state visible to users.
- `asyncpg` driver provides high-throughput async queries, compatible with FastAPI and SQLAlchemy 2.0 async sessions.
- Alembic autogenerate simplifies schema migrations — models are the single source of truth.
- PostgreSQL is the team's existing production experience — no learning curve.
- Docker image (`postgres:16`) provides a consistent, isolated environment for local development and CI.

### Harder
- Requires a running PostgreSQL instance in all environments (local, CI, production) — handled via Docker Compose and GitHub Actions service containers.
- JSONB flexibility can lead to inconsistent task configs if schema validation is not enforced at the application layer (enforced via Pydantic schemas).
- Alembic migrations must be run as a deployment step — requires careful sequencing in CI/CD.
