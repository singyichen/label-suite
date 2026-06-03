---
description: Build a technical implementation plan (plan.md) from spec.md.
scripts:
  sh: scripts/speckit/setup-plan.sh --json
handoffs:
  - label: Create Tasks
    agent: speckit.tasks
    prompt: Break the plan into tasks
    send: true
  - label: Create Checklist
    agent: speckit.checklist
    prompt: Create a checklist for the following domain...
---

## User Input

```text
$ARGUMENTS
```

## Steps

1. **Initialize plan context**
   - **前置條件**：必須先切換至正確的功能分支 `feat/[module]/NNN-feature`，或於執行前設定 `SPECIFY_FEATURE=[module]/NNN-feature`，否則 `{SCRIPT}` 無法解析功能模組
   - Run `{SCRIPT}` from the repo root once and parse FEATURE_MODULE, FEATURE_NAME, FEATURE_SPEC, IMPL_PLAN, FEATURE_DIR, and BRANCH
   - Load `FEATURE_SPEC`

2. **Run Constitution Check**
   - Load `.specify/memory/constitution.md`
   - Determine affected scopes from `FEATURE_MODULE`, `FEATURE_SPEC`, and expected files:
     - Backend scope: backend code, API routes, schemas, services, database models, migrations, Redis, Celery, OpenAPI, backend security, backend performance, or backend deployment
     - Frontend scope: React code, prototypes binding to React behavior, frontend routing, shared UI, i18n, Storybook, accessibility, frontend state, selector contracts, or frontend performance
     - Testing scope: all behavior changes, bug fixes with regression tests, test strategy, coverage, fixtures, CI checks, Playwright, Vitest, pytest, or security leakage tests
   - Load every applicable domain constitution:
     - `.specify/memory/backend-constitution.md` for backend scope
     - `.specify/memory/frontend-constitution.md` for frontend scope
     - `.specify/memory/testing-constitution.md` for testing scope
   - Validate against the main constitution and every applicable domain constitution
   - Record any violations in the Complexity Tracking section

3. **Research phase** (investigate relevant technical choices and constraints)
   - Identify which modules are affected (frontend / backend / both)
   - Confirm data model requirements
   - Confirm API contract requirements

4. **Create plan.md**
   - Path: `IMPL_PLAN`
   - The script creates `IMPL_PLAN` from `.specify/templates/plan-template.md` if it does not already exist and updates `specs/STATUS.md` to `plan-ready`
   - Fill in the content
   - Complete Technical Context, Project Structure, and Complexity Tracking

5. **Report completion** and suggest next steps:
   - Run `/speckit.tasks` to generate the task list
