---
name: user-story
description: Generate structured User Stories with Acceptance Criteria, story points, and Definition of Done for Label Suite.
---

# User Story

Generate well-structured User Stories following the SDD spec format, targeting NLP researchers, annotators, and administrators.

## Usage

```
/user-story "Annotator submits predictions for a text classification task"
/user-story "NLP researcher configures a new annotation task via YAML config"
/user-story "Administrator views leaderboard with ranking and scores"
```

## Output Format

```markdown
# User Story — [US-ID]

**Title**: [Concise title]
**Priority**: P1 / P2 / P3
**Story Points**: N (Fibonacci: 1, 2, 3, 5, 8, 13)

---

## Story

**As a** [NLP Researcher | Annotator | Administrator],
**I want to** [action],
**So that** [benefit / value].

---

## Acceptance Criteria

### AC-01: [Happy Path]
```
Given [precondition]
When [action]
Then [expected outcome]
  And [additional outcome]
```

### AC-02: [Error / Edge Case]
```
Given [precondition]
When [invalid action or edge case]
Then [expected error handling]
```

### AC-03: [Security / Access Control]
```
Given I am authenticated as an Annotator
When I attempt to [admin-only action]
Then I receive a 403 Forbidden response
  And no sensitive data is exposed
```

---

## Definition of Done

- [ ] All ACs implemented and verified (pytest / Playwright)
- [ ] Test coverage ≥ target threshold for affected modules
- [ ] Code reviewed and approved (`/code-review` + `/pr-review`)
- [ ] No Chinese strings introduced outside README
- [ ] Security checklist passed (test-set leakage check if applicable)
- [ ] Spec checklist completed (`/speckit.checklist`)
- [ ] PR merged to `main`

---

## Story Point Estimation

| Factor | Score (1-5) | Notes |
|--------|------------|-------|
| Complexity | N | |
| Uncertainty | N | |
| Effort | N | |
| **Fibonacci Total** | **N** | |

---

## MoSCoW Classification

**Must Have** / Should Have / Could Have / Won't Have

**Rationale**: [Why this priority for the Demo Paper milestone]

---

## Dependencies

| Type | Dependency | Notes |
|------|------------|-------|
| Upstream | US-XX: [title] | Must be implemented first |
| External | Config YAML schema | Task config format must be defined |

---

## Technical Notes

- [Backend consideration: e.g., requires Celery for async scoring]
- [Frontend consideration: e.g., config-driven form rendering]
- [Security note: e.g., answer field must be excluded from response]

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Annotator can complete submission without training | ✅ (usability test) |
| Scoring completes within 30 seconds | 95th percentile |
| API response time | ≤ 500ms |
```

## User Roles Reference

| Role | Description | Primary Interactions |
|------|-------------|---------------------|
| NLP Researcher | Configures tasks, reviews results | Task Config, Leaderboard, Dataset Management |
| Annotator | Executes annotation tasks | Annotation Workspace, Submission |
| Administrator | Manages users, tasks, datasets | Admin Panel, User Management |

## Priority Guidelines

| Priority | Criteria |
|----------|----------|
| P1 | Core annotation and evaluation flow — Demo Paper must-have |
| P2 | Leaderboard and result visualization — important but not blocking |
| P3 | Nice-to-have features — implement after P1 and P2 |
