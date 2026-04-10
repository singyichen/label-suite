---
name: sdd-workflow
description: Complete Spec-Driven Development workflow for Label Suite — pipeline, commands, module paths, when to skip, flow chart ownership.
---

# SDD Workflow — Label Suite

This project adopts Spec-Driven Development (SDD). New features follow the sequence below.

## Pipeline

Each stage is a **hard gate** — do not advance until the current stage is complete.

```
/superpowers:brainstorm                 → requirements agreed; 2-3 design alternatives considered; YAGNI applied
/speckit.specify <feature description>  → specs/[module]/NNN-feature/spec.md
                                          ↳ Process Flow      (spec.md § Process Flow — cross-role business process)
                                          ↳ User Flow         (spec.md § User Flow & Navigation — screens + triggers)
                                          ↳ Update specs/STATUS.md → spec-ready
/pencil-wireframe                       → design/wireframes/pages/[module]/[page].pen  (optional, after specify)
/ui-ux-pro-max                          → design/prototype/pages/[module]/[page].html + design/system/  (optional, after wireframe)
                                          ⚠ Before generating: read MASTER.md + wireframe via Pencil MCP
[senior-uiux review]                    → prototype QA: wireframe fidelity, design system compliance, a11y  (optional)
[prototype Playwright tests]            → design/prototype/tests/[module]/[page].spec.ts  (after prototype HTML, before plan)
                                          ⚠ See § Prototype Playwright Tests below
/speckit.clarify                        → clarify requirements  (optional; wireframe + prototype surface ambiguities)
/speckit.plan                           → specs/[module]/NNN-feature/plan.md
                                          ↳ System Flow       (plan.md § System Flow & Data Flow — API/service/DB layers)
                                          ↳ Update specs/STATUS.md → plan-ready
/speckit.tasks                          → specs/[module]/NNN-feature/tasks.md
                                          ↳ Update specs/STATUS.md → tasks-ready
/speckit.implement                      → execute implementation (single session or /agent-team)
                                          ↳ TDD: write failing test FIRST — no exceptions (see § TDD Rule)
                                          ↳ React components reuse data-testid values from prototype tests
                                          ↳ Update specs/STATUS.md → in-progress (when branch opened)
/speckit.analyze                        → cross-document consistency check (REQUIRED gate — zero findings before PR)
/speckit.checklist                      → quality validation
/pr-flow                                → commit → review → test → push → PR → merge
                                          ↳ Update specs/STATUS.md → review → done → archived
                                          ↳ Archive: mv specs/[module]/NNN-feature specs/_archive/NNN-feature
```

---

## Module Names

Align with `frontend/src/features/` and `specs/[module]/`:

`account` · `dashboard` · `task-management` · `annotation` · `dataset` · `annotator-management` · `admin`

---

## Spec Directory Structure

```
specs/
├── STATUS.md                # Global pipeline index — update at every stage transition
├── _archive/                # Completed features (moved here after PR merged to main)
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
- Mark completion: `touch specs/[module]/NNN-feature/.completed` + update `specs/STATUS.md`
- Follow User Story priority order: P1 → P2 → P3
- Archive after merge: `mv specs/[module]/NNN-feature specs/_archive/NNN-feature`

---

## Flow Chart Ownership

| Flow Type | Document | When | Purpose |
|-----------|----------|------|---------|
| Process Flow | `spec.md` | During `/speckit.specify` | Cross-role business process; WHO does WHAT |
| User Flow | `spec.md` | During `/speckit.specify` | Screen navigation; prevents orphan pages |
| System Flow | `plan.md` | During `/speckit.plan` | Data path through API → Service → DB layers |

All diagrams use Mermaid (`sequenceDiagram` for process/system flows, `flowchart LR` for navigation). Renders natively on GitHub.

---

## Prototype Playwright Tests

### Position in Pipeline

Prototype Playwright tests sit **after the prototype HTML is built, before `/speckit.plan`**. They are the closing validation step of the prototype phase, not the opening step of the spec phase.

```
❌ Wrong:  /speckit.specify → Playwright tests → wireframe → prototype HTML
✓ Correct: /speckit.specify → wireframe → prototype HTML → Playwright tests → /speckit.plan
```

Writing tests before the prototype exists produces untestable stubs. Writing them after `/speckit.plan` loses the benefit: the plan's Frontend Spec should already reference the `data-testid` contract that tests establish.

### Purpose

| Benefit | Detail |
|---------|--------|
| Executable spec | Given-When-Then AC in `spec.md` → runnable `test()` blocks |
| `data-testid` contract | Selector names defined once here; React components reuse them verbatim |
| Early validation | Catches spec gaps and prototype UI errors before implementation begins |
| Regression guard | Prototype edits that break selectors or behavior fail tests immediately |

### What to Test (and What Not To)

**In scope — static HTML can validate:**
- Required UI elements present and visible
- Client-side form validation (required, format, length, match)
- Navigation between prototype pages
- i18n language toggle (immediate, no page reload)
- Responsive rendering (no horizontal overflow at 375px / 768px / 1440px)
- Simulated server error display (hardcoded in prototype JS)

**Out of scope — requires backend, exclude and document:**
- Authenticated routes / JWT state
- Backend API responses
- Role-based redirects
- SSO OAuth flows

Document excluded scenarios with a comment block at the top of each spec file.

### TDD Workflow

Follow Red-Green-Refactor at the design layer:

1. **Red** — Write `design/prototype/tests/[module]/[page].spec.ts` using `getByTestId()` selectors. Run tests; they fail because `data-testid` attributes are not yet in the HTML.
2. **Green** — Add `data-testid` attributes to the prototype HTML. Run tests; they all pass.
3. **Refactor** — Align test descriptions precisely with spec AC wording; confirm tests stay green.

### `data-testid` Naming Convention

Use kebab-case: `[purpose]-[element-type]` or just `[element-type]` when unambiguous.

Examples: `email-input` · `password-input` · `submit-btn` · `login-link` · `error-banner` · `success-banner` · `lang-toggle` · `lang-label` · `name-error`

These names must be used verbatim in the React component (`<input data-testid="email-input" />`). Never invent new selector names in `frontend/tests/` for elements that already exist in the prototype.

### File Structure

```
design/prototype/
├── package.json               # @playwright/test only; separate from frontend/
├── playwright.config.ts       # webServer: python3 -m http.server 8888; baseURL: http://localhost:8888
└── tests/
    └── [module]/
        └── [page].spec.ts     # mirrors specs/[module]/NNN-feature/
