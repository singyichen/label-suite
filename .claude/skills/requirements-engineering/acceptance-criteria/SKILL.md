---
name: acceptance-criteria
description: Generate comprehensive Acceptance Criteria checklist for a feature spec in Label Suite.
---

# Acceptance Criteria

Generate detailed, SMART Acceptance Criteria for a feature. Criteria must be testable by pytest or Playwright.

## Usage

```
/acceptance-criteria "Annotation submission with automated scoring"
/acceptance-criteria specs/001-annotation-submission/spec.md
```

## Output Format

```markdown
# Acceptance Criteria — [Feature Name]

**Spec**: specs/NNN-feature/spec.md
**Version**: 1.0
**Date**: YYYY-MM-DD

---

## Functional Acceptance Criteria

### Core Behavior
- [ ] **AC-F01** [P1]: Given an authenticated annotator with an assigned task, when they submit valid predictions, then the system accepts the submission and returns HTTP 201 with a task ID for status polling.
- [ ] **AC-F02** [P1]: Given a scoring task is enqueued, when the Celery worker processes it, then the score is computed using the metric defined in the task config and stored to the database.
- [ ] **AC-F03** [P1]: Given scoring completes, when the annotator polls the task status, then the response includes the final score and leaderboard rank (no raw answer data).

### UI / Interaction
- [ ] **AC-F04** [P1]: Given an annotator is on the annotation workspace, when the task loads, then the form renders correctly based on the task type config (text classification, sequence labeling, etc.).
- [ ] **AC-F05** [P2]: Given an annotator submits predictions, when the submission is accepted, then a confirmation message is displayed with the assigned task ID.

---

## Edge Cases

### Boundary Conditions
- [ ] **AC-E01** [P1]: Given an annotator submits an empty prediction list, when processed, then the API returns HTTP 422 with a descriptive error message.
- [ ] **AC-E02** [P1]: Given an annotator submits predictions with mismatched length to reference set, when processed, then scoring returns 0.0 (not an error).
- [ ] **AC-E03** [P2]: Given an annotator attempts to submit after the task deadline, when processed, then the API returns HTTP 403 with "submission deadline passed".

---

## Error Handling

### Input Validation
- [ ] **AC-V01** [P1]: Given invalid JSON in the request body, when submitted, then the API returns HTTP 422 with Pydantic validation error details.
- [ ] **AC-V02** [P1]: Given a missing required field in the submission, when processed, then the API returns HTTP 422 identifying the missing field.

### System Errors
- [ ] **AC-V03** [P1]: Given a Celery scoring task fails (e.g., OOM), when failure occurs, then the submission status is updated to `failed` and the annotator is notified.

---

## Security

### Test-Set Leakage Prevention (NON-NEGOTIABLE)
- [ ] **AC-S01** [P0]: Given any API response returned to an annotator, when inspected, then no `answer`, `reference`, or `gold_label` fields are present.
- [ ] **AC-S02** [P0]: Given the application logs, when searched for test-set data, then no raw answer values appear in log output.
- [ ] **AC-S03** [P0]: Given a direct database query attempt by an annotator, when RBAC is applied, then annotators cannot query the `dataset_answers` table.

### Authentication & Authorization
- [ ] **AC-S04** [P1]: Given an unauthenticated request to any submission endpoint, when processed, then the API returns HTTP 401.
- [ ] **AC-S05** [P1]: Given an annotator attempts to access an admin-only endpoint (`/api/v1/admin/*`), when processed, then the API returns HTTP 403.

### Rate Limiting
- [ ] **AC-S06** [P1]: Given an annotator submits more than the configured daily limit, when the limit is exceeded, then the API returns HTTP 429 with a `Retry-After` header.

---

## Performance

- [ ] **AC-P01** [P2]: Given a scoring task for a standard NLP benchmark (≤10,000 samples), when processing, then the Celery task completes within 30 seconds.
- [ ] **AC-P02** [P2]: Given a leaderboard query with up to 1,000 submissions, when fetched, then the API response time is ≤ 500ms at p95.

---

## Config-Driven Behavior

- [ ] **AC-C01** [P1]: Given a task configured as `type: text-classification`, when the annotation workspace loads, then the form renders multiple-choice options from the task config.
- [ ] **AC-C02** [P1]: Given a task configured with metric `f1_macro`, when scoring runs, then the Celery task uses macro-averaged F1 (not micro or binary).
- [ ] **AC-C03** [P2]: Given a new task type added to the config (without code change), when the system is restarted, then the new task type is available in the annotation workspace.

---

## Definition of Ready

- [ ] User stories written and reviewed
- [ ] All ACs are SMART and testable
- [ ] Security ACs reviewed by `senior-security` agent
- [ ] NLP metric ACs reviewed by `nlp-research-advisor` agent
- [ ] Dependencies identified and noted
```

## SMART Criteria Checklist

| Criterion | Question to Ask |
|-----------|----------------|
| Specific | Is the condition unambiguous? |
| Measurable | Is there a quantifiable outcome (status code, time, value)? |
| Achievable | Is this technically feasible with current stack? |
| Relevant | Does this directly serve a User Story? |
| Testable | Can this be verified by pytest or Playwright without ambiguity? |
