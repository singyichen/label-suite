# Code Review Skills — Usage Guide

This document explains how to use the Code Review related Skills in the Label-Eval-Portal project.

## Available Skills

### 1. `code-review` — Comprehensive Code Review
**Use when**: Before merging any PR; after implementing a new feature

**Outputs**:
- Critical / High / Medium / Low issue breakdown
- **Test-Set Leakage Audit** (non-negotiable for any submission-related code)
- Security review (OWASP Top 10)
- Performance analysis (N+1 queries, Celery task efficiency)
- Testing coverage analysis
- Constitution compliance check

**Examples**:
```bash
/code-review
/code-review backend/app/services/scoring.py
/code-review backend/app/routers/
```

---

### 2. `code-review-checklist` — Review Checklist Generator
**Use when**: Before submitting a PR; onboarding new contributors

**Modules supported**:
- `api` — FastAPI endpoint checklist
- `scoring` — Scoring engine checklist (security-critical)
- `frontend` — React + TypeScript checklist
- `celery` — Celery task checklist
- (default) — General checklist

**Examples**:
```bash
/code-review-checklist
/code-review-checklist scoring
/code-review-checklist api
/code-review-checklist frontend
```

---

### 3. `pr-review` — Pull Request Review
**Use when**: PR is submitted and ready for review

**Outputs**:
- PR metadata and description quality assessment
- Spec traceability (AC coverage verification)
- Test-Set Leakage Audit
- Security and RBAC review
- Testing status (pytest + Playwright)
- Approve / Approve with Comments / Request Changes recommendation

**Examples**:
```bash
/pr-review #42
/pr-review --quick
```

---

### 4. `code-smell` — Code Smell Detection
**Use when**: Technical debt assessment; refactoring planning

**Examples**:
```bash
/code-smell
/code-smell backend/app/services/
/code-smell --quick
```

---

## Typical Workflow

### Scenario 1: Pre-PR Self-Review
```bash
# 1. Comprehensive code review
/code-review

# 2. Check scoring module specifically (if modified)
/code-review-checklist scoring

# 3. Fix all Critical and High issues
# 4. Submit PR
```

### Scenario 2: Reviewing a Teammate's PR
```bash
# 1. High-level PR review
/pr-review #42

# 2. Detailed code review on changed files
/code-review backend/app/services/scoring.py

# 3. Provide specific fix suggestions
```

### Scenario 3: Scoring Engine Changes
```bash
# Scoring code changes are security-critical.
# Always run the scoring checklist:
/code-review-checklist scoring

# Then full code review:
/code-review backend/app/services/scoring.py backend/app/tasks/scoring.py

# Verify no leakage in tests:
pytest backend/tests/test_security.py -v
```

---

## Severity Reference

| Level | Icon | Definition | Required Action |
|-------|------|------------|-----------------|
| Critical | 🔴 | Security vulnerability; test-set leakage; data corruption | Must fix before any commit |
| High | 🟠 | Broken RBAC; major bug; missing auth | Must fix before merge |
| Medium | 🟡 | Performance issue; missing validation; technical debt | Fix this sprint |
| Low | 🟢 | Style; naming; minor improvement | Optional |

> **Non-Negotiable**: Any test-set answer leakage is always **Critical** and blocks all merges.

---

## Constitution Compliance

All code reviews check compliance with the six Constitution principles:

| # | Principle | Key Check |
|---|-----------|-----------|
| I | Config-Driven | Task types defined in config, not hardcoded |
| II | Minimal Coupling | No circular imports; clear module boundaries |
| III | Security First | Test-set leakage prevention; RBAC; no wildcards |
| IV | KISS / YAGNI | No over-engineering; no dead code |
| V | Test Coverage | ≥90% scoring; ≥80% overall |
| VI | English First | No Chinese strings in non-README files |
