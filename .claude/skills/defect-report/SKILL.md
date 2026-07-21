---
name: defect-report
description: Generate a structured defect report for bugs found during testing or production.
---

# Defect Report

Generate a comprehensive defect report following a standard format for tracking, triaging, and resolving bugs.

## Usage

```
/defect-report "Scoring returns wrong F1 score for multi-label classification"
/defect-report "Test-set answer exposed in dataset API response"
```

## Output Format

```markdown
# Defect Report — [DEF-NNN]

**Title**: [Short, descriptive title]
**Reported By**: [Agent / tester name]
**Date**: YYYY-MM-DD
**Status**: Open | In Progress | Fixed | Verified | Closed
**Priority**: P0-Critical | P1-High | P2-Medium | P3-Low

---

## Defect Summary

| Attribute | Value |
|-----------|-------|
| Severity | Critical / High / Medium / Low |
| Priority | P0 / P1 / P2 / P3 |
| Component | backend-scoring / backend-api / frontend / celery / database |
| Spec Reference | specs/NNN-feature/ (if applicable) |
| AC Violated | AC-XX (if applicable) |
| Environment | local / staging / production |
| Reproducibility | Always / Intermittent / Rare |

---

## Impact Assessment

**User Impact**: [Who is affected and how]
**Data Impact**: [Risk of data corruption or leakage]
**Security Impact**: [Any test-set leakage or auth bypass risk]

---

## Reproduction Steps

**Prerequisites**:
- User role: annotator / administrator
- Task type: [e.g., text classification]
- Data: [specific dataset or fixture]

**Steps**:
1. Navigate to [URL or action]
2. Submit prediction: `{"predictions": ["class_A", "class_B"]}`
3. Wait for Celery scoring task to complete
4. Observe scoring result

**Expected Result**: F1 = 0.833
**Actual Result**: F1 = 0.0

**Reproduction Rate**: 100% / X out of 10 attempts

---

## Root Cause Analysis

**Investigation Timeline**:
1. [Step taken to investigate]
2. [Finding]
3. [Root cause identified]

**Code-Level Analysis**:
```python
# File: backend/app/services/scoring.py:67
# Bug: denominator is computed before filtering empty predictions
def compute_f1(predictions, references):
    # BUG: does not handle multi-label format
    precision = ...
```

**Contributing Factors**:
- Missing unit test for multi-label F1 edge case
- No input validation on prediction format

---

## Fix Recommendation

**Proposed Fix**:
```python
# backend/app/services/scoring.py
def compute_f1(predictions: list[str], references: list[str], average: str = "macro") -> float:
    """Compute F1 score supporting multi-label classification."""
    from sklearn.metrics import f1_score
    return f1_score(references, predictions, average=average, zero_division=0)
```

**Tests to Add**:
- [ ] `test_f1_multilabel_single_correct`
- [ ] `test_f1_multilabel_all_wrong`
- [ ] `test_f1_empty_predictions_returns_zero`

**Regression Risk**: Low / Medium / High

---

## Prevention Measures

**Short Term**:
- Add missing unit tests for scoring edge cases
- Add input format validation in Celery task

**Long Term**:
- Define metric contracts in spec template
- Add metric validation to quality gate
```

## Severity Definitions

| Severity | Criteria | Example |
|----------|----------|---------|
| Critical | Test-set leakage, data corruption, system down | `answer` field in API response |
| High | Wrong scoring result, broken submission flow, auth bypass | F1 computed incorrectly |
| Medium | UI broken for specific task type, slow leaderboard | Sort order incorrect on leaderboard |
| Low | Minor UI inconsistency, typo in error message | Button label misspelled |

## Priority vs Severity Matrix

| | Critical | High | Medium | Low |
|---|---|---|---|---|
| Many users affected | P0 | P1 | P2 | P3 |
| Some users affected | P0 | P1 | P2 | P3 |
| Few users affected | P1 | P2 | P3 | P3 |
| No users affected (test env only) | P1 | P2 | P3 | P3 |
