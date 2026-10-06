# ADR-022: Task State Machine Implementation Location

**Status**: Accepted
**Date**: 2026-05-29
**Amended**: 2026-08-19 — `official_run_in_progress → completed` pre-conditions strengthened (issue #190, decision D2)
**Amended**: 2026-09-18 — `waiting_iaa_confirmation → dry_run_in_progress` transition added to support starting a new trial round from `waiting_iaa_confirmation` (issue #791)
**Amended**: 2026-09-18 — IAA calculation moved off `dry_run_in_progress → waiting_iaa_confirmation` onto both transitions leaving `waiting_iaa_confirmation`, gated by the latest `TrialRound.iaa_computation_status = done` (issue #783)
**Amended**: 2026-10-02 — `dry_run_in_progress → waiting_iaa_confirmation` guard extended to review, arbitration and the `dry_run` exception pool (issue #1120)

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
| `dry_run_in_progress` | `waiting_iaa_confirmation` | Current round only, all of: no unassigned `dry_run` work; every active annotator has `assigned_count == completed_count`; every `dry_run` review unit is finalized; no `dry_run` review unit is disputed (required arbitration done); the `dry_run` exception pool is empty. IAA is advisory and not a guard (see Amendments 2026-09-18, issue #783, and 2026-10-02, issue #1120) |
| `waiting_iaa_confirmation` | `official_run_in_progress` | Latest `TrialRound.iaa_computation_status = done`; project leader confirms IAA; `confirmed_by` recorded |
| `waiting_iaa_confirmation` | `draft` | Project leader rejects IAA; `sample_snapshot_id` cleared to allow re-dry-run |
| `waiting_iaa_confirmation` | `dry_run_in_progress` | Project leader starts a new trial round; `TrialRound` revision-note mandatory check (FR-017) passed; new round's independent trial list already created; latest `TrialRound.iaa_computation_status = done` (see Amendment 2026-09-18) |
| `official_run_in_progress` | `completed` | All official-run annotations submitted; all required review units finalized; no unresolved disputes; all required arbitrations completed; final quality scores calculated (see Amendment 2026-08-19) |

Reverse transitions (other than `waiting_iaa_confirmation → draft` and `waiting_iaa_confirmation → dry_run_in_progress`) are **not permitted**. Any attempt raises `InvalidTransitionError`.

> **Design note — `dry_run_in_progress → draft` is intentionally excluded.** Allowing this transition would require cancelling all in-progress dry-run annotations and deciding how to handle already-submitted ones, which creates orphaned annotation data and complicates the cleanup path. The intended recovery flow for configuration errors discovered during a dry run is to have annotators complete (or abandon by submitting placeholder annotations) the current dry run, advance to `waiting_iaa_confirmation`, reject the IAA, and return to `draft` — at which point `sample_snapshot_id` is cleared and a fresh configuration and dry run can begin. This keeps cleanup logic in one transition (`waiting_iaa_confirmation → draft`) rather than two.

### Amendment (2026-08-19) — Strengthened `completed` Pre-conditions

Issue #180's cross-role lifecycle review found that the original `official_run_in_progress → completed` pre-condition ("All official-run annotations submitted; final scores calculated") ignored the review pipeline: a task could reach `completed` while review units were still open, disputes were unresolved, or arbitrations were pending. Per user decision D2 (issue #190; decision record: `docs/product/e2e/issue-180/phase2-decision-list.md`), the transition now requires **all** of the following:

1. All official-run annotations submitted (excluded assignments do not count) — unchanged.
2. All required review units finalized under the effective review settings (`min_reviewers`).
3. No unresolved disputes remain.
4. All required arbitrations completed.
5. Final quality scores calculated and available — unchanged.

`check_preconditions` must evaluate all five conditions for this transition; a failed check must surface the specific unmet conditions to the caller rather than a generic error. The user-facing behavior (confirmation and blocking-reason display) is specified in `specs/task-management/014-task-detail/` FR-008b.

### Amendment (2026-09-18, issue #783) — IAA Calculation Status Pre-condition

The original `dry_run_in_progress → waiting_iaa_confirmation` pre-condition also required the IAA result to be available. IAA is computed asynchronously once the last dry-run annotation is submitted, so a failed or slow calculation would leave the task stuck in `dry_run_in_progress` with every annotation already in — contradicting `specs/task-management/014-task-detail/` FR-008a, whose completion rule counts submissions only. The calculation requirement therefore moves to the two transitions that leave `waiting_iaa_confirmation`:

1. `dry_run_in_progress → waiting_iaa_confirmation` requires only that all dry-run annotations are submitted.
2. `waiting_iaa_confirmation → official_run_in_progress` and `waiting_iaa_confirmation → dry_run_in_progress` both additionally require the latest `TrialRound.iaa_computation_status = done`. `ALLOWED_TRANSITIONS` is unchanged; `check_preconditions` evaluates this condition for both transitions and, when it fails, reports whether the calculation is still pending or has failed rather than a generic error.

**Definition of `done`**: every output type of the latest trial round that requires IAA has a definite result — either a number or "cannot be computed" as defined in `specs/dataset/017-dataset-analysis-detail/` FR-039 point 4 (`De = 0`, mathematically undefined). Only `pending` and `failed` (an execution error) count as not finished. Types in `IAA_GATE_EXCLUDED_TYPES` (`free_text`) need no calculation and are not considered. Treating "cannot be computed" as unfinished would block small-sample tasks from ever reaching the official run, which FR-039 point 4 forbids.

**Recovery from `failed`**: the project leader retries the calculation, which returns the status to `pending`; the task does not move backwards through the state machine. The user-facing behavior (pending/failed display, retry action, and disabled actions with visible reasons) is specified in `specs/task-management/014-task-detail/` FR-010o-4.

### Amendment (2026-10-02, issue #1120) — Trial-Completion Guard Covers Review, Arbitration and the Exception Pool

The 2026-09-18 amendment reduced the `dry_run_in_progress → waiting_iaa_confirmation` guard to "all dry-run annotations submitted". Issue #1120 found that this lets a task leave the trial stage while `dry_run` review units are still open, disputes are unresolved, or the `dry_run` exception pool still holds items. With maintainer authorization on 2026-10-02 (OpenSpec change `1120-task-lifecycle-alignment` amends `specs/task-management/014-task-detail/` as MAJOR/BREAKING, bumping it to 5.0.0 at write-back in task 5.7, because FR-008a's auto-transition sufficiency is withdrawn), the guard now requires **all** of the following, evaluated for the current round only:

1. No unassigned `dry_run` annotation work — unchanged.
2. Every `membership_status = active` annotator has `assigned_count == completed_count` — unchanged.
3. Every `dry_run` review unit is finalized.
4. No `dry_run` review unit is disputed (required arbitration completed).
5. The `dry_run` exception pool is empty.

Conditions 3 and 4 read the review-unit derivation of `specs/annotation/015-annotation-workspace/` FR-051 and the dispute resolution of FR-061; the 014 side does not build a second derivation. Condition 5 follows the change's FR-018 point (5), which counts `dry_run` exception items toward this guard and `official_run` items toward the `completed` guard, each counted independently. 014 FR-013 point (1) (disabled-reason text) follows the same rule.

`check_preconditions` must evaluate all five conditions and surface the specific unmet conditions with their remaining counts, as it already does for `completed` (Amendment 2026-08-19). The user-facing behavior is specified in `specs/task-management/014-task-detail/` FR-008a.

**Unchanged:**

- `TASK_STATUSES` keeps its five states and `ALLOWED_TRANSITIONS` is unchanged; only a pre-condition changes.
- IAA stays advisory (FR-010o-3) and its `pending | done | failed` status (FR-010o-4) still gates only the two transitions leaving `waiting_iaa_confirmation`; none of the three new conditions depends on IAA outcome or calculation status.

**Deadlock exit (FR-023):** requiring arbitration to be complete could trap a task whose `arbiter_ids` is empty. FR-023 lets the `project_leader` adjudicate such disputes with the same outcomes as an arbiter. It is specified in the change's 014 delta (`openspec/changes/1120-task-lifecycle-alignment/`), realized in the prototype in group 4 and written back to the canonical spec in group 5 (task 5.7); this ADR records only the dependency.

### `validate_transition` Implementation

A static allowlist — no dynamic graph traversal:

```python
ALLOWED_TRANSITIONS: dict[TaskStatus, set[TaskStatus]] = {
    TaskStatus.DRAFT: {TaskStatus.DRY_RUN_IN_PROGRESS},
    TaskStatus.DRY_RUN_IN_PROGRESS: {TaskStatus.WAITING_IAA_CONFIRMATION},
    TaskStatus.WAITING_IAA_CONFIRMATION: {
        TaskStatus.OFFICIAL_RUN_IN_PROGRESS,
        TaskStatus.DRAFT,
        TaskStatus.DRY_RUN_IN_PROGRESS,
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
