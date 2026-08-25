# ADR-033: OpenSpec as the Change Workflow Layer (`specs/` Remains Canon)

**Status**: Accepted
**Date**: 2026-08-24

> This ADR is a **decision draft** raised by issue #294. Merging it ratifies Phase 1 only (the decision and its governance shape). Tooling initialization, Spec Kit retirement, and the pilot are separate, later steps — see [OpenSpec Adoption Plan](../openspec-adoption-plan.md).

## Context

Formal development is starting. The specs in `specs/` are the project's most complete artifact set and most are already Clarified, but they will keep being adjusted as implementation feedback arrives. Two forces collide:

1. **The current change flow is too heavy for small adjustments.** CLAUDE.md's **Modify Existing Feature** flow requires retrieving the feature from `specs/_archive/`, opening a branch, bumping the spec version, and resuming the pipeline from `/speckit.clarify`. For a wording fix or a one-requirement adjustment this is disproportionate. The existing **Lightweight Path** escape hatch only applies when ≤ 2 production code files change, there is no API contract change, and the behavior change is minor — it does not cover a module's first implementation, and it offers no structured container for the change itself.
2. **The specs must not lose their authority.** Constitution Principle XX (Source of Truth & Contract Governance) requires that requirements, API contracts, and UI behavior each have exactly one source of truth, and that derived files declare their source and sync process. Any new workflow layer must reinforce that, not dilute it.

### OpenSpec

