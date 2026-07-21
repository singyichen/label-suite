---
name: regression-suite
description: Design and manage the regression test suite for Label Suite releases.
---

# Regression Suite

Plan and manage the regression test suite to ensure new changes don't break existing functionality.

## Usage

```
/regression-suite plan          # Plan regression strategy for next release
/regression-suite run           # Generate regression run checklist
/regression-suite impact <file> # Analyze impact of changes to specific file
```

## Regression Suite Structure

### Tier 1: Smoke Tests (5 minutes, run on every commit)

| Test | Tool | Purpose |
|------|------|---------|
| FastAPI app starts | pytest | Basic health check |
| GET /health returns 200 | pytest | API reachability |
| DB connection active | pytest | Database connectivity |
| Redis connection active | pytest | Celery broker |
| Frontend builds | Vite | Bundle integrity |

### Tier 2: Critical Path Tests (15 minutes, run on every PR)

| Test | Tool | AC |
|------|------|-----|
| Annotator login and JWT issued | pytest | Auth |
| POST /submissions accepted | pytest | AC-F01 |
| Celery scoring task completes | pytest | AC-F02 |
| GET /submissions/{id} returns score | pytest | AC-F03 |
| GET /leaderboard returns rankings | pytest | Leaderboard |
| **answer NOT in any response** | pytest security | AC-S01 (P0) |
| Annotator cannot access /admin/* | pytest | AC-S05 |

### Tier 3: Full Regression (45 minutes, run before release)

All Tier 1 + Tier 2 tests, plus:

| Test | Tool |
|------|------|
| All P1 AC verification | pytest + Playwright |
| Rate limiting enforcement | pytest |
| Config-driven form rendering | Playwright |
| Leaderboard sort order correctness | pytest |
| Scoring for all supported metric types | pytest |
| Celery task failure + retry | pytest |
| Admin CRUD operations | pytest |

---

## Impact Analysis

When a file changes, determine the minimum regression tier needed:

| Changed File | Minimum Tier | Reason |
|--------------|-------------|--------|
| `services/scoring.py` | Tier 3 | Core scoring logic |
| `tasks/scoring.py` | Tier 3 | Scoring Celery task |
| `schemas/dataset.py` | Tier 3 | Risk of leakage |
| `routers/submissions.py` | Tier 2 | Submission flow |
| `routers/leaderboard.py` | Tier 2 | Leaderboard |
| `components/AnnotationWorkspace.tsx` | Tier 2 | Core annotator UI |
| `utils/*.py` | Tier 1 | Utilities |
| `README.md`, `docs/` | Tier 1 | Docs only |

---

## CI/CD Integration

```yaml
# .github/workflows/regression.yml
name: Regression Tests

on:
  push:
    branches: [main]
  pull_request:

jobs:
  smoke:
    name: Smoke Tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run smoke tests
        run: pytest tests/ -m smoke --tb=short

  critical-path:
    name: Critical Path Tests
    runs-on: ubuntu-latest
    needs: smoke
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: test
      redis:
        image: redis:7
    steps:
      - uses: actions/checkout@v4
      - name: Run critical path tests
        run: pytest tests/ -m "critical or security" --tb=short

  full-regression:
    name: Full Regression (pre-release)
    runs-on: ubuntu-latest
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - name: Run full regression
        run: |
          pytest tests/ --tb=short
          pnpm playwright test
```

---

## Regression Run Checklist

```markdown
## Release Regression Checklist

**Release**: vX.Y.Z
**Date**: YYYY-MM-DD
**Runner**: senior-qa

### Pre-Run
- [ ] All CI checks green on release branch
- [ ] Staging environment deployed and healthy
- [ ] Test data seeded in staging

### Tier 1 (Smoke)
- [ ] App starts in Docker Compose
- [ ] GET /health → 200

### Tier 2 (Critical Path)
- [ ] POST /submissions flow works end-to-end
- [ ] Celery scoring completes within 30s
- [ ] `answer` NOT in API response (security)
- [ ] Annotator cannot access admin endpoints

### Tier 3 (Full Regression)
- [ ] All P1 ACs verified
- [ ] All metric types score correctly
- [ ] Playwright: annotator annotation flow
- [ ] Playwright: leaderboard display

### Sign-Off
- [ ] QA: [name] — PASS / FAIL
- [ ] Tech Lead: [name] — Approved for release
```

## Flaky Test Management

| Action | When |
|--------|------|
| Mark as `@pytest.mark.flaky(reruns=3)` | Intermittent, understood cause |
| File issue and skip (`@pytest.mark.skip`) | Blocking CI, investigating |
| Delete test | Obsolete or duplicate |
| Fix root cause | Preferred action |
