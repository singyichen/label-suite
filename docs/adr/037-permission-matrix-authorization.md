# ADR-037: Permission Matrix as Authorization Input

**Status**: Accepted
**Date**: 2026-10-06
**Decision**: Issue #1160 D-9–D-13

## Context

Admin-007 permits a `super_admin` to edit and save a role-permission matrix, and says the saved configuration becomes the authorization baseline. ADR-021 authenticates a current user but its illustrative `require_role` checks a fixed system-role set. Task specs also use fixed role names for pages and actions. Without an explicit composition rule, the matrix could be persisted without governing anything, or could be used to bypass task membership and answer isolation. Admin-007's reviewer `task.detail.view` cell says “read-only”, which one `allowed` boolean cannot encode as both view and edit.

## Decision

The saved matrix is a necessary server-side authorization input for operations with an activated `permission_key`. Authorization evaluates, in order:

1. Verify the current authenticated user, active account, credential version, and active token family as in ADR-021. JWT `role` is display-only.
2. Read the current system role; for task-scoped operations read current, active memberships for that task. System roles never imply task membership.
3. Resolve the operation to an activated, allowlisted key and its system or task layer. Require `allowed=true` for an applicable current-role cell. An unknown key, missing row, mismatched layer, inactive membership, or missing matrix version row denies. No stored row represents an inapplicable `⛔` cell.
4. Enforce the operation's additional conditions: task ownership and state, assignment and reviewer identity, dataset visibility, and test-set answer isolation. A true cell alone never overrides those conditions. A hidden task is answered without disclosing its existence.

The feature spec owns its operation-to-key mapping and narrower conditions. The registry, seed and fixed cells live in admin-007. The initial V1 registry has 9 platform keys and 8 task keys. Its complete applicable seed has `9 × 2 + 8 × 3 = 42` rows. `task.detail.view` and `task.detail.edit` are separate booleans; reviewer view is true and reviewer edit is false. Task deletion and some lifecycle commands have no V1 key. They cannot borrow an unrelated key or switch to matrix-only runtime authorization until a reviewed key, complete seed and tests are added; their existing narrower role/resource gates remain in force.

### Boundaries and composition

Admin pages, matrix read/write/history and user-management commands require a current `super_admin` system role **and** their matching `admin.*` cell. A `user` cell cannot grant admin access. `super_admin × admin.*` is fixed true, `user × admin.*` fixed false, and `dashboard.view` is fixed true for both system roles.

One user may hold several task roles in a task. The logical uniqueness key for a membership is `(task_id,user_id,task_role)`; changing or removing one role does not silently change another. Non-workspace task pages may use the union of allowed keys from current active memberships in that task, still subject to the operation's resource constraints. Annotation workspace writes use only the explicitly selected active role and its current matching membership. Route query parameters never establish the user's role, identity, assignment or reviewer roster.

When a later permission key is proposed, its configurable applicable cells default false. It remains unknown and denied until a reviewed change activates its layer, operation mapping, full seed and security tests. The fixed-cell rules are the narrow exception: a newly approved `admin.*` key atomically receives super-admin true and user false, while other configurable cells begin false. The existing `dashboard.view` key remains fixed true; removing and reintroducing it cannot bypass that invariant. An absent cell denies even if its seed was expected.

### Persistence and freshness

`admin_role_permission` has a non-null composite PK `(role_type,role_key,permission_key)` and `allowed BOOLEAN NOT NULL`. The DB checks role/key pairing and fixed cells; SQLite additionally checks `allowed IN (0,1)` because its boolean storage is integer affinity. Service validation requires exactly one row for every applicable activated role/key pair and rejects extra, missing, duplicate and cross-layer cells. A role-key or permission-key FK is not invented where no parent table exists.

`admin_role_permission_version` is seeded with its single allowed `id=1` row. Its PK and CHECK prevent a second identity but cannot guarantee that the row has not been deleted; absence denies. Every save, including a no-op, verifies the expected version. For a real diff, compare-and-swap the version, update cells, and insert ADR-032 `role_permissions.changed` in one transaction. Compute the diff from server-observed stored rows. A no-op advances neither version nor audit. The stable polymorphic audit target is `target_type='role_permission_matrix'`, `target_id='1'`; it has no physical target FK.

The first runtime implementation reads current roles, memberships and matrix rows for each relevant decision. A later cache needs a separately verified invalidation protocol that makes role removal, membership removal and matrix edits effective on the next request in both SQLite Lite and PostgreSQL. Frontend capabilities are server-derived, task-scoped display hints with private/no-store caching; every command is rechecked at the server. They contain no hidden answer data.

### Clarifications (issue #1269, 2026-10-12)

