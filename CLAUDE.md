# CLAUDE.md

Codex will review your output once you are done

## Project Overview

Label Suite — A configurable, general-purpose NLP data labeling and automated evaluation portal, developed as a master's thesis research outcome (Demo Paper).

## Architecture & Code Style

> **Decision:** Modular Monorepo. All architectural decisions in [docs/adr/](docs/adr/).

@.claude/rules/frontend.md

@.claude/rules/backend.md

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
