---
name: code-review
description: Perform a comprehensive code review covering code quality, security (test-set leakage), performance, and best practices for FastAPI + React + TypeScript.
---

# Code Review

Execute a thorough code review across all dimensions: code quality, security, performance, testing, and Constitution compliance.

## Usage

```
/code-review                          # Review all changed files
/code-review backend/app/routers/     # Review specific directory
/code-review backend/app/services/scoring.py  # Review specific file
```

## Output Format

```markdown
# Code Review Report

**Scope**: [files reviewed]
**Reviewer**: senior-code-reviewer
**Date**: YYYY-MM-DD
**Overall**: 🟢 Approve | 🟡 Approve with Comments | 🔴 Request Changes

---

## Summary

| Category | Status | Critical | High | Medium | Low |
|----------|--------|----------|------|--------|-----|
| Code Quality | 🟢/🟡/🔴 | 0 | 0 | 0 | 0 |
| Security | 🟢/🟡/🔴 | 0 | 0 | 0 | 0 |
| Test-Set Leakage | 🟢/🔴 | 0 | — | — | — |
| Performance | 🟢/🟡/🔴 | 0 | 0 | 0 | 0 |
| Testing | 🟢/🟡/🔴 | 0 | 0 | 0 | 0 |
| Constitution | 🟢/🟡/🔴 | 0 | 0 | 0 | 0 |

---

## 🔴 Critical Issues

### [CRIT-001] Test-Set Answer Exposed in API Response
**File**: `backend/app/schemas/dataset.py:45`
**Severity**: Critical — Non-negotiable fix required
**Description**: The `DatasetResponse` schema includes the `answer` field, which must never be returned to annotators.
**Current Code**:
```python
class DatasetResponse(BaseModel):
    id: int
    text: str
    answer: str  # ❌ MUST NOT be exposed
```
**Fix**:
```python
class DatasetResponse(BaseModel):
    id: int
    text: str
    # answer is intentionally excluded — test-set leakage prevention
```

---

## 🟠 High Issues

### [HIGH-001] Missing Role Check on Admin Endpoint
**File**: `backend/app/routers/tasks.py:32`
**Description**: The `DELETE /tasks/{id}` endpoint lacks RBAC guard; annotators could delete tasks.
**Fix**: Add `Depends(require_role("administrator"))` dependency.

---

## 🟡 Medium Issues

### [MED-001] N+1 Query in Leaderboard
**File**: `backend/app/services/leaderboard.py:67`
**Description**: Fetching submissions inside a loop causes N+1 database queries.
**Fix**: Use `selectinload()` or batch query with `WHERE submission_id IN (...)`.

---

## 🟢 Low Issues / Suggestions

### [LOW-001] Missing Type Annotation
**File**: `backend/app/services/scoring.py:23`
**Description**: Function `compute_f1` lacks return type annotation.
**Fix**: Add `-> float:` return type.

---

## Security Review (OWASP Top 10)

| Risk | Status | Notes |
|------|--------|-------|
| A01 Broken Access Control | 🟢/🔴 | RBAC on all admin endpoints |
| A02 Cryptographic Failures | 🟢/🔴 | JWT secret in env var |
| A03 Injection | 🟢/🔴 | ORM parameterized queries |
| A07 Auth Failures | 🟢/🔴 | Token expiry configured |
| A09 Logging Failures | 🟢/🔴 | Audit log on scoring submission |

---

## Test-Set Leakage Audit

| Check | Status | Notes |
|-------|--------|-------|
| `answer` field excluded from response schemas | ✅ / ❌ | |
| `answer` not logged in application logs | ✅ / ❌ | |
| `answer` not returned in error messages | ✅ / ❌ | |
| Test-set dataset only accessible to admin role | ✅ / ❌ | |

---

## Performance Review

| Check | Status | Notes |
|-------|--------|-------|
| N+1 query detected | ✅ / ⚠️ | |
| Missing DB indexes | ✅ / ⚠️ | |
| Synchronous I/O blocking FastAPI event loop | ✅ / ⚠️ | |
| Celery task result stored in Redis (not DB polling) | ✅ / ⚠️ | |
| Frontend bundle size regression | ✅ / ⚠️ | |

---

## Testing Review

| Test Type | Coverage | Status |
|-----------|----------|--------|
| pytest unit (scoring logic) | ≥90% | 🟢/🔴 |
| pytest integration (API endpoints) | ≥80% | 🟢/🔴 |
| Playwright E2E (annotation flow) | P1 flows | 🟢/🔴 |
| Security test (leakage prevention) | All submission endpoints | 🟢/🔴 |

**Missing Test Cases**:
- [ ] Test that annotator cannot access `answer` field via API
- [ ] Test boundary: submission with empty prediction field

---

## Constitution Compliance

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Config-Driven | ✅ / ⚠️ / ❌ | |
| II. Minimal Coupling | ✅ / ⚠️ / ❌ | |
| III. Security First | ✅ / ⚠️ / ❌ | |
| IV. KISS / YAGNI | ✅ / ⚠️ / ❌ | |
| V. Test Coverage | ✅ / ⚠️ / ❌ | |
| VI. English First | ✅ / ⚠️ / ❌ | |

---

## Pre-Merge Checklist

- [ ] All Critical issues resolved
- [ ] All High issues resolved or explicitly deferred with rationale
- [ ] Test-Set Leakage Audit: all checks pass
- [ ] No new Chinese strings in non-README files
- [ ] PR description references the spec (`specs/NNN-feature/`)
```

## Severity Definitions

| Level | Icon | Definition | Action |
|-------|------|------------|--------|
| Critical | 🔴 | Security vulnerability, test-set leakage, data corruption | Must fix before merge |
| High | 🟠 | Major bug, broken RBAC, missing auth | Should fix before merge |
| Medium | 🟡 | Performance issue, missing validation, technical debt | Fix in current or next sprint |
| Low | 🟢 | Style, naming, minor optimization | Optional |
