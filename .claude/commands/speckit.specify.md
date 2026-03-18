---
description: Create a feature specification (spec.md) from a natural language description.
handoffs:
  - label: Build Technical Plan
    agent: speckit.plan
    prompt: Create a plan for the spec. I am building with FastAPI + React + TypeScript.
    send: true
  - label: Clarify Spec Requirements
    agent: speckit.clarify
    prompt: Clarify specification requirements
    send: true
---

## User Input

```text
$ARGUMENTS
```

## When to Use This Command

Only run `/speckit.specify` when the change will make the system behave **differently** from what existing specs define. Skip it and modify code directly for: bug fixes, typo/formatting/comment changes, non-breaking dependency updates, config adjustments, and adding tests for existing behavior.

## Steps

1. **Generate a short feature name** (2-4 words in kebab-case)
   - Example: "add labeling task config UI" → `labeling-task-config`

2. **Find the next available number**
   - Scan the `specs/` directory and take the current highest number + 1
   - Format: three digits (e.g., `001`, `002`)

3. **Create the feature directory and spec.md**
   - Path: `specs/[###-feature-name]/spec.md`
   - Copy `.specify/templates/spec-template.md` and fill in the content

4. **Fill in spec.md based on the user description**
   - Include at least 2 User Stories (P1 is required)
   - Each Story must have acceptance scenarios (Given/When/Then)
   - Fill in Functional Requirements and Success Criteria

5. **Report completion** and suggest next steps:
   - Run `/speckit.clarify` to clarify requirements (optional)
   - Run `/speckit.plan` to create the implementation plan
