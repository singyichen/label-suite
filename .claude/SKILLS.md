# Claude Code Skills & Commands Directory

This document provides a comprehensive overview of all available Spec-Kit Commands and Knowledge-Domain Skills for the Label Suite project.

## Directory Structure

```
.claude/
├── commands/                    # Spec-Kit Commands
│   ├── speckit.specify.md       # Create feature spec
│   ├── speckit.plan.md          # Create implementation plan
│   ├── speckit.tasks.md         # Generate task list
│   ├── speckit.implement.md     # Execute implementation
│   ├── speckit.clarify.md       # Clarify spec ambiguities
│   ├── speckit.analyze.md       # Cross-artifact analysis
│   ├── speckit.checklist.md     # Generate quality checklist
│   ├── speckit.constitution.md  # Update project constitution
│   └── speckit.taskstoissues.md # Convert tasks to GitHub Issues
├── skills/                      # Knowledge-Domain Skills (30 total)
│   ├── spec-driven-development/
│   │   ├── sdd-workflow/
│   │   ├── spec-to-plan/
│   │   └── spec-review/
│   ├── requirements-engineering/
│   │   ├── user-story/
│   │   ├── functional-req/
│   │   ├── acceptance-criteria/
│   │   └── requirement-to-ac/
│   ├── system-design/
│   │   ├── api-spec/
│   │   ├── backend-spec/
│   │   ├── frontend-spec/
│   │   ├── data-model/
│   │   └── flowchart/
│   ├── code-quality/
│   │   ├── CODE_REVIEW_GUIDE.md
│   │   ├── code-review/
│   │   ├── code-review-checklist/
│   │   ├── pr-review/
│   │   ├── code-smell/
│   │   └── git-branch/
│   ├── test-engineering/
│   │   ├── test-plan/
│   │   ├── test-coverage/
│   │   ├── test-data-strategy/
│   │   ├── test-tracking/
│   │   ├── exploratory-testing/
│   │   └── regression-suite/
│   ├── quality-assurance/
│   │   ├── quality-gate/
│   │   ├── defect-report/
│   │   ├── traceability-matrix/
│   │   └── test-report/
│   ├── adamelliotfields-skills-d2-diagram/  # Diagramming
│   └── ui-ux-pro-max/               # UI/UX Design Intelligence
├── agents/                      # AI Agent definitions (35 agents)
└── SKILLS.md                    # This file
```

---

## Spec-Kit Commands

