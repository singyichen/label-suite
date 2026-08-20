# Spec-to-Prototype Traceability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every active UI feature spec navigable to its owning prototype and design-layer verification, fix the seven confirmed Issue #261 drifts, and make `proto-sync` resolve non-trivial mappings without silent skips.

**Architecture:** Active feature specs remain authoritative for behavior, roles, data, security, FRs, and SCs; prototype artifacts remain authoritative only for observable layout and interaction; Playwright remains the design-layer verifier. Each active UI spec gains one `## Prototype Traceability` table using the exact five-column contract below, while `foundation-000` remains N/A and `shared-018` remains Deferred. Behavior fixes are test-first and isolated from the documentation/tooling batches; no API, backend, database, migration, React, or dependency changes are allowed.

**Tech Stack:** Markdown feature specs, static HTML/CSS/JavaScript prototypes, Playwright/TypeScript, shell-based repository checks.

**Spec:** GitHub Issue #261 (`https://github.com/singyichen/label-suite/issues/261`)

## 功能目標

讓規格作者、prototype 實作者與 reviewer 能從 15 份 active UI specs 直接定位 owning page、shared asset、partial/page-scoped design 與 design-layer 驗證，且衝突由 active spec 裁決並明確記錄，不由同步工具靜默覆寫。

## Global Constraints

- Use exactly `Artifact | Responsibility | Covered FR/SC | Verification | Status`; do not rename, add, or remove columns.
- Add the table immediately before `## 規格相依性` where that heading exists, otherwise immediately before `## 成功標準`; use repository-relative Markdown links whose targets exist.
- A prototype row describes only layout, visual hierarchy, component state, observable interaction, responsive behavior, or shared selector behavior. It must not claim API/data-model/product-contract authority.
- Every traceability-only spec gets a PATCH bump dated `2026-08-20`, a newest-first Changelog row referencing Issue #261, and the same version in `specs/STATUS.md`.
- Target versions: 001 `1.2.4`; 002 `1.2.3`; 003 `1.2.7`; 004 `1.1.4`; 005 `1.2.10`; 006 `1.0.9`; 007 `1.1.12`; 008 `1.4.2`; 010 `2.0.3`; 012 `2.0.4`; 013 `6.9.2`; 014 `2.10.1`; 015 `4.10.1`; 016 `2.1.1`; 017 `2.1.1`.
- Do not version or edit `specs/foundation/000-foundation/spec.md`; record it in the final audit as `N/A — no page journey`. Do not activate or invent a prototype for `specs/shared/018-help-button/spec.md`; leave v1.1.1 and `Deferred` unchanged and verify its existing “prototype does not exist” notice.
- TDD applies to prototype behavior changes. Documentation-only drift (005 and 016) and test-only coverage drift (014) must not manufacture a failing runtime test.
- Every artifact-producing task owns exactly one file. Test writers own only `design/prototype/tests/**`; prototype implementers own only the named `design/prototype/pages/**` file; documentation implementers own only the named spec or command file. `specs/STATUS.md` is owned serially by Team Lead.
- No API/DB/backend/frontend-React work, dependency updates, version bumps in package manifests, new wireframes, or mock-data promotion to product contracts.
- Implementation PRs must have one purpose, at most 5 non-test files, and at most 300 changed non-test lines. Test files are excluded from both limits, but are still reviewed.

## Pre-change Baseline (2026-08-20)

- Repository root: `./scripts/check-spec-artifacts.sh` passed with `Spec artifact check passed`.
- `design/prototype`: `pnpm typecheck` passed.
- `design/prototype`: full `pnpm playwright test` passed with `800 passed` in `5.0m`.
- Treat these results as the green baseline. During implementation, a newly failing focused regression is valid RED evidence only when the unchanged baseline tests remain green; any unrelated regression stops the batch.

## Traceability Content Matrix

Use these exact relationships when writing each five-column table. The `Verification` cell is the required spec-to-test link; do not churn unrelated test headers. Shared pages must state the responsibility boundary.

