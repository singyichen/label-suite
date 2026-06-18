# PR Flow

Execute after development is complete. Steps 1–6 are automated; **Step 7 (Merge) requires user confirmation**.

> **Docs-only changes** (`.md` files only): skip Step 3, but still run Step 2 for cross-reference consistency.

---

## Step 1 — Commit

```bash
git add <files>
git commit -m "<type>: <subject>" -m "- <why this change was needed>"
```

> Follow the [Commit Convention](../../CLAUDE.md#commit-convention): every commit must include body bullets explaining the *why* — no subject-only commits.

## Step 2 — Code Review

Run a code review and fix all findings before proceeding:
- Use `/speckit.checklist` or the `code-review` skill
- Fix issues, then re-commit

## Step 3 — Test Validation _(skip for docs-only)_

```bash
# Backend
cd backend && uv run pytest

# Frontend E2E
cd frontend && pnpm playwright test
```

Fix failures, re-commit, and re-run until all tests pass.

## Step 4 — Push

```bash
git push origin <branch-name>
```

## Step 5 — Create PR

### 5a. Determine labels

Every PR must carry at least one **type label** (from branch prefix) and zero or more **scope labels** (from changed file paths).

**Type label** — derive from branch name prefix:

| Branch prefix | Label |
|---|---|
| `feat/` | `feature` |
| `fix/` | `bug` |
| `docs/` | `docs` |
| `refactor/` | `refactor` |
| `style/` | `ui` |
| `test/` | `test` |
| `perf/` | `performance` |
| `chore/` | `task` |
| `ci/` | `ci-cd` |

**Scope labels** — derive from `git diff --name-only main...HEAD`:

| Path prefix | Label |
|---|---|
| `frontend/` | `scope:frontend` |
| `backend/` | `scope:backend` |
| `e2e/` | `scope:e2e` |
| `.github/workflows/`, `scripts/`, `docker-compose*`, `Dockerfile*` | `scope:infra` |

### 5b. Create the PR

```bash
gh pr create \
  --title "<type>: <description>" \
  --base main --head <branch-name> \
  --label "<type-label>" \
  --body "..."
# Append --label "scope:frontend" --label "scope:backend" etc. only for matching scopes
```

**PR body requirements**:
- Summary (bullet points)
- Changed files table
- Test Plan checklist — every item must be individually verified; mark passed as `[x]`, failed as `[ ]` with reason

## Step 6 — Qodo Code Review

After the PR is created, `qodo-code-review` bot reviews automatically.

**6a. Fetch review findings**

```bash
gh api repos/{owner}/{repo}/pulls/{number}/comments \
  --jq '.[] | {path, line, body}'
```

**6b. Fix each finding**, commit and push:

```bash
git add <files>
git commit -m "fix: <what was actually fixed> (qodo review)" -m "- <which finding this addresses and why the fix is correct>"
git push origin <branch-name>
```

> The subject must describe the actual fix — never reuse a generic string like "address review findings"; repeated review rounds would produce identical, untraceable subjects.

**6c. Fetch review thread IDs**

```bash
gh api graphql -f query='
  query {
    repository(owner: "{owner}", name: "{repo}") {
      pullRequest(number: {number}) {
        reviewThreads(first: 50) {
          nodes { id isResolved }
        }
      }
    }
  }'
```

**6d. Resolve fixed threads**

```bash
gh api graphql -f query='
  mutation {
    resolveReviewThread(input: {threadId: "PRRT_xxx"}) {
      thread { id isResolved }
    }
  }'
```

> After each push, the bot re-reviews. Confirm no new findings before proceeding to merge.

## Step 7 — Merge + Cleanup _(requires user confirmation)_

```bash
# Merge the PR
gh pr merge <number> --merge

# Switch back to main and pull latest
git checkout main && git pull

# Prune deleted remote branch tracking refs
git fetch --prune

# Delete the local branch
git branch -d <branch-name>

# Delete the remote branch
git push origin --delete <branch-name>
```
