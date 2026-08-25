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
- **English-First**: Code, comments, and commit messages are written in English. Traditional Chinese is permitted in `docs/`, `specs/`, `design/prototype/`, `design/wireframes/`, and `design/system/inventory.md`. `design/system/MASTER.md` must be English only.

## Protected Files

**Do NOT modify the following files** (manually maintained):
- `CLAUDE.md` — Claude Code project guidelines entry point
- `.claude/AGENTS.md` — Agent directory and usage guide
- `.claude/SKILLS.md` — Skills and commands directory

To update these files, handle them manually.

## SDD Workflow

New feature development must follow this process:

```
/speckit.specify <feature description>  → specs/[module]/NNN-feature/spec.md
/ui-ux-pro-max                          → design/prototype/pages/[module]/[page].html + design/system/ (recommended, after specify)
/pencil-wireframe                       → design/wireframes/pages/[module]/[page].pen (optional, after prototype)
/speckit.clarify                        → clarify spec ambiguities (optional)
/opsx:propose                           → openspec/changes/<change>/ (proposal.md, tasks.md, design.md when needed, specs/ delta)
/opsx:apply                             → execute implementation (TDD)
/opsx:archive                           → dual write: openspec/specs/ derived view + canonical spec.md version bump & Changelog
/speckit.checklist                      → specs/[module]/NNN-feature/checklists/
```

**Key Rules**:
- Feature branches must be named `feat/[module]/NNN-feature` matching the spec directory
- Each spec directory contains: `spec.md`, `checklists/`; in-flight work lives in `openspec/changes/<change>/` (ADR-033)
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

## Changelog

| 版本 | 日期 | 變更摘要 |
|------|------|---------|
| 1.1.0 | 2026-08-25 | SDD workflow updated to the OpenSpec change loop (ADR-033, issue #356): retired /speckit.plan//speckit.tasks//speckit.analyze//speckit.implement replaced by /opsx:propose → /opsx:apply → /opsx:archive |
| 1.0.2 | 2026-05-22 | Changelog table headers aligned to Traditional Chinese |
| 1.0.1 | 2026-05-21 | Align SDD workflow paths with module-based spec directories |
| 1.0.0 | [YYYY-MM-DD] | Initial spec |
