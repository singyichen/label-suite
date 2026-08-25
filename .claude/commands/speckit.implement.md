---
description: "[DEPRECATED] Retired by ADR-033 — implementation now runs through the OpenSpec apply flow (/opsx:apply)."
---

# /speckit.implement — DEPRECATED

> **Retired (ADR-033, issue #356).** OpenSpec is now the implementation/change workflow layer.

Do not run this command. Instead:

- Implement the change with `/opsx:apply`, following TDD: write a failing test before any implementation code.
- All CLAUDE.md verification commands must exit 0 before the task is complete.
- See [ADR-033](../../docs/adr/033-openspec-change-workflow.md) and the CLAUDE.md SDD pipeline for the current flow.
