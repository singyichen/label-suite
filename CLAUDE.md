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
cd frontend
pnpm install

# Run dev server
pnpm dev

# Build
pnpm build

# Run E2E tests
pnpm playwright test

# Type checking
pnpm tsc --noEmit

# Linting
pnpm lint

# --- Backend (run from backend/) ---
cd backend
uv sync --dev

# Run the application
uv run uvicorn app.main:app --reload

# Run tests
uv run pytest

# Run tests with coverage
uv run pytest --cov=app --cov-report=term-missing

# Type checking
uv run mypy .

# Linting / Formatting
uv run ruff check .
uv run ruff format .
```

## Architecture

> **Decision:** This project uses a Modular Monorepo — frontend and backend co-located in the same repository under separate top-level directories. See [ADR-001](docs/adr/001-monorepo-structure.md) for the full rationale. All architectural decisions are documented in [docs/adr/](docs/adr/).

```
label-suite/
├── frontend/                     # React + TypeScript frontend
│   ├── src/
│   │   ├── features/             # Vertical axis — one folder per IA module
│   │   │   ├── account/          #   LoginPage, ProfilePage + components/hooks/services
│   │   │   ├── dashboard/        #   DashboardPage; sub-folders: leader/ annotator/ reviewer/ super-admin/
│   │   │   ├── task-management/  #   TaskListPage, TaskNewPage, TaskDetailPage; ConfigBuilder/
│   │   │   ├── annotation/       #   AnnotationWorkspacePage; workspace/ review/ task-types/
│   │   │   ├── dataset/          #   DatasetStatsPage, DatasetQualityPage
│   │   │   ├── annotator-management/ # AnnotatorListPage, AnnotatorNewPage, WorkLogPage
│   │   │   └── admin/            #   UserManagementPage, RoleSettingsPage
│   │   ├── shared/               # Horizontal axis — cross-feature only (2+ features rule)
│   │   │   ├── ui/               #   Button, Input, Badge, Modal, Toast
│   │   │   ├── layout/           #   Navbar, Sidebar, BottomTabBar, PageShell
│   │   │   ├── api/              #   Axios instance + JWT interceptors
│   │   │   ├── stores/           #   authStore (token/user), uiStore (lang, sidebar)
│   │   │   ├── hooks/            #   useMediaQuery, useToast
│   │   │   ├── types/            #   Domain types mirroring backend Pydantic schemas
│   │   │   └── utils/            #   cn(), formatDate()
│   │   ├── locales/              # i18n — namespaced per feature (zh-TW/ + en/)
│   │   └── router/               # Route definitions (lazy per feature) + AuthGuard/RoleGuard
│   ├── tests/                    # Playwright E2E tests
│   ├── vite.config.ts
│   └── package.json
├── backend/                      # FastAPI backend
│   ├── app/
│   │   ├── api/routes/           # API route handlers
│   │   ├── core/                 # Core logic, middleware
│   │   ├── models/               # Database models
│   │   ├── schemas/              # Pydantic schemas
│   │   ├── services/             # Business logic layer
│   │   ├── utils/                # Utility functions
│   │   └── main.py               # FastAPI entry point
│   ├── tests/                    # pytest tests
│   └── pyproject.toml
├── docs/                         # Project documentation
│   └── research/                 # Research & tool analysis
├── docker-compose.yml
├── README.md
├── README.zh-TW.md
└── CLAUDE.md
```

### Frontend Architecture Principles

> **Decision:** Frontend uses vertical feature slicing — see [ADR-011](docs/adr/011-frontend-source-structure.md) for full rationale.

**Core rule — `shared/` admission test:**
A file belongs in `shared/` only if it is directly imported by **two or more different feature modules**. Everything else stays inside its feature folder.

**State management layers:**

| Layer | Tool | Manages |
|-------|------|---------|
| Server state | TanStack Query | All API data: fetching, caching, mutations |
| Global client state | Zustand | Auth token/user, language preference, sidebar state |
| Local UI state | `useState` | Component-level ephemeral state |

Zustand must **not** hold API response data — that belongs to TanStack Query.

**Dashboard role dispatch:** `authStore` holds `role: Role` (single-value enum — each user account has exactly one role per IA and JWT contract). `DashboardPage` dispatches with explicit `role ===` checks to role-specific sub-components (`SuperAdminDashboard`, `LeaderDashboard`, `ReviewerDashboard`, `AnnotatorDashboard`) inside `features/dashboard/components/[role]/`. Null or unrecognised `role` redirects to `/login` (deny-by-default).

**Localization namespaces:** Translation keys namespaced per feature — `t('task-management:config_builder.label_name')`. Locale files live at `locales/zh-TW/[module].json` and `locales/en/[module].json`.

**RoleGuard inheritance:** The system uses RBAC hierarchy — `project_leader` inherits all `reviewer` capabilities; `super_admin` inherits all roles. `RoleGuard` resolves effective roles via `ROLE_HIERARCHY` lookup before checking route access. JWT `role` remains a single string; inheritance is resolved at the guard layer.

**Agent Team file ownership (Phase 2 implementation):** Each `FrontendAgent` owns one `features/[module]/` directory. No agent touches another agent's feature folder.

## Communication

- **English-first**: Code, comments, commit messages, and API contracts are written in English.
- **Traditional Chinese allowed** in the following locations, to accelerate development iteration:
  - `docs/` — all research, thesis, and design documentation
  - `specs/` — all SDD spec files (`spec.md`, `plan.md`, `tasks.md`, `checklists/`)
  - `design/prototype/` — HTML/CSS UI prototypes demonstrating bilingual (zh-TW/en) features
  - `design/wireframes/` — Pencil wireframe files (`.pen`) demonstrating bilingual (zh-TW/en) UI designs
  - `design/system/inventory.md` — component inventory tracking document
- **English only** (exceptions within otherwise Chinese-allowed directories):
  - `design/system/MASTER.md` — consumed by AI agents (`ui-ux-pro-max`, Claude Code); must be in English for accurate token parsing
- `README.zh-TW.md` is maintained in Traditional Chinese for Chinese-speaking users.
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

Format: `<type>: <description>`, type must be one of:

| Type | Purpose | Example |
|---|---|---|
| `feat` | New feature | `feat: add labeling task config UI` |
| `fix` | Bug fix | `fix: correct scoring logic error` |
| `docs` | Documentation | `docs: update roadmap` |
| `refactor` | Refactoring | `refactor: split evaluation service layer` |
| `test` | Tests | `test: add labeling flow E2E tests` |
| `style` | Formatting | `style: apply ruff formatting` |
| `chore` | Build / dependencies | `chore: upgrade FastAPI version` |
| `perf` | Performance | `perf: add Redis caching` |
| `ci` | CI/CD changes | `ci: add Playwright test workflow` |

### Branch Naming Convention

Format: `<type>/<short-description>`, lowercase with `-` separator, aligned with commit types:

| Prefix | Purpose | Example |
|---|---|---|
| `feat/` | New feature | `feat/labeling-ui` |
| `fix/` | Bug fix | `fix/score-calculation` |
| `docs/` | Documentation | `docs/roadmap-update` |
| `refactor/` | Refactoring | `refactor/eval-service` |
| `test/` | Tests | `test/labeling-flow-e2e` |
| `chore/` | Build / dependencies | `chore/upgrade-dependencies` |

### Protection Rules

- Never push directly to `main`
- Always create and switch to a new branch before starting a new feature

## Spec-Driven Development (SDD)

This project adopts Spec-Driven Development (SDD). New features should follow this sequence:

```
/speckit.specify <feature description>  → specs/[module]/NNN-feature/spec.md
                                          ↳ Process Flow      (spec.md § Process Flow — cross-role business process)
                                          ↳ User Flow         (spec.md § User Flow & Navigation — screens + triggers)