Spec-Kit commands provide a Spec-Driven Development (SDD) workflow powered by [GitHub spec-kit](https://github.com/github/spec-kit). Specs are stored in `specs/NNN-feature-name/` directories.

| Command | Purpose | Example Usage |
|---------|---------|---------------|
| `/speckit.specify` | Create or update feature spec from natural language | `/speckit.specify annotation submission with scoring` |
| `/speckit.plan` | Create technical implementation plan from spec | `/speckit.plan` |
| `/speckit.tasks` | Generate actionable task list from plan | `/speckit.tasks` |
| `/speckit.implement` | Execute implementation following task list | `/speckit.implement` |
| `/speckit.clarify` | Identify and resolve spec ambiguities (max 5 questions) | `/speckit.clarify` |
| `/speckit.analyze` | Cross-artifact consistency analysis (read-only) | `/speckit.analyze` |
| `/speckit.checklist` | Generate quality validation checklist | `/speckit.checklist security` |
| `/speckit.constitution` | Create or update the project constitution | `/speckit.constitution` |
| `/speckit.taskstoissues` | Convert tasks.md into GitHub Issues | `/speckit.taskstoissues` |

### SDD Workflow

```
/speckit.specify → /speckit.clarify → /spec-review → /speckit.plan → /speckit.tasks → /speckit.analyze → /speckit.implement
                                                                              ↓                                    ↓
                                                              /speckit.taskstoissues              /speckit.checklist
```

### Related Files

- **Constitution**: `.specify/memory/constitution.md` (6 core principles)
- **Templates**: `.specify/templates/` (spec, plan, tasks, checklist, agent-file, constitution templates)
- **Specs**: `specs/` (feature specifications, one directory per feature)

---

## Knowledge-Domain Skills

### Spec-Driven Development (3 skills)

Skills for the SDD workflow — writing, reviewing, and transforming spec artifacts.

| Skill | Purpose | Example Usage |
|-------|---------|---------------|
| `/sdd-workflow` | Full SDD workflow guide (specify → checklist) | `/sdd-workflow` |
| `/spec-to-plan` | Transform a `spec.md` into a detailed `plan.md` | `/spec-to-plan specs/001-annotation-submission/spec.md` |
| `/spec-review` | Review spec completeness and Constitution compliance | `/spec-review specs/001-annotation-submission/spec.md` |

### Requirements Engineering (4 skills)

Skills for defining, converting, and validating requirements.

| Skill | Purpose | Example Usage |
|-------|---------|---------------|
| `/user-story` | Create User Stories with AC and story points | `/user-story annotator submits predictions for text classification` |
| `/functional-req` | Write functional and non-functional requirements | `/functional-req annotation submission and scoring pipeline` |
| `/acceptance-criteria` | Generate comprehensive AC checklists | `/acceptance-criteria annotation submission feature` |
| `/requirement-to-ac` | Convert User Story to testable SMART AC | `/requirement-to-ac annotator submits predictions` |

### System Design (6 skills)

Skills for designing APIs, services, data models, and architecture.

| Skill | Purpose | Example Usage |
|-------|---------|---------------|
| `/api-spec` | Design RESTful API specifications (FastAPI) | `/api-spec submission and scoring endpoints` |
| `/backend-spec` | Generate backend service architecture specs | `/backend-spec ScoringService — compute evaluation metrics` |
| `/frontend-spec` | Generate frontend component specifications | `/frontend-spec AnnotationWorkspace component` |
| `/data-model` | Design PostgreSQL schemas and ER diagrams | `/data-model annotation submission and leaderboard` |
| `/flowchart` | Generate Mermaid flowcharts | `/flowchart annotation submission and async scoring flow` |
| `/d2-diagram` | Generate D2 diagrams (architecture, flow, thesis chapter) | `/d2-diagram system architecture` |

### UI/UX Design (1 skill)

Skills for UI design systems, component styling, and UX best practices.

| Skill | Purpose | Example Usage |
|-------|---------|---------------|
| `/ui-ux-pro-max` | Generate complete design systems (style, color, typography, UX guidelines) for any product type | `/ui-ux-pro-max Build a dashboard for annotation analytics` |

**Capabilities:**
- 67 UI styles (Glassmorphism, Brutalism, Bento Grid, Minimalism, etc.)
- 96 color palettes + 57 font pairings (Google Fonts)
- 161 industry-specific design rules (SaaS, healthcare, fintech, etc.)
- 25 chart type recommendations
- 99 UX best practices (accessibility, touch targets, animation, etc.)
- Supports 13 stacks: `html-tailwind` (default), `react`, `nextjs`, `vue`, `svelte`, `shadcn`, `swiftui`, `flutter`, `react-native`, and more

**Source:** [nextlevelbuilder/ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) — installed via `uipro-cli`

### Code Quality (5 skills)

Skills for code review, PR evaluation, technical debt management, and git workflow.

| Skill | Purpose | Example Usage |
|-------|---------|---------------|
| `/code-review` | Comprehensive code review (quality, security, test-set leakage) | `/code-review backend/app/services/scoring.py` |
| `/code-review-checklist` | Generate project-specific review checklists | `/code-review-checklist scoring` |
| `/pr-review` | Full PR review with spec traceability and leakage audit | `/pr-review #42` |
| `/code-smell` | Detect code smells and suggest refactoring | `/code-smell backend/app/services/` |
| `/git-branch` | Standardized git branch lifecycle | `/git-branch feat/001-annotation-submission` |

See [CODE_REVIEW_GUIDE.md](skills/code-quality/CODE_REVIEW_GUIDE.md) for the detailed code review usage guide.

### Test Engineering (6 skills)

Skills for test planning, execution, data management, and coverage analysis.

| Skill | Purpose | Example Usage |
|-------|---------|---------------|
| `/test-plan` | Create comprehensive test plans | `/test-plan specs/001-annotation-submission/spec.md` |
| `/test-coverage` | Analyze test coverage with module-specific thresholds | `/test-coverage backend/app/services/scoring.py` |
| `/test-data-strategy` | Define test data and fixture management | `/test-data-strategy annotation submission tests` |
| `/test-tracking` | Track test execution progress with dashboards | `/test-tracking sprint` |
| `/exploratory-testing` | Guide structured exploratory testing sessions | `/exploratory-testing test-set leakage surface area` |
| `/regression-suite` | Plan risk-based regression testing | `/regression-suite release` |

### Quality Assurance (4 skills)

Skills for quality gates, defect management, traceability, and reporting.

| Skill | Purpose | Example Usage |
|-------|---------|---------------|
| `/quality-gate` | Evaluate release readiness (Go/No-Go) | `/quality-gate production` |
| `/defect-report` | Create standardized defect reports | `/defect-report scoring returns wrong F1 for multi-label` |
| `/traceability-matrix` | Build User Story → AC → Spec → Code → Test traceability | `/traceability-matrix specs/001-annotation-submission/` |
| `/test-report` | Generate Sprint/Release test reports | `/test-report sprint` |

---

## Quick Reference

| Domain | Count | Skills |
|--------|-------|--------|
| Spec-Driven Development | 3 | sdd-workflow, spec-to-plan, spec-review |
| Requirements Engineering | 4 | user-story, functional-req, acceptance-criteria, requirement-to-ac |
| System Design | 6 | api-spec, backend-spec, frontend-spec, data-model, flowchart, d2-diagram |
| Code Quality | 5 | code-review, code-review-checklist, pr-review, code-smell, git-branch |
| Test Engineering | 6 | test-plan, test-coverage, test-data-strategy, test-tracking, exploratory-testing, regression-suite |
| Quality Assurance | 4 | quality-gate, defect-report, traceability-matrix, test-report |
| UI/UX Design | 1 | ui-ux-pro-max |
| Diagramming | 1 | d2-diagram (adamelliotfields) |
| **Total** | **30** | |

---

## Scoring & Security Special Requirements

For the Label Suite project, these skills enforce additional constraints for the scoring engine and test-set leakage prevention:

| Skill | Special Requirement |
|-------|---------------------|
| `/test-coverage` | Scoring engine requires ≥90% coverage (vs ≥80% general) |
| `/code-review` | Must audit every annotator-facing API response for `answer` field exposure |
| `/code-review-checklist scoring` | Includes Celery task isolation and test-set answer access checks |
| `/quality-gate` | Test-set leakage security checks are blocking — any failure = NO-GO |
| `/test-report security` | Dedicated leakage prevention test report section |
| `/traceability-matrix` | Maps security ACs (AC-S01 to AC-S06) to security test cases |
| `/regression-suite` | Scoring module and `/api/v1/submissions` always require full regression |
| `/defect-report` | Any test-set leakage defect is auto-classified as Critical (P0) |
| `/exploratory-testing` | Includes LEAK heuristic: inspect all annotator API responses for answer data |

---

## Skill Selection by Development Phase

| Phase | Recommended Skills |
|-------|--------------------|
| 1. Requirements | `/user-story` → `/functional-req` → `/acceptance-criteria` |
| 2. SDD Spec | `/speckit.specify` → `/spec-review` → `/spec-to-plan` |
| 3. Design | `/api-spec` → `/backend-spec` → `/frontend-spec` → `/data-model` → `/flowchart` |
| 3b. UI Design | `/ui-ux-pro-max` (design system) → `/frontend-spec` (component spec) |
| 4. Implementation | `/speckit.plan` → `/speckit.tasks` → `/speckit.implement` |
| 5. Testing | `/test-plan` → `/test-data-strategy` → `/test-coverage` |
| 6. Code Review | `/code-review-checklist` → `/code-review` → `/pr-review` |
| 7. QA | `/quality-gate` → `/traceability-matrix` → `/test-report` |
| 8. Bug Fix | `/defect-report` → `/exploratory-testing` → `/regression-suite` |

---

## Related Documentation

- **[CLAUDE.md](../CLAUDE.md)**: Project coding standards and conventions
- **[AGENTS.md](../AGENTS.md)**: Reference for all 35 AI agents
- **[CODE_REVIEW_GUIDE.md](skills/code-quality/CODE_REVIEW_GUIDE.md)**: Detailed code review usage guide
- **[Constitution](./../.specify/memory/constitution.md)**: Six core development principles

---

*Last Updated: 2026-03-25*
*Total Skills: 30 | Spec-Kit Commands: 9*
