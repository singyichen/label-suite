# Claude Code Skills & Commands Directory

This document provides a comprehensive overview of all available Spec-Kit Commands and Knowledge-Domain Skills for the Label Suite project.

## Directory Structure

```
.claude/
├── commands/                    # Spec-Kit Commands + Workflow Commands
│   ├── speckit.specify.md       # Create feature spec
│   ├── speckit.plan.md          # Create implementation plan
│   ├── speckit.tasks.md         # Generate task list
│   ├── speckit.implement.md     # Execute implementation
│   ├── speckit.clarify.md       # Clarify spec ambiguities
│   ├── speckit.analyze.md       # Cross-artifact analysis
│   ├── speckit.checklist.md     # Generate quality checklist
│   ├── speckit.constitution.md  # Update project constitution
│   ├── speckit.taskstoissues.md # Convert tasks to GitHub Issues
│   ├── pencil-wireframe.md      # Draw 6-frame wireframes via Pencil MCP (frozen — see design/wireframes/README.md)
│   ├── pr-flow.md               # Full PR flow (commit → review → test → merge)
│   ├── review-resolve.md        # Fetch PR review threads, fix findings, resolve
│   └── agent-team.md            # Multi-phase agent team workflow for new features
├── skills/                      # Knowledge-Domain Skills (flat — Claude Code only discovers `.claude/skills/<name>/SKILL.md` one level deep)
│   │                            # Spec-Driven Development
│   ├── sdd-workflow/
│   ├── spec-to-plan/
│   ├── spec-review/
│   ├── spec-format/                 # frontmatter name: speckit-spec-format
│   │                            # Requirements Engineering
│   ├── user-story/
│   ├── functional-req/
│   ├── acceptance-criteria/
│   │                            # System Design
│   ├── api-spec/
│   ├── backend-spec/
│   ├── frontend-spec/
│   ├── data-model/
│   ├── flowchart/
│   │                            # Code Quality
│   ├── code-review-deep/            # incl. CODE_REVIEW_GUIDE.md (renamed from code-review to avoid clashing with the built-in /code-review command)
│   ├── code-review-checklist/
│   ├── pr-review/
│   ├── code-smell/
│   ├── git-branch/
│   ├── independent-review/
│   │                            # Test Engineering
│   ├── test-plan/
│   ├── test-coverage/
│   ├── test-data-strategy/
│   ├── test-tracking/
│   ├── exploratory-testing/
│   ├── regression-suite/
│   │                            # Quality Assurance
│   ├── quality-gate/
│   ├── defect-report/
│   ├── traceability-matrix/
│   ├── test-report/
│   │                            # Standalone
│   ├── xmind-import/                # Fetch XMind share URL → Mermaid
│   ├── ui-ux-pro-max/               # UI/UX Design Intelligence
│   └── react-best-practices/        # React/Next.js performance optimization (Vercel)
├── agents/                      # AI Agent definitions (26 agents)
└── SKILLS.md                    # This file
```

---

## Spec-Kit Commands

