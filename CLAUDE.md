# CLAUDE.md

Codex will review your output once you are done.

## Project Overview

Label Suite — a configurable, general-purpose NLP data labeling and automated evaluation portal, developed as a master's thesis research outcome (Demo Paper). Modular monorepo (`frontend/` React+TS · `backend/` FastAPI · `e2e/` Playwright). All architectural decisions live in [docs/adr/](docs/adr/).

## How instructions load (read this once)

- Every file in `.claude/rules/` is auto-loaded into **every** session (they are NOT path-scoped, despite `frontend/CLAUDE.md` etc. also importing them). Keep those files short; long reference content belongs in `docs/` with a pointer.
- The files in `.claude/harness/` are **loaded on demand** — this file tells you when.
- **Conflict rule**: if two documents disagree, the executable artifact wins (hook script > doc describing it; code > spec). Report the conflict to the user; never silently pick a side.

## Communication

- **English**: code, comments, commit messages, PR descriptions, API contracts, `design/system/MASTER.md`, `.claude/commands/`.
- **Traditional Chinese allowed**: `docs/`, `specs/`, `design/prototype/`, `design/wireframes/`, `design/system/inventory.md`.
- All conversation with the user is in **Traditional Chinese**.

## Routing table — read the right file at the right moment

| Situation | Read |
|---|---|
| Before dispatching ANY subagent | [.claude/harness/01-dispatch.md](.claude/harness/01-dispatch.md) |
| Writing a subagent prompt | [.claude/harness/03-templates.md](.claude/harness/03-templates.md) |
| Stuck ≥ 2 attempts · about to claim "done" · unsure whether to ask user · taste/design decision | [.claude/harness/02-judgment.md](.claude/harness/02-judgment.md) |
| Hit a pitfall worth recording · want to change a harness/rules file | [.claude/harness/04-evolution.md](.claude/harness/04-evolution.md) |
| Starting a long/multi-session task | [.claude/harness/05-handover.md](.claude/harness/05-handover.md) + copy `.claude/templates/claude-progress.md` to repo root |
| Git/PR mechanics (single-purpose rule, size limits, splitting) | [.claude/rules/git-workflow.md](.claude/rules/git-workflow.md) (auto-loaded) |
| Opening a GitHub issue | [.claude/rules/issue-reporting.md](.claude/rules/issue-reporting.md) → templates in [docs/templates/issue-templates.md](docs/templates/issue-templates.md) |
| Any feature work | The feature's `specs/[module]/NNN-feature/spec.md` + [specs/STATUS.md](specs/STATUS.md) |
| Architecture change | [docs/adr/](docs/adr/) precedents + [specs/_governance/constitution.md](specs/_governance/constitution.md) |

## Constitution

All development follows the eight principles in [specs/_governance/constitution.md](specs/_governance/constitution.md).
NON-NEGOTIABLEs: **Generalization-First** (config-driven, no hardcoded task logic) · **Data Fairness** (no test-set answer leakage).
⚠️ Known issue: `.specify/memory/constitution.md` diverges from the file above; treat `specs/_governance/` as canonical until the user consolidates (see harness 00-diagnosis §4).

## Spec-Driven Development (SDD)

Full pipeline — each stage is a hard gate:

```text
/superpowers:brainstorm → /speckit.specify → /label-suite-design (prototype) → /pencil-wireframe (optional)
  → /speckit.clarify (optional) → /speckit.plan → /speckit.tasks → /speckit.implement
  → /speckit.analyze → /speckit.checklist → /pr-flow
```

- **TDD (REQUIRED)**: never write implementation before a failing test. No exceptions.
- **Pre-PR gate**: `/speckit.analyze` must report zero findings before every PR.
- **Modules**: `account` · `dashboard` · `task-management` · `annotation` · `dataset` · `admin`
- **Artifact paths**: wireframes `design/wireframes/pages/[module]/[page].pen` · prototypes `design/prototype/pages/[module]/[page].html` · specs `specs/[module]/NNN-feature/`
- **Status**: update [specs/STATUS.md](specs/STATUS.md) at every stage transition. After PR merge: `mv specs/[module]/NNN-feature specs/_archive/` + update STATUS.
- **Modify an already-merged feature**: retrieve from `_archive`, create the feature branch (Speckit resolves from branch name; running from `main` aborts), bump spec version + Changelog, resume from `/speckit.clarify`, re-archive after merge.
- **Lightweight path** (ALL must hold: ≤ 2 production files · no API contract change · minor behavior change): TDD → implement → spec consistency review (version bump + Changelog + no downstream/API impact) → `/pr-flow`. If uncertain, use the full pipeline.

## Agent execution

- Dispatch, model tiers, escalation, and verification isolation: **[.claude/harness/01-dispatch.md](.claude/harness/01-dispatch.md)** (mandatory read before dispatching).
- Standing gates: same subtask failing repeatedly → follow the escalation ladder in [01-dispatch.md §4](.claude/harness/01-dispatch.md) (3 failures without a tier change is forbidden; hard cap 2 rounds at top tier, then ask user) · task touches ≥ 10 files → Opus-tier planning · unrequested codegen > 300 LoC → halt · PR diff > 5 files or > 300 non-test lines → split before opening.
- **Checkpoint reporting** on multi-step tasks: completed · verified · remaining. If you cannot describe the current state, stop.
- **Cross-session tasks** (spans ≥ 2 SDD stages, or ≥ 5 files, or feature/refactor/migration): create `claude-progress.md` from `.claude/templates/` BEFORE starting; keep it updated (it is gitignored and re-read by session-init).
- **Source-Verify gate**: any cited number/benchmark/quote must be locatable via `grep -i <term> <source>`; otherwise remove or correct.

## Git workflow

- Full rules (single-purpose PR, splitting, size limits): [.claude/rules/git-workflow.md](.claude/rules/git-workflow.md).
- Commit format: `<type>: <subject in English, imperative, ≤ 72 chars>` + **mandatory body bullets explaining why** (never subject-only, never a file-by-file diff restatement). Types: `feat fix docs refactor test style chore perf ci`.
- One logical change per commit. The pre-commit hook (`scripts/git-hooks/pre-commit`, activated by session-init) mechanically blocks oversized staged changes — the hook's thresholds are authoritative **for commits** (currently 10 files / 600 non-test lines; read the script for live values). The stricter 300-non-test-line limit in the standing gates above applies to **PRs**, not commits. Bypass `ALLOW_BATCH_COMMIT=1` requires explicit user approval; never self-approve.
- Branch naming: `<type>/<short-description>`, lowercase-with-dashes (e.g. `feat/labeling-ui`).

## Verification commands (Definition of Done)

Run after every change; the task is NOT complete until all pass — plus the full checklist in [.claude/harness/02-judgment.md](.claude/harness/02-judgment.md) §2.

```bash
# Backend (from backend/)
uv run pytest tests/ -q
uv run mypy app/ --strict
uv run ruff check . && uv run ruff format --check .

# Frontend (from frontend/)
pnpm tsc --noEmit
pnpm lint
pnpm test
```

## Prohibitions

Each rule traces to a specific incident (Ratchet Principle).

- ❌ Direct commit or push to `main` — violated twice in 2026-04; PreToolUse hook blocks it. Always branch first.
- ❌ `pip install` / `npm install` — use `uv add` / `pnpm add` (lockfile divergence breaks CI).
- ❌ Chinese in commit messages or PR descriptions — English-only contract.
- ❌ `allow_origins=["*"]` in CORS — list origins explicitly.
- ❌ Hardcoded API keys/secrets — environment variables only.

## General coding rules

@.claude/rules/general.md
