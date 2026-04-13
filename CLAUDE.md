# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Label Suite — A configurable, general-purpose NLP data labeling and automated evaluation portal, developed as a master's thesis research outcome (Demo Paper).

**Advisor:** Prof. Lung-Hao Lee — [Natural Language Processing Lab](https://ainlp.tw/)

## Tech Stack

### Frontend
- Framework: React 18
- Language: TypeScript (strict mode)
- Package Manager: pnpm
- Build Tool: Vite
- Testing: Playwright (E2E)

### Backend
- Language: Python 3.12+
- Framework: FastAPI
- Testing: pytest + pytest-asyncio + httpx

### Infrastructure
- Database: PostgreSQL
- Cache / Queue: Redis
- Async Tasks: Celery
- Container: Docker / Docker Compose

## Development Commands

```bash
# --- Frontend (run from frontend/) ---
pnpm install
pnpm dev
pnpm build
pnpm playwright test
pnpm tsc --noEmit
pnpm lint

# --- Backend (run from backend/) ---
uv sync --dev
uv run uvicorn app.main:app --reload
uv run pytest
uv run pytest --cov=app --cov-report=term-missing
uv run mypy .
uv run ruff check .
uv run ruff format .

# --- Design (run from project root) ---
./scripts/serve-prototype.sh          # serve design/prototype/ at http://localhost:8888
./scripts/serve-prototype.sh 9000     # custom port
```

## Architecture

> **Decision:** Modular Monorepo — frontend and backend co-located under separate top-level directories. See [ADR-001](docs/adr/001-monorepo-structure.md). All architectural decisions documented in [docs/adr/](docs/adr/).

```
label-suite/
├── frontend/
│   └── src/
│       ├── features/             # Vertical axis — one folder per IA module
│       │   ├── account/
│       │   ├── dashboard/        # sub-folders: leader/ annotator/ reviewer/ super-admin/
│       │   ├── task-management/  # includes ConfigBuilder/
│       │   ├── annotation/       # includes workspace/ review/ task-types/
│       │   ├── dataset/
│       │   ├── annotator-management/
│       │   └── admin/
│       ├── shared/               # Cross-feature only (2+ features rule)
│       │   ├── ui/
│       │   ├── layout/
│       │   ├── api/              # Axios instance + JWT interceptors
│       │   ├── stores/           # authStore (token/user/role), uiStore (lang, sidebar)
│       │   ├── hooks/
│       │   ├── types/            # Domain types mirroring backend Pydantic schemas
│       │   └── utils/
│       ├── locales/              # i18n — namespaced per feature (zh-TW/ + en/)
│       └── router/               # Route definitions (lazy per feature) + AuthGuard/RoleGuard
├── backend/
│   └── app/
│       ├── api/routes/
│       ├── core/
│       ├── models/
│       ├── schemas/
│       ├── services/
│       ├── utils/
│       └── main.py
├── specs/                        # SDD specs — specs/[module]/NNN-feature/
├── design/
│   ├── wireframes/pages/         # Pencil wireframes — [module]/[page].pen
│   ├── prototype/pages/          # HTML prototypes — [module]/[page].html
│   └── system/                   # Design system (MASTER.md + inventory.md)
├── docs/adr/                     # Architecture Decision Records
└── docker-compose.yml
```

### Frontend Architecture Principles

> **Decision:** Vertical feature slicing — see [ADR-011](docs/adr/011-frontend-source-structure.md).

**`shared/` admission rule:** A file belongs in `shared/` only if directly imported by **two or more different feature modules**. Everything else stays inside its feature folder.

**State management:**

| Layer | Tool | Manages |
|-------|------|---------|
| Server state | TanStack Query | All API data: fetching, caching, mutations |
| Global client state | Zustand | Auth token/user, language preference, sidebar state |
| Local UI state | `useState` | Component-level ephemeral state |

Zustand must **not** hold API response data.

**Role model:** The system uses a two-layer role model. **System role** (JWT single string): `user` | `super_admin` (`null` = unauthenticated only). All registered users immediately get `user` — no pending state, no approval flow. Any `user` can create labeling projects. **Task role** (resolved from `task_membership` table per task): `project_leader` | `reviewer` | `annotator`. Task roles are not stored in the JWT — they are fetched per task via API.

**Dashboard role dispatch:** `authStore` holds `role: SystemRole | null` (`null` when unauthenticated). `DashboardPage` dispatches with explicit `role ===` checks: `super_admin` → `SuperAdminDashboard`; `user` → `UserDashboard` (content sections rendered dynamically based on the user's task memberships; empty state shown when user has no task memberships yet). `null` redirects to `/login`. Unknown/unrecognised `role` clears the JWT session and redirects to `/login`.

**RoleGuard:** System-level pages use `role` from JWT — no inheritance. Task-level pages additionally check task membership via `useTaskRole(taskId)` hook. See [ADR-011](docs/adr/011-frontend-source-structure.md).

**Localization namespaces:** `t('task-management:config_builder.label_name')`. Locale files at `locales/zh-TW/[module].json` and `locales/en/[module].json`.

**Agent Team file ownership:** Each `FrontendAgent` owns one `features/[module]/` directory. No agent touches another agent's feature folder.

## Communication

- **English-first**: Code, comments, commit messages, and API contracts are written in English.
- **Traditional Chinese allowed** in:
  - `docs/` — research, thesis, design documentation
  - `specs/` — SDD spec files (`spec.md`, `plan.md`, `tasks.md`, `checklists/`)
  - `design/prototype/` — HTML/CSS UI prototypes
  - `design/wireframes/` — Pencil wireframe files (`.pen`)
  - `design/system/inventory.md` — component inventory
- **English only** (exceptions within Chinese-allowed dirs):
  - `design/system/MASTER.md` — consumed by AI agents; must be English for accurate token parsing
- `README.zh-TW.md` is maintained in Traditional Chinese.
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

### Design Principles
- Follow SOLID, DRY, KISS, YAGNI — when DRY leads to over-abstraction, KISS takes priority
- Each function does one thing; each module has one responsibility
- Do not write code for hypothetical future requirements

### Security
- All user inputs must be validated and sanitized to prevent SQL Injection and XSS attacks
- Never hardcode API keys or tokens in code; use environment variables
- CORS must not use `allow_origins=["*"]`; explicitly list allowed origins

### AI Agent Guidelines

**Prohibited**:
1. Do not modify version numbers in `pyproject.toml` or `package.json` unless explicitly requested
2. Do not use `pip install` for backend; use `uv add`. Use `pnpm add` for frontend
3. Do not suggest changes without reading the relevant files first

**Required**:
1. All backend Python commands must be run via `uv run`
2. Read relevant files before making changes to ensure compatibility with the overall architecture
3. Clean up before finishing: remove debug `print` / `console.log` statements

## Git Workflow

### Commit Convention

Commit frequently — after every logical group of changes. Keep messages concise and cover the full scope of changes.

Format: `<type>: <description>`

Types: `feat` · `fix` · `docs` · `refactor` · `test` · `style` · `chore` · `perf` · `ci`

### Branch Naming

Format: `<type>/<short-description>`, lowercase with `-` separator. Example: `feat/labeling-ui` · `fix/score-calculation`

### Protection Rules

- Never push directly to `main`
- Always create and switch to a new branch before starting a new feature

## Spec-Driven Development (SDD)

Full pipeline — each stage is a hard gate (details: run `/sdd-workflow`):

```
/superpowers:brainstorm → /speckit.specify → /speckit.clarify (optional)
  → /speckit.plan → /speckit.tasks → /speckit.implement → /speckit.analyze → /pr-flow
```

**TDD (REQUIRED)**: You MUST NOT write implementation code before writing a failing test. No exceptions.

**Pre-PR gate (REQUIRED)**: `/speckit.analyze` must report zero findings before every PR.

**Module names** (align with `features/` and `specs/[module]/`):
`account` · `dashboard` · `task-management` · `annotation` · `dataset` · `annotator-management` · `admin`

**Design artifact paths** (all mirror module names):
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
| New feature (cross-layer) | New frontend + backend feature | `brainstorm` → `specify` → `plan` → `tasks` → `implement` (or `/agent-team`) → **`analyze`** → `/pr-flow` |
| Bug fix / single-layer | Bug, refactor, one-layer change | Create `fix/` branch → implement → **`/speckit.analyze`** → `/pr-flow` |
| Wireframe | After `/speckit.specify` | `/pencil-wireframe` |
| Pre-PR gate | Before every PR — no exceptions | `/speckit.analyze` must report zero findings |
| Spec status update | At each pipeline stage transition | Update `specs/STATUS.md` row |
| Archive completed spec | After PR merged to `main` | `mv specs/[module]/NNN-feature specs/_archive/` → update `specs/STATUS.md` |
