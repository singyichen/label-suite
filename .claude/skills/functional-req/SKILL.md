---
name: functional-req
description: Generate a functional requirements specification document for a Label Suite feature.
---

# Functional Requirements

Generate a structured Functional Requirements specification to be used as input for the SDD spec creation.

## Usage

```
/functional-req "Annotation submission and scoring pipeline"
/functional-req "Leaderboard with anti-gaming submission limits"
```

## Output Format

```markdown
# Functional Requirements Specification

**Feature**: [Feature Name]
**Document ID**: FR-NNN
**Version**: 1.0
**Date**: YYYY-MM-DD
**Status**: Draft | Review | Approved

---

## Change History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | YYYY-MM-DD | | Initial draft |

---

## Scope

### In Scope
- [Capability 1]
- [Capability 2]

### Out of Scope
- [Explicitly excluded capability]
- [Future feature deferred]

---

## Stakeholders

| Role | Responsibility |
|------|----------------|
| NLP Researcher | Configures tasks; reviews evaluation results |
| Annotator | Executes annotation; submits predictions |
| Administrator | Manages users, tasks, datasets, leaderboard |

---

## Functional Requirements

### FR-01: [Requirement Title]
**Priority**: P1 / P2 / P3
**User Story**: US-XX
**Description**: [Detailed description]
**Business Rules**:
- [Rule 1]
- [Rule 2]
**Acceptance Criteria**: AC-01, AC-02
**Notes**: [Implementation considerations]

### FR-02: [Requirement Title]
...

---

## Non-Functional Requirements

### Performance
| NFR | Target | Measurement |
|-----|--------|-------------|
| Scoring latency (≤10k samples) | ≤30 seconds | 95th percentile Celery task duration |
| API response time | ≤500ms | 95th percentile |
| Leaderboard load time | ≤1 second | 95th percentile |

### Security
| NFR | Requirement |
|-----|-------------|
| Test-set leakage prevention | Answer fields excluded from all annotator-facing API responses |
| Authentication | JWT-based auth required for all endpoints |
| Authorization | RBAC with annotator / administrator roles |
| Rate limiting | Submission endpoint: configurable max submissions per day |

### Availability
| NFR | Target |
|-----|--------|
| API uptime | ≥99% during evaluation period |
| Scoring pipeline availability | ≥95% |

### Usability
| NFR | Requirement |
|-----|-------------|
| Annotator onboarding | Annotators can submit predictions without prior training |
| Error messages | All errors include human-readable descriptions |

---

## Business Rules

| Rule ID | Description |
|---------|-------------|
| BR-01 | Test-set answers must never be exposed to annotators — enforced at schema level |
| BR-02 | Submission limits are defined per task in the task config |
| BR-03 | Scoring metric is defined in task config; cannot be overridden at submission time |
| BR-04 | Leaderboard rankings update asynchronously after scoring completes |

---

## Constraints

| Constraint | Description |
|------------|-------------|
| Tech Stack | FastAPI (backend), React + TypeScript (frontend), PostgreSQL, Redis, Celery |
| Config Format | Task configuration defined in YAML or JSON; no code change required to add new tasks |
| Open Source | All code and docs in English; no proprietary dependencies |

---

## Assumptions

- PostgreSQL is the primary data store; Redis is used only for Celery broker and result backend
- Evaluation datasets are uploaded by administrators before task publication
- Celery workers have access to test-set data; annotators do not

---

## Dependencies

| Dependency | Type | Notes |
|------------|------|-------|
| Task Config Schema | Internal | Task type, metric, and submission limit must be defined |
| Celery Worker | Infrastructure | Required for async scoring |
| PostgreSQL | Infrastructure | Required for data persistence |

---

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Test-set answer leakage | Low | Critical | Schema-level exclusion + security tests |
| Scoring pipeline timeout | Medium | High | Celery task timeout + retry policy |
| Leaderboard gaming | Low | Medium | Rate limiting + submission audit log |

---

## Traceability

| FR ID | User Story | AC | Spec Section |
|-------|------------|-----|-------------|
| FR-01 | US-01 | AC-01, AC-02 | spec.md §3 |
| FR-02 | US-02 | AC-03, AC-04 | spec.md §4 |
```
