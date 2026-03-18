---
description: Execute the implementation plan by processing and executing all tasks defined in tasks.md.
handoffs:
  - label: Run Quality Checklist
    agent: speckit.checklist
    prompt: Run the quality checklist for the implemented feature
    send: true
---

## User Input

```text
$ARGUMENTS
```

## Steps

1. **Read the task list**
   - Load `specs/[###-feature-name]/tasks.md`

2. **Verify the branch**
   - Confirm the current branch is the correct feature branch (`feat/[###-feature-name]`)
   - If not, remind the user to create and switch to the correct branch

3. **Execute tasks in order**
   - Start from Phase 1 and complete tasks sequentially
   - Tasks marked `[P]` can be run in parallel
   - Pause at each Checkpoint to verify the User Story works independently

4. **Test-first**
   - If a task includes tests, write the tests first and confirm they fail
   - Then implement the feature to make the tests pass

5. **Commit after each logical group of changes**
   - Format: `feat: [description]`

6. **Clean up on completion**
   - Remove debug statements (`print` / `console.log`)
   - Run `/speckit.checklist` to validate quality

7. **Mark as complete**
   - `touch specs/[feature-dir]/.completed`