[OpenSpec](https://github.com/Fission-AI/OpenSpec) (Fission-AI) is a spec-change workflow for AI coding agents. Per its README:

- Directory layout: `openspec/specs/` (requirements and scenarios), `openspec/changes/` (in-flight proposals, one folder per change), `openspec/changes/archive/` (completed changes, timestamped).
- Each change folder holds `proposal.md` (rationale and scope), `design.md` (technical approach), `tasks.md` (implementation checklist), and `specs/` (requirement deltas).
- Lifecycle: **propose** (`/opsx:propose`) → **apply** (`/opsx:apply`) → **archive** (`/opsx:archive`, which moves the change to the timestamped archive and updates specs). An optional **explore** (`/opsx:explore`) phase precedes propose.
- Deltas use semantic delimiters `## ADDED Requirements` / `## MODIFIED Requirements` / `## REMOVED Requirements`, with `WHEN`/`THEN` scenarios as concrete acceptance criteria.
- CLI: `openspec init` (generates `openspec/config.yaml`), `openspec update`, `openspec validate`, `openspec archive`, `openspec config profile`.
- Requires Node.js 20.19.0 or higher.

### Reference implementation: duty-mate

A NestJS SSR project run end-to-end on OpenSpec (36 capabilities, 24 archived changes) was surveyed on 2026-08-20. Findings that shaped this decision:

- **Two-layer specs are a proven pattern.** Its changes link upstream to a PRD layer via a frontmatter field naming the corresponding spec file — evidence that "external canon + OpenSpec working layer" is workable.
- **A change can carry a full feature**, not just a tweak: complete features were delivered as a single change with parallel/serial sections inside `tasks.md`.
- **The derived capability view has real quality**: capability files are concrete and scenario-shaped, at a granularity convenient for agent loading.
- **Warning sign**: its live specs still contain leftover `## ADDED Requirements` headings, showing that archive-time auto-merge cannot be trusted blindly.

## Decision

Adopt OpenSpec as the **implementation and change workflow layer** — covering both a module's first implementation and later spec adjustments — while `specs/` remains the sole canon (SSoT). `specs/` is **not** migrated to OpenSpec capability format.

```text
specs/  (canon = where truth accumulates)
   │ read
   ▼
openspec/changes/<change>/   propose (delta + design + tasks) → apply (TDD implementation)
   │ dual write at archive time
   ├─→ openspec/specs/          auto-merged derived view (capability granularity, for agent loading; never authoritative)
   └─→ specs/[module]/spec.md   version bump + Changelog entry (write-back hard gate)
```

### Rule 1 — Write-back is a hard gate

Archiving a change must, in addition to the auto-merge into the derived view, write back to the canonical `specs/[module]/NNN-feature/spec.md`: a version bump (PATCH/MINOR/MAJOR per Constitution Principle I) plus a Changelog entry. **A PR whose change touches requirements but does not update the canonical `spec.md` must not be merged.** This continues the discipline the Lightweight Path already imposes.

Rationale: if `specs/` goes stale the whole system has no truth. This gate is the only safety net, and duty-mate's leftover delta headings prove the auto-merge alone cannot be relied on.

### Rule 2 — `openspec/specs/` is a derived view and is never authoritative

- Only archive-time merge may write to it; it must never be hand-edited.
- Each capability file must carry a header naming its canonical path and the corresponding FR/AC IDs, required of AI output through the `rules` field of `openspec/config.yaml`.
- Any conflict with `specs/` resolves in favor of `specs/`.
- The `context` field of `openspec/config.yaml` must state that propose reads current state from `specs/[module]/spec.md`.

This satisfies Constitution Principle XX's requirement that derived files declare their source and sync process.

### Rule 3 — Deltas must be traceable

- A delta must reference stable FR/AC IDs, e.g. `MODIFIED Requirement: FR-057`.
- A change's `proposal.md` frontmatter must name the corresponding spec: `specs/[module]/NNN-feature/spec.md`.
- Write-back is therefore a mechanical cross-reference, and must pass the CLAUDE.md **Source-Verify gate** — every written-back ID must be locatable in the canonical spec.

### Rule 4 — `changes/archive/` is a work record only

Historical queries are answered from the canonical `spec.md` Changelog, not from archived change folders.

### Addendum — when `design.md` becomes mandatory

`design.md` is optional by default (KISS, Constitution Principle V). It becomes **mandatory when a change touches an API contract or a DB schema**, and must then contain the contract definition (endpoints / schema / migration impact). Enforced through `openspec/config.yaml` `rules`.

### Existing hard gates are re-attached, not relaxed

TDD, the PR size limits (≤ 5 files / ≤ 300 lines excluding tests, Constitution Principle X), the constitution compliance check, and the verification commands must be re-attached to the apply flow through `openspec/config.yaml` `rules` and CLAUDE.md. Adoption must not downgrade governance.

### Difference from the duty-mate reference implementation

duty-mate places truth in `openspec/specs/`, with its upstream `docs/specs/` layer holding PRD context only. Here the layers hold different weights: this project's `spec.md` files already carry FR/AC/SC at capability-specification granularity, so **truth stays in `specs/`** and `openspec/specs/` is kept purely as a derived, agent-facing view.

### Non-goals (explicitly out of scope)

- **No migration of `specs/` to OpenSpec capability format.** The canon keeps its current structure.
- **No standing per-change SA / SD / UI-UX analysis documents.** duty-mate adopts these to compensate for a loose upstream PRD and no design system; here the equivalent context is already covered by standing canon — `spec.md`, `design/system/MASTER.md`, `design/system/ux-conventions.md` (UXC-NN), and the prototypes. OpenSpec's native `design.md` is the **only** per-change technical design container; when a complex change temporarily dispatches senior-sa / senior-sd / senior-uiux agents, their output is written into `design.md`, not into new files.

## Spec Kit Division of Labor

Spec Kit narrows to a **spec production tool** (the WHAT side); OpenSpec takes over the **implementation workflow** (the HOW side).

| Command | Disposition |
|---------|-------------|
| `/speckit.specify`, `/speckit.clarify` | **Retained** — new spec production and pre-implementation disambiguation, acting on the canonical `spec.md`; no conflict with OpenSpec |
| `/speckit.plan`, `/speckit.tasks`, `/speckit.implement` | **Retired** — replaced by OpenSpec propose (`design.md` + `tasks.md`) and apply; per-feature `plan.md` is no longer produced |
| `/speckit.analyze`, `/speckit.checklist` | **Repositioned** — their spec/plan/tasks cross-check idles once plan/tasks retire; change-level verification passes to `/opsx:verify`, write-back verification to the Source-Verify gate |

Four accompanying decisions:

1. **`specs/foundation/000-foundation/plan.md` is preserved as an exception.** It is the project-wide engineering baseline (API conventions, Pydantic schema layering, project structure), not an ordinary feature plan. It is retained in place as a standing architecture document, referenced by every change's `design.md`. `specs/account/001-login-email-password/plan.md` serves as reference material for the first login change and is archived afterwards.
2. **The constitution check gate moves.** The plan-template's design-time principle checks move into the OpenSpec flow: `openspec/config.yaml` `rules` requires a constitution-check section in `proposal.md` / `design.md`.
3. **Definition of Done is rewritten.** CLAUDE.md's current DoD — "all commands above exit 0 + `/speckit.analyze` reports zero findings" — loses meaning once plan/tasks retire. It becomes: `/opsx:verify` passes + write-back Source-Verify passes + all verification commands exit 0.
4. **`specs/STATUS.md`'s state machine is simplified.** The `plan-ready` and `tasks-ready` states disappear; a representation for "a change is in flight" is added.

## Design Options Evaluated

### Option A — Status quo (Spec Kit only)

Keep the Modify Existing Feature flow for every adjustment.
**Rejected**: disproportionate cost per small change; the Lightweight Path covers too narrow a slice and gives the change no structured container.

### Option B — Full duty-mate model (truth migrates to `openspec/specs/`)

Migrate `specs/` content into OpenSpec capability format and let `openspec/specs/` be canon.
**Rejected**: discards the FR/AC/SC ID space that specs, prototypes, tests, and issues already reference; a large one-off migration with no requirement benefit; and duty-mate's own leftover delta headings show the auto-merged layer is not trustworthy enough to hold truth.

### Option C — OpenSpec as workflow layer, truth stays in `specs/`, derived view retained (selected)

`specs/` stays canon; `openspec/specs/` is kept as an auto-merged derived view for agent loading; write-back is a hard PR gate.
**Benefit**: lightweight incremental loop without moving the source of truth; the derived view's capability granularity and scenario-shaped acceptance criteria remain available to agents.

### Option D — OpenSpec as workflow layer, derived view disabled

Same as C but `openspec/specs/` is never generated.
**Deferred as the fallback**: if the pilot shows drift-management cost exceeds the agent-loading benefit, fall back to this. Truth in `specs/` is unaffected either way, so the fallback is cheap.

## Consequences

### Easier

- Small spec adjustments and first-time module implementations share one lightweight loop: propose → apply → write back.
- Each change has a single reviewable container (proposal + design + tasks + deltas) instead of a per-feature plan/tasks pair.
- FR/AC-ID-referencing deltas make "what exactly changed in this requirement" mechanically checkable.

### Harder

- Two spec surfaces exist, so drift between the derived view and the canon must be actively policed (Rule 2 headers plus pilot drift sampling).
- Every change now carries a write-back obligation, and PR review gains one more blocking check.
- A second toolchain must be installed and kept current alongside Spec Kit; contributors must know which tool owns which stage.
- Governance text is spread across CLAUDE.md, the constitution, `.claude/rules/`, `.claude/skills/sdd-workflow/`, and `specs/STATUS.md`, so adoption requires a coordinated amendment pass.

## Rollout

Four phases, with acceptance criteria per phase, are specified in [docs/openspec-adoption-plan.md](../openspec-adoption-plan.md). Phase 1 is ratified by merging this ADR; Phases 2–4 require separate PRs.

## Open Questions — Resolved

Settled by the maintainer on 2026-08-24. **Items 1 and 4 were later superseded** — item 1 by OpenSpec CLI 1.10.0 reality (surfaced in PR #362, which listed this amendment as a follow-up), item 4 by a maintainer decision on 2026-08-25. Both carry a note below; items 2 and 3 stand as written.

1. **`/opsx:verify` availability.** Confirmed: `/opsx:verify` exists, but only under OpenSpec's **Expanded Profile**, activated via `openspec config profile` + `openspec update`. It is not present in the default profile. Phase 2's `openspec init` step must select the Expanded Profile so `/opsx:verify` is available for the Spec Kit division-of-labor table above.

   > **Superseded 2026-08-25 — this resolution could not be carried out.** OpenSpec CLI 1.10.0 has neither an Expanded Profile nor an `/opsx:verify` command; `openspec config profile` offers only the `core` preset. Phase 2 (PR #362) therefore could not select the profile this item requires, and the Phase 4 pilot (issue #356) confirmed the command is absent end-to-end. Change-level verification is instead carried by `openspec validate` (non-strict **schema** gate only) plus this repository's own gates. The authoritative model is the **four verification gates** in [docs/sdd-workflow.md](../sdd-workflow.md) and CLAUDE.md; every `/opsx:verify` mention in this ADR — including the division-of-labor table and the Definition of Done rewrite above — must be read through that model, not as a runnable command.
2. **CLI installation route.** Resolved: use `pnpm add -g` as Issue #294 proposed. This is a global install, not a repo lockfile write, so it does not trigger the CLAUDE.md prohibition on `npm install` (which targets lockfile divergence).
3. **Fate of `specs/foundation/000-foundation/plan.md`.** Resolved: keep it in place as a standing architecture document. No promotion into an ADR or CLAUDE.md; the file and its current path stay as-is, referenced by every change's `design.md` per accompanying decision 1 above.
4. **Pilot subject.** Resolved: a small spec adjustment, not foundation-000. Lower risk, exercises the full propose→apply→archive loop; the specific spec item is chosen when Phase 4 starts.

   > **Superseded 2026-08-25 by maintainer decision.** The pilot subject became the implementation of `specs/foundation/000-foundation/spec.md` (Foundation-Core, `plan.md` v2.0.0 scope) — the opposite of what this item resolved. The full propose→apply→archive loop ran across 9 stacked PRs; the change is archived at `openspec/changes/archive/2026-08-25-implement-foundation-core/` and the canon was written back to v1.12.4 (PR #412). Outcome, the 7 pilot acceptance criteria one by one, and 4 pilot findings are recorded in [issue #356](https://github.com/singyichen/label-suite/issues/356#issuecomment-5410799424).

## Referenced by

- [CLAUDE.md](../../CLAUDE.md) — Spec-Driven Development section (Modify Existing Feature, Lightweight Path, Definition of Done)
- [Constitution](../../specs/_governance/constitution.md) — Principle I (Spec-First Development), Principle X (Change Scope Discipline), Principle XX (Source of Truth & Contract Governance)
- [ADR-017](017-three-layer-agent-architecture.md) — Planner / Generator / Evaluator mapping to SDD skills
- Issue #294 — governance: adopt OpenSpec as spec-change workflow for formal development
- Issue #356 — Phases 2–4 rollout; its Phase 4 pilot supersedes Open Questions 1 and 4 above
