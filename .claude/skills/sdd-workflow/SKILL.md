---
name: sdd-workflow
description: Complete Spec-Driven Development workflow for Label Suite — pipeline, commands, module paths, when to skip, flow chart ownership.
---

# SDD Workflow — Label Suite

This project adopts Spec-Driven Development (SDD). New features follow the sequence below. OpenSpec is the implementation/change-workflow layer; `specs/` remains the sole canon (SSoT) — see [ADR-033](../../../docs/adr/033-openspec-change-workflow.md).

## Pipeline

Each stage is a **hard gate** — do not advance until the current stage is complete.

```
/superpowers:brainstorm                 → requirements agreed; 2-3 design alternatives considered; YAGNI applied
/speckit.specify <feature description>  → specs/[module]/NNN-feature/spec.md
                                          ↳ Process Flow      (spec.md § Process Flow — cross-role business process)
                                          ↳ User Flow         (spec.md § User Flow & Navigation — screens + triggers)
                                          ↳ Update specs/STATUS.md → spec-ready
/ui-ux-pro-max                          → design/prototype/pages/[module]/[page].html + design/system/  (recommended, after specify; before OpenSpec propose)
                                          ⚠ Before generating: read MASTER.md (+ wireframe via Pencil MCP if one already exists)
/pencil-wireframe                       → design/wireframes/pages/[module]/[page].pen  (optional, after prototype)
[senior-uiux review]                    → prototype QA: spec fidelity, design system compliance, a11y; check wireframe consistency when present  (optional)
[prototype Playwright tests]            → design/prototype/tests/[module]/[page].spec.ts  (after prototype HTML, before OpenSpec propose)
                                          ⚠ See § Prototype Playwright Tests below
/speckit.clarify                        → clarify requirements  (optional; prototype + optional wireframe surface ambiguities)
/opsx:propose                           → openspec/changes/<change>/proposal.md + tasks.md (+ design.md if API contract/DB schema touched)
                                          ↳ System Flow       (design.md § System Flow & Data Flow — API/service/DB layers, when design.md exists)
                                          ↳ proposal.md frontmatter names the corresponding spec: specs/[module]/NNN-feature/spec.md
                                          ↳ Update specs/STATUS.md → change-open
/opsx:apply                             → execute implementation (single session or /agent-team)
                                          ↳ TDD: write failing test FIRST — no exceptions (see § TDD Rule)
                                          ↳ React components reuse data-testid values from prototype tests
                                          ↳ Update specs/STATUS.md → in-progress (when branch opened)
/opsx:archive                           → dual write: auto-merge into openspec/specs/ (derived view) + write back specs/[module]/NNN-feature/spec.md (version bump + Changelog — hard gate, ADR-033 Rule 1)
                                          ↳ /opsx:verify (or `openspec validate`) must pass — REQUIRED gate, zero findings before PR
/pr-flow                                → commit → review → test → push → PR → merge
                                          ↳ Update specs/STATUS.md → review → done → archived
                                          ↳ Archive: mv specs/[module]/NNN-feature specs/_archive/NNN-feature
```

---

## Module Names

Align with `frontend/src/features/` and `specs/[module]/`:

`account` · `dashboard` · `task-management` · `annotation` · `dataset` · `admin`

---

## Spec Directory Structure

```
specs/                        # Canon (SSoT) — never migrated to OpenSpec capability format
├── STATUS.md                # Global pipeline index — update at every stage transition
├── _archive/                # Completed features (moved here after PR merged to main)
└── [module]/
    └── NNN-feature/
        ├── spec.md          # Feature specification (sole canon)
        └── checklists/
            ├── ac-checklist.md
            └── security-checklist.md

openspec/                     # Implementation/change workflow layer (ADR-033)
├── config.yaml               # context (reads specs/[module]/spec.md) + rules (write-back gate, ID traceability, hard gates)
├── specs/                    # Derived view — auto-merged at archive time only; never hand-edited; never authoritative
└── changes/
    ├── <change>/
    │   ├── proposal.md       # Rationale + scope; frontmatter names the corresponding specs/[module]/NNN-feature/spec.md
    │   ├── design.md         # Technical approach (optional; mandatory if API contract/DB schema touched)
    │   ├── tasks.md          # Task breakdown
    │   └── specs/            # Requirement deltas (## ADDED/MODIFIED/REMOVED Requirements, referencing stable FR/AC IDs)
    └── archive/               # Completed changes, timestamped — work record only (ADR-033 Rule 4)
```

