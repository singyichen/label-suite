# CLAUDE.md

Codex will review your output once you are done

## Project Overview

Label Suite — A configurable, general-purpose NLP data labeling and automated evaluation portal, developed as a master's thesis research outcome (Demo Paper).

## Architecture & Code Style

> **Decision:** Modular Monorepo. All architectural decisions in [docs/adr/](docs/adr/).

Path-scoped rules — loaded only when working in the respective directory:

- `frontend/` → [frontend/CLAUDE.md](frontend/CLAUDE.md) (`frontend.md`, `testing-frontend.md`)
- `backend/` → [backend/CLAUDE.md](backend/CLAUDE.md) (`backend.md`, `api.md`, `testing-backend.md`)
- `e2e/` → [e2e/CLAUDE.md](e2e/CLAUDE.md) (`testing-e2e.md`)

## Communication

- **English:** code, comments, commit messages, API contracts, `design/system/MASTER.md`
- **Traditional Chinese allowed:** `docs/`, `specs/`, `design/prototype/`, `design/wireframes/`, `design/system/inventory.md`
- All conversations with Claude should be responded to in Traditional Chinese.

## General Coding Rules

@.claude/rules/general.md

## Agent Execution Rules

**Model selection** (by files touched): 0–1 → Haiku 4.5 · 2–9 → Sonnet 4.6 · 10+ → Sonnet + `advisor()` or Opus 4.7. Borderline: bias up.

**Escalation gates** — escalate one tier or surface to user when any triggers:

- Same problem failed ≥ 3 attempts
- Task touches ≥ 10 files
- Task type ∈ {Architecture · Counter-factual · Security threat modeling} → Opus or `advisor()`
- Unrequested code gen > 300 LoC → halt first
- Single PR diff > 5 files or > 300 lines (excluding tests) → halt, split into separate PRs before opening `[Principle: X]`

**Context management**: **Generator phase** → `/compact` is forbidden; on context limit → full `/clear`, then re-read spec from disk before continuing. All other phases → compact at **70%** (general) or **30–35%** (complex agentic). Behavioral signal (model seems lost) → `/compact` immediately. At 95%+: `/clear`.

**Context anchoring** (proactive): After each SDD stage transition or escalation gate resolution, save confirmed decisions to MEMORY.md. When switching modules, re-read the relevant spec before proceeding.

**Checkpoint reporting**: For multi-step tasks, report at each checkpoint: completed · verified · remaining. If unable to describe current state, stop immediately.

**Error recovery**: Verification command fails → fix before proceeding; never skip or continue past a red gate. Tool call fails ≥ 2 attempts → surface exact error to user before retrying. Ambiguous file state (conflict, missing, unexpected content) → investigate before overwriting; never assume.

**Cross-session tasks**: Create `claude-progress.md` **before starting** when any trigger applies: task spans ≥ 2 SDD pipeline stages · task touches ≥ 5 files · task type ∈ {feature implementation · refactor · migration}. Format: task name, checklist of steps with `[x]` / `[ ]`, last updated date. File is gitignored.

**Source-Verify gate**: any cited number / benchmark / verbatim quote must be locatable via `grep -i <term> <source>`. If not found → remove or correct; never approximate.

## Git Workflow

### Commit Convention

Commit frequently — after every logical group of changes.

Format: `<type>: <description>`

Types: `feat` · `fix` · `docs` · `refactor` · `test` · `style` · `chore` · `perf` · `ci`

### Branch Naming

Format: `<type>/<short-description>`, lowercase with `-` separator. Example: `feat/labeling-ui` · `fix/score-calculation`

## Three-Layer Sprint Architecture

Every implementation sprint follows a strict **Planner → Generator → Evaluator** pipeline.

| Layer | Responsibility | Input | Output |
|-------|---------------|-------|--------|
| **Planner** | Task decomposition, spec generation | User brief (may be vague) | Atomic, executable spec items |
| **Generator** | Implementation | One spec item | Code change (impl + test) |
| **Evaluator** | Validation | Code changes | Pass / Fail + exact error details |

