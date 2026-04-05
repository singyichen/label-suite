# ADR-013: Email Service — Resend

**Status**: Accepted
**Date**: 2026-04-05

## Context

The self-registration flow (spec 003) and the password reset flow (spec 004) require the system to send transactional emails to users:

- **Password reset**: user requests a reset link → system emails a one-time token URL valid for 30 minutes.

The original design avoided SMTP entirely to eliminate external service dependencies. However, that decision offloaded all password management onto Super Admin, creating an unacceptable operational burden (every forgotten password requires manual intervention).

### Candidates Evaluated

#### Option A — Resend (selected)

A developer-first transactional email API. Offers an official Python SDK, a free tier (3,000 emails/month, 100/day), and requires only a single `RESEND_API_KEY` environment variable.

#### Option B — Brevo (Sendinblue)

Standard SMTP relay. Free tier: 300 emails/day. Requires SMTP host/port/credential configuration. Heavier setup; credentials rotate less predictably.

#### Option C — Gmail SMTP

Binds the service to a personal Google account. Requires App Password with 2FA. Google may revoke access without notice. Not appropriate for production deployment.

#### Option D — No email (admin-managed reset)

Super Admin manually resets passwords via the user management page. Zero external dependency, but creates an unnecessary operational bottleneck for every forgotten password in a multi-user research lab environment.

## Decision

Use **Resend** as the sole transactional email provider.

- All outbound email (password reset links) routes through the Resend API.
- The Python backend calls `resend.Emails.send(...)` via the `resend` SDK.
- `RESEND_API_KEY` is stored as an environment variable; never hardcoded.
- The sender address is a verified domain address (`no-reply@<project-domain>`); during development, Resend's sandbox address (`onboarding@resend.dev`) may be used.
- Email volume for a research lab deployment is expected to be well under the free tier limit (< 100 emails/month in practice).

### Password Reset Flow

```
User → POST /auth/forgot-password (email)
     → Backend generates PasswordResetToken (UUID, expires 30 min, stored in DB)
     → Resend sends reset link: /reset-password?token=<UUID>
     → User clicks link → GET /reset-password (frontend validates token)
     → User submits new password → POST /auth/reset-password (token, new_password)
     → Backend validates token, updates hashed_password, invalidates token
     → Redirect to /login
```

## Consequences

### Easier
- Users can self-serve password resets without contacting Super Admin.
- No SMTP server infrastructure to maintain.
- Resend provides delivery logs and a web dashboard for debugging failed sends.
- Switching providers later requires only changing the SDK call — the reset token logic is provider-agnostic.

### Harder
- Adds one external SaaS dependency (`RESEND_API_KEY` must be provisioned before first deployment).
- Email deliverability depends on domain verification; misconfigured DNS records (SPF/DKIM) may cause messages to land in spam.
- Requires a `password_reset_tokens` table (or Redis TTL key) to store and expire tokens.

### Alternatives Rejected

| Option | Reason Rejected |
|--------|-----------------|
| Brevo / SendGrid | More configuration overhead; no meaningful advantage over Resend at this scale |
| Gmail SMTP | Tied to personal account; Google policy risk |
| Admin-only reset | Unacceptable operational burden; poor UX for a self-registration-first system |
