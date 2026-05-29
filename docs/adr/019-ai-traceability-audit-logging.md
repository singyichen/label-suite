# ADR-019: AI Traceability and Audit Logging

**Status**: Accepted
**Date**: 2026-05-29

## Context

ADR-017 defines the three-layer agent architecture: Planner, Generator, and Evaluator. ADR-018 defines operational metrics through Prometheus and Grafana. These decisions make the system easier to operate, but they do not explain why a specific AI-assisted action produced a specific outcome.

For AI-assisted workflows, Label Suite needs traceability at the run level:

- Which user initiated the AI run?
- Which task, dataset, spec, or artifact was affected?
- Which model, prompt version, tool calls, and inputs were used?
- What did the Planner, Generator, and Evaluator produce?
- Which deterministic verification commands passed or failed?
- Was the AI output accepted, edited, rejected, or superseded?
- Can a future maintainer reconstruct the decision path without exposing sensitive data?

This is separate from metrics observability. Prometheus can show that an AI task failed more often or became slower, but it should not store prompts, tool outputs, annotation text, dataset rows, or decision records.

The project constraints are:

- AI trace records must support engineering debugging, thesis reproducibility, and accountability.
- Audit logs must not expose hidden test answers, raw annotation payloads, access tokens, or unnecessary user data.
- Trace data must be structured and queryable, not scattered across console logs.
- The approach must work with the existing FastAPI, Celery, PostgreSQL, Redis, and Docker Compose architecture.
- Traceability must preserve the config-driven architecture rule: adding new task types must not require new hardcoded AI trace logic.

### Candidates Evaluated

| Option | Trace Detail | Queryability | Privacy Control | Operations Overhead | Fit |
|--------|:------------:|:------------:|:---------------:|:-------------------:|:---:|
| **Structured audit tables + object snapshots** | High | High | High | Medium | High |
| Append-only JSONL files | Medium | Low | Medium | Low | Medium |
| OpenTelemetry traces only | Medium | Medium | Medium | Medium | Medium |
| Prometheus labels / metrics | Low | Medium | Poor | Low | Low |
| Console logs only | Low | Low | Poor | Low | Low |

**Append-only JSONL rejected as the primary store**: Simple to write, but difficult to query by task, user, model, status, or time range. It can be useful for exports or backups, not as the canonical audit source.

**OpenTelemetry traces rejected as the primary store**: Good for distributed request tracing, but not sufficient for durable AI audit records, prompt/version lineage, or reviewer-facing history. It can be added later to correlate service spans with AI run IDs.

**Prometheus metrics rejected for trace content**: Prometheus is designed for low-cardinality numeric time-series. Storing prompts, IDs, or per-run details in metric labels would create high cardinality and privacy risk.

**Console logs rejected**: Logs are operational evidence, not a reliable audit record. They are easy to lose, redact inconsistently, and cannot support product-level trace history.

## Decision

Create a first-class **AI traceability and audit logging layer** backed by PostgreSQL structured records, with optional object storage for larger redacted snapshots.

Each AI-assisted workflow must create an `ai_run` record and append immutable lifecycle events. The run ID becomes the correlation key across API logs, Celery tasks, evaluator output, and operational metrics.

### Core Data Model

Use structured tables with append-only event semantics:

```text
ai_runs
  id
  initiated_by_user_id
  workflow_type
  subject_type
  subject_id
  status
  model_provider
  model_name
  prompt_version
  config_hash
  input_snapshot_ref
  output_snapshot_ref
  evaluator_summary
  created_at
  completed_at

ai_run_events
  id
  ai_run_id
  sequence_number
  layer
  event_type
  actor_type
  event_payload
  created_at

ai_tool_calls
  id
  ai_run_id
  event_id
  tool_name
  input_ref
  output_ref
  status
  error_code
  duration_ms
  created_at
```

`workflow_type` and `subject_type` must be config-driven enum values or registry entries, not hardcoded per task type. Examples:

- `workflow_type`: `spec_generation`, `task_config_review`, `dataset_quality_summary`, `annotation_guidance`, `evaluation_explanation`
- `subject_type`: `spec`, `task`, `dataset`, `annotation_batch`, `submission`, `pull_request`

### Required Trace Events

Every AI run must record these lifecycle events when applicable:

- `run.created`
- `planner.started`
- `planner.completed`
- `generator.started`
- `generator.completed`
- `evaluator.started`
- `evaluator.completed`
- `tool.called`
- `tool.completed`
- `tool.failed`
- `user.accepted`
- `user.edited`
- `user.rejected`
- `run.completed`
- `run.failed`
- `run.superseded`

