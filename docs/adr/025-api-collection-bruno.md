# ADR-025: API Collection Tool — Bruno

**Status**: Accepted
**Date**: 2026-06-03

## Context

As the project grows, API endpoints need to be testable, shareable, and version-controlled alongside implementation code. Traditional tools like Postman store collections as opaque JSON blobs, which produce unreadable git diffs and cannot serve as living documentation readable by both humans and AI agents.

The project needs an API collection tool that:

- Stores each request as a plain-text, human-readable file
- Can be committed to git with meaningful per-endpoint diffs
- Allows frontend developers and AI agents to read API contracts directly from the repo without running the server
- Supports environment variables for local/staging switching without modifying request files

### Alternatives Considered

| Tool | Format | Git-Friendly | Open Source | Notes |
|------|--------|-------------|-------------|-------|
| **Bruno** | `.bru` plain-text DSL | ✅ per-request files | ✅ | Selected |
| Postman | Proprietary JSON blob | ❌ single-file diff | ❌ | Cloud-lock; unreadable diffs |
| Insomnia | YAML/JSON export | ⚠️ single-file export | ✅ (core) | Export-only; not commit-native |
| HTTPie | CLI flags | N/A — no collection | ✅ | No persistent collection |

## Decision

Use **Bruno** as the project API collection tool. Each endpoint has a dedicated `.bru` file committed under `backend/bruno/[module]/`.

### Collection Structure

```text
backend/
└── bruno/
    ├── bruno.json                     # Collection config (name, version)
    ├── environments/
    │   ├── local.bru                  # baseUrl = http://localhost:8000
    │   └── staging.bru                # baseUrl = https://staging.example.com
    └── [module]/                      # One folder per feature module
        └── [endpoint].bru             # One file per endpoint
```

### `.bru` File Convention

```bru
meta {
  name: [Endpoint Description]
  type: http
  seq: [sequence number within module]
}

[method] {
  url: {{baseUrl}}/api/v1/[module]/[resource]
  body: json
  auth: none
}

headers {
  Content-Type: application/json
}

# For unsafe methods (POST / PATCH / DELETE): add the Origin header to satisfy the
# CSRF trusted-origin check (Foundation Spec §Security). Remove for GET / HEAD.
# headers {
#   Content-Type: application/json
#   Origin: {{baseUrl}}
# }

body:json {
  {
    "field": "value"
  }
}

docs {
  [Brief description of what the endpoint does and the required system/task role.]

  Auth: httpOnly cookie session (ADR-021). Call POST /api/v1/auth/login first;
  Bruno stores the session cookie automatically and sends it on all subsequent requests.
  No Authorization header or token variable required.

  CSRF: POST / PATCH / DELETE requests must include the Origin header (see above)
  to pass the trusted-origin check on production-like CSRF settings.
}
```

### Enforcement

Foundation Spec FR-131 makes the Bruno update a hard pre-PR gate:

> A PR that modifies any file under `backend/app/modules/*/router.py` or `backend/app/api/routes/` must include a corresponding `.bru` file update under `backend/bruno/[module]/`. A PR diff that shows route changes without matching `bruno/` changes fails the gate. **Exception:** skeleton-only route PRs (placeholder endpoints with no business logic) may defer `.bru` creation to the subsequent `PR-FOUND-BRUNO` boundary; the PR description must carry the marker `FR-131-exempt: skeleton-only route`.
>
> **Schema/service contract changes:** A PR that modifies request or response shapes in `backend/app/schemas/` or service return types that alter the API contract should also update the corresponding `.bru` body/example-response blocks, even if no router file changed. This is a reviewer checklist item, not a hard automated gate.

The tasks template (`tasks-template.md`) includes:

- **T006b / T006c** in `PR-FOUND-BRUNO` (separate from `PR-FOUND-BE-API`): Bruno collection init + skeleton for all planned endpoints
- **T018b / T027b / …** in each `PR-USN-BE-API`: full Bruno update (body, auth cookie/session, example response) for every implemented endpoint

## Consequences

### Easier

- API documentation lives in git — PR reviewers can verify endpoint behavior from the diff without running the server.
- Frontend developers and AI agents read `.bru` files as living API contracts; no server setup required.
- Environment switching (local/staging/production) via environment files — no changes to request files.
- No Postman account, cloud sync, or subscription required; Bruno works fully offline.
- CI can run Bruno collections via `@usebruno/cli` to catch contract drift.

### Harder

- Team members must keep `.bru` files updated alongside every route change — enforced by FR-131 and code review.
- AI agents generating `.bru` files must follow the DSL convention strictly; malformed `.bru` files fail silently in the Bruno GUI.
- A new module requires creating its subfolder under `backend/bruno/` and registering it in `bruno.json`.
