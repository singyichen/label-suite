---
description: Perform a non-destructive cross-artifact consistency and quality analysis across spec.md, plan.md, and tasks.md after task generation.
handoffs:
  - label: Implement Project
    agent: speckit.implement
    prompt: Start the implementation in phases
    send: true
---

## User Input

```text
$ARGUMENTS
```

## Steps

1. **Read all design documents**
   - `specs/[###-feature-name]/spec.md`
   - `specs/[###-feature-name]/plan.md`
   - `specs/[###-feature-name]/tasks.md`

2. **Consistency check**
   - Does every User Story in spec.md map to a Phase in tasks.md?
   - Does the Project Structure in plan.md match the file paths in tasks.md?
   - Does every Functional Requirement have a corresponding task?
   - Does every Success Criterion have a corresponding test task?

3. **Constitution compliance check**
   - Validate against all six principles in `.specify/memory/constitution.md`
   - Identify any potential violations

4. **Report analysis results**
   - List inconsistencies and suggested corrections
   - List Constitution compliance issues
