---
name: test-plan
description: Generate a comprehensive test plan for a Label-Eval-Portal feature or sprint.
---

# Test Plan

Generate a structured test plan covering test strategy, scope, environments, tools, schedule, and success criteria.

## Usage

```
/test-plan specs/001-annotation-submission/spec.md
/test-plan "Sprint 2 — Leaderboard and scoring pipeline"
```

## Output Format

```markdown
# Test Plan: [Feature / Sprint Name]

**Document Version**: 1.0
**Date**: YYYY-MM-DD
**Prepared By**: senior-qa
**Spec Reference**: specs/NNN-feature/spec.md

---

## Executive Summary

[2–3 sentences describing what is being tested, the test approach, and the critical quality focus areas]

---

## Test Objectives

- Verify all P1 Acceptance Criteria pass for [feature]
- Ensure test-set answer leakage prevention passes all security tests
- Validate scoring correctness for all supported metric types
- Confirm annotator E2E flow completes without training

**Success Criteria**:
- 100% P1 ACs verified
- 0 Critical or High defects open at release
- Test coverage ≥ 90% for scoring module, ≥ 80% overall
- All security leakage tests pass

---

## Scope

### In Scope

| Feature | Test Types | Priority |
|---------|-----------|---------|
| Annotation submission API | pytest integration, security | P1 |
| Async scoring (Celery) | pytest unit + integration | P1 |
| Leaderboard display | pytest + Playwright | P1 |
| Test-set leakage prevention | pytest security | P0 |
| RBAC (annotator vs admin) | pytest integration | P1 |

### Out of Scope

- Load testing (deferred to performance phase)
- Browser compatibility beyond Chrome / Firefox
- Mobile responsive testing

---

## Test Strategy

```
pytest unit tests        → Scoring logic, metric computation, edge cases
pytest integration       → API endpoints, full request-response cycle
Playwright E2E           → Annotator user journey (P1 flows)
Security tests           → Test-set leakage, RBAC, rate limiting
```

### Test Pyramid

```
        /\
       /E2E\        Playwright — annotator P1 flows
      /──────\
     /Integr. \     pytest + httpx — API endpoint tests
    /────────────\
   /  Unit Tests  \  pytest — scoring, metrics, business logic
  /────────────────\
```

### Test Priority

| Priority | Test Type | Target Threshold |
|----------|-----------|-----------------|
| P0 | Security (leakage) | 100% pass, 0 failures |
| P1 | Scoring unit tests | ≥90% coverage |
| P1 | API integration | ≥80% coverage |
| P1 | Playwright E2E (P1 flows) | All P1 ACs covered |
| P2 | Performance | ≤30s scoring, ≤500ms API |

---

## Test Scenarios

### Functional Tests

| ID | Scenario | Test Type | AC | Priority |
|----|----------|-----------|-----|---------|
| TC-01 | Annotator submits valid predictions | pytest integration | AC-F01 | P1 |
| TC-02 | Celery scoring completes and stores score | pytest integration | AC-F02 | P1 |
| TC-03 | Annotator views score and rank | Playwright | AC-F03 | P1 |
| TC-04 | Annotation form renders from task config | Playwright | AC-F04 | P1 |
| TC-05 | Empty predictions rejected with 422 | pytest integration | AC-E01 | P1 |
| TC-06 | Submission after deadline rejected | pytest integration | AC-E03 | P2 |

### Security Tests

| ID | Scenario | Test Type | AC | Priority |
|----|----------|-----------|-----|---------|
| TC-S01 | `answer` not in any API response | pytest security | AC-S01 | P0 |
| TC-S02 | `answer` not in application logs | log scan | AC-S02 | P0 |
| TC-S03 | Annotator cannot query dataset_answers | pytest integration | AC-S03 | P0 |
| TC-S04 | Unauthenticated requests rejected 401 | pytest integration | AC-S04 | P1 |
| TC-S05 | Annotator cannot access /admin/* | pytest integration | AC-S05 | P1 |
| TC-S06 | Rate limit enforced with 429 | pytest integration | AC-S06 | P1 |

---

## Test Data Requirements

| Category | Source | Notes |
|----------|--------|-------|
| Valid annotation tasks | pytest fixtures | YAML config for text-classification |
| Test-set dataset | Factory-generated | Answer field populated; never returned in API |
| User accounts | pytest fixtures | One annotator, one admin per test |
| Edge case predictions | Static fixtures | Empty, mismatched length, all-correct, all-wrong |

---

## Test Environments

| Environment | Purpose | Database | Notes |
|-------------|---------|----------|-------|
| Local (Docker Compose) | Development testing | SQLite or test PostgreSQL | `docker-compose up` |
| CI (GitHub Actions) | Automated on PR | PostgreSQL (GitHub service) | All test suites run |
| Staging | Pre-release validation | Staging PostgreSQL | Playwright E2E |

---

## Tools

| Tool | Version | Purpose |
|------|---------|---------|
| pytest | ≥8.x | Unit and integration tests |
| pytest-asyncio | ≥0.23 | Async FastAPI testing |
| httpx | ≥0.27 | API test client |
| Playwright | ≥1.44 | E2E browser testing |
| pytest-cov | — | Coverage reporting |
| factory-boy | — | Test data factories |

---

## Schedule

| Phase | Duration | Tests |
|-------|----------|-------|
| Week 1 | Unit tests | pytest scoring module |
| Week 1 | Security tests | Leakage prevention |
| Week 2 | Integration tests | API endpoints |
| Week 2 | E2E tests | Playwright annotator flow |
| Week 3 | Regression + polish | Full suite |

---

## Entry / Exit Criteria

### Entry Criteria (before testing begins)
- [ ] Feature implementation complete per plan.md
- [ ] Docker Compose environment running
- [ ] Test fixtures and factory data prepared

### Exit Criteria (before release)
- [ ] All P0 security tests pass (0 failures)
- [ ] All P1 ACs verified
- [ ] No Critical or High defects open
- [ ] Coverage thresholds met
- [ ] CI pipeline green

---

## Defect Management

| Severity | Response Time | Required Action |
|----------|--------------|-----------------|
| Critical (leakage) | Immediate | Block release, fix before any commit |
| High | 24 hours | Fix before release |
| Medium | Current sprint | Fix before sprint end |
| Low | Next sprint | Backlog |
```
