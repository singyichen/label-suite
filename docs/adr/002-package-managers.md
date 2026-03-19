# ADR-002: Package Managers — uv (Backend) + pnpm (Frontend)

**Status**: Accepted
**Date**: 2026-03-19

## Context

The project has two separate language runtimes — Python (backend) and Node.js (frontend) — each requiring a dedicated package manager. The choices directly affect developer experience, CI speed, and reproducibility.

### Backend Package Manager Candidates

| Tool | Speed | Lockfile | PEP 621 | `uv run` | Notes |
|------|:-----:|:--------:|:-------:|:--------:|-------|
| **uv** | Fastest (Rust) | `uv.lock` | Native | Yes | CNCF emerging, 2024 |
| pip + venv | Slow | None | Manual | No | No lockfile by default |
| Poetry | Medium | `poetry.lock` | Partial | No | Own format, heavier |
| Pipenv | Slow | `Pipfile.lock` | No | No | Largely superseded |

Key requirements: fast CI, reproducible lockfile, `pyproject.toml` PEP 621 compatibility, `uv run` for one-liner commands without activating a venv.

### Frontend Package Manager Candidates

| Tool | Speed | Disk Usage | Strict Mode | Workspaces | Notes |
|------|:-----:|:----------:|:-----------:|:----------:|-------|
| **pnpm** | Fast | Minimal (symlinks) | Yes | Yes | Hard links, no phantom deps |
| npm | Medium | Large | No | Yes | Default, no strict resolution |
| yarn | Fast | Medium | Partial | Yes | Two major versions (classic/berry) |
| bun | Fastest | Minimal | Partial | Partial | Still maturing |

Key requirements: fast installs, strict dependency resolution (no phantom dependencies), reliable lockfile (`pnpm-lock.yaml`).

## Decision

- **Backend**: Use **uv** as the Python package manager.
- **Frontend**: Use **pnpm** as the Node.js package manager.

```bash
# Backend — all Python commands run via uv
uv sync --dev
uv run uvicorn app.main:app --reload
uv run pytest
uv add <package>          # install production dependency
uv add --dev <package>    # install dev dependency

# Frontend — all Node commands run via pnpm
pnpm install
pnpm dev
pnpm build
pnpm add <package>
pnpm add -D <package>
```

## Consequences

### Easier
- `uv` resolves and installs dependencies 10–100× faster than pip/poetry — CI caching with `astral-sh/setup-uv@v5` is straightforward.
- `uv run` eliminates the need to activate a virtual environment in scripts and CI steps.
- `uv.lock` provides deterministic, reproducible builds without extra tooling.
- `pnpm` strict resolution catches phantom dependencies that npm silently allows.
- `pnpm-lock.yaml` is reliable for caching in CI (`pnpm/action-setup@v4`).
- Both tools are widely adopted and well-documented.

### Harder
- Contributors must install uv separately (`curl -LsSf https://astral.sh/uv/install.sh | sh`).
- Two package managers in one repo — contributors must remember to use `uv add` (not `pip install`) and `pnpm add` (not `npm install`).
- uv is relatively new (2024); some CI providers may need explicit setup.
