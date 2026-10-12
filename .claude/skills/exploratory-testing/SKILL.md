---
name: exploratory-testing
description: Run a time-boxed exploratory testing session for Label Suite with leakage and RBAC heuristics.
---

# Exploratory Testing

Time-boxed session with a charter. Keep the log short; formalize every reproducible finding into a test.

## Usage

```
/exploratory-testing "Annotation workspace usability"
/exploratory-testing "Test-set leakage surface area"
```

## Project Heuristics

| Heuristic | Approach |
|-----------|----------|
| LEAK | Inspect every annotator-facing response, error body, log, and export for ground truth (constitution III) |
| ESCALATE | Call other roles' endpoints and pages with the current role's token (constitution XV) |
| INJECT | Put XSS / injection payloads and CJK text into annotation and task fields |
| CONFIG | Vary the task config (output types, label sets); nothing should be hardcoded to one task type (constitution II) |

## Output Format

```markdown
# Exploratory Session: [Charter]

**Tester**: senior-qa / user-researcher
**Date**: YYYY-MM-DD
**Time-box**: N minutes

## Findings
### Finding N: [title]
**Severity**: Critical / Moderate / Minor / Enhancement
**Steps / Observed / Expected / Evidence**:
**Action**: open issue (`.claude/rules/issue-reporting.md`) / known / enhancement

## Coverage
| Area | Coverage (Full / Partial / None) |

## Tests to Formalize
- [ ] [test to add, with layer and location]
```

A Critical or High leakage or access-control finding is not filed as a public issue; follow the security escalation path in `.claude/rules/issue-reporting.md`.
