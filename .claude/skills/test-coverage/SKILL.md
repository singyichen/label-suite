---
name: test-coverage
description: Analyze and report test coverage for Label Suite, identifying gaps and recommendations.
---

# Test Coverage Analysis

Analyze current test coverage, identify gaps, and provide recommendations to reach threshold targets.

## Usage

```
/test-coverage                         # Full project analysis
/test-coverage backend/app/services/   # Specific module
/test-coverage --gaps-only             # Only show uncovered areas
```

## Coverage Commands

```bash
# Backend: pytest coverage
cd backend
pytest --cov=app --cov-report=term-missing --cov-report=html

# Frontend: Vitest coverage
cd frontend
pnpm vitest --coverage

# View HTML report
open backend/htmlcov/index.html
open frontend/coverage/index.html
```

## Output Format

```markdown
# Test Coverage Report

**Date**: YYYY-MM-DD
**Backend Coverage Tool**: pytest-cov
**Frontend Coverage Tool**: Vitest + v8

---

## Overall Metrics

| Metric | Backend | Frontend | Target | Status |
|--------|---------|----------|--------|--------|
| Line Coverage | N% | N% | ≥80% | ✅/❌ |
| Branch Coverage | N% | N% | ≥75% | ✅/❌ |
| Function Coverage | N% | N% | ≥80% | ✅/❌ |

---

## Coverage by Module

### Backend

| Module | Lines | Covered | % | Target | Status |
|--------|-------|---------|---|--------|--------|
| app/services/scoring.py | N | N | N% | ≥90% | ✅/❌ |
| app/services/leaderboard.py | N | N | N% | ≥80% | ✅/❌ |
| app/routers/submissions.py | N | N | N% | ≥80% | ✅/❌ |
| app/routers/tasks.py | N | N | N% | ≥80% | ✅/❌ |
| app/tasks/scoring.py | N | N | N% | ≥80% | ✅/❌ |
| app/models/ | N | N | N% | ≥70% | ✅/❌ |
| app/utils/ | N | N | N% | ≥70% | ✅/❌ |

### Frontend

| Module | Lines | Covered | % | Target | Status |
|--------|-------|---------|---|--------|--------|
| components/AnnotationWorkspace | N | N | N% | ≥70% | ✅/❌ |
| components/Leaderboard | N | N | N% | ≥70% | ✅/❌ |
| pages/AnnotatePage | N | N | N% | ≥70% | ✅/❌ |
| hooks/useSubmission | N | N | N% | ≥80% | ✅/❌ |

---

## Coverage Targets by Module Type

| Module Type | Target | Rationale |
|-------------|--------|-----------|
| Scoring engine | ≥90% | Critical correctness — wrong score affects research |
| Security logic | 100% | Leakage prevention is non-negotiable |
| API endpoints | ≥80% | Core user-facing functionality |
| Celery tasks | ≥80% | Async failures are hard to debug |
| Frontend components | ≥70% | E2E covers integration; unit for logic |
| Utilities | ≥70% | Helper functions |

---

## Critical Gaps

### 🔴 P0 Gaps — Security / Scoring

| File | Lines Not Covered | Missing Test |
|------|------------------|-------------|
| services/scoring.py:45-67 | compute_f1 empty branch | `test_f1_empty_predictions` |
| tasks/scoring.py:89 | Celery retry branch | `test_scoring_task_retry_on_timeout` |

### 🟡 P1 Gaps — API Endpoints

| File | Lines Not Covered | Missing Test |
|------|------------------|-------------|
| routers/submissions.py:78 | Rate limit exceeded branch | `test_submission_rate_limit` |
| routers/tasks.py:45 | Deadline check branch | `test_submission_after_deadline` |

---

## Untested Code Paths

```python
# backend/app/services/scoring.py:45
def compute_f1(predictions: list[str], references: list[str]) -> float:
    if not predictions:  # ← THIS BRANCH NOT COVERED
        return 0.0
    # ...
```

**Recommended test**:
```python
def test_f1_empty_predictions_returns_zero():
    result = compute_f1(predictions=[], references=["positive", "negative"])
    assert result == 0.0
```

---

## Historical Trends

```
Week 1:  ████████░░  75% ⚠️
Week 2:  █████████░  82% ✅
Week 3:  █████████░  84% ✅ (current)
Target:  ██████████  80% minimum
```

---

## Recommendations

### Immediate (This Sprint)
1. Add `test_f1_empty_predictions` — covers scoring gap (P0)
2. Add `test_submission_rate_limit` — covers rate limiting (P1)

### Next Sprint
1. Add Playwright test for annotation flow error states
2. Increase frontend component test coverage to ≥70%

### Commands to Run

```bash
# Find uncovered lines
pytest --cov=app --cov-report=term-missing 2>&1 | grep "MISS"

# Coverage diff (only new code)
diff-cover coverage.xml --compare-branch=main

# Mutation testing (validate test quality)
mutmut run --paths-to-mutate=app/services/scoring.py
mutmut results
```
```
