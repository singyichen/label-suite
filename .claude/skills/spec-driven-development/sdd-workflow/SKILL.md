---
name: sdd-workflow
description: Guide for the Spec-Driven Development (SDD) workflow used in Label Suite.
---

# SDD Workflow Guide

The Spec-Driven Development workflow ensures every feature begins with a formal specification before any code is written. This is the standard development process for the Label Suite project.

## Workflow Overview

```
/speckit.specify <feature description>
        ↓
  specs/NNN-feature/spec.md
        ↓
/speckit.clarify  (optional — ask questions, resolve ambiguity)
        ↓
/spec-review  (validate completeness and Constitution compliance)
        ↓
/speckit.plan
        ↓
  specs/NNN-feature/plan.md
        ↓
/speckit.tasks
        ↓
  specs/NNN-feature/tasks.md
        ↓
/speckit.implement
        ↓
  Code changes (branch: feat/NNN-feature)
        ↓
/speckit.checklist
        ↓
  specs/NNN-feature/checklists/
        ↓
  Pull Request → Code Review → Merge
```

## Step-by-Step Reference

### Step 1: Specify — `/speckit.specify <description>`

Create a formal spec for the feature.

**Output**: `specs/NNN-feature/spec.md`

**Spec must include**:
- Feature overview and motivation
- Target users (NLP Researcher / Annotator / Administrator)
- User Stories (US-XX format)
- Acceptance Criteria (AC-XX format, SMART and testable)
- Non-functional requirements (performance, security, test-set isolation)
- Out of scope items
- Dependencies on other specs

**Naming convention**: `NNN` is zero-padded (001, 002, ...), `feature` is kebab-case

---

### Step 2: Clarify — `/speckit.clarify` (optional)

Ask clarifying questions about the spec before planning.

**Use when**:
- Evaluation metric selection is unclear → escalate to `nlp-research-advisor`
- API design has multiple valid approaches → consult `senior-api-designer`
- Security scope of test-set isolation is unclear → consult `senior-security`

---

### Step 3: Review — `/spec-review`

Validate the spec for completeness and Constitution compliance before investing in planning.

**Blockers that prevent proceeding**:
- Missing testable Acceptance Criteria
- No mention of test-set leakage prevention for submission-related features
- Constitution violations

---

### Step 4: Plan — `/speckit.plan`

Transform the validated spec into an implementation plan.

**Output**: `specs/NNN-feature/plan.md`

**Plan must include**:
- Component map (files to create / modify)
- Implementation steps (each mapped to ACs)
- Sequence diagram for async Celery flows
- Security checklist
- Constitution compliance assessment

---

### Step 5: Tasks — `/speckit.tasks`

Break the plan into granular, trackable tasks.

**Output**: `specs/NNN-feature/tasks.md`

**Task format**:
```markdown
- [ ] TASK-001: Create SQLAlchemy model for SubmissionResult (backend/app/models/submission.py)
- [ ] TASK-002: Create FastAPI router POST /api/v1/submissions (backend/app/routers/submissions.py)
- [ ] TASK-003: Implement Celery scoring task (backend/app/tasks/scoring.py)
- [ ] TASK-004: Write pytest unit tests for scoring logic (backend/tests/test_scoring.py)
- [ ] TASK-005: Build SubmissionForm React component (frontend/src/components/SubmissionForm.tsx)
- [ ] TASK-006: Write Playwright E2E test for submission flow (frontend/tests/submission.spec.ts)
```

---

### Step 6: Implement — `/speckit.implement`

Execute implementation tasks following the plan.

**Branch naming**: `feat/NNN-feature` (matches spec directory name)

**Commit convention**:
```
feat(NNN): implement submission scoring endpoint

- Add SubmissionResult model
- Add POST /api/v1/submissions router
- Add Celery scoring task

Refs: specs/NNN-feature/tasks.md TASK-001, TASK-002, TASK-003
```

---

### Step 7: Checklist — `/speckit.checklist`

Validate implementation against all ACs before opening a PR.

**Output**: `specs/NNN-feature/checklists/ac-checklist.md`

**AC verification methods**:

| Verification Type | Tool |
|-------------------|------|
| API behavior | pytest + httpx |
| Scoring correctness | pytest unit tests |
| E2E user flows | Playwright |
| Security (test-set leakage) | pytest security tests |
| UI rendering | Playwright |
| Performance | k6 / locust (if applicable) |

---

## Spec Directory Structure

```
specs/
└── NNN-feature/
    ├── spec.md          # Feature specification
    ├── plan.md          # Implementation plan
    ├── tasks.md         # Task breakdown
    └── checklists/
        ├── ac-checklist.md      # AC verification results
        └── security-checklist.md  # Security validation
```

---

## SDD Rules

1. **No code without a spec** — every feature branch must have a corresponding `spec.md`
2. **No plan without a reviewed spec** — run `/spec-review` before `/speckit.plan`
3. **No merge without a checklist** — all ACs must be verified before PR creation
4. **Spec immutability** — once planning begins, spec changes require a new version bump (X.Y → X.Y+1)
5. **One spec per feature** — do not bundle unrelated features into one spec

---

## Quick Reference

| Command | Purpose | Output |
|---------|---------|--------|
| `/speckit.specify` | Create feature spec | `specs/NNN/spec.md` |
| `/speckit.clarify` | Resolve spec ambiguity | Questions + answers |
| `/spec-review` | Validate spec quality | Review report |
| `/speckit.plan` | Create implementation plan | `specs/NNN/plan.md` |
| `/speckit.tasks` | Break plan into tasks | `specs/NNN/tasks.md` |
| `/speckit.implement` | Execute tasks | Code changes |
| `/speckit.checklist` | Verify ACs | `specs/NNN/checklists/` |
