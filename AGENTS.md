# Label Suite — Agent Rules

> Full context: [CLAUDE.md](CLAUDE.md) · Constitution: [.specify/memory/constitution.md](.specify/memory/constitution.md)

## Architecture Boundaries

```
frontend/src/features/[module]/    ← feature-owned; no cross-feature imports
frontend/src/shared/               ← only if used by 2+ distinct feature modules
specs/[module]/NNN-feature/        ← spec artifacts per feature
design/wireframes/pages/[module]/  ← Pencil wireframes (.pen files)
design/prototype/pages/[module]/   ← HTML prototypes
```

**Feature modules**: `account` · `dashboard` · `task-management` · `annotation` · `dataset` · `annotator-management` · `admin`

## Hard Rules

1. **No cross-feature imports** — `features/A/` must not import from `features/B/`. Use `shared/` only when 2+ features need it.
2. **No commits to `main`** — always create a `feat/` or `fix/` branch first.
3. **No `pip install`** — use `uv add`. No `npm install` — use `pnpm add`.
4. **No version bumps** — do not modify versions in `pyproject.toml` or `package.json` unless explicitly asked.
5. **No hardcoded task logic** — all task types must be config-driven; new task types must not require modifying core code (Constitution II — NON-NEGOTIABLE).
6. **No test-set answer exposure** — API responses accessible to annotators must never include ground-truth answers (Constitution III — NON-NEGOTIABLE).
7. **No `any` in TypeScript** — strict mode is enforced.
8. **No `allow_origins=["*"]`** — list CORS origins explicitly.

## Required Behaviors

- All Python commands via `uv run` (`uv run pytest`, `uv run uvicorn app.main:app --reload`, etc.)
- All frontend commands via `pnpm` from `frontend/`
- Write a failing test before writing implementation — no exceptions (TDD)
- Run `/speckit.analyze` and resolve all findings before opening a PR
- Read relevant files before making any changes
- Remove all debug `print` / `console.log` before finishing

## When SDD Is Required

New features, behavior changes, breaking API changes, and architectural changes must go through:

```
/superpowers:brainstorm → /speckit.specify → /label-suite-design (prototype) → /pencil-wireframe (optional)
→ /speckit.plan → /speckit.tasks → /speckit.implement → /speckit.analyze → /pr-flow
```

Update `specs/STATUS.md` at every pipeline stage transition. After a PR merges: `mv specs/[module]/NNN-feature specs/_archive/`.

**Skip SDD only for**: bug fixes, typo/comment changes, non-breaking dep updates, adding tests for existing behavior.

## Language Rules

| Artifact | Language |
|----------|----------|
| Code, comments, commits, API contracts | English only |
| `docs/`, `specs/`, `design/prototype/`, `design/wireframes/` | Traditional Chinese allowed |
| `design/system/MASTER.md` | English only (consumed by AI agents) |

## Dev Commands

```bash
# Frontend (run from frontend/)
pnpm dev
pnpm build
pnpm tsc --noEmit
pnpm lint
pnpm playwright test

# Backend (run from backend/)
uv run uvicorn app.main:app --reload
uv run pytest
uv run ruff check . && uv run ruff format .
uv run mypy .
```

## Protected Files

Do not modify without explicit instruction:
- `CLAUDE.md`, `AGENTS.md` — project rule files
- `.specify/memory/constitution.md` — use `/speckit.constitution` to amend

## Sub-agents

25 specialist agents available (backend, frontend, QA, security, NLP, etc.).
Run `/agents` to list all, or see `.claude/agents/` for definitions.