/pencil wireframe                       → design/wireframes/pages/[module]/[page].pen  (optional, after specify)
                                          ⚠ Each .pen: Desktop ZH (x:0) · Desktop EN (x:1500) · Mobile ZH (x:3000) · Mobile EN (x:4500)
                                            + Component ZH (x:6000) · Component EN (x:7500); draw ZH first, Desktop before Mobile
/ui-ux-pro-max                          → design/prototype/[module]/[page].html + design/system/  (optional, after wireframe)
                                          ⚠ Before generating: read MASTER.md + design/wireframes/pages/[module]/[page].pen via Pencil MCP
/senior-uiux review                     → prototype QA: wireframe fidelity, design system compliance, a11y  (optional, after prototype)
/speckit.clarify                        → clarify requirements          (optional; wireframe + prototype surface ambiguities)
/speckit.plan                           → specs/[module]/NNN-feature/plan.md
                                          ↳ System Flow       (plan.md § System Flow & Data Flow — API/service/DB layers)
/speckit.tasks                          → specs/[module]/NNN-feature/tasks.md
/speckit.analyze                        → cross-document consistency check (optional)
/speckit.implement                      → execute implementation
/speckit.checklist                      → quality validation
```

**Flow Chart Ownership**:

| Flow Type | Document | When | Purpose |
|-----------|----------|------|---------|
| Process Flow | `spec.md` | During `/speckit.specify` | Cross-role business process; WHO does WHAT |
| User Flow | `spec.md` | During `/speckit.specify` | Screen navigation; prevents orphan pages |
| System Flow | `plan.md` | During `/speckit.plan` | Data path through API → Service → DB layers |

All diagrams use Mermaid (`sequenceDiagram` for process/system flows, `flowchart LR` for navigation flows). Renders natively on GitHub — no extra tooling needed.

**Key Rules**:
- Each spec directory contains: `spec.md`, `plan.md`, `tasks.md`, `checklists/`
- Follow User Story priority order (P1 → P2 → P3)
- Mark completion with `touch specs/<module>/<feature-dir>/.completed`

**Module names** (align with `features/` in ADR-011):
`account` · `dashboard` · `task-management` · `annotation` · `dataset` · `annotator-management` · `admin`

### When to Skip SDD

The deciding question is: **will this change make the system behave differently from what the specs define?**

**Skip SDD — modify code directly**:

| Case | Examples |
|---|---|
| Bug fix | Spec says login failure returns 401, but code returns 500 — fix it |
| Typo / formatting / comment | No behavior change |
| Non-breaking dependency update | Bumping a package version with no API changes |
| Config adjustment | Changing a timeout value, env var default |
| Adding tests for existing behavior | Spec already defines the behavior; tests just verify the implementation |

> If the fix is complex or you want to leave a decision record, opening a spec is still fine.

**Must go through SDD**:

| Case | Examples |
|---|---|
| New feature | Anything that adds behavior not currently in specs |
| Behavior change | Changing what an existing endpoint returns |
| Breaking change | Removing a field, changing an API contract |
| Architectural change | New service, new data model, new async flow |

### Spec-Kit Commands

| Command | Purpose |
|---|---|
| `/speckit.specify` | Create feature spec from natural language description |
| `pencil wireframe` | Draw 6 frames (Desktop ZH·EN · Mobile ZH·EN · Component ZH·EN) in `design/wireframes/pages/[module]/[page].pen` via Pencil MCP (optional; run after specify, before prototype) |
| `/ui-ux-pro-max` | Generate HTML prototype to `design/prototype/[module]/[page].html` + design system (optional; run after wireframe, before clarify) |
| `senior-uiux review` | Review prototype against wireframe for fidelity, design system compliance, a11y, ZH/EN/mobile symmetry (optional; run after ui-ux-pro-max) |
| `/speckit.clarify` | Identify and clarify ambiguous requirements (wireframe + prototype help surface these) |
| `/speckit.plan` | Build technical implementation plan |
| `/speckit.tasks` | Generate executable task list |
| `/speckit.analyze` | Cross-document consistency analysis |
| `/speckit.implement` | Execute implementation — single session (bug fix / single-layer) or Agent Team (new feature) |
| `/speckit.checklist` | Generate quality validation checklist |

### Pencil Wireframe Convention

- Each page wireframe is stored as a separate file under `design/wireframes/pages/[module]/[page-name].pen` (e.g. `account/login.pen`, `task-management/task-new.pen`)
- Module names mirror `frontend/src/features/`: `account` · `dashboard` · `task-management` · `annotation` · `dataset` · `annotator-management` · `admin`
- `design/wireframes/index.pen` is for overview purposes only — **do not** place page wireframe frames inside it
- Each `.pen` file contains **6 side-by-side frames** in this order:

  | Frame | x offset | Purpose |
  |---|---|---|
  | Desktop ZH | `x:0` | Full page — Traditional Chinese, desktop |
  | Desktop EN | `x:1500` | Full page — English, desktop |
  | Mobile ZH | `x:3000` | Full page — Traditional Chinese, mobile |
  | Mobile EN | `x:4500` | Full page — English, mobile |
  | Component ZH | `x:6000` | UI component set (dropdowns, buttons, etc.) — ZH |
  | Component EN | `x:7500` | UI component set — EN |

- Draw order: Desktop ZH → Desktop EN → Mobile ZH → Mobile EN → Component ZH → Component EN
- Keep structure symmetric between ZH and EN frames at each device tier
- Component frames (`x:6000` onward) contain **only page-specific components** — elements unique to this page's interactions
- **Shared / cross-page components belong in `design/wireframes/design-system.pen`**, not in individual page files

#### Component Placement Rule

| Where | What goes here |
|---|---|
| `design-system.pen` | Components used across multiple pages (e.g. Button states, Text Input states, Toast, Navigation elements) |
| Page `.pen` Component frame | Components unique to this page only (e.g. Avatar upload interaction in `profile.pen`) |

> When deciding: if the component could appear on any other page, put it in `design-system.pen`.

- `.pen` files are encrypted — **only operate via Pencil MCP tools**; never use `Read` / `Edit` / `Grep` on them

#### Mobile RWD Requirements

Mobile frames **must implement genuine RWD** — do NOT simply shrink the desktop layout. Key rules:

| Desktop pattern | Mobile replacement |
|---|---|
| Sidebar navigation (`width: 224`) | Remove sidebar; use **bottom tab bar** (`height: 56`, `justifyContent: space_around`) |
| Large navbar padding (e.g. `padding: [0, 80]`) | Reduce to `padding: [0, 16]` |
| Multi-column layout | Collapse to single-column `fill_container` |
| Large card padding (e.g. `32`) | Reduce to `16` |
| Inline action buttons in wide rows | Stack vertically inside card: metadata text above, full-width button (`width: fill_container`) below |

- Mobile canvas size: **390 × auto** (iPhone 14 viewport, height varies by page content)
  - Use `height: "fit_content(900)"` during drawing
  - After completion, run `snapshot_layout` on both ZH and EN frames to get actual heights
  - Set both to the same fixed height (use the larger value): `U("frameId", {height: N})`
  - **ZH and EN mobile frames must have identical `width × height`**
- After drawing, take a screenshot and verify: no element overflows, no sidebar visible, all text readable

### Constitution Reference

All development must follow the six core principles in [constitution.md](.specify/memory/constitution.md):

1. **Spec-First Development** (RECOMMENDED) — write spec before new features
2. **Generalization-First** (NON-NEGOTIABLE) — Config-driven, no hardcoded task logic
3. **Data Fairness** (NON-NEGOTIABLE) — prevent test-set answer leakage
4. **Test-First / TDD** (RECOMMENDED) — pytest 80%+ coverage, Playwright for core flows; all agents must follow Red-Green-Refactor (see [ADR-009](docs/adr/009-testing-strategy.md))
5. **Simplicity** — YAGNI, KISS, avoid over-engineering
6. **English-First** — code, comments, and commit messages in English; Traditional Chinese allowed in `docs/`, `specs/`, `design/prototype/`, and `design/wireframes/`

---

## Workflow

| Workflow | Purpose | When | Steps |
|---|---|---|---|
| **New Feature** | End-to-end feature development (cross-layer) | Starting new feature spanning frontend + backend | SDD Phase → Agent Team Implementation → PR Flow |
| **Bug Fix / Single-layer** | Targeted fix or single-layer change | Bug, refactor, or change within one layer | Create `fix/` branch → single session implement → PR Flow |
| **Code Review** | Review code quality, type safety, security | Before creating PR | Code Style → type check (`tsc` / `mypy`) → Lint (`ruff` / `eslint`) → logic review |
| **Testing** | Verify correctness and coverage | On code changes | Run `pytest` (backend) → `playwright test` (E2E) → verify coverage |
| **PR Flow** | Merge feature into main | Feature complete | See **Complete PR Flow** section below |

### New Feature: Full Workflow

```
── Phase 1: Spec ─────────────────────────────────────────────────────────────
/speckit.specify
  → [pencil wireframe]           Draw 6 frames (Desktop/Mobile ZH·EN + Components) in
                                   design/wireframes/pages/[module]/[page].pen via Pencil MCP
  → [/ui-ux-pro-max] (optional) — HTML prototype + design system; use wireframe as layout reference
  → [senior-uiux review]         Review prototype against wireframe: fidelity, a11y, ZH/EN/mobile symmetry
  → /speckit.clarify (optional)  Wireframe + prototype make ambiguities concrete

  [Optional: Research Agents] — spawn before /speckit.plan for complex features
  (read-only, parallel, skip for simple/single-layer features)

  ├──→ [ArchitectAgent]         overall structure, cross-cutting integration points, naming conventions
  ├──→ [DBResearchAgent]        existing DB schema, migration strategy
  ├──→ [APIDesignAgent]         existing API contracts, REST naming consistency  ← no overlap with Architect
  ├──→ [BackendResearchAgent]   service boundaries in backend/app/services/      ← no overlap with APIDesign
  ├──→ [FrontendResearchAgent]  reusable components, UI integration points
  ├──→ [UXAgent]                annotation interface UX feasibility
  └──→ [I18nAgent]              UI strings needing zh-TW/en externalization
       ↓ Team Lead synthesizes findings
  ⚠️  Human Review — confirm research findings before writing plan

