<!--
Sync Impact Report — constitution v1.31.0
Generated: 2026-06-02

Version change: v1.30.0 → v1.31.0
Bump type: MINOR — split domain-specific governance into backend, frontend, and testing constitutions while keeping the main constitution focused on project-wide authority

Changed principles:
- I. Spec-First Development — keep project-wide SDD rules and move detailed task decomposition rules to testing/backend/frontend constitutions
- IV. Test-First — keep TDD as a project-wide rule and delegate coverage/tooling details to testing constitution
- VII. Design Consistency — keep design-system authority and delegate React/runtime details to frontend constitution
- VIII. Performance Baseline — keep project-wide performance expectations and delegate implementation details to backend/frontend constitutions
- X. Change Scope Discipline — keep PR scope rules and delegate layer-specific PR guidance to backend/frontend constitutions
- XVII. CI/CD Quality Gates — keep global merge gate and delegate command details to testing constitution
- XVIII. Deployment Safety & Rollback — keep rollback requirement and delegate migration detail to backend constitution
- XXI-XXIX domain-specific principles — moved into applicable backend/frontend/testing constitutions where they are loaded by task scope

New sections:
- Domain Constitutions

Removed sections:
- None semantically; domain-specific implementation rules now live in `.specify/memory/backend-constitution.md`, `.specify/memory/frontend-constitution.md`, and `.specify/memory/testing-constitution.md`

Templates sync status:
- .claude/commands/speckit.plan.md: Updated — load applicable domain constitutions by affected scope
- .claude/commands/speckit.analyze.md: Updated — include applicable domain constitutions in the ruleset
- AGENTS.md: Updated — document required domain constitution loading
- .specify/templates/: No changes required

Deferred TODOs: none
-->

# Label Suite Constitution

## Core Principles

### I. Spec-First Development (RECOMMENDED)

New features should begin with a spec. The deciding question for skipping SDD is: **will this change make the system behave differently from what the specs define?** If yes, open a spec. If no, modify code directly.

- Features progress in order: requirements → spec → plan → tasks → implementation
- Each User Story must be independently implementable, testable, and deliverable
- Mark completed specs with a `.completed` file in the feature directory
- Adding a new User Story to an existing feature requires a spec version bump; independent new behavior in the same module requires a new spec
- Spec versions follow semantic meaning: PATCH = clarification/wording; MINOR = new/changed User Story; MAJOR = breaking change to an existing story or API contract
- When a spec version changes, every spec listed in its `## Spec Dependencies → Downstream` section must be reviewed and updated if affected
- Every spec, plan, and tasks file must state a clear, verifiable feature goal before requirements or tasks are written
- `spec.md` and `plan.md` must include a `## 功能目標` section; `tasks.md` must include `**故事目標**` for each User Story phase

**Skip SDD and modify code directly for**:
- Bug fixes — making code match existing specs, not changing specs
- Typo, formatting, or comment changes — no behavior change
- Non-breaking dependency updates — no API or behavior change
- Config adjustments — no behavioral spec change
- Adding tests for existing behavior — spec is already defined

**Must go through SDD for**:
- New features — behavior not currently defined in any spec
- Behavior changes — modifying what an existing endpoint or flow does
- Breaking changes — removing fields or changing API contracts
- Architectural changes — new services, data models, or async flows

### II. Generalization-First (NON-NEGOTIABLE)

System design must support multiple NLP task types without hardcoding task-specific logic.

- Task configuration is defined through validated config, not task-specific branches in core code
- Adding a new task type must not require modifying core system code
- Labeling templates, scoring choices, and annotation widgets must be reusable through config-driven registries or equivalent config-derived dispatch

### III. Data Fairness (NON-NEGOTIABLE)

Evaluation results must be fair and reproducible.

- Test-set answers must never be exposed to annotators
- Gold/test items must be indistinguishable from regular items in annotator-facing UI and metadata
- Sampling, train/dev/test splits, assignment, scoring, review, and export behavior must be reproducible from declared dataset, schema, task config, and seed/version inputs
- Scoring logic must be transparent and covered by tests

### IV. Test-First (RECOMMENDED)

All behavior changes follow Red-Green-Refactor.

- Tests must be written and confirmed to fail before implementation begins
- If a design makes testing difficult, refactor the design; do not weaken the test to fit the implementation
- Backend, frontend, prototype, security, and E2E test details are governed by `.specify/memory/testing-constitution.md`

