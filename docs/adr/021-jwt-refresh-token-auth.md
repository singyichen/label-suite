# ADR-021: JWT Authentication and Refresh Token Strategy

**Status**: Accepted
**Date**: 2026-05-29
**Amended**: 2026-09-17 — the JWT `role` claim is display-only; authorization reads current role and active status from the database (issue #779)

## Context

Label Suite requires stateless authentication across a FastAPI backend and React frontend. The system uses a dual-layer role model: a **system role** (`user` | `super_admin`) encoded in the JWT, and a **task role** (`project_leader` | `reviewer` | `annotator`) fetched on-demand from the `task_membership` API per task — never stored in the JWT.

Key requirements that drive the token strategy:

- Annotation sessions can be long (30–90 minutes continuous work); tokens must not expire mid-session.
- XSS risk from third-party scripts in the annotation workspace must be mitigated.
- The system is a research portal (not public-facing), so UX friction from frequent re-auth is a significant concern.
- Backend must be stateless — no server-side session store.

### Storage Options Evaluated

| Option | XSS Risk | CSRF Risk | Complexity | Logout Certainty |
|--------|:--------:|:---------:|:----------:|:----------------:|
| `localStorage` (access token only) | High — any script can read | None | Low | Immediate |
| `httpOnly` cookie (access token) | None — JS cannot read | Moderate | Medium | Immediate |
| `httpOnly` cookie (refresh) + memory (access) | None | Moderate (refresh only) | Medium-High | Near-immediate |
| `httpOnly` cookie (both tokens) | None | Moderate | Low | Immediate |

**`localStorage` rejected**: Violates XSS risk requirement. Any injected script can exfiltrate the access token.

**Memory-only access token**: Access token lost on page refresh — forces silent refresh on every page load, acceptable for SPAs but adds latency visible to annotators.

### Token Expiry Tradeoffs

Short-lived access tokens (5–15 min) limit exposure window; long-lived refresh tokens (7–30 days) preserve session continuity. Sliding refresh (each use resets expiry) balances security and UX for a research portal.

## Decision

Use **httpOnly cookie** for both the access token and the refresh token, with the following parameters:

| Token | Expiry | Cookie Flags | Rotation |
|-------|--------|--------------|----------|
| Access Token (JWT) | 15 minutes | `httpOnly`, `Secure`, `SameSite=Lax` | Reissued on each refresh |
| Refresh Token (opaque UUID) | 7 days sliding | `httpOnly`, `Secure`, `SameSite=Lax` | Rotated on each use (one-time use) |

### JWT Payload

```json
{
  "sub": "<user_id>",
  "role": "user | super_admin",
  "iat": 1234567890,
  "exp": 1234568790
}
```

Task role is **not** included in the JWT. The frontend fetches task membership via `GET /api/v1/tasks/{task_id}/membership` after entering a task page, using `useTaskRole(taskId)` (TanStack Query).

### Amendment (2026-09-17) — Role Claim Is Display-Only; Authorization Reads Current Role From the Database

Issue #779 identified a gap: the `role` claim above is encoded at login and stays valid for the full 15-minute access-token TTL. If an authorization check trusted that claim directly, a `super_admin` demoted to `user` — or an account disabled mid-session — would keep the old privileges (or continued access) on any request made with an already-issued access token, for up to 15 minutes. This violates Constitution Principle XV: "access must be revoked immediately on role removal" (`specs/_governance/constitution.md:196`).

**Decision (maintainer, 2026-09-17):** every authorization check that depends on system role — including whether the account is still active — MUST re-read `role` and `is_active` from the `users` table on each privileged request. The JWT `role` claim is kept in the payload for **frontend display only** (e.g., conditionally rendering the admin nav item without an extra round trip) and MUST NOT be treated as authoritative by any backend authorization dependency.

```python
# app/core/deps.py
async def require_role(*allowed: UserRole):
    async def _dependency(
        user_id: UUID = Depends(get_current_user_id),  # decoded from JWT `sub` only
        db: AsyncSession = Depends(get_db),
    ) -> User:
        user = await db.get(User, user_id)
        if user is None or not user.is_active:
            raise HTTPException(401, "auth.token_invalid")
        if user.role not in allowed:
            raise HTTPException(403, "auth.forbidden")
        return user
    return _dependency
```

`get_current_user` (used by endpoints that only need to know *who* is calling, such as `GET /auth/me`) is unaffected — it still identifies the caller from the JWT `sub` and does not gate on role.

**Cost:** one indexed primary-key read (`users.id`) per privileged request. Label Suite is a research portal (not public-facing) at thesis/demo scale — see this ADR's Context — so the added read has no documented performance requirement to satisfy and does not warrant a caching layer.

**Rejected alternative — token versioning.** Add a `token_version` (or `role_version`) claim to the JWT, bumped on the `users` row on every role change or enable/disable, and compare it against the DB value on each privileged request. This gives the same immediate-revocation guarantee but still requires a DB read on every privileged request to fetch the current version — so it does not remove the read this decision already pays for — while adding a new column and an invalidation-on-write rule that every role/status mutation must remember to apply. A missed version bump would silently reopen the exact vulnerability this amendment closes. Not chosen (2026-09-17).

**Disabled accounts:** the same rule applies verbatim — `is_active` must be read from the database on every privileged request, never cached in the token or trusted from an earlier check in the same session. This closes the equivalent window for `specs/admin/006-user-management/spec.md` FR-008 / SC-008 (disable/enable flows) once their backend is implemented.

### Refresh Token Store

Refresh tokens are stored server-side in the `refresh_tokens` table (PostgreSQL) with `user_id`, `token_hash`, `expires_at`, `revoked_at`. This enables:

- Immediate invalidation on logout (row soft-deleted).
- Detection of refresh token reuse attacks (if a rotated token is reused, revoke all tokens for that user).
- Audit trail for security incidents.

### Auth Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/auth/login` | POST | Issue access + refresh tokens via cookies |
| `/api/v1/auth/refresh` | POST | Rotate refresh token, reissue access token |
| `/api/v1/auth/logout` | POST | Revoke refresh token, clear cookies |
| `/api/v1/auth/me` | GET | Return current user profile from JWT |

### Frontend Behavior

- On `401` response: frontend middleware calls `/auth/refresh` once silently, then retries the original request.
- On refresh failure (expired, revoked): redirect to `/login`.
- `useAuthStore` (Zustand) holds `userId` and `role` in memory only — not persisted to `localStorage`. Because the Access Token is stored in an `httpOnly` cookie (inaccessible to JavaScript), the `/login` and `/refresh` endpoints return `{ user_id, role }` in the JSON response body so the frontend can populate the store without decoding the cookie.
- `SameSite=Lax` permits cookie on top-level navigations (e.g., link from email to task) while blocking cross-site POSTs.

## Consequences

### Easier

- XSS cannot steal tokens — `httpOnly` cookies are inaccessible to JavaScript.
- Annotators stay logged in across long sessions without re-auth prompts.
- Server-side refresh token table enables hard logout (token revocation is immediate).
- Refresh token rotation limits damage window if a refresh token is intercepted.
- `SameSite=Lax` mitigates CSRF for state-changing requests without requiring CSRF tokens.
- Role demotion and account disablement take effect on the very next request, independent of the 15-minute access-token TTL — satisfies Constitution Principle XV without any token-invalidation infrastructure (see Amendment 2026-09-17, issue #779).

### Harder

- Server must maintain the `refresh_tokens` table — introduces one stateful component.
- CORS configuration must include `credentials: true`; frontend `fetch`/`axios` calls must set `credentials: 'include'`.
- In local development, backend and frontend run on different ports — requires `SameSite=None; Secure` with HTTPS or a dev proxy (Vite proxy to same origin is the recommended approach).
- Refresh token reuse detection (rotation abuse) requires careful implementation to avoid false positives from concurrent tab refreshes. **Chosen strategy (FR-075): grace period.** A revoked refresh token that falls within `REFRESH_TOKEN_GRACE_PERIOD` (default 30 s) is treated as valid and re-issues a new token without triggering full revocation. This prevents false-positive session termination when two browser tabs race to refresh simultaneously — the typical pattern for a research portal with long annotation sessions. The mutex strategy (`SELECT ... FOR UPDATE`) was considered but rejected because blocking concurrent requests adds latency and the grace window is short enough to limit the exposure of a stolen refresh token.
- Every system-role-gated endpoint pays one extra DB read per request (`require_role` in Amendment 2026-09-17, issue #779); route handlers must use that dependency, not a JWT-decoded `role`, for any privileged check.

## Referenced by

- [Constitution](../../specs/_governance/constitution.md) — Principle VII: Security-by-Default
- [Constitution](../../specs/_governance/constitution.md) — Principle XV: Role-Based Access Control (immediate revocation on role removal; Amendment 2026-09-17)
- [ADR-003](003-backend-framework-fastapi.md) — FastAPI dependency injection used for `current_user`
- [ADR-011](011-frontend-source-structure.md) — `useAuthStore` Zustand store; `useTaskRole(taskId)` hook pattern
- `specs/account/001-login-email-password/` — first feature consuming this contract
- Issue #779 — role claim trust boundary correction (JWT `role` is display-only; authorization reads current role and active status from the database)
