# Label Suite — Agent Rules

> Full context: [CLAUDE.md](CLAUDE.md) · [CODEX.md](CODEX.md) · Constitution: [.specify/memory/constitution.md](.specify/memory/constitution.md)

## Architecture Boundaries

```
frontend/src/features/[module]/    ← feature-owned; no cross-feature imports
frontend/src/shared/               ← only if used by 2+ distinct feature modules
specs/[module]/NNN-feature/        ← spec artifacts per feature
design/wireframes/pages/[module]/  ← Pencil wireframes (.pen files)
design/prototype/pages/[module]/   ← HTML prototypes
```

**Feature modules**: `account` · `dashboard` · `task-management` · `annotation` · `dataset` · `admin`

## Hard Rules

1. **No cross-feature imports** — `features/A/` must not import from `features/B/`. Use `shared/` only when 2+ features need it.
2. **No commits to `main`** — always create a `feat/` or `fix/` branch first.
3. **No `pip install`** — use `uv add`. No `npm install` — use `pnpm add`.
4. **No version bumps** — do not modify versions in `pyproject.toml` or `package.json` unless explicitly asked.
5. **No hardcoded task logic** — all task types must be config-driven; new task types must not require modifying core code (Constitution II — NON-NEGOTIABLE).
6. **No test-set answer exposure** — API responses accessible to annotators must never include ground-truth answers (Constitution III — NON-NEGOTIABLE).
7. **No `any` in TypeScript** — strict mode is enforced.
8. **No `allow_origins=["*"]`** — list CORS origins explicitly.
9. **No unconfirmed destructive Bash** — `rm`, `git reset --hard`, `git push --force`, `git branch -D` require explicit user confirmation in the same turn before executing.

## Required Behaviors

- All Python commands via `uv run` (`uv run pytest`, `uv run uvicorn app.main:app --reload`, etc.)
- All frontend commands via `pnpm` from `frontend/`
- Write a failing test before writing implementation — no exceptions (TDD)
- Run `/speckit.analyze` and resolve all findings before opening a PR
- Read relevant files before making any changes
- Always read the main constitution plus every applicable domain constitution before planning, analyzing, implementing, or reviewing work:
  - `.specify/memory/backend-constitution.md` for backend/API/schema/service/database/migration/Redis/Celery/OpenAPI/backend security/backend performance/backend deployment work
  - `.specify/memory/frontend-constitution.md` for React/prototype-to-React/frontend routing/shared UI/i18n/Storybook/accessibility/frontend state/selector/frontend performance work
  - `.specify/memory/testing-constitution.md` for all behavior changes, bug fixes with regression tests, test strategy, coverage, fixtures, CI checks, Playwright, Vitest, pytest, or security leakage tests
- Remove all debug `print` / `console.log` before finishing
- Surface exact error to user when any tool call fails twice; never silently retry a third time

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

26 specialist agents available. See `.claude/agents/` for full definitions.
Multi-agent workflow: `/agent-team` command · `.claude/commands/agent-team.md` for full spawn templates.

---

## Agent Team

### Team Lead

`team-lead` is the orchestrator — the only agent that talks directly to you. It sequences all other agents, enforces file ownership, and reports progress in Traditional Chinese at every checkpoint.

Invoke at the start of any multi-agent sprint:

```text
Use team-lead to orchestrate implementation of [feature] from specs/[module]/NNN-feature/tasks.md
```

### Phase Mapping

#### Phase 1 — Research (read-only, before `/speckit.plan`)

| Agent | Role | When |
|---|---|---|
| `senior-architect` | Codebase structure, ADR conflicts, naming conventions | Complex / cross-cutting features |
| `senior-dba` | Existing schema review, migration strategy | Any DB change |
| `senior-api-designer` | API contract review, OpenAPI consistency | Any API change |
| `senior-backend` | Service boundaries in `backend/app/services/` | New backend module |
| `senior-frontend` | Reusable components in `frontend/src/shared/` | New frontend module |
| `senior-uiux` | Annotation interface UX feasibility | Any labeling UI |
| `senior-i18n` | zh-TW / en strings to externalize | Any UI text |
| `nlp-research-advisor` | Annotation schema, IAA metrics, Demo Paper framing | NLP task design |

#### Phase 2A — Test Definition (TDD Red phase, before implementation)

| Agent | Owns |
|---|---|
| `senior-qa` | `backend/tests/`, `frontend/tests/`, `e2e/` |

> Newly added tests must fail (red); existing passing tests must remain green. Confirm new tests are red before starting Phase 2B.

#### Phase 2B — Implementation (parallel, after failing tests confirmed)

| Agent | Owns | Model |
|---|---|---|
| `senior-backend` | `backend/app/` | Sonnet 4.6 |
| `senior-frontend` | `frontend/src/` | Sonnet 4.6 |
| `senior-i18n` | `frontend/src/locales/` | Haiku 4.5 |
| `senior-devops` _(optional)_ | `docker-compose.yml`, `.github/` | Haiku 4.5 |

> ⚠️ **User checkpoint required** before any DB schema or API contract change proceeds.

#### Phase 2C — DB Migrations (after Phase 2B models confirmed)

| Agent | Owns |
|---|---|
| `senior-dba` | `backend/migrations/` |

#### Phase 3 — Review (parallel, after all impl complete)

| Agent | Focus | Stage |
|---|---|---|
| `senior-code-reviewer` | Code quality, type safety, logic | Stage 1 (always) |
| `senior-security` | RBAC, JWT, input validation, test-set leakage | Stage 2 (always) |
| `senior-performance` | API latency, DB query efficiency | Stage 3 (milestone 2+) |

#### On-Demand

| Agent | When to Spawn |
|---|---|
| `senior-error-resolver` | Implementation teammate fails 3 quality gate attempts (2 retries exhausted) |
| `senior-debugger` | pytest / Vitest / Playwright failures that block progress |
| `senior-technical-writer` | After PR merge — update README / API docs / thesis chapter |
| `senior-full-stack` | Cross-boundary integration task that cannot be split |
| `senior-tech-lead` | ADR decisions, constitution compliance review, cross-cutting concerns |
| `senior-sa` | Technical specification writing for new modules |
| `user-researcher` | New module requires user journey research |
| `senior-ba` | Requirements unclear — needs structured analysis before specifying |

### Inter-Agent Communication Protocol

Phase 1 research agents read files directly — that is their primary function. For Phase 2 implementation agents, the Team Lead provides full task context rather than expecting agents to read files autonomously:

```text
1. Full task text (copied from tasks.md)
2. API contract (if crossing BE/FE boundary)
3. File ownership boundary (what they own / must not touch)
4. Quality gate command to run after completion
```

Agents report back with one of four statuses: `DONE` · `DONE_WITH_CONCERNS` · `NEEDS_CONTEXT` · `BLOCKED`.
Team Lead handles each per the escalation rules in `.claude/agents/team-lead.md`.