### V. Code Quality & Simplicity (RECOMMENDED)

Code must be simple, readable, and consistently styled. **Overdesign is a defect**.

- YAGNI: do not build features for hypothetical future needs
- KISS: prefer the simplest viable solution
- Avoid premature abstraction; repeated real use must justify shared layers or generalized patterns
- All Python functions must have complete type hints
- TypeScript strict mode is enforced; `any` is prohibited
- Code must pass project linters before merging
- Debug `print` and `console.log` statements are not permitted in committed code
- Names and entry points must make the main behavior traceable without excessive indirection

### VI. English-First

- Code, comments, docstrings, commit messages, API contracts, and variable/function names are always written in English
- Traditional Chinese is permitted in `docs/`, `specs/`, `design/prototype/`, `design/wireframes/`, and `design/system/inventory.md`
- `design/system/MASTER.md` must be written in English only
- The only fully Chinese file outside those directories is `README.zh-TW.md`

### VII. Design Consistency (RECOMMENDED)

UI must be consistent across modules and follow the established design system.

- UI components must use design tokens defined in `design/system/MASTER.md`
- Prototype screens in `design/prototype/pages/` are the source of truth for layout and interaction behavior; deviations require a spec update
- New UI features must reuse existing shared components before introducing new ones
- Accessibility must conform to WCAG 2.1 AA
- Frontend-specific UI, runtime, Storybook, and selector-contract rules are governed by `.specify/memory/frontend-constitution.md`

### VIII. Performance Baseline (RECOMMENDED)

Core user flows must meet minimum performance thresholds.

- Core labeling and annotation APIs target P95 response time ≤ 500ms
- List endpoints must be paginated with bounded page sizes
- User interaction must produce visible feedback within 100ms or show an immediate loading state
- Core frontend pages must meet the project Lighthouse target defined in the frontend constitution
- Backend and frontend performance implementation rules are governed by their applicable domain constitutions

### IX. No Silent Failure (RECOMMENDED)

Errors must be visible, traceable, and handled at the appropriate layer.

- Silent failures, swallowed exceptions, empty catch blocks, and unchecked null paths are not permitted
- Every error must be handled with a meaningful response or propagated to a layer that can handle it
- User-facing error messages must be understandable; internal details must be logged without leaking sensitive data
- Critical user actions and backend state transitions must emit structured logs or audit events where appropriate

### X. Change Scope Discipline (RECOMMENDED)

Changes must be confined to the requested feature, bug, or spec scope.

- Opportunistic refactors, formatting sweeps, and unrelated renames are not permitted unless required to complete the change safely
- If adjacent code is problematic, flag it rather than silently fixing unrelated scope
- Large changes must be split into independently reviewable units
- A single PR must not touch more than 5 files or exceed 300 lines of diff excluding tests; PRs exceeding either threshold must be split before opening
- Backend/frontend layer split details are governed by applicable domain constitutions

### XI. Security & Privacy Baseline (NON-NEGOTIABLE)

User data and system secrets must be protected at every layer.

- Secrets, tokens, credentials, and private keys must never be committed or exposed to clients
- User data must be returned only to authorized roles
- All user inputs must be validated and sanitized
- Security-sensitive flows require tests covering unauthorized access paths
- Test-set answers, internal scoring metadata, and private dataset fields must never be exposed to annotators via API responses, frontend state, logs, caches, traces, screenshots, or fixtures
- Error messages and logs must not include secrets, credentials, raw JWT tokens, or sensitive user data

### XII. Traceability & Auditability (RECOMMENDED)

Every non-trivial change must be traceable to its origin, intent, and verification path.

- Non-trivial code changes must reference the related spec, issue, task, bug report, or explicit user request
- Spec-driven implementation must trace code, tests, and PR descriptions back to SC-IDs from `spec.md`
- Bug fixes must document the reproduction path, root cause, and verification performed
- Critical backend state transitions must be logged or auditable

### XIII. Label Quality & Reviewability (RECOMMENDED)

Annotation quality must be measurable, traceable, and improvable.

- Tasks that assign the same item to multiple annotators must support inter-annotator agreement where applicable
- Every task must declare a review, adjudication, or disagreement-resolution flow in task config
- Annotator quality must be traceable to individual items, tasks, batches, and time periods
- Low-quality annotations must follow a defined lifecycle and must not be silently discarded

