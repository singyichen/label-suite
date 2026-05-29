# ADR-020: Application Error Tracking — Sentry

**Status**: Accepted
**Date**: 2026-05-29

## Context

ADR-018 defines aggregate operational metrics with Prometheus and Grafana. ADR-019 defines durable AI run traceability and audit logging. These layers answer important questions, but they do not provide a focused developer workflow for debugging application exceptions:

- Which frontend release introduced a browser error?
- Which backend endpoint raised an unhandled exception?
- Which Celery task failed repeatedly, with what stack trace?
- Which source file and line caused a minified frontend error?
- Are new errors grouped, assigned, and resolved across releases?

Label Suite needs an error tracking layer that sits between raw logs and aggregate metrics. It must capture stack traces and release context without becoming the canonical audit store or a metrics database.

The project constraints are:

- The system contains React + Vite frontend code, FastAPI backend code, and Celery worker tasks.
- Error reports must never expose hidden test answers, annotation text, raw dataset rows, access tokens, cookies, prompts, or full request bodies.
- Source maps are useful for frontend debugging, but they must not be publicly exposed by the static frontend server.
- The selected tool should require minimal operational overhead for the MVP and thesis/demo phase.
- Self-hosting should remain possible later, but should not be required at the start.

### Candidates Evaluated

| Tool | Frontend Errors | Backend / Celery Errors | Source Maps | Operations Overhead | Fit |
|------|:---------------:|:-----------------------:|:-----------:|:-------------------:|:---:|
| **Sentry** | Excellent | Excellent | Excellent | Low to Medium | High |
| GlitchTip | Good | Good | Good | Medium | Medium |
| Rollbar | Good | Good | Good | Low | Medium |
| OpenTelemetry collector only | Low | Medium | N/A | Medium | Low |
| Logs only | Poor | Medium | N/A | Low | Low |

**GlitchTip rejected as default**: It is Sentry-compatible and self-hostable, but Sentry has broader SDK documentation, release tooling, and source map support. It remains a viable future alternative if hosted Sentry is not acceptable.

**Rollbar rejected as default**: It provides mature error tracking, but Sentry has stronger ecosystem fit for the current React, FastAPI, and Celery stack.

**OpenTelemetry collector only rejected**: Useful for distributed tracing, but it does not replace issue grouping, release regression tracking, frontend source map workflows, or developer triage.

**Logs only rejected**: Logs are necessary but insufficient for frontend error grouping, source-mapped stack traces, release regression tracking, and assignment workflows.

## Decision

Adopt **Sentry** as the application error tracking layer for React frontend, FastAPI backend, and Celery worker errors.

Sentry is responsible for:

- grouping unhandled exceptions into issues
- capturing stack traces and release/environment metadata
- tracking frontend errors with uploaded source maps
- capturing backend and Celery task failures
- showing whether an error is new, regressed, resolved, or release-specific

Sentry is not responsible for:

- aggregate service health dashboards, queue backlog, or database pressure: use ADR-018
- durable AI run lineage, prompts, tool calls, or evaluator history: use ADR-019
- centralized log storage: deferred from ADR-018
- product audit trails or user-visible decision history

### Deployment Choice

Use hosted Sentry by default during MVP and thesis/demo development.

Self-hosted Sentry is allowed later only if compliance, data residency, or budget requirements justify the added operational complexity. If self-hosting is selected later, create a new ADR or supersede this one with deployment-specific details.

### Instrumentation Scope

Frontend:

- Install and configure the React SDK.
- Set `environment` and `release`.
- Upload production source maps during CI/CD.
- Ensure `.js.map` files are not publicly served after upload.
- Use an error boundary for top-level React rendering failures.

Backend:

- Install and configure the Python SDK in FastAPI startup.
- Capture unhandled request exceptions.
- Set `environment`, `release`, and `service=backend`.
- Attach request route pattern, method, and status where safe.

Worker:

- Enable Sentry for Celery worker tasks.
- Set `service=worker`.
- Capture task failure, retry, and timeout context where safe.
- Include low-risk task metadata such as task name and workflow type.

### Allowed Tags and Context

Allowed tags:

- `environment`
- `release`
- `service`
- `workflow_type`
- `task_type`
- `route_name`
- `celery_task_name`
- `error_boundary`

Allowed context fields:

- `ai_run_id` when needed to correlate with ADR-019 audit records
- redacted request ID
- redacted Celery task ID
- browser name and version
- frontend route name
- deployment version

Do not use high-cardinality or sensitive values as tags. If an identifier is needed for debugging, put it in context only after confirming it is non-sensitive or redacted.

### Data Safety Rules

Sentry event payloads must be scrubbed before leaving the application boundary.

Never send:

- hidden test-set answers
- raw annotation text
- uploaded dataset rows
- user-entered labels or free-text responses
- raw prompts or full AI model responses
- access tokens, API keys, cookies, auth headers, or session identifiers
- raw request or response bodies
- database connection strings
- full file contents

Required safeguards:

- Configure `before_send` / event processors to redact sensitive keys and payload fields.
- Disable or strictly limit request body capture.
- Disable sending personally identifiable information unless explicitly approved by a future privacy decision.
- Keep breadcrumbs useful but bounded; remove payload-heavy or sensitive breadcrumbs.
- Review Sentry events in staging before enabling production reporting.

### Relationship with AI Traceability

When an exception occurs inside an AI workflow:

- Sentry captures the exception and stack trace.
- ADR-019 audit tables remain the canonical record for AI prompt/version/tool/evaluator history.
- The Sentry event may include `ai_run_id` as redacted context to help jump from an exception to the audit record.
- Sentry must not store full prompts, tool outputs, hidden answers, or generated audit snapshots.

### Release and Source Map Policy

Frontend source maps must be uploaded to Sentry as release artifacts during production build or CI.

Production deployment must either:

- delete `.js.map` files after upload, or
- configure the static server to deny public access to source map files.

Source map upload tokens must be stored only in CI or local secret storage. They must not be committed to the repository.

## Consequences

### Easier

- Frontend, backend, and worker exceptions are grouped into actionable issues.
- Minified frontend stack traces become readable through source maps.
- Release regression tracking helps identify which deployment introduced an error.
- Celery task failures become easier to triage than reading worker logs alone.
- Sentry complements Prometheus alerts: Prometheus shows the symptom, Sentry shows the exception.

### Harder

- Adds SDK configuration to frontend, backend, and worker services.
- Source map upload must be integrated into CI/CD and protected from public exposure.
- Event scrubbing must be actively maintained as request schemas and AI workflows evolve.
- Hosted Sentry sends error metadata to a third-party service, requiring privacy review before production use.
- Self-hosted Sentry remains operationally heavier than the current Docker Compose baseline.

## Deferred Decisions

- Exact Sentry plan and organization/project structure.
- Whether production uses hosted Sentry or self-hosted Sentry.
- Whether to enable performance tracing or session replay; both require separate privacy review.
- Whether Sentry alerts should page operators directly or feed into Alertmanager / another incident channel.
- Exact retention policy for Sentry events in production.

## Relationship to Other ADRs

- [ADR-018](018-observability-prometheus-grafana.md): Prometheus and Grafana remain the metrics and dashboard baseline.
- [ADR-019](019-ai-traceability-audit-logging.md): Sentry can link to AI audit records through `ai_run_id`, but must not become the AI audit store.
