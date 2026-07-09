---
name: commit
description: Generate an English Conventional Commit message from staged changes and commit directly. Triggers on "commit", "commit the staged changes", "write a commit message", "幫我 commit", "產生 commit message", "提交目前變更".
---

# Commit Message Command

Generate a Conventional Commit message from **git staged** changes and commit directly.

## When to use

- The user has `git add`-ed changes and says "commit", "help me commit", "write a commit message", or similar
- The user wants to create a commit following this project's convention

## When NOT to use

- Staging area is empty — remind the user to `git add` first; **never** run `git add -A` yourself
- The user only wants to see the diff or discuss changes without committing

## Workflow

1. **Read staged changes**
   - `git diff --cached --name-status` — file list with add/modify/delete status
   - `git diff --cached` — actual content; if output is too large, focus on key files (config, logic, data) and skim components/assets by list only
   - If nothing is staged: stop and remind the user to `git add`; **do not** stage files yourself

2. **Check branch**
   - If currently on `main`: **stop and ask** the user whether to create a branch first (direct commit to `main` is prohibited)

3. **Summarize the intent**
   - Identify the single purpose behind this batch of changes (e.g. "add a new annotation component", "fix score calculation bug") — not a file-by-file changelog
   - When many files share the same nature (e.g. generated components, test fixtures), group them under one description

4. **Generate the message** (format below)

5. **Commit**
   - Use here-doc to preserve multi-line format:
     ```bash
     git commit -F - <<'EOF'
     <message content>
     EOF
     ```
   - **Do not** push unless the user explicitly asks

## Message Format

```text
<type>: <subject in English, imperative mood, ≤ 72 chars>

- **<Action>** <what was done and why>
- **<Action>** <what was done and why>

Co-Authored-By: <model full name> <noreply@anthropic.com>
```

### Rules

- **Language**: English only — no Chinese anywhere in commit messages (project prohibition)
- **Subject line**: imperative mood ("add", "fix", "remove", not "added", "fixes", "removing"), ≤ 72 characters
- **Body required**: always — every commit must include at least one body bullet explaining the *why*, regardless of type or size. No subject-only commits.
- **Body bullets**: each bullet starts with a **bold action word**, then describes what was done and why. Common actions: **Add** / **Fix** / **Remove** / **Update** / **Refactor** / **Move** / **Extract** / **Replace**. Keep technical terms in English (e.g. `Hook`, `PR`, `middleware`). May omit bullets for trivially simple changes.
- **Single purpose**: one logical change per commit; do not bundle unrelated changes (enforced by `scripts/git-hooks/pre-commit` — currently 10 files / 600 non-test lines)
- **Commit frequently**: after every logical group of changes
- **Bypass**: `ALLOW_BATCH_COMMIT=1` requires explicit user approval first — never self-approve

### Types

`feat` · `fix` · `docs` · `refactor` · `test` · `style` · `chore` · `perf` · `ci`

- `feat` — a wholly new feature or capability
- `fix` — a bug fix; mention the symptom/consequence in the subject when possible
- `docs` — documentation only
- `refactor` — structural change with no behavior change
- `test` — adding or updating tests only
- `style` — formatting, whitespace, lint fixes (no logic change)
- `chore` — tooling, config, dependency updates
- `perf` — performance improvement
- `ci` — CI/CD pipeline changes

### Co-Authored-By

Always append a blank line then the `Co-Authored-By` trailer, matching the current model:

- Claude: `Co-Authored-By: <model full name> <noreply@anthropic.com>` (e.g. `Claude Opus 4.6 (1M context)`, `Claude Sonnet 5`)
- OpenAI Codex: `Co-authored-by: OpenAI Codex <model full name> <noreply@openai.com>`

## Examples

```text
fix: prevent duplicate leave requests from causing false absent status

- **Add** time segment merging to consolidate overlapping leave records into one continuous range
- **Fix** absent-status evaluation to avoid false positives when multiple consecutive leaves cover work hours

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
```

```text
docs: archive user-management spec and sync deltas to main spec

- **Move** user-management spec to archive — all 22 tasks completed with tests passing
- **Update** main spec by applying 4 outstanding deltas from user-management change

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
```

```text
feat: add output type composition model with validation

- **Replace** single output_type with outputs[] array to support multi-modal annotation
- **Add** schema-level mutual exclusivity constraints between bypass-capable types

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
```
