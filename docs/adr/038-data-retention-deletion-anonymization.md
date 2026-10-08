# ADR-038: Data Retention, Deletion and Anonymization Policy

**Status**: Accepted
**Date**: 2026-10-08
**Decision**: Issue #1224 maintainer ruling (2026-10-08)

## Context

The database planning contracts (ADR-021, ADR-024, ADR-032, dataset-021 FR-011) left retention, deletion and anonymization of personal and answer-bearing data pending. Several tables are append-only or RESTRICT-guarded, so a normal delete cannot erase them, while research reproducibility (`annotation/015-annotation-workspace` FR-063) requires gold traceability to survive.

The only durations this ADR may state are the existing canonical minimums: 30 days for the raw export file and one year for export history metadata (`task-management/014-task-detail` FR-021), and one calendar year for audit events and work-interval history (ADR-032, ADR-021). Every other term is TBD (#1224).

## Decision

### Users and pending email: anonymize in place

A data-subject deletion request anonymizes the same `users` row; foreign keys are never repointed to a shared tombstone user, so audit actors, sessions, memberships, history and gold traceability stay intact. One transaction:

- set `is_active=false`; replace `email` with a unique, non-deliverable tombstone derived from the user id (keeps NOT NULL and unique `lower(email)`); set `name` to a fixed tombstone label; clear `contact_info`, `avatar_url`, `hashed_password` and `google_subject`; increment `credential_version`;
- revoke all sessions through the `account/020-auth-session-security` FR-007 path;
- delete the user's `account_password_token` rows and all `account_email_change_request` rows, including verified rows that carry the old `pending_email`.

The operation is irreversible: account re-enable and email edits must refuse an anonymized account. Anonymization is refused while the target is the seeder (U-05/U-07) or the last active super_admin (U-08), because it would break those invariants; handling is TBD (#1224). How the anonymized state is persisted (dedicated column or reserved tombstone value) is TBD (#1224) and decided in the first migration. It runs as a reviewed maintenance operation; no product UI is added. Because ADR-032 joins the actor name from `users.name` at read time, audit and history then display the tombstone label; event rows and `actor_user_id` remain.

### PII inside audit and history events: anonymize after the minimum

Event rows are never deleted. After the ADR-032 minimum (one calendar year from `occurred_at`), only PII columns may be tombstoned: the `annotation_history_event.reason` free text, and any `audit_events.payload_summary` key later marked personal (`audit_events.payload_summary` carries no personal keys today because the ADR-032 allowlist excludes personal and contact data; marking any key as personal is TBD (#1224)). Identifiers (`actor_user_id`, `target_id`, `account_session_id`) stay; identity removal happens through the users class above. Cadence and maximum retention are TBD (#1224).

### Answer-bearing history JSON: keep with its dataset version or run

`annotation_history_event.result_snapshot`, `annotation_review_submission_revision.decision_payload` and arbitration vote payloads are kept while the dataset version or run they belong to exists (015 FR-063). They are not subject to PII-column anonymization. They are handled only when the whole version is withdrawn; that process and its term are TBD (#1224, no deletion until then).

### Raw artifacts and private answers: RESTRICT while referenced

The restricted source artifact, `dataset_item_private.hidden_answer`, `declared_split` and `protected_payload` are RESTRICTed while any sealed version or run references them. Physical delete happens only when an unsealed draft not referenced by any run is discarded: one transaction, child to parent (private row, item, batch, artifact object), never CASCADE through a sealed version. This resolves dataset-021 FR-011.

### Sessions and refresh tokens: physical delete by cleanup job

- `refresh_tokens`: a cleanup job deletes a row once its own `expires_at` has passed. Revoked (including rotated) tokens are kept until then so `account/020-auth-session-security` FR-004 reuse detection keeps working.
- `account_session`: deleted once every refresh token of the session has passed its own `expires_at` (or the session has passed its absolute maximum, `REFRESH_TOKEN_ABSOLUTE_MAX_TTL`), and only when no `task_work_interval` or `annotation_history_event` references it; this keeps R-10 and `account/020-auth-session-security` FR-004 reuse detection intact. The RESTRICT foreign keys stay; a referenced session is kept as long as the reference exists (one-year minimum, maximum TBD (#1224)). Deleting a session cascades its remaining token rows, all of which are expired by then.

Cleanup cadence is TBD (#1224).

### Export files and manifests: canonical tiers become policy

The raw export object is physically deleted after 30 days (`expires_at`), and download is refused from then. `task_export` metadata and `task_export_run` manifest rows are deleted after one year, children (`task_export_run`) before the parent in one transaction; history younger than one year is never CASCADE-wiped. Cleanup cadence is TBD (#1224). Source dataset or task deletion ordering follows the two dataset classes above.

### Privileged anonymization path

The path is the ADR-024 emergency-correction route: a separately reviewed migration or maintenance script run by the migration role, never an application code path. In one transaction it disables the guard trigger on the target table, updates only the PII columns of rows past the minimum, recreates the trigger, and writes a system audit event recording the operation. It never deletes rows. The application role keeps REVOKE UPDATE, DELETE and TRUNCATE on guarded tables.

## Open items

- Persistence of the anonymized-account state: TBD (#1224).
- Cadence of every cleanup and anonymization job, and maximum retention of events, sessions and work-interval history: TBD (#1224).
- Version withdrawal process and term for answer-bearing history: TBD (#1224).
- Identity display (actor name) is lost for audit and history within the audit minimum after user anonymization; whether this is acceptable: TBD (#1224).

## Consequences

- Deletion requests are honored without breaking FKs, append-only guards or research traceability.
- Anonymized accounts are permanently unusable and show a tombstone name in historical views.
- Cleanup jobs and the maintenance operation must be implemented and tested per tier before any data is purged.
- No new durations are introduced; undecided terms stay visibly TBD.

## Relationship to other ADRs

- ADR-021: token and session cleanup rules refine its Refresh Token Store retention text.
- ADR-024: supplies the migration-role emergency-correction path used here.
- ADR-032: its one-calendar-year minimum bounds event anonymization; events are never deleted.
- dataset-021 FR-011 is written back from this decision.
