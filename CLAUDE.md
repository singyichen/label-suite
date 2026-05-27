# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Codex will review your output once you are done

## Project Overview

Label Suite — A configurable, general-purpose NLP data labeling and automated evaluation portal, developed as a master's thesis research outcome (Demo Paper).

## Architecture

> **Decision:** Modular Monorepo. See [ADR-001](docs/adr/001-monorepo-structure.md). All architectural decisions in [docs/adr/](docs/adr/).

```
label-suite/
├── frontend/
│   └── src/
│       ├── features/             # One folder per IA module
│       │   ├── account/
│       │   ├── dashboard/
│       │   ├── task-management/
│       │   ├── annotation/
│       │   ├── dataset/
│       │   ├── annotator-management/
│       │   └── admin/
│       ├── shared/               # Imported by 2+ feature modules only
│       │   ├── ui/
│       │   ├── layout/
│       │   ├── api/
│       │   ├── stores/
│       │   ├── hooks/
│       │   ├── types/
│       │   └── utils/
│       ├── locales/
│       └── router/
├── backend/
│   └── app/
│       ├── api/routes/
│       ├── core/
│       ├── models/
│       ├── schemas/
│       ├── services/
│       ├── utils/
│       └── main.py
├── specs/
├── design/
│   ├── wireframes/pages/
│   ├── prototype/pages/
│   └── system/
├── docs/adr/
└── docker-compose.yml
```

### Frontend Architecture Principles

@.claude/rules/frontend.md

## Communication

- **English:** code, comments, commit messages, API contracts, `design/system/MASTER.md`
- **Traditional Chinese allowed:** `docs/`, `specs/`, `design/prototype/`, `design/wireframes/`, `design/system/inventory.md`
- All conversations with Claude should be responded to in Traditional Chinese.

## Code Style

Path-scoped rules load automatically when Claude accesses files in those directories:

- Frontend (React / TypeScript): @.claude/rules/frontend.md
- Backend (FastAPI / Python): @.claude/rules/backend.md

## General Coding Rules

### Think Before Coding

Before implementing anything:
- State your assumptions explicitly. If uncertain, ask — don't silently pick an interpretation.
- If multiple valid approaches exist, present them with tradeoffs. Don't choose without surfacing the choice.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask before proceeding.

### Simplicity First

Minimum code that solves the problem. Nothing speculative.

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

The test: Would a senior engineer say this is overcomplicated? If yes, simplify.

### Surgical Changes

Touch only what you must. Clean up only your own mess.

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it — don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

### DRY (Do Not Repeat Yourself)

One logic, one place.

- Shared logic/validation/constants must have a single source of truth.
- If the same code appears in 2+ places, extract and reuse.
- Keep abstractions minimal; prefer small shared helpers.

### Design Principles
- Follow SOLID, DRY, KISS, YAGNI — when DRY leads to over-abstraction, KISS takes priority
- Each function does one thing; each module has one responsibility

### Security
- All user inputs must be validated and sanitized to prevent SQL Injection and XSS attacks
- Never hardcode API keys or tokens in code; use environment variables
- CORS must not use `allow_origins=["*"]`; explicitly list allowed origins

### Conflicting Patterns

When the codebase has contradictory conventions: pick one (prefer newer or better-tested), state the reason, flag the other for future cleanup. Never pick silently.

### Fail Loudly

If any step cannot be fully verified — file existence, API behavior, test intent — report the uncertainty explicitly. Silent failures are not allowed.

### AI Agent Non-Negotiables

- Use `uv add` (not pip) for backend packages; `pnpm add` for frontend
- All backend commands must be run via `uv run`
- Before adding code: read existing exports, caller functions, and shared utilities in the affected area first
- Remove debug `print` / `console.log` before finishing
- Do not modify version numbers in `pyproject.toml` or `package.json` unless explicitly asked

## Agent Execution Rules