| Spec | Artifact and responsibility | Covered FR/SC | Verification | Status |
|---|---|---|---|---|
| account-001 | `design/prototype/pages/account/login.html`: Email/password form, validation, navigation, i18n and RWD; explicitly excludes Google SSO behavior owned by 002. `design/wireframes/pages/account/login.pen`: optional visual reference only. | FR-001–FR-015B; SC-001–SC-006 | `design/prototype/tests/account/login.spec.ts` | Active; HTML shared with 002 |
| account-002 | `design/prototype/pages/account/login.html`: Google button visibility, accessible label, language switching and prototype no-op only; OAuth/callback/session are out of scope. | FR-001–FR-006; SC-001–SC-004 | `design/prototype/tests/account/login.spec.ts` (`google-login-btn` cases) | Active; HTML shared with 001 |
| account-003 | `design/prototype/pages/account/register.html`: registration form, validation, submit/success, navigation, i18n and RWD. `design/wireframes/pages/account/register.pen`: optional visual reference only. | FR-001–FR-013A; SC-001–SC-006 | `design/prototype/tests/account/register.spec.ts` | Active |
| account-004 | `design/prototype/pages/account/forgot-password.html`: forgot flow and full-page loading lock. `design/prototype/pages/account/reset-password.html`: valid/expired/used reset states and full-page loading lock. `design/wireframes/pages/account/forgot-password.pen` and `design/wireframes/pages/account/reset-password.pen`: optional visual references only. | Forgot: FR-001–FR-004, FR-011/11A, FR-013/13A, SC-001/002/005–007. Reset: FR-005–FR-013A, SC-003–SC-007. | `design/prototype/tests/account/forgot-password.spec.ts`; `design/prototype/tests/account/reset-password.spec.ts` | Active; multi-page |
| account-005 | `design/prototype/pages/account/profile.html`: all profile page sections and in-page states. State explicitly that `design/wireframes/pages/account/profile.pen` is absent and must not be linked as an existing artifact. | FR-001–FR-015; SC-001–SC-011 | `design/prototype/tests/account/profile-notification-settings.spec.ts` | Active; wireframe absent |
| admin-006 | `design/prototype/pages/admin/user-management.html`: user list/account interactions. Cross-reference sibling `design/prototype/pages/admin/role-settings.html` only for admin-tab navigation, not ownership. | FR-001–FR-013c; SC-001–SC-012 | `design/prototype/tests/admin/user-management.spec.ts` | Active |
| admin-007 | `design/prototype/pages/admin/role-settings.html`: matrix modes, discard confirmation, conflict/toast/audit states. Cross-reference sibling user-management page only for tab navigation. | FR-001–FR-010a; SC-001–SC-010 | `design/prototype/tests/admin/role-settings.spec.ts` | Active |
| dashboard-012 | `design/prototype/pages/dashboard/dashboard.html`, `design/prototype/pages/dashboard/dashboard.js`, `design/prototype/pages/dashboard/dashboard.data.js`, `design/prototype/pages/dashboard/dashboard.assignments.js`, `design/prototype/pages/dashboard/dashboard.i18n.js`, `design/prototype/pages/dashboard/dashboard.layout.css`, `design/prototype/pages/dashboard/dashboard.components.css`: one page and its page-owned behavior/state/style/data assets. `design/system/pages/dashboard.md` and `design/wireframes/pages/dashboard/dashboard.pen`: page-scoped design references. | FR-001–FR-019; SC-001–SC-024 | `design/prototype/tests/dashboard/dashboard.spec.ts`; `design/prototype/tests/dashboard/dashboard-output-types.spec.ts`; `design/prototype/tests/dashboard/dashboard-behavior.spec.ts` | Active; page asset set |
| task-management-010 | `design/prototype/pages/task-management/task-list.html` and `design/prototype/pages/task-management/task-list.data.js`: shell and safe fixture summaries. `design/system/pages/task-list.md`: page-scoped design reference. | FR-001–FR-012; SC-001–SC-015 | `design/prototype/tests/task-management/task-list-output-types.spec.ts`; `design/prototype/tests/task-management/task-list-run-materialization.spec.ts` | Active; multi-asset |
| task-management-013 | `design/prototype/pages/task-management/task-new.html`; shared page assets `design/prototype/pages/task-management/task-config.css`, `design/prototype/pages/task-management/task-config.data.js`, `design/prototype/pages/task-management/task-config.dataset.js`, `design/prototype/pages/task-management/task-config.engine.js`, `design/prototype/pages/task-management/task-config.yaml.js`; `design/system/pages/task-new.md`. These are config-driven UI/prototype assets, not API contracts. | FR-001–FR-009; SC-001–SC-006b | `design/prototype/tests/task-management/task-new-output-types-overview.spec.ts`; `design/prototype/tests/task-management/task-new-step2-preview.spec.ts`; `design/prototype/tests/task-management/task-new-create-redirect.spec.ts` | Active; multi-asset |
| task-management-014 | `design/prototype/pages/task-management/task-detail.html`: shared shell. Tab partials: `design/prototype/pages/task-management/task-detail.panels/overview.html`, `design/prototype/pages/task-management/task-detail.panels/annotation-results.html`, `design/prototype/pages/task-management/task-detail.panels/annotation-progress.html`, `design/prototype/pages/task-management/task-detail.panels/work-log.html`, `design/prototype/pages/task-management/task-detail.panels/member-management.html`. Page assets: `design/prototype/pages/task-management/task-detail.config.js`, `design/prototype/pages/task-management/task-detail.data.js`; design: `design/system/pages/task-detail.md`. | FR-001–FR-016b; SC-001–SC-040 | `design/prototype/tests/task-management/task-detail-tabs-partials.spec.ts`; `design/prototype/tests/task-management/task-detail-config-parity.spec.ts` | Active; shell + five partials |
| annotation-015 | `design/prototype/pages/annotation/annotation-list.html`: role/run-scoped list. `design/prototype/pages/annotation/annotation-workspace.html`, `design/prototype/pages/annotation/annotation-workspace.config.js`, `design/prototype/pages/annotation/annotation-workspace.data.js`: workspace shell, config-driven renderers and safe prototype state. Design: `design/system/pages/annotation-list.md`, `design/system/pages/annotation-workspace.md`. | FR-001–FR-063 and active AC/SC entries; preserve Data Fairness boundary | `design/prototype/tests/annotation/annotation-list-routing.spec.ts`; `design/prototype/tests/annotation/annotation-workspace-common.spec.ts`; `design/prototype/tests/annotation/annotation-workspace-data-fairness.spec.ts` | Active; multi-page |
| dataset-016 | `design/prototype/pages/dataset/dataset-analysis-list.html`, `design/prototype/pages/dataset/dataset-analysis-list.data.js`, `design/prototype/pages/dataset/dataset-analysis-list.i18n.js`, `design/prototype/pages/dataset/dataset-analysis-list.js`, `design/prototype/pages/dataset/dataset-analysis-list.model.js`, `design/prototype/pages/dataset/dataset-analysis-list.view.js`; `design/system/pages/dataset-analysis-list.md`. Fixtures are safe examples, not a whitelist or API contract. | FR-001–FR-008; SC-001–SC-012 | `design/prototype/tests/dataset/dataset-analysis-list-output-types.spec.ts`; `design/prototype/tests/dataset/dataset-analysis-list-filters-pagination.spec.ts` | Active; page asset set |
| dataset-017 | Shell: `design/prototype/pages/dataset/dataset-analysis-detail.html`. Stats partials: `design/prototype/pages/dataset/dataset-analysis-detail.partials/stats-single_label.html`, `design/prototype/pages/dataset/dataset-analysis-detail.partials/stats-multi_label.html`, `design/prototype/pages/dataset/dataset-analysis-detail.partials/stats-single_dim.html`, `design/prototype/pages/dataset/dataset-analysis-detail.partials/stats-multi_dim.html`, `design/prototype/pages/dataset/dataset-analysis-detail.partials/stats-sequence_tagging.html`, `design/prototype/pages/dataset/dataset-analysis-detail.partials/stats-entity_recognition.html`, `design/prototype/pages/dataset/dataset-analysis-detail.partials/stats-relation_identification.html`, `design/prototype/pages/dataset/dataset-analysis-detail.partials/stats-free_text.html`. Quality partials: `design/prototype/pages/dataset/dataset-analysis-detail.partials/quality-single_label.html`, `design/prototype/pages/dataset/dataset-analysis-detail.partials/quality-multi_label.html`, `design/prototype/pages/dataset/dataset-analysis-detail.partials/quality-single_dim.html`, `design/prototype/pages/dataset/dataset-analysis-detail.partials/quality-multi_dim.html`, `design/prototype/pages/dataset/dataset-analysis-detail.partials/quality-sequence_tagging.html`, `design/prototype/pages/dataset/dataset-analysis-detail.partials/quality-entity_recognition.html`, `design/prototype/pages/dataset/dataset-analysis-detail.partials/quality-relation_identification.html`, `design/prototype/pages/dataset/dataset-analysis-detail.partials/quality-free_text.html`. Design: `design/system/pages/dataset-analysis-detail.md`. | FR-001–FR-038; SC-001–SC-028 | `design/prototype/tests/dataset/dataset-analysis-detail-registry-mirror.spec.ts`; `design/prototype/tests/dataset/dataset-analysis-detail-panel-behavior.spec.ts`; type-specific suites in `design/prototype/tests/dataset/` | Active; shell + partials |
| shared-008 | `design/prototype/pages/shared/sidebar.js`: mount/navigation/i18n/theme/shortcut behavior. `sidebar.css`: shared desktop/mobile layout and state styling. Consumer responsibility is every current page mounting `sharedSidebarMount`; consumers do not own shared behavior. | FR-001–FR-018F; SC-001–SC-011E | `design/prototype/tests/shared/sidebar-shortcuts.spec.ts`; `language-switch-consistency.spec.ts`; `mobile-top-actions.spec.ts`; `sidebar-link-decoration.spec.ts` | Active; cross-page shared asset |