Spec-Kit commands provide a Spec-Driven Development (SDD) workflow powered by [GitHub spec-kit](https://github.com/github/spec-kit). Specs are stored in `specs/[module]/NNN-feature/` directories.

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
/speckit.specify → /ui-ux-pro-max (prototype) → /pencil-wireframe (frozen) → /speckit.clarify → /spec-review
                                                                                                     ↓
                                                                          /speckit.plan → /speckit.tasks → /speckit.analyze → /speckit.implement
                                                                                                                        ↓                                    ↓
                                                                                                        /speckit.taskstoissues              /speckit.checklist
```

### Related Files

- **Constitution**: `.specify/memory/constitution.md` (6 core principles)
- **Templates**: `.specify/templates/` (spec, plan, tasks, checklist, agent-file, constitution templates)
- **Specs**: `specs/` (feature specifications, organized as `specs/[module]/NNN-feature/`)

---

## Workflow Commands

Commands for broader development workflow tasks (PR management, wireframing, multi-agent orchestration).

| Command | Purpose | Example Usage |
|---------|---------|---------------|
| `/ui-ux-pro-max` | Generate HTML prototype + design system before planning | `/ui-ux-pro-max Build dashboard page prototype` |
| `/pencil-wireframe` | Draw 6-frame wireframes via Pencil MCP (frozen 2026-08-20 — see design/wireframes/README.md) | `/pencil-wireframe` |
| `/pr-flow` | Full PR flow (commit → review → test → merge) | `/pr-flow` |
| `/review-resolve` | Fetch PR review threads, fix all findings, resolve | `/review-resolve 21` |
| `/agent-team` | Multi-phase agent team workflow for new features | `/agent-team` |

---

## Knowledge-Domain Skills

### Spec-Driven Development (3 skills)

Skills for the SDD workflow — writing, reviewing, and transforming spec artifacts.

| Skill | Purpose | Example Usage |
|-------|---------|---------------|
| `/sdd-workflow` | Full SDD workflow guide (specify → checklist) | `/sdd-workflow` |
| `/spec-to-plan` | Transform a `spec.md` into a detailed `plan.md` | `/spec-to-plan specs/annotation/001-annotation-submission/spec.md` |
| `/spec-review` | Review spec completeness and Constitution compliance | `/spec-review specs/annotation/001-annotation-submission/spec.md` |

### Requirements Engineering (3 skills)

Skills for defining, converting, and validating requirements.

| Skill | Purpose | Example Usage |
|-------|---------|---------------|
| `/user-story` | Create User Stories with AC and story points | `/user-story annotator submits predictions for text classification` |
| `/functional-req` | Write functional and non-functional requirements | `/functional-req annotation submission and scoring pipeline` |
| `/acceptance-criteria` | Generate comprehensive AC checklists | `/acceptance-criteria annotation submission feature` |

### System Design (5 skills)

Skills for designing APIs, services, data models, and architecture.

| Skill | Purpose | Example Usage |
|-------|---------|---------------|
| `/api-spec` | Design RESTful API specifications (FastAPI) | `/api-spec submission and scoring endpoints` |
| `/backend-spec` | Generate backend service architecture specs | `/backend-spec ScoringService — compute evaluation metrics` |
| `/frontend-spec` | Generate frontend component specifications | `/frontend-spec AnnotationWorkspace component` |
| `/data-model` | Design PostgreSQL schemas and ER diagrams | `/data-model annotation submission and leaderboard` |
| `/flowchart` | Generate Mermaid flowcharts | `/flowchart annotation submission and async scoring flow` |

### Diagramming (1 skill)

| Skill | Purpose | Example Usage |
|-------|---------|---------------|
| `/xmind-import` | Fetch XMind share URL → parse JSON → output Mermaid `flowchart LR` | `/xmind-import https://app.xmind.com/share/PKjJEIHD docs/functional-map/functional-map.md` |

### UI/UX Design (1 skill)

Skills for UI design systems, component styling, and UX best practices.

| Skill | Purpose | Example Usage |
|-------|---------|---------------|
| `/ui-ux-pro-max` | Generate complete design systems (style, color, typography, UX guidelines) for any product type | `/ui-ux-pro-max Build a dashboard for annotation analytics` |

### React Best Practices (1 skill)

70 React/Next.js performance optimization rules from Vercel Engineering, organized by impact priority.

| Skill | Purpose | Example Usage |
|-------|---------|---------------|
| `/react-best-practices` | Apply React/Next.js performance patterns when writing, reviewing, or refactoring components | `/react-best-practices` |

**Rule Categories:**

- **CRITICAL**: Eliminating Waterfalls (`async-*`), Bundle Size (`bundle-*`)
- **HIGH**: Server-Side Performance (`server-*`)
- **MEDIUM**: Client-Side Data Fetching (`client-*`), Re-render Optimization (`rerender-*`), Rendering Performance (`rendering-*`)
- **LOW**: JavaScript Performance (`js-*`), Advanced Patterns (`advanced-*`)

**Source:** [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills/tree/main/skills/react-best-practices) — MIT License

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
| `/code-review-deep` | Comprehensive code review (quality, security, test-set leakage) | `/code-review-deep backend/app/services/scoring.py` |
| `/code-review-checklist` | Generate project-specific review checklists | `/code-review-checklist scoring` |
| `/pr-review` | Full PR review with spec traceability and leakage audit | `/pr-review #42` |
| `/code-smell` | Detect code smells and suggest refactoring | `/code-smell backend/app/services/` |
| `/git-branch` | Standardized git branch lifecycle | `/git-branch feat/001-annotation-submission` |

See [CODE_REVIEW_GUIDE.md](skills/code-review-deep/CODE_REVIEW_GUIDE.md) for the detailed code review usage guide.

### Test Engineering (6 skills)

Skills for test planning, execution, data management, and coverage analysis.

| Skill | Purpose | Example Usage |
|-------|---------|---------------|
| `/test-plan` | Create comprehensive test plans | `/test-plan specs/annotation/001-annotation-submission/spec.md` |
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
| `/traceability-matrix` | Build User Story → AC → Spec → Code → Test traceability | `/traceability-matrix specs/annotation/001-annotation-submission/` |
| `/test-report` | Generate Sprint/Release test reports | `/test-report sprint` |

---

## Quick Reference

| Domain | Count | Skills |
|--------|-------|--------|
| Spec-Driven Development | 3 | sdd-workflow, spec-to-plan, spec-review |
| Requirements Engineering | 3 | user-story, functional-req, acceptance-criteria |
| System Design | 5 | api-spec, backend-spec, frontend-spec, data-model, flowchart |
| Code Quality | 5 | code-review-deep, code-review-checklist, pr-review, code-smell, git-branch |
| Test Engineering | 6 | test-plan, test-coverage, test-data-strategy, test-tracking, exploratory-testing, regression-suite |
| Quality Assurance | 4 | quality-gate, defect-report, traceability-matrix, test-report |
| UI/UX Design | 1 | ui-ux-pro-max |
| Diagramming | 1 | xmind-import |
| **Total** | **28** | |

---

## Scoring & Security Special Requirements

For the Label Suite project, these skills enforce additional constraints for the scoring engine and test-set leakage prevention:

| Skill | Special Requirement |
|-------|---------------------|
| `/test-coverage` | Scoring engine requires ≥90% coverage (vs ≥80% general) |
| `/code-review-deep` | Must audit every annotator-facing API response for `answer` field exposure |
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
| 6. Code Review | `/code-review-checklist` → `/code-review-deep` → `/pr-review` |
| 7. QA | `/quality-gate` → `/traceability-matrix` → `/test-report` |
| 8. Bug Fix | `/defect-report` → `/exploratory-testing` → `/regression-suite` |

---

## Related Documentation

- **[CLAUDE.md](../CLAUDE.md)**: Project coding standards and conventions
- **[AGENTS.md](../AGENTS.md)**: Reference for all 26 AI agents and agent team structure
- **[CODE_REVIEW_GUIDE.md](skills/code-review-deep/CODE_REVIEW_GUIDE.md)**: Detailed code review usage guide
- **[Constitution](./../.specify/memory/constitution.md)**: Six core development principles

---

*Last Updated: 2026-07-21*
*Total Skills: 30 | Spec-Kit Commands: 9 | Workflow Commands: 4*
