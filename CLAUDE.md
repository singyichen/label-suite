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
```

## Architecture

> **Decision:** Modular Monorepo — frontend and backend co-located under separate top-level directories. See [ADR-001](docs/adr/001-monorepo-structure.md). All architectural decisions documented in [docs/adr/](docs/adr/).

```
label-suite/
├── frontend/
│   └── src/
│       ├── features/             # Vertical axis — one folder per IA module
│       │   ├── account/          #   LoginPage, ProfilePage
│       │   ├── dashboard/        #   DashboardPage; sub-folders: leader/ annotator/ reviewer/ super-admin/
│       │   ├── task-management/  #   TaskListPage, TaskNewPage, TaskDetailPage; ConfigBuilder/
│       │   ├── annotation/       #   AnnotationWorkspacePage; workspace/ review/ task-types/
│       │   ├── dataset/          #   DatasetStatsPage, DatasetQualityPage
│       │   ├── annotator-management/ # AnnotatorListPage, AnnotatorNewPage, WorkLogPage
│       │   └── admin/            #   UserManagementPage, RoleSettingsPage
│       ├── shared/               # Cross-feature only (2+ features rule)
│       │   ├── ui/               #   Button, Input, Badge, Modal, Toast
│       │   ├── layout/           #   Navbar, Sidebar, BottomTabBar, PageShell
│       │   ├── api/              #   Axios instance + JWT interceptors
│       │   ├── stores/           #   authStore (token/user), uiStore (lang, sidebar)
│       │   ├── hooks/            #   useMediaQuery, useToast
│       │   ├── types/            #   Domain types mirroring backend Pydantic schemas
│       │   └── utils/            #   cn(), formatDate()
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
│   ├── prototype/                # HTML prototypes — [module]/[page].html
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

**Dashboard role dispatch:** `authStore` holds `role: Role` (single-value enum). `DashboardPage` dispatches with explicit `role ===` checks to `SuperAdminDashboard`, `LeaderDashboard`, `ReviewerDashboard`, `AnnotatorDashboard`. Null or unrecognised `role` redirects to `/login` (deny-by-default).

**RoleGuard inheritance:** `project_leader` inherits all `reviewer` capabilities; `super_admin` inherits all roles. `RoleGuard` resolves effective roles via `ROLE_HIERARCHY` lookup. JWT `role` remains a single string — inheritance resolved at the guard layer only. See [ADR-011](docs/adr/011-frontend-source-structure.md).

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

- Use 4-space indentation
- Variables use snake_case
- All functions must have docstrings in English (`Args:`, `Returns:`, `Raises:`)
- Functions must have complete type hints
- Use pytest, not unittest
- Prefer f-strings over format()

### TypeScript (Frontend)

- Use 2-space indentation
- Variables use camelCase, React components use PascalCase
- Use TypeScript strict mode, no `any` types
- Prefer functional components + hooks
- Use `interface` for props, `type` for union/intersection types

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

| Type | Purpose |
|---|---|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation |
| `refactor` | Refactoring |
| `test` | Tests |
| `style` | Formatting |
| `chore` | Build / dependencies |
| `perf` | Performance |
| `ci` | CI/CD changes |

### Branch Naming

Format: `<type>/<short-description>`, lowercase with `-` separator.

Examples: `feat/labeling-ui` · `fix/score-calculation` · `docs/roadmap-update`

### Protection Rules

- Never push directly to `main`
- Always create and switch to a new branch before starting a new feature

## Spec-Driven Development (SDD)

This project adopts SDD. See `/sdd-workflow` skill for the full pipeline, commands, and when-to-skip rules.

**Module names** (align with `features/` and `specs/[module]/`):
`account` · `dashboard` · `task-management` · `annotation` · `dataset` · `annotator-management` · `admin`

**Design artifact paths** (all mirror module names):
- Wireframes: `design/wireframes/pages/[module]/[page].pen`
- Prototypes: `design/prototype/[module]/[page].html`
- Specs: `specs/[module]/NNN-feature/`

## Constitution

All development must follow the six core principles in [constitution.md](.specify/memory/constitution.md):

1. **Spec-First Development** (RECOMMENDED) — write spec before new features
2. **Generalization-First** (NON-NEGOTIABLE) — config-driven, no hardcoded task logic
3. **Data Fairness** (NON-NEGOTIABLE) — prevent test-set answer leakage
4. **Test-First / TDD** (RECOMMENDED) — pytest 80%+ coverage, Playwright for core flows
5. **Simplicity** — YAGNI, KISS, avoid over-engineering
6. **English-First** — code, comments, and commit messages in English

## Workflow Quick Reference

| Workflow | When | How |
|---|---|---|
| New feature (cross-layer) | New frontend + backend feature | `/sdd-workflow` → `/agent-team` → `/pr-flow` |
| Bug fix / single-layer | Bug, refactor, one-layer change | Create `fix/` branch → implement → `/pr-flow` |
| Wireframe | After `/speckit.specify` | `/pencil-wireframe` |
| PR & merge | After implementation complete | `/pr-flow` |