---

### Task 1: Account Traceability Batch (PR T1)

**Roles:** Implementer `senior-technical-writer`; reviewer `evidence-auditor`; Team Lead owns `specs/STATUS.md`.

**Files:** Modify individually: `specs/account/001-login-email-password/spec.md`, `specs/account/002-login-google-sso/spec.md`, `specs/account/003-register-email-password/spec.md`, `specs/account/004-forgot-reset-password/spec.md`; serial shared update `specs/STATUS.md`.

**Interfaces:** Consumes the five-column contract and matrix above. Produces versions 1.2.4, 1.2.3, 1.2.7 and 1.1.4 plus exact shared-page and multi-page ownership.

- [ ] For each spec, create one one-file subtask: insert its complete traceability rows, bump frontmatter PATCH, and prepend the `2026-08-20` Issue #261 Changelog row.
- [ ] Team Lead updates only the four version strings in `specs/STATUS.md`; do not change stage/status/branch prose.
- [ ] Run `./scripts/check-spec-artifacts.sh`, the relative-link command in Task 10, and `git diff --check`.
- [ ] Commit on a dedicated docs branch with `docs: trace account prototypes to active specs` and required English body bullets. Do not include Task 2 behavior files in this PR.

### Task 2: Account Loading-Lock Regression (PR B1, depends on T1)