- `NNN` is zero-padded (001, 002, …), `feature` is kebab-case
- Mark completion: `touch specs/[module]/NNN-feature/.completed` + update `specs/STATUS.md`
- Follow User Story priority order: P1 → P2 → P3
- Archive after merge: `mv specs/[module]/NNN-feature specs/_archive/NNN-feature`
- **Exception**: `specs/foundation/000-foundation/plan.md` is retained in place as a standing architecture document (project-wide engineering baseline), not an ordinary feature plan — referenced by every change's `design.md` (ADR-033 Open Questions #3)

---

## Flow Chart Ownership

| Flow Type | Document | When | Purpose |
|-----------|----------|------|---------|
| Process Flow | `spec.md` | During `/speckit.specify` | Cross-role business process; WHO does WHAT |
| User Flow | `spec.md` | During `/speckit.specify` | Screen navigation; prevents orphan pages |
| System Flow | `design.md` | During `/opsx:propose` | Data path through API → Service → DB layers |

All diagrams use Mermaid (`sequenceDiagram` for process/system flows, `flowchart LR` for navigation). Renders natively on GitHub.

---

## Prototype Playwright Tests

### Position in Pipeline

Prototype Playwright tests sit **after the prototype HTML is built, before `/opsx:propose`**. They are the closing validation step of the prototype phase, not the opening step of the spec phase.

```
❌ Wrong:  /speckit.specify → Playwright tests → prototype HTML → /opsx:propose
✓ Correct: /speckit.specify → prototype HTML → (optional) wireframe → Playwright tests → /opsx:propose
```

Writing tests before the prototype exists produces untestable stubs. Writing them after `/opsx:propose` loses the benefit: the change's `design.md` should already reference the `data-testid` contract that tests establish.

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
├── playwright.config.ts       # webServer: node tests/serve.mjs; baseURL: http://127.0.0.1:8888
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

## Iteration Workflow (1→N)

Use this section when you are **modifying an existing feature**, not building from scratch.

### Update Existing Spec vs. Create a New Spec

| Scenario | Action |
|----------|--------|
| Add a new User Story to an existing feature | Update existing `spec.md` + version bump |
| Change what an existing User Story does | Update existing `spec.md` + version bump |
| Independent new behaviour that reuses the same module | New spec (`specs/[module]/NNN-feature/`) |
| Bug fix (code does not match spec) | Fix code only — spec is already correct |
| Refactor / perf / cleanup — no behaviour change | No spec change needed |

**Decision question**: Does this change add or alter *expected behaviour* already documented in a spec?
- Yes → version-bump that spec
- No, but it is new behaviour → new spec
- Neither → no spec change (bug-fix / refactor path)

### Version Bump Rules

Spec versions follow semantic versioning — update `**Version**` in frontmatter and add a row to `## Changelog`:

| Change | Bump | Example |
|--------|------|---------|
| Clarification, wording, non-semantic fix | PATCH | 1.0.0 → 1.0.1 |
| New User Story added | MINOR | 1.0.0 → 1.1.0 |
| Existing Story behaviour changed | MINOR | 1.0.0 → 1.1.0 |
| Breaking change (remove story, change API contract) | MAJOR | 1.0.0 → 2.0.0 |

### Updating an Existing Spec — Checklist

When a spec that already has a `change-open` or later status is changed, carry the change in an OpenSpec change folder (ADR-033):

0. **If spec is archived**: `mv specs/_archive/NNN-feature specs/[module]/NNN-feature` — retrieve from archive only if it needs direct editing during apply; re-archive after the modification PR merges
1. **`/opsx:propose`**: draft `openspec/changes/<change>/proposal.md` (frontmatter names `specs/[module]/NNN-feature/spec.md`), `tasks.md`, and `design.md` if the change touches an API contract or DB schema; the change's `specs/` delta references stable FR/AC IDs (`MODIFIED Requirement: FR-NNN`)
2. **`/opsx:apply`**: implement via TDD
3. **`/opsx:archive`**: dual write — auto-merge into the derived `openspec/specs/` view, and write back to the canonical `specs/[module]/NNN-feature/spec.md`:
   - Bump the version in frontmatter (`**Version**`)
   - Add a row to `## Changelog` with date and summary
   - Open `## Spec Dependencies → Downstream` — review every listed spec for impact
4. Update `specs/STATUS.md` — `change-open` while the change is in flight, then the version note in the notes column (e.g., `v1.1.0 — added Story 3`) after archive
5. **Post-implementation write-back**: if implementation decisions deviated from the spec during coding (any FR / SC changed), bump spec version again and record the reason in `## Changelog` before PR merge — this is a hard gate (ADR-033 Rule 1); a PR whose change touches requirements but does not update the canonical `spec.md` must not be merged

