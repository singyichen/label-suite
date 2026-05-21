---
description: Generate an executable task list (tasks.md) from spec.md and plan.md.
handoffs:
  - label: Analyze For Consistency
    agent: speckit.analyze
    prompt: Run a project analysis for consistency
    send: true
  - label: Implement Project
    agent: speckit.implement
    prompt: Start the implementation in phases
    send: true
  - label: Convert to GitHub Issues
    agent: speckit.taskstoissues
    prompt: Convert tasks to GitHub Issues
---

## User Input

```text
$ARGUMENTS
```

## Steps

1. **Read design documents**
   - `specs/[module]/NNN-feature/spec.md`
   - `specs/[module]/NNN-feature/plan.md`

2. **Break down tasks by User Story**

   Organize tasks using this phase structure:
   - **Phase 1 — Setup**: Project initialization, shared infrastructure (no Story label)
   - **Phase 2 — Foundational**: Blocking prerequisites for all User Stories (no Story label)
   - **Phase 3+ — User Stories**: One phase per User Story, ordered by priority (P1, P2, P3…); within each phase: Tests (if applicable) → Models → Services → Endpoints/UI → Integration
   - **Final Phase — Polish**: Cross-cutting concerns, documentation, performance

   **Strict task format — every task must follow exactly:**

   ```text
   - [ ] T001 [P] [US1] Description with exact file path
   ```

   Format components:
   1. `- [ ]` — Markdown checkbox (required)
   2. `T001` — Sequential ID in execution order (T001, T002, T003…)
   3. `[P]` — Include only if the task can run in parallel (different file, no unfinished dependency)
   4. `[US1]` — Include only for User Story phase tasks (`[US1]`, `[US2]`, etc.); omit for Setup/Foundational/Polish
   5. Description with an exact file path

   **Valid examples:**
   - `- [ ] T001 Create project structure per implementation plan`
   - `- [ ] T005 [P] Implement authentication middleware in backend/app/core/auth.py`
   - `- [ ] T012 [P] [US1] Create User model in backend/app/models/user.py`
   - `- [ ] T014 [US1] Implement UserService in backend/app/services/user_service.py`

   **Invalid examples (do not produce):**
   - `- [ ] Create User model` — missing ID and Story label
   - `T001 [US1] Create model` — missing checkbox
   - `- [ ] [US1] Create User model` — missing task ID
   - `- [ ] T001 [US1] Create model` — missing file path

   **TDD (REQUIRED — no exceptions)**: Write test tasks before implementation tasks for every User Story. A test task must appear before the implementation task it covers. (Project policy: TDD is mandatory regardless of feature complexity.)

3. **Create tasks.md**
   - Path: `specs/[module]/NNN-feature/tasks.md`
   - Copy `.specify/templates/tasks-template.md` and fill in actual tasks
   - Include a **Dependency Diagram** section showing User Story completion order:

     ```text
     ## Dependency Diagram

     Phase 1 (Setup) → Phase 2 (Foundational) → Phase 3 (US1) → Phase 4 (US2) → ...

     US1 must complete before: US2 (shares UserService)
     US2 is independent of: US3
     ```

   - Include **Parallel Execution Notes** per User Story: list which tasks within the story can run concurrently

4. **Verify task independence**
   - Tasks within each User Story can be completed and tested independently
   - Completing P1 tasks alone should deliver a viable MVP

5. **Report completion** and suggest next steps:
   - Run `/speckit.implement` to begin implementation
