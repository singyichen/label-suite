# ADR-008: Use Docker and Docker Compose for Containerization

**Status**: Accepted
**Date**: 2026-03-19

## Context

The system consists of multiple services: React frontend (Nginx-served static assets), FastAPI backend, Celery worker, PostgreSQL, and Redis. These services must be:

- **Reproducible**: any contributor can spin up the full stack without installing PostgreSQL or Redis locally.
- **Isolated**: service versions are pinned and do not conflict with the host system.
- **Demo-ready**: a Demo Paper must be launchable with a single command for presentation.
- **CI-compatible**: GitHub Actions can run integration tests against the same service configuration.

Key constraints:
- Solo developer — minimal infrastructure management overhead.
- No dedicated Kubernetes or cloud orchestration experience required.
- All services are stateful (PostgreSQL data volumes, Redis persistence) — container restart must preserve data.

### Candidates Evaluated

| Tool | Local Dev | CI | Complexity | Production Ready |
|------|:---------:|:--:|:----------:|:----------------:|
| **Docker + Docker Compose** | Excellent | Excellent | Low | Sufficient for MVP |
| Kubernetes (minikube) | Overkill | Medium | Very High | Enterprise |
| Podman Compose | Good | Good | Low | Comparable |
| Bare metal (system installs) | Poor | Poor | None | N/A |

**Kubernetes rejected**: Significant operational overhead (manifests, RBAC, ingress controllers, secrets management). Overkill for a single-developer research system at MVP stage. Docker images remain portable for future K8s migration.

**Podman rejected**: Rootless by default adds complexity for volume permissions. Docker is more widely documented for the FastAPI + Celery + Redis stack.

**Bare metal rejected**: Forces every contributor to manually install and configure PostgreSQL and Redis at matching versions. Non-reproducible across machines and CI.

## Decision

Use **Docker** for image builds and **Docker Compose** for local development and CI service orchestration.

```yaml
# docker-compose.yml — service overview
services:
  frontend:    # Nginx serving Vite build output
  backend:     # FastAPI (uvicorn)
  worker:      # Celery worker (same image as backend)
  postgres:    # PostgreSQL 16
  redis:       # Redis 7-alpine
```

### Environment Strategy

| Environment | Tool | Purpose |
|-------------|------|---------|
| Local development | `docker compose up` | Full stack with hot-reload |
| CI (GitHub Actions) | Service containers in workflow | PostgreSQL + Redis for integration tests |
| Production | Docker Compose or managed services | TBD in Phase 3 |

### Image Build Strategy

- **Backend + Worker**: Single multi-stage Dockerfile. `builder` stage installs deps via uv; `runtime` stage copies only what is needed (no build tools in production image).
- **Frontend**: Multi-stage Dockerfile. `builder` stage runs `pnpm build`; `runtime` stage is `nginx:alpine` serving `/dist`.
- **PostgreSQL + Redis**: Official Docker Hub images with pinned major versions (`postgres:16`, `redis:7-alpine`).

## Consequences

### Easier
- `docker compose up` starts the entire system (frontend, backend, worker, PostgreSQL, Redis) with a single command — ideal for Demo Paper presentations.
- Service versions are pinned in `docker-compose.yml` — no "works on my machine" issues.
- GitHub Actions native service containers (`services: postgres:`, `services: redis:`) reuse the same images used locally.
- Data volumes (`pgdata`, `redisdata`) persist across container restarts, preserving development state.
- Multi-stage Dockerfile keeps production images lean (~100–200 MB vs 1 GB+ with build tools).
- Docker images are portable — can be deployed to any cloud provider or switched to Kubernetes in the future without code changes.

### Harder
- All contributors must have Docker Desktop (or Docker Engine + Compose plugin) installed.
- Volume mounts on macOS/Windows can have slower file I/O than native — affects hot-reload speed.
- Local database migrations must be run inside the `backend` container (`docker compose exec backend uv run alembic upgrade head`).
- Multi-container logs require `docker compose logs -f` or a log aggregator to correlate.
