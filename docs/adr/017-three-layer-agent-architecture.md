# ADR-017: Three-Layer Agent Architecture (Planner / Generator / Evaluator)

**Status**: Accepted
**Date**: 2026-05-27

## Context

As agent-driven development matures in this project, three recurring failure modes have emerged:

1. **Scope explosion**: vague user briefs lead to unbounded implementation sessions.
2. **Context drift**: long Generator sessions degrade in quality when the agent relies on `/compact` summaries rather than ground-truth specs on disk.
3. **Silent self-evaluation**: the model grades its own output, missing objective failures.

A structured pipeline is needed with hard contracts at each layer boundary.

## Decision

Adopt a **three-layer sprint architecture** as the mandatory execution model for all implementation tasks.

### Layer 1 — Planner
Converts a user brief (potentially vague) into atomic, executable spec items. Scope is locked before Generator starts; no new items may be added mid-sprint.

### Layer 2 — Generator
Implements one spec item per invocation. On context limit, performs a full `/clear` reset and re-reads the spec from disk. `/compact` is forbidden in Generator phase — summaries introduce information loss that corrupts later steps.

### Layer 3 — Evaluator
Validates output using external, deterministic tools only: pytest, mypy, ruff, tsc, Playwright. Self-assessment is forbidden. Hard threshold: any single tool failure = sprint failure; stop and surface to user.

## Mapping to SDD Pipeline

| Layer | SDD skills |
|-------|-----------|
| Planner | `speckit.specify` → `speckit.plan` → `speckit.tasks` |
| Generator | `speckit.implement` |
| Evaluator | `speckit.analyze` → `speckit.checklist` → verification commands |

## Design Options Evaluated

### Option A — Unstructured agent sessions (status quo)
No explicit role separation. The same agent session plans, implements, and evaluates.
**Rejected**: causes all three failure modes above.

### Option B — Three-layer pipeline with hard boundaries (selected)
Each layer has a defined contract. Scope locked between Planner and Generator. Evaluation always external.
**Benefit**: eliminates all three failure modes; maps naturally to the existing SDD pipeline.

### Option C — Separate subagent invocations per layer
Each layer is a distinct Claude Code subagent call.
**Deferred**: adds orchestration overhead not warranted at current scale. Revisit if complex agentic tasks require it.

## Consequences

### Easier
- Scope explosions are caught at Planner output review, before any code is written.
- Generator has a defined restart protocol that does not degrade quality across resets.
- Evaluation is objective and reproducible — external tools, not model judgment.

### Harder
- Planner output must be reviewed by the user before Generator starts — one extra gate.
- Generator must re-read the full spec on restart, consuming context budget.
- Sprint failure is binary; partial progress is not accepted as "good enough."

## Practical Guidelines

### When to use three-layer vs. single-layer

**Single-layer is sufficient when:**
- Task completes within ~30 minutes
- Task boundaries are clear and stable upfront
- A complete test suite already exists to catch regressions

**Three-layer is required when:**
- Task exceeds ~1 hour of implementation
- Task requires more than one context window (Generator needs multiple resets)
- Task decomposition itself is non-trivial
- Quality bar is high and intermittent errors are not acceptable

General rule: tasks over 30 minutes warrant the three-layer structure.

### Does the Evaluator have to be a separate AI agent?

No. The Evaluator can be:

| Mode | Reliability | Notes |
|------|-------------|-------|
| Pure tool chain (pytest + mypy + Playwright) | Highest | Deterministic, no AI judgment |
| Separate Claude session | Medium | Different context = reduced self-evaluation bias |
| Same Claude session with explicit critical framing | Lowest | Shared context means the model defends its own output |

**Principle**: Evaluator reliability scales with its independence from the Generator. The further the Evaluator is from the session that produced the code, the more it can be trusted.

For this project, the default Evaluator is the **pure tool chain** (verification commands in CLAUDE.md). A separate Claude session is acceptable only when tool coverage is incomplete for the feature under test.

## Referenced by

- [CLAUDE.md](../../CLAUDE.md) — Three-Layer Sprint Architecture section
- [Constitution](../../.specify/memory/constitution.md) — Principle 1: Reliability
