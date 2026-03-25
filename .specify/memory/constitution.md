# Label-Eval-Portal Constitution

## Core Principles

### I. Spec-First Development (RECOMMENDED)
New features should begin with a spec. The deciding question for skipping SDD is: **will this change make the system behave differently from what the specs define?** If yes, open a spec. If no, modify code directly.

- Features progress in order: requirements → spec → plan → tasks → implementation
- Each User Story must be independently implementable, testable, and deliverable
- Mark completed specs with a `.completed` file in the feature directory

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
- Leaderboard update mechanism must prevent duplicate submission abuse

### IV. Test-First (RECOMMENDED)
- Backend: pytest coverage target ≥ 80%
- E2E: Playwright covers core user flows (labeling, submission, leaderboard)
- Tests must be written and confirmed to fail before implementation begins

### V. Simplicity
- YAGNI: do not build features for hypothetical future needs
- KISS: prefer the simplest viable solution
- Avoid premature abstraction; three similar lines of code beats an over-engineered abstraction

### VI. English-First
- Code, comments, docstrings, commit messages, and variable/function names are always written in English
- Traditional Chinese is permitted in `docs/` and `specs/` directories to accelerate research documentation
- The only fully Chinese file outside those directories is `README.zh-TW.md`

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

**Compliance Review**: All PRs must verify compliance with all six principles before merging. Use `/speckit.analyze` to check cross-artifact consistency and Constitution alignment.

**Version**: 1.2.1 | **Ratified**: 2026-03-18 | **Last Amended**: 2026-03-25
