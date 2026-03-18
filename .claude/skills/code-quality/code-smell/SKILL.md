---
name: code-smell
description: Detect code smells and anti-patterns in FastAPI + React + TypeScript code and provide refactoring recommendations.
---

# Code Smell Detection

Identify code smells, anti-patterns, and technical debt. Provide severity assessment and concrete refactoring suggestions.

## Usage

```
/code-smell                        # Scan all changed files
/code-smell backend/app/services/  # Scan specific directory
/code-smell --quick                # Summary only
```

## Output Format

```markdown
# Code Smell Report

**Scope**: [files scanned]
**Date**: YYYY-MM-DD
**Technical Debt Score**: X/10 (10 = clean)

---

## Summary

| Category | Count | Severity |
|----------|-------|----------|
| Bloaters | 0 | 🟢/🟡/🔴 |
| OOP Abusers | 0 | 🟢/🟡/🔴 |
| Change Preventers | 0 | 🟢/🟡/🔴 |
| Dispensables | 0 | 🟢/🟡/🔴 |
| Couplers | 0 | 🟢/🟡/🔴 |

---

## Detected Smells

### 🔴 Critical

#### Long Method — `ScoringService.compute_all_metrics()` (backend/app/services/scoring.py:45)
**Lines**: 120 lines (threshold: 50)
**Problem**: Method handles data fetching, metric computation, normalization, and DB write in one function.
**Current**:
```python
def compute_all_metrics(self, submission_id: int):
    # 120 lines of mixed concerns
    submission = db.query(...)
    predictions = [...]
    f1 = compute_f1(...)
    bleu = compute_bleu(...)
    normalized = normalize(...)
    db.update(...)
```
**Refactored**:
```python
def compute_all_metrics(self, submission_id: int):
    submission = self._fetch_submission(submission_id)
    scores = self._compute_scores(submission.predictions)
    self._persist_scores(submission_id, scores)

def _fetch_submission(self, submission_id: int) -> Submission: ...
def _compute_scores(self, predictions: list[str]) -> ScoreResult: ...
def _persist_scores(self, submission_id: int, scores: ScoreResult) -> None: ...
```

---

### 🟡 Medium

#### Magic Numbers — `backend/app/routers/submissions.py:78`
**Problem**: Hardcoded `100` as submission limit without named constant.
**Fix**: `MAX_DAILY_SUBMISSIONS = 100` defined in config.

#### Dead Code — `backend/app/utils/legacy_scorer.py`
**Problem**: File imported nowhere; appears to be an old scoring implementation.
**Fix**: Delete the file if no longer needed.

#### Feature Envy — `AnnotationRouter` accessing `DatasetService` internals
**Problem**: Router directly manipulates dataset fields instead of calling service methods.
**Fix**: Move logic into `DatasetService` method.

---

### 🟢 Low

#### Duplicate Code — F1 calculation repeated in 2 files
**Files**: `scoring.py:34` and `metrics_utils.py:89`
**Fix**: Extract to shared `compute_f1()` utility.

---

## Refactoring Priority

| Smell | File | Priority | Effort |
|-------|------|----------|--------|
| Long Method | scoring.py | P1 | M |
| Magic Numbers | submissions.py | P2 | S |
| Dead Code | legacy_scorer.py | P1 | S |
| Duplicate Code | scoring.py, metrics_utils.py | P2 | S |

---

## Technical Debt Estimate

| Category | Debt (hours) |
|----------|-------------|
| Refactoring | ~4h |
| Dead code cleanup | ~1h |
| Test additions | ~2h |
| **Total** | **~7h** |
```

## Smell Categories Reference

### Bloaters
Code that grows too large and becomes hard to work with:
- Long Method (> 50 lines Python / > 80 lines TypeScript)
- Large Class (> 300 lines)
- Long Parameter List (> 4 parameters)
- Data Clumps (same group of parameters passed together repeatedly)

### OOP Abusers
Incorrect or incomplete use of OOP principles:
- Switch Statements on type strings (use polymorphism or config-driven dispatch)
- Refused Bequest (subclass ignores parent methods)
- Alternative Classes with Different Interfaces

### Change Preventers
Code that forces cascade changes:
- Divergent Change (one class changes for many reasons)
- Shotgun Surgery (one change requires edits in many places)
- Parallel Inheritance Hierarchies

### Dispensables
Unnecessary code that should be removed:
- Dead Code (unused functions, imports, variables)
- Duplicate Code (same logic in multiple places)
- Lazy Class (class that does too little)
- Speculative Generality (code for hypothetical future use — YAGNI violation)

### Couplers
Excessive coupling between classes:
- Feature Envy (method uses another class's data more than its own)
- Inappropriate Intimacy (classes access each other's private data)
- Message Chains (`a.b().c().d()`)
