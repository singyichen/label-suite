# Shared User-Action Audit Events Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Resolve issue #1160 D-4 in the accepted architecture and canonical account/admin requirements, then synchronize the candidate dictionary and NoteCraft Wiki/Diagram.

**Architecture:** ADR-032 becomes the shared event canon with an explicit `audit_events` naming exception in foundation FR-105. Human and system actor rows have an enforceable nullability split. The candidate projection gains a nullable UUID task scope without a task FK; all views remain marked undeployed.

**Tech Stack:** Markdown canonical specs and ADRs, OpenSpec delta/archive, Node `node:test` source checker, NoteCraft `er-diagram-renderer` JSON Schema.

**Spec:** [2026-10-06-shared-audit-events-design.md](../specs/2026-10-06-shared-audit-events-design.md)

## Global Constraints

- Follow the main, backend and testing constitutions; do not edit protected project rule files.
- No ORM, migration, API, runtime service, or deployed-schema claim in this slice.
- New task types remain registry-driven; audit summaries never contain credentials, tokens, raw annotation answers or hidden gold answers.
- Commit subjects and bodies are English with bold action bullets. GitHub PR and issue updates are Traditional Chinese.
- The only physical FK added to the renamed audit candidate is the existing actor-to-users FK; `task_id` and polymorphic target remain without FK until their target identity is ratified.

## Review Focus

1. A system-generated event must not require a login-capable synthetic user; the candidate CHECK makes null actor equivalent to the system role.
2. A human event must not silently lose actor referential integrity; its non-null FK remains `RESTRICT`.
3. `task_id` UUID is a candidate scope key, not a fabricated FK to an unratified task table.
4. The shared audit summary must not become a second answer-history surface; keep annotation snapshots in their role-filtered domain history.
5. One-year retention must not imply a silent delete path; normal writes remain insert-only and cleanup needs a separate reviewed policy.

## Tasks

### Task 1: OpenSpec change and canonical decision

**Files:** `openspec/changes/shared-audit-events/{proposal.md,design.md,tasks.md,specs/...}`; `docs/adr/032-user-action-audit-trail.md`; `specs/foundation/000-foundation/spec.md`; `specs/admin/006-user-management/spec.md`; `specs/admin/007-role-settings/spec.md`.

- [x] **Step 1:** Create proposal, design and one-file-per-task OpenSpec deltas referencing issue #1160 and the design above; run `openspec validate shared-audit-events --type change` until schema validation passes.
- [x] **Step 2:** Amend ADR-032 and mark Accepted: exact name and ten logical fields, actor split, one-year minimum/no automatic delete, system events, action catalog and boundaries.
- [x] **Step 3:** Add exactly `audit_events` as an FR-105 naming exception; update the relevant foundation scenario, version and Changelog.
- [x] **Step 4:** Map admin-006 FR-013 and `UserManagementAuditLog` to shared events, including target filtering and redacted diff; update version/Changelog without changing the user-facing drawer.
- [x] **Step 5:** Map admin-007 FR-010 to the same event surface, preserving the one-year drawer contract and D-9 condition; update version/Changelog.
- [x] **Step 6:** Run `bash scripts/check-sdd.sh` and confirm zero errors before downstream projection work.

### Task 2: Red source-projection test

**File:** `scripts/tests/check-database-schema.test.mjs`.

- [x] **Step 1:** Have `senior-qa` add one test of the real dictionary and ER JSON: `audit_events` exists, old `audit_event` is absent, ten fields include nullable UUID `task_id` with no `fk`, nullable actor retains `users.id` FK, and derived counts are 9/63/6.
- [x] **Step 2:** Run `node --test scripts/tests/check-database-schema.test.mjs`; record the expected failure from the still-old dictionary and JSON. Commit only the Red test before Step 3 begins.

### Task 3: Candidate field dictionary and NoteCraft projection

**Files:** `docs/diagrams/architecture/account-admin-db-schema.md`; `docs/diagrams/architecture/database-schema.er.json`; `docs/diagrams/architecture/database-table-inventory.md`; `docs/diagrams/README.md`.

- [x] **Step 1:** Rename the Mermaid and dictionary candidate to `audit_events`; add nullable UUID `task_id`, actor nullability/CHECK, one-year rule, action redaction, target/task FK exceptions and query-to-index mapping. Keep all other table fields stable.
- [x] **Step 2:** Update the `.er.json` table, ten fields, descriptions, confirmed actor FK only and 9/63/6 computed summary. Do not add hand-written edges or unsupported renderer fields.
- [x] **Step 3:** Update the inventory and diagram-tool README counts/status and D-4 text after the source dictionary is stable.
- [x] **Step 4:** Run `node --test scripts/tests/check-database-schema.test.mjs` and `node scripts/check-database-schema.mjs`; expect all tests pass and 9 tables, 63 columns, 6 FK fields.

### Task 4: Archive, source verification, NoteCraft and PR

**Files:** archived OpenSpec change, generated `openspec/specs/` views, `specs/STATUS.md`, plan evidence section.

- [x] **Step 1:** Validate OpenSpec change and Project SDD lint; archive only after canonical FR/SC text and IDs are stable.
- [x] **Step 2:** Validate each affected derived spec; compare every changed FR/SC citation in archive and derived views against its canonical source, then run the post-archive citation location check.
- [x] **Step 3:** Validate plugin JSON Schema, build NoteCraft, and inspect actual Wiki and Diagram for 9/63/6, table/field labels, actor line and absent task line.
- [x] **Step 4:** Run `bash scripts/inventory-tests.sh`, source checker tests, `git diff --check`, and a narrow senior-dba/code/security review; fix blocking findings and re-run affected gates.
- [ ] **Step 5:** Push a feature branch, open a Traditional Chinese PR linked to #1160, wait for all required CI jobs, and merge when green as authorized. Mark only the verified D-4 planning outcome in issue #1160; keep task FK, D-9 and cross-module field work open.

## Verification evidence

Red: senior-qa commit `2613e6dd`；9 項既有測試通過、2 項新測試因舊 `audit_event` 與缺 `task_id` 預期失敗。Green: 11/11 來源測試通過；`node scripts/check-database-schema.mjs` 為 9 tables／63 columns／6 FKs；plugin JSON Schema 驗證通過。OpenSpec change 與三份 derived spec 驗證通過；Project SDD lint 0 error／9 個既有 warning；canonical/archive/derived 六條 FR／SC 逐字一致。NoteCraft build 產生 `/view/diagrams/architecture/database-schema.er`；4327 本機 Wiki 實見 `audit_events` 10 欄、可空 actor FK、無 task FK，Diagram 實見唯一 users 線。`bash scripts/inventory-tests.sh` 全通過；`git diff --check` 通過。senior-dba、code、security review 均無 blocking finding，其非阻擋漂移與安全契約已在本分支修正。PR／CI／merge 證據待完成後追加。
