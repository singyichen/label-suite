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

## Consequences

The two admin matrix tables remain candidate schema in the planning diagram. This ADR creates no ORM, migration, API route or deployed table. Before runtime adoption, security tests must cover demotion, missing/unknown cells, cross-task access, role-specific workspace writes, reviewer view/edit, admin hard gates, atomic save/audit and answer isolation. Task membership's physical PK/FK and indexes wait for the task-table identity decision; a user-leading lookup index will be needed for “my tasks” if that logical triple is adopted physically.

## References

- [Admin-007](../../specs/admin/007-role-settings/spec.md): key registry, V1 matrix, fixed cells and save contract.
- [ADR-021](021-jwt-refresh-token-auth.md): current identity and token-family checks.
- [ADR-032](032-user-action-audit-trail.md): shared append-only matrix-change event.
- [Task-detail-014](../../specs/task-management/014-task-detail/spec.md): task membership and narrower resource rules.
- [Annotation-015](../../specs/annotation/015-annotation-workspace/spec.md): active workspace role and answer isolation.