/speckit.plan → /speckit.tasks

── Phase 2: Agent Team Implementation ────────────────────────────────────────
[Team Lead] reads tasks.md and spawns teammates:

  Step A — parallel (no inter-dependency):
  ├──→ [BackendAgent]   owns: backend/app/ (when present)              (FastAPI routes / models / services)
  ├──→ [FrontendAgent]  owns: frontend/src/ (when present)             (React components / pages / services)
  ├──→ [I18nAgent]      owns: frontend/src/locales/ (when present)     (zh-TW / en translation strings)
  └──→ [DevOpsAgent]    owns: docker-compose.yml, .github/workflows/  (optional, CI/Docker only)

  ⚠️  Human Review checkpoint — required before any DB schema or API contract change
      Tell Team Lead: "Require plan approval before BackendAgent makes schema changes"

  Step B — after BackendAgent models are confirmed:
  └──→ [DBAgent]        owns: backend/migrations/        (Alembic migrations, index strategy)

  Step C — after BackendAgent + FrontendAgent complete:
  └──→ [TestAgent]      owns: backend/tests/ + frontend/tests/  (pytest + Playwright E2E)

  TaskCompleted hook — auto quality gate after each task:
    backend task  → uv run ruff check . && uv run mypy .
    frontend task → pnpm tsc --noEmit && pnpm lint
    if fails      → teammate retries (max 2), then escalates to Team Lead
    if retry > 2  → [ErrorResolverAgent] takes over for root-cause debugging

  TeammateIdle hook — when all implementation teammates idle, Team Lead spawns review team:
  ├──→ [ReviewAgent]      code quality, type safety, logic correctness
  ├──→ [SecurityAgent]    RBAC, JWT handling, input validation, data leakage
  └──→ [PerformanceAgent] API p95 latency, DB query efficiency, annotation write throughput

  ⚠️  Human Review interrupt — approve before proceeding to PR
      Review team posts consolidated findings; you confirm or redirect

  /speckit.checklist

