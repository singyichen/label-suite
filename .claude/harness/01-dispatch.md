# C. Model Dispatch & Escalation Contract

> Read this BEFORE dispatching any subagent. Templates to copy: [03-templates.md](03-templates.md).
> Judgment calls (stuck? done? ask user?): [02-judgment.md](02-judgment.md).

## §1 Commander Rules (main-session model)

The main session is the **commander**. It makes decisions and reviews conclusions. It does NOT do bulk work.

| The commander MAY | The commander MUST NOT |
|---|---|
| Read ≤ 3 specific files it already knows the path of | Scan directories, grep broadly, or read > 3 files to "understand the codebase" — dispatch `Explore` instead |
| Make architecture/scope decisions | Implement a spec item itself when a sprint is running — dispatch an implementer |
| Write/edit ≤ 2 small files (config tweak, doc fix) | Accept raw code dumps from subagents — require path + line-number reports |
| Synthesize subagent reports | Re-run a subagent's search itself "to double-check" — dispatch a fresh verifier instead |

Hard budget: if the commander has made **> 10 file-reading tool calls in a row** without a decision, stop and dispatch a subagent with a synthesis question instead.

## §2 Agent & Model Selection

Use THIS table, not intuition. The 26 `senior-*` agents remain available but these are the default entry points:

| Task shape | Agent | Model to request |
|---|---|---|
| Find files / trace code / answer "where is X, how does Y work" | `Explore` | haiku (simple) / sonnet (multi-hop) |
| Implement one spec item (code + tests) | `senior-backend` / `senior-frontend` / `senior-full-stack` | sonnet |
| Debug a failing test or runtime error | `senior-debugger` | sonnet; opus after escalation (§4) |
| Review a diff before PR | `feature-dev:code-reviewer` or `senior-code-reviewer` | sonnet |
| Architecture / counterfactual / security threat modeling | `senior-architect` / `senior-security` | **opus — never haiku/sonnet** |
| Multi-agent sprint coordination | `team-lead` | sonnet |
| Verify another agent's work (§5) | `general-purpose` (fresh context) | same tier as the implementer |
| NLP/annotation research questions | `nlp-research-advisor` | sonnet |

Model floor by blast radius (from CLAUDE.md, updated names): touches 0–1 files → Haiku 4.5 acceptable · 2–9 files → Sonnet 4.6 · ≥ 10 files or architecture/security/counterfactual → Opus 4.8. Borderline: bias up.

## §3 Dispatch Packet — three mandatory parts

Every subagent prompt MUST contain all three. A dispatch missing any part is invalid — rewrite it before sending.

1. **Goal + Context**: what to achieve, why, and the exact file paths / spec section / branch the agent needs. Never say "look around the repo"; give starting anchors (≥ 1 concrete path).
2. **Acceptance criteria**: objectively checkable conditions (commands that must exit 0, behaviors that must hold, things that must NOT change). Numbered list.
3. **Report format**: "Return: (a) status PASS/FAIL/BLOCKED, (b) file paths + line numbers of every change/finding, (c) verification command output (last 10 lines max), (d) ≤ 5 lines of summary. Do NOT paste code blocks longer than 5 lines."

Copy the fill-in versions from [03-templates.md](03-templates.md).

## §4 Escalation & De-escalation Ladder

Track attempts **per subtask** (same goal, same acceptance criteria). An "error" = tool/syntax failure, red verification, or report that fails read-back.

| Trigger | Action |
|---|---|
| Haiku agent errors **1×** | Re-dispatch the same packet to **Sonnet**. Do not retry Haiku. |
| Sonnet agent fails the same subtask **2×** | Dispatch to **Opus** with the FULL failure trail: both prior prompts, both reports, exact error output. Never send Opus a clean-slate prompt — it will repeat attempt #1. |
| Opus fails **2×** on the same subtask | STOP. Circuit-break to user per [02-judgment.md](02-judgment.md) §3. Total cap: **two rounds per approach**; a third identical retry is forbidden. |
| Opus solves it and the fix is a repeatable pattern (e.g. same edit across N files) | Extract the pattern into an explicit recipe, then **de-escalate**: batch-apply via Sonnet/Haiku with the recipe pasted into each packet. |
| Any agent reports BLOCKED (missing requirement, ambiguous spec) | Do not escalate models — escalate to **user** (a bigger model cannot invent missing requirements). |

**Relation to the CLAUDE.md "≥ 3 attempts" gate**: this ladder IS that gate's implementation. Three failures without a tier change is forbidden — by the third attempt on a subtask you must have either escalated one tier (with the failure trail) or surfaced to the user. Hard cap either way: two rounds at the highest justified tier, or five total dispatches on one subtask, whichever comes first → circuit-break to user. Separately: unrequested codegen > 300 LoC → halt.

## §5 Verification Isolation (non-negotiable)

**The agent that implemented a change never verifies it.** Self-reported success is unverified by definition.

Procedure after any implementation subagent returns:
1. Dispatch a **fresh-context** `general-purpose` verifier with: the acceptance criteria (verbatim from the original packet), the reported file paths, and instructions to (a) re-read the changed files, (b) actually run the verification commands (`uv run pytest -q`, `pnpm tsc --noEmit`, etc.), (c) check for scope creep (changes outside reported paths via `git diff --stat`).
2. Verifier verdict PASS → proceed. FAIL → return to implementer with the verifier's evidence (counts as one failure for §4).
3. Implementer and verifier disagree twice → dispatch a third agent as tiebreaker (multi-agent debate) OR surface to user. Never let the implementer overrule the verifier by assertion.

For subjective outputs (design, wording): 2–3 independent generators + 1 judge agent selecting/merging, instead of generate-then-self-polish.

## §6 Worked Example

> ⚠️ Hypothetical — the paths below are illustrative and do NOT exist in this repo. When writing a real packet, substitute paths you have verified with `ls` or a prior Explore report.

Bad dispatch (forbidden): `"Fix the failing annotation tests"`

Good dispatch (packet):
```
[Goal] Make `uv run pytest tests/annotation/ -q` pass. Context: PR #93 changed
`backend/app/schemas/annotation.py` (AnnotationCreate gained `evidence` field);
3 tests in `tests/annotation/test_create.py` now fail on schema validation.
Read those two files first. Constitution III applies: responses must not leak
ground-truth answers.
[Acceptance]
1. `cd backend && uv run pytest tests/annotation/ -q` exits 0.
2. `uv run mypy app/ --strict` exits 0.
3. No changes outside backend/app/schemas/ and backend/tests/annotation/.
4. Test assertions may only change if the OLD expectation contradicts spec
   specs/annotation/003-*/spec.md §FR-2 — cite the line if you do.
[Report] status / changed files with line numbers / last 10 lines of pytest
output / ≤ 5-line summary. No code blocks > 5 lines.
```
