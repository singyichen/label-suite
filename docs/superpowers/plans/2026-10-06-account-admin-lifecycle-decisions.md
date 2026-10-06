# Account/Admin Lifecycle Decisions Implementation Plan

**Goal:** Resolve issue #1160 D-2, D-5, and D-7 in canonical specs and keep the account/admin candidate dictionary and NoteCraft Wiki/Diagram synchronized.

**Design:** [2026-10-06-account-admin-lifecycle-decisions-design.md](../specs/2026-10-06-account-admin-lifecycle-decisions-design.md)

**Scope:** Planning contracts only. No migration, ORM, API, or deployed database claim.

## Tasks

- [x] Create an OpenSpec change with proposal, design, deltas, and one-file tasks. Validate its schema.
- [x] Update `specs/admin/006-user-management/spec.md`: 24-hour invite, unusable invalidated links, idempotent seeder bootstrap, and success criteria. Bump the spec version and Changelog.
- [x] Update `specs/account/005-profile-settings/spec.md`: absent-row enabled defaults, no read-time writes, six-row atomic first save. Bump the spec version and Changelog.
- [x] Add and run a failing source-projection test for `account_password_token.invalidated_at` before changing the dictionary or NoteCraft data.
- [x] Update `docs/diagrams/architecture/account-admin-db-schema.md`: column, token state/unique/issue rules, notification default, bootstrap, SQLite/PG seeder and last-admin concurrency; retire D-2/D-5/D-7 rows.
- [x] Update `docs/diagrams/architecture/database-schema.er.json` and any source count/index text to match the dictionary.
- [x] Run source checker tests, source projection checker, Project SDD lint, OpenSpec validate, NoteCraft schema/build, and visual Wiki/Diagram check. Verify exact FR/SC references and archive-time write-back.
- [ ] Review the PR, wait for all required CI checks, merge when green, and mark only verified issue #1160 items complete.

## Verification evidence

- Red: `node --test scripts/tests/check-database-schema.test.mjs` returned 9 passes and 1 expected failure because the source dictionary lacked `account_password_token.invalidated_at`; Red test committed as `043805b2`.
- Green: 10 tests passed; `node scripts/check-database-schema.mjs` reported 9 candidate tables, 62 columns, 6 FKs.
- `openspec validate account-admin-lifecycle-decisions --type change` passed before archive. Archive created `2026-10-06-account-admin-lifecycle-decisions`; all three derived specs validate individually.
- `bash scripts/check-sdd.sh` returned 0 errors and 9 existing legacy warnings after archive; `bash scripts/inventory-tests.sh` passed.
- NoteCraft 1.7.0 built 110 pages; live Wiki showed `invalidated_at` in the 8-column password-token table, and expanded Diagram showed the same field and `users` relationship.
- Post-archive comparison checked all five new FR clauses for exact canonical text and all four SC IDs for scenario-heading declarations in both archived deltas and derived views.