For ADR-017 three-layer workflows, each layer boundary must be explicit. Planner output, Generator output, and Evaluator result are distinct artifacts. The Evaluator result must include deterministic verification status, such as pytest, mypy, ruff, TypeScript, or Playwright outcomes when used.

### Snapshot Strategy

Store small structured metadata directly in PostgreSQL. Store larger text artifacts as redacted snapshots referenced by `input_snapshot_ref` and `output_snapshot_ref`.

Snapshots may include:

- prompt template ID and rendered prompt hash
- model parameters
- config version or hash
- redacted tool input/output
- generated spec/task/config draft
- evaluator command summary and failure excerpts

Snapshots must not include:

- hidden test-set answers
- raw access tokens, API keys, cookies, or session identifiers
- raw annotation text unless the workflow explicitly requires it and the content is redacted or access-controlled
- arbitrary uploaded dataset rows by default
- full raw request bodies

### Correlation with Observability

ADR-018 remains the metrics layer. ADR-019 adds trace identity.

Prometheus metrics may include low-cardinality labels such as:

- `workflow_type`
- `layer`
- `status`
- `model_provider`

Prometheus metrics must not include:

- `ai_run_id`
- user IDs
- task IDs
- dataset IDs
- prompt text
- sample IDs
- annotation content

Use `ai_run_id` in structured logs and audit tables for debugging correlation. Do not use it as a Prometheus label.

### Retention and Access Control

AI traces are audit records and must have explicit retention rules:

- Keep structured run metadata longer than large snapshots.
- Allow deletion or redaction of sensitive snapshots without deleting the run metadata.
- Restrict trace detail access by role; not every user who can see a task can inspect prompts, tool outputs, or evaluator internals.
- Record who viewed or exported sensitive trace snapshots if trace inspection becomes a product feature.

Default access:

| Role | Access |
|------|--------|
| `super_admin` | Full trace metadata and permitted snapshots |
| `project_leader` | Project-scoped trace metadata and redacted snapshots |
| `reviewer` | Trace summaries relevant to assigned review workflows |
| `annotator` | No AI trace internals by default |

### Implementation Guidelines

- Create the `ai_run` record before invoking any model or tool.
- Pass `ai_run_id` through FastAPI request context, Celery task kwargs, structured logs, and evaluator outputs.
- Treat audit events as append-only. Corrections must be represented as new events, not in-place mutation.
- Store prompt templates with stable version identifiers so old runs can be interpreted later.
- Record model name and provider exactly as used at runtime.
- Record failure reasons in structured fields plus short redacted excerpts where useful.
- Do not use debug `print` or `console.log` as a substitute for audit events.
- Do not add task-type-specific trace code inside core AI orchestration. Use workflow registry metadata and config schemas.

## Consequences

### Easier

- AI-assisted changes become explainable after the fact.
- Maintainers can correlate user reports with AI run metadata, tool calls, and evaluator outcomes.
- ADR-017's Planner / Generator / Evaluator boundaries become auditable system events rather than process notes.
- ADR-018 metrics can point to a failing workflow type while ADR-019 records explain individual run behavior.
- Sensitive AI artifacts can be redacted or retained separately from durable run metadata.

### Harder

- Adds database schema, retention policy, and access-control work.
- Every AI workflow must consistently create and propagate `ai_run_id`.
- Prompt and snapshot redaction must be actively maintained.
- Storage can grow quickly if large prompts, tool outputs, or generated artifacts are retained without limits.
- Product UI for inspecting traces must be designed carefully to avoid exposing sensitive data.

## Deferred Decisions

- Exact snapshot storage backend: PostgreSQL JSONB, local object storage, S3-compatible storage, or encrypted file store.
- Whether to adopt OpenTelemetry spans for service-level correlation with `ai_run_id`.
- Whether to expose an admin UI for AI trace inspection in the first implementation.
- Exact retention periods by environment and data sensitivity class.
- Export format for thesis reproducibility packages.

## Relationship to Other ADRs

- [ADR-010](010-config-driven-architecture.md): AI trace workflow types must remain config-driven and must not introduce task-type-specific core logic.
- [ADR-017](017-three-layer-agent-architecture.md): Planner, Generator, and Evaluator boundaries are mandatory trace events for agent-driven implementation workflows.
- [ADR-018](018-observability-prometheus-grafana.md): Metrics show aggregate health; AI trace records explain individual runs.
