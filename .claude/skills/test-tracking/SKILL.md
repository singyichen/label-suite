---
name: test-tracking
description: Track test execution progress, coverage trends, and defect metrics for a sprint or release.
---

# Test Tracking

Dashboard for tracking test execution status, coverage progress, and quality metrics across a sprint or release cycle.

## Usage

```
/test-tracking sprint     # Sprint test progress dashboard
/test-tracking release    # Release readiness tracking
```

## Output Format

```markdown
# Test Tracking Dashboard

**Sprint / Release**: Sprint N
**Period**: YYYY-MM-DD to YYYY-MM-DD
**Last Updated**: YYYY-MM-DD
**Status**: 🟢 On Track | 🟡 At Risk | 🔴 Off Track

---

## Overall Progress

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Test Cases Planned | N | N | — |
| Test Cases Executed | N | N (N%) | ✅/⚠️/❌ |
| Test Cases Passed | N (100%) | N (N%) | ✅/⚠️/❌ |
| Coverage (Backend) | ≥80% | N% | ✅/⚠️/❌ |
| Coverage (Scoring) | ≥90% | N% | ✅/⚠️/❌ |
| Critical Defects Open | 0 | N | ✅/❌ |
| P0 Security Tests | 100% pass | N% | ✅/❌ |

---

## Execution by Test Type

| Type | Planned | Executed | Passed | Failed | Blocked |
|------|---------|----------|--------|--------|---------|
| pytest unit | N | N | N | N | N |
| pytest integration | N | N | N | N | N |
| Playwright E2E | N | N | N | N | N |
| Security (leakage) | N | N | N | 0 | 0 |
| **Total** | **N** | **N** | **N** | **N** | **N** |

---

## Coverage Trend

```
Day 1:   ███████░░░  68%
Day 2:   ████████░░  75%
Day 3:   █████████░  82% ✅
Day 4:   █████████░  84%
Target:  ████████    80%
```

---

## AC Verification Status

| Spec | AC | Description | Status | Test | Notes |
|------|----|-------------|--------|------|-------|
| specs/001 | AC-F01 | Submission accepted | ✅ Pass | TC-01 | |
| specs/001 | AC-F02 | Score computed | ✅ Pass | TC-02 | |
| specs/001 | AC-S01 | Answer not exposed | ✅ Pass | TC-S01 | P0 |
| specs/001 | AC-E01 | Empty rejected 422 | ⏳ Pending | TC-05 | |
| specs/002 | AC-L01 | Leaderboard ranks | ❌ Blocked | TC-10 | Waiting for staging |

---

## Defect Summary

| ID | Title | Severity | Status | Assigned |
|----|-------|----------|--------|----------|
| DEF-001 | F1 zero division for empty list | High | 🔧 In Progress | |
| DEF-002 | Rate limit not enforced on staging | Medium | 🔍 Investigating | |

### Defect Trend

```
Open Critical:  ██                    0 (target: 0) ✅
Open High:      ███                   1
Open Medium:    █████                 2
Open Low:       ███████               3
```

---

## Velocity Tracking

| Day | Tests Added | Tests Executed | Pass Rate |
|-----|-------------|----------------|-----------|
| Mon | +15 | 20 | 95% |
| Tue | +8 | 18 | 100% |
| Wed | +5 | 10 | 90% |

**Estimated Completion**: [Date based on current velocity]

---

## Risk Indicators

| Risk | Status | Action |
|------|--------|--------|
| Scoring coverage below 90% | ⚠️ At 85% | Add 3 more unit tests |
| DEF-001 open (High) | ⚠️ In progress | Fix by EOD today |
| Playwright E2E 30% not executed | ⚠️ | Run tomorrow |
| P0 security tests: all pass | ✅ | No action |

---

## Daily Standup Summary

**Yesterday**: [What was tested]
**Today**: [What will be tested]
**Blockers**: [Any blockers to resolve]
```
