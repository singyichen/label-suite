# Account/Admin Lifecycle Decisions — Design

## Goal and scope

Resolve issue #1160 decisions D-2, D-5, and D-7 before migration work. This slice defines the invite-link lifetime and invalidation semantics, the notification preference default, and the first `super_admin` bootstrap contract. The account/admin table dictionary and NoteCraft view remain candidate schema, not deployed tables.

## Decisions

1. Invite links expire 24 hours after issue. `used_at` records only successful password setup. `invalidated_at` records revocation without claiming a successful use. A link is usable only while both timestamps are null and `expires_at` is in the future. Revoked or expired links give the same user-facing unusable-link result; the service must never report setup success for either.
2. Issue a replacement reset or invite link only after invalidating the previous unconsumed row of the same `(user_id, purpose)` in the same transaction. The partial unique index covers rows with `used_at IS NULL AND invalidated_at IS NULL`. Time expiry alone cannot be expressed in that index because the current time is not an immutable index predicate. The new token is stored only as a hash, with no token value in audit data.
3. A missing notification preference row means both channels enabled for that event. Reading settings does not create rows. The first save writes exactly the six supported event rows in one transaction; later saves replace the complete six-row set.
4. The first `super_admin` is created as a new account by an explicit, idempotent bootstrap command using an environment-provided credential or secure prompt, never a repository default. The command rejects an existing non-seeder account, so an already issued user session cannot gain `super_admin` through bootstrap. Re-running with the same seeder identity makes no change; a different identity fails visibly. The command creates the account and credential with `is_seeder=true`, `role=super_admin`, and `is_active=true` atomically. It does not use a data migration or ordinary admin API.
5. Seeder immutability must be enforced in both SQLite and PostgreSQL, with dialect-specific triggers at migration time. To preserve at least one active `super_admin`, a PostgreSQL write must serialize competing demotions/deactivations on a shared lock target before counting and writing; SQLite starts a write transaction with `BEGIN IMMEDIATE`. Counting in separate unconstrained transactions is unsafe under PostgreSQL write skew.

## Boundaries and follow-up

This change writes product/spec and candidate schema contracts only. It does not add bootstrap runtime, ORM, migration, or API. The next implementation change needs Red tests for link races and replacement, bootstrap retries, both-dialect seeder protection, and concurrent last-admin demotion. `FR-006b` mail-delivery failure semantics need an explicit delivery/commit protocol before runtime code is started; this design does not imply a distributed transaction with the mail provider.

Shared audit table D-4 and editable permission matrix D-9/D-10/D-12/D-13 remain separate architectural decisions; neither table shape is silently changed here.