**Model selection** (by files touched): 0–1 → Haiku 4.5 · 2–9 → Sonnet 4.6 · 10+ → Sonnet + `advisor()` or Opus 4.7. Borderline: bias up.

**Escalation gates** — escalate one tier or surface to user when any triggers:
- Same problem failed ≥ 3 attempts
- Task touches ≥ 10 files
- Task type ∈ {Architecture · Counter-factual · Security threat modeling} → Opus or `advisor()`
- Unrequested code gen > 300 LoC → halt first

**Context management**: compact at **70%** (general) or **30–35%** (complex agentic). Behavioral signal (model seems lost) → `/compact` immediately. At 95%+: `/clear`.

**Checkpoint reporting**: For multi-step tasks, report at each checkpoint: completed · verified · remaining. If unable to describe current state, stop immediately.

**Cross-session tasks**: Create `claude-progress.md` at project root to track progress across sessions (file is gitignored). Format: task name, checklist of steps with `[x]` / `[ ]`, last updated date.

**Source-Verify gate**: any cited number / benchmark / verbatim quote must be locatable via `grep -i <term> <source>`. If not found → remove or correct; never approximate.

## Git Workflow

### Commit Convention

Commit frequently — after every logical group of changes.

Format: `<type>: <description>`

Types: `feat` · `fix` · `docs` · `refactor` · `test` · `style` · `chore` · `perf` · `ci`

### Branch Naming

Format: `<type>/<short-description>`, lowercase with `-` separator. Example: `feat/labeling-ui` · `fix/score-calculation`

### Protection Rules

- Never push directly to `main`

## Spec-Driven Development (SDD)

Full pipeline — each stage is a hard gate:

```
/superpowers:brainstorm → /speckit.specify → /label-suite-design (prototype) → /pencil-wireframe (optional)
  → /speckit.clarify (optional)
  → /speckit.plan → /speckit.tasks → /speckit.implement → /speckit.analyze → /speckit.checklist → /pr-flow
```

**TDD (REQUIRED)**: You MUST NOT write implementation code before writing a failing test. No exceptions.

**Pre-PR gate (REQUIRED)**: `/speckit.analyze` must report zero findings before every PR.

**Module names** (align with `features/` and `specs/[module]/`):
`account` · `dashboard` · `task-management` · `annotation` · `dataset` · `annotator-management` · `admin`

**Design artifact paths:**
- Wireframes: `design/wireframes/pages/[module]/[page].pen`
- Prototypes: `design/prototype/pages/[module]/[page].html`
- Specs: `specs/[module]/NNN-feature/`

**Spec status**: Update `specs/STATUS.md` at every pipeline stage transition (see STATUS.md for full trigger list).

**Archive**: After PR merged → `mv specs/[module]/NNN-feature specs/_archive/` → update `specs/STATUS.md`.

## Constitution

All development must follow the six core principles in [constitution.md](.specify/memory/constitution.md).

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

## Workflow Quick Reference

| Workflow | When | How |
|---|---|---|
| New feature (cross-layer) | New frontend + backend feature | `brainstorm` → `specify` → `label-suite-design` (prototype) → `pencil-wireframe` (optional) → `plan` → `tasks` → `implement` (or `/agent-team`) → **`analyze`** → **`checklist`** → `/pr-flow` |
| Bug fix / single-layer | Bug, refactor, one-layer change | Create `fix/` branch → implement → **`/speckit.analyze`** → `/pr-flow` |
| Prototype | After `/speckit.specify` | `/label-suite-design` |
| Wireframe | Optional, after prototype | `/pencil-wireframe` |
| Pre-PR gate | Before every PR — no exceptions | `/speckit.analyze` must report zero findings |
| Spec status update | At each pipeline stage transition | Update `specs/STATUS.md` row |
| Archive completed spec | After PR merged to `main` | `mv specs/[module]/NNN-feature specs/_archive/` → update `specs/STATUS.md` |
