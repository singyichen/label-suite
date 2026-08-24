# Git Workflow Rules

## PR Scope — Single Purpose (Enforced)

Every PR must serve exactly **one purpose**. Unrelated changes belong in a separate PR.

### What counts as "one purpose"

One purpose = one cohesive unit that a reviewer can understand with a single mental context:

- One feature (spec item, user story, or functional requirement) — domain constitutions may require further layer-level splits within a feature (see backend-constitution XIII, frontend-constitution XVI)
- One bug fix (root cause + regression test)
- One refactor (one structural concern: rename, extract, simplify)
- One infra/tooling change (one build/CI/config concern)
- One governance change (constitution amendment + all propagation caches, templates, and commands)
- One OpenSpec change (`openspec/changes/<change>/`) — propose, apply, and archive stay in the same PR; if a change touches requirements, the write-back to the canonical `specs/[module]/spec.md` (version bump + Changelog) must land in the same PR (ADR-033 Rule 1)

### What must be split into separate PRs

- Feature code + unrelated refactor → 2 PRs
- Bug fix + opportunistic cleanup → 2 PRs
- Frontend feature + independent backend feature → always separate PRs; when a breaking API contract change is involved, cross-reference between PRs
- Multiple independent bug fixes → 1 PR per bug
- Dependency upgrade + code changes using the new API → acceptable as 1 PR only if the code changes are required by the upgrade

### Decision test

Before opening a PR, ask: **"Can I describe this PR's purpose in one sentence without using 'and' or 'also'?"**

- Yes → proceed
- No → split

### Relationship to commit convention

Commits within a PR must each serve a single change purpose (enforced by pre-commit hook). A PR groups related commits that collectively deliver one purpose. If commits in a PR serve unrelated purposes, the PR itself violates single-purpose.

### Size guardrails

Inherited from Constitution Principle X:

- A single PR must not touch more than 5 files or exceed 300 lines of diff (excluding tests)
- PRs exceeding either threshold must be split before opening
- Governance PRs propagating a constitution amendment are exempt from the file count limit
