# Dataset lineage and hidden-answer storage: physical design candidate

> Issue #1160 dataset slice, 2026-10-06. This is a reviewable DBA design, not an accepted schema, owning feature spec, migration, API contract, or evidence that these tables exist. The worktree has no business ORM model or Alembic revision; the inventory records zero deployed business tables. No task, run, annotation, or export table is created by this design.

## Goal and authority

Define the smallest relational boundary that lets an item be traced to its import source, batch, preprocessing version, and immutable dataset version while keeping hidden test answers and split membership outside annotator-facing item data. It must work in SQLite quick start and PostgreSQL production. The authority order is the main constitution, applicable backend and testing constitutions, accepted ADRs, then canonical feature specs; this document is derived. In particular:

- Constitution III requires indistinguishable gold/test items and reproducible splits, assignment, scoring, review, and export; XIV requires per-item source, batch, and preprocessing lineage; XVI requires export version metadata.
- Backend constitution VI and ADR-005 require separate, access-controlled test answers and relational FKs. ADR-024 requires SQLite/PostgreSQL-compatible schema and migration behavior.
- Foundation FR-105 requires singular `lower_case_snake` table names and a module prefix; FR-106 requires `_at` datetime and stable `{entity}_id` FK names.
- Task-new 013 FR-002b requires raw first-record JSON preview, while FR-002c-8 prohibits automatic Output selection and FR-003g-5 calls explicit Output data annotator-visible preannotation. Task-detail 014 FR-010f locks sample IDs when Dry Run is published.

There is **no canonical dataset ingestion/version owning spec** today. Dataset-016 defines analysis list projections; dataset-017 defines statistics, quality, and export derivation. The cross-module inventory explicitly records the import/item/answer and lineage table shape as a P0 gap. The decisions below are recommended candidates for the later owning spec and physical dictionary, not a silent addition to 016 or 017.

## Approaches considered

| Approach | Result | Decision |
|---|---|---|
| A. Separate private item table plus restricted immutable source artifacts | Public rows contain only classified safe fields; split and hidden answers have a 1:1 private row. Normal FKs preserve lineage; the creator previews the selected local upload before ingestion. | **Choose.** It directly satisfies ADR-005's separate answer table and gives both database tiers the same logical boundary. |
| B. One item row with visible and hidden keys mixed in JSON | Fewer tables and easy raw preview, but ordinary item queries, serializers, logs, or cache entries can carry hidden keys. | Reject: a field-name blocklist or caller discipline cannot satisfy the fairness and allowlist requirements. |
| C. Keep all items and answers only in files/object storage | No per-item table or relational answer join. | Reject: source/batch/item FK integrity, stable sampling identity, and atomic import/version publication cannot be enforced by the database. Restricted raw files remain useful as source artifacts, but are not the only answer store. |

## Selected candidate: five tables

Names follow foundation FR-105. UUIDs are application-generated stable IDs; `version_no`, `source_ordinal`, and `source_row_no` are positive integers. The listed fields are a bounded physical proposal; payload schemas and lifecycle values require canonical spec acceptance before migration.

| Table | Candidate columns and keys | Purpose and writer |
|---|---|---|
| `dataset` | `id` PK; `name` non-null; `created_by_user_id` FK to `users.id`; `created_at` | Logical dataset identity. Creator/import service writes it. No item count column; count derives from version batches/items. |
| `dataset_version` | `id` PK; `dataset_id` FK; `version_no`; `parent_version_id` nullable self-FK scoped to the same dataset; `state` (`draft`, `sealed` candidate); `manifest_sha256` nullable until sealing; `created_at`, `sealed_at` nullable. Unique (`dataset_id`, `version_no`), plus unique (`id`, `dataset_id`) to support the composite parent FK. | A complete snapshot identity, never an in-place alias for “latest.” Import service writes draft; publication transaction seals it. |
| `dataset_import_batch` | `id` PK; `dataset_version_id` FK; `source_ordinal`; `source_name`; `source_sha256`; `source_ref` (restricted immutable artifact locator); `record_path` (selected JSON record path); `preprocessing_version`; `created_at`. Unique (`dataset_version_id`, `source_ordinal`). | One accepted upload/source within one version. Multiple 013 files produce multiple batches. A batch uses one preprocessing version; mixed pipelines create separate batches. The source reference is privileged metadata. |
| `dataset_item` | `id` PK; `dataset_import_batch_id` FK; `source_row_no`; `public_payload` validated JSON; `created_at`. Unique (`dataset_import_batch_id`, `source_row_no`). | One normalized row in that batch. `public_payload` is an explicit safe-field projection, never raw upload JSON and never a test answer/split. Dataset/version/source/preprocessing lineage follows the batch FK without redundant copies. |
| `dataset_item_private` | `dataset_item_id` PK/FK to `dataset_item.id`; `declared_split` nullable; `hidden_answer` nullable validated JSON; `created_at`. | One restricted companion row per item, including items without an answer. Stores source-declared split/answer; run-specific sample assignment belongs to the later snapshot contract. Import/scoring paths only. |

