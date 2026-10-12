---
name: regression-suite
description: Plan a regression run for Label Suite by mapping changed paths to the minimum test tier.
---

# Regression Suite

Choose the minimum verification tier for a change. The commands and CI jobs are defined in `CLAUDE.md` (Verification Commands) and `.github/workflows/ci.yml`; do not duplicate workflow YAML here.

## Usage

```
/regression-suite plan          # Tiering for the next release
/regression-suite impact <path> # Minimum tier for a changed path
```

## Tiers

| Tier | When | Contents |
|------|------|----------|
| 1 Smoke | every commit | lint, type check, unit tests of the touched layer |
| 2 Critical path | every PR | Tier 1 + auth / permission checks + P0 leakage tests (`uv run pytest -m security`) + affected E2E |
| 3 Full | before release | all CI gates in CLAUDE.md, plus every P1 AC of the affected specs |

## Impact Rules

| Changed path | Minimum tier | Reason |
|--------------|--------------|--------|
| scoring / evaluation code under `backend/app/modules/` | 3 | core scoring, coverage >= 90% |
| response schemas that annotator-facing endpoints return | 3 | leakage risk (constitution III) |
| auth / permission code | 2 (3 if role matrix changes) | constitution XV |
| other `backend/app/modules/[module]/` | 2 | module flow |
| `frontend/src/features/[module]/` | 2 | UI flow |
| `docs/`, `specs/`, `README.md` only | 1 | docs only |

## Flaky Tests

Fix the root cause. If it blocks CI, open an issue (`.claude/rules/issue-reporting.md`) and skip with the issue number in the reason; delete only obsolete or duplicate tests. Do not add retry decorators as a fix.