They add no key and change no cell. The first, second and fourth rules make explicit what the decision above already implies. The third is a new decision taken in issue #1269.

- **Client state is never an authorization source.** `localStorage`, `sessionStorage`, cookies the server did not issue for authentication, cached capabilities, URL parameters and any other frontend state never establish a system role, task role, membership, assignment or scope. The frontend may use them only to decide what to render; the server decides every read and command from current DB state as in steps 1–4.
- **An `invited` membership is not active.** A membership whose status is `invited` (or any status other than active) counts as an inactive membership under steps 2–3 and is denied for every task-scoped key, including view keys. It joins the union of non-workspace keys only after it becomes active.
- **Denial audit scope (new decision).** A denied request for a high-risk write — any `admin.*` command, `dataset.export`, exception-pool resolution (annotation-015 FR-095) and the task lifecycle commands defined in the task-management specs, which have no V1 key — is a candidate for an ADR-032 audit event naming the actor, the operation and the denial reason. Other denials, including ordinary page or data views, go to the application log only and never create an audit event. ADR-032 registers no denial event type today, so the audit half takes effect only when a later reviewed change registers that event type in ADR-032; until then these denials also go to the application log. Neither path records hidden answer data.
- **Arbitration reuses the review key.** `arbiter_ids` is a subset of `reviewer_ids`, not a task role. An arbitration write needs the active `reviewer` role, its current active membership and an allowed `annotation.workspace.review` cell, plus the resource conditions that the reviewer is listed in the task's `arbiter_ids` and did not take part in the disputed unit (annotation-015 FR-060, FR-104). No separate arbitration key exists; an unregistered arbitration key is denied like any unknown key.

### Amendment (issue #1270, 2026-10-13)

The maintainer adopted five keys proposed in issue #1270 and ruled that they are registered but pending activation. Admin-007 v1.3.0 registers them; the text above stays as written and is read with the changes below.

- **Registry and seed.** The task-layer keys `task.lifecycle.manage`, `task.delete`, `annotation.exception.resolve` and `annotation.dispute.adjudicate` have the seed `project_leader` true, `reviewer` false, `annotator` false; all three cells are configurable. The platform key `admin.platform_overview.view` follows the fixed `admin.*` rule: `super_admin` true and `user` false. The registry becomes 10 platform keys and 12 task keys, and the applicable seed becomes `10 × 2 + 12 × 3 = 56` rows. The statement above that the initial V1 seed has 42 rows describes v1.2.x.
- **Reviewed seed versus default false.** The default-false rule for configurable cells applies when a reviewed change states no seed for a cell. Issue #1270 states the seed for the four task keys, so their `project_leader` cells start true.
- **Registered, pending activation.** The review of these five keys covers the layer, the operation mapping and the full seed. The security tests need runtime evidence from the backend implementation, and a later reviewed change will confirm them. Until then, any authorization decision that uses one of these keys denies it like an unknown key. The mapped operations keep their existing role, state and resource gates and never pass on a matrix cell alone. Matrix saves still require all 56 applicable rows.
- **Roster.** Writes to `reviewer_ids` and `arbiter_ids` move from `task.detail.edit` to `task.members.manage`, an active key, so this change applies at once. Dataset rebinding stays on `task.detail.edit`.
- **Arbitration.** The arbitration clarification above is unchanged. `annotation.dispute.adjudicate` covers only the project-leader channel used when `arbiter_ids` is empty (task-detail-014 FR-023). It is not an arbitration key for listed arbiters.
- **Denial audit scope.** The lifecycle commands named in the denial audit clarification now map to `task.lifecycle.manage` and `task.delete`. They stay in the high-risk write list.

## Consequences

The two admin matrix tables remain candidate schema in the planning diagram. This ADR creates no ORM, migration, API route or deployed table. Before runtime adoption, security tests must cover demotion, missing/unknown cells, cross-task access, role-specific workspace writes, reviewer view/edit, admin hard gates, atomic save/audit and answer isolation. Task membership's physical PK/FK and indexes wait for the task-table identity decision; a user-leading lookup index will be needed for “my tasks” if that logical triple is adopted physically.

## References

- [Admin-007](../../specs/admin/007-role-settings/spec.md): key registry, V1 matrix, fixed cells and save contract.
- [ADR-021](021-jwt-refresh-token-auth.md): current identity and token-family checks.
- [ADR-032](032-user-action-audit-trail.md): shared append-only matrix-change event.
- [Task-detail-014](../../specs/task-management/014-task-detail/spec.md): task membership and narrower resource rules.
- [Annotation-015](../../specs/annotation/015-annotation-workspace/spec.md): active workspace role and answer isolation.
