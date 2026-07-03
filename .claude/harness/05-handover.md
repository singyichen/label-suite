# G. Handover Letter to Future Sessions

> From Claude Fable 5, 2026-07-03. This file is a frozen snapshot — later models may only append dated post-scripts at the end; never rewrite the body (see [04-evolution.md](04-evolution.md) §4).

## §1 Three things you didn't ask, but I consider most critical

### 1. This project's biggest risk is not code quality — it is the entropy of the governance documents themselves

This repo's engineering discipline (hooks, TDD, SDD, constitution) already exceeds most industry projects. What is actually corroding it is **the number of copies of each rule**. The same rule (e.g. "never commit to main") currently exists in at least 5 places: CLAUDE.md, AGENTS.md, the constitution, memory, and pre-tool-use.sh. Each revision touches only some of them, and divergence accumulates — the dual-constitution split (see [00-diagnosis.md](00-diagnosis.md) §1 pain point 2) grew exactly this way. **Before "adding one more rule", grep whether the rule already exists elsewhere; prefer adding a pointer over adding a copy.**

### 2. The thesis timeline is the real constraint

This is a master's thesis Demo Paper; the user is a backend engineer who must show a prototype to her professor. That means: (a) "demonstrable completeness" outranks "engineering perfection" — when a harness rule conflicts with the demo schedule, hand the tradeoff to the user rather than insisting on engineering purity on her behalf; (b) anything that touches the paper's selling points (config-driven generalization, fairness / no answer leakage) is a circuit-breaker event ([02-judgment.md](02-judgment.md) §3.6); (c) the `nlp-research-advisor` agent is an underused asset — dispatch it for annotation methodology questions (IAA, scoring metrics) instead of making a generic engineering agent improvise.

### 3. Hooks are your only defense that physically cannot fade — invest there first

Instruction documents (including this harness) are probabilistic for weaker models — they get forgotten as context grows. Hooks are deterministic: pre-tool-use.sh blocks pushes to main, pre-commit blocks giant commits, post-edit-lint feeds lint errors back instantly. **When you notice yourself repeatedly violating a written rule, the correct response is not to write the rule louder — it is to propose turning it into a hook** (T0 process, user approval required). Known hook gap: `git push origin HEAD` (while on main) bypasses the push-main block — the regex doesn't cover it.

## §2 How this system will most likely degrade under long-term weak-model operation, and how to prevent it

| Degradation mode | Concrete symptom | Prevention mechanism |
|---|---|---|
| **Ritualization (cargo cult)**: dispatch templates copied but filled with vacuous content ("[Goal] fix it") — formally compliant, substantively dead | The packet's Acceptance section contains only "tests pass"; the Report has no path:line | [01-dispatch.md](01-dispatch.md) §3 already defines "empty slot = invalid dispatch"; a verifier receiving a report without path:line should rule FAIL outright |
| **Rule inflation**: every pitfall adds a paragraph to the rules files; two months later the rules are harder to read than the code and get ignored wholesale | `.claude/rules/` total line count climbs back above ~600; lessons-learned.md exceeds 300 lines with no distillation | [04-evolution.md](04-evolution.md) §3's quantified compaction trigger; every new rule must pass the "verifiable by command" test ([04-evolution.md](04-evolution.md) §4) |
| **Silent collapse of verification isolation**: under time pressure the implementer says "I already ran the tests", the commander believes it and skips the fresh verifier | A report contains self-attested "tests pass" and the commander enters the PR flow without dispatching a verifier | [02-judgment.md](02-judgment.md) §2's final box: changes > 20 lines or > 1 file without an independent verifier = must NOT be marked done; that box and /speckit.analyze are double insurance |
| **Escalation-ladder amnesia**: after a Sonnet failure, a fresh Sonnet retries from zero (no failure trail attached) — equivalent to infinite retry | The 3rd dispatch for the same subtask has a prompt that doesn't quote the previous two error outputs | [01-dispatch.md](01-dispatch.md) §4 explicitly requires escalation to carry the full failure trail; hard circuit-break after the two-round cap |
| **Decay of the harness files themselves**: a path changes, nobody updates the routing table, a weaker model hits a 404 and permanently abandons the whole harness | Any link in the routing table is dead | After every T1 edit, extract all markdown links and `ls` each target (part of the T1 procedure in [04-evolution.md](04-evolution.md)) |

## §3 Unfinished this session / left for you

1. **The user-decision list** ([00-diagnosis.md](00-diagnosis.md) §4, 6 items) is unresolved — before starting a long task in a new session, ask the user whether to settle them, especially the dual-constitution consolidation.
2. Global plugin slim-down in `~/.claude/settings.json` not executed (recommendation list only).
3. Wording improvements for `memory-reminder.sh` (Stop-hook reminder every turn) and `session-init.sh`'s `.env` warning: proposed only, not implemented (T0, needs approval).
4. The 6 ghost skill directories and the `SKILLS.md` correction: untouched.
5. Nothing from this session is **committed** (working tree on main) — the user should review, branch, and commit; delete the `.bak` files once verified.

---

*(post-scripts below — append only, with date)*

- **2026-07-03**: this file and 00-diagnosis.md were originally written in Traditional Chinese and translated to English at the user's request (content unchanged). Chinese originals archived in the session scratchpad.
