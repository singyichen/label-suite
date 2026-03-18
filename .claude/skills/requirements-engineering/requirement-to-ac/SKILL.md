---
name: requirement-to-ac
description: Transform a User Story or functional requirement into SMART Acceptance Criteria with test data and verification methods.
---

# Requirement to Acceptance Criteria

Transform a User Story or functional requirement into detailed, SMART Acceptance Criteria with test data tables and verification methods.

## Usage

```
/requirement-to-ac "As an annotator, I want to submit predictions for a text classification task"
/requirement-to-ac specs/001-annotation-submission/spec.md US-01
```

## Output Format

```markdown
# Acceptance Criteria: [US-ID] — [Title]

**Source**: [User Story or FR]
**Priority**: P1 / P2 / P3
**Date**: YYYY-MM-DD

---

## AC-01: [P1] Happy Path — Successful Submission

```
Given I am authenticated as an Annotator
  And I have an assigned text classification task (task_id: 42)
  And I have prepared predictions: ["positive", "negative", "neutral"]
When I submit POST /api/v1/submissions with body:
  {"task_id": 42, "predictions": ["positive", "negative", "neutral"]}
Then the response status is 201 Created
  And the response body contains:
    {"submission_id": <integer>, "status": "queued", "task_id": 42}
  And a Celery scoring task is enqueued
  And no "answer" or "reference" field appears in the response
```

**Test Data**:

| Scenario | task_id | predictions | Expected Status | Expected Score |
|----------|---------|-------------|-----------------|----------------|
| All correct | 42 | ["pos", "neg", "neu"] | 201, score=1.0 | F1=1.0 |
| All wrong | 42 | ["neg", "pos", "pos"] | 201, score=0.0 | F1=0.0 |
| Partial correct | 42 | ["pos", "pos", "neu"] | 201 | F1=0.667 |

**Verification Method**:
- [ ] pytest integration test: `test_submission_success`
- [ ] Assert `"answer"` not in response JSON (security)

---

## AC-02: [P1] Validation — Empty Prediction List

```
Given I am authenticated as an Annotator
When I submit POST /api/v1/submissions with body:
  {"task_id": 42, "predictions": []}
Then the response status is 422 Unprocessable Entity
  And the response body describes the validation error
  And no Celery task is enqueued
```

**Test Data**:

| Input | Expected Status | Expected Error |
|-------|-----------------|----------------|
| `predictions: []` | 422 | "predictions must not be empty" |
| `predictions: null` | 422 | "predictions is required" |
| `predictions: "string"` | 422 | "predictions must be an array" |

**Verification Method**:
- [ ] pytest: `test_submission_empty_predictions`
- [ ] pytest: `test_submission_null_predictions`

---

## AC-03: [P0] Security — Answer Not Exposed

```
Given I am authenticated as an Annotator
When I submit predictions and poll the task status
Then the response for GET /api/v1/submissions/{id} contains:
  {"submission_id": N, "status": "completed", "score": 0.833, "rank": 5}
And the response does NOT contain any of:
  - "answer"
  - "reference"
  - "gold_label"
  - "expected"
```

**Verification Method**:
- [ ] pytest security test: `test_answer_not_in_submission_response`
- [ ] pytest security test: `test_answer_not_in_task_status_response`

---

## AC-04: [P1] Authorization — Rate Limit Enforcement

```
Given I am authenticated as an Annotator
  And the task is configured with max_submissions_per_day: 3
When I submit a 4th prediction on the same day
Then the response status is 429 Too Many Requests
  And the response includes a "Retry-After" header
  And a "X-RateLimit-Reset" timestamp
```

**Verification Method**:
- [ ] pytest: `test_submission_rate_limit_exceeded`

---

## Non-Functional Criteria

| NFR | Metric | Target | Verification |
|-----|--------|--------|-------------|
| Scoring latency | Celery task duration | ≤30s for ≤10k samples | pytest timing assertion |
| API response time | POST /submissions | ≤500ms p95 | k6 load test |

---

## Definition of Ready

- [ ] Source User Story is complete and approved
- [ ] All ACs use Given/When/Then format
- [ ] AC-S (security) ACs reviewed by `senior-security` agent
- [ ] Scoring metric ACs reviewed by `nlp-research-advisor` agent
- [ ] Test data tables completed with actual values (not placeholders)
- [ ] Verification method specified for each AC
```
