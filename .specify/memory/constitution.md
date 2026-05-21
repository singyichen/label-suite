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

### V. Code Quality & Simplicity (RECOMMENDED)

Code must be simple, readable, and consistently styled.

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

### VIII. Performance Baseline (RECOMMENDED)

Core user flows must meet minimum performance thresholds.

- API P95 response time ≤ 500ms for core labeling and annotation operations
- All list-view endpoints must implement pagination (max page size: 100); unbounded queries are not permitted
- No N+1 query patterns in service-layer code
- Frontend Lighthouse Performance score ≥ 70 on desktop for core pages

## Governance

Constitution principles take precedence over all other conventions.

**Amendment Procedure**:
- Update `.specify/memory/constitution.md` with the change
- Propagate amendments to dependent templates (`.specify/templates/`) and commands (`.claude/commands/speckit.*.md`)
- Explain the reason in the commit message: `docs: amend constitution to vX.Y.Z ([reason])`
- Use `/speckit.constitution` to automate propagation checks

**Versioning Policy** (semantic versioning):
- **MAJOR**: Backward-incompatible removal or redefinition of a principle
- **MINOR**: New principle or section added
- **PATCH**: Clarification, wording fix, or non-semantic refinement
- Changelog entries must be written in descending version order, with the newest version first (for example, `1.4.0` before `1.3.2`).
- Changelog entries in `.specify/templates/` must use Chinese change summaries.

**Compliance Review**: All PRs must verify compliance with all eight principles before merging. Use `/speckit.analyze` to check cross-artifact consistency and Constitution alignment.

**Version**: 1.4.0 | **Ratified**: 2026-03-18 | **Last Amended**: 2026-05-21

## Changelog

| Version | Date | Change Summary |
|---------|------|----------------|
| 1.4.0 | 2026-05-21 | 新增 Principle VII（設計一致性）與 Principle VIII（效能基準）；擴充 Principle V 加入明確的程式品質規則（型別強制、linter、禁止 debug 輸出）；合規審查更新為涵蓋八條原則 |
| 1.3.2 | 2026-05-21 | 要求 templates 中的 Changelog 變更摘要使用中文 |
| 1.3.1 | 2026-05-21 | 要求 Changelog 條目依版本號降序撰寫 |
| 1.3.0 | 2026-04-13 | Changelog 追蹤前的 Constitution 基準版本 |
