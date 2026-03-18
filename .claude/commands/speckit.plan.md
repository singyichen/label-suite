---
description: Build a technical implementation plan (plan.md) from spec.md.
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

1. **Read spec.md**
   - Load the spec from `specs/[###-feature-name]/spec.md`

2. **Run Constitution Check**
   - Validate against all six principles in `.specify/memory/constitution.md`
   - Record any violations in the Complexity Tracking section

3. **Research phase** (investigate relevant technical choices and constraints)
   - Identify which modules are affected (frontend / backend / both)
   - Confirm data model requirements
   - Confirm API contract requirements

4. **Create plan.md**
   - Path: `specs/[###-feature-name]/plan.md`
   - Copy `.specify/templates/plan-template.md` and fill in the content
   - Complete Technical Context, Project Structure, and Complexity Tracking

5. **Report completion** and suggest next steps:
   - Run `/speckit.tasks` to generate the task list