All five tables are **candidates**. `dataset_item_private` is the ADR-005 separate answer table even though it also holds split membership; neither the existence of the companion row nor its fields may be reflected in annotator metadata. `source_ref` points to an immutable raw upload retained in restricted storage and checked against `source_sha256`; the source artifact can contain hidden answers and therefore must have the same privileged access boundary. The creator's raw JSON preview in 013 reads the selected local file **before ingestion**. Once imported, neither task-edit nor any API path may fetch stored hidden answers or raw source contents for a preview; the canonical import contract must define a safe projected replacement if post-import preview is needed. Raw source data is not copied into `dataset_item.public_payload` merely to support preview.

### Identity, 3NF, and constraints

- `dataset_version.dataset_id → dataset.id`; `(parent_version_id, dataset_id) → dataset_version(id, dataset_id)` keeps a parent within its dataset. `parent_version_id != id` is a check; acyclic ancestry and increasing version numbers require service validation in the same transaction. The first version has no parent.
- `dataset_import_batch.dataset_version_id → dataset_version.id`; `dataset_item.dataset_import_batch_id → dataset_import_batch.id`; `dataset_item_private.dataset_item_id → dataset_item.id`. Use `RESTRICT` for referenced published lineage and item deletion; a separate retention/deletion decision is needed before destructive cleanup. SQLite FK enforcement is already enabled by the engine connection hook.
- The batch FK determines an item's source, version, and preprocessing version. Do not duplicate those three values on `dataset_item`: that would create update anomalies. `source_row_no` is the accepted record's one-based ordinal at `record_path`; the source file's own `id` field is data, not the PK. Repeated source IDs or identical content remain separate source rows unless a later spec explicitly defines deduplication.
- The pair `(dataset_import_batch_id, source_row_no)` prevents duplicate import of the same source row within a batch. `(dataset_version_id, source_ordinal)` prevents ambiguous file order. Neither `source_sha256` nor item content hash is globally unique: legitimate reimport and successor versions may reference the same bytes.
- `dataset_item_private` has exactly one row per accepted item, written atomically with its public row. `declared_split` and `hidden_answer` may be null when absent from the source; a test item without a usable scoring answer must be rejected by the later scoring/publish contract, not silently scored. The allowed split vocabulary and answer envelope are not invented here.
- Primary keys and uniqueness are enforced in both dialects; checks cover positive ordinals and non-empty version strings. Cross-row completeness, published immutability, protected-field intersection, checksum verification, and valid state transitions need service transactions and tests. A database check alone cannot prove that JSON lacks secret values.

### Access and field classification

The importer must obtain an **explicit protected-field declaration** independently of 013's `field_role_map`, then construct `public_payload` from an allowlist of source fields that the task may expose. Protected answer fields cannot also be Input, Evidence, or visible Output preannotations. Column-name guessing is insufficient: a secret may be called `label`, while a legitimate visible preannotation can be named `gold_label`. If classification is absent, contradictory, or incomplete, the dataset version remains draft and cannot be sealed or published to annotators. This needs a new canonical import contract; current 013 allows unassigned columns in config and does not define protected-field classification, so the design cannot treat 013's field map as an answer-security boundary.

On PostgreSQL, the application read role for annotator paths must have no `SELECT` on `dataset_item_private` or restricted source references; only authorized scoring-worker paths may read stored hidden answers. The import path may write the private row, but it must not expose a read endpoint for answers. SQLite cannot enforce database roles, so the repository/service boundary and response allowlists must provide the quick-start equivalent. In both tiers, annotator-facing Pydantic models are constructed only from public columns; no ORM relationship auto-serialization, broad `SELECT *`, shared cache, log payload, trace, or fixture may include private fields. `@pytest.mark.security` tests must recursively inspect every annotator-facing response, including nested JSON.

### Version and publication boundary

A `draft` version may accept, replace, or remove batches and items as part of a transaction. Immediately before the first run publication that consumes it, an import/publish transaction validates classification, source checksums, private-row completeness, positive ordinals, and the ordered batch/item manifest; it writes `manifest_sha256` and `sealed_at`, then changes the state to `sealed`. After sealing, source refs, batch order, item payloads, private answers/splits, and manifest are immutable. Any later content edit creates a new version with a same-dataset parent and a new version number. This makes 014's immutable `sample_snapshot_id` refer to a stable dataset input; it does not redefine 014's run/round snapshot rules.

The manifest digest should be calculated over a canonical serialization of version ID, ordered batch source checksums, selected record paths, preprocessing versions, item IDs/row numbers, and payload digests. The canonical encoding, privacy treatment of private-answer digests, and whether a successor materializes all rows anew must be specified and tested before runtime. A full version snapshot is the simple default; copy-on-write sharing would require an explicit version-item membership model and is outside this five-table candidate. `sealed` is a candidate lifecycle value, not a current canonical enum.

## Type mapping and indexes

