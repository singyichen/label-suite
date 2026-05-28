# CODEX.md

Claude will review your output once you are done.
This file provides Codex-specific guidance when working in this repository.

## Canonical Rules

Follow [AGENTS.md](AGENTS.md) as the primary agent rule file.

For full project context, also read [CLAUDE.md](CLAUDE.md), but treat Claude-specific sections as non-binding when they reference Claude-only commands, models, or slash workflows.

The project constitution remains authoritative: [.specify/memory/constitution.md](.specify/memory/constitution.md).

## Codex-Specific Notes

- Use short progress updates while working, especially before edits and during longer verification steps.
- Prefer `rg` for search and `apply_patch` for manual file edits.
- Use `uv run` for backend commands and `pnpm` from `frontend/` for frontend commands.
- Do not use Claude-only commands such as `/compact`, `/clear`, `advisor()`, or Claude model-selection rules.
- If a required Claude slash command has no Codex equivalent, report that limitation and continue with the closest manual workflow.
- Follow repository TDD, SDD, architecture, security, and language rules exactly as defined in `AGENTS.md`, `CLAUDE.md`, and the constitution.

## Scope

This file is an adapter for Codex behavior only. Do not duplicate project rules here unless they are Codex-specific.
