---
description: Create or update the project constitution, ensuring all dependent templates and commands stay in sync.
handoffs:
  - label: Build Specification
    agent: speckit.specify
    prompt: Implement the feature specification based on the updated constitution. I want to build...
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Steps

1. **Load the existing constitution**
   - Read `.specify/memory/constitution.md`
   - If it does not exist, copy from `.specify/templates/constitution-template.md` first

2. **Collect values for any placeholder tokens** (`[ALL_CAPS_IDENTIFIER]`)
   - Use user input if provided; otherwise infer from repo context (README, docs, prior versions)
   - For dates: `RATIFICATION_DATE` is the original adoption date; `LAST_AMENDED_DATE` is today if changes are made
   - `CONSTITUTION_VERSION` must follow semantic versioning:
     - **MAJOR**: Backward-incompatible removal or redefinition of a principle
     - **MINOR**: New principle or section added
     - **PATCH**: Clarification, wording fix, or non-semantic refinement

3. **Draft the updated constitution**
   - Replace every placeholder with concrete text (no bracketed tokens left)
   - Each Principle section must have: a concise name, non-negotiable rules, and rationale
   - Governance section must cover: amendment procedure, versioning policy, compliance review

4. **Consistency propagation** — check and update dependent files:
   - `.specify/templates/plan-template.md` — ensure Constitution Check section reflects updated principles
   - `.specify/templates/spec-template.md` — ensure scope/requirements alignment
   - `.specify/templates/tasks-template.md` — ensure task categorization matches principles
   - `.specify/templates/checklist-template.md` — ensure checklist items reflect updated principles
   - `.claude/commands/speckit.*.md` — verify no outdated principle references

5. **Write the updated constitution**
   - Overwrite `.specify/memory/constitution.md`

6. **Report to the user**
   - New version and bump rationale
   - List of changed principles
   - Files updated as part of propagation
   - Files requiring manual follow-up (if any)
   - Suggested commit message: `docs: amend constitution to vX.Y.Z ([reason])`