```

### Running Tests

```bash
# From design/prototype/
npm test                  # headless (CI)
npm run test:headed       # with browser (debug)
npm run test:ui           # Playwright UI mode
```

### Relationship to `frontend/tests/`

Prototype tests are **precursors**, not replacements, for the React E2E suite. When React is implemented, `frontend/tests/[module]/[page].spec.ts` extends the prototype tests with backend-dependent scenarios using the same `data-testid` selectors. Prototype tests are not deleted — they continue to guard the design artifact.

See ADR-014 for the full architectural rationale.

---

## TDD Rule

> **You MUST NOT write implementation code before writing a failing test.**

### Workflow
1. Write the test — confirm it **fails** (Red)
2. Write the minimum implementation to make it pass (Green)
3. Refactor — keep tests green

### Applies to
Every task in `tasks.md` that involves logic: API endpoints, services, utilities, reducers, hooks.

### Rationalisations that are NOT accepted
| Excuse | Why it's rejected |
|--------|-----------------|
| "It's too simple to need a test" | Simple code breaks too. Simple tests are cheap. |
| "I tested it manually" | Manual tests don't run in CI and don't document intent. |
| "There's no logic, just wiring" | Wiring tests catch integration failures. |
| "I'll add tests after" | Tests written after are shaped to pass existing code, not to specify behavior. |

### If you wrote code first
Delete the implementation. Restart with the test. There is no exception to this rule.

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
| `/superpowers:brainstorm` | Clarify requirements via Socratic dialogue; propose 2-3 design alternatives with trade-offs | Agreed requirements |
| `/speckit.specify` | Create feature spec from description | `specs/[module]/NNN-feature/spec.md` |
| `/pencil-wireframe` | Draw 6 frames (Desktop/Mobile ZH·EN + Components) | `design/wireframes/pages/[module]/[page].pen` |
| `/ui-ux-pro-max` | Generate HTML prototype + design system | `design/prototype/pages/[module]/[page].html` |
| `/speckit.clarify` | Identify and clarify ambiguous requirements | Questions + answers |
| `/speckit.plan` | Build technical implementation plan | `specs/[module]/NNN-feature/plan.md` |
| `/speckit.tasks` | Generate executable task list | `specs/[module]/NNN-feature/tasks.md` |
| `/speckit.analyze` | Cross-document consistency check (**REQUIRED gate before PR**) | Analysis report |
| `/speckit.implement` | Execute implementation | Code changes |
| `/speckit.checklist` | Generate quality validation checklist | `specs/[module]/NNN-feature/checklists/` |
| `/agent-team` | Multi-phase agent team workflow for cross-layer features | — |
| `/pr-flow` | Full PR flow (commit → review → test → merge) | — |

---

## SDD Rules

1. **No code without a spec** — every feature branch must have a corresponding `spec.md`
2. **No plan without a validated spec** — validate spec completeness before `/speckit.plan`
3. **TDD — no implementation before a failing test** — write the test first, confirm it fails, then implement; if you wrote code first, delete it and restart with the test; rationalisations ("it's too simple", "I tested manually") are not accepted
4. **No PR without a clean analyze** — `/speckit.analyze` must report zero findings; fix all issues and re-run until clean
5. **No merge without a checklist** — all ACs must be verified before PR creation
6. **Spec immutability** — once planning begins, spec changes require a version bump
7. **One spec per feature** — do not bundle unrelated features into one spec
8. **Archive on merge** — after PR merged to `main`, move `specs/[module]/NNN-feature` to `specs/_archive/` and update `specs/STATUS.md`
