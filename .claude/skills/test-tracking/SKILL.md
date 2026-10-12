---
name: test-tracking
description: Track AC verification and coverage status for a feature or OpenSpec change against Label Suite thresholds.
---

# Test Tracking

Report test execution status for one feature or OpenSpec change. Use real command output (CLAUDE.md Verification Commands); never invent counts or trend charts.

## Usage

```
/test-tracking specs/[module]/NNN-feature/
/test-tracking openspec/changes/<change>
```

## Output Format

```markdown
# Test Tracking: [Feature / Change]

**Last Updated**: YYYY-MM-DD
**Status**: 🟢 On Track | 🟡 At Risk | 🔴 Off Track

## Thresholds
| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Backend coverage | >= 80% | N% | ✅/❌ |
| Scoring / critical-path coverage | >= 90% | N% | ✅/❌ |
| P0 leakage tests | 100% pass | N% | ✅/❌ |

## AC Verification
| Spec | AC ID | Status (Pass / Pending / Blocked) | Test file | Notes |

## Open Defects
| Issue | Severity | Status |
```

Rules: a P0 leakage failure marks the whole status 🔴; Red/Green evidence comes from `tasks.md`, which only the main agent updates.
