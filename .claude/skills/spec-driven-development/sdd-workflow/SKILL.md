---
name: sdd-workflow
description: Complete Spec-Driven Development workflow for Label Suite — pipeline, commands, module paths, when to skip, flow chart ownership.
---

# SDD Workflow — Label Suite

This project adopts Spec-Driven Development (SDD). New features follow the sequence below.

## Pipeline

```
/speckit.specify <feature description>  → specs/[module]/NNN-feature/spec.md
                                          ↳ Process Flow      (spec.md § Process Flow — cross-role business process)
                                          ↳ User Flow         (spec.md § User Flow & Navigation — screens + triggers)
/pencil-wireframe                       → design/wireframes/pages/[module]/[page].pen  (optional, after specify)
/ui-ux-pro-max                          → design/prototype/pages/[module]/[page].html + design/system/  (optional, after wireframe)
                                          ⚠ Before generating: read MASTER.md + wireframe via Pencil MCP
[senior-uiux review]                    → prototype QA: wireframe fidelity, design system compliance, a11y  (optional)
/speckit.clarify                        → clarify requirements  (optional; wireframe + prototype surface ambiguities)
/speckit.plan                           → specs/[module]/NNN-feature/plan.md
                                          ↳ System Flow       (plan.md § System Flow & Data Flow — API/service/DB layers)
/speckit.tasks                          → specs/[module]/NNN-feature/tasks.md
/speckit.analyze                        → cross-document consistency check (optional)
/speckit.implement                      → execute implementation (single session or /agent-team)
/speckit.checklist                      → quality validation
/pr-flow                                → commit → review → test → push → PR → merge
```

---

## Module Names

Align with `frontend/src/features/` and `specs/[module]/`:

`account` · `dashboard` · `task-management` · `annotation` · `dataset` · `annotator-management` · `admin`

---

## Spec Directory Structure

```
specs/
└── [module]/
    └── NNN-feature/
        ├── spec.md          # Feature specification
        ├── plan.md          # Implementation plan
        ├── tasks.md         # Task breakdown
        └── checklists/
            ├── ac-checklist.md
            └── security-checklist.md
```

- `NNN` is zero-padded (001, 002, …), `feature` is kebab-case
- Mark completion: `touch specs/[module]/NNN-feature/.completed`
- Follow User Story priority order: P1 → P2 → P3

---

## Flow Chart Ownership

| Flow Type | Document | When | Purpose |
|-----------|----------|------|---------|
| Process Flow | `spec.md` | During `/speckit.specify` | Cross-role business process; WHO does WHAT |
| User Flow | `spec.md` | During `/speckit.specify` | Screen navigation; prevents orphan pages |
| System Flow | `plan.md` | During `/speckit.plan` | Data path through API → Service → DB layers |

All diagrams use Mermaid (`sequenceDiagram` for process/system flows, `flowchart LR` for navigation). Renders natively on GitHub.

---

## When to Skip SDD

**Deciding question: will this change make the system behave differently from what the specs define?**

### Skip SDD — modify code directly

| Case | Examples |
|---|---|
| Bug fix | Spec says login failure returns 401, but code returns 500 — fix it |
| Typo / formatting / comment | No behavior change |
| Non-breaking dependency update | Bumping a package version with no API changes |
| Config adjustment | Changing a timeout value, env var default |
| Adding tests for existing behavior | Spec defines the behavior; tests just verify it |

> If the fix is complex or you want a decision record, opening a spec is still fine.

### Must go through SDD

| Case | Examples |
|---|---|
| New feature | Anything that adds behavior not currently in specs |
| Behavior change | Changing what an existing endpoint returns |
| Breaking change | Removing a field, changing an API contract |
| Architectural change | New service, new data model, new async flow |

---

## Spec-Kit Commands

| Command | Purpose | Output |
|---|---|---|
| `/speckit.specify` | Create feature spec from description | `specs/[module]/NNN/spec.md` |
| `/pencil-wireframe` | Draw 6 frames (Desktop/Mobile ZH·EN + Components) | `design/wireframes/pages/[module]/[page].pen` |
| `/ui-ux-pro-max` | Generate HTML prototype + design system | `design/prototype/pages/[module]/[page].html` |
| `/speckit.clarify` | Identify and clarify ambiguous requirements | Questions + answers |
| `/speckit.plan` | Build technical implementation plan | `specs/[module]/NNN/plan.md` |
| `/speckit.tasks` | Generate executable task list | `specs/[module]/NNN/tasks.md` |
| `/speckit.analyze` | Cross-document consistency check | Analysis report |
| `/speckit.implement` | Execute implementation | Code changes |
| `/speckit.checklist` | Generate quality validation checklist | `specs/[module]/NNN/checklists/` |
| `/agent-team` | Multi-phase agent team workflow for cross-layer features | — |
| `/pr-flow` | Full PR flow (commit → review → test → merge) | — |

---

## SDD Rules

1. **No code without a spec** — every feature branch must have a corresponding `spec.md`
2. **No plan without a validated spec** — validate spec completeness before `/speckit.plan`
3. **No merge without a checklist** — all ACs must be verified before PR creation
4. **Spec immutability** — once planning begins, spec changes require a version bump
5. **One spec per feature** — do not bundle unrelated features into one spec
