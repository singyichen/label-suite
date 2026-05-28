<!--
Sync Impact Report — constitution v1.9.0
Generated: 2026-05-28

Version change: v1.6.2 → v1.9.0
Bump type: MINOR (×2) + PATCH (×1) + MINOR (×1) — add Principle X (Change Scope Discipline); add Principle XI (Security & Privacy Baseline); strengthen Principle IX (add structured log/audit requirement); add Source of Truth section to Governance

Changed principles:
- IX. No Silent Failure — added structured log/audit event requirement for critical actions and async workflows (PATCH → v1.8.1)
- X. Change Scope Discipline — new principle (MINOR → v1.7.0)
- XI. Security & Privacy Baseline — new NON-NEGOTIABLE principle (MINOR → v1.8.0)

New sections: Source of Truth (under Governance) (MINOR → v1.9.0)
Removed sections: none

Templates sync status:
- .specify/templates/plan-template.md: ✅ No changes required
- .specify/templates/spec-template.md: ✅ No changes required
- .specify/templates/tasks-template.md: ✅ No changes required
- .specify/templates/checklist-template.md: ✅ No changes required
- .claude/commands/speckit.*.md: ✅ No changes required

Deferred TODOs: none
-->

# Label Suite Constitution

## Core Principles

### I. Spec-First Development (RECOMMENDED)
New features should begin with a spec. The deciding question for skipping SDD is: **will this change make the system behave differently from what the specs define?** If yes, open a spec. If no, modify code directly.

- Features progress in order: requirements → spec → plan → tasks → implementation
- Each User Story must be independently implementable, testable, and deliverable
- Mark completed specs with a `.completed` file in the feature directory
- **Iteration rule**: adding a new User Story to an existing feature → update that spec with a version bump; independent new behavior in the same module → new spec
- **Spec versioning** (semantic): PATCH = clarification/wording; MINOR = new/changed User Story; MAJOR = breaking change to existing story or API contract
- **Downstream impact**: when a spec is versioned up, every spec listed in its `## Spec Dependencies → Downstream` section must be reviewed and updated if affected
- **Goal Declaration (required for all planning artifacts)**: Every spec, plan, and tasks file must state a clear, verifiable feature goal before any requirements or tasks are written. The goal answers: who benefits, what outcome is produced, and why this is worth building now. It is not a summary of features.
  - **spec.md**: Include a `## 功能目標` section immediately after the H1 title. One to three sentences. Example: "Enable annotators to submit partial labels on mobile, reducing drop-off on small screens. This is the minimum required for the pilot with Partner X."
  - **plan.md**: The `## 功能目標` must be copied or refined from spec.md. It must not change between spec and plan without a spec version bump. Follow with a `## Technical Approach` paragraph bridging the goal to the implementation.
  - **tasks.md**: Each User Story Phase must include a `**故事目標**` line that traces to one or more SC-IDs from spec.md. A Phase goal that cannot be traced to any SC-ID signals scope drift.

**Skip SDD and modify code directly for**:
- Bug fixes — making code match existing specs, not changing specs
- Typo, formatting, or comment changes — no behavior change
- Non-breaking dependency updates — no API or behavior change
- Config adjustments — no behavioral spec change
- Adding tests for existing behavior — spec is already defined

**Must go through SDD for**:
- New features — behavior not currently defined in any spec
- Behavior changes — modifying what an existing endpoint or flow does
- Breaking changes — removing fields, changing API contracts
- Architectural changes — new services, data models, or async flows

### II. Generalization-First (NON-NEGOTIABLE)
System design must support multiple NLP task types without hardcoding task-specific logic.

- Task configuration is defined via Config (YAML/JSON); task logic must not be hardcoded
- Adding a new task type must not require modifying core system code
- All labeling templates must be reusable

### III. Data Fairness (NON-NEGOTIABLE)
Evaluation results must be fair and reproducible.

- Test-set answers must never be exposed to annotators
- Scoring logic must be transparent and covered by tests

### IV. Test-First (RECOMMENDED)
- Backend: pytest coverage target ≥ 80%
- E2E: Playwright covers core user flows (labeling, submission, review)
- Tests must be written and confirmed to fail before implementation begins
- If a design makes testing difficult, refactor the design — never weaken the test to fit the implementation

