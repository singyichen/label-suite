# Verification Evidence: admin-role-settings-nav-shortcut

Committed evidence for the checked Red/Green/verification tasks in `tasks.md`, requested by
PR #757 review finding "Checked tasks lack run evidence". Commands were re-run after the
final PR-review fixes (768px boundary fix, CSS/JS quality fixes, canonical write-back) to
record accurate current numbers; the original Red run below is the first commit's evidence
(unchanged since Red must not be re-run after Green).

## 1.1/1.2 — Red run (commit `2bf91b6a`, before Green implementation)

Command:

```
cd design/prototype && PW_PORT=8895 pnpm exec playwright test tests/shared/issue-725-admin-submenu-shortcut.spec.ts
```

Result: 6 failed, 1 passed, exit code 1.

Failure reason (identical for all 6 failing tests): `getByTestId('admin-nav-trigger')` never
resolves to a visible/attached element, e.g.:

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByTestId('admin-nav-trigger')
```

This matches the expected Red reason: `sidebar.js`/`sidebar.css` had not yet added the
`admin-nav-trigger`/`admin-nav-submenu`/`admin-nav-*-link` contract. The 1 passing test
(`existing admin-tabs entry point inside user-management.html is preserved`) covers
pre-existing behavior and was expected to stay green in Red.

## 1.3/1.4 — Green run (after `sidebar.js`/`sidebar.css` implementation)

Command: same as above.

Result: 7 passed, exit code 0 (recorded at Green time, before the 8th "exactly 768px"
regression test existed).

## Post-review fix run (final, current HEAD)

All commands executed from a clean working tree after commits `cdbad12` (768px fix),
`de0cc98` (CSS token/motion/touch-target fixes), `bfaa473` (JS code-quality fixes), and the
canonical spec 008 write-back to v1.5.0.

| Command | Exit code | Result |
|---|---:|---|
| `cd design/prototype && PW_PORT=8898 pnpm exec playwright test tests/shared/issue-725-admin-submenu-shortcut.spec.ts` | `0` | `8 passed (3.2s)` |
| `cd design/prototype && pnpm typecheck` | `0` | `tsc --noEmit`, no errors |
| `cd design/prototype && PW_PORT=8898 pnpm exec playwright test tests/shared/` | `0` | `94 passed (17.3s)` |
| `git diff --check` | `0` | no whitespace errors |
| `bash scripts/check-sdd.sh` | `1` | `1 error(s), 14 warning(s)` — the sole `ERROR` is `[ACTIVE_CHANGE_SPEC] openspec/changes/task-new-step1-type-preset: active change is missing a readable proposal.md`, an untracked, pre-existing empty-directory leftover from the already-archived issue #724 work (`git ls-files openspec/changes/task-new-step1-type-preset` returns nothing; `git log --all -- openspec/changes/task-new-step1-type-preset` shows it was archived by issue #724 commits, not introduced by this branch). Not caused by this change. |
| `npx -p @fission-ai/openspec openspec validate --changes --no-interactive` | `1` | same pre-existing `task-new-step1-type-preset` failure as above; `add-user-path-map-freshness-check` and this change (now archived, so no longer in the active list) both pass |

Full prototype suite (`pnpm exec playwright test`, no path filter, run earlier in this PR
before the review-fix commits): `1580 passed`, `1 flaky`
(`tests/dataset/dataset-analysis-detail-sequence-tagging-i18n.spec.ts`, an existing i18n
text-timing test unrelated to the sidebar/admin scope of this change), 3 pre-existing tests
using `test.fail()`-style "documents a known gap" annotations, overall exit code `0`.

## Source-Verify (docs/sdd-workflow.md §6.2)

Every FR/SC ID cited in the derived view (`openspec/specs/shared/008-sidebar-navbar-shared/spec.md`)
and this archived change's delta/proposal/design/tasks was grepped against the canonical
`specs/shared/008-sidebar-navbar-shared/spec.md` (v1.5.0) and, for cross-spec citations,
against the named source spec:

- `FR-002`, `FR-003A`, `FR-006`, `FR-007`, `SC-003` (pre-existing, unchanged) — located.
- `FR-019`, `FR-019A`, `FR-019B`, `FR-019C`, `FR-019D`, `FR-019E`, `SC-012`, `SC-012A`, `SC-012B` (new) — located as `### Requirement:`/`#### Scenario:` headings in the derived view and as `- **FR-...**`/`- **SC-...**` bullets in the canonical spec's 使用者故事 8, 功能需求, and 成功標準 sections.
- `spec 006 FR-010` — located at `specs/admin/006-user-management/spec.md:260`, text matches ("兩個 admin tabs...點擊「角色設定」必須導向 role-settings.html").
- `spec 007 FR-006` — located at `specs/admin/007-role-settings/spec.md:303`, text matches (admin tabs mutual linkage).
- File paths (`design/prototype/pages/shared/sidebar.js`, `sidebar.css`,
  `design/prototype/tests/shared/issue-725-admin-submenu-shortcut.spec.ts`) — all exist.
- `issue #725`, `PR #757` — both exist and match this change's scope.

No citation was found to be missing, mismatched, or paraphrased incorrectly.