**Roles:** RED/GREEN test implementer `senior-qa`; page implementer `senior-frontend` with task-local ownership; reviewers `senior-code-reviewer` and `senior-uiux`.

**Files:** Test separately: `design/prototype/tests/account/forgot-password.spec.ts`, `design/prototype/tests/account/reset-password.spec.ts`. Modify separately: `design/prototype/pages/account/forgot-password.html`, `design/prototype/pages/account/reset-password.html`.

**Interfaces:** Implements existing account-004 FR-003/FR-008 and SC-005A; no spec/API change.

- [ ] Add a failing forgot test that submits valid input, immediately asserts the email input, language toggle, and both login links are non-interactive/disabled during the 1200ms wait, then asserts the success panel appears.
- [ ] From `design/prototype`, run `pnpm playwright test tests/account/forgot-password.spec.ts --grep "full page during loading"`; expected RED because only `submitBtn` is disabled.
- [ ] Add the equivalent failing reset test covering password fields, visibility toggles, token-state controls, language toggle, and navigation links.
- [ ] Run `pnpm playwright test tests/account/reset-password.spec.ts --grep "full page during loading"`; expected RED because only `submitBtn` is disabled.
- [ ] Commit the two RED test files as `test: cover account recovery loading locks` with required English body bullets.
- [ ] In `forgot-password.html`, add a single page-busy state (`aria-busy` plus inert/disabled handling) before the wait and clear/replace it on success; keep the generic success message and timer unchanged.
- [ ] In `reset-password.html`, apply the same observable page-busy contract without changing valid/expired/used semantics.
- [ ] Run `pnpm playwright test tests/account/forgot-password.spec.ts tests/account/reset-password.spec.ts` and `pnpm typecheck`; expected GREEN.
- [ ] Commit as `fix: lock account recovery pages while submitting` with required English body bullets.

### Task 3: Profile/Admin/Dashboard Traceability Batch (PR T2, after T1)