---

## Cross-Spec Dependencies

### Declaring Dependencies

Every spec has a `## Spec Dependencies` section. Fill it in at `/speckit.specify` time:

- **Upstream**: specs this feature must have available (must be `spec-ready` or implemented first)
- **Downstream**: specs that rely on something this spec defines (these must be notified on any version bump)

### Impact Process (when spec A is versioned up)

1. Open `spec A → ## Spec Dependencies → Downstream`
2. For each downstream spec B: check whether spec A's change breaks or changes an assumption spec B made
3. If yes: version-bump spec B and propagate to its OpenSpec change `tasks.md` / `design.md` as needed
4. Update `specs/STATUS.md` for every affected spec

### opsx:verify — Cross-Spec Check

`/opsx:verify` (or `openspec validate`) checks cross-spec consistency as part of its gate:

- All upstream specs listed in `## Spec Dependencies` are `spec-ready` or implemented
- No downstream spec references a capability that this spec has removed or changed without a corresponding update

---

## Lightweight Path

Use this when a change is too small for a full OpenSpec change container but still modifies expected behaviour.

**Triggers — ALL must be true:**
- ≤ 2 production code files changed (spec and test files are not counted toward this limit)
- No API contract changes (no new endpoints, no changes to existing endpoint response shape, status codes, or semantics)
- Minor behavior change requiring a spec update
- No requirement (FR/AC) is added or removed, only clarified — a pure bug fix with no requirement change always qualifies

**Sequence:** TDD → implement → spec consistency review → `/pr-flow`

**Spec consistency review** (replaces `/opsx:verify`, which requires an OpenSpec change folder):
- Verify spec version was bumped and Changelog entry matches the change
- Confirm no downstream specs reference the changed behavior without an update
- Confirm no new API contracts were introduced beyond the trigger scope

Skip: brainstorm, specify, wireframe, OpenSpec propose/apply/archive, checklist.

> If any trigger condition is uncertain, default to the full OpenSpec change flow.

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

Spec Kit narrows to spec production (the WHAT side); OpenSpec owns the implementation workflow (the HOW side). `/speckit.plan`, `/speckit.tasks`, `/speckit.implement` are retired.

| Command | Purpose | Output |
|---|---|---|
| `/superpowers:brainstorm` | Clarify requirements via Socratic dialogue; propose 2-3 design alternatives with trade-offs | Agreed requirements |
| `/speckit.specify` | Create feature spec from description | `specs/[module]/NNN-feature/spec.md` |
| `/ui-ux-pro-max` | Generate HTML prototype + design system (after specify, before OpenSpec propose) | `design/prototype/pages/[module]/[page].html` |
| `/pencil-wireframe` | Draw 6 frames (Desktop/Mobile ZH·EN + Components, optional after prototype) | `design/wireframes/pages/[module]/[page].pen` |
| `/speckit.clarify` | Identify and clarify ambiguous requirements | Questions + answers |
| `/opsx:propose` | Draft change proposal + design + tasks + requirement deltas | `openspec/changes/<change>/` |
| `/opsx:apply` | Execute implementation from the proposal's tasks | Code changes |
| `/opsx:archive` | Archive the change: auto-merge derived view + write back canonical spec (**REQUIRED gate before PR**) | `openspec/specs/` update + `specs/[module]/NNN-feature/spec.md` version bump |
| `/opsx:verify` | Cross-document consistency check for the change (or `openspec validate` if unavailable) | Verification report |
| `/agent-team` | Multi-phase agent team workflow for cross-layer features | — |
| `/pr-flow` | Full PR flow (commit → review → test → merge) | — |

---

## SDD Rules

1. **No code without a spec** — every feature branch must have a corresponding `spec.md`
2. **No OpenSpec change without a validated spec** — validate spec completeness before `/opsx:propose`
3. **TDD — no implementation before a failing test** — write the test first, confirm it fails, then implement; if you wrote code first, delete it and restart with the test; rationalisations ("it's too simple", "I tested manually") are not accepted
4. **No PR without a clean verify** — `/opsx:verify` (or `openspec validate`) must report zero findings, and the write-back Source-Verify gate must pass; fix all issues and re-run until clean
5. **No merge without a checklist** — all ACs must be verified before PR creation
6. **Spec immutability** — once planning begins, spec changes require a version bump
7. **One spec per feature** — do not bundle unrelated features into one spec
8. **Archive on merge** — after PR merged to `main`, move `specs/[module]/NNN-feature` to `specs/_archive/` and update `specs/STATUS.md`