### XIV. Dataset Lineage & Schema Versioning (RECOMMENDED)

Dataset provenance and label schema evolution must be tracked and preserved.

- Every dataset item must record import source, import batch, and preprocessing version
- Label schemas and task configs must be versioned
- Every annotation must record the schema version under which it was created
- Breaking schema changes must not be silently applied to annotations produced under prior versions

### XV. Role-Based Access Control (NON-NEGOTIABLE)

Access to annotations, datasets, and system actions must be governed by explicit roles.

- Annotators must not see peer annotations unless task config explicitly enables consensus visibility
- Reviewers' access to source metadata must be limited to what is required for review
- Destructive admin actions must be restricted to authorized roles and produce audit logs
- Role assignments and revocations must be audited; access must be revoked immediately on role removal

### XVI. Export Reproducibility & Integrity (RECOMMENDED)

Annotation exports must be deterministic, versioned, and validated before delivery.

- Exports must be deterministic from declared dataset version, schema version, task config version, and export timestamp
- Export artifacts must include metadata identifying the versions and requesting user
- Breaking export-format changes require an export format version increment
- Export validation failures must abort the export rather than silently skipping affected items

### XVII. CI/CD Quality Gates (RECOMMENDED)

Every pull request must pass automated quality checks before merging.

- Pull requests must pass required tests, type checks, lint checks, and build checks before merge
- Failing CI must not be bypassed without documented approval and a follow-up issue
- Security-sensitive changes require regression tests covering denial paths
- Generated artifacts must be reproducible from source
- Command and coverage details are governed by `.specify/memory/testing-constitution.md`

### XVIII. Deployment Safety & Rollback (RECOMMENDED)

Deployments and schema changes must be reversible or have an explicit recovery plan.

- Every deployment must have a documented rollback path
- Database migrations must be backward-compatible where possible; breaking migrations require a rollout and rollback plan
- Long-running background jobs must be retryable or resumable
- Deployment failures must not leave the system in a partially migrated state
- Migration details are governed by `.specify/memory/backend-constitution.md`

### XIX. Environment & Configuration Integrity (RECOMMENDED)

Runtime environments must be predictable, validated, and consistent.

- Required environment variables must be validated at startup
- Environment-specific behavior must be controlled by explicit configuration, never hidden code branches
- Development, staging, and production must run the same test and build commands unless an ADR documents the exception
- Default development credentials must not be valid in staging or production

### XX. Source of Truth & Contract Governance (RECOMMENDED)

Requirements, API contracts, task definitions, UI behavior, and shared domain values must each have exactly one source of truth.

- Derived files, generated files, and tool caches must clearly declare their source and sync process
- API behavior changes require contract updates in the same change
- Shared enums, status values, task types, role names, error codes, and workflow states must be centrally documented
- Mock data, fixtures, and prototypes must not conflict with the canonical contract
- Generated types or contract tests must be used where practical to prevent silent drift

### XXI. Data Classification, Retention & Deletion (RECOMMENDED)

Data assets must be classified, retained, and deleted according to defined policies.

- Dataset fields must be reviewed for PII or sensitive content before ingestion
- Each data category must have a defined retention policy
- Deletion behavior for derived resources must be explicit
- Users must not receive deleted or expired data through caches, exports, or API responses
- Soft-delete patterns require a hard-delete or anonymization path for sensitive data

## Domain Constitutions

The main constitution is intentionally limited to project-wide rules. Domain constitutions are mandatory when their scope applies:

- Load `.specify/memory/backend-constitution.md` for backend code, API routes, schemas, services, database models, migrations, Redis, Celery, OpenAPI, backend security, backend performance, or backend deployment work
- Load `.specify/memory/frontend-constitution.md` for React code, prototypes that bind to React behavior, frontend routing, shared UI, i18n, Storybook, accessibility, frontend state, selector contracts, or frontend performance work
- Load `.specify/memory/testing-constitution.md` for all behavior changes, bug fixes with regression tests, test strategy, coverage, fixtures, CI checks, Playwright, Vitest, pytest, or security leakage tests — because "all behavior changes" encompasses most implementation work, the testing constitution is effectively always in scope

If a domain constitution conflicts with this main constitution, this main constitution wins. If a domain constitution conflicts with an accepted ADR, use the stricter rule unless the ADR explicitly supersedes that domain constitution.

## Governance