**Roles:** Implementer `senior-technical-writer`; reviewer `evidence-auditor`; Team Lead owns `specs/STATUS.md`.

**Files:** Modify individually: `specs/account/005-profile-settings/spec.md`, `specs/admin/006-user-management/spec.md`, `specs/admin/007-role-settings/spec.md`, `specs/dashboard/012-dashboard/spec.md`; serial shared update `specs/STATUS.md`.

**Interfaces:** Produces versions 1.2.10, 1.0.9, 1.1.12, 2.0.4. Resolves drift #2 by truthfully marking `profile.pen` absent, not by creating it.

- [ ] Give each spec its matrix-defined table/version/Changelog in a one-file subtask; in account-005 replace both claims that `profile.pen` exists with an explicit absent/not-current-artifact statement and keep `profile.html` as the active UI baseline.
- [ ] Team Lead updates the four matching `specs/STATUS.md` versions only.
- [ ] Run artifact/link/diff/stale gates from Task 10.
- [ ] Commit as `docs: trace profile admin and dashboard prototypes` with required English body bullets.

### Task 4: Admin Cancel/Dirty-Banner Regression (PR B2, depends on T2)

**Roles:** RED test implementer `senior-qa`; GREEN page implementer `senior-frontend`; reviewers `senior-code-reviewer` and `senior-uiux`.

**Files:** Test: `design/prototype/tests/admin/role-settings.spec.ts`. Modify: `design/prototype/pages/admin/role-settings.html`.

**Interfaces:** Implements existing admin-007 FR-005/FR-005a and Changelog 1.1.7; no permission/API contract changes.

- [ ] Replace the current “shows dirty state and cancel restores” expectation with a regression that asserts `#dirtyBanner` never renders, cancel with no changes exits directly, and cancel after a matrix change opens `#dirtyModal` while preserving the edited checkbox until explicit discard confirmation.
- [ ] Run `pnpm playwright test tests/admin/role-settings.spec.ts --grep "cancel"` from `design/prototype`; expected RED because the banner is shown and `cancelEdit()` calls `doExitCancel()` directly.
- [ ] Commit the RED test as `test: cover role settings discard confirmation` with required English body bullets.
- [ ] Remove the dirty-banner markup and its rendering dependency; make `setDirty()` state-only; branch `cancelEdit()` to `showDirtyModal()` only when `isDirty`, otherwise exit; preserve `confirmDiscardChanges()` as the sole dirty discard path.
- [ ] Run the same grep command, then `pnpm playwright test tests/admin/role-settings.spec.ts` and `pnpm typecheck`; expected GREEN.
- [ ] Commit as `fix: confirm discarded role permission changes` with required English body bullets.

### Task 5: Dashboard Membership-State Regression (PR B3, depends on T2)

**Roles:** RED test implementer `senior-qa`; GREEN implementers `senior-frontend` one file at a time; reviewers `senior-code-reviewer`, `senior-uiux`, and `senior-i18n` for the page-local dictionary.

**Files:** Test: `design/prototype/tests/dashboard/dashboard-behavior.spec.ts`. Modify individually: `design/prototype/pages/dashboard/dashboard.html`, `design/prototype/pages/dashboard/dashboard.js`, `design/prototype/pages/dashboard/dashboard.i18n.js`, `design/prototype/pages/dashboard/dashboard.layout.css` (4 non-test files).

**Interfaces:** Implements existing dashboard-012 FR-018/FR-019 and SC-017/SC-018. Prototype state selection may use `?membership_state=loading|error|ready` solely as a design-state trigger; it is not an API contract.

- [ ] Add failing tests asserting `membership_state=loading` shows structural metric/list skeletons, hides all role views, and disables scenario controls; `membership_state=error` removes skeletons, shows localized error plus retry, does not navigate/login-clear, and retry returns to loading then ready in the static simulation.
- [ ] From `design/prototype`, run `pnpm playwright test tests/dashboard/dashboard-behavior.spec.ts --grep "membership state"`; expected RED because no skeleton/error/retry DOM exists.
- [ ] Commit the RED test as `test: cover dashboard membership request states` with required English body bullets.
- [ ] Add semantic loading/error containers and stable testids in `dashboard.html`; add token-based skeleton/error layout in `dashboard.layout.css`; add zh/en error and retry strings in `dashboard.i18n.js`; implement the minimal state renderer/retry transition in `dashboard.js` without changing role fixtures or routing.
- [ ] Run the grep command, then all `tests/dashboard/*.spec.ts` and `pnpm typecheck`; expected GREEN.
- [ ] Commit as `fix: expose dashboard membership loading failures` with required English body bullets.

