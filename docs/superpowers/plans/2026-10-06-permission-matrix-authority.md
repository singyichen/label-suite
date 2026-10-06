# Permission Matrix Authorization Authority Implementation Plan

> **For agentic workers:** Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` task by task. The main session owns Red/Green evidence, reviews and `tasks.md` checkboxes.

**Goal:** Resolve issue #1160 D-9 through D-13 as a traceable authorization planning contract, then align the two candidate matrix tables and NoteCraft Wiki/Diagram. Preserve the issue's boundary: no ORM, migration, API or runtime authorization work in this PR.

**Architecture:** Current identity and active session checks precede current system/task role and the matching matrix cell. A true cell is necessary but still subject to task ownership, role, assignment and answer-isolation conditions. A missing key or cell denies. The V1 matrix grows from 39 to 42 applicable rows when `task.detail.edit` is added. Fixed admin/dashboard cells have narrowly specified exceptions to D-12's default-false rule.

**Tech stack:** Canonical Markdown specs and Accepted ADR, OpenSpec change/delta/archive, Node `node:test` source checks, NoteCraft `er-diagram-renderer` JSON Schema.

**Design:** [2026-10-06-permission-matrix-authority-design.md](../specs/2026-10-06-permission-matrix-authority-design.md)

## Global constraints

- Read the main, backend and testing constitutions and relevant owning specs before edits. Do not edit protected project rule files.
- Work on a feature branch; no commits to `main`. Commit English subjects with required bold action bullets; GitHub PR and issue text are Traditional Chinese.
- Keep the existing D-4 `audit_events` contract and its six confirmed candidate FK fields intact. Do not fabricate task membership tables, task FKs, runtime guards, endpoints or physical migrations.
- Security constraints are part of the contract: test-set answers and peer annotations remain isolated; JWT `role` is display-only; frontend route state never grants a role; all protected commands require server-side checks.
- A `42` row count describes the V1 seed for the currently enumerated keys. It is not the count of ER tables or columns and does not silently add a `task.delete` key.

## Task 1: OpenSpec proposal and canonical authority

**Files:** `openspec/changes/permission-matrix-authority/{proposal.md,design.md,tasks.md,specs/**}`; new `docs/adr/037-permission-matrix-authorization.md` (or next available ADR number); `docs/adr/021-jwt-refresh-token-auth.md`; `specs/admin/007-role-settings/spec.md`.

- [ ] **Step 1:** Open an OpenSpec change linked to #1160, with proposal goal, affected canonical specs, design, one owner per task, and deltas mirroring each canonical path. Run `openspec validate permission-matrix-authority --type change` before dependent edits.
- [ ] **Step 2:** Accept one authorization ADR defining current-identity -> hard system/task role -> current matrix cell -> resource condition evaluation, fail-closed behavior, immediate revocation, API capabilities, and audit identity `role_permission_matrix/1`. Amend ADR-021 only where its `require_role` example would otherwise be mistaken for complete matrix authorization.
- [ ] **Step 3:** Update admin-007 V1 allowlist and seed matrix with `task.detail.edit` (leader true, reviewer/annotator false), keep `allowed boolean`, document 42 applicable rows and absent `⛔` cells. State D-11 triple membership identity, task-page union versus workspace active role, D-12 new-key activation/default deny, D-13 fixed cells, unchanged CAS and audit transaction, and matching FR/SC/Changelog.
- [ ] **Step 4:** Resolve the D-12/FR-008a conflict explicitly: no unapproved key is active; later configurable cells start false; activation of a new `admin.*` key seeds its non-configurable `super_admin=true` and `user=false` cells only after review. Existing `dashboard.view` remains fixed true for both system roles. Reject any save or seed that violates these invariants.

## Task 2: Downstream canonical consumers and operation coverage

**Files:** `specs/admin/006-user-management/spec.md`; `specs/task-management/010-task-list/spec.md`; `specs/task-management/013-task-new/spec.md`; `specs/task-management/014-task-detail/spec.md`; `specs/annotation/015-annotation-workspace/spec.md`; any genuinely affected `specs/dashboard/012-dashboard/spec.md` or `specs/foundation/000-foundation/spec.md` clause; corresponding OpenSpec deltas.

- [ ] **Step 1:** Preserve admin-006/007's `super_admin`-only hard boundary and make current applicable matrix permission an additional server-side condition. No `user` cell may elevate a caller into an admin route.
- [ ] **Step 2:** Map task-new `task.create`, task-list `task.list.view`, task-detail `task.detail.view`/`task.detail.edit`/`task.members.manage` and dataset export to their authorized operations with resource checks. Record any action lacking a V1 key, especially task deletion, as a separate future key activation before runtime; do not alias it to an unrelated key or falsely claim the 42-row seed covers it.
- [ ] **Step 3:** Change task-detail FR-005d to exclude only an already-held role; specify `(task_id,user_id,task_role)` logical uniqueness and role-specific status/removal. Retain the stable reviewer user ID roster and task/run/round rules. Annotation-015 must bind workspace writes to the selected active task role and authenticated membership, and must not trust route role/identity parameters.
- [ ] **Step 4:** Review dashboard-012's fixed `dashboard.view` and per-task membership visibility, plus foundation F-04/F-15. Edit them only if their canonical text conflicts. Update affected versions, dependencies, changelogs, FR/SC/AC scenarios; mirror each changed clause exactly in OpenSpec deltas.
- [ ] **Step 5:** Run Project SDD lint (`bash scripts/check-sdd.sh`) and OpenSpec schema validation; investigate only new errors, and keep the canonical-versus-derived citation map for archive.

## Task 3: Independent Red test and Green source projection

**Files:** `scripts/tests/check-database-schema.test.mjs` and, only if required to compare actual sources, `scripts/check-database-schema.mjs`; `docs/diagrams/architecture/account-admin-db-schema.md`; `docs/diagrams/architecture/database-schema.er.json`; `docs/diagrams/architecture/database-table-inventory.md`; `docs/diagrams/README.md`.

- [ ] **Step 1 — Red (`senior-qa`):** Add a cross-source test that derives applicable V1 key/role cells from admin-007 and fails while the dictionary still says 39 and D-9 conditional. Assert separate boolean view/edit, 42 applicable cells, fixed-cell and `⛔` semantics, retained two matrix tables, unchanged 9 tables/63 columns/6 FKs, and no invented task FK. Run it against pre-Green sources, record the expected failure, and commit the Red test alone.
- [ ] **Step 2 — Green:** Update the physical dictionary's matrix purpose, 42-row seed, non-null composite PK and `allowed boolean`, fixed-cell CHECK candidates, missing-cell denial, D-11 logical boundary and query/index mapping. Remove D-9 through D-13 from undecided rows only after their canonical clauses are complete. Preserve undeployed/candidate labels.
- [ ] **Step 3:** Synchronize NoteCraft descriptions and inventory status with the canonical decision; do not add renderer fields or hand-drawn edges that the source checker cannot derive. Update only truly changed summary text in diagram README. The table/column/FK counts remain 9/63/6.
- [ ] **Step 4:** Run the source checker tests and `node scripts/check-database-schema.mjs`; verify the Red assertions are now Green without weakening them. Validate the `er-diagram-renderer` JSON Schema.

## Task 4: Four gates, review and visual verification

- [ ] **Gate 1 — OpenSpec schema:** Validate the change and each affected derived spec with `openspec validate ... --type change/spec` at their stages.
- [ ] **Gate 2 — Project SDD lint:** Run `bash scripts/check-sdd.sh` after canonical/delta edits and after archive; zero new errors. Confirm goal, ownership, branch/status, FR/SC IDs and retired-path rules.
- [ ] **Gate 3 — code/test:** Preserve senior-qa's committed Red evidence, run the source-projection tests, schema checker, plugin JSON Schema, `bash scripts/inventory-tests.sh`, and `git diff --check`. Run any other affected verification required by a changed executable checker.
- [ ] **Gate 4 — Source-Verify and write-back/archive:** Before archive, compare each changed FR/SC/AC and referenced ADR/canonical path against source, including version and Changelog. Archive the final OpenSpec change. Then inspect archived delta and generated `openspec/specs/**` views for exact canonical IDs/text and `rg` every canonical citation to prove it is locatable; record the result in the PR Test Plan. Update `specs/STATUS.md` according to the actual post-archive stage.
- [ ] **Visual QA:** Build NoteCraft and open the actual Wiki and Diagram. Confirm both matrix tables are searchable and focusable, all fields and badges match the dictionary, the description says candidate/undeployed, and no extra FK line appears. Confirm 9/63/6 counts and the user-facing 42-cell seed explanation.
- [ ] **Review:** Have senior-dba inspect physical constraints/defaults, senior-code-reviewer inspect source/projection alignment, and senior-security inspect authorization, active role and fail-closed denial paths. Resolve blocking findings and re-run affected gates; record useful non-blocking follow-ups separately.

## Task 5: PR, CI, merge and issue follow-through

- [ ] Push the feature branch and open a Traditional Chinese PR linked to issue #1160. Include design decisions, Red/Green evidence, all four gate results, NoteCraft visual result and explicit planning-only scope.
- [ ] Wait for all applicable required CI jobs to succeed. If a job fails, diagnose and fix the cause, push the fix, and wait for the new head's CI; merge only after the checked head is green, as the user authorized.
- [ ] Verify the merge commit on `main`, update #1160 checkboxes only for completed D-9–D-13 planning, canonical write-back and candidate projection. Keep runtime migration/API, task-delete key activation, task FK, dataset/task/annotation inventories and full five-principle physical verification open until independently proven.

## Evidence ledger

| Stage | Evidence to record |
|---|---|
| Baseline | Branch/head, 9/63/6 checker result, existing lint warnings and test count |
| Red | senior-qa test commit, command, exact expected assertion failures, existing tests still green |
| Green | checker/tests command and count, 42 applicable V1 cells, plugin schema result |
| SDD | OpenSpec change/spec validation; Project SDD lint; canonical/archive/derived citation map |
| Visual | NoteCraft build result, local URL, Wiki and Diagram observations |
| Review/CI | DBA/code/security findings, required CI job statuses on final head, PR merge commit |
