---
description: Identify and clarify ambiguous or incomplete requirements in spec.md (max 5 questions), updating the spec incrementally with each accepted answer.
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

You **MUST** consider user input before proceeding (if not empty).

## Goal

Detect and reduce ambiguous or missing decision points in the current feature spec, recording clarification results directly in the spec file. This flow is expected to run and complete before `/speckit.plan`. If the user explicitly wants to skip clarification (e.g., exploratory spike), you may proceed but must warn of increased rework risk.

## Steps

1. **Load the current spec**
   - Read `specs/[module]/NNN-feature/spec.md`
   - If the file is missing, direct the user to run `/speckit.specify` first (do not create a new spec here)

2. **Taxonomy-based ambiguity scan**

   Scan the spec using the following classification taxonomy. Mark each category: **Clear** / **Partial** / **Missing**.

   Build an internal coverage map for prioritization (do not output the raw map unless no questions will be asked).

   | Category | What to Check |
   |----------|--------------|
   | Functional scope & behavior | Core user goals, success criteria, explicit out-of-scope statements, role/persona distinctions |
   | Domain & data model | Entities, attributes, relationships, identity/uniqueness rules, lifecycle/state transitions, data volume assumptions |
   | Interaction & UX flows | Critical user journeys, error/empty/loading states, accessibility or localization notes |
   | Non-functional quality attributes | Performance (latency, throughput), scalability, reliability/availability, observability, security & privacy, compliance |
   | Integration & external dependencies | External services/APIs and failure modes, data import/export formats, protocol/version assumptions |
   | Edge cases & failure handling | Negative scenarios, rate limiting/throttling, conflict resolution (e.g., concurrent edits) |
   | Constraints & trade-offs | Technical constraints, explicit trade-offs or rejected alternatives |
   | Terminology & consistency | Standard vocabulary, synonym avoidance, deprecated terms |
   | Completion signals | Testable acceptance criteria, measurable Definition of Done |
   | Other / placeholders | TODO markers, unresolved decisions, vague adjectives without quantification |

   For each **Partial** or **Missing** category, add a candidate question unless:
   - Clarification would not meaningfully affect implementation or verification strategy, or
   - The information is better deferred to the planning phase (note internally)

3. **Build a prioritized candidate queue** (max 5 questions, internal use only):
   - Every question must be answerable with: short multiple-choice (2–5 clear mutually-exclusive options), or a single word/phrase (explicitly bounded: "answer in ≤5 words")
   - Only include questions where the answer would meaningfully affect architecture, data modeling, task breakdown, test design, UX behavior, operational readiness, or compliance
   - If more than 5 categories are unresolved, select by `(impact × uncertainty)` heuristic
   - Exclude already-answered items, stylistic preferences, and planning-level execution details

4. **Interactive one-question-at-a-time loop**

   For each question:
   - Present **one question at a time**
   - For multiple-choice: analyze all options and identify the best one:
     `**Recommended:** Option [X] — <1-2 sentence reasoning based on best practices, risk reduction, and spec alignment>`

     Then present all options:

     | Option | Description |
     |--------|-------------|
     | A | ... |
     | B | ... |

     Append: `You can reply with the option letter (e.g., "A"), accept the recommendation by saying "yes" or "recommended", or provide your own short answer.`

   - For short-answer: provide a suggested answer:
     `**Suggested:** <proposed answer> — <brief reasoning>`
     Then: `Format: Short answer (≤5 words). Accept by saying "yes" or "suggested", or provide your own.`

   - After user responds:
     - "yes" / "recommended" / "suggested" → adopt your prior recommendation/suggestion
     - Otherwise validate: is it a valid option letter or ≤5 words?
     - If ambiguous, ask a quick follow-up (counts as the same question, not a new one)
     - Record the accepted answer in working memory (do not write to disk yet)
     - Proceed to the next question

   - Stop when:
     - All critical ambiguities are resolved (remaining queued questions unnecessary), or
     - User explicitly signals done ("done", "good", "no more", "proceed"), or
     - 5 questions have been asked

   - Never reveal upcoming queued questions
   - If no valid questions exist, report immediately: "No critical ambiguities detected" and suggest proceeding

5. **Incremental spec update** (immediately after each accepted answer):
   - Maintain the spec in memory (loaded once at start); write to disk after each accepted answer
   - On the first integration in this session:
     - Ensure a `## Clarifications` section exists (create it after the top-level overview/context section if missing)
     - Create a `### Session YYYY-MM-DD` sub-heading under it
   - Append a bullet: `- Q: <question> → A: <final answer>`
   - Apply the clarification to the most appropriate section:
     - Functional ambiguity → update or add to Functional Requirements
     - User interaction/role → supplement User Stories or Actors subsection
     - Data structure/entity → update data model (add fields, types, relationships)
     - NFR constraint → add or modify measurable criteria in NFR section (replace vague adjectives with metrics or explicit targets)
     - Edge case / negative flow → add to Edge Cases / Error Handling section
     - Terminology conflict → unify terminology throughout; if original term must be retained, add `(formerly "X")` once only
   - If clarification invalidates a prior ambiguous statement, replace it directly — avoid contradictions and redundant alternatives
   - **Save the spec file atomically after each integration** to reduce context-loss risk
   - Preserve formatting: do not reorder unrelated sections, maintain heading hierarchy
   - Keep each clarification brief and testable

6. **Validation** (after each write and at the end):
   - One bullet per accepted answer in `## Clarifications`, no duplicates
   - Total accepted questions ≤ 5
   - Updated sections no longer contain the ambiguous placeholder that the answer resolved
   - No contradictory old statements remain
   - Markdown structure valid; only newly permitted headings: `## Clarifications`, `### Session YYYY-MM-DD`
   - Terminology consistent across all updated sections

7. **Write the updated spec** to `specs/[module]/NNN-feature/spec.md`

8. **Report completion** (at end of the question loop or early termination):
   - Number of questions asked and answered
   - Updated spec file path
   - Sections affected (list by name)
   - Coverage summary table:

     | Category | Status | Notes |
     |----------|--------|-------|
     | Functional scope | Resolved | ... |
     | Non-functional | Deferred | Better handled in planning |

   - If items remain unresolved or deferred, recommend whether to proceed to `/speckit.plan` or run `/speckit.clarify` again after planning
   - Suggest next command

**Behavior rules:**

- If no meaningful ambiguities found: respond "No critical ambiguities detected" and suggest proceeding
- Never ask more than 5 questions (follow-up on the same question does not count as new)
- Respect early-termination signals ("stop", "done", "proceed")
- If quota is exhausted with high-impact unresolved categories still open: explicitly list them as deferred with reasoning
