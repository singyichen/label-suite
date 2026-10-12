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
   - Load `openspec/changes/<change>/tasks.md`
   - If tasks.md does not exist, ask the user to run `/opsx:propose` first

2. **Get the GitHub remote**
   - Run: `git config --get remote.origin.url`
   - Only proceed if the remote is a GitHub URL (`github.com`)
   - **CAUTION**: Never create issues in repositories that do not match the remote URL

3. **Read supporting context**
   - Load `specs/[module]/NNN-feature/spec.md` for User Story descriptions
   - Load `openspec/changes/<change>/design.md` for technical context (if available)

4. **For each task in tasks.md, prepare a GitHub Issue**:
   - **Title**: `[Task] <scope>: <中文描述>` (English prefix, Traditional Chinese description derived from tasks.md)
   - **Body**: Traditional Chinese, technical terms stay in English; fill the matching template in `.github/issue-templates.md`. It includes:
     - User Story reference (e.g., `Implements US-01 (P1)`)
     - Spec reference: `specs/[module]/NNN-feature/spec.md`
     - Task ID from tasks.md (e.g., `TASK-003`)
     - Acceptance Criteria (from spec.md AC linked to this task)
     - Technical notes (from design.md if relevant)
   - **Labels**: use the issue-type label from `.claude/rules/issue-reporting.md` (e.g. `task`) plus the matching `scope:*` label (`scope:backend`, `scope:frontend`, `scope:e2e`, `scope:infra`)
   - **Milestone**: suggest the feature name as milestone

5. **Create GitHub Issues using `gh` CLI**
   - Command: `gh issue create --title "..." --body "..." --label "..."`
   - Create issues in dependency order (prerequisite tasks first)
   - Output the created issue URLs for confirmation

6. **Report completion**
   - List all created issue URLs
   - Note any tasks skipped (e.g., already have a corresponding issue)
   - Suggest linking issues to a GitHub Project board if applicable
