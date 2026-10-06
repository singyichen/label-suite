# Dataset Lineage NoteCraft Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a source-backed dataset lineage and hidden-answer physical candidate to the database inventory and NoteCraft Wiki/Diagram for issue #1160.

**Architecture:** The canonical dataset ingestion/version spec defines behavior; the physical dictionary describes five candidate tables and explicitly unresolved downstream links. A Node source checker compares that dictionary with the `.er.json` projection. The existing account/admin projection is preserved, and no runtime schema is created.

**Tech Stack:** Markdown, OpenSpec CLI, Node 20 `node:test`, NoteCraft `er-diagram-renderer` 1.7.0, SQLite/PostgreSQL design mapping.

**Spec:** [Dataset design](../specs/2026-10-06-dataset-lineage-design.md), `specs/dataset/021-dataset-ingestion-and-lineage/spec.md`, issue #1160.

## Global Constraints

- Main, backend, and testing constitutions outrank this plan. Stored hidden answers are readable only inside authorized scoring-worker paths; creator raw preview occurs before ingestion.
- Foundation FR-105 singular module-prefixed names: `dataset`, `dataset_version`, `dataset_import_batch`, `dataset_item`, `dataset_item_private`.
- All five tables remain candidate and undeployed. Do not create migrations, ORM models, API contracts, or unconfirmed task/run/annotation FKs.
- Each executable behavior change has an independent senior-qa Red test commit before Green. Main session verifies Red and Green evidence and alone marks checkboxes.
- The approved execution method is the current multi-agent session. The user authorized finishing #1160 without repeat confirmation and delegated DB design choices to `senior-dba`.

## Review Focus

1. A source field is omitted from protected-field classification: the canonical contract must leave the version in draft; check the matching FR/SC and dictionary note.
2. A hidden answer is copied into `dataset_item.public_payload` or NoteCraft sample content: reject in source review and keep only schema descriptions in the projection.
3. An item is linked to a version different from its batch: derive the version through `dataset_import_batch_id` and test the explicit FK chain.
4. A same-dataset parent becomes a cross-dataset parent: document the composite FK and ensure the checker sees the relation as a documented constraint without drawing a misleading second edge.
5. A JSON column or candidate FK diverges between the physical dictionary and `.er.json`: the source checker must fail on type, nullability, PK, and FK drift.

---

### Task 1: Canonical dataset contract and design decisions

**Files:** Create `specs/dataset/021-dataset-ingestion-and-lineage/spec.md`; update affected 013/014 sections only where their current contract conflicts; update `specs/STATUS.md`; create an Accepted ADR only for cross-module physical/privacy decisions that the feature spec cannot own.

**Interfaces:** The canonical spec owns FR/AC/SC for field classification, draft/sealed version, multi-file batch, item lineage, and private answer access. Later task/run specs consume stable `dataset_version.id` and `dataset_item.id` but this task adds no physical task/run FK.

- [ ] Read the design and relevant canonical/ADR sections, then finish the canonical spec with source citations and stable IDs.
- [ ] Run Project SDD lint (`bash scripts/check-sdd.sh`) and repair any new errors.
- [ ] Record the explicit unresolved task/run bindings in the inventory; commit canonical decisions separately from derived projection.

### Task 2: Source checker Red contract

**Files:** Modify `scripts/tests/check-database-schema.test.mjs`; optionally add a focused dataset test file. **Owner:** `senior-qa`.

**Interfaces:** Export `parseDatasetSchema(markdown)` and `mergeSchemaSources(...sources)` from `scripts/check-database-schema.mjs`; `validateErData()` remains the shared projection validator. The dataset dictionary uses the account/admin six-cell row layout and a Mermaid PK/FK declaration.

- [ ] Add tests for five tables, all columns, PK/FK/null/type, missing/extra table and column, bad FK target, source merge collisions, and candidate/undeployed descriptions.
- [ ] Run `node --test scripts/tests/check-database-schema.test.mjs` and record the expected failing assertion/import.
- [ ] Commit only the Red tests; main session verifies failure before Task 3.

### Task 3: Physical dictionary and checker Green

**Files:** Create `docs/diagrams/architecture/dataset-db-schema.md`; modify `scripts/check-database-schema.mjs` and, only if needed, its tests.

**Interfaces:** Six-cell dictionary is the source of table/column/type/null/default/description; Mermaid supplies PK; `type → parent_table` supplies one-column FK. Composite parent constraint stays in a constraints section and is not rendered as a fake pair of NoteCraft edges.

- [ ] Write the five-table dictionary with purpose, writer, lifecycle, keys, checks, indexes, sensitivity, source FR, and status per table/column.
- [ ] Extend the parser/CLI to combine account/admin and dataset dictionaries without weakening existing checks.
- [ ] Run Red tests to Green, `node scripts/check-database-schema.mjs` (expected to fail only because projection lacks five tables), and `git diff --check`; commit the dictionary/checker group.

### Task 4: NoteCraft projection and inventory

**Files:** Modify `docs/diagrams/architecture/database-schema.er.json`, `database-table-inventory.md`, `docs/diagrams/README.md` as needed.

**Interfaces:** Add a `dataset` group and five candidate tables. Each diagram `fk` comes from an explicit dictionary FK only. The meta count is computed from actual data before writing it; no raw answer value is included.

- [ ] Add dataset tables and descriptions, update source links/counts, and move the dataset gap from unresolved to candidate in the inventory while leaving task/run bindings pending.
- [ ] Run the source checker, Node tests, NoteCraft plugin build, Project SDD lint, and actual Wiki/Diagram browser inspection.
- [ ] Commit projection and inventory only after all checks pass.

### Task 5: OpenSpec, Source Verify, and delivery

**Files:** Create `openspec/changes/dataset-lineage-schema-planning/{proposal.md,design.md,tasks.md,specs/...}` then archive/write back per `docs/sdd-workflow.md`; update `specs/STATUS.md` and issue #1160 evidence.

**Interfaces:** Delta references canonical FR/SC IDs exactly; archive copies those references into derived OpenSpec views.

- [ ] Validate OpenSpec schema and Project SDD lint, then verify every changed canonical ID/version/Changelog reference after archive.
- [ ] Obtain code/QA/security review of the branch, run affected tests and NoteCraft build, and create a Traditional Chinese PR.
- [ ] Wait for required CI checks; merge the PR only after all required checks pass. Update issue #1160 checkboxes only for completed and verified scope.
