# Tasks: [FEATURE NAME]

**Input**: Design documents under `specs/[module]/NNN-feature/`
**Prerequisites**: plan.md (required), spec.md (required)

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Corresponding User Story (US1, US2, US3...)
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

### Tests (optional) ⚠️ Tests must be written and confirmed to fail before implementation

- [ ] T010 [P] [US1] Backend unit tests (`backend/tests/unit/test_[feature].py`)
- [ ] T011 [P] [US1] Playwright E2E tests (`frontend/tests/[module]/[feature].spec.ts`)

### Implementation

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

### Tests (optional) ⚠️

- [ ] T020 [P] [US2] Backend unit tests
- [ ] T021 [P] [US2] Playwright E2E tests

### Implementation

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

## Changelog

| Version | Date | Change Summary |
|---------|------|----------------|
| 1.0.1 | 2026-05-21 | Align task paths with module-based SDD directory structure |
| 1.0.0 | [YYYY-MM-DD] | Initial spec |
