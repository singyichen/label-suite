---
description: Generate a domain-specific requirement quality checklist for the current feature. Validates specification completeness, clarity, and consistency — not implementation behavior.
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider user input before proceeding (if not empty).

## Core Concept: Checklists as Requirement Unit Tests

A checklist is the **unit test suite for your requirements** — it validates requirement quality, clarity, and completeness. It is **not** for verifying implementation behavior.

**NOT for verifying implementation:**

- ❌ "Verify the button clicks correctly"
- ❌ "Test that error handling works"
- ❌ "Confirm the API returns 200"
- ❌ Run `pytest` or `pnpm playwright test`

**FOR validating requirement quality:**

- ✅ "Is the number and layout of items explicitly specified?" [Completeness]
- ✅ "Is 'prominently displayed' quantified with concrete dimensions?" [Clarity]
- ✅ "Are hover state requirements consistent across all interactive elements?" [Consistency]
- ✅ "Are keyboard navigation accessibility requirements defined?" [Coverage]
- ✅ "Is fallback behavior specified when an image fails to load?" [Edge Case]

## Steps

1. **Read design documents**
   - `specs/[module]/NNN-feature/spec.md` — functional requirements and scope
   - `specs/[module]/NNN-feature/plan.md` (if exists) — technical decisions and dependencies
   - `specs/[module]/NNN-feature/tasks.md` (if exists) — implementation tasks

2. **Ask up to 3 dynamic clarification questions** to determine checklist domain and focus:
   - Extract signals from the spec/plan: domain keywords (auth, UX, API, security), risk indicators ("critical", "must", "compliance"), explicit deliverables ("a11y", "rollback")
   - Only ask questions that would meaningfully change checklist content
   - Skip questions already answered in `$ARGUMENTS`
   - Format multi-choice questions with a recommendation:
     `**Recommended:** Option [X] — <1-2 sentence reasoning>`

     | Option | Description |
     |--------|-------------|
     | A | ... |

   Defaults when non-interactive:
   - Depth: standard
   - Audience: Reviewer (PR)
   - Focus: top 2 most relevant signal clusters

3. **Generate the checklist file:**
   - Create `specs/[module]/NNN-feature/checklists/` if it does not exist
   - Choose a short descriptive domain name: `ux.md`, `api.md`, `security.md`, `test.md`, `general.md`
   - **Never overwrite** an existing checklist file — append if the file already exists
   - Follow the structure in `.specify/templates/checklist-template.md` (H1 title, meta block, `##` section headers, `- [ ] CHK### item` format)
   - Number items globally starting from CHK001

   **Quality dimensions to cover:**
   - **Completeness**: Are all necessary requirements documented?
   - **Clarity**: Are requirements specific and unambiguous?
   - **Consistency**: Are requirements mutually non-contradictory?
   - **Measurability**: Can success criteria be objectively verified?
   - **Coverage**: Are all flows and edge cases addressed?
   - **Non-Functional Requirements**: Are performance, security, and accessibility requirements specified?
   - **Dependencies & Assumptions**: Are they documented and validated?

   **Item structure — each item must:**
   - Be phrased as a question about requirement quality
   - Focus on what is written (or missing) in the spec
   - Include a quality dimension tag: `[Completeness]`, `[Clarity]`, `[Consistency]`, `[Coverage]`, `[Edge Case]`, `[Measurability]`, `[NFR]`, `[Gap]`, `[Ambiguity]`
   - Include a traceability reference: `[Spec §X.Y]` for existing requirements, `[Gap]` for missing ones
   - **At least 80% of items must include a traceability reference**

   **Example items:**

   ```markdown
   - [ ] CHK001 Is the number and layout of list items explicitly specified? [Completeness, Spec §FR-1]
   - [ ] CHK002 Is "fast response" quantified with a concrete time threshold? [Clarity, Spec §NFR-2]
   - [ ] CHK003 Are error state requirements defined for all API failure modes? [Gap]
   - [ ] CHK004 Is the empty state (zero results) requirement defined? [Coverage, Spec §FR-3]
   - [ ] CHK005 Can "visual hierarchy" requirements be objectively measured? [Measurability, Spec §FR-1]
   - [ ] CHK006 Are the criteria for selecting related items documented? [Clarity, Spec §FR-5]
   ```

   **Absolute prohibitions** (these turn it into an implementation test):
   - ❌ Items starting with "Verify", "Test", "Confirm", "Check" + implementation behavior
   - ❌ Descriptions of code execution, user actions, or runtime system behavior
   - ❌ "displays correctly", "works as expected", "returns 200"
   - ❌ "click", "navigate", "render", "load", "execute"
   - ❌ Test cases, test plans, or QA procedures
   - ❌ Implementation details (frameworks, specific APIs, algorithms)

   **Required patterns:**
   - ✅ "Is [requirement type] defined/specified/documented for [scenario]?"
   - ✅ "Is [vague term] quantified with concrete criteria?"
   - ✅ "Are requirements consistent between [section A] and [section B]?"
   - ✅ "Can [requirement] be objectively measured/verified?"
   - ✅ "Does the spec cover [edge case/scenario]?"

   If candidate items exceed 40: sort by risk/impact and cap at 40. Merge near-duplicate items checking the same requirement aspect.

4. **Report results**
   - Output the full checklist file path and item count
   - Summarize: focus domain, depth level, intended audience, any user-specified must-have items
   - Remind: each `/speckit.checklist` run creates a new domain file and never overwrites existing ones
