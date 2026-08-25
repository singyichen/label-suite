---
description: "[DEPRECATED] Retired by ADR-033 — technical design now lives in an OpenSpec change's design.md (/opsx:propose)."
---

# /speckit.plan — DEPRECATED

> **Retired (ADR-033, issue #356).** OpenSpec is now the implementation/change workflow layer; per-feature `plan.md` is no longer produced.

Do not run this command. Instead:

- Draft the change with `/opsx:propose` — technical design goes into `openspec/changes/<change>/design.md` (mandatory when the change touches an API contract or DB schema).
- See [ADR-033](../../docs/adr/033-openspec-change-workflow.md) and the CLAUDE.md SDD pipeline for the current flow.
- Exception: `specs/foundation/000-foundation/plan.md` is preserved as a standing architecture document (ADR-033, accompanying decision 1).