Constitution principles take precedence over all other conventions.

**Amendment Procedure**:
- Update `specs/_governance/constitution.md` first
- Sync the full content to `.specify/memory/constitution.md` as the tool cache
- Propagate amendments to dependent domain constitutions, templates, and `.claude/commands/speckit.*.md`
- Explain the reason in the commit message: `docs: amend constitution to vX.Y.Z ([reason])`
- Use `/speckit.constitution` to automate propagation checks when possible

**Domain Constitution Amendment Procedure**:

- Source of truth for domain constitutions lives in `specs/_governance/`: `backend-constitution.md`, `frontend-constitution.md`, `testing-constitution.md`
- Edit the source file in `specs/_governance/` first, then sync the full content to the corresponding `.specify/memory/` tool cache
- Domain constitution changes that affect project-wide rules must also amend the main constitution
- Commit message format: `docs: amend [backend|frontend|testing]-constitution ([reason])`

**Versioning Policy**:
- **MAJOR**: Backward-incompatible removal or redefinition of a principle
- **MINOR**: New principle or section added
- **PATCH**: Clarification, wording fix, or non-semantic refinement
- Changelog entries must be written in descending version order, with the newest version first
- Constitution changelog entries use English summaries; changelog entries in `.specify/templates/` use Chinese summaries

**Feature Goal Alignment Gate**: During PR review, the reviewer must confirm that the plan's `## 功能目標` matches the spec's `## 功能目標`. A mismatch is a blocking finding. Use `/speckit.analyze` to flag Feature Goal divergence as an alignment error.

**Dependency Governance**: New external dependencies must be evaluated for security, maintenance activity, and bundle-size impact before being added. Use `uv add` for backend and `pnpm add` for frontend; never `pip install` or `npm install`.

**Compliance Review**: All PRs must verify compliance with the main constitution and every applicable domain constitution before merging. Use `/speckit.analyze` to check cross-artifact consistency and constitution alignment.

**Version**: 1.31.0 | **Ratified**: 2026-03-18 | **Last Amended**: 2026-06-02

## Changelog

