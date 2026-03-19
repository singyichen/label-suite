# ADR-001: Modular Monorepo Structure

**Status**: Accepted
**Date**: 2026-03-19

## Context

During the project initialization phase, we evaluated whether the frontend (React + Vite) and backend (FastAPI) should be maintained as two separate repositories or co-located in a single monorepo.

Key factors specific to this project:
- **Team size**: Single developer (master's thesis), with occasional lab member contributions.
- **Deployment model**: All services (frontend, backend, PostgreSQL, Redis, Celery) are orchestrated via a single `docker-compose.yml`.
- **Project goal**: Demo Paper — the system must be demonstrated as a unified, working product reproducible with a single command.
- **Spec granularity**: Feature specs often span both frontend and backend; a single PR should capture the full stack change atomically.

### Candidates Evaluated

#### Option A — Modular Monorepo (selected)
Frontend and backend co-located under `frontend/` and `backend/` top-level directories. Docker Compose in the root references both services directly. CI uses `hashFiles()` guards to run layer-specific jobs conditionally.

#### Option B — Two Separate Repositories
Each layer lives in its own repo, coordinated via submodules or separate clones. Docker Compose must reference external repos. PRs for cross-layer changes are split across two repos.

#### Option C — Full Monorepo Tooling (Nx, Turborepo)
Adds a dedicated build orchestration layer for managing multiple packages. Designed for large teams with shared packages and independent publish cycles.

## Decision

Use a **Modular Monorepo**: frontend and backend co-located in a single repository under clearly separated top-level directories.

```
label-eval-portal/          ← single repository
├── frontend/               ← React + TypeScript + Vite
├── backend/                ← FastAPI (Python)
├── docker-compose.yml      ← unified service orchestration
├── specs/                  ← cross-layer feature specs
└── .github/workflows/      ← single CI pipeline (conditional per layer)
```

## Consequences

### Easier
- A single `git clone` gives contributors the entire system.
- Feature branches and PRs capture full-stack changes atomically — no cross-repo coordination.
- `docker compose up` reproduces the full environment with one command — ideal for Demo Paper demonstrations.
- CI jobs are conditional (`if: hashFiles('backend/pyproject.toml') != ''`) so layers can be added incrementally without breaking existing checks.
- Feature specs in `specs/` can reference both frontend and backend requirements in one document.

### Harder
- The repository includes both Python and TypeScript tooling; contributors must be aware of which subdirectory their commands apply to.
- CI run time will grow as both layers mature (mitigated by `concurrency` cancel-in-progress).

### Alternatives Rejected

| Option | Reason Rejected |
|---|---|
| Two separate repositories | Cross-repo PR coordination, Docker Compose submodule complexity — no benefit at solo-developer scale |
| Nx / Turborepo | YAGNI — overkill for two layers with no shared packages |
