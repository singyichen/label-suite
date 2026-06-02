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
   - Read `specs/_governance/constitution.md` (source of truth)
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

4. **Consistency propagation** — actively read and update each dependent file:
   - `.specify/templates/plan-template.md` — ensure Constitution Check section reflects updated principles
   - `.specify/templates/spec-template.md` — ensure scope/requirements alignment
   - `.specify/templates/tasks-template.md` — ensure task categorization matches principles
   - `.specify/templates/checklist-template.md` — ensure checklist items reflect updated principles
   - `.claude/commands/speckit.*.md` — read each file and verify no outdated principle names or removed rule references remain

5. **Generate Sync Impact Report**

   Produce the following report and prepend it to `.specify/memory/constitution.md` as an HTML comment (so it doesn't render in Markdown but is preserved in the file):

   ```html
   <!--
   Sync Impact Report — constitution vX.Y.Z
   Generated: YYYY-MM-DD

   Version change: vOLD → vNEW
   Bump type: MAJOR | MINOR | PATCH — [reason]

   Changed principles:
   - [Old Title] → [New Title] (or: removed / added)

   New sections: (if any)
   Removed sections: (if any)

   Templates sync status:
   - .specify/templates/plan-template.md: ✅ Updated | ⚠ Needs manual review
   - .specify/templates/spec-template.md: ✅ Updated | ⚠ Needs manual review
   - .specify/templates/tasks-template.md: ✅ Updated | ⚠ Needs manual review
   - .specify/templates/checklist-template.md: ✅ Updated | ⚠ Needs manual review
   - .claude/commands/speckit.*.md: ✅ Updated | ⚠ Needs manual review

   Deferred TODOs: (if any placeholder was intentionally left)
   -->
   ```

6. **Output validation** — before writing, verify:
   - No unexplained bracketed tokens remain (e.g., `[PROJECT_NAME]`, `[PRINCIPLE_1_NAME]`)
   - Version number line in the document matches the Sync Impact Report
   - All dates use ISO format `YYYY-MM-DD`
   - Each Principle section is declarative and testable (avoid "should" — use MUST/SHOULD with explicit rationale)
   - Governance section covers: amendment procedure, versioning policy, compliance review

7. **Write the updated constitution**
   - Write to `specs/_governance/constitution.md` first (source of truth, with the Sync Impact Report HTML comment prepended)
   - Then copy the full content to `.specify/memory/constitution.md` to keep the tool cache in sync

8. **Report to the user**
   - New version and bump rationale
   - List of changed principles
   - Files updated as part of propagation
   - Files requiring manual follow-up (if any)
   - Suggested commit message: `docs: amend constitution to vX.Y.Z ([reason])`
