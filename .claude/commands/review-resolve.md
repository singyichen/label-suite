# Review Resolve

Fetch all unresolved PR review threads, fix every finding, commit, push, then resolve each thread.

**Usage:** `/review-resolve [PR number]`
If PR number is omitted, detect from the current branch via `gh pr view`.

---

## Step 1 — Identify PR number

```bash
# If not provided as argument:
gh pr view --json number --jq '.number'
```

## Step 2 — Fetch unresolved threads

```bash
gh api graphql -f query='
query {
  repository(owner: "{owner}", name: "{repo}") {
    pullRequest(number: {number}) {
      reviewThreads(first: 50) {
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

If output is empty → all threads resolved, stop here.

## Step 3 — Analyse and fix each finding

For each unresolved thread:

1. **Read** the file at the reported path before making any changes
2. **Understand** the issue — distinguish between:
   - Already fixed in a previous commit → skip, go to resolve
   - Genuinely needs a fix → proceed
3. **Fix** the issue using Edit (not Bash sed/awk)
4. **Verify** the fix is correct and does not break surrounding content

> Cross-check rule: if the finding flags an inconsistency between a rule definition and an example in the same file, verify that ALL other examples in the file also comply before committing.

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
gh api graphql -f query='
  mutation {
    resolveReviewThread(input: {threadId: "{thread-id}"}) {
      thread { id isResolved }
    }
  }'
```

Run in a loop:
```bash
for id in <thread-id-1> <thread-id-2> ...; do
  gh api graphql -f query="mutation { resolveReviewThread(input: {threadId: \"$id\"}) { thread { id isResolved } } }" \
    --jq '.data.resolveReviewThread.thread | {id, isResolved}'
done
```

## Step 6 — Confirm

Re-run Step 2. If no unresolved threads remain, done.
If new threads appear (bot re-reviews after push), repeat from Step 3.

---

## Rules

- Never resolve a thread without fixing it first (or confirming it's already fixed)
- One commit per review round — do not create separate commits per finding
- Always read the file before editing
- After fixing any document with rules + examples, verify all examples comply with all rules in that document
