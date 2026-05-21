# Tasks: [FEATURE NAME]

**Input**: Design documents under `specs/[module]/NNN-feature/`
**Prerequisites**: plan.md (required), spec.md (required)

## Execution Flow

```
1. Load plan.md from feature spec directory
   → If not found: ERROR "No implementation plan found"
   → Extract: tech stack, architecture layers, affected files
2. Load spec.md
   → Extract: User Stories → map to Phase 3/4/...
   → Extract: API contracts → contract test tasks
   → Extract: data models → model/schema tasks
3. Generate tasks by category:
   → Phase 1: Setup (shared infra, packages)
   → Phase 2: Foundational (schema, routes skeleton, service layer)
   → Phase 3+: One phase per User Story (tests first, then implementation)
   → Phase N: Polish (docs, cleanup, security, performance)
4. Apply task rules:
   → Different files = mark [P] for parallel
   → Same file = sequential (no [P])
   → Tests MUST come before implementation (TDD)
   → Tag each task with [USN] for its User Story
5. Number tasks sequentially (T001, T002…)
6. Generate dependency graph
7. Validate task completeness (see Validation Checklist)
8. Return: SUCCESS (tasks ready for /speckit.implement)
```

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Corresponding User Story (US1, US2, US3…)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

- [ ] T001 Create feature directory structure (per plan.md)
- [ ] T002 [P] Install required packages (`pnpm add` / `uv add`)
- [ ] T003 [P] Configure lint and formatting tools

---

## Phase 2: Foundational (Blocking Prerequisites)

**⚠️ Must be completed before any User Story implementation begins**

- [ ] T004 Create database schema and migration
- [ ] T005 [P] Create Pydantic schemas (`backend/app/schemas/[feature].py`)
- [ ] T006 [P] Create API route skeleton (`backend/app/api/routes/[feature].py`)
- [ ] T007 Create frontend service layer (`frontend/src/features/[module]/services/[feature].ts`)

**Checkpoint**: Foundation complete — User Story implementation can begin

---

## Phase 3: User Story 1 - [Title] (Priority: P1) 🎯 MVP

**Goal**: [Description of what this Story delivers]

**Independent Test**: [How to verify this Story works on its own]

### Tests ⚠️ MUST be written and MUST FAIL before ANY implementation

- [ ] T010 [P] [US1] Backend unit tests (`backend/tests/unit/test_[feature].py`)
- [ ] T011 [P] [US1] Playwright E2E tests (`frontend/tests/[module]/[feature].spec.ts`)

### Implementation (ONLY after tests are failing)

- [ ] T012 [P] [US1] Create data model (`backend/app/models/[feature].py`)
- [ ] T013 [US1] Implement service layer (`backend/app/services/[feature].py`)
- [ ] T014 [US1] Implement API endpoint (`backend/app/api/routes/[feature].py`)
- [ ] T015 [US1] Create frontend component (`frontend/src/features/[module]/components/[feature]/`)
- [ ] T016 [US1] Implement frontend page (`frontend/src/features/[module]/pages/[feature]/`)

**Checkpoint**: User Story 1 can be independently verified

---

## Phase 4: User Story 2 - [Title] (Priority: P2)

**Goal**: [Description of what this Story delivers]

**Independent Test**: [How to verify this Story works on its own]

### Tests ⚠️ MUST be written and MUST FAIL before ANY implementation

- [ ] T020 [P] [US2] Backend unit tests
- [ ] T021 [P] [US2] Playwright E2E tests

### Implementation (ONLY after tests are failing)

- [ ] T022 [P] [US2] Create related models
- [ ] T023 [US2] Implement service layer
- [ ] T024 [US2] Implement API endpoint
- [ ] T025 [US2] Create frontend components and pages

**Checkpoint**: User Stories 1 and 2 can both be independently verified

---

## Phase N: Polish & Cross-Cutting Concerns

- [ ] TXXX [P] Update documentation `[Principle: I]`
- [ ] TXXX Code cleanup — remove debug `print` / `console.log` `[Principle: V]`
- [ ] TXXX UI consistency review against MASTER.md tokens and prototype screens `[Principle: VII]`
- [ ] TXXX Verify API P95 ≤ 500ms and no unbounded queries `[Principle: VIII]`
- [ ] TXXX Security hardening — validate inputs, check CORS config
- [ ] TXXX Run `touch specs/[module]/NNN-feature/.completed`

---

## Dependencies

- T004–T007 (Foundational) must complete before any Phase 3+ task
- Tests (T010–T011) block implementation (T012–T016) within each User Story
- T012 (model) blocks T013 (service), T013 blocks T014 (endpoint)
- User Story phases are sequential; implementation within a phase may be parallel [P]

## Parallel Example

```
# Launch foundational tasks together (Phase 2):
Task: "Create Pydantic schemas in backend/app/schemas/[feature].py"
Task: "Create API route skeleton in backend/app/api/routes/[feature].py"

# Launch US1 tests together before implementation:
Task: "Backend unit tests in backend/tests/unit/test_[feature].py"
Task: "Playwright E2E tests in frontend/tests/[module]/[feature].spec.ts"
```

## Task Generation Rules

1. **From spec.md User Stories**
   - Each story → one Phase (3, 4, …) with its own test + implementation block
   - Tag all tasks with [USN]

2. **From spec.md API Contracts**
   - Each endpoint → one backend unit test task [P] + one implementation task

3. **From spec.md Data Models**
   - Each entity → one model creation task [P]
   - Relationships → service layer tasks (sequential)

4. **Ordering rule**
   - Setup → Foundational → (Tests → Implementation) per US → Polish
   - Dependencies block parallel execution

## Validation Checklist

*Verify before returning tasks as complete*

- [ ] All User Stories have a corresponding Phase with tests + implementation
- [ ] All tests are listed BEFORE their implementation tasks
- [ ] Parallel tasks [P] truly touch different files
- [ ] Each task specifies an exact file path
- [ ] All foundational tasks (Phase 2) are marked as blocking
- [ ] Polish phase includes docs, cleanup, security, and performance checks

## Changelog

| Version | Date | Change Summary |
|---------|------|----------------|
| 1.1.0 | 2026-05-21 | Add Execution Flow, Dependencies, Parallel Example, Task Generation Rules, Validation Checklist; strengthen TDD gate language |
| 1.0.1 | 2026-05-21 | Align task paths with module-based SDD directory structure |
| 1.0.0 | — | Initial spec |
