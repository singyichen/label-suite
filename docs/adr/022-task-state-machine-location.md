# ADR-022: Task State Machine Implementation Location

**Status**: Accepted
**Date**: 2026-05-29
**Amended**: 2026-08-19 — `official_run_in_progress → completed` pre-conditions strengthened (issue #190, decision D2)

## Context

Label Suite defines a five-state task lifecycle:

```
draft → dry_run_in_progress → waiting_iaa_confirmation → official_run_in_progress → completed
```

Each transition has pre-conditions (e.g., minimum annotators assigned, IAA threshold met) and side effects (e.g., Celery task dispatch, audit log entry via `RunStateTransition`). The question is: **where should transition validation and execution logic live?**

### Options Evaluated

#### Option A — ORM Model Layer (`Task` model method)

Transition logic as methods on the SQLAlchemy `Task` model:

```python
class Task(Base):
    def publish_dry_run(self, triggered_by: UUID) -> None:
        if self.status != TaskStatus.DRAFT:
            raise InvalidTransitionError(...)
        self.status = TaskStatus.DRY_RUN_IN_PROGRESS
        # side effects inline
```

**Problem**: SQLAlchemy models are persistence models, not domain objects. Embedding Celery dispatch, IAA threshold checks, and audit logging in the ORM layer creates hidden dependencies on infrastructure (Celery, DB session, email service) that are impossible to unit-test without a full database.

#### Option B — Route Handler (inline in `tasks.py` router)

Transition logic directly in the FastAPI route:

```python
@router.post("/tasks/{task_id}/publish-dry-run")
async def publish_dry_run(task_id: UUID, db: AsyncSession = Depends(get_db)):
    task = await db.get(Task, task_id)
    if task.status != TaskStatus.DRAFT:
        raise HTTPException(422, ...)
    task.status = TaskStatus.DRY_RUN_IN_PROGRESS
    # side effects inline
    await db.commit()
```

**Problem**: Route handlers are transport layer. Business logic in the router cannot be reused by Celery tasks, admin commands, or test fixtures without spinning up an HTTP client.

#### Option C — Service Layer (`task_service.py`) — Selected

Transition logic in a dedicated service function:

```python
# app/services/task_service.py
async def transition_task_status(
    db: AsyncSession,
    task_id: UUID,
    target_status: TaskStatus,
    triggered_by: UUID,
) -> Task:
    task = await get_task_or_404(db, task_id)
    validate_transition(task.status, target_status)  # raises InvalidTransitionError
    await check_preconditions(db, task, target_status)
    task.status = target_status
    await record_transition(db, task_id, task.status, target_status, triggered_by)
    await dispatch_side_effects(task, target_status)  # Celery, notifications
    await db.commit()
    return task
```

**Advantages**:
- Callable from route handlers, Celery callbacks, and test fixtures without HTTP overhead.
- Each concern is a separate, testable function (`validate_transition`, `check_preconditions`, `record_transition`, `dispatch_side_effects`).
- `RunStateTransition` audit record is created inside the same DB transaction as the status update — atomicity guaranteed.

## Decision

Implement task state machine logic exclusively in the **service layer** (`app/services/task_service.py`).

### Transition Table

| From | To | Pre-conditions |
|------|----|----------------|
| `draft` | `dry_run_in_progress` | ≥ 2 annotators assigned; config validated; sample snapshot locked |
| `dry_run_in_progress` | `waiting_iaa_confirmation` | All dry-run annotations submitted; IAA calculated |
| `waiting_iaa_confirmation` | `official_run_in_progress` | Project leader confirms IAA; `confirmed_by` recorded |
| `waiting_iaa_confirmation` | `draft` | Project leader rejects IAA; `sample_snapshot_id` cleared to allow re-dry-run |
| `official_run_in_progress` | `completed` | All official-run annotations submitted; all required review units finalized; no unresolved disputes; all required arbitrations completed; final quality scores calculated (see Amendment 2026-08-19) |

Reverse transitions (other than `waiting_iaa_confirmation → draft`) are **not permitted**. Any attempt raises `InvalidTransitionError`.

> **Design note — `dry_run_in_progress → draft` is intentionally excluded.** Allowing this transition would require cancelling all in-progress dry-run annotations and deciding how to handle already-submitted ones, which creates orphaned annotation data and complicates the cleanup path. The intended recovery flow for configuration errors discovered during a dry run is to have annotators complete (or abandon by submitting placeholder annotations) the current dry run, advance to `waiting_iaa_confirmation`, reject the IAA, and return to `draft` — at which point `sample_snapshot_id` is cleared and a fresh configuration and dry run can begin. This keeps cleanup logic in one transition (`waiting_iaa_confirmation → draft`) rather than two.

### Amendment (2026-08-19) — Strengthened `completed` Pre-conditions

Issue #180's cross-role lifecycle review found that the original `official_run_in_progress → completed` pre-condition ("All official-run annotations submitted; final scores calculated") ignored the review pipeline: a task could reach `completed` while review units were still open, disputes were unresolved, or arbitrations were pending. Per user decision D2 (issue #190; decision record: `docs/product/e2e/issue-180/phase2-decision-list.md`), the transition now requires **all** of the following:

1. All official-run annotations submitted (excluded assignments do not count) — unchanged.
2. All required review units finalized under the effective review settings (`min_reviewers`).
3. No unresolved disputes remain.
4. All required arbitrations completed.
5. Final quality scores calculated and available — unchanged.

`check_preconditions` must evaluate all five conditions for this transition; a failed check must surface the specific unmet conditions to the caller rather than a generic error. The user-facing behavior (confirmation and blocking-reason display) is specified in `specs/task-management/014-task-detail/` FR-008b.

### `validate_transition` Implementation

A static allowlist — no dynamic graph traversal:

```python
ALLOWED_TRANSITIONS: dict[TaskStatus, set[TaskStatus]] = {
    TaskStatus.DRAFT: {TaskStatus.DRY_RUN_IN_PROGRESS},
    TaskStatus.DRY_RUN_IN_PROGRESS: {TaskStatus.WAITING_IAA_CONFIRMATION},
    TaskStatus.WAITING_IAA_CONFIRMATION: {
        TaskStatus.OFFICIAL_RUN_IN_PROGRESS,
        TaskStatus.DRAFT,
    },
    TaskStatus.OFFICIAL_RUN_IN_PROGRESS: {TaskStatus.COMPLETED},
    TaskStatus.COMPLETED: set(),
}
```

### `RunStateTransition` Audit Record

Every successful transition writes to `run_state_transitions`:

```python
class RunStateTransition(Base):
    __tablename__ = "run_state_transitions"

    id: UUID
    task_id: UUID          # FK → tasks.id
    from_status: TaskStatus
    to_status: TaskStatus
    triggered_by: UUID     # FK → users.id
    triggered_at: datetime # UTC, server-side
    notes: str | None      # optional context (e.g., IAA rejection reason)
```

### `sample_snapshot_id` Invariant

`sample_snapshot_id` is set when first transitioning to `dry_run_in_progress` (if not already set) and is cleared when the task returns to `draft` from `waiting_iaa_confirmation` (IAA rejection). This allows the project leader to modify configuration or dataset before initiating a new dry run. The service layer enforces this:

```python
if target_status == TaskStatus.DRY_RUN_IN_PROGRESS and task.sample_snapshot_id is None:
    task.sample_snapshot_id = await create_sample_snapshot(db, task)

if target_status == TaskStatus.DRAFT and from_status == TaskStatus.WAITING_IAA_CONFIRMATION:
    task.sample_snapshot_id = None  # cleared so a new dry run generates a fresh snapshot
```

## Consequences

### Easier

- State machine logic is unit-testable with a mock DB session and no HTTP client.
- Audit trail (`RunStateTransition`) is always written in the same transaction as the status change — no partial updates.
- `sample_snapshot_id` lifecycle (set on dry-run start, cleared on IAA rejection back to draft) is enforced in one place; no feature can bypass it.
- Side effects (Celery dispatch, notifications) are isolated in `dispatch_side_effects` — can be swapped for test doubles in unit tests.
- All routes that trigger transitions call the same service function — no duplicated validation logic.

### Harder

- Service layer accumulates complexity as new pre-conditions are added — must resist the temptation to inline pre-condition checks in the route handler "for speed."
- `dispatch_side_effects` must be idempotent-safe: if the DB commit succeeds but Celery dispatch fails, the task is in `dry_run_in_progress` with no worker. Recovery strategy: Celery beat periodic task scans for stuck transitions older than N minutes.

## Referenced by

- [Constitution](../../specs/_governance/constitution.md) — Principle III: Data Fairness (sample snapshot immutability)
- [ADR-007](007-async-tasks-celery.md) — Celery task dispatch in `dispatch_side_effects`
- [ADR-019](019-ai-traceability-audit-logging.md) — `RunStateTransition` audit record schema
- `specs/task-management/013-task-new/` — task creation and first transition trigger
- `specs/task-management/014-task-detail/` — state machine constants consumed by frontend