**Planner**: Convert vague briefs into fine-grained atomic items before any code is written. Scope is locked once Generator starts — no additions mid-sprint.

**Generator**: Implement exactly one spec item per invocation. On context limit → full `/clear` reset, re-read spec from disk. Never rely on `/compact` summary.

**Evaluator**: External tools only — pytest, mypy, ruff, tsc, Playwright. No self-assessment. **Hard threshold**: any single failure = sprint failure; stop and surface to user.

> SDD mapping: Planner ≈ `speckit.specify → speckit.plan → speckit.tasks` · Generator ≈ `speckit.implement` · Evaluator ≈ `speckit.analyze → speckit.checklist`

## Spec-Driven Development (SDD)

Full pipeline — each stage is a hard gate:

```text
/superpowers:brainstorm → /speckit.specify → /label-suite-design (prototype) → /pencil-wireframe (optional)
  → /speckit.clarify (optional)
  → /speckit.plan → /speckit.tasks → /speckit.implement → /speckit.analyze → /speckit.checklist → /pr-flow
```

**TDD (REQUIRED)**: You MUST NOT write implementation code before writing a failing test. No exceptions.

**Pre-PR gate (REQUIRED)**: `/speckit.analyze` must report zero findings before every PR.

**Module names** (align with `features/` and `specs/[module]/`):
`account` · `dashboard` · `task-management` · `annotation` · `dataset` · `admin`

**Design artifact paths:**

- Wireframes: `design/wireframes/pages/[module]/[page].pen`
- Prototypes: `design/prototype/pages/[module]/[page].html`
- Specs: `specs/[module]/NNN-feature/`

**Spec status**: Update `specs/STATUS.md` at every pipeline stage transition (see STATUS.md for full trigger list).

**Archive**: After PR merged → `mv specs/[module]/NNN-feature specs/_archive/` → update `specs/STATUS.md`.

**Modify Existing Feature**: When changing an already-merged feature, do NOT create a new spec from scratch:

1. `mv specs/_archive/NNN-feature specs/[module]/NNN-feature` — retrieve from archive
2. Bump spec version + record change in spec Changelog
3. Resume pipeline from `/speckit.clarify` (skip brainstorm + specify)
4. Re-archive after the modification PR merges

**Lightweight Path**: Skip the full pipeline when ALL of the following are true: ≤ 2 files changed · no new API endpoint · minor behavior change requiring a spec update.
Lightweight sequence: **TDD → implement → spec consistency review → `/pr-flow`**
(Spec consistency review: verify spec version bump and Changelog entry, confirm no downstream specs affected, confirm no new API contracts.)
If any condition is uncertain, default to the full pipeline.

## Constitution

All development must follow the eight core principles in [constitution.md](specs/_governance/constitution.md).

NON-NEGOTIABLEs: **Generalization-First** (config-driven, no hardcoded task logic) · **Data Fairness** (prevent test-set answer leakage).

## Verification Commands

Run after every change. Task is NOT complete until all pass.

```bash
# Backend (run from backend/)
uv run pytest tests/ -q
uv run mypy app/ --strict
uv run ruff check . && uv run ruff format --check .

# Frontend (run from frontend/)
pnpm tsc --noEmit
pnpm lint
pnpm test
```

Definition of Done: all commands above exit 0 + `/speckit.analyze` reports zero findings.

## Prohibitions

Each rule traces to a specific incident (Ratchet Principle — Mitchell Hashimoto).

- ❌ Direct commit or push to `main`
  - Reason: 2026-04 — violated twice; PreToolUse hook now blocks `git push origin main`
- ❌ `pip install` or `npm install`
  - Reason: lockfile divergence causes silent CI failures; use `uv add` / `pnpm add`
- ❌ Chinese text in commit messages or PR descriptions
  - Reason: 2026-04 — PR description contained Chinese; breaks English-only contract
- ❌ `allow_origins=["*"]` in CORS config
  - Reason: security boundary; explicitly list allowed origins
- ❌ Hardcoded API keys or secrets in source files
  - Reason: secret exposure risk; use environment variables only
