# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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

> **Decision:** Vertical feature slicing — see [ADR-011](docs/adr/011-frontend-source-structure.md).

**`shared/` admission rule:** A file belongs in `shared/` only if directly imported by **two or more different feature modules**.

**State management:** TanStack Query for all API/server state; Zustand for auth token/user/role and UI globals (never API response data); `useState` for local component state.

**Role model:** Two-layer. **System role** (JWT): `user` | `super_admin` | `null`. **Task role** (from `task_membership` API per task): `project_leader` | `reviewer` | `annotator` — not stored in JWT. `DashboardPage` dispatches with explicit `role ===` checks; unknown role clears session and redirects to `/login`. Task pages additionally check membership via `useTaskRole(taskId)`.

**Localization:** Namespaced per module — e.g. `t('task-management:config_builder.label_name')`. Files at `locales/zh-TW/[module].json` and `locales/en/[module].json`.

## Communication

- **English:** code, comments, commit messages, API contracts, `design/system/MASTER.md`
- **Traditional Chinese allowed:** `docs/`, `specs/`, `design/prototype/`, `design/wireframes/`, `design/system/inventory.md`
- All conversations with Claude should be responded to in Traditional Chinese.

## Code Style

### Python (Backend)

- All functions must have docstrings in English (`Args:`, `Returns:`, `Raises:`) with complete type hints
- Use pytest, not unittest; prefer f-strings over format()

### TypeScript (Frontend)

- No `any` types (strict mode enforced)
- Use `interface` for props, `type` for union/intersection types
- Prefer functional components + hooks

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

### AI Agent Non-Negotiables

- Use `uv add` (not pip) for backend packages; `pnpm add` for frontend
- All backend commands must be run via `uv run`
- Read relevant files before making changes
- Remove debug `print` / `console.log` before finishing
- Do not modify version numbers in `pyproject.toml` or `package.json` unless explicitly asked

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