### Task 6: Task/Annotation Traceability Batch (PR T3, after T2)

**Roles:** Implementer `senior-technical-writer`; reviewers `evidence-auditor` and `senior-security`; Team Lead owns `specs/STATUS.md`.

**Files:** Modify individually: `specs/task-management/010-task-list/spec.md`, `specs/task-management/013-task-new/spec.md`, `specs/task-management/014-task-detail/spec.md`, `specs/annotation/015-annotation-workspace/spec.md`; coverage fix in `design/prototype/tests/task-management/task-detail-tabs-partials.spec.ts`; serial shared update `specs/STATUS.md`.

**Interfaces:** Produces versions 2.0.3, 6.9.2, 2.10.1, 4.10.1 and preserves config-driven/data-fairness authority.

- [ ] Give each spec its complete shell/page/shared-asset/partial/design/test rows, PATCH bump, and newest-first Issue #261 Changelog in one-file subtasks.
- [ ] In `task-detail-tabs-partials.spec.ts`, rename “all four” to “all five”, assert `#annotationResultsPanel` is mounted exactly once, switch through `#tabAnnotationResults`, and assert visibility/hiding. This is test-only coverage of already-working behavior, so record the first run as baseline GREEN rather than fabricating RED.
- [ ] From `design/prototype`, run `pnpm playwright test tests/task-management/task-detail-tabs-partials.spec.ts`; expected GREEN with five partials. Then run `pnpm playwright test tests/task-management/task-list-output-types.spec.ts tests/task-management/task-list-run-materialization.spec.ts tests/task-management/task-new-output-types-overview.spec.ts tests/task-management/task-new-step2-preview.spec.ts tests/task-management/task-new-create-redirect.spec.ts tests/annotation/annotation-list-routing.spec.ts tests/annotation/annotation-workspace-common.spec.ts tests/annotation/annotation-workspace-data-fairness.spec.ts` and `pnpm typecheck`.
- [ ] Commit the coverage-only change separately as `test: cover all task detail tab partials`; include it in T3 because it directly verifies that traceability contract.
- [ ] Team Lead updates the four matching STATUS versions; reviewer confirms 015 rows do not expose gold/answer fixtures as authoritative inputs.
- [ ] Run Task 10 gates and commit as `docs: trace task and annotation prototype ownership` with required English body bullets.

### Task 7: Dataset/Shared Traceability Batch (PR T4, after T3)

**Roles:** Implementer `senior-technical-writer`; reviewers `evidence-auditor` and `senior-security`; Team Lead owns `specs/STATUS.md`.

**Files:** Modify individually: `specs/dataset/016-dataset-analysis-list/spec.md`, `specs/dataset/017-dataset-analysis-detail/spec.md`, `specs/shared/008-sidebar-navbar-shared/spec.md`; serial shared update `specs/STATUS.md`.

**Interfaces:** Produces versions 2.1.1, 2.1.1, 1.4.2. Keeps foundation N/A and shared-018 v1.1.1 Deferred unchanged.

- [ ] Give each spec its complete table/version/Changelog in one-file subtasks. In 016 correct the stale baseline to `pass=5, pending=3, fail=2, not_started=1, not_applicable=2`; explain that the sum remains 13 and fixtures are not a whitelist.
- [ ] Treat 016 as a spec clarification: from `design/prototype`, run `pnpm playwright test tests/dataset/dataset-analysis-list-filters-pagination.spec.ts --grep "IAA"` as baseline GREEN, because the existing fixture/test already implements the `not_applicable` contract; do not mutate safe fixture data to preserve obsolete counts.
- [ ] List every 017 partial exact path, not a wildcard. For shared-008, state that `sidebar.js/css` own shared behavior and consumer pages only mount it.
- [ ] Team Lead updates only the three matching STATUS versions and verifies foundation/shared-018 rows remain unchanged.
- [ ] Run Task 10 gates and commit as `docs: trace dataset and shared prototype assets` with required English body bullets.

### Task 8: Dataset Invalid-Task Regression (PR B4, depends on T4)

**Roles:** RED test implementer `senior-qa`; GREEN page implementer `senior-frontend`; reviewers `senior-code-reviewer` and `senior-security`.