| Logical value | SQLAlchemy candidate | PostgreSQL | SQLite quick start |
|---|---|---|---|
| Stable ID/FK | `Uuid(as_uuid=True)` | `UUID` | `CHAR(32)` storage via SQLAlchemy |
| Integer ordinal/version | `Integer` with positive `CHECK` | `INTEGER` | `INTEGER` |
| Text/name/ref/state | bounded `String` or `Text` as appropriate | `VARCHAR`/`TEXT` | `VARCHAR`/`TEXT` affinity |
| Structured payload | `JSON().with_variant(JSONB(), "postgresql")` | `JSONB` | JSON text storage |
| Timestamp | `DateTime(timezone=True)` with UTC-normalized application values | `TIMESTAMPTZ` | serialized datetime; application enforces UTC |
| Digest | `String(64)` with format validation | `VARCHAR(64)` | `VARCHAR(64)` affinity |

Use the existing shared SQLAlchemy naming convention for PK/UQ/FK/CHECK/index names. Avoid PostgreSQL-only JSONB operators, partial indexes, native enums, or array columns in the common path. Candidate B-tree indexes: every FK column (`dataset.created_by_user_id`, `dataset_version.dataset_id`, `dataset_version.parent_version_id`, `dataset_import_batch.dataset_version_id`, `dataset_item.dataset_import_batch_id`); `(dataset_id, version_no)` and `(dataset_version_id, source_ordinal)` are already covered by their unique indexes; `(dataset_import_batch_id, source_row_no)` covers bounded item iteration within a batch. The private table PK covers answer lookup by item ID. No JSON GIN index or content-hash index is justified before a concrete query requires it. Version-wide scans join indexed batch then item keys and must be paginated.

SQLite and PostgreSQL migration roundtrips must be verified separately. Alembic uses `render_as_batch=True` already; SQLite must run with `PRAGMA foreign_keys=ON`. Later migration work follows separate Red tests, `upgrade()`, meaningful `downgrade()`, and roundtrip tasks in a migration-only PR. The tests should prove uniqueness/FK violations, same-dataset parent enforcement, public/private separation, version sealing, and answer leakage using synthetic records. No migration or runtime change is authorized by this document.

## Handoff: canonical decisions still needed

1. **Owning spec and explicit privacy contract:** create or amend a canonical dataset ingestion/version spec. It must define who classifies source fields, how protected fields interact with 013's raw preview, Input/Evidence/Output role selection, and how rejection is shown. This is the main security decision; the five-table shape cannot make an unclassified raw JSON safe.
2. **Dataset version lifecycle:** ratify `draft → sealed`, sealing trigger, retry/idempotency, successor copying, checksum encoding, immutable source retention, and authorized deletion/anonymization. Backend constitution XII requires named states, actors, side effects, audit events, and retry/rollback rules.
3. **Split and answer semantics:** decide the allowed split vocabulary, whether a source split is dataset-wide or only run/snapshot-specific, hidden-answer envelope/validation, and how test items lacking answers are handled. A run-specific split must live in its eventual snapshot/assignment model, not be overwritten in `dataset_item_private`.
4. **Task/run binding:** task-013/014 must choose a stable `dataset_version_id` FK, bind it before publication, and specify what draft dataset edits do to a task. The shape of `sample_snapshot_id`, item membership, and task/run/round uniqueness remains in the task/run owning spec. Do not invent those FK columns or claim a cross-version constraint has been enforced yet.
5. **Annotation/export references:** the later annotation and export contracts must carry dataset, label-schema, and task-config version IDs alongside sample IDs and declared seeds/filters. Dataset-017's report shapes do not supply these storage FKs; 014 FR-010i-1/2 covers export metadata and condition snapshots but not a physical table shape.

After those canonical decisions, write a dataset physical column dictionary, then project only its accepted columns/FKs to `database-table-inventory.md` and the NoteCraft `.er.json`. The current inventory and diagram must continue to label these as candidates until migration and ORM evidence exists.

## Source references

- [Main constitution](../../../specs/_governance/constitution.md), Principles III, XIV, and XVI; [backend constitution](../../../specs/_governance/backend-constitution.md), sections VI, VII, and XII; [testing constitution](../../../specs/_governance/testing-constitution.md), sections I, II, VIII, and XI.
- [Foundation spec](../../../specs/foundation/000-foundation/spec.md), FR-104 through FR-106; [ADR-005](../../adr/005-database-postgresql.md), key schema design decisions; [ADR-024](../../adr/024-database-quickstart-sqlite-tiered.md), dialect-specific paths and dual-tier migration testing.
- [Task-new 013](../../../specs/task-management/013-task-new/spec.md), FR-002b, FR-002c-1, FR-002c-8, and FR-003g-5; [task-detail 014](../../../specs/task-management/014-task-detail/spec.md), FR-010f and FR-010i-1/2.
- [Dataset-016](../../../specs/dataset/016-dataset-analysis-list/spec.md), key entities; [dataset-017](../../../specs/dataset/017-dataset-analysis-detail/spec.md), key entities; [database inventory](../../diagrams/architecture/database-table-inventory.md), sections 1, 3, and 5.
