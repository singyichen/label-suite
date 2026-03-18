# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Label-Eval-Portal — A configurable, general-purpose NLP data labeling and automated evaluation portal, developed as a master's thesis research outcome (Demo Paper).

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

```
label-eval-portal/
├── frontend/                # React + TypeScript frontend
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── pages/           # Page components
│   │   ├── hooks/           # Custom hooks
│   │   ├── services/        # API client layer
│   │   ├── stores/          # State management
│   │   └── types/           # TypeScript type definitions
│   ├── tests/               # Playwright E2E tests
│   ├── vite.config.ts
│   └── package.json
├── backend/                 # FastAPI backend
│   ├── app/
│   │   ├── api/routes/      # API route handlers
│   │   ├── core/            # Core logic, middleware
│   │   ├── models/          # Database models
│   │   ├── schemas/         # Pydantic schemas
│   │   ├── services/        # Business logic layer
│   │   ├── utils/           # Utility functions
│   │   └── main.py          # FastAPI entry point
│   ├── tests/               # pytest tests
│   └── pyproject.toml
├── docs/                    # Project documentation
│   └── research/            # Research & tool analysis
├── docker-compose.yml
├── README.md
├── README.zh-TW.md
└── CLAUDE.md
```

## Communication

- **English-first**: All documentation, comments, commit messages, spec files, and code are written in English.
- The only exception is `README.zh-TW.md`, which is maintained in Traditional Chinese for Chinese-speaking users.
- All conversations with Claude should be responded to in Traditional Chinese, but all written project artifacts must be in English.

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
| `test` | Tests | `test: add leaderboard E2E tests` |
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
| `test/` | Tests | `test/leaderboard-e2e` |
| `chore/` | Build / dependencies | `chore/upgrade-dependencies` |

### Protection Rules

- Never push directly to `main`
- Always create and switch to a new branch before starting a new feature

## Spec-Driven Development (SDD)

This project adopts Spec-Driven Development (SDD). New features should follow this sequence:

```
/speckit.specify <feature description>  → specs/NNN-feature/spec.md
/speckit.clarify                        → clarify requirements (optional)
/speckit.plan                           → specs/NNN-feature/plan.md
/speckit.tasks                          → specs/NNN-feature/tasks.md
/speckit.analyze                        → cross-document consistency check (optional)
/speckit.implement                      → execute implementation
/speckit.checklist                      → quality validation
```

**Key Rules**:
- Each spec directory contains: `spec.md`, `plan.md`, `tasks.md`, `checklists/`
- Follow User Story priority order (P1 → P2 → P3)
- Mark completion with `touch specs/<feature-dir>/.completed`

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
| `/speckit.clarify` | Identify and clarify ambiguous requirements |
| `/speckit.plan` | Build technical implementation plan |
| `/speckit.tasks` | Generate executable task list |
| `/speckit.analyze` | Cross-document consistency analysis |
| `/speckit.implement` | Execute implementation from task list |
| `/speckit.checklist` | Generate quality validation checklist |

### Constitution Reference

All development must follow the six core principles in [constitution.md](.specify/memory/constitution.md):

1. **Spec-First Development** (RECOMMENDED) — write spec before new features
2. **Generalization-First** (NON-NEGOTIABLE) — Config-driven, no hardcoded task logic
3. **Data Fairness** (NON-NEGOTIABLE) — prevent test-set answer leakage
4. **Test-First** (RECOMMENDED) — pytest 80%+ coverage, Playwright for core flows
5. **Simplicity** — YAGNI, KISS, avoid over-engineering
6. **English-First** — all project artifacts in English except `README.zh-TW.md`

---

## Workflow

| Workflow | Purpose | When | Steps |
|---|---|---|---|
| **New Feature** | End-to-end feature development | Starting new feature | `/speckit.specify` → `/speckit.plan` → `/speckit.tasks` → `/speckit.implement` → PR |
| **Code Review** | Review code quality, type safety, security | Before creating PR | Code Style → type check (`tsc` / `mypy`) → Lint (`ruff` / `eslint`) → logic review |
| **Testing** | Verify correctness and coverage | On code changes | Run `pytest` (backend) → `playwright test` (E2E) → verify coverage |
| **Bug Fix** | From reproduction to resolution | Bug discovered | Create `fix/` branch → reproduce → fix → regression test → PR |
| **PR Flow** | Merge feature into main | Feature complete | Push → Create PR → Code Review → Tests pass → Merge → Delete branch |
