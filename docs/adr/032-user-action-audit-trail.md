# ADR-032: User-Action Audit Trail

**Status**: Accepted
**Date**: 2026-08-19
**Accepted amendment**: 2026-10-06 — issue #1160 D-4; SQLite/PG planning contract, system actor, retention, admin actions and naming exception.
**Accepted amendment**: 2026-10-06 — issue #1160 D-9; matrix event target identity fixed by ADR-037.

## Context

ADR-019 established audit logging for **AI-assisted workflows**: every AI run creates an `ai_run` record with append-only lifecycle events. That canon deliberately answers "why did this AI action produce this outcome" — it does not cover ordinary **user actions**: who published a task, who submitted an annotation, who approved a review unit, who cast an arbitration vote, who changed a member's role, who exported results.

Issue #180's cross-role lifecycle review exposed the gap (traceability matrix node #15, `docs/product/e2e/issue-180/traceability-matrix.md`): the acceptance requirement "reconstruct the full task lifecycle from the audit log" has no canonical contract to assert against. Related findings:

- **ADR-022** already defines one specialized audit record, `RunStateTransition`, written in the same transaction as a task status change. It covers exactly one action family (task state transitions) and nothing else.
- **Spec 014's work-log** (工時紀錄) records login/logout time, online duration, and per-role completion counts. It is a **productivity statistic**, not an audit trail: it has no per-action records, no targets, no before/after state, and is aggregated for reporting.
- The **prototype** (static HTML + localStorage) has no audit concept anywhere.

Requirements for a canonical user-action audit trail:

