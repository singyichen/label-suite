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
   - Load `specs/[module]/NNN-feature/tasks.md`

2. **Check checklist status (pre-implementation gate)**
   - Scan `specs/[module]/NNN-feature/checklists/` for all checklist files (if the directory exists)
   - For each file, count: total items (`- [ ]` + `- [x]` + `- [X]`), completed (`- [x]` or `- [X]`), incomplete (`- [ ]`)
   - Display a status table:

     | Checklist | Total | Completed | Incomplete | Status |
     |-----------|-------|-----------|------------|--------|
     | ux.md     | 12    | 12        | 0          | ✓ PASS |
     | api.md    | 8     | 5         | 3          | ✗ FAIL |

   - **If any checklist has incomplete items**: show the table and ask: "Some checklists are not complete. Proceed with implementation anyway? (yes/no)"
     - "no" / "wait" / "stop" → stop; do not continue
     - "yes" / "proceed" / "continue" → continue to step 3
   - **If all checklists pass** (or no `checklists/` directory exists): proceed automatically

3. **Verify the branch**
   - Confirm the current branch is the correct feature branch (`feat/NNN-feature`)
   - If not, remind the user to create and switch to the correct branch

4. **Execute tasks in order**
   - Start from Phase 1 and complete tasks sequentially
   - Tasks marked `[P]` can be run in parallel
   - Pause at each Checkpoint to verify the User Story works independently

5. **Test-first (REQUIRED — no exceptions)**
   - Write the test first; confirm it **fails** before writing any implementation code
   - Then implement until the test passes
   - Common rationalisations to reject: "it's too simple", "I tested manually", "there's no logic" — none of these are valid excuses
   - If you wrote implementation code before a test: **delete the implementation and restart with the test**

6. **Commit after each logical group of changes**
   - Format: `feat: [description]`

7. **Clean up on completion**
   - Remove debug statements (`print` / `console.log`)
   - Run `/speckit.checklist` to validate quality

8. **Run consistency analysis (REQUIRED gate — must pass before marking complete)**
   - Run `/speckit.analyze` and read the full output
   - Fix every finding reported — do not skip or defer
   - Re-run until output reports zero findings
   - You MUST NOT open a PR or mark complete while findings remain

9. **Mark as complete**
   - `touch specs/[module]/NNN-feature/.completed`
   - Note: `specs/STATUS.md` status remains `in-progress` until a PR is opened; `/pr-flow` will update it to `review` on PR open and `done` after merge to `main`
