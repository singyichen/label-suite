# Annotation／Review Physical Dictionary Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Resolve current annotation/review identity and vote rules in canonical specs, then publish only verified candidate tables in NoteCraft Wiki／Diagram for issue #1160.

**Architecture:** The owning 014／015 specs define behavior; the six-column physical dictionary derives table columns and constraints; `database-schema.er.json` projects only dictionary-backed single-column FKs. `ReviewUnit`, `DisputeItem`, and `ReviewAssignment` remain derived. No ORM, migration, API, or deployed schema is created.

**Tech Stack:** Markdown canonical specs, OpenSpec 1.10.0 change/delta, Node `node:test` schema checker, NoteCraft `er-diagram-renderer` JSON, GitHub CI.

**Spec:** [Senior-DBA annotation/review design](../specs/2026-10-07-annotation-review-physical-design.md).

## Global Constraints

- Follow AGENTS.md, main/backend/testing constitutions, and `docs/sdd-workflow.md` four gates; use a `feat/` branch and TDD Red before Green.
- New table names use singular module prefix; all eight tables remain undeployed candidates. No migration, API, or runtime authorization change in this issue.
- The physical `run_id × assignment_id` chain refers to `task_annotation_assignment`; never use display sample ID, round label, or route parameters as a unique key.
- No FK, column, or ER edge may expose `dataset_item_private`, hidden answers, or a fabricated derived table.
- Preserve FR-052 span identity `(start,end,label)` and type/config-driven answer payloads; do not hardcode output-type tables.

## Review Focus

- A span with the same display text at another offset must not collide in a dispute key.
- Reviewer modification concurrent with the first arbitration vote must have a deterministic winning transaction and never leave a stale effective vote.
- Reassignment must not reveal the prior annotator's unsent draft to the new assignee.
- Historical review revisions and dispute resolutions must remain traceable without claiming an executable migration.
- Source checker must reject fake or missing FK edges and stale summary counts.

## Tasks

### 1. Canonical amendment and OpenSpec proposal

- [ ] Create an OpenSpec change with Traditional Chinese proposal, design, delta, and tasks for 014／015 source amendments. Explicitly cite current FR-024A/052, FR-059(4), FR-061(7)(a), FR-103, FR-095, and 014 assignment rules. Validate OpenSpec structure and Project SDD lint before application.
- [ ] Add Red source tests that fail on live `OutputAnswer` token shape, FR-059/061 token-position language, and missing V1 freeze/single-vote/reassignment clauses. Record failures without weakening unrelated tests.
- [ ] Update current 014／015 FR/AC/SC, version and Changelog, plus OpenSpec delta so the DBA V1 write rules become canonical. Keep historical struck-through text intact. Re-run source tests and SDD lint.
- [ ] Archive/write back the change, verify every canonical citation in derived `openspec/specs` can be located, and update applicable `specs/STATUS.md` state. Do not claim an API or database implementation.

### 2. Physical dictionary and Red projection contract

- [ ] Senior-DBA writes `docs/diagrams/architecture/annotation-review-db-schema.md`: eight candidate tables from the design, Mermaid §2, six-column §3 dictionary, composite FK/UNIQUE/CHECK §4, indexes and query paths, SQLite/PostgreSQL variants, lifecycle/privacy, and each remaining migration caveat. `annotation_review_submission_revision` retains immutable review versions.
- [ ] Senior-QA owns a new `scripts/tests/check-database-annotation-review.test.mjs` Red commit. Assert eight exact table names, PKs, no `ReviewAssignment`/`ReviewUnit`/`DisputeItem`/`GoldRecord`, no private answer column or FK, dictionary↔ER field agreement, fake/missing Mermaid FK edge rejection, stale summary rejection, and CI inclusion. Record expected failure.

### 3. NoteCraft projection and CI Green

- [ ] Extend `scripts/check-database-schema.mjs` with `parseAnnotationReviewSchema(markdown)` using task/run strict edge validation, add the source to CLI merge, and compare NoteCraft metadata/inventory counts to computed totals.
- [ ] Add an annotation/review group and eight dictionary-backed tables to `docs/diagrams/architecture/database-schema.er.json`; project types, required status, PK/FK, source, candidate/undeployed descriptions. Draw only true single-column FK links.
- [ ] Update `database-table-inventory.md` and related source summaries with new counts and unresolved migration decisions. Add the new test to the `database-schema` CI job.
- [ ] Run all schema Node tests, source check, OpenSpec validation, Project SDD lint, NoteCraft build/plugin validation, and `git diff --check`; open the actual Wiki/Diagram to verify group, fields, search/focus, and parent/child links. Fix only concrete failures.

### 4. Review, PR, and issue bookkeeping

- [ ] Obtain code/security/DBA review for the slice; document any outstanding product decision and keep unsupported tables out of the ER data.
- [ ] Create a Traditional Chinese PR, verify all CI jobs, merge under the user's existing authorization, then update issue #1160: check only verified annotation/review work, leave quality/export/worklog and migration decisions pending.

## Status

Design committed at `9b5c4584`; no canonical rule or annotation/review table has been changed yet. The user previously authorized direct execution and senior-DBA resolution without repeated approval questions. Implementation will continue after this plan's self-review.