── Phase 3: PR Flow ──────────────────────────────────────────────────────────
See Complete PR Flow below

── Post-PR (optional) ────────────────────────────────────────────────────────
  [TechWriterAgent]   update README / API docs after merge
  [NLPAdvisorAgent]   on-demand for NLP task config or annotation schema decisions
```

### Agent Team: Enable & Roles

**Enable** (add to `~/.claude/settings.json`):
```json
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  }
}
```

**Phase 1 — Research Agents** (read-only, optional for complex features):

| Teammate | Agent Type | Responsible For |
|---|---|---|
| ArchitectAgent | `senior-architect` | Overall structure, cross-cutting integration points, naming conventions (not API-level) |
| DBResearchAgent | `senior-dba` | Review DB schema, identify migration strategy |
| APIDesignAgent | `senior-api-designer` | Existing API contracts, REST naming consistency, OpenAPI conflicts |
| BackendResearchAgent | `senior-backend` | Service boundaries in `backend/app/services/` (not API contracts) |
| FrontendResearchAgent | `senior-frontend` | Identify reusable components, assess UI integration points |
| UXAgent | `senior-uiux` | Assess annotation interface UX feasibility |
| I18nAgent | `senior-i18n` | Identify UI strings needing zh-TW / en externalization |

**Phase 2 — Implementation Agents:**

| Teammate | Agent Type | Owns | Responsible For |
|---|---|---|---|
| BackendAgent | `senior-backend` | `backend/app/` | FastAPI routes, models, schemas, services |
| FrontendAgent | `senior-frontend` | `frontend/src/` | React components, pages, hooks, API services |
| I18nAgent | `senior-i18n` | `frontend/src/locales/` | zh-TW / en translation strings, no hardcoded text |
| DBAgent | `senior-dba` | `backend/migrations/` | Schema migrations, index strategy, query optimization |
| TestAgent | `senior-qa` | `backend/tests/`, `frontend/tests/` | pytest unit/integration + Playwright E2E |
| DevOpsAgent _(optional)_ | `senior-devops` | `docker-compose.yml`, `.github/` | Docker, CI/CD pipeline changes |

**Phase 2 — Review Agents** (spawned after implementation, parallel):

| Teammate | Agent Type | Responsible For |
|---|---|---|
| ReviewAgent | `senior-code-reviewer` | Code quality, type safety, logic correctness |
| SecurityAgent | `senior-security` | RBAC, JWT handling, input validation, data leakage prevention |
| PerformanceAgent | `senior-performance` | API p95 latency, DB query efficiency, annotation write throughput |

**On-Demand Agents:**

| Teammate | Agent Type | When to Spawn |
|---|---|---|
| ErrorResolverAgent | `senior-error-resolver` | TaskCompleted retry > 2 times |
| TechWriterAgent | `senior-technical-writer` | After PR merge, update README / API docs |
| NLPAdvisorAgent | `nlp-research-advisor` | NLP task config design or annotation schema decisions |

**File ownership is critical** — each teammate owns distinct directories to prevent git conflicts.

**When to use Agent Teams vs single session:**

| Scenario | Use |
|---|---|
| New feature spanning frontend + backend | Agent Team |
| Bug fix or change within one layer | Single session |
| Documentation or spec changes | Single session |
| Refactoring within one module | Single session |

**Research spawn prompt template:**
```
Before writing the plan for [feature], spawn a read-only research team:
- ArchitectAgent (senior-architect): scan overall codebase structure, cross-cutting integration points,
  naming conventions, and architectural conflicts (do NOT duplicate backend-specific API review)
