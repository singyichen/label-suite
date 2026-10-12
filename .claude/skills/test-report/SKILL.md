---
name: test-report
description: Generate a test execution report for a feature, release, regression run, or leakage-prevention audit from real command output.
---

# Test Report

Summarize actual test results. Every number must come from a command run (CLAUDE.md Verification Commands); do not estimate or carry over figures.

## Usage

```
/test-report release     # Release readiness
/test-report regression  # Regression run (see /regression-suite)
/test-report security    # Leakage-prevention and RBAC audit
```

## Release / Regression Report

```markdown
# Test Report: [Scope]

**Date**: YYYY-MM-DD
**Prepared By**: senior-qa

## Results
| Layer | Command | Total | Passed | Failed | Coverage |
|-------|---------|-------|--------|--------|----------|
| backend | `uv run pytest` | N | N | N | N% (>= 80%; scoring >= 90%) |
| frontend | `pnpm test` | N | N | N | — |
| e2e / prototype | (as applicable) | N | N | N | — |

## Spec Traceability
| Spec / FR | ACs | Covered | Status |

## Open Defects
| Issue | Severity | Status |

## Risk Assessment
```

## Security Report (Leakage Prevention)

Enumerate every annotator-facing surface (API responses, error bodies, logs, Celery result polling, exports) and record pass/fail per surface for ground-truth exposure (constitution III), plus RBAC per role (constitution XV). Any failure is P0: stop and follow `.claude/rules/issue-reporting.md` (Critical/High security findings are escalated privately, never filed as public issues).
