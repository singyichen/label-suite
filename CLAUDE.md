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

> **Decision:** This project uses a Modular Monorepo — frontend and backend co-located in the same repository under separate top-level directories. See [ADR-001](docs/adr/001-monorepo-structure.md) for the full rationale. All architectural decisions are documented in [docs/adr/](docs/adr/).

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

- **English-first**: Code, comments, commit messages, and API contracts are written in English.
- **Traditional Chinese allowed** in the following locations, to accelerate development iteration:
  - `docs/` — all research, thesis, and design documentation
  - `specs/` — all SDD spec files (`spec.md`, `plan.md`, `tasks.md`, `checklists/`)
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
| `/speckit.implement` | Execute implementation — single session (bug fix / single-layer) or Agent Team (new feature) |
| `/speckit.checklist` | Generate quality validation checklist |

### Constitution Reference

All development must follow the six core principles in [constitution.md](.specify/memory/constitution.md):

1. **Spec-First Development** (RECOMMENDED) — write spec before new features
2. **Generalization-First** (NON-NEGOTIABLE) — Config-driven, no hardcoded task logic
3. **Data Fairness** (NON-NEGOTIABLE) — prevent test-set answer leakage
4. **Test-First / TDD** (RECOMMENDED) — pytest 80%+ coverage, Playwright for core flows; all agents must follow Red-Green-Refactor (see [ADR-009](docs/adr/009-testing-strategy.md))
5. **Simplicity** — YAGNI, KISS, avoid over-engineering
6. **English-First** — code, comments, and commit messages in English; Traditional Chinese allowed in `docs/` and `specs/`

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
/speckit.specify → /speckit.clarify (optional)

  [Optional: Research Agents] — spawn before /speckit.plan for complex features
  (read-only, parallel, skip for simple/single-layer features)

  ├──→ [ArchitectAgent]     scan existing code, identify integration points and naming conventions
  ├──→ [BackendAgent]       check DB schema conflicts, existing API contracts
  └──→ [FrontendAgent]      identify reusable components, assess UI integration points
       ↓ Team Lead synthesizes findings
  ⚠️  Human Review — confirm research findings before writing plan

/speckit.plan → /speckit.tasks

── Phase 2: Agent Team Implementation ────────────────────────────────────────
[Team Lead] reads tasks.md and spawns 3 teammates:

  ├──→ [BackendAgent]   owns: backend/app/       (FastAPI routes / models / services)
  ├──→ [FrontendAgent]  owns: frontend/src/       (React components / pages / services)  ← parallel
  └──→ [TestAgent]      owns: backend/tests/ + frontend/tests/  (pytest + Playwright)

  ⚠️  Human Review checkpoint — required before any DB schema or API contract change
      Tell Team Lead: "Require plan approval before BackendAgent makes schema changes"

  TaskCompleted hook — auto quality gate after each task:
    backend task  → uv run ruff check . && uv run mypy .
    frontend task → pnpm tsc --noEmit && pnpm lint
    if fails      → teammate retries (max 2), then escalates to Team Lead

  TeammateIdle hook — when all teammates idle, Team Lead spawns:
  └──→ [ReviewAgent]    reviews all changed files, retry loop ≤ 2 if issues found

  ⚠️  Human Review interrupt — approve before proceeding to PR
      ReviewAgent posts summary; you confirm or redirect

  [ChecklistAgent] → /speckit.checklist

── Phase 3: PR Flow ──────────────────────────────────────────────────────────
See Complete PR Flow below
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

**Team composition** (3–4 teammates for most features):

| Teammate | Agent Type | Owns | Responsible For |
|---|---|---|---|
| BackendAgent | `senior-backend` | `backend/app/` | FastAPI routes, models, schemas, services |
| FrontendAgent | `senior-frontend` | `frontend/src/` | React components, pages, hooks, API services |
| TestAgent | `senior-qa` | `backend/tests/`, `frontend/tests/` | pytest unit/integration + Playwright E2E |
| ReviewAgent | `senior-code-reviewer` | all changed files | Code review, type safety, security |

**Research Agents** (Phase 1, read-only, optional for complex features):

| Teammate | Agent Type | Responsible For |
|---|---|---|
| ArchitectAgent | `senior-architect` | Scan existing code, identify integration points and naming conventions |
| BackendAgent | `senior-backend` | Check DB schema conflicts, review existing API contracts |
| FrontendAgent | `senior-frontend` | Identify reusable components, assess UI integration points |

**Research spawn prompt template:**
```
Before writing the plan for [feature], spawn a read-only research team:
- ArchitectAgent (senior-architect): scan codebase for integration points, naming conventions, and potential conflicts
- BackendAgent (senior-backend): review DB schema and existing API contracts for conflicts
- FrontendAgent (senior-frontend): identify reusable components in frontend/src/
All agents are read-only — no file edits. Synthesize findings for plan.md.
```

**File ownership is critical** — each teammate owns distinct directories to prevent git conflicts.

**When to use Agent Teams vs single session:**

| Scenario | Use |
|---|---|
| New feature spanning frontend + backend | Agent Team |
| Bug fix or change within one layer | Single session |
| Documentation or spec changes | Single session |
| Refactoring within one module | Single session |

**Spawn prompt template:**
```
Create an agent team to implement [feature] based on specs/[NNN]-[feature]/tasks.md.
Spawn:
- BackendAgent (senior-backend): implement backend tasks, own backend/app/
- FrontendAgent (senior-frontend): implement frontend tasks, own frontend/src/ [parallel with backend]
- TestAgent (senior-qa): write tests after API contract is confirmed
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