| Version | Date | Change Summary |
|---------|------|----------------|
| 1.31.0 | 2026-06-02 | Split detailed backend, frontend, and testing governance out of the main constitution into mandatory domain constitutions; add Domain Constitutions loading rules; update compliance review to cover applicable domain constitutions |
| 1.30.0 | 2026-06-02 | Strengthen Principle I (add task granularity: one file per task, TDD task separation, Storybook task separation, migration decomposition into upgrade/downgrade/roundtrip); strengthen Principle X (add PR size limit ≤ 5 files / ≤ 300 lines, backend layer PR separation, frontend layer PR separation, BE/FE independence rule); strengthen Principle XVIII (migration PRs must be standalone, every migration PR requires a Rollback Plan section) |
| 1.29.1 | 2026-05-29 | Strengthen Principle VII (add Storybook story requirement for non-page components); Principle XXIII (add prototype↔React data-testid contract binding rule); Principle XXIX (add universal explicit-TTL requirement for all cache entries) |
| 1.29.0 | 2026-05-29 | Extend Principle V (Code Quality & Simplicity) with Human Handoff Readiness: intent-stating names, two-call-level entry point reachability, one-indirection main path, no readability-sacrificing compression |
| 1.28.0 | 2026-05-28 | Add Principle XXX (Test Data Isolation — NON-NEGOTIABLE): no production/PII/real answer-key data in tests; synthetic or approved-scrubbed datasets only; fictional annotator-facing scenarios; approved synthetic datasets for scoring tests |
| 1.27.0 | 2026-05-28 | Add Principle XXIX (Cache Safety & Invalidation — RECOMMENDED): boundary-scoped cache keys; no test-set answers or scoring internals in cache; invalidation triggers on auth/lifecycle events; live auth validation or short TTL for permission-sensitive responses; documented cache behavior |
| 1.26.0 | 2026-05-28 | Add Principle XXVIII (Canonical Domain Lifecycle — RECOMMENDED): canonical states and valid transitions for task/batch/annotation/review/adjudication/export/dataset version; service-layer rejection of invalid transitions; documented actor/authorization/side-effects/audit/rollback per transition; transition coverage in tests |
| 1.25.0 | 2026-05-28 | Add Principle XXVII (Data Classification, Retention & Deletion — RECOMMENDED): pre-ingestion PII review and minimization; defined retention policy per data category; explicit cascade/anonymize/retain policy on primary resource deletion; no stale data after delete/expiry; hard-delete or anonymization path required for soft-delete |
| 1.24.0 | 2026-05-28 | Add Principle XXVI (Database-Enforced Integrity — RECOMMENDED): FK constraints on core entity relationships; DB unique constraints for uniqueness invariants; transactions for multi-step mutations; optimistic/pessimistic locks for concurrent state; migration data validation or backfill strategy |
| 1.23.0 | 2026-05-28 | Add Principle XXV (Cross-Layer Correlation & Observability — RECOMMENDED): request_id/correlation_id on all HTTP requests and log entries; structured logs for annotation/assignment/review/scoring/import-export/auth/job events; background job attempt history; queryable by correlation ID; correlation ID in API error responses |
| 1.22.0 | 2026-05-28 | Add Principle XXIV (Backend Consistency & Idempotency — RECOMMENDED): idempotency and conflict behavior declarations; concurrent state protection; retryable/resumable jobs; partial failure recovery; race-condition tests |
| 1.21.0 | 2026-05-28 | Add Principle XXIII (Frontend-Backend Contract Governance — RECOMMENDED): centrally documented shared enums/states/error codes; backward-compatible contract changes; breaking changes require coordinated updates; no conflicting mock shapes; generated types or contract tests |
| 1.20.0 | 2026-05-28 | Add Principle XXII (API Contract Completeness — RECOMMENDED): all public endpoints in OpenAPI/Swagger; full parameter and error documentation; enum/nullable/pagination/validation constraints; contract updates required with behavior changes; no reliance on undocumented fields |
| 1.19.0 | 2026-05-28 | Add Principle XXI (Frontend Runtime Safety — RECOMMENDED): async race/stale/unmount guards; cancellable network requests; cleanup for timers/subscriptions/listeners/workers/URLs; bounded memory growth; loading/error/empty/retry/cleanup states; tests for rapid navigation and overlapping requests |
| 1.18.0 | 2026-05-28 | Add Principle XX (Code Comment Policy — RECOMMENDED): comments explain why not what; no line-paraphrase comments; required for security/race/lifecycle/performance/domain logic; simplify before commenting; no multi-line comment blocks |
| 1.17.0 | 2026-05-28 | Add Principle XIX (Environment & Configuration Integrity — RECOMMENDED): startup env var validation; config-driven env behavior; consistent CI commands; dev credentials invalid in staging/prod |
| 1.16.0 | 2026-05-28 | Add Principle XVIII (Deployment Safety & Rollback — RECOMMENDED): documented rollback path; backward-compatible migrations with rollback plan; retryable background jobs; atomic or gated migrations |
| 1.15.0 | 2026-05-28 | Add Principle XVII (CI/CD Quality Gates — RECOMMENDED): PR must pass tests/type/lint/build; no CI bypass without documented approval; security-sensitive changes require denial-path tests; reproducible artifacts |
| 1.14.0 | 2026-05-28 | Add Principle XVI (Export Reproducibility & Integrity — RECOMMENDED): deterministic exports; export metadata requirements; format version on breaking changes; pre-export validation gate |
| 1.13.0 | 2026-05-28 | Add Principle XV (Role-Based Access Control — NON-NEGOTIABLE): annotator peer annotation isolation; reviewer metadata scoping; admin action audit log; immediate access revocation on role removal |
| 1.12.0 | 2026-05-28 | Add Principle XIV (Dataset Lineage & Schema Versioning — RECOMMENDED): item provenance tracking; schema versioned and breaking changes prohibited on prior annotations; annotation records schema version; reproducible sampling/splits |
| 1.11.0 | 2026-05-28 | Add Principle XIII (Label Quality & Reviewability — RECOMMENDED): gold item indistinguishability; inter-annotator agreement support; task config review flow declaration; annotator quality traceability; quarantine/rework/reject/appeal lifecycle |
| 1.10.0 | 2026-05-28 | Add Principle XII (Traceability & Auditability — RECOMMENDED): non-trivial changes must reference spec/issue/request; SC-ID tracing; bug fix documentation; AI agent context preservation; backend state auditability |
| 1.9.1 | 2026-05-28 | Strengthen Principle XI: add log/error message security rule; add prohibition on exposing test-set answers or scoring metadata via API or frontend state |
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
