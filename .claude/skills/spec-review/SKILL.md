---
name: spec-review
description: Review a spec.md for completeness, clarity, and Constitution compliance before the Frontend Ready Gate and `/opsx:propose`.
---

# Spec Review

Evaluate the quality and readiness of a `spec.md` before it proceeds to the Frontend Ready Gate and `/opsx:propose` (see `docs/sdd-workflow.md`). Ensures all required sections are present, Acceptance Criteria are SMART, and the spec complies with the project Constitution.

## Input

Read the target `specs/[module]/NNN-feature/spec.md` and the Constitution at `specs/_governance/constitution.md`.

## Output Format

```markdown
# Spec Review: [Feature Name]

**Spec**: specs/[module]/NNN-feature/spec.md
**Reviewer**: senior-tech-lead / nlp-research-advisor
**Review Date**: YYYY-MM-DD
**Status**: ✅ Ready for Frontend Ready Gate / Propose | ⚠️ Needs Revision | ❌ Blocked

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
| AC-1.1 | ✅ / ❌ | ✅ / ❌ | |
| AC-1.2 | ✅ / ❌ | ✅ / ❌ | |

Each AC must be specific, measurable, and testable by pytest or Playwright (a non-testable AC is a blocker, rule 2).

---

## NLP Research Alignment

- [ ] Evaluation metrics are specified and appropriate for the task type
- [ ] Evaluation fairness and anti-gaming measures are addressed (if applicable)
- [ ] Annotation guidelines are clear and unambiguous (if applicable)
- [ ] Task configuration is config-driven and reusable across NLP task types
- [ ] Test-set isolation is explicitly described

---

## Constitution Compliance

Apply the principles of `specs/_governance/constitution.md` that are relevant to this spec, plus the matching domain constitution. NON-NEGOTIABLE: II (Generalization-First), III (Data Fairness), XI (Security & Privacy Baseline), XV (Role-Based Access Control).

| Principle | Assessment | Issues |
|-----------|-----------|--------|
| [applicable principle] | ✅ / ⚠️ / ❌ | |


---

## Issues Found

### 🔴 Blockers (must fix before propose)
- [Issue description and suggested fix]

### 🟡 Warnings (should fix before implementation)
- [Issue description and suggested fix]

### 🟢 Suggestions (optional improvements)
- [Suggestion]

---

## Recommendation

**Decision**: ✅ Proceed to Frontend Ready Gate → `/opsx:propose` | ⚠️ Revise and Re-review | ❌ Return to Requirements

**Next Step**:
- [ ] Fix blockers and re-submit for review, OR
- [ ] Run the Frontend Ready Gate checklist in `docs/sdd-workflow.md`, then `/opsx:propose` (technical design goes in `openspec/changes/<change>/design.md`)
```

## Rules

1. Any missing section is a blocker if it's required by the spec template
2. AC that cannot be tested by pytest or Playwright is a blocker
3. Any feature that handles submission data must explicitly address test-set leakage — this is non-negotiable
4. Ambiguous NLP evaluation metrics are a warning (escalate to `nlp-research-advisor`)
5. Violations of the NON-NEGOTIABLE principles (II, III, XI, XV) are always blockers

## Example

```
/spec-review specs/task-management/013-task-new/spec.md
```
