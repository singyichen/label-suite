# ADR-001: Modular Monorepo Structure

**Status:** Accepted
**Date:** 2026-03-19
**Deciders:** Mandy (SingYi) Chen, Prof. Lung-Hao Lee (advisor)

---

## Context

During the project initialization phase, we evaluated whether the frontend (React) and backend (FastAPI) should be maintained as two separate repositories or co-located in a single monorepo.

The key factors specific to this project are:

- **Team size:** Single developer (master's thesis), with occasional lab member contributions
- **Deployment model:** All services (frontend, backend, PostgreSQL, Redis, Celery) are orchestrated via a single `docker-compose.yml`
- **Project goal:** Demo Paper — the system must be demonstrated as a unified, working product
- **Spec granularity:** Feature specs often span both frontend and backend; a single PR should capture the full change

---

## Decision

We adopt a **Modular Monorepo** structure: frontend and backend live in the same repository under clearly separated top-level directories (`frontend/`, `backend/`).

```
label-eval-portal/          ← single repository
├── frontend/               ← React + TypeScript
├── backend/                ← FastAPI (Python)
├── docker-compose.yml      ← unified service orchestration
├── specs/                  ← cross-layer feature specs
└── .github/workflows/      ← single CI pipeline (conditional per layer)
```

---

## Rationale

| Factor | Monorepo | Two Separate Repos |
|---|---|---|
| Team coordination | No cross-repo PR coordination needed | Requires syncing PRs across repos |
| Docker Compose | Single file references both services | Must reference external repos or submodules |
| Feature traceability | One PR covers full-stack change | Changes split across two PRs |
| CI complexity | Conditional jobs via `hashFiles()` | Separate pipelines to maintain |
| Demo / reproducibility | `docker compose up` starts everything | Requires cloning and coordinating two repos |
| Overhead for solo developer | Low | High |

**Splitting into two repos is justified when:** independent teams own each layer, the frontend and backend have different release cadences, or access control must differ between layers. None of these conditions apply to this project.

---

## Consequences

**Positive:**
- A single `git clone` gives contributors the entire system
- Feature branches and PRs capture full-stack changes atomically
- `docker compose up` reproduces the full environment with one command — ideal for Demo Paper demonstrations
- CI jobs are conditional (`if: hashFiles('backend/pyproject.toml') != ''`) so adding a layer later does not break existing checks

**Negative / Trade-offs:**
- The repository will grow to include both Python and TypeScript tooling; contributors must be aware of which subdirectory their commands apply to
- CI run time increases as both layers grow (mitigated by `concurrency` cancel-in-progress)

---

## Alternatives Considered

**Option B — Two separate repositories**
Rejected. Adds coordination overhead (cross-repo PRs, submodules or separate clones for Docker Compose) with no benefit at this team size and project scope.

**Option C — Full monorepo tooling (Nx, Turborepo)**
Rejected (YAGNI). A dedicated monorepo build tool is valuable when many packages share code or publish independently. This project has exactly two layers with no shared packages; simple directory separation is sufficient.
