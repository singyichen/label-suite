# ADR-028: CI Security Scanning Strategy

**Status**: Accepted
**Date**: 2026-06-11

## Context

The project constitution and `.claude/rules/general.md` define hard security prohibitions (no `allow_origins=["*"]`, no hardcoded secrets), and the CI pipeline already runs `pip-audit --fail-on high` for backend dependencies ([ci.yml](../../.github/workflows/ci.yml) `backend-security` job) — but that job was never documented in an ADR, and the frontend has no equivalent dependency audit. Meanwhile, the broader question "should we scan OSS dependencies and run black-box testing?" was raised (2026-06-11) and needs a recorded decision so it is not re-litigated later.

The threat model for this project (a thesis demo, not an internet-facing production service) has two realistic risks:

1. **Known CVEs in OSS dependencies** the project pulls in (supply chain / SCA).
2. **Project code violating its own security prohibitions** (SAST) — currently enforced only by agent self-discipline, which violates the Ratchet Principle (rules must become machine-enforced gates).

### Alternatives Considered

| Approach | Layer | Cost | Verdict |
|----------|-------|------|---------|
| **`pip-audit` (backend SCA)** | Dependency CVEs | Already running | Keep — documented here |
| **`pnpm audit` (frontend SCA)** | Dependency CVEs | ~20 lines of CI, dormant until frontend exists | **Adopt now** |
| **Semgrep (SAST)** | Own-code security patterns | Needs ruleset selection/tuning | **Adopt — implementation deferred** until backend code exists |
| DAST (e.g. OWASP ZAP) | Deployed-app black-box scanning | Requires a deployed environment + maintenance | **Reject for now** — no exposed attack surface yet |
| API fuzzing (e.g. Schemathesis) | Black-box property testing against OpenAPI | Low once API exists; speculative today | **Defer** — revisit when the FastAPI OpenAPI schema is stable |
| Functional black-box testing (Playwright E2E) | User-journey level | Already planned in SDD pipeline | Out of scope — covered by ADR-009 / ADR-012 |

## Decision

Adopt a two-layer CI security scanning strategy: **SCA on both ends now, SAST when application code exists.**

### 1. SCA — dependency audit (both ends)

- **Backend**: keep the existing `backend-security` job — `uv run pip-audit --desc --fail-on high` against production dependencies only (`uv sync --no-dev`).
- **Frontend**: add a symmetric `frontend-security` job — `pnpm audit --prod --audit-level high`. The job follows the existing conditional pattern (skipped until `frontend/package.json` exists), so it is added now and activates automatically when frontend development begins.
- Severity threshold is **high** on both ends: moderate/low advisories are noise for a demo project; critical/high CVEs fail the build.

### 2. SAST — Semgrep (adopted, implementation deferred)

Semgrep is adopted in principle but **not yet wired into CI**, because ruleset selection is only meaningful once backend code exists. When the first backend module lands, add a `semgrep` CI job that covers at minimum:

- The project prohibitions: `allow_origins=["*"]` in CORS config, hardcoded API keys/secrets.
- A baseline registry ruleset (e.g. `p/python`, `p/typescript`) — exact selection decided at implementation time.

### 3. Explicitly not adopted (revisit conditions)

- **DAST / penetration scanning**: revisit only if the application is deployed to an internet-reachable environment beyond local/demo use.
- **API fuzzing (Schemathesis)**: revisit after the Foundation backend API is implemented and the OpenAPI schema stabilizes; it pairs naturally with FastAPI's generated schema.

## Consequences

### Easier

- Frontend dependency CVEs fail CI the moment the frontend exists — no one has to remember to add the job later.
- Security prohibitions move from documentation (CLAUDE.md) toward machine enforcement, consistent with the Ratchet Principle.
- The "scan OSS / black-box testing" question has a recorded answer with revisit conditions, preventing repeated re-evaluation.

### Harder

- `pnpm audit` has a higher false-positive rate than `pip-audit` (npm advisory DB includes many unexploitable transitive findings); if noise becomes a problem, scope it with `--prod` (already done) or per-advisory ignores in `package.json` — never by lowering the severity threshold.
- A high-severity CVE with no released fix blocks CI; the escape hatch is a per-advisory ignore with a linked tracking issue, decided case-by-case in review.
- Semgrep adoption is deferred, so until it lands the prohibitions remain agent-enforced only.
