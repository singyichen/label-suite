# Shared User-Action Audit Events — Design

## Goal and scope

Resolve issue #1160 decision D-4 as a cross-module planning contract. Accept one shared user-action audit surface, align account/admin requirements with it, and project only the candidate fields whose types and keys have source support into NoteCraft. No ORM, migration, API, retention job, or deployed table is created in this slice.

## Sources and decision

ADR-032 proposes one append-only `audit_events` table for human domain actions. Admin-006 requires target-specific account change history; admin-007 requires matrix change history for at least one year. The current account/admin dictionary instead names `audit_event` and omits the task scope field. Foundation FR-105 defaults new tables to singular module-prefixed names. Accepted ADR-022 explicitly models `RunStateTransition.task_id` as UUID; the task table name and PK have not been finalized.

Adopt ADR-032 Option C and mark it Accepted after these amendments:

1. `audit_events` is an explicit shared cross-module exception to foundation FR-105's table-name default. This exact name is added to FR-105; it does not license other plural or unprefixed new tables.
2. The event has ten logical fields: `id`, `actor_user_id`, `actor_role`, `action`, `target_type`, `target_id`, nullable `task_id`, `payload_summary`, nullable `request_id`, and `occurred_at`. `task_id` is a nullable UUID candidate based on Accepted ADR-022. It is not a physical FK until the task table and PK are decided. `target_type` plus `target_id` is an intentional polymorphic reference with registry and service validation rather than a false FK.
3. Human events require `actor_user_id` with a real `users.id` FK and `actor_role != 'system'`. System-generated events require `actor_user_id IS NULL` and `actor_role = 'system'`; a DB CHECK enforces this equivalence. This avoids inventing a privileged synthetic login account. The actor's role is a historical snapshot.
4. All audit events have at least one calendar year of availability. Ordinary application writes are insert-only; corrections are new events. Automatic deletion is disabled. Future archive or purge after the minimum term requires a separately reviewed policy and privileged maintenance path; no cleanup path is implied by this design.
5. The initial registry adds `member.updated` for ordinary admin account edits and reserves `role_permissions.changed` with target `role_permission_matrix` for D-9's editable matrix contract. Account actions target `user` and use the target user's stable ID. `payload_summary` is an action-scoped allowlisted diff: IDs, statuses, role/version transitions and non-sensitive metadata only. No tokens, credentials, gold answers, raw annotation text, or unrestricted request payloads.
6. Domain mutation and audit insert share one transaction. Admin-006 target history filters by `(target_type,target_id)` and is available only through the existing authorized drawer. Task lifecycle reconstruction sorts by `(occurred_at,id)`; `RunStateTransition` remains a separate domain state row, paired with `task.status_changed` in the same transaction. Annotation answer history remains its own role-filtered domain record, not shared audit payload.

## Candidate physical projection

Rename the candidate account/admin table to `audit_events`, add nullable UUID `task_id`, and make `actor_user_id` nullable only for system events. The nine candidate tables then have 63 columns and six confirmed candidate FK fields. Keep `actor_user_id → users.id`; draw no FK for `task_id` or polymorphic `target_id`. Candidate indexes follow observed queries: `(target_type,target_id,occurred_at DESC,id DESC)` for admin target history; `(task_id,occurred_at ASC,id ASC)` for task chronology when task reads are implemented; `(actor_user_id,occurred_at DESC,id DESC)` for actor history. Avoid standalone duplicate indexes until query plans and the future task schema justify them. PostgreSQL uses JSONB and timestamptz; SQLite uses the established JSON and datetime variants. This is a field dictionary and test target, not a migration instruction.

## Alternatives and trade-offs

- A separate `admin_user_audit_log` duplicates the cross-module event surface and would make task lifecycle reconstruction depend on unions; reject it.
- Keeping singular `audit_event` avoids a naming exception but would reverse ADR-032's selected shared name; the explicit FR-105 exception is narrower and preserves the ADR's established vocabulary.
- A reserved system user would preserve a non-null actor FK but needs protected account creation, login prohibition and deletion rules that the current project does not define. Nullable actor only for system events gives an enforceable boundary without that account lifecycle.

## Verification and remaining dependencies

The Red test must detect a stale `audit_event` projection, absent `task_id`, wrong actor nullability, and a fake task FK. After the canonical write-back, validate the OpenSpec change schema, Project SDD lint, source-to-ER projection and plugin JSON Schema, then open the actual NoteCraft Wiki and Diagram and verify the 9/63/6 count, table label, ten fields, actor FK, and no task line. Source-Verify must compare archived derived FR/SC text and IDs against the canonical files.

D-9's authorization behavior and matrix table status remain a separate SDD slice. Task PK/table identity, task FK, task-scoped access, annotation history, and authorized archival implementation remain follow-up work. D-4 may be considered decided at the planning-contract level while the candidate diagram remains explicitly undeployed.
