# PR Flow

Execute after development is complete. Steps 1–7 are automated, except Step 7.2 (user previews the published artifact) and Step 7.5 (user drags the image into the PR); **Step 8 (Merge) requires user confirmation**.

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

> After each push, the bot re-reviews. Confirm no new findings before proceeding to Step 7.

## Step 7 — Visual change-summary image

Runs **after the review loop settles and before merge**, so the line counts and commit list in the image are final — an image made earlier goes stale with every review-fix commit. Produce one compact image explaining the change, save it to the user's Downloads folder, and hand it to the user to embed. Skip only for trivial PRs (≤ 2 files) unless the user asks for it.

1. **Load the `artifact-design` skill, then build the page** in the session scratchpad (never inside the repo) as an Artifact-ready fragment: no `<!DOCTYPE>`/`<html>`/`<head>`/`<body>` wrapper of your own, inline `<title>` and `<style>`, palette as CSS custom properties with a dark-theme variant (the skill covers the token pattern). The page holds the same content twice, as two stacked blocks separated by a thin rule: **English on top, Traditional Chinese below**. Each block contains ONLY these two elements:
   - a **short prose summary**: title line (PR title) + one-line meta (PR number · branch · spec version · `+added / −deleted`), followed by two labeled 1–3 sentence paragraphs — **Purpose** (why the change was needed) and **Result** (what the PR delivers) — no metric cards, no BEFORE/AFTER table, no diff restatement of any kind
   - a **flow diagram**: boxes + arrows built with plain HTML/CSS (flex + border boxes, no images), showing the before-flow above the after-flow with changed nodes highlighted; when nothing flow-like changed, diagram the affected structure (components and their relationships) instead

   File paths, identifiers, and config keys stay in English in both blocks.

   **Mandatory style** (design-doc look, not a GitHub diff report — the dark theme is an adaptation of this, not a different design):
   - white background, dark-gray body text, generous whitespace; one accent color at most
   - monospace only for file paths and identifiers; everything else in the system sans-serif stack
2. **Publish it with the Artifact tool** and give the user the URL to preview. If they request changes, edit the same file and republish — the same path redeploys to the same URL. Only proceed to the screenshot after the user is satisfied (or immediately if they have already seen the content another way).
3. **Screenshot it with the Playwright MCP browser** (PNG, viewport width 1200, `fullPage: true`, light theme):
   - the artifact URL requires claude.ai auth, so screenshot locally: copy the fragment (e.g. `<page>.html`) to a **separate file** (e.g. `<page>-preview.html`) with `<!doctype html><html data-theme="light">` prepended — the doctype avoids quirks-mode rendering, the `data-theme` attribute forces the light theme even where the OS/browser defaults to dark, and the distinct filename prevents overwriting the fragment or republishing the wrong version later (the artifact version must NOT contain this prefix)
   - `file://` URLs are blocked — serve the scratchpad first (`python3 -m http.server <port>` as a background task); if the port is already in use, pick a different one rather than reusing an unknown server, then navigate to `http://localhost:<port>/<page>-preview.html`
   - afterwards stop the server task and close the browser tab; confirm nothing is left listening (`lsof -t -i:<port>` prints nothing — kill any leftover PID); if the PNG lands in the repo root (Playwright's cwd), move it out immediately so it cannot be committed
4. **Copy the PNG to `~/Downloads/<branch-name>-changes.png`** — the scratchpad is temporary; Downloads survives the session.
5. **Tell the user to drag the PNG into the PR description** on GitHub (manual step: `gh` CLI and the API cannot upload PR attachment images). Verify afterwards with `gh pr view <number> --json body` that a `user-attachments` URL is present.

## Step 8 — Merge + Cleanup _(requires user confirmation)_

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
