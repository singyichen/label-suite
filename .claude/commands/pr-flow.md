# PR Flow

Execute after development is complete. Steps 1–6 are automated; **Step 7 (Merge) requires user confirmation**.

> **Docs-only changes** (`.md` files only): skip Step 3, but still run Step 2 for cross-reference consistency.

---

## Step 1 — Commit

```bash
git add <files>
git commit -m "<type>: <description>"
```

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

```bash
gh pr create --title "<type>: <description>" --base main --head <branch-name> --body "..."
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
git commit -m "fix: address qodo review findings"
git push origin <branch-name>
```

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
