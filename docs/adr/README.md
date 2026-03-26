# Architecture Decision Records (ADR)

This directory contains Architecture Decision Records for the Label Suite project.

## What is an ADR?

An ADR captures an important architectural decision along with its context and consequences. Each record is immutable once accepted — if a decision changes, a new ADR supersedes the old one.

## Format

Each ADR follows this structure:

- **Status**: Accepted / Proposed / Deprecated / Superseded
- **Context**: The forces at play, including technical, research, and project constraints.
- **Decision**: The change we are making.
- **Consequences**: What becomes easier or harder as a result (and alternatives rejected).

## Index

| ADR | Title | Status | Date |
|-----|-------|--------|------|
| [001](001-monorepo-structure.md) | Modular Monorepo Structure | Accepted | 2026-03-19 |
| [002](002-package-managers.md) | Package Managers — uv (Backend) + pnpm (Frontend) | Accepted | 2026-03-19 |
| [003](003-backend-framework-fastapi.md) | Use FastAPI as Backend Framework | Accepted | 2026-03-19 |
| [004](004-frontend-framework-react-vite.md) | Use React + Vite as Frontend Framework | Accepted | 2026-03-19 |
| [005](005-database-postgresql.md) | Use PostgreSQL as Primary Database | Accepted | 2026-03-19 |
| [006](006-caching-queue-redis.md) | Use Redis as Caching Layer and Message Broker | Accepted | 2026-03-19 |
| [007](007-async-tasks-celery.md) | Use Celery for Async Task Execution | Accepted | 2026-03-19 |
| [008](008-containerization-docker-compose.md) | Docker and Docker Compose for Containerization | Accepted | 2026-03-19 |
| [009](009-testing-strategy.md) | Testing Strategy — pytest + Playwright | Accepted | 2026-03-19 |
| [010](010-config-driven-architecture.md) | Config-Driven Task Architecture | Accepted | 2026-03-19 |
