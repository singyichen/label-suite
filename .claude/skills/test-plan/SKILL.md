---
name: test-plan
description: Generate a test plan for a Label Suite feature or OpenSpec change, scoped to the project's test layout, thresholds, and leakage rules.
---

# Test Plan

Generate a test plan for one feature or OpenSpec change. Do not add schedules, tool-version tables, or SLA tables; the project has no sprint or leaderboard concept in any canonical spec. Test strategy lives in `specs/_governance/testing-constitution.md`; follow it instead of restating it.

## Usage

```
/test-plan specs/annotation/001-annotation-submission/spec.md
/test-plan openspec/changes/<change>
```

## Project-Specific Rules

- **P0**: test-set answer leakage (Data Fairness, constitution III). Any annotator-facing response, log, or error exposing ground truth blocks release.
- **Coverage**: backend overall >= 80%; scoring engine and critical paths (auth, permission checks, score calculation) >= 90%.
- **Locations**: `backend/tests/`, `frontend/src/**/__tests__/`, `e2e/[module]/[page].spec.ts`; prototype tests under `design/prototype/`.
- **Commands**: the Verification Commands block in `CLAUDE.md` is the only source for what to run.
- **Test data**: synthetic only (testing constitution); see `/test-data-strategy`.
- **Traceability**: every scenario cites a stable `FR-NNN` / `AC-N.N` ID from the canonical spec or the change's delta spec.

## Output Format

```markdown
# Test Plan: [Feature / Change Name]

**Spec Reference**: specs/[module]/NNN-feature/spec.md (and openspec/changes/<change>/ if any)
**Date**: YYYY-MM-DD
**Prepared By**: senior-qa

## Scope
| Feature / FR | Test Layer (pytest / Vitest / Playwright / prototype) | Priority (P0 leakage, P1 AC, P2 other) |

## Scenarios
| ID | Scenario | Layer | AC ID | Priority |

## Security Scenarios
| ID | Scenario | Layer | AC ID | Priority |

## Entry / Exit Criteria
- Entry: Red tests committed per the change's `tasks.md`
- Exit: all P0 pass, every P1 AC covered, coverage thresholds met, CI green

## Out of Scope
```
