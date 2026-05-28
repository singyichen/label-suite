---
description: Perform a non-destructive cross-artifact consistency and quality analysis across spec.md, plan.md, and tasks.md after task generation.
scripts:
  sh: scripts/speckit/check-prerequisites.sh --json --require-tasks --include-tasks
handoffs:
  - label: Implement Project
    agent: speckit.implement
    prompt: Start the implementation in phases
    send: true
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider user input before proceeding (if not empty).

## Goal

Before implementation, find inconsistencies, duplicates, ambiguities, and under-specified items across three core artifacts (`spec.md`, `plan.md`, `tasks.md`). This command **may only** run after `/speckit.tasks` has successfully produced a complete `tasks.md`.

## Operating Constraints

**Strictly read-only**: Do **not** modify any file. Output only a structured analysis report. Optionally offer correction suggestions — only apply them after explicit user approval.

**Constitution authority**: The project constitution (`.specify/memory/constitution.md`) is **non-negotiable** within this analysis. Any constitution conflict is automatically CRITICAL severity. If a principle needs changing, update the constitution separately via `/speckit.constitution` — never dilute or silently ignore it here.

## Steps

### 1. Initialize Analysis Context

Run `{SCRIPT}` from the repo root once and parse the JSON payload:
- FEATURE_MODULE
- FEATURE_NAME
- FEATURE_DIR
- FEATURE_SPEC
- IMPL_PLAN
- TASKS
- AVAILABLE_DOCS

The script resolves the current feature from `feat/[module]/NNN-feature` or `SPECIFY_FEATURE=module/NNN-feature`.

If any required file is missing, abort with an error message directing the user to run the missing prerequisite command.

### 2. Load Artifacts (Progressive Disclosure)

Load only the minimum necessary context from each artifact:

**From spec.md:**

- Overview / context
- Functional Requirements
- Non-Functional Requirements
- User Stories
- Edge Cases (if present)

**From plan.md:**

- Architecture / tech stack choices
- Data model references
- Phase breakdown
- Technical constraints

**From tasks.md:**

- Task IDs
- Descriptions
- Phase groupings
- Parallel markers [P]
- Referenced file paths

**From constitution:**

- Load `.specify/memory/constitution.md` for principle validation

### 3. Build Semantic Model

Build an internal representation (**do not** include raw artifact content in output):
- **Requirements list**: Each functional and non-functional requirement with a stable slug key (e.g., "User can upload file" → `user-can-upload-file`)
- **User story / action list**: Independent user behaviors with their acceptance criteria
- **Task coverage map**: Map each task to one or more requirements or stories (infer from keywords or explicit references like IDs or key phrases)
- **Constitution ruleset**: Extract principle names and MUST/SHOULD normative statements

### 4. Detection Pass (Token-Efficient Analysis)

Focus on high-signal findings. List at most 50 findings; summarize any overflow in an overflow section.

#### A. Duplicate Detection

- Find near-duplicate requirements
- Flag lower-quality descriptions for merging

#### B. Ambiguity Detection

- Flag vague adjectives without measurable criteria (fast, scalable, secure, intuitive, robust)
- Flag unresolved placeholders (TODO, TKTK, ???, `<placeholder>`)

#### C. Under-specification

- Requirements with only a verb but no object or measurable outcome
- User stories with no acceptance criteria
- Tasks referencing files or components not defined in spec/plan

#### D. Constitution Compliance

- Any requirement or plan item that conflicts with a MUST principle
- Sections or quality gates required by the constitution but missing

#### E. Coverage Gaps

- Requirements with no corresponding task
- Tasks with no corresponding requirement or story
- Non-functional requirements not reflected in any task (performance, security, etc.)

#### F. Inconsistency

- Terminology drift (same concept named differently across files)
- Data entities mentioned in plan but not defined in spec (or vice versa)
- Task ordering contradictions (e.g., integration task before setup task, no dependency noted)
- Conflicting requirements (e.g., one section requires Next.js, another specifies Vue)
- **Feature Goal mismatch**: if both spec.md and plan.md exist, their Feature Goal sections (`## Feature Goal`) must be consistent — a divergence is a CRITICAL finding (constitution Principle I, Goal Declaration)

### 5. Severity Classification

Classify each finding:

- **CRITICAL**: Violates a constitution MUST, missing core spec artifact, or critical requirement with zero coverage — blocks basic functionality
- **HIGH**: Duplicate or conflicting requirements, ambiguous security/performance attributes, unverifiable acceptance criteria
- **MEDIUM**: Terminology drift, missing NFR task coverage, under-specified edge cases
- **LOW**: Wording / phrasing improvements, minor duplicates with no execution impact

### 6. Output Analysis Report

Output a Markdown report (**do not write to file**):

```markdown
## Specification Analysis Report

| ID | Category | Severity | Location | Summary | Suggestion |
|----|----------|----------|----------|---------|------------|
| A1 | Duplicate | HIGH | spec.md:L120-134 | Two near-duplicate requirements... | Merge, keep clearer version |
```

(One finding per row; ID prefixed with category initial — A=Duplicate, B=Ambiguity, C=Under-spec, D=Constitution, E=Coverage, F=Inconsistency — stable across re-runs on unchanged content.)

**Coverage Summary Table:**

| Requirement Key | Has Task Coverage? | Task IDs | Notes |
|----------------|-------------------|---------|-------|

**Constitution Compliance Issues:** (if any)

**Unmapped Tasks:** (if any)

**Metrics:**

- Total requirements:
- Total tasks:
- Coverage rate (% of requirements with at least one task):
- Ambiguous items:
- Duplicate items:
- Critical findings:

### 7. Next Action Recommendations

End the report with a concise "Next Steps" block:
- If CRITICAL findings exist: recommend resolving before running `/speckit.implement`
- If only LOW/MEDIUM: may proceed, but offer improvement suggestions
- Give explicit command suggestions: e.g., "Run `/speckit.specify` to refine", "Edit `tasks.md` manually to add coverage for `performance-metrics`"

### 8. Offer Correction Suggestions

Ask the user: "Would you like me to suggest specific corrections for the top N findings?" (**Never auto-apply corrections.**)

## Operating Principles

- **Minimum high-signal tokens**: Focus on actionable findings, avoid verbose restatements
- **Progressive disclosure**: Load artifacts incrementally; do not dump full file contents
- **Reproducible results**: Same content → same IDs and counts on re-run
- **Never modify files** (read-only analysis only)
- **Never fabricate missing sections** (report them as-is)
- **Prioritize constitution violations** (always CRITICAL)
- **Zero findings is also a valid outcome** — output a success report with coverage stats
