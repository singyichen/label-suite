---
name: quality-gate
description: Evaluate whether the current state of the codebase passes the quality gate for sprint release or production deployment.
---

# Quality Gate

Evaluate the codebase against defined quality thresholds. Determines Go / No-Go for release.

## Usage

```
/quality-gate sprint     # Sprint release gate
/quality-gate production # Production deployment gate
```

## Output Format

```markdown
# Quality Gate Report

**Gate Type**: Sprint Release | Production Deployment
**Date**: YYYY-MM-DD
**Overall Status**: ✅ PASS | ❌ FAIL

---

## Gate Summary

| Category | Weight | Score | Status |
|----------|--------|-------|--------|
| Code Quality | 20% | X/100 | ✅/❌ |
| Test Coverage | 25% | X/100 | ✅/❌ |
| Test Pass Rate | 20% | X/100 | ✅/❌ |
| Security | 20% | X/100 | ✅/❌ |
| Constitution Compliance | 15% | X/100 | ✅/❌ |
| **Weighted Score** | 100% | **X/100** | ✅/❌ |

**Minimum passing score**: 75/100
**Blockers**: any Critical security issue = automatic FAIL

---

## Code Quality

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| No Critical code smells | 0 | N | ✅/❌ |
| Function complexity ≤ 10 | ≤10 avg | N | ✅/❌ |
| Duplicate code ratio | ≤5% | N% | ✅/❌ |
| Dead code files | 0 | N | ✅/❌ |

---

## Test Coverage

| Module | Target | Actual | Status |
|--------|--------|--------|--------|
| Scoring engine | ≥90% | N% | ✅/❌ |
| API endpoints | ≥80% | N% | ✅/❌ |
| Frontend components | ≥70% | N% | ✅/❌ |
| Celery tasks | ≥80% | N% | ✅/❌ |
| Overall | ≥80% | N% | ✅/❌ |

---

## Test Pass Rate

| Test Suite | Total | Passed | Failed | Skipped | Status |
|------------|-------|--------|--------|---------|--------|
| pytest unit | N | N | N | N | ✅/❌ |
| pytest integration | N | N | N | N | ✅/❌ |
| Playwright E2E | N | N | N | N | ✅/❌ |
| Security tests | N | N | N | N | ✅/❌ |

**Target**: 100% pass rate (no failing tests allowed)

---

## Security Gate (Any failure = FAIL)

| Check | Status | Notes |
|-------|--------|-------|
| Test-set answer not exposed in any API response | ✅/❌ | |
| RBAC: all admin endpoints protected | ✅/❌ | |
| CORS: no wildcard `*` origin | ✅/❌ | |
| Rate limiting on submission endpoints | ✅/❌ | |
| No hardcoded secrets in codebase | ✅/❌ | |
| No `dangerouslySetInnerHTML` in frontend | ✅/❌ | |
| All dependencies free of known CVEs | ✅/❌ | |

---

## Constitution Compliance

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Config-Driven: task types defined in config | ✅/❌ | |
| II. Minimal Coupling: no circular imports | ✅/❌ | |
| III. Security First: leakage prevention verified | ✅/❌ | |
| IV. KISS/YAGNI: no unused abstractions | ✅/❌ | |
| V. Test Coverage: thresholds met | ✅/❌ | |
| VI. English First: no Chinese in non-README | ✅/❌ | |

---

## Blockers

[List of blocking issues that must be resolved before release]

---

## Recommendation

**Decision**: ✅ GO | ❌ NO-GO

**Conditions** (if Approve with Conditions):
- [ ] [Condition that must be met post-merge]

**Next Release Window**: [Date / Sprint]
```

## Threshold Reference

| Gate | Code Quality | Test Coverage | Security | Constitution |
|------|-------------|---------------|----------|-------------|
| Sprint Release | ≥70 | ≥75% overall | All critical checks | 5/6 principles |
| Production | ≥80 | ≥80% overall | All checks | All 6 principles |
