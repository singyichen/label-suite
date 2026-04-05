# Review Resolve

Fetch all unresolved PR review threads, fix every finding, commit, push, then resolve each thread.

**Usage:** `/review-resolve [PR number]`
If PR number is omitted, detect from the current branch via `gh pr view`.

---

## Step 1 — Identify PR number, owner, and repo

```bash
# Get PR number (if not provided as argument)
gh pr view --json number --jq '.number'

# Get owner and repo name (needed for GraphQL queries)
gh repo view --json owner,name --jq '{owner: .owner.login, name: .name}'
```

Keep all three values (`number`, `owner`, `repo`) in context for the steps below.

## Step 2 — Fetch unresolved threads

```bash
gh api graphql -f query='
query {
  repository(owner: "{owner}", name: "{repo}") {
    pullRequest(number: {number}) {
      reviewThreads(first: 100) {
        nodes {
          id
          isResolved
          comments(first: 1) {
            nodes {
              body
              path
              line
              author { login }
            }
          }
        }
      }
    }
  }
}' --jq '.data.repository.pullRequest.reviewThreads.nodes[]
  | select(.isResolved == false)
  | {id: .id, path: .comments.nodes[0].path, line: .comments.nodes[0].line, body: .comments.nodes[0].body}'
```

If output is empty → all threads resolved, skip to Step 6.

> **Pagination note:** `first: 100` handles most PRs. If exactly 100 results are returned, there may be more — re-run with `after: "{cursor}"` to fetch the next page before proceeding.

## Step 3 — Analyse and fix each finding

For each unresolved thread:

1. **Read** the file at the reported path before making any changes
2. **Understand** the issue — distinguish between:
   - Already fixed in a previous commit → skip, go to resolve
   - Genuinely needs a fix → proceed
3. **Fix** the issue using Edit (not Bash sed/awk)
4. **Verify** the fix is correct and does not break surrounding content

> **Cross-check rule:** if the finding flags an inconsistency between a rule definition and an example in the same file, verify that ALL other examples in the file also comply before committing.

> **Static analysis rule:** if any changed file is TypeScript/TSX, run `pnpm tsc --noEmit` before committing. If any changed file is Python, run `uv run ruff check <file>`. Fix any errors before proceeding to Step 4.

## Step 4 — Commit and push

```bash
git add <changed files>
git commit -m "fix: address PR #{number} review findings"
git push origin <branch-name>
```

Use a single commit for all findings in one round. If findings span multiple files, still one commit.

## Step 5 — Resolve all fixed threads

For each thread that was fixed (or was already fixed):

```bash
for id in <thread-id-1> <thread-id-2> ...; do
  gh api graphql -f query="mutation { resolveReviewThread(input: {threadId: \"$id\"}) { thread { id isResolved } } }" \
    --jq '.data.resolveReviewThread.thread | {id, isResolved}'
done
```

## Step 6 — Update PR description

After all threads are resolved, append a review-resolution summary to the PR body.

```bash
# Fetch current PR body
gh pr view {number} --json body --jq '.body'
```

Count how many `### Round` headings already exist in the body to determine the next round number (N = existing count + 1).

Synthesize a concise summary of **what was fixed in this round** (one bullet per finding), then append it to the existing PR body under a `## Review Resolutions` section. If the section already exists from a previous round, append a new subsection rather than replacing.

Format:
```
## Review Resolutions

### Round N — YYYY-MM-DD
- **`path/to/file`**: short description of what was fixed
- **`path/to/file`**: short description of what was fixed
```

Apply the update:
```bash
gh pr edit {number} --body "$(cat <<'EOF'
{updated body with appended section}
EOF
)"
```

## Step 7 — Confirm

Re-run Step 2. If no unresolved threads remain, done.

If new threads appear (bot re-reviews after push):
- If the finding is **identical to one already fixed** in a previous round → resolve immediately without a new commit.
- If the finding is **genuinely new** → repeat from Step 3.

---

## Rules

- Never resolve a thread without fixing it first (or confirming it's already fixed)
- One commit per review round — do not create separate commits per finding
- Always read the file before editing
- After fixing any document with rules + examples, verify all examples comply with all rules in that document
- Run static analysis (`tsc --noEmit` / `ruff check`) after changing code files; fix errors before committing
- Always update the PR description after resolving threads — append, never overwrite existing content
- Round number in PR description is derived by counting existing `### Round` headings, not manually assigned
