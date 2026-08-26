---
name: sdd-workflow
description: Machine guidance for Label Suite Spec-Driven Development. Defers SDD orchestration to docs/sdd-workflow.md.
---

# SDD Workflow — Label Suite

This is machine guidance, not the workflow authority. For SDD stages, role sequencing, delivery timing, and prompt examples, follow [docs/sdd-workflow.md](../../../docs/sdd-workflow.md). When this guide conflicts with that workflow or with a higher authority, stop and follow the canonical source rather than inventing a local rule.

Authority order is: main constitution → applicable domain constitution → Accepted ADR → canonical feature spec → `docs/sdd-workflow.md` for SDD orchestration → machine guidance and derived views. Proposed ADRs are nonbinding.

## Canonical Flow

Use the canonical stages and gates from `docs/sdd-workflow.md`:

```text
/superpowers:brainstorm
→ /speckit.specify
→ Spec Lint
→ /label-suite-design
→ prototype shell → Red Playwright failure → selector/behavior Green → refactor/page design
→ Frontend Ready Gate
→ /opsx:propose
→ OpenSpec schema validation + Project SDD lint
→ /opsx:apply
→ final-PR /opsx:archive write-back
→ /pr-flow final merge
→ post-merge STATUS update and canonical spec movement to specs/_archive/
```

`/pencil-wireframe` and `senior-uiux` review are optional where the canonical workflow permits them. A UI/UX capability may assist with design, but `/label-suite-design` is the canonical prototype-stage command.

## Prototype TDD

For a new prototype page, read the canonical spec and `design/system/MASTER.md`, then follow this exact order:

1. Create a loadable static shell without target selectors or behavior.
2. `senior-qa` writes, commits, and runs a Playwright Red test; record the expected failure.
3. Only after the confirmed Red result, the implementation agent adds the `data-testid` selector contract and target behavior to make the test Green.
4. Refactor only while the tests remain Green.

Prototype tests live under `design/prototype/tests/` and cover static-HTML behavior. Stable `data-testid` values are the shared contract for the prototype and React implementation. Formal React E2E placement follows the applicable Accepted ADR and testing constitution authority; do not infer or introduce a path from this guide.

Run prototype checks from `design/prototype/` with:

```bash
pnpm test
pnpm run test:headed
pnpm run test:ui
```

## TDD Ownership And Tasks

All behavior changes use Red → Green → Refactor. The testing constitution is authoritative for the full rule.

- `senior-qa` owns each separate Red test task and commits/runs the expected failure before Green work starts.
- The implementation agent owns the paired Green task and does not weaken or rewrite the Red contract to pass it.
- The main agent/team lead verifies Red and Green evidence and is the only role that updates task checkboxes.
- A static prototype shell may precede Red; target selectors and behavior may not.

Each artifact-producing task normally modifies one file. Only `package-manager`, `scaffold`, and `governance-propagation` may be multi-file exceptions; the task text must state `Exception:`, the complete `Files:` list, and the `Reason:` it is atomic. Command-only verification tasks state their exact commands and expected results.

## Four-Layer Verification

The four-layer gate model in [docs/sdd-workflow.md](../../../docs/sdd-workflow.md#61-四層驗證閘) has distinct responsibilities:

1. **OpenSpec schema validation** checks OpenSpec schema, delta, and scenario structure. Use the non-strict schema gate, such as `openspec validate --changes --no-interactive`; it does not validate project headings, ownership, status, or retired paths.
2. **Project SDD lint** checks project headings and goal/status/ownership/retired-path rules. Until its tooling exists, use the canonical workflow checklist and review evidence.
3. **Code/test gates** verify affected Red/Green evidence and relevant type, lint, unit, integration, prototype, E2E, and security checks.
4. **Source-Verify + write-back/archive** verifies archive-time canonical IDs, version, and Changelog integrity, then verifies by `grep` that every canonical citation in the derived view is locatable — FR/AC IDs, section references, file paths, ADR/issue/PR numbers, and paraphrased requirement clauses. `openspec archive` copies propose-time delta text verbatim, so a citation that was wrong at propose time survives into the derived view and no CLI check catches it. See `docs/sdd-workflow.md` §6.2.

`/opsx:verify` may coordinate workflow-specific checks, but does not replace any of the four layers. Do not present it or `openspec validate` as a project-wide consistency gate.

## Archive And Delivery Timing

Intermediate PR groups complete Red, Green, task verification, and group review, then merge while the OpenSpec change stays open. For the final PR group, complete layers 1–3 and collect Source-Verify evidence before running `/opsx:archive`; archive/write-back belongs in that final PR and completes layer 4 only after successful canonical write-back.

After the final PR merges, update `specs/STATUS.md` to archived and move the canonical feature spec to `specs/_archive/`. Do not move the canonical spec during an intermediate PR or before final merge.

## When SDD Applies

Ask: **will this change make the system behave differently from what the specs define?**

Skip a full SDD flow for code changes that preserve specified behavior: bug fixes that restore the spec, typo/formatting/comment edits, non-breaking dependency updates, configuration adjustments without behavior change, and tests for existing behavior.

Use SDD for a new feature, behavior change, breaking API/contract change, or architectural change. A very small behavior clarification may use the Lightweight Path only when every trigger in `docs/sdd-workflow.md` and the applicable governance sources is satisfied; otherwise use the full OpenSpec flow.

## Machine Checklist

Before advancing a stage, confirm that:

- the canonical feature spec has a verifiable `## 功能目標`, FR/AC/SC, and dependencies;
- the Frontend Ready Gate is satisfied (or each inapplicable item is explicitly `N/A` with a reason);
- the Red contract was committed and failed for its stated reason before Green implementation;
- the appropriate four-layer gates have evidence for the current stage; and
- archive/write-back occurs only in the final PR, with canonical spec movement only after merge.
