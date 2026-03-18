---
description: Identify and clarify ambiguous or incomplete requirements in spec.md (max 5 questions).
handoffs:
  - label: Build Technical Plan
    agent: speckit.plan
    prompt: Create a plan for the spec. I am building with FastAPI + React + TypeScript.
    send: true
---

## User Input

```text
$ARGUMENTS
```

## Steps

1. **Read spec.md**
   - Load the spec from `specs/[###-feature-name]/spec.md`

2. **Identify ambiguities**, focusing on:
   - Are the User Story acceptance scenarios specific and testable?
   - Are there any `[NEEDS CLARIFICATION]` markers in Functional Requirements?
   - Are any Edge Cases missing?
   - Are the Success Criteria measurable?

3. **List the questions**
   - Explain why each question needs clarification
   - Provide possible options for the user to choose from

4. **Update spec.md based on user responses**

5. **Report completion** and suggest next steps:
   - Run `/speckit.plan` to create the implementation plan
