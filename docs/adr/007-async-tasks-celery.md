# ADR-007: Use Celery for Async Task Execution

**Status**: Accepted
**Date**: 2026-03-19

## Context

Evaluation scoring is the core compute-intensive operation of the system. When a user uploads a submission file, the system must:

1. Parse and validate the submission.
2. Load the (hidden) test-set answer file.
3. Compute one or more evaluation metrics (F1, accuracy, BLEU, etc.).
4. Write results to the database.
5. Update the leaderboard.

This pipeline can take from milliseconds to tens of seconds depending on dataset size and metric complexity. Executing it synchronously in a FastAPI request handler would block the server and degrade responsiveness for all concurrent users.

Key requirements:
- Non-blocking: submission API returns immediately with a task ID; scoring runs in the background.
- Retryable: transient errors (DB connection, file I/O) should not permanently fail a submission.
- Observable: task status (pending, running, success, failure) must be queryable via the API.
- Schedulable: future batch re-scoring or leaderboard refresh jobs.

### Candidates Evaluated

| Tool | Python Native | Retries | Scheduling | Result Backend | Maturity |
|------|:-------------:|:-------:|:----------:|:--------------:|:--------:|
| **Celery** | Yes | Native | celery-beat | Redis / DB | Very High |
| RQ (Redis Queue) | Yes | Manual | rq-scheduler | Redis | Medium |
| FastAPI BackgroundTasks | Yes | No | No | None | N/A |
| Dramatiq | Yes | Native | APScheduler | Redis / RabbitMQ | Medium |
| arq | Yes | Manual | Native | Redis | Low |

**FastAPI BackgroundTasks rejected**: Runs in the same process as the web server — a slow scoring job blocks worker threads. No retry, no persistence, no result backend.

**RQ rejected**: Simpler than Celery but lacks native retry policies, rate limiting, and task routing. Community is smaller and moving slower.

**Dramatiq rejected**: Technically sound but smaller ecosystem than Celery; less documentation for the specific FastAPI + Redis integration pattern.

## Decision

Use **Celery** with Redis as both broker and result backend.

```
Submission Upload
    │
    ▼
FastAPI endpoint validates file → enqueues scoring task → returns {"task_id": "..."}
    │
    ▼ (async, separate worker process)
Celery Worker
    ├── parse_submission()
    ├── load_answers()         ← test-set answers never leave the worker
    ├── compute_metrics()
    └── write_results() → PostgreSQL → leaderboard update
    │
    ▼
FastAPI GET /submissions/{id}/status → returns task state + result
```

Key configuration:
- Task routing: scoring tasks → `scoring` queue; housekeeping → `default` queue.
- Retry policy: max 3 retries, exponential backoff (60s, 180s, 540s).
- Task timeout: 300 seconds hard limit per scoring job.
- Result expiry: 24 hours in Redis result backend.
- `celery-beat` (future): scheduled leaderboard snapshots, stale submission cleanup.

## Consequences

### Easier
- Submission API is non-blocking — the HTTP response returns in milliseconds regardless of scoring complexity.
- Built-in retry with backoff prevents transient failures from permanently rejecting valid submissions.
- Celery's result backend (Redis DB 1) enables real-time task status polling without additional code.
- Test-set answers are accessed only inside the Celery worker process — they never pass through the FastAPI API layer, supporting the Data Fairness principle.
- `celery-beat` extends naturally to scheduled tasks (leaderboard snapshots, data export) without a separate cron service.
- Celery workers can be scaled horizontally by adding worker containers in Docker Compose.

### Harder
- Adds a Celery worker container to the Docker Compose stack — local development requires running `celery worker` in addition to `uvicorn`.
- Debugging failed tasks requires checking Celery logs and the Redis result backend separately.
- Celery configuration surface is large — incorrect serialization, concurrency, or timeout settings can cause subtle bugs.
- Task versioning: if the scoring task signature changes, in-flight tasks from the old version may fail after a deployment.
