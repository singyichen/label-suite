# ADR-021: JWT Authentication and Refresh Token Strategy

**Status**: Accepted
**Date**: 2026-05-29
**Amended**: 2026-09-17 — the JWT `role` claim is display-only; authorization reads current role and active status from the database (issue #779)
**Amended**: 2026-10-06 — ADR-037 makes the current role check one input to permission-matrix authorization (issue #1160 D-9)
**Amended**: 2026-10-06 — issue #1160 token-family 3NF, per-request `sid`/credential checks, bounded grace reissue, and cross-database email identity
**Amended**: 2026-10-08 — issue #1160 session table/FK naming and explicit logout timestamp (planning contract only)

## Context

Label Suite requires stateless authentication across a FastAPI backend and React frontend. The system uses a dual-layer role model: a **system role** (`user` | `super_admin`) encoded in the JWT, and a **task role** (`project_leader` | `reviewer` | `annotator`) fetched on-demand from the `task_membership` API per task — never stored in the JWT.

Key requirements that drive the token strategy:

- Annotation sessions can be long (30–90 minutes continuous work); tokens must not expire mid-session.
- XSS risk from third-party scripts in the annotation workspace must be mitigated.
- The system is a research portal (not public-facing), so UX friction from frequent re-auth is a significant concern.
- Backend must not depend on process-local session state. Persisted token-family and revocation records are required for immediate logout and security-event invalidation.

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
  "sid": "<account_session.id>",
  "credential_version": 1,
  "role": "user | super_admin",
  "iat": 1234567890,
  "exp": 1234568790
}
```

Task role is **not** included in the JWT. The frontend fetches task membership via `GET /api/v1/tasks/{task_id}/membership` after entering a task page, using `useTaskRole(taskId)` (TanStack Query).

### Amendment (2026-09-17) — Role Claim Is Display-Only; Authorization Reads Current Role From the Database

Issue #779 identified a gap: the `role` claim above is encoded at login and stays valid for the full 15-minute access-token TTL. If an authorization check trusted that claim directly, a `super_admin` demoted to `user` — or an account disabled mid-session — would keep the old privileges (or continued access) on any request made with an already-issued access token, for up to 15 minutes. This violates Constitution Principle XV: "access must be revoked immediately on role removal" (`specs/_governance/constitution.md:196`).

**Decision (maintainer, 2026-09-17; extended 2026-10-06):** every authenticated request MUST re-read the caller's `role`, `is_active`, and `credential_version` from `users`, and the `sid` family row from `account_session`. The family must be unrevoked, its `user_id` must equal JWT `sub`, and its absolute lifetime must not have elapsed. Access JWT `exp` issued at login or refresh is capped at that same deadline. The JWT `role` claim is kept for **frontend display only** and MUST NOT be treated as authoritative by any backend authorization dependency.

The check lives in two layers so that no endpoint can skip it:

- `get_current_user` verifies JWT signature/expiry and decodes `sub`, `sid`, and `credential_version`; it loads `users` and `account_session` and raises `401` (`auth.token_invalid`) when the user is missing/inactive, version mismatches, family is missing/revoked/absolutely expired, or family owner differs from `sub`. Every authenticated endpoint depends on it, so logout, disabled accounts, high-risk credential changes, and the absolute deadline take effect on the next request.
- `require_role` builds on `get_current_user` and compares the freshly loaded `role` against the allowed set.

ADR-037 adds a stored role-permission matrix as a necessary input for operations with an activated key. The `require_role` factory below remains the current-role **hard gate**, including the `super_admin` boundary for admin routes; it is not a complete authorization decision. The server also checks the applicable current matrix cell and each operation's task/resource conditions. Unknown keys, absent rows and inactive task memberships deny. JWT and frontend role state never supply those facts.

```python
# app/core/deps.py
async def get_current_user(
    token: str = Depends(get_access_token_from_cookie),
    db: AsyncSession = Depends(get_db),
) -> User:
    claims = decode_access_token(token)  # verifies signature and exp
    user = await db.get(User, claims.sub)
    session = await db.get(AccountSession, claims.sid)
    if (user is None or not user.is_active
            or user.credential_version != claims.credential_version
            or session is None or session.revoked_at is not None
            or session.user_id != user.id
            or now_utc() >= session.started_at + REFRESH_TOKEN_ABSOLUTE_MAX_TTL):
        raise HTTPException(401, "auth.token_invalid")
    return user


def require_role(*allowed: UserRole) -> Callable[..., Awaitable[User]]:
    async def _dependency(user: User = Depends(get_current_user)) -> User:
        if user.role not in allowed:
            raise HTTPException(403, "auth.forbidden")
        return user

    return _dependency
```

`require_role` is a plain `def` factory: `Depends(require_role(UserRole.super_admin))` must receive the inner dependency function, not a coroutine. `get_access_token_from_cookie` and `decode_access_token` are illustrative names for the cookie-read and JWT-decode steps; the `auth.forbidden` i18n key does not exist yet and must be added to the account-001 i18n table (`specs/account/001-login-email-password/plan.md`, alongside `auth.token_invalid`) when the first role-gated endpoint is implemented.

`POST /auth/refresh` MUST apply the same `is_active` check before rotating the refresh token. Otherwise the frontend's silent refresh on `401` (see Frontend Behavior) would hand a disabled account a fresh access token.

**Cost:** one indexed primary-key read (`users.id`) per authenticated request. No caching layer is added up front; the backend has no auth endpoints to measure yet, so the read is not assumed to be free. If load testing against the Constitution Principle VIII target of "P95 response time ≤ 500ms" for core labeling and annotation APIs (`specs/_governance/constitution.md:117`) shows this read breaking that target, any cache introduced must still honor immediate revocation (e.g., invalidate on every role or `is_active` write) — a cache that lets a stale role survive would reopen issue #779.

**Rejected alternative — role/status token versioning (2026-09-17).** Bumping a version on every role change or enable/disable does not remove the DB read and creates a missed-bump risk. This rejection remains in force: role and active status are read from the DB on every request. The separate `credential_version` claim adopted in 2026-10-06 applies only to high-risk credential changes; it never replaces current role/status reads.

**Disabled accounts:** `is_active` is read from the database by `get_current_user` on every authenticated request and by `/auth/refresh`, never cached in the token or trusted from an earlier check in the same session. Disabling also revokes all token families; re-enabling does not revive them. This is the mechanism behind `specs/admin/006-user-management/spec.md` FR-008a and SC-008 once the backend is implemented.

### Refresh Token Store

`account_session` stores one login session: UUID `id`, `user_id` FK to `users`, non-null UTC `started_at`, nullable `revoked_at`, and nullable `logged_out_at`. `revoked_at` records invalidation for any reason. `logged_out_at` records only verifiable explicit logout, is written in the same transaction as `revoked_at`, and must not be later than it. `refresh_tokens` stores one issued token: UUID `id`, `session_id` FK to `account_session.id`, unique `token_hash`, `expires_at`, `revoked_at`, `revoked_reason`, and nullable `grace_reissued_at`. It does **not** duplicate session `user_id` or `started_at`. `users.credential_version` is a non-null integer; `users.hashed_password` may be null when no local password exists. `users` and `refresh_tokens`, and columns `role` and `is_active`, are explicit legacy naming exceptions to foundation FR-105; new tables use singular module-prefixed names.

These records are a planning contract for both SQLite quick-start and PostgreSQL production; no auth session table is deployed yet. This enables:

- Immediate invalidation on single-device logout by revoking that `sid` family, including already-issued access JWTs on the next request.
- Detection of refresh token reuse attacks: a rotated token reused after grace revokes all still-active families for that user.
- Audit trail for security incidents.

Every refresh, including a grace reissue, resolves the session through `session_id` and checks owner active, session not revoked, token unexpired, and `now < started_at + REFRESH_TOKEN_ABSOLUTE_MAX_TTL`. New token expiry is capped by that family limit; rotation and issuance are atomic. A token may use grace only if `revoked_reason='rotated'` and it is within 30 seconds of `revoked_at`. A conditional update requiring `grace_reissued_at IS NULL` grants exactly one extra issuance; a further in-window attempt returns `409 Conflict` without issuing a token or revoking other families. Other revocation reasons never have grace. The frontend waits at most 2 seconds for another tab's successful refresh signal, retries the original request once, and after a further 401 attempts refresh at most once more before redirecting to login.

Login and refresh also cap access JWT `exp` at the session absolute deadline. `get_current_user` checks that deadline on every request, including when a signed access JWT has not reached its own `exp`. Explicit logout first uses a valid access JWT `sid` to revoke the current session; if the access cookie is absent or expired, it may use a valid refresh token's `session_id`. A verifiable successful explicit logout writes the session's `revoked_at` and `logged_out_at` in the same transaction, then clears cookies. If neither credential is verifiable, it clears cookies and leaves `logged_out_at` unset without claiming that a server-side session was revoked. This preserves immediate single-device logout when the refresh cookie is missing but access remains valid. Security-event revocation, refresh-token reuse, and natural expiry never write `logged_out_at`; `revoked_at` alone is not proof of logout.

Password change atomically changes the hash, increments `credential_version`, and revokes other families, retaining the current one. The current device's old access JWT fails until silent refresh obtains a new-version JWT. Verified user email change, administrator email edit, successful password reset, and verified Google account linking atomically increment the version and revoke **all** families; Google linking also clears the local password hash per ADR-035. Single-device logout revokes only its family without incrementing the user-wide version. A failed transaction changes none of these facts. Security-event revocations leave `logged_out_at` unset.

Email is canonicalized with Unicode NFC and casefold before registration, invite, login, or email change comparison/write, then checked against the 254-character limit. `users.email` stores the canonical value; a DB `lower(email)` unique expression index supplies a second defense. SQLite and PostgreSQL must produce the same application-level identity result on ASCII and non-ASCII test cases; raw writes bypassing application canonicalization are invalid.

### Auth Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/auth/login` | POST | Issue access + refresh tokens via cookies |
| `/api/v1/auth/refresh` | POST | Rotate refresh token, reissue access token |
| `/api/v1/auth/logout` | POST | Revoke the current session using valid access `sid` or refresh `session_id`, record explicit logout in the same transaction, then clear cookies; without a verifiable credential, clear cookies only |
| `/api/v1/auth/me` | GET | Return current user profile (identity from JWT `sub`; `role` and profile read from the database — Amendment 2026-09-17) |

### Frontend Behavior

- On `401` response: frontend middleware calls `/auth/refresh` once silently, then retries the original request.
- On refresh failure (expired, revoked): redirect to `/login`. The bounded `409` coordination above applies only to grace-window contention.
- `useAuthStore` (Zustand) holds `userId` and `role` in memory only — not persisted to `localStorage`. Because the Access Token is stored in an `httpOnly` cookie (inaccessible to JavaScript), the `/login` and `/refresh` endpoints return `{ user_id, role }` in the JSON response body so the frontend can populate the store without decoding the cookie.
- `SameSite=Lax` permits cookie on top-level navigations (e.g., link from email to task) while blocking cross-site POSTs.

## Consequences

### Easier

- XSS cannot steal tokens — `httpOnly` cookies are inaccessible to JavaScript.
- Annotators stay logged in across long sessions without re-auth prompts.
- Persisted token-family revocation enables immediate hard logout for refresh and already-issued access tokens.
- Refresh token rotation limits damage window if a refresh token is intercepted.
- `SameSite=Lax` reduces some cross-site exposure; production unsafe methods still require the Origin/Referer check or CSRF token specified by foundation FR-117.
- Role demotion, account disablement, logout, and credential changes take effect on the next request, independent of the 15-minute access-token TTL (see both amendments).

### Harder

- Server must maintain the `refresh_tokens` table — introduces one stateful component.
- CORS configuration must include `credentials: true`; frontend `fetch`/`axios` calls must set `credentials: 'include'`.
- In local development, backend and frontend run on different ports — requires `SameSite=None; Secure` with HTTPS or a dev proxy (Vite proxy to same origin is the recommended approach).
- Refresh token reuse detection requires careful concurrency handling. **Chosen strategy (FR-075): bounded grace period.** A token revoked as `rotated` may issue one additional token within 30 seconds through an atomic claim; further in-window reuse returns `409`, while reuse after grace revokes all user families. The mutex strategy (`SELECT ... FOR UPDATE`) was considered but rejected because it adds waiting latency; the conditional claim and cross-database tests are required to bound the chosen grace strategy.
- Every authenticated endpoint pays one primary-key DB read per request (`get_current_user` in Amendment 2026-09-17, issue #779); privileged route handlers use the current-role hard gate plus ADR-037's matrix and resource checks, never a JWT-decoded `role` alone.

## Referenced by

- [Constitution](../../specs/_governance/constitution.md) — Principle VII: Security-by-Default
- [Constitution](../../specs/_governance/constitution.md) — Principle XV: Role-Based Access Control (immediate revocation on role removal; Amendment 2026-09-17)
- [ADR-003](003-backend-framework-fastapi.md) — FastAPI dependency injection used for `current_user`
- [ADR-011](011-frontend-source-structure.md) — `useAuthStore` Zustand store; `useTaskRole(taskId)` hook pattern
- `specs/account/001-login-email-password/` — first feature consuming this contract
- Issue #779 — role claim trust boundary correction (JWT `role` is display-only; authorization reads current role and active status from the database)
