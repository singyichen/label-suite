---
name: pr-review
description: Complete Pull Request review including scope, security, spec traceability, and merge recommendation.
---

# Pull Request Review

Comprehensive PR review covering description quality, change scope, security (test-set leakage), spec traceability, and merge recommendation.

## Usage

```
/pr-review #123
/pr-review --quick    # Summary only
```

## Output Format

```markdown
# PR Review: #[number] — [PR Title]

**Branch**: `feat/NNN-feature` → `main`
**Author**: @username
**Reviewer**: senior-code-reviewer
**Date**: YYYY-MM-DD
**Decision**: ✅ Approve | 🟡 Approve with Comments | 🔴 Request Changes

---

## PR Overview

| Attribute | Value |
|-----------|-------|
| Files Changed | N |
| Lines Added | +NNN |
| Lines Removed | -NNN |
| Spec Reference | specs/NNN-feature/ |
| Related Issue | #N (if applicable) |

---

## Description Quality

| Check | Status |
|-------|--------|
| What: describes what changed | ✅ / ❌ |
| Why: links to spec or issue | ✅ / ❌ |
| How: notes non-obvious implementation choices | ✅ / ❌ |
| Breaking changes explicitly mentioned | ✅ / N/A |
| Test plan included | ✅ / ❌ |

---

## Spec Traceability

| AC | Implemented | Test Coverage |
|----|-------------|---------------|
| AC-01 | ✅ / ❌ | pytest / Playwright |
| AC-02 | ✅ / ❌ | pytest / Playwright |
| AC-03 | ✅ / ❌ | pytest / Playwright |

**Orphaned code** (changes not traced to any AC): [list or none]

---

## Change Scope

**Assessment**: Focused ✅ | Too Large ⚠️ | Unrelated Changes ⚠️

[If too large: suggest how to split]

---

## Security Review

### Test-Set Leakage (NON-NEGOTIABLE)

| Check | Status |
|-------|--------|
| `answer` / `reference` excluded from API response schemas | ✅ / ❌ |
| `answer` not logged in application logs | ✅ / ❌ |
| Test-set dataset access restricted to admin + Celery worker | ✅ / ❌ |
| Scoring logic not accessible via annotator-facing endpoints | ✅ / ❌ |

### General Security

| Check | Status |
|-------|--------|
| RBAC applied to new admin endpoints | ✅ / N/A |
| Rate limiting on submission endpoints | ✅ / N/A |
| No hardcoded secrets or tokens | ✅ / ❌ |
| No `dangerouslySetInnerHTML` in frontend | ✅ / N/A |

---

## Code Quality

| Check | Status | Notes |
|-------|--------|-------|
| Type annotations complete | ✅ / ⚠️ | |
| No N+1 queries | ✅ / ⚠️ | |
| Celery tasks idempotent | ✅ / N/A | |
| YAGNI / no speculative code | ✅ / ⚠️ | |
| Source files English-only (code, comments, docstrings, identifiers) | ✅ / ⚠️ | Does not apply to the PR/issue description, which is Traditional Chinese per issue #380 |

---

## Testing

| Type | Status | Coverage |
|------|--------|----------|
| pytest unit (scoring, services) | ✅ / ❌ | X% |
| pytest integration (API endpoints) | ✅ / ❌ | X% |
| Playwright E2E (user flows) | ✅ / N/A | P1 flows |
| Security test (leakage prevention) | ✅ / ❌ | |
| CI checks passing | ✅ / ❌ | |

---

## Action Items

### Before Merge (Blockers)
- [ ] [Required change]

### After Merge (Nice-to-Have)
- [ ] [Follow-up task or tech debt item]

---

## Inline Comments

| File | Line | Comment |
|------|------|---------|
| `backend/app/schemas/dataset.py` | 45 | Remove `answer` field from response schema |
| `frontend/src/components/TaskForm.tsx` | 78 | Add TypeScript prop interface |
```

## Decision Criteria

| Decision | Condition |
|----------|-----------|
| ✅ Approve | All blockers resolved; no Critical/High issues |
| 🟡 Approve with Comments | Only Medium/Low issues; no security risks |
| 🔴 Request Changes | Any Critical issue; test-set leakage detected; missing AC coverage |
