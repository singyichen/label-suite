---
description: Convert tasks.md into actionable GitHub Issues for the feature, ordered by dependency.
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Steps

1. **Read the task list**
   - Load `specs/[###-feature-name]/tasks.md`
   - If tasks.md does not exist, ask the user to run `/speckit.tasks` first

2. **Get the GitHub remote**
   - Run: `git config --get remote.origin.url`
   - Only proceed if the remote is a GitHub URL (`github.com`)
   - **CAUTION**: Never create issues in repositories that do not match the remote URL

3. **Read supporting context**
   - Load `specs/[###-feature-name]/spec.md` for User Story descriptions
   - Load `specs/[###-feature-name]/plan.md` for technical context (if available)

4. **For each task in tasks.md, prepare a GitHub Issue**:
   - **Title**: concise task description (from tasks.md)
   - **Body** includes:
     - User Story reference (e.g., `Implements US-01 (P1)`)
     - Spec reference: `specs/[###-feature-name]/spec.md`
     - Task ID from tasks.md (e.g., `TASK-003`)
     - Acceptance Criteria (from spec.md AC linked to this task)
     - Technical notes (from plan.md if relevant)
   - **Labels**: suggest `feat`, `backend`, `frontend`, `test`, or `chore` based on task type
   - **Milestone**: suggest the feature name as milestone

5. **Create GitHub Issues using `gh` CLI**
   - Command: `gh issue create --title "..." --body "..." --label "..."`
   - Create issues in dependency order (prerequisite tasks first)
   - Output the created issue URLs for confirmation

6. **Report completion**
   - List all created issue URLs
   - Note any tasks skipped (e.g., already have a corresponding issue)
   - Suggest linking issues to a GitHub Project board if applicable
