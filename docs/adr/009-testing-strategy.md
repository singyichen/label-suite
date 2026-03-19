# ADR-009: Testing Strategy — pytest + Playwright

**Status**: Accepted
**Date**: 2026-03-19

## Context

The system has two critical correctness requirements:

1. **Scoring accuracy**: Evaluation metrics (F1, accuracy, BLEU, etc.) must compute correctly — wrong scores corrupt the leaderboard and undermine the research value of the platform.
2. **Test-set leakage prevention**: The annotation API must never expose ground-truth answers to annotators or submission endpoints — a security invariant, not just a functional requirement.

These constraints require a layered testing strategy covering both the backend logic and the end-to-end user flows.

### Backend Testing Candidates

| Framework | Async Support | FastAPI Integration | Coverage | Fixtures |
|-----------|:-------------:|:-------------------:|:--------:|:--------:|
| **pytest** | pytest-asyncio | httpx TestClient | pytest-cov | conftest.py |
| unittest | Manual | Manual | coverage.py | setUp/tearDown |
| nose2 | Partial | Manual | coverage.py | Plugins |

**unittest rejected**: Verbose boilerplate, no native async support, weaker fixture model. pytest is the de facto standard for FastAPI projects.

### Frontend / E2E Testing Candidates

| Tool | Browser Engines | Python? | Parallel | CI Support |
|------|:---------------:|:-------:|:--------:|:----------:|
| **Playwright** | Chromium, Firefox, WebKit | Yes + Node | Yes | GitHub Actions |
| Cypress | Chromium only | No | Paid | GitHub Actions |
| Selenium | All | Yes | Manual | GitHub Actions |

**Cypress rejected**: Chromium-only limits browser coverage. The free tier has no parallelism. The team has existing Playwright experience.

**Selenium rejected**: Slower, more flaky, higher maintenance cost than modern alternatives.

## Decision

- **Backend**: **pytest** + `pytest-asyncio` + `httpx` for unit and integration tests.
- **E2E**: **Playwright** (Node.js, TypeScript) for browser automation and critical user flow tests.
- **Development approach**: **Test-Driven Development (TDD)** — all agents and developers must write tests before implementation code.

### TDD Workflow

All feature implementation — whether by human developers or AI agents — must follow the Red-Green-Refactor cycle:

```
1. Red   — Write a failing test that defines the expected behavior
2. Green — Write the minimum code to make the test pass
3. Refactor — Clean up the code without changing behavior; tests must still pass
```

**Agent-specific rule**: When an AI agent (senior-backend, senior-frontend, or any other) is asked to implement a feature, it must:

1. Write the test file first (`tests/unit/` or `tests/integration/`)
2. Confirm the test fails (Red) before writing any implementation
3. Implement only what is needed to pass the test (Green)
4. Refactor if needed, keeping all tests green

**Example — TDD for a scoring metric:**

```python
# Step 1 (Red): write the test first
# backend/tests/unit/test_scoring.py
def test_f1_macro_perfect_score():
    predictions = ["positive", "negative", "neutral"]
    ground_truth = ["positive", "negative", "neutral"]
    assert compute_f1_macro(predictions, ground_truth) == 1.0

def test_f1_macro_all_wrong():
    predictions = ["positive", "positive", "positive"]
    ground_truth = ["negative", "neutral", "negative"]
    assert compute_f1_macro(predictions, ground_truth) == 0.0

def test_f1_macro_empty_raises():
    with pytest.raises(ValueError, match="empty"):
        compute_f1_macro([], [])

# Step 2 (Green): implement compute_f1_macro() to pass the above tests
# Step 3 (Refactor): clean up implementation; re-run tests to confirm
```

### Coverage Thresholds

| Layer | Threshold | Rationale |
|-------|----------:|-----------|
| General backend | ≥ 80% | Constitution principle 4 |
| Scoring engine (`backend/app/services/scoring.py`) | ≥ 90% | Correctness-critical |
| Leakage prevention (`backend/app/api/routes/`) | 100% of security ACs | Non-negotiable |

### Test Categories

| Category | Tool | Location | When Run |
|----------|------|----------|----------|
| Unit (scoring metrics) | pytest | `backend/tests/unit/` | Every commit |
| Integration (API endpoints) | pytest + httpx | `backend/tests/integration/` | Every commit |
| Leakage security | pytest | `backend/tests/security/` | Every commit (blocking) |
| E2E (core user flows) | Playwright | `frontend/tests/` | PR and main branch |

### Leakage Test Convention

Any test that verifies test-set answers are not exposed must be tagged `@pytest.mark.security` and must assert on every field of every annotator-facing API response:

```python
@pytest.mark.security
async def test_submission_response_excludes_answers(client):
    response = await client.get("/api/v1/submissions/1")
    assert "answer" not in response.json()
    assert "ground_truth" not in response.json()
    assert "label" not in response.json()
```

## Consequences

### Easier
- `pytest-asyncio` allows testing async FastAPI routes and SQLAlchemy sessions without sync wrappers.
- `httpx.AsyncClient` with `app=app` provides a real ASGI test client — no mocking of HTTP transport.
- Playwright TypeScript tests co-locate with the frontend (`frontend/tests/`) and share type definitions.
- Coverage reports (`pytest --cov`) integrate with CI to enforce thresholds per module.
- The `@pytest.mark.security` convention makes leakage tests easily identifiable and runnable in isolation (`pytest -m security`).
- Playwright's `codegen` tool accelerates writing E2E tests for the annotation workflow.

### Harder
- Two test runners (pytest and Playwright) mean two CI jobs and two local commands to remember.
- Integration tests require running PostgreSQL and Redis — handled via Docker Compose locally and GitHub Actions service containers in CI.
- Achieving 90% scoring engine coverage requires testing edge cases (empty submissions, malformed files, metric corner cases) explicitly.
- Playwright tests are slower than unit tests — must be run selectively in CI to avoid blocking PR feedback (run full suite only on main branch merge).
