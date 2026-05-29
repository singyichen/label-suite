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

2. **Choose the feature module and find the next available number**
   - Module must be one of: `account`, `dashboard`, `task-management`, `annotation`, `dataset`, `admin`
   - The create script scans `specs/[module]/` and assigns the next three-digit number

3. **Create the feature directory and spec.md**
   - Run `scripts/speckit/create-new-feature.sh --module [module] --short-name [short-feature-name] --json "$ARGUMENTS"` from the repo root
   - Parse FEATURE_MODULE, FEATURE_NAME, BRANCH, FEATURE_DIR, and SPEC_FILE from the JSON output
   - The script creates branch `feat/[module]/NNN-feature`, creates `specs/[module]/NNN-feature/spec.md`, and updates `specs/STATUS.md` to `spec-ready`

4. **Fill in spec.md based on the user description**
   - Include at least 2 User Stories (P1 is required)
   - Each Story must have acceptance scenarios (Given/When/Then)
   - Fill in Functional Requirements and Success Criteria

5. **Validate spec quality**

   a. **Self-review against quality criteria** — check each of the following:
      - No implementation details (languages, frameworks, specific APIs)
      - Focused on user value and business needs, not technical solutions
      - All mandatory sections completed (User Stories, Functional Requirements, Success Criteria)
      - At least 2 User Stories, each with Given/When/Then acceptance scenarios
      - Success criteria are measurable and technology-agnostic
      - No `[NEEDS CLARIFICATION]` markers remaining (max 3 are allowed; see below)
      - Edge cases are identified
      - Scope is clearly bounded

   b. **If quality issues are found (excluding `[NEEDS CLARIFICATION]` markers)**:
      - List the failing items with specific problems (quote the relevant spec section)
      - Fix each issue in the spec
      - Re-check until all items pass (max 3 fix cycles; note any remaining issues if still failing after 3)

   c. **If `[NEEDS CLARIFICATION]` markers remain** (max 3 allowed):
      - Extract all `[NEEDS CLARIFICATION: ...]` markers from the spec
      - If more than 3 exist, keep only the 3 most critical (ranked: scope > security/privacy > UX > technical detail); resolve the rest with reasonable defaults
      - Present all questions at once in the format below, then wait for a single reply:

        ```markdown
        ## Question 1: [Topic]

        **Context**: [Quote relevant spec section]
        **What we need to know**: [The specific question]

        **Suggested Answers**:

        | Option | Answer | Implications |
        |--------|--------|--------------|
        | A | [First option] | [What this means for the feature] |
        | B | [Second option] | [What this means for the feature] |
        | Custom | Provide your own answer | — |
        ```

      - User replies in the form: `Q1: A, Q2: B, Q3: Custom - [details]`
      - Replace each `[NEEDS CLARIFICATION]` marker with the chosen answer
      - Re-run the quality check after all clarifications are applied

6. **Report completion** and suggest next steps:
   - Run `/speckit.clarify` to clarify requirements (optional)
   - Run `/speckit.plan` to create the implementation plan
