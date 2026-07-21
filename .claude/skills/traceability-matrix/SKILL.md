---
name: traceability-matrix
description: Generate a requirements traceability matrix linking User Stories → AC → Spec → Implementation → Tests.
---

# Traceability Matrix

Map requirements through the SDD artifact chain: User Story → Acceptance Criteria → Spec → Plan → Implementation → Tests.

## Usage

```
/traceability-matrix specs/001-annotation-submission/
/traceability-matrix --all    # Full project traceability
```

## Output Format

```markdown
# Requirements Traceability Matrix

**Scope**: specs/NNN-feature/
**Date**: YYYY-MM-DD

---

## Forward Traceability (Requirement → Test)

| US ID | AC ID | Spec File | Implementation File | Test File | Test Type | Status |
|-------|-------|-----------|---------------------|-----------|-----------|--------|
| US-01 | AC-01 | spec.md | routers/submissions.py:45 | test_submissions.py:23 | pytest | ✅ |
| US-01 | AC-02 | spec.md | services/scoring.py:67 | test_scoring.py:89 | pytest | ✅ |
| US-02 | AC-03 | spec.md | components/TaskForm.tsx:34 | annotation.spec.ts:12 | Playwright | ✅ |
| US-02 | AC-04 | spec.md | components/TaskForm.tsx:78 | annotation.spec.ts:45 | Playwright | ❌ MISSING |

---

## Backward Traceability (Test → Requirement)

| Test File | Test Name | AC ID | US ID |
|-----------|-----------|-------|-------|
| test_scoring.py:89 | `test_f1_score_binary` | AC-02 | US-01 |
| annotation.spec.ts:12 | `annotator can submit predictions` | AC-03 | US-02 |

---

## Orphaned Tests (No Requirement Link)

| Test File | Test Name | Recommendation |
|-----------|-----------|----------------|
| test_utils.py:34 | `test_format_timestamp` | Link to utility spec or delete if redundant |

---

## Coverage Gaps

| AC ID | Description | Priority | Missing Test |
|-------|-------------|----------|-------------|
| AC-04 | Annotator sees confirmation after submission | P1 | Playwright E2E |
| AC-05 | Scoring completes within 30 seconds | P1 | Performance test |

---

## Security Traceability

| Security Requirement | Implementation | Test | Status |
|---------------------|----------------|------|--------|
| Test-set answer excluded from API | schemas/dataset.py (answer field omitted) | test_security.py::test_answer_not_in_response | ✅ |
| Admin-only delete endpoint | routers/tasks.py Depends(require_role) | test_rbac.py::test_annotator_cannot_delete | ✅ |
| Rate limit on submissions | routers/submissions.py @limiter | test_rate_limit.py::test_submission_rate_limit | ❌ MISSING |

---

## Spec → Tasks → Code Traceability

| Task ID | Task Description | Code File | Lines | Status |
|---------|-----------------|-----------|-------|--------|
| TASK-001 | Create SubmissionResult model | models/submission.py | 1-45 | ✅ Done |
| TASK-002 | Create POST /submissions endpoint | routers/submissions.py | 1-89 | ✅ Done |
| TASK-003 | Implement Celery scoring task | tasks/scoring.py | 1-67 | ✅ Done |
| TASK-004 | Write pytest unit tests | tests/test_scoring.py | 1-120 | ✅ Done |
| TASK-005 | Build SubmissionForm component | components/SubmissionForm.tsx | 1-90 | ⏳ In Progress |
| TASK-006 | Playwright E2E test | tests/submission.spec.ts | — | ❌ Not Started |

---

## Summary

| Metric | Count | Status |
|--------|-------|--------|
| Total ACs | N | — |
| ACs with test coverage | N | ✅/❌ |
| Coverage gap | N | ⚠️ |
| Orphaned tests | N | ⚠️ |
| Security requirements covered | N/N | ✅/❌ |

**Overall Traceability**: N% complete
```
