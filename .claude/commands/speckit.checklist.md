---
description: Generate a custom quality validation checklist for the current feature based on user requirements.
---

## User Input

```text
$ARGUMENTS
```

## Steps

1. **Read spec.md and plan.md**
   - Understand the feature's requirements and technical decisions

2. **Create checklist.md**
   - Path: `specs/[###-feature-name]/checklists/checklist.md`
   - Copy `.specify/templates/checklist-template.md` and adapt to the feature's specifics

3. **Run through each check**
   - Code Quality
   - Constitution Compliance
   - Testing (run `pytest` and `pnpm playwright test`)
   - Security
   - Documentation

4. **Report results**
   - List any failed items and suggest how to fix them
