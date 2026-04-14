# Specs Status Index

> **Purpose**: Single source of truth for spec pipeline status across all features.
> **Update rule**: Update this table whenever a spec artifact is created, a branch is opened, or a feature is archived.
> **Archive rule**: After implementation is merged to `main`, run `mv specs/[module]/NNN-feature specs/_archive/NNN-feature` and update Status → `archived`.

## Status Legend

| Status | Meaning |
|--------|---------|
| `spec-ready` | `spec.md` exists; planning not yet started |
| `plan-ready` | `plan.md` created; tasks not yet broken down |
| `tasks-ready` | `tasks.md` created; implementation not yet started |
| `in-progress` | Implementation branch open |
| `review` | PR open, pending merge |
| `done` | Merged to `main`; not yet archived |
| `archived` | Moved to `specs/_archive/` |

---

## Feature Pipeline

| # | Feature | Module | Status | Branch | Notes |
|---|---------|--------|--------|--------|-------|
| 001 | Login — Email / Password | account | `spec-ready` | — | |
| 002 | Login — Google SSO | account | `spec-ready` | — | |
| 003 | Register — Email / Password | account | `spec-ready` | — | |
| 004 | Forgot / Reset Password | account | `spec-ready` | — | |
| 005 | Profile Settings | account | `spec-ready` | — | |
| 006 | User Management | admin | `spec-ready` | — | |
| 007 | Role & Permission Settings | admin | `spec-ready` | — | |
| 008 | Annotator List | annotator-management | `spec-ready` | — | |
| 009 | Work Log | annotator-management | `spec-ready` | — | |
| 010 | Task List | task-management | `spec-ready` | — | |
| 012 | Dashboard | dashboard | `spec-ready` | — | wireframe done (PR #27) |
| 013 | New Task (+ Config Builder) | task-management | `spec-ready` | — | |
| 014 | Task Detail | task-management | `spec-ready` | — | |
| 015 | Annotation Workspace | annotation | `spec-ready` | — | |
| 016 | Dataset Stats | dataset | `spec-ready` | — | |
| 017 | Dataset Quality | dataset | `spec-ready` | — | |

---

## Archive Log

> Entries appear here once a feature folder is moved to `specs/_archive/`.

| # | Feature | Archived Date | Merge PR |
|---|---------|--------------|----------|
| — | — | — | — |
