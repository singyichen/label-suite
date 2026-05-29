# ADR-021: JWT Authentication and Refresh Token Strategy

**Status**: Accepted
**Date**: 2026-05-29

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
- `useAuthStore` (Zustand) holds decoded JWT claims in memory only — not persisted to `localStorage`.
- `SameSite=Lax` permits cookie on top-level navigations (e.g., link from email to task) while blocking cross-site POSTs.

## Consequences

### Easier

- XSS cannot steal tokens — `httpOnly` cookies are inaccessible to JavaScript.
- Annotators stay logged in across long sessions without re-auth prompts.
- Server-side refresh token table enables hard logout (token revocation is immediate).
- Refresh token rotation limits damage window if a refresh token is intercepted.
- `SameSite=Lax` mitigates CSRF for state-changing requests without requiring CSRF tokens.

### Harder

- Server must maintain the `refresh_tokens` table — introduces one stateful component.
- CORS configuration must include `credentials: true`; frontend `fetch`/`axios` calls must set `credentials: 'include'`.
- In local development, backend and frontend run on different ports — requires `SameSite=None; Secure` with HTTPS or a dev proxy (Vite proxy to same origin is the recommended approach).
- Refresh token reuse detection (rotation abuse) requires careful implementation to avoid false positives from concurrent tab refreshes.

## Referenced by

- [Constitution](../../specs/_governance/constitution.md) — Principle VII: Security-by-Default
- [ADR-003](003-backend-framework-fastapi.md) — FastAPI dependency injection used for `current_user`
- [ADR-011](011-frontend-source-structure.md) — `useAuthStore` Zustand store; `useTaskRole(taskId)` hook pattern
- `specs/account/001-login-email-password/` — first feature consuming this contract