- DBResearchAgent (senior-dba): review existing DB schema and propose migration strategy
- APIDesignAgent (senior-api-designer): review existing API contracts, REST naming consistency,
  and OpenAPI spec for conflicts with the planned feature
- BackendResearchAgent (senior-backend): identify service boundaries and business logic integration
  points within backend/app/ (focus on services/, not API contracts — that is APIDesignAgent's scope)
- FrontendResearchAgent (senior-frontend): identify reusable components in frontend/src/
- UXAgent (senior-uiux): assess annotation interface UX feasibility
- I18nAgent (senior-i18n): identify UI strings needing zh-TW/en translation
All agents are read-only — no file edits. Synthesize findings for plan.md.
```

**Implementation spawn prompt template:**
```
Create an agent team to implement [feature] based on specs/[NNN]-[feature]/tasks.md.
Spawn:
- BackendAgent (senior-backend): backend tasks, owns backend/app/
- FrontendAgent (senior-frontend): frontend tasks, owns frontend/src/ [parallel with backend]
- I18nAgent (senior-i18n): translation strings, owns frontend/src/locales/ [parallel]
- DBAgent (senior-dba): migrations, owns backend/migrations/
- TestAgent (senior-qa): tests after API contract is confirmed
Require plan approval before any DB schema or API contract changes.
```

## Complete PR Flow

After development is complete, execute the following steps in order. Steps 1–6 are automated; **Step 7 (Merge) requires user confirmation**.

> **Documentation-only changes** (`.md` files only): skip Step 3, but still run Step 2 to verify cross-references and content consistency.

### Step 1 — Commit

Use the correct commit type and push all changes:

```bash
git add <files>
git commit -m "<type>: <description>"
```

### Step 2 — Code Review

Run a code review and fix all findings before proceeding:

- Use `/speckit.checklist` or the `code-review` skill
- Fix issues, then re-commit

### Step 3 — Test Validation _(skip for docs-only changes)_

```bash
# Backend
cd backend && uv run pytest

# Frontend E2E
cd frontend && pnpm playwright test
```

Fix failures, re-commit, and re-run until all tests pass.

### Step 4 — Push

```bash
git push origin <branch-name>
```

### Step 5 — Create PR

```bash
gh pr create --title "<type>: <description>" --base main --head <branch-name> --body "..."
```

**Test Plan requirement**: every checklist item in the PR body must be individually verified. Mark passed items as `[x]`; leave failed items as `[ ]` with a reason.

### Step 6 — Qodo Code Review

After the PR is created, the `qodo-code-review` bot automatically reviews the code. Follow this process:

**6a. Fetch review findings**

```bash
gh api repos/{owner}/{repo}/pulls/{number}/comments \
  --jq '.[] | {path, line, body}'
```

**6b. Fix each finding**, then commit and push to the same branch:

```bash
git add <files>
git commit -m "fix: address qodo review findings"
git push origin <branch-name>
```

**6c. Fetch review thread IDs**

```bash
gh api graphql -f query='
  query {
    repository(owner: "{owner}", name: "{repo}") {
      pullRequest(number: {number}) {
        reviewThreads(first: 50) {
          nodes { id isResolved }
        }
      }
    }
  }'
```

**6d. Resolve fixed threads**

```bash
gh api graphql -f query='
  mutation {
    resolveReviewThread(input: {threadId: "PRRT_xxx"}) {
      thread { id isResolved }
    }
  }'
```

> After each push, the bot re-reviews. Confirm there are no new findings in the latest review round before proceeding to merge.

### Step 7 — Merge + Cleanup _(requires user confirmation)_

```bash
# Merge the PR
gh pr merge <number> --merge

# Switch back to main and pull latest
git checkout main && git pull

# Prune deleted remote branch tracking refs
git fetch --prune

# Delete the local branch
git branch -d <branch-name>

# Delete the remote branch
git push origin --delete <branch-name>
```