### V. Code Quality & Simplicity (RECOMMENDED)

Code must be simple, readable, and consistently styled. **Overdesign is a defect**: any abstraction, pattern, or layer that cannot be justified by a current, concrete requirement must be removed before merging.

- YAGNI: do not build features for hypothetical future needs
- KISS: prefer the simplest viable solution
- Avoid premature abstraction; three similar lines of code beats an over-engineered abstraction
- All Python functions must have complete type hints; TypeScript strict mode is enforced — no `any` types
- Code must pass the project linter before merging (Python: ruff; TypeScript: ESLint)
- No debug `print` / `console.log` statements in committed code

### VI. English-First
- Code, comments, docstrings, commit messages, and variable/function names are always written in English
- Traditional Chinese is permitted in `docs/`, `specs/`, `design/prototype/`, `design/wireframes/`, and `design/system/inventory.md` to accelerate research documentation and UI iteration
- `design/system/MASTER.md` must be written in English only — it is consumed by AI agents and requires accurate token parsing
- The only fully Chinese file outside those directories is `README.zh-TW.md`

### VII. Design Consistency (RECOMMENDED)

UI must be consistent across modules and follow the established design system.

- All UI components must use design tokens defined in `design/system/MASTER.md`; hardcoded colors, spacing, or font sizes are not permitted
- Component states (loading, error, empty, disabled) must be implemented consistently across all modules
- Prototype screens in `design/prototype/pages/` are the source of truth for layout and interaction behavior; any deviation requires a spec update
- New UI features must reuse existing shared components before introducing new ones
- Accessibility must conform to WCAG 2.1 AA; all interactive elements must be keyboard-navigable and announced correctly by screen readers

### VIII. Performance Baseline (RECOMMENDED)

Core user flows must meet minimum performance thresholds.

- API P95 response time ≤ 500ms for core labeling and annotation operations
- All list-view endpoints must implement pagination (max page size: 100); unbounded queries are not permitted
- No N+1 query patterns in service-layer code
- Frontend Lighthouse Performance score ≥ 80 on desktop for core pages
- Page First Contentful Paint (FCP) must not exceed 3s on a standard connection
- User interaction must produce visible feedback within 100ms; operations exceeding that threshold must show an immediate loading state
- Non-critical routes must use code splitting and lazy loading; the initial bundle must not load all modules upfront

### IX. No Silent Failure (RECOMMENDED)

Errors must be visible, traceable, and handled at the appropriate layer.

- Silent failures (swallowed exceptions, empty catch blocks, unchecked nulls) are not permitted
- Every error must either be handled with a meaningful response or propagated to a layer that can handle it
- A single point of failure must not cause system-wide collapse; failures must be isolated
- User-facing error messages must be understandable; internal error details must be logged
- Critical user actions and backend state transitions must emit structured logs or audit events where appropriate; background jobs must expose status, retry count, and failure reason

### X. Change Scope Discipline (RECOMMENDED)

Changes must be confined to the requested feature, bug, or spec scope.

- Opportunistic refactors, formatting sweeps, or unrelated renames are not permitted unless required to complete the change safely
- If adjacent code is problematic, flag it — do not fix it silently
- Large changes must be split into independently reviewable units; a single PR must not mix unrelated concerns
- Unrelated dead code may be flagged but must not be removed unless explicitly requested

### XI. Security & Privacy Baseline (NON-NEGOTIABLE)

User data and system secrets must be protected at every layer.

- Secrets, tokens, credentials, and private keys must never be committed to the repository or exposed to clients
- User data must be returned only to authorized roles; API responses must not leak internal identifiers or sensitive metadata unless explicitly required
- All user inputs must be validated and sanitized; raw user content must not be stored or rendered without escaping
- Security-sensitive flows (auth, permission checks, data access) require tests covering unauthorized access paths

## Governance

Constitution principles take precedence over all other conventions.