**Files:** Test: `design/prototype/tests/dataset/dataset-analysis-detail-registry-mirror.spec.ts`. Modify individually: `design/prototype/pages/dataset/dataset-analysis-detail.html`, `design/prototype/pages/dataset/dataset-analysis-list.js`, `design/prototype/pages/dataset/dataset-analysis-list.i18n.js` (3 non-test files).

**Interfaces:** Implements dataset-017 AC/FR-002/SC navigation contract; membership denial remains a simulated prototype concern, not a new API.

- [ ] Replace the unknown-ID fallback test with a regression that waits for navigation to `/pages/dataset/dataset-analysis-list.html?error=invalid_task`, asserts the response status is 200, and verifies the existing `#toast` displays the localized invalid-task error and `toast-error` variant without auto-dismiss.
- [ ] From `design/prototype`, run `pnpm playwright test tests/dataset/dataset-analysis-detail-registry-mirror.spec.ts --grep "unknown id"`; expected RED because `applyRouteTask()` substitutes `DEFAULT_TASK_ID`.
- [ ] Commit the RED test as `test: cover invalid dataset analysis routes` with required English body bullets.
- [ ] Change `applyRouteTask()` so an absent/unknown ID redirects to `dataset-analysis-list.html?error=invalid_task` and returns without reading `taskMeta.outputs`; retain default tab behavior only for a valid task. Add `invalidTask` zh/en text to `dataset-analysis-list.i18n.js`; in `dataset-analysis-list.js`, consume that one known error query after language initialization, show the existing error toast, and remove only `error` from the normalized URL while preserving supported filters.
- [ ] Run the grep command, the entire registry-mirror suite, `tests/dataset/dataset-analysis-detail-panel-behavior.spec.ts`, and `pnpm typecheck`; expected GREEN.
- [ ] Commit as `fix: reject unknown dataset analysis task routes` with required English body bullets.

### Task 9: Exact-Path-First Proto-Sync (PR C1, after T4)

**Roles:** Implementer `senior-architect`; reviewers `senior-code-reviewer` and `evidence-auditor`.

**Files:** Modify only `.claude/commands/proto-sync.md`.

**Interfaces:** Consumes the standardized tables. Produces a deterministic prototype-to-spec discovery contract; it does not edit specs without the existing user confirmation gate.

- [ ] Rewrite Step 2 to normalize every changed `design/prototype/pages/**` path and first scan all active spec `## Prototype Traceability` Artifact cells for an exact repository-relative path. Return every exact owner (one-to-many is valid: `login.html` maps to 001 and 002).
- [ ] Define multi-page ownership (`forgot-password.html` and `reset-password.html` → 004; annotation list/workspace → 015), page-owned sidecars (`dashboard.*`, `task-list.*`, `task-config.*`), shared assets (`shared/sidebar.js` and `.css` → 008), and exact parent handling for `.panels/`/`.partials/` only after direct table matching.
- [ ] Retain suffix discovery solely as a unique fallback. Zero matches must stop with `ERROR: no owning spec for <path>`; multiple fallback matches must stop with `ERROR: ambiguous owning specs for <path>: <list>`. Never “report and skip”. Deferred/N/A entries are not eligible active owners.
- [ ] Remove “one prototype = one spec update”; group changed files by all resolved owners, read each full owner spec once, and report the mapping before comparison. If spec and prototype conflict on observable behavior, report drift and request a source decision; never auto-select or overwrite either side.
- [ ] Add a worked mapping matrix covering `login.html → 001+002`, forgot/reset → 004, `profile.html → 005`, annotation list/workspace → 015, task-detail panels → 014, dataset detail partials → 017, and sidebar JS/CSS → 008.
- [ ] Run `git diff --check -- .claude/commands/proto-sync.md` and manually walk each worked example against the traceability tables. Commit as `docs: resolve prototype owners by exact trace paths` with required English body bullets.

### Task 10: Final Audit and Manual Speckit Analyze (verification-only, after all stacked PRs)

**Roles:** Evaluator `evidence-auditor`; reviewers `senior-code-reviewer` and `senior-security`; Team Lead records results. No files are modified unless a finding is assigned back to its owning task.

**Files:** Verify all files changed by Tasks 1–9; create no new artifact.

**Interfaces:** Produces merge-gate evidence for Issue #261.

