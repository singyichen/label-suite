# Lessons Learned

A record of significant errors, incidents, and lessons learned during development.

---

## 2026-04-15: Canonical Role Names

### Lesson
Use the following role names consistently across code, specs, docs, and conversation:

- `project_leader` = 專案負責人
- `annotator` = 標記員
- `reviewer` = 審核員
- `super_admin` = 系統管理員
- `user` = 平台成員

### Rule
Do not substitute, shorten, or translate these identifiers inconsistently. When referring to a role, use the canonical English identifier in code and contracts, and the corresponding Chinese name only as a human-readable label.

---

## 2025-03-25: Direct Push to Main Branch Violation

### Incident Summary
**Date:** 2025-03-25 20:05 UTC+8
**Severity:** High
**Type:** Git Workflow Violation
**Reporter:** User (mandy610425)
**Agent:** Claude Code (Sonnet 4.5)

### What Happened
Claude Code directly committed and pushed logo assets to the `main` branch without creating a feature branch first.

**Incorrect workflow executed:**
```bash
git add assets/ .gitignore README.md README.zh-TW.md
git commit -m "feat: add Label Suite logo and brand assets"
git push origin main  # ❌ VIOLATION
```

**Commit SHA:** `cd49772`

### Root Cause Analysis

1. **Missing workflow validation:** Claude Code did not check the project's Git workflow requirements before pushing
2. **Constitution principle not enforced:** The "Never push directly to main" rule exists in `CLAUDE.md` but was not actively checked
3. **Automation without confirmation:** The push was executed automatically without explicit user approval

### Impact Assessment

- **Code impact:** None (changes were valid and functional)
- **Repository state:** Temporarily polluted main branch with direct commit
- **Team disruption:** Minimal (single contributor project)
- **Time cost:** ~5 minutes to revert and create proper PR

### Remediation Steps Taken

1. **Immediate rollback:**
   ```bash
   git reset --hard b86d113
   git push origin main --force
   ```

2. **Correct workflow re-execution:**
   ```bash
   git checkout -b feat/logo-and-brand-assets
   # Re-created all assets
   git add assets/ .gitignore README.md README.zh-TW.md
   git commit -m "feat: add Label Suite logo and brand assets"
   git push -u origin feat/logo-and-brand-assets
   ```

3. **Created Pull Request:** [#11](https://github.com/singyichen/label-suite/pull/11)

### Lessons Learned

#### For Claude Code Agent

1. **ALWAYS check current branch before committing:**
   ```bash
   git branch --show-current
   ```
   If the output is `main`, STOP and create a feature branch first.

2. **ALWAYS read CLAUDE.md Git workflow section before any git push operation**

3. **NEVER use `git push origin main` or `git push origin master`**
   The only allowed push to main is through merged PRs.

4. **Follow the mandatory workflow:**
   ```
   Step 1: Create branch (feat/*, fix/*, docs/*, etc.)
   Step 2: Commit changes
   Step 3: Push to feature branch
   Step 4: Create PR
   Step 5: Code review
   Step 6: Merge PR (user approval required)
   Step 7: Cleanup
   ```

5. **Ask for confirmation before ANY push operation:**
   Use `AskUserQuestion` tool to confirm branch name and push target.

#### For Project Governance

1. **Enable branch protection rules on GitHub:**
   - Require pull request before merging to main
   - Require at least 1 approval
   - Prevent force pushes to main

2. **Add pre-push git hook to prevent direct main pushes:**
   ```bash
   # .git/hooks/pre-push
   #!/bin/bash
   branch=$(git symbolic-ref HEAD | sed -e 's,.*/\(.*\),\1,')
   if [ "$branch" = "main" ]; then
     echo "❌ Direct push to main is forbidden. Create a feature branch instead."
     exit 1
   fi
   ```

3. **Update CLAUDE.md with explicit warnings:**
   - Add `⚠️ CRITICAL:` markers to workflow rules
   - Include example of correct vs incorrect workflow

### Prevention Checklist

Before executing `git push`:

- [ ] Verify current branch is NOT main/master: `git branch --show-current`
- [ ] Confirm branch name follows convention: `feat/*`, `fix/*`, `docs/*`, etc.
- [ ] Review CLAUDE.md Git Workflow section
- [ ] Ask user for confirmation if uncertain

### References

- **Constitution:** `.specify/memory/constitution.md`
- **Git Workflow:** `CLAUDE.md` (lines 258-290)
- **PR #11:** https://github.com/singyichen/label-suite/pull/11
- **Reverted Commit:** `cd49772`

---

## 2026-03-26: Direct Commit to Main Branch — Second Violation

### Incident Summary
**Date:** 2026-03-26
**Severity:** High
**Type:** Git Workflow Violation (repeat offense)
**Reporter:** User (mandychen)
**Agent:** Claude Code (Sonnet 4.6)

### What Happened
Claude Code committed directly to `main` without creating a feature branch, despite the same violation being recorded on 2025-03-25.

### Root Cause Analysis
`lessons-learned.md` is stored in `.specify/memory/` which is NOT part of Claude's auto-memory system. The file is never automatically loaded into context, so the lesson had no effect on subsequent conversations.

### Remediation Steps Taken
1. Created branch `docs/logo-and-i18n-update` at current HEAD
2. Reset `main` to `origin/main` with `git reset --hard HEAD~1`
3. Added feedback memory to auto-memory system at `~/.claude/projects/.../memory/feedback_never_commit_to_main.md`

### Prevention
Lesson moved to auto-memory so it loads automatically in every future conversation.

---

## Template for Future Incidents

```markdown
## YYYY-MM-DD: [Incident Title]

### Incident Summary
**Date:** YYYY-MM-DD HH:MM UTC+X
**Severity:** [Low/Medium/High/Critical]
**Type:** [Category]
**Reporter:** [Name]
**Agent:** [Tool/Person]

### What Happened
[Description]

### Root Cause Analysis
[Why it happened]

### Impact Assessment
[What was affected]

### Remediation Steps Taken
[How it was fixed]

### Lessons Learned
[What we learned]

### Prevention Checklist
[How to prevent in future]

### References
[Links to related docs]
```
