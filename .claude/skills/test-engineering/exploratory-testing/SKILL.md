---
name: exploratory-testing
description: Structured exploratory testing sessions for Label Suite with charters, heuristics, and finding documentation.
---

# Exploratory Testing

Structured exploratory testing using session-based test management (SBTM) with time-boxed charters.

## Usage

```
/exploratory-testing "Annotation workspace usability"
/exploratory-testing "Test-set leakage surface area"
/exploratory-testing "Leaderboard edge cases"
```

## Output Format

```markdown
# Exploratory Testing Session

**Charter**: [Mission statement]
**Tester**: senior-qa / user-researcher
**Date**: YYYY-MM-DD
**Duration**: 60 minutes
**Risk Level**: High / Medium / Low

---

## Mission

[What are we exploring and what are we trying to learn?]

**Objectives**:
- [Specific question to answer]
- [Risk to investigate]

---

## Heuristics Applied

### SFDPOT Framework

| Dimension | Focus Areas |
|-----------|-------------|
| **S**tructure | Config YAML parsing, database schema edge cases |
| **F**unction | Scoring correctness, leaderboard ranking logic |
| **D**ata | Empty predictions, null values, Unicode in annotation text |
| **P**latform | Browser compatibility, Docker env vs staging |
| **O**perations | Concurrent submissions, Celery task failure recovery |
| **T**ime | Deadline enforcement, submission timestamps |

### Security Heuristics (Label Suite Specific)

| Heuristic | Test Approach |
|-----------|---------------|
| **LEAK**: Can annotator see test-set answers? | Inspect all API responses, network tab |
| **ESCALATE**: Can annotator access admin functions? | Try admin endpoints with annotator token |
| **EXHAUST**: Can annotator spam submissions? | Submit rapidly, observe rate limiting |
| **INJECT**: Is input text rendered safely? | Try XSS payloads in annotation text |

---

## Session Log

**Time-box**: 60 minutes

| Time | Activity | Finding | Severity |
|------|----------|---------|----------|
| 0:00 | Start exploration | — | — |
| 0:05 | [Explored area] | [Finding] | None / Minor / Moderate / Critical |
| 0:15 | [Explored area] | [Finding] | |
| 0:30 | [Pivot based on finding] | [Finding] | |
| 0:55 | Wrap up, document | — | — |

---

## Findings

### Finding 1: [Short title]
**Severity**: Critical / Moderate / Minor / Enhancement
**Area**: [Component or endpoint]
**Steps to Reproduce**:
1. [Step]
2. [Step]
**Observed**: [What happened]
**Expected**: [What should happen]
**Evidence**: [Screenshot path or log snippet]
**Recommended Action**: File defect DEF-NNN / Accept as known / Enhancement request

---

## Coverage Map

| Area | Coverage | Notes |
|------|----------|-------|
| Happy path submission flow | Full | No issues |
| Empty prediction edge case | Partial | See Finding 1 |
| Rate limiting behavior | Not covered | Needs follow-up |
| Admin vs annotator RBAC | Full | All tested |

---

## Recommendations

**Follow-Up Sessions**:
- [ ] Explore concurrent submission behavior (2 annotators same task)
- [ ] Test with non-ASCII annotation text (CJK characters)

**Defects to File**:
- [ ] DEF-NNN: [Title]

**Test Cases to Formalize**:
- [ ] Add pytest for empty prediction edge case (Finding 1)
```

## Charter Templates

### Leakage Prevention Charter
```
Explore all annotator-accessible API endpoints
looking for any exposure of test-set answer data.
Time-box: 45 minutes.
```

### Usability Charter
```
Explore the annotation workspace as a first-time annotator
looking for confusion points and usability issues.
Time-box: 60 minutes.
Reference: senior-uiux review checklist.
```

### Scoring Correctness Charter
```
Explore the scoring pipeline by submitting predictions
with known expected scores, looking for calculation errors.
Time-box: 30 minutes.
```
