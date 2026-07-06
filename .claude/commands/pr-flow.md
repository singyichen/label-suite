# PR Flow

Execute after development is complete. Steps 1–6 are automated, except Step 5c.4 where the user drags the image into the PR; **Step 7 (Merge) requires user confirmation**.

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

### 5c. Visual change-summary image

Produce one full-page image showing every change in the PR, save it to the user's Downloads folder, and hand it to the user to embed. Skip only for trivial PRs (≤ 2 files) unless the user asks for it.

1. **Build a self-contained HTML page** in the session scratchpad (never inside the repo). Required content, all text in **English** (same contract as the PR description):
   - metric cards: per-file line counts `before → after`
   - a **flow diagram** of the change when the PR alters a process, pipeline, or user flow: boxes + arrows built with plain HTML/CSS (flex + border boxes, no images), showing the before-flow above the after-flow with changed nodes highlighted; skip only when nothing flow-like changed
   - a BEFORE / AFTER comparison **table**: one row per changed area, BEFORE and AFTER as short prose cells — style like a design doc, not a diff
   - the real `git diff main...HEAD` **as a numeric summary only** (per-file `+added / −deleted` counts, from `git diff --stat`); the verbatim diff either goes in ONE collapsed `<details>` at the very bottom or is omitted — it must never dominate the page. Never hand-restate diff content as fake diff lines.

   **Mandatory style** (design-doc look, not a GitHub diff report):
   - white background, dark-gray body text, generous whitespace; one accent color at most
   - section numbering `1 ·` `2 ·` `3 ·` with thin horizontal rules between sections
   - per-item **change-type chips**: small rounded tags — `ADDED` (green), `CHANGED` (amber), `UNCHANGED` (gray outline) — include a legend at the bottom
   - monospace only for file paths and identifiers; everything else in the system sans-serif stack
2. **Screenshot it with the Playwright MCP browser** (PNG, viewport width 1200, `fullPage: true`):
   - `file://` URLs are blocked — serve the scratchpad first (`python3 -m http.server <port>` as a background task), then navigate to `http://localhost:<port>/<page>.html`
   - afterwards kill the server and close the browser tab; if the PNG lands in the repo root (Playwright's cwd), move it out immediately so it cannot be committed
3. **Copy the PNG to `~/Downloads/<branch-name>-changes.png`** — the scratchpad is temporary; Downloads survives the session.
4. **Tell the user to drag the PNG into the PR description** on GitHub (manual step: `gh` CLI and the API cannot upload PR attachment images). Verify afterwards with `gh pr view <number> --json body` that a `user-attachments` URL is present.

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
