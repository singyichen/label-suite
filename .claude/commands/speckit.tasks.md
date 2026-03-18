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
   - `specs/[###-feature-name]/spec.md`
   - `specs/[###-feature-name]/plan.md`

2. **Break down tasks by User Story**
   - Each User Story maps to one Phase
   - Each task includes: ID, parallelism flag ([P]), Story label ([US1], etc.)
   - Include exact file paths in task descriptions

3. **Create tasks.md**
   - Path: `specs/[###-feature-name]/tasks.md`
   - Copy `.specify/templates/tasks-template.md` and fill in actual tasks

4. **Verify task independence**
   - Tasks within each User Story can be completed and tested independently
   - Completing P1 tasks alone should deliver a viable MVP

5. **Report completion** and suggest next steps:
   - Run `/speckit.implement` to begin implementation
