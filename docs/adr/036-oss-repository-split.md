# ADR-036: Open-Source Development in a New `label-suite` Organization Repository — Spec Canon Stays Here

**Status**: Proposed
**Date**: 2026-09-17

## Context

Label Suite will be developed as an open-source system under the GitHub organization [`label-suite`](https://github.com/label-suite). The question is how that open-source repository relates to this one (`singyichen/label-suite`).

Facts measured on 2026-09-17:

| Fact | How it was measured |
|---|---|
| This repository is already public | `gh repo view --json visibility` → `PUBLIC` |
| The `label-suite` organization exists and has no public repository yet | `gh api orgs/label-suite --jq .public_repos` → `0` |
| Application code is still a foundation skeleton: 48 tracked files under `backend/`, 32 under `frontend/` | `git ls-files backend \| wc -l`, `git ls-files frontend \| wc -l` |
| `specs/`, `docs/`, and `openspec/` contain 3115 bare `#NNN` issue/PR references, excluding this ADR's own examples | `git grep -hoE "#[0-9]{2,4}" -- specs docs openspec ':!docs/adr/036-oss-repository-split.md' \| wc -l` |
| `LICENSE` is a custom "Label Suite Research Preview Notice", not an OSI-approved license | `head -1 LICENSE` |

The maintainer's intent: **the open-source system is developed cleanly from the start, while this repository remains the complete documentation base.**

### Reference projects

Top-level directories of comparable open-source projects (shallow clones, 2026-09-17):

| Project | Backend | Frontend | Other top-level |
|---|---|---|---|
| doccano/doccano | `backend/` | `frontend/` | `docker/`, `docs/` |
| HumanSignal/label-studio | `label_studio/` | `web/` | `deploy/`, `docs/` |
| argilla-io/argilla | `argilla-server/` | `argilla-frontend/` | `argilla/` (SDK), `docs/` |
| apache/superset | `superset/` | `superset-frontend/` | `docker/`, `helm/`, `docs/` |

All four co-locate backend and frontend in one repository, and their `docs/` is user-facing documentation, not requirement specs or design discussion.

## Options Evaluated

**Transfer this repository to the organization**: rejected. It preserves issue numbers and history, but it carries the full documentation, design, and agent-tooling history into the open-source repository — the opposite of a clean start.

**Fork this repository into the organization**: rejected for the same reason, plus a fork relationship would link the two repositories permanently.

**New repository in the organization, spec canon stays here** (selected).

## Decision

### 1. Repository roles

| | `singyichen/label-suite` (this repository) | `label-suite/<new repository>` |
|---|---|---|
| Role | Defines **what** to build | Plans **how**, and builds it |
| Holds | `specs/` (sole canon), ADRs, `design/`, research and thesis material | `backend/`, `frontend/`, `openspec/changes/`, `openspec/specs/`, the SDD workflow document, CI |
| Git history | Kept | Starts empty — no history import |
| Issue numbers | Existing numbers kept | Start again at #1 |

### 2. Open-source repository baseline

- Layout follows ADR-001's modular monorepo: `backend/` + `frontend/` at the root, matching doccano's layout. Further top-level packages (e.g. an SDK) are added only when something is released independently.
- License: **Apache-2.0**.
- Day-one files: `LICENSE`, `README.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, `docker-compose.yml`, `.github/workflows/`, issue and PR templates.
- `docs/` holds user-facing documentation only.

### 3. SDD workflow across two repositories

```text
[this repo]  specs/<module>/NNN-feature/spec.md vX.Y.Z released (git tag)
     │  proposal.md frontmatter pins: singyichen/label-suite:specs/<module>/NNN-feature/spec.md@vX.Y.Z
     ▼
[new repo]   propose → Red → Green → archive
     │  archive writes the derived view openspec/specs/ in the new repo
     ▼
[this repo]  paired PR: spec.md version bump + Changelog, citing the new repo's final PR
```

Rules that change relative to ADR-033 and `docs/sdd-workflow.md`:

| Current rule | Under this ADR |
|---|---|
| ADR-033 Rule 1: write-back to the canonical spec lands in the same PR | **Paired PR**: gate 4 completes only when this repository's write-back PR merges. The new repository's final PR description must link the paired PR |
| Proposals cite the canonical spec by in-repository path | Cross-repository citation, pinned to a spec version: `repo:path@version` |
| Source-Verify greps the canonical spec in the working tree | Source-Verify greps a read-only checkout of this repository at the pinned version |
| `specs/STATUS.md` updates and moves to `specs/_archive/` | Stay in this repository, carried by the paired PR |

## Consequences

### Easier

- The open-source repository starts with no thesis, meeting, or agent-governance history, so external contributors see only the product.
- Spec evolution in this repository does not block implementation; the new repository moves to a newer spec version only when a change explicitly pins it.
- Almost no application code is discarded — the backend and frontend are still a skeleton.

### Harder

- **Bare issue references become ambiguous.** In the new repository, `#596` means that repository's issue. Every reference to an issue in this repository must be written `singyichen/label-suite#596`.
- **`openspec/specs/` becomes a second copy of spec text in another repository.** Before, a lint in the same repository could compare it with the canon; after the split, the derived view must be treated as archive-generated only and never hand-edited, or it silently becomes a second canon.
- **Paired PRs open a version gap.** Between the new repository's final PR merging and this repository's write-back PR merging, implementation is ahead of the canon.
- `scripts/check-sdd.sh` and `scripts/ci-jobs.tsv` currently assume specs and code share one repository and must be split or rewritten.

## Open Questions

1. Name of the new repository inside the organization.
2. How much of `.claude/`, `CLAUDE.md`, and the hooks to carry into the new repository — deferred by the maintainer.
3. Whether the new repository adds a CI check that rejects bare `#NNN` references pointing at this repository's issues.
4. Where the paired-PR obligation is enforced (a PR template checkbox, a CI check, or review only).
5. Whether `LICENSE` in this repository also changes, or only the new repository uses Apache-2.0.

## Referenced by

- [ADR-001](001-monorepo-structure.md) — monorepo layout the new repository keeps
- [ADR-033](033-openspec-change-workflow.md) — change workflow whose same-PR write-back rule this ADR amends
- [docs/sdd-workflow.md](../sdd-workflow.md) — workflow document that moves to the new repository and must be revised