- Answer "who did what, to which entity, when" across all four modules (`account`, `task-management`, `annotation`, `admin`) with one query surface.
- Support the formal-build E2E assertion "reconstruct the lifecycle of a task from draft through export" (node #15).
- Stay config-driven (ADR-010): adding a task type or output type must not require new audit code paths.
- Not leak sensitive content: no hidden gold answers, no tokens, no raw annotation payloads by default (same redaction posture as ADR-019).

### Options Evaluated

#### Option A — Extend ADR-019's `ai_run` model to cover user actions

Reuse `ai_runs` / `ai_run_events` with a `workflow_type` like `user_action`.

**Rejected**: Semantic mismatch. An AI run is a multi-event lifecycle (planner/generator/evaluator, tool calls, accept/reject); a user action is a single atomic fact. Forcing single actions into a run container bloats every insert with meaningless lifecycle rows, and mixes two different retention/access policies in one table.

#### Option B — Per-domain audit tables (generalize the `RunStateTransition` pattern)

One dedicated table per action family: `run_state_transitions`, `annotation_submissions_log`, `review_verdicts_log`, `member_changes_log`, ...

**Rejected as the canonical surface**: Each table is well-shaped for its domain, but "reconstruct the full lifecycle" then requires an N-way union that grows with every new action family — the audit query layer becomes the hardcoded task-logic anti-pattern ADR-010 forbids. Domain tables remain useful as *domain state records*, not as the audit canon.

#### Option C — Single append-only `audit_events` table with a config-driven action registry (selected)

One canonical table for all user actions, with a registry of allowed action names (mirroring ADR-019's `workflow_type` registry approach). Domain records such as `RunStateTransition` continue to exist per ADR-022; the audit event is emitted in the same service-layer transaction.

## Decision

Create a first-class **user-action audit trail** as a single append-only table, `audit_events`, written from the service layer of the formal FastAPI backend. PostgreSQL 16 is the production database and SQLite is the Lite quick-start tier under ADR-024. This exact shared table name is an explicit exception to foundation FR-105's singular, module-prefixed default; it does not extend that exception to other tables. This ADR is canon for the event model and catalog; it intentionally does not prescribe migrations, ORM classes, or API routes.

### Scope Boundary vs ADR-019

| Concern | Canon |
|---------|-------|
| AI-assisted workflow runs (model, prompt, tool calls, evaluator results) | ADR-019 (`ai_runs`) |
| Human-initiated domain actions (publish, submit, verdict, vote, member change, export) | **ADR-032 (`audit_events`)** |
| A user accepting/editing/rejecting an AI output | ADR-019 (`user.accepted` etc. inside the run) — no duplicate ADR-032 event |
| A human action that *triggers* an AI run (e.g., requesting an evaluation) | ADR-032 event for the action + `ai_run_id` reference for correlation |

### Canonical Event Model

```text
audit_events
  id
  actor_user_id        -- who (nullable FK → users.id; null only for system actions)
  actor_role           -- role at the time of the action, or system for a non-human action
  action               -- namespaced verb from the action registry, e.g. task.status_changed
  target_type          -- entity kind, registry-driven (task, annotation, review_unit, user, export, ...)
  target_id            -- entity identifier
  task_id              -- nullable UUID scope key: set whenever the action occurs within a task
  payload_summary      -- redacted JSONB/SQLite JSON: before/after or a minimal summary
  request_id           -- correlation with API logs (and ai_run_id when applicable)
  occurred_at          -- UTC, server-side timestamp
```

Rules:

- **Append-only.** Ordinary service writes only insert; updates and deletes are rejected in both database tiers. Corrections are new events (same rule as ADR-019). A future privileged archive/purge path requires a separately reviewed policy and may operate only after the minimum retention term.
- **Same transaction.** The audit event is written in the same DB transaction as the domain mutation, in the service layer (the ADR-022 pattern). A failed mutation writes no event; a committed mutation always has one.
- **Registry-driven.** `action` and `target_type` values come from a config registry. New task types or output types reuse existing actions (`annotation.submitted` carries the output-type composition in `payload_summary`); they never add code paths.
- **Actor integrity.** Human actions have a non-null `actor_user_id` referencing `users.id` with delete `RESTRICT` and `actor_role != 'system'`. Non-human actions have `actor_user_id IS NULL` and `actor_role = 'system'`; a database CHECK makes the two forms equivalent. A synthetic login-capable system account is not created. Human actor ID and historical role snapshot come from the verified authentication/account flow, and system context comes only from a trusted internal job; neither may be accepted from a client request body. The runtime slice must reject forged system actors in tests.
- **Scope and target integrity.** `task_id` is a nullable UUID candidate consistent with Accepted ADR-022. The task table/PK is not yet decided, so this ADR does not claim a physical task FK. `(target_type,target_id)` is a registry-validated polymorphic reference, not a physical FK; service writes validate the target kind and existence at insertion time, and identifiers are not reused after deletion. Historical target metadata needed for an audit read must be captured in an allowlisted summary rather than relying on a deleted target row.
- **Redaction.** `payload_summary` has an action-scoped allowlist: IDs, state/role/version transitions and necessary non-sensitive metadata. It must never contain gold answers, credentials, tokens, raw annotation text or unrestricted request payloads. Annotation answer-history snapshots remain separate role-filtered domain records.
- **Retention.** Every event must remain available for at least one calendar year. There is no automatic deletion. A separately approved archive/purge policy must preserve this minimum and the ability to reconstruct required history before any cleanup is implemented.

### Initial Event Catalog

The catalog below is the initial registry. Adding entries is a registry change plus a spec reference — not an ADR amendment — as long as the event model is unchanged.

**account**

- `user.registered` · `user.logged_in` · `user.logged_out`
- `user.password_changed` · `user.profile_updated`

**task-management**

- `task.created` · `task.config_updated` (config version/hash in payload, not full config)
- `task.status_changed` — before/after status; emitted alongside ADR-022's `RunStateTransition` in the same transaction
- `task.iaa_confirmed` · `task.iaa_rejected` (rejection reason summary)
- `task.member_added` · `task.member_removed` · `task.member_role_changed`
- `task.review_settings_changed` (e.g., `reviewer_ids`, `arbiter_ids` — 014 v3.0.0 replaced the retired `min_reviewers`)
- `task.exported` (export format and manifest reference)

**annotation**

- `annotation.submitted` · `annotation.resubmitted`
- `review.verdict_recorded` (approve / modify / bypass per outKey decision, `REVIEW_DECISIONS` in 015 FR-092; `reject` was removed in 015 v5.0.0)
- `dispute.created` (system actor, from reviewer disagreement) · `dispute.assigned`
- `arbitration.vote_cast` (chosen side, not annotation content)
- `dispute.resolved`

**admin**

- `member.invited` · `member.activated` · `member.deactivated`
- `member.platform_role_changed` · `member.updated` (ordinary account field edit)
- `role_permissions.changed` (target type `role_permission_matrix`, stable target ID string `1` matching the version singleton; emitted for a real editable-matrix change, with server-computed before/after cell diff and version transition; see ADR-037)
- `audit.exported` (exporting the audit trail is itself audited)

### Relationship to `RunStateTransition` (ADR-022)

`RunStateTransition` remains the state machine's domain record and is unchanged by this ADR. `task.status_changed` audit events reference the transition row from `payload_summary`. Whether to later fold `RunStateTransition` into `audit_events` is deferred; doing so would require amending ADR-022 and is not needed for correctness because both rows share one transaction.

### Storage, Query, and Access (high-level)

- **Storage**: PostgreSQL JSONB/timestamptz in production and ADR-024's SQLite JSON/datetime variants in Lite. Candidate indexes follow actual reads: `(task_id, occurred_at, id)` for task chronology; `(target_type, target_id, occurred_at, id)` for target history; `(actor_user_id, occurred_at, id)` for actor history. Avoid redundant indexes. This keeps the deferred observability decision (Foundation Spec) untouched — audit is domain data, not telemetry.
- **Query**: lifecycle reconstruction is `SELECT ... WHERE task_id = ? ORDER BY occurred_at, id` — the exact order the node #15 E2E assertion will use through an admin-scoped API. Admin-006's target history filters by `target_type='user'` and the chosen `target_id`; no other target's events enter that drawer.
- **Access**: role-scoped, mirroring ADR-019 — `super_admin` full; `project_leader` project-scoped; `reviewer`/`annotator` no audit access by default. A project-scoped read fails closed when task/project ownership cannot be verified, including null or unknown `task_id`; nullable scope must not widen visibility. The runtime slice must test these denied reads before exposing an audit API.
- **Metrics**: no `audit_event` IDs, user IDs, or task IDs as Prometheus labels (ADR-018/019 cardinality and privacy rules apply).
- **Retention**: at least one calendar year for every event, including role-matrix changes required by admin-007 FR-010. No automatic deletion; any later privileged archive/purge mechanism needs a separately reviewed policy and verification.

### Prototype Layer Exemption

The prototype (static HTML + localStorage, `design/prototype/`) is **exempt**: it implements no audit trail, and acceptance testing marks audit assertions **N/A at the prototype layer** (traceability matrix node #15). Audit assertions apply to the formal FastAPI backend on PostgreSQL and its SQLite Lite tier; the formal E2E suite designs its "reconstruct the lifecycle" assertion against this ADR's event model and catalog. The work-log feature (spec 014) remains a productivity statistic and is not an audit source.

## Consequences

### Easier

- The node #15 acceptance gap closes: formal E2E has a canonical contract to assert against.
- One query surface reconstructs any task's lifecycle across all roles and modules.
- The ADR-019 / ADR-032 boundary is explicit, so no workflow is double-audited or unaudited.
- The registry approach keeps audit config-driven; new task types cost zero audit code.

### Harder

- Every mutating service function must emit its audit event — a discipline enforced by review and by E2E lifecycle assertions, not by the type system.
- One wide table serves many action shapes; `payload_summary` schemas per action need registry documentation to stay interpretable.
- Redaction rules for `payload_summary` must be actively maintained, as with ADR-019 snapshots.
- Table growth must be monitored against the decided one-calendar-year minimum; any later archive or purge mechanism needs a separate reviewed policy before use.

## Deferred Decisions

- Privileged archive/purge policy and implementation after the one-calendar-year minimum; no automatic deletion is approved here.
- The editable matrix's audit target is now decided by ADR-037. Runtime implementation and retention enforcement remain separate work.
- Whether `RunStateTransition` is eventually folded into `audit_events` (requires ADR-022 amendment).
- Whether an admin-facing audit UI ships in the first formal release or audit stays API-only.
- Partitioning strategy if event volume warrants it.

## Relationship to Other ADRs

- [ADR-010](010-config-driven-architecture.md): action/target registries must stay config-driven; no task-type-specific audit code.
- [ADR-019](019-ai-traceability-audit-logging.md): AI-workflow traceability; ADR-032 covers human actions and correlates via `request_id`/`ai_run_id`.
- [ADR-022](022-task-state-machine-location.md): audit events are emitted from the service layer in the same transaction as domain mutations; `RunStateTransition` is unchanged.
- [ADR-037](037-permission-matrix-authorization.md): fixes the role-matrix change event target identity and atomic version/diff boundary.
- [ADR-018](018-observability-prometheus-grafana.md): audit identifiers never become metric labels.
