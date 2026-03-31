# Label Suite Development Guidelines

Auto-generated from feature plans. Last updated: [DATE]

## Active Technologies

[EXTRACTED FROM ALL PLAN.MD FILES]

## Project Structure

```text
[ACTUAL STRUCTURE FROM PLANS]
```

## Commands

[ONLY COMMANDS FOR ACTIVE TECHNOLOGIES]

## Code Style

[LANGUAGE-SPECIFIC, ONLY FOR LANGUAGES IN USE]

## Software Quality Principles

- **KISS & YAGNI**: Pursue extreme simplicity. Reject over-engineering; write code only for current, clearly defined needs.
- **Config-Driven**: Task types and evaluation metrics are defined in YAML/JSON config — never hardcoded.
- **Security First (NON-NEGOTIABLE)**: Test-set answers must never be exposed to annotators or included in any annotator-facing API response.
- **English-First**: Code, comments, and commit messages are written in English. Traditional Chinese is permitted in `docs/`, `specs/`, `design/prototype/`, and `design/wireframes/`.

## Protected Files

**Do NOT modify the following files** (manually maintained):
- `CLAUDE.md` — Claude Code project guidelines entry point
- `.claude/AGENTS.md` — Agent directory and usage guide
- `.claude/SKILLS.md` — Skills and commands directory

To update these files, handle them manually.

## SDD Workflow

New feature development must follow this process:

```
/speckit.specify <feature description>  → specs/NNN-feature/spec.md
/speckit.clarify                        → clarify spec ambiguities (optional)
/speckit.plan                           → specs/NNN-feature/plan.md
/speckit.tasks                          → specs/NNN-feature/tasks.md
/speckit.analyze                        → consistency check (optional)
/speckit.implement                      → execute implementation
/speckit.checklist                      → specs/NNN-feature/checklists/
```

**Key Rules**:
- Feature branches must be named `feat/NNN-feature` matching the spec directory
- Each spec directory contains: `spec.md`, `plan.md`, `tasks.md`, `checklists/`
- Implement User Stories in priority order (P1 → P2 → P3)

## Constitution Reference

All development must comply with [constitution.md](.specify/memory/constitution.md):
- I. Spec-First Development
- II. Generalization-First (Config-Driven)
- III. Data Fairness (Test-Set Leakage Prevention)
- IV. Test-First
- V. Simplicity (KISS / YAGNI)
- VI. English-First

## Recent Changes

[LAST 3 FEATURES AND WHAT THEY ADDED]

## Implementation Status

| Feature | Status | Description |
|---------|--------|-------------|

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
