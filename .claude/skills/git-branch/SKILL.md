---
name: git-branch
description: Standardized git branch lifecycle for Label Suite following the SDD workflow.
---

# Git Branch Lifecycle

Standardized branch naming, creation, and merge workflow aligned with the SDD process and CLAUDE.md conventions.

## Branch Naming Convention

```
<type>/<short-description>
```

| Type | When to Use | Example |
|------|------------|---------|
| `feat/` | New feature from a spec | `feat/annotation-submission` |
| `fix/` | Bug fix | `fix/scoring-null-prediction` |
| `refactor/` | Code refactoring (no behavior change) | `refactor/scoring-service-cleanup` |
| `docs/` | Documentation only | `docs/update-api-readme` |
| `test/` | Adding or fixing tests | `test/e2e-annotation-flow` |
| `chore/` | Build, deps, CI/CD | `chore/upgrade-fastapi-0-115` |

**Rules**:
- All lowercase, words separated by `-`
- Max 50 characters total

## Branch Lifecycle (10 Steps)

```
Step 1: Create branch from main
  git checkout main && git pull origin main
  git checkout -b feat/annotation-submission

Step 2: Implement (following tasks.md)
  [code changes]

Step 3: Self-review gate
  /code-review-deep
  /code-review-checklist

Step 4: Fix issues found in self-review

Step 5: Commit
  git add <specific files>
  git commit -m "feat(001): implement annotation submission API"

Step 6: Push
  git push -u origin feat/annotation-submission

Step 7: Open Pull Request
  gh pr create --title "feat: 新增標記提交 API" \
    --body "<繁體中文內文，含 Closes #N 與 spec 連結 specs/annotation/001-annotation-submission>"
  (title = `<type>: <中文描述>`; body in Traditional Chinese per CLAUDE.md Communication)

Step 8: Code Review (peer or senior-code-reviewer agent)
  /pr-review

Step 9: Address review comments → new commits

Step 10: Merge (merge commit per CLAUDE.md Communication — `main` merges with merge commits so a Chinese PR title never becomes a commit subject)
  Merge via GitHub UI
  git branch -d feat/annotation-submission
```

## Commit Message Format

```
<type>(<scope>): <short description>

[optional body]

[optional footer]
Refs: openspec/changes/<change>/tasks.md
```

**Types**: `feat` | `fix` | `refactor` | `docs` | `test` | `chore`

**Examples**:
```
feat(001): add SubmissionResult model and scoring endpoint

- Add SQLAlchemy SubmissionResult model
- Add POST /api/v1/submissions FastAPI router
- Add Celery scoring task with test-set isolation

Refs: openspec/changes/<change>/tasks.md
```

```
fix(scoring): handle empty prediction list in F1 computation

Returns 0.0 instead of raising ZeroDivisionError when prediction list is empty.
```

## Safety Rules

- **Never push directly to `main`** — always use PRs
- **Never force push** without team consent
- **Never commit `.env` files** — verify `.gitignore` before `git add`
- **Never skip pre-commit hooks** (`--no-verify`)
- **Always reference spec** in `feat/` branch PR descriptions
- **Delete merged branches** to keep the repo clean