**Amendment Procedure**:
- Update `specs/_governance/constitution.md` (Single Source of Truth) with the change
- Sync the change to `.specify/memory/constitution.md` (tool cache) to keep agents aware
- Propagate amendments to dependent templates (`.specify/templates/`) and commands (`.claude/commands/speckit.*.md`)
- Explain the reason in the commit message: `docs: amend constitution to vX.Y.Z ([reason])`
- Use `/speckit.constitution` to automate propagation checks

**Versioning Policy** (semantic versioning):
- **MAJOR**: Backward-incompatible removal or redefinition of a principle
- **MINOR**: New principle or section added
- **PATCH**: Clarification, wording fix, or non-semantic refinement
- Changelog entries must be written in descending version order, with the newest version first (for example, `1.5.0` before `1.4.0`).
- Constitution changelog entries use English summaries; changelog entries in `.specify/templates/` use Chinese summaries.

**Feature Goal Alignment Gate**: During PR review, the reviewer must confirm that the plan's `## 功能目標` matches the spec's `## 功能目標`. A mismatch is a blocking finding. Use `/speckit.analyze` to flag Feature Goal divergence as an alignment error.

**Source of Truth**: Requirements, API contracts, task definitions, and UI behavior specifications must each have exactly one source of truth. Derived files, generated files, and tool caches must clearly declare their source and sync process. Agents must not amend cache or derived files directly unless explicitly syncing from the authoritative source.

**Dependency Governance**: New external dependencies must be evaluated for security (known CVEs), maintenance activity, and bundle-size impact before being added. Prefer actively maintained packages with strong community support. Use `uv add` (backend) or `pnpm add` (frontend); never `pip install` or `npm install`.

**Compliance Review**: All PRs must verify compliance with all eleven principles before merging. Use `/speckit.analyze` to check cross-artifact consistency and Constitution alignment.

**Version**: 1.9.0 | **Ratified**: 2026-03-18 | **Last Amended**: 2026-05-28

## Changelog

| Version | Date | Change Summary |
|---------|------|----------------|
| 1.9.0 | 2026-05-28 | Add Source of Truth section to Governance |
| 1.8.1 | 2026-05-28 | Strengthen Principle IX: add structured log/audit event requirement for critical user actions and async workflows |
| 1.8.0 | 2026-05-28 | Add Principle XI (Security & Privacy Baseline — NON-NEGOTIABLE): secrets, data authorization, input sanitization, security path tests |
| 1.7.0 | 2026-05-28 | Add Principle X (Change Scope Discipline): confine changes to requested scope; ban opportunistic refactors; require independently reviewable PRs |
| 1.6.2 | 2026-05-28 | Strengthen Principle VII (add WCAG 2.1 AA rule); strengthen Principle VIII (add FCP ≤ 3s, interaction ≤ 100ms, code splitting; raise Lighthouse ≥ 70 → ≥ 80); add Dependency Governance note |
| 1.6.1 | 2026-05-28 | Strengthen Principle V: overdesign is a defect; any unjustified abstraction must be removed before merging |
| 1.6.0 | 2026-05-28 | Add Principle IX (No Silent Failure); strengthen Principle IV with design-for-testability rule |
| 1.5.3 | 2026-05-28 | Convert constitution changelog to English; update Versioning Policy to clarify language rules (constitution uses English, templates use Chinese); apply `## 功能目標` and `**故事目標**` localization to constitution body |
| 1.5.2 | 2026-05-28 | Rename `**Story Goal**` to `**故事目標**` in Principle I Goal Declaration |
| 1.5.1 | 2026-05-28 | Rename `## Feature Goal` to `## 功能目標` in Principle I Goal Declaration and Governance Alignment Gate |
| 1.5.0 | 2026-05-28 | Add Goal Declaration sub-rule to Principle I (all planning artifacts must state a clear feature goal); add Feature Goal Alignment Gate to Governance |
| 1.4.0 | 2026-05-21 | Add Principle VII (Design Consistency) and Principle VIII (Performance Baseline); expand Principle V with explicit code quality rules (type enforcement, linter, no debug output); update Compliance Review to cover all eight principles |
| 1.3.2 | 2026-05-21 | Require Chinese change summaries in `.specify/templates/` changelogs |
| 1.3.1 | 2026-05-21 | Require changelog entries in descending version order |
| 1.3.0 | 2026-04-13 | Baseline version prior to changelog tracking |
