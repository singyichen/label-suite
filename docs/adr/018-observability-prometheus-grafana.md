# ADR-018: Observability Stack — Prometheus + Grafana

**Status**: Accepted
**Date**: 2026-05-29

## Context

Label Suite runs as a multi-service system: React frontend, FastAPI backend, Celery worker, PostgreSQL, Redis, and supporting background jobs. Once the project moves beyond local-only development, operators need a low-overhead way to answer:

- Is each service up and reachable?
- Are API latency and error rates increasing?
- Are Celery queues backing up or tasks failing?
- Are PostgreSQL and Redis under memory, connection, or storage pressure?
- Did a recent deployment introduce a measurable regression?

The project constraints are:

- Solo/small-team operation, so the monitoring stack must be simple to run with Docker Compose.
- Open-source and self-hostable tooling is preferred for thesis/demo reproducibility.
- Metrics must not expose user data, annotation contents, hidden test answers, or raw payloads.
- The stack should remain portable if production later moves from Docker Compose to managed services or Kubernetes.

### Candidates Evaluated

| Tool | Metrics | Dashboards | Alerting Path | Operations Overhead | Fit |
|------|:-------:|:----------:|:-------------:|:-------------------:|:---:|
| **Prometheus + Grafana** | Excellent | Excellent | Alertmanager | Medium | High |
| Grafana Cloud | Excellent | Excellent | Built-in | Low | Medium |
| Datadog / New Relic | Excellent | Excellent | Built-in | Low | Medium |
| ELK / OpenSearch stack | Logs-first | Good | Extra setup | High | Low |
| Docker Compose logs only | Poor | None | None | Low | Low |

**Grafana Cloud rejected as default**: Good hosted option, but it adds an external account, network dependency, and cost/retention considerations. It can be adopted later as a remote write target without changing application instrumentation.

**Datadog / New Relic rejected as default**: Strong SaaS products, but they are not ideal as the baseline for a reproducible academic/demo deployment. Cost and vendor lock-in are unnecessary at MVP stage.

**ELK / OpenSearch rejected for this ADR**: Useful for centralized logs, but it does not replace metrics-based alerting and adds substantial storage and tuning overhead. Log aggregation can be evaluated separately.

**Docker Compose logs only rejected**: Logs help debug known incidents, but they do not provide time-series dashboards, service-level indicators, or proactive alerts.

## Decision

Use **Prometheus** for metrics collection and alert rule evaluation, and **Grafana** for operational dashboards.

The baseline monitoring stack is:

```yaml
services:
  prometheus:
    # scrapes application and infrastructure metrics

  grafana:
    # dashboards backed by Prometheus datasource

  postgres-exporter:
    # PostgreSQL health, connections, and storage metrics

  redis-exporter:
    # Redis memory, keyspace, and command metrics
```

FastAPI and Celery must expose metrics through application instrumentation rather than ad hoc log parsing:

- FastAPI: request count, latency histogram, status-code counts, unhandled exception count, and readiness/health probe status.
- Celery: task count by state, task duration, retry count, failure count, and queue depth where available.
- PostgreSQL: connection count, lock/wait signals, transaction rate, database size, and slow-query indicators where available.
- Redis: memory usage, evictions, connected clients, command latency, and persistence status.

### Dashboard Scope

Create Grafana dashboards for:

- **Service Overview**: uptime, health probes, API error rate, p95 latency, and deployment/version labels.
- **Worker Queue**: Celery task throughput, failures, retries, queue depth, and task duration.
- **Database**: PostgreSQL connections, storage growth, locks, and query pressure.
- **Cache / Broker**: Redis memory, connected clients, evictions, and command rate.

### Alerting Scope

Prometheus alert rules should cover only actionable symptoms:

- API unavailable or readiness probe failing.
- Elevated 5xx error rate.
- Sustained p95 latency regression.
- Celery queue backlog above threshold.
- Celery task failure spike.
- PostgreSQL connection saturation or disk pressure.
- Redis memory pressure or eviction spike.

Alertmanager integration is approved as the next step when an actual notification channel is selected. Until then, alert rules can be validated in Prometheus and visualized in Grafana.

### Privacy and Data Safety

Metrics must be low-cardinality and non-sensitive:

- Do not include annotation text, uploaded dataset contents, user-entered labels, hidden answers, access tokens, or raw request bodies in metric labels.
- Do not label metrics by arbitrary user input or per-sample identifiers.
- User IDs, task IDs, dataset IDs, and submission IDs must not be used as Prometheus labels because they create high cardinality and can leak operationally sensitive activity patterns.

## Consequences

### Easier

- Operators get a standard dashboard surface for API, worker, database, and broker health.
- Prometheus fits the existing Docker Compose architecture and can later migrate to Kubernetes without changing the metrics model.
- Grafana dashboards are portable artifacts that can be versioned with the repository.
- Metrics-based alerting catches degraded service before users report failures.
- Open-source tooling keeps thesis/demo environments reproducible without SaaS dependencies.

### Harder

- Adds Prometheus, Grafana, and exporter containers to the operations stack.
- Application code must be intentionally instrumented and reviewed to avoid high-cardinality or sensitive metrics.
- Dashboards and alert thresholds require tuning with real workload data.
- Metrics do not replace logs or traces; debugging individual failures still requires service logs and, later, possibly distributed tracing.

## Deferred Decisions

- Centralized log aggregation: Loki, OpenSearch, or another logs backend.
- Distributed tracing: OpenTelemetry collector and trace storage.
- Notification routing: Alertmanager receiver choice, such as email, Slack, Discord, or incident tooling.
- Hosted metrics retention: Grafana Cloud, remote Prometheus storage, or cloud-provider monitoring.