- [ ] From repository root run `./scripts/check-spec-artifacts.sh`; expected `Spec artifact check passed`.
- [ ] From `design/prototype` run `pnpm typecheck` and `pnpm playwright test`; expected all GREEN. For RED evidence, preserve the exact failing output from Tasks 2, 4, 5, and 8 before their implementation commits.
- [ ] Validate relative Markdown links with:

```bash
ruby -e 'ARGV.each { |f| File.read(f).scan(/\[[^\]]+\]\(([^)#]+)(?:#[^)]+)?\)/).flatten.each { |p| next if p =~ %r{^(https?://|mailto:)}; target = File.expand_path(p, File.dirname(f)); abort("BROKEN #{f}: #{p}") unless File.exist?(target) } }' $(git diff --name-only --diff-filter=ACMR origin/main...HEAD -- 'specs/**/*.md' 'docs/**/*.md')
```

- [ ] Run `git diff --check origin/main...HEAD` and enforce PR size per branch with:

```bash
git diff --numstat origin/main...HEAD | awk '$3 !~ /^design\/prototype\/tests\// { files[$3]=1; lines += $1 + $2 } END { print "non-test files=" length(files) ", non-test lines=" lines; exit(length(files)>5 || lines>300) }'
```

- [ ] Run stale scans: `rg -n 'profile\.pen|all four tab panels|falls back to the default task|id="dirtyBanner"|pass = 6.*not_started = 2' specs design/prototype .claude/commands`; expected no active broken/drift statement (historical Changelog prose may remain only when clearly marked historical). Run `rg -n '^版本: (1\.2\.4|1\.2\.3|1\.2\.7|1\.1\.4|1\.2\.10|1\.0\.9|1\.1\.12|1\.4\.2|2\.0\.3|2\.0\.4|6\.9\.2|2\.10\.1|4\.10\.1|2\.1\.1)$'` against the 15 exact spec paths and compare all 15 to `specs/STATUS.md`.
- [ ] Audit the 17-spec inventory: 15 active UI specs have the exact five-column table; foundation-000 is N/A and unchanged; shared-018 is Deferred, v1.1.1, and still states that no Help prototype exists.
- [ ] The literal `/speckit.analyze` command cannot run cleanly here because this cross-spec docs branch has no single feature `plan.md`/`tasks.md` and `.claude/commands/speckit.analyze.md` requires both. Perform the closest manual equivalent: compare Issue #261 → every table row/version/Changelog/STATUS row → every changed test and prototype; validate main/frontend/testing constitutions; check downstream dependencies for each bumped spec; record zero Critical/High/Medium/Low findings before PR creation. Do not fabricate slash-command success.
- [ ] Run `git status --short` and confirm no generated Playwright reports, debug `console.log`, or unrelated files are included.

## PR and Branch Sequence

The work cannot fit one branch/PR without violating the 5-file/300-line rule and the one-purpose rule. Use stacked or serial branches in this order; after each merge, rebase the next branch because every traceability PR edits `specs/STATUS.md`.

| Order | Branch suggestion | Purpose | Non-test files | Dependency |
|---|---|---|---:|---|
| 1 | `docs/261-account-traceability` | Account 001–004 traceability | 5 (4 specs + STATUS) | none |
| 2 | `fix/261-account-loading-lock` | Account-004 loading lock | 2 | T1 |
| 3 | `docs/261-profile-admin-dashboard-traceability` | 005/006/007/012 traceability | 5 (4 specs + STATUS) | T1 |
| 4 | `fix/261-role-settings-cancel` | Admin-007 cancel behavior | 1 | T2 |
| 5 | `fix/261-dashboard-membership-states` | Dashboard-012 loading/error states | 4 | T2 |
| 6 | `docs/261-task-annotation-traceability` | 010/013/014/015 traceability and fifth-partial coverage | 5 (4 specs + STATUS) | T2 |
| 7 | `docs/261-dataset-shared-traceability` | 016/017/008 traceability and fixture clarification | 4 (3 specs + STATUS) | T3 |
| 8 | `fix/261-dataset-invalid-task-route` | Dataset-017 invalid route and list error signal | 3 | T4 |
| 9 | `docs/261-proto-sync-resolution` | Exact-path-first proto-sync rules | 1 | T4 |

Tests are excluded from counts, but each RED test commit must precede its GREEN implementation commit on the same behavior branch. The plan document itself is a planning artifact and should not be bundled into any implementation PR above.
