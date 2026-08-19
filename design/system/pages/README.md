# Page-Scoped Spec Overrides

> Contract (from `MASTER.md` header): when building a page, first check
> `design/system/pages/[page-name].md`. If that file exists, its rules
> **override** MASTER.md. If not, MASTER.md applies in full.

## What belongs here

- **Page-specific components** used by exactly one page or module — for
  example the reviewer row family in annotation-workspace, or the
  permission matrix in role-settings. Cross-module components always live
  in MASTER.md.
- **Sanctioned deviations**: when a page intentionally departs from a
  MASTER rule, the deviation and its reason are documented here.

## What does NOT belong here

- Anything used by 2+ modules → MASTER.md
- Behavior conventions → `design/system/ux-conventions.md` (UXC-*)
- Restating MASTER rules the page already follows

## File naming

One file per page, named after the page HTML basename:
`annotation-workspace.md`, `role-settings.md`, `task-new.md`, …

## Format

Each file starts with a one-line purpose, followed by component specs in
the same table/CSS style as MASTER.md. English only (this directory
follows MASTER.md's language contract). Every cited value must match
shipped CSS verbatim.

## Status

Directory established by issue #183 (spec-debt PR). Page files are added
by the per-module fix PRs as their components are arbitrated.
