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

4. **Test-first (REQUIRED — no exceptions)**
   - Write the test first; confirm it **fails** before writing any implementation code
   - Then implement until the test passes
   - Common rationalisations to reject: "it's too simple", "I tested manually", "there's no logic" — none of these are valid excuses
   - If you wrote implementation code before a test: **delete the implementation and restart with the test**

5. **Commit after each logical group of changes**
   - Format: `feat: [description]`

6. **Clean up on completion**
   - Remove debug statements (`print` / `console.log`)
   - Run `/speckit.checklist` to validate quality

7. **Run consistency analysis (REQUIRED gate — must pass before marking complete)**
   - Run `/speckit.analyze` and read the full output
   - Fix every finding reported — do not skip or defer
   - Re-run until output reports zero findings
   - You MUST NOT open a PR or mark complete while findings remain

8. **Mark as complete**
   - `touch specs/[feature-dir]/.completed`
   - Update `specs/STATUS.md` row → `done`
