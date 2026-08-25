---
description: "[DEPRECATED] Retired by ADR-033 — change-level verification moved to /opsx:verify (or openspec validate) plus the write-back Source-Verify gate."
---

# /speckit.analyze — DEPRECATED

> **Retired (ADR-033, issue #356).** Its spec/plan/tasks cross-check idled once `/speckit.plan` and `/speckit.tasks` retired.

Do not run this command. Instead:

- Change-level verification: `/opsx:verify` (Expanded Profile) or `openspec validate`.
- Write-back verification: the CLAUDE.md Source-Verify gate — every FR/AC ID referenced by a change delta must be locatable in the canonical `specs/[module]/NNN-feature/spec.md`.
- Requirement-quality checks remain available via `/speckit.checklist`.
- See [ADR-033](../../docs/adr/033-openspec-change-workflow.md) and the CLAUDE.md SDD pipeline for the current flow.
