---
name: spec-review
description: Review a spec.md for completeness, clarity, and Constitution compliance before proceeding to plan.
---

# Spec Review

Evaluate the quality and readiness of a `spec.md` before it proceeds to the planning phase. Ensures all required sections are present, Acceptance Criteria are SMART, and the spec complies with the project Constitution.

## Input

Read the target `specs/NNN-feature/spec.md` and the Constitution at `.specify/memory/constitution.md`.

## Output Format

```markdown
# Spec Review: [Feature Name]

**Spec**: specs/NNN-feature/spec.md
**Reviewer**: senior-tech-lead / nlp-research-advisor
**Review Date**: YYYY-MM-DD
**Status**: ✅ Ready to Plan | ⚠️ Needs Revision | ❌ Blocked

---

## Completeness Check

| Section | Present | Quality | Notes |
|---------|---------|---------|-------|
| Feature Overview | ✅ / ❌ | 🟢 / 🟡 / 🔴 | |
| Motivation / Problem | ✅ / ❌ | 🟢 / 🟡 / 🔴 | |
| User Stories | ✅ / ❌ | 🟢 / 🟡 / 🔴 | |
| Acceptance Criteria | ✅ / ❌ | 🟢 / 🟡 / 🔴 | |
| Non-Functional Requirements | ✅ / ❌ | 🟢 / 🟡 / 🔴 | |
| Out of Scope | ✅ / ❌ | 🟢 / 🟡 / 🔴 | |
| Dependencies | ✅ / ❌ | 🟢 / 🟡 / 🔴 | |

---

## Acceptance Criteria Quality

| AC ID | SMART? | Testable? | Issues |
|-------|--------|-----------|--------|
| AC-01 | ✅ / ❌ | ✅ / ❌ | |
| AC-02 | ✅ / ❌ | ✅ / ❌ | |

**SMART Criteria**:
- **S**pecific: Clear, unambiguous condition
- **M**easurable: Has quantifiable outcome
- **A**chievable: Technically feasible
- **R**elevant: Directly linked to user story
- **T**estable: Can be verified by pytest or Playwright

---

## NLP Research Alignment

- [ ] Evaluation metrics are specified and appropriate for the task type
- [ ] Leaderboard fairness and anti-gaming measures are addressed (if applicable)
- [ ] Annotation guidelines are clear and unambiguous (if applicable)
- [ ] Task configuration is config-driven and reusable across NLP task types
- [ ] Test-set isolation is explicitly described

---

## Constitution Compliance

| Principle | Assessment | Issues |
|-----------|-----------|--------|
| I. Config-Driven Design | ✅ / ⚠️ / ❌ | |
| II. Minimal Coupling | ✅ / ⚠️ / ❌ | |
| III. Security First (test-set leak prevention) | ✅ / ⚠️ / ❌ | |
| IV. KISS / YAGNI | ✅ / ⚠️ / ❌ | |
| V. Test Coverage (≥80% general, ≥90% scoring) | ✅ / ⚠️ / ❌ | |
| VI. English First | ✅ / ⚠️ / ❌ | |

---

## Issues Found

### 🔴 Blockers (must fix before planning)
- [Issue description and suggested fix]

### 🟡 Warnings (should fix before implementation)
- [Issue description and suggested fix]

### 🟢 Suggestions (optional improvements)
- [Suggestion]

---

## Recommendation

**Decision**: ✅ Proceed to Plan | ⚠️ Revise and Re-review | ❌ Return to Requirements

**Next Step**:
- [ ] Fix blockers and re-submit for review, OR
- [ ] Run `/spec-to-plan specs/NNN-feature/spec.md`
```

## Rules

1. Any missing section is a blocker if it's required by the spec template
2. AC that cannot be tested by pytest or Playwright is a blocker
3. Any feature that handles submission data must explicitly address test-set leakage — this is non-negotiable
4. Ambiguous NLP evaluation metrics are a warning (escalate to `nlp-research-advisor`)
5. Constitution Principle III (Security) violations are always blockers

## Example

```
/spec-review specs/002-leaderboard/spec.md
```
