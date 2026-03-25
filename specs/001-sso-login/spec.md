# Feature Specification: SSO Login

**Feature Branch**: `001-sso-login`
**Created**: 2026-03-25
**Status**: Draft
**Input**: User description: "先做一個簡單的登入畫面，需要串接google、github登入的sso功能"

## User Scenarios & Testing *(required)*

### User Story 1 - Sign In with Google or GitHub (Priority: P1)

A user (researcher or annotator) visits the LabelSuite portal and sees a clean login page.
They click either "Sign in with Google" or "Sign in with GitHub", complete OAuth flow in a popup/redirect,
and are authenticated and redirected to the dashboard.

**Why this priority**: Authentication is the entry gate to all features. Without login, nothing else is accessible. Google and GitHub are the two identity providers most familiar to the target audience (NLP researchers and engineers).

**Independent Test**: Can be fully validated by visiting `/login`, clicking a provider button, completing OAuth, and verifying redirection to `/dashboard` with a valid session.

**Acceptance Scenarios**:

1. **Given** an unauthenticated user on `/login`, **When** they click "Sign in with Google" and complete Google OAuth, **Then** they are redirected to `/dashboard` and a session token is stored.
2. **Given** an unauthenticated user on `/login`, **When** they click "Sign in with GitHub" and complete GitHub OAuth, **Then** they are redirected to `/dashboard` and a session token is stored.
3. **Given** a user who cancels or denies OAuth permission, **When** they are redirected back, **Then** they remain on `/login` with a clear error message.
4. **Given** an already authenticated user, **When** they navigate to `/login`, **Then** they are automatically redirected to `/dashboard`.

---

### User Story 2 - First-Time User Account Creation (Priority: P2)

A user who has never logged in before successfully authenticates via Google or GitHub.
The system automatically creates a new account using the provider's profile data (name, email, avatar)
without requiring any additional registration form.

**Why this priority**: Seamless onboarding is important, but the core login flow (P1) must work first. Auto-provisioning reduces friction for new users.

**Independent Test**: Can be validated by logging in with a new OAuth identity and verifying a user record is created in the database with correct profile data.

**Acceptance Scenarios**:

1. **Given** a first-time user who completes Google OAuth, **When** the callback is processed, **Then** a new user record is created with `name`, `email`, and `avatar_url` from Google profile.
2. **Given** a first-time user who completes GitHub OAuth, **When** the callback is processed, **Then** a new user record is created with `login`, `email` (if public), and `avatar_url` from GitHub profile.
3. **Given** a returning user (email already exists), **When** they log in again, **Then** no duplicate account is created; the existing account session is returned.

---

### User Story 3 - Protected Route Enforcement (Priority: P3)

Any unauthenticated user who attempts to access a protected page (e.g., `/dashboard`, `/tasks`) is
redirected to `/login` and returned to their original destination after successful authentication.

**Why this priority**: Route protection is a security requirement, but can be implemented after the login flow is confirmed working.

**Independent Test**: Can be validated by navigating to `/dashboard` without a session and verifying redirect to `/login?next=/dashboard`.

**Acceptance Scenarios**:

1. **Given** an unauthenticated user, **When** they navigate directly to `/dashboard`, **Then** they are redirected to `/login`.
2. **Given** a user redirected to `/login` from `/tasks`, **When** they successfully log in, **Then** they are returned to `/tasks`.

---

### User Story 4 - Sign Out (Priority: P2)

An authenticated user can sign out from anywhere in the application. After signing out,
their session is invalidated and they are redirected to `/login`. Accessing protected routes
after signing out requires re-authentication.

**Why this priority**: Logout is a basic security requirement, especially in shared or lab environments where multiple researchers may use the same machine.

**Independent Test**: Can be validated by logging in, clicking the logout button, verifying redirection to `/login`, and confirming that the previous session token is no longer accepted.

**Acceptance Scenarios**:

1. **Given** an authenticated user, **When** they click the "Sign Out" button, **Then** their JWT is invalidated and they are redirected to `/login`.
2. **Given** a user who has signed out, **When** they try to access `/dashboard` directly, **Then** they are redirected to `/login`.
3. **Given** a user who has signed out, **When** they use the browser back button to a cached protected page, **Then** the page does not display authenticated content (re-authenticates or shows login).

---

### Edge Cases

- What happens when the OAuth provider is temporarily unavailable? → Show a user-friendly error on the login page.
- What happens when a GitHub user has no public email? → Create account using GitHub username; email field remains null.
- What happens when the same email is linked to both Google and GitHub? → Treat as the same account (match by email).

## Requirements *(required)*

### Functional Requirements

- **FR-001**: The system MUST provide a `/login` page with "Sign in with Google" and "Sign in with GitHub" buttons.
- **FR-002**: The system MUST implement OAuth 2.0 authorization code flow for both Google and GitHub.
- **FR-003**: The system MUST issue a JWT session token upon successful authentication.
- **FR-004**: The system MUST auto-provision a user record on first login using provider profile data.
- **FR-005**: The system MUST redirect authenticated users away from `/login` to `/dashboard`.
- **FR-006**: The system MUST protect all non-login routes, redirecting unauthenticated access to `/login`.
- **FR-007**: The login page MUST be responsive and work on mobile browsers.
- **FR-008**: OAuth client credentials MUST be stored in environment variables, never hardcoded.
- **FR-009**: The system MUST provide a logout action (button/link) accessible from all authenticated pages.
- **FR-010**: On logout, the system MUST invalidate the JWT and clear any client-side session storage.

### Key Entities

- **User**: Represents an authenticated identity. Key attributes: `id`, `email`, `name`, `avatar_url`, `provider` (google | github), `provider_id`, `role` (annotator | researcher | admin), `created_at`.
- **Session / JWT**: Short-lived access token issued after OAuth callback. Contains `user_id`, `role`, `exp`.

## Success Criteria *(required)*

- **SC-001**: A user can complete the full login flow (click → OAuth → dashboard) in under 30 seconds.
- **SC-002**: No user credentials or tokens are exposed in API responses or frontend bundle.
- **SC-003**: Login page renders correctly on viewport widths 375px, 768px, and 1440px.
- **SC-004**: Unauthenticated requests to any protected route return HTTP 401 or redirect to `/login`.
- **SC-005**: First-time login creates exactly one user record; repeated logins do not create duplicates.
- **SC-006**: After logout, the invalidated JWT is rejected by all protected API endpoints (returns HTTP 401).
