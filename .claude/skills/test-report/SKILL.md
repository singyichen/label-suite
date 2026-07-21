---
name: test-report
description: Generate test execution reports for sprint summary, release readiness, or regression runs.
---

# Test Report

Generate structured test reports summarizing test execution results, coverage, and quality metrics.

## Usage

```
/test-report sprint      # Sprint test summary
/test-report release     # Release readiness report
/test-report regression  # Regression test report
/test-report security    # Security-focused test report (leakage prevention)
```

## Sprint Test Summary Report

```markdown
# Sprint Test Summary Report

**Sprint**: Sprint N
**Period**: YYYY-MM-DD to YYYY-MM-DD
**Prepared By**: senior-qa

---

## Executive Summary

| Metric | Value |
|--------|-------|
| Total Test Cases | N |
| Passed | N (N%) |
| Failed | N (N%) |
| Skipped | N (N%) |
| New Tests Added | N |
| Defects Found | N |
| Defects Fixed | N |

**Status**: ✅ On Track | ⚠️ At Risk | ❌ Off Track

---

## Test Execution by Type

| Type | Total | Passed | Failed | Coverage |
|------|-------|--------|--------|----------|
| pytest unit | N | N | N | N% |
| pytest integration | N | N | N | N% |
| Playwright E2E | N | N | N | P1 flows |
| Security (leakage) | N | N | N | All endpoints |

---

## Coverage by Module

| Module | Coverage | Target | Status |
|--------|----------|--------|--------|
| scoring engine | N% | ≥90% | ✅/❌ |
| API endpoints | N% | ≥80% | ✅/❌ |
| frontend components | N% | ≥70% | ✅/❌ |
| celery tasks | N% | ≥80% | ✅/❌ |

---

## Defect Summary

| Severity | Open | Fixed | Carry-over |
|----------|------|-------|------------|
| Critical | N | N | N |
| High | N | N | N |
| Medium | N | N | N |
| Low | N | N | N |

---

## Spec Traceability

| Spec | ACs | Covered | Status |
|------|-----|---------|--------|
| specs/001-annotation-submission | N | N | ✅/❌ |
| specs/002-leaderboard | N | N | ✅/❌ |

---

## Risk Assessment

[Any risk to next sprint or release based on test results]
```

## Security Test Report

```markdown
# Security Test Report — Test-Set Leakage Prevention

**Date**: YYYY-MM-DD
**Scope**: All annotator-facing API endpoints + frontend

---

## Leakage Prevention Results

| Test | Endpoint | Result | Notes |
|------|----------|--------|-------|
| `answer` field in GET /datasets response | GET /api/v1/datasets | ✅ Not exposed | |
| `answer` field in GET /tasks response | GET /api/v1/tasks | ✅ Not exposed | |
| `answer` field in GET /submissions/{id} | GET /api/v1/submissions/{id} | ✅ Not exposed | |
| Direct DB query via annotator token | N/A | ✅ Blocked by RBAC | |
| Celery task result pollable by annotator | GET /api/v1/tasks/{id}/status | ✅ Score only, no answer | |
| Answer in application logs | Log scan | ✅ Not logged | |
| Answer in error response | POST /api/v1/submissions (error) | ✅ Not exposed | |

**Result**: ✅ All leakage tests PASS | ❌ [N] tests FAIL — IMMEDIATE FIX REQUIRED

---

## RBAC Test Results

| Endpoint | Admin Access | Annotator Access | Result |
|----------|-------------|-----------------|--------|
| GET /api/v1/admin/datasets | ✅ Allowed | ❌ Blocked (403) | ✅ |
| DELETE /api/v1/tasks/{id} | ✅ Allowed | ❌ Blocked (403) | ✅ |
| GET /api/v1/leaderboard | ✅ Allowed | ✅ Allowed | ✅ |
```
