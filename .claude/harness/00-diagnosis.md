# A. Harness Leak Diagnosis

> Diagnosed 2026-07-03 by Claude Fable 5 (this project's one-time use of it).
> All evidence comes from actual file reads; paths are verifiable with `grep`. Items marked 【USER DECISION】 require the user to decide — models must not resolve them on their own.

## §1 Top-3 pain points and physical blocking fixes

### Pain point 1 — Every session starts with ~20k tokens of "always present, rarely used" content (biggest token leak)

**Symptom**: at session start, the context is already filled with the following, diluting the actual task instructions:

1. ALL 10 files in `.claude/rules/` (505 lines total) are **auto-loaded in full into every session** — observed evidence: the session-start project instructions contained `api.md`, `backend.md`, `frontend.md`, `testing-*.md`, and `issue-reporting.md` simultaneously, even when the current work had nothing to do with those directories. CLAUDE.md used to claim these were "path-scoped, loaded only when working in the respective directory" — **that claim did not match actual behavior** (path-scoping only works via the `@` imports in `frontend/CLAUDE.md` etc.; the `.claude/rules/` directory itself is globally auto-loaded). Single largest offender: `issue-reporting.md` at 258 lines, ~200 of which were 9 bash heredoc templates used maybe 10 times a year.
2. The global `~/.claude/settings.json` enables **60+ plugins** (including the entire trailofbits security-audit toolchain: fuzzing, smart-contract scanners, YARA, DWARF…), nearly all irrelevant to this project (a FastAPI + React thesis project). Every plugin injects skill/agent descriptions into the system prompt and explodes the tool-selection space for weaker models.
3. The `learning-output-style` output style is active — it instructs the model to "stop and ask the user to hand-write 5–10 lines of code", which **directly conflicts** with this project's autonomous Planner→Generator→Evaluator pipeline.
4. The superpowers plugin uses EXTREMELY_IMPORTANT phrasing to force "invoke a skill before ANY response"; stacked on the SDD hard-gate pipeline, weaker models can spin between "should I run speckit or superpowers:brainstorming?".

**Physical blocks**:
- ✅ (done this session) Slimmed `issue-reporting.md`: the 9 templates moved to `docs/templates/issue-templates.md`; the rules file keeps only the mapping table + protocol + pointer (the 26 agent files referencing `.claude/rules/issue-reporting.md` keep a valid path — no broken links).
- ✅ (done this session) CLAUDE.md rewritten as a routing hub (compare against `CLAUDE.md.bak`).
- 🔲 【USER DECISION】 Recommended global plugin disable list (edit `enabledPlugins` in `~/.claude/settings.json`; this session does not modify global files):
  - Recommend disabling (irrelevant to this project): all `@trailofbits` (zeroize-audit and fp-check already off), `agent-sdk-dev`, `firebase`, `supabase`, `sentry`, `figma` (if wireframes go exclusively through Pencil), `ralph-loop`.
  - Recommend keeping: `code-review`, `pr-review-toolkit`, `feature-dev`, `context7`, `playwright`, `typescript-lsp`, `commit-commands`, `claude-md-management`, `skill-creator`.
  - Observe then decide: `superpowers` (if kept, weaker models must follow CLAUDE.md's precedence: SDD pipeline > superpowers skill triggers).
- 🔲 【USER DECISION】 Disable `learning-output-style` during autonomous sprints (switch back to the default output style).

### Pain point 2 — Rule contradictions and ghost information (most likely to derail or freeze weaker models)

When a weaker model meets two contradictory documents, it picks one at random or oscillates. Contradictions observed in this audit:

| # | Contradiction | Evidence | Disposition |
|---|------|------|------|
| 1 | **Diverged dual constitutions**: CLAUDE.md points to `specs/_governance/constitution.md` (352 lines); AGENTS.md points to `.specify/memory/constitution.md` (365 lines); `diff` confirms the two files differ | `diff <(...)` tested DIFFERENT | 【USER DECISION】 Pick the canonical copy, then delete or symlink the other. This harness provisionally treats `specs/_governance/` as canonical (what CLAUDE.md points to) |
| 2 | **pre-commit line threshold**: the hook actually uses `MAX_LINES=600` (`scripts/git-hooks/pre-commit:26`), but the same file's comment AND CLAUDE.md both said 300 | `grep -n MAX_LINES scripts/git-hooks/pre-commit` | 【USER DECISION】 Per the "executable artifact wins" rule, the live value is 600; the rewritten docs now say "the hook is authoritative" |
| 3 | **Stale model name**: old CLAUDE.md said Opus 4.7; current is Opus 4.8 | old CLAUDE.md | ✅ Fixed in the rewrite |
| 4 | **Non-executable instructions**: old CLAUDE.md told the model to "run `/compact` / `/clear`" — those are user commands a model cannot invoke; weaker models try, then get confused | old CLAUDE.md, Context management section | ✅ Rewrite replaced them with model-executable behaviors (write the progress file, report concisely) |
| 5 | **Ghost skills**: 6 directories in `.claude/skills/` (code-quality, quality-assurance, requirements-engineering, spec-driven-development, system-design, test-engineering) **lack SKILL.md and were never registered**; yet `SKILLS.md` claims 30 skills exist | `ls .claude/skills/*/SKILL.md` tested | 【USER DECISION】 Add SKILL.md files or delete the directories; SKILLS.md needs matching correction |
| 6 | AGENTS.md (218 lines) heavily duplicates CLAUDE.md (prohibitions, commit convention, TDD), and only AGENTS.md mentions the domain constitutions | file comparison | 【USER DECISION】 Long-term, converge to a single source. AGENTS.md untouched this session (Codex also reads it; changing it exceeds this session's mandate) |

**Physical block**: a new iron rule (written into harness README §Invariants and CLAUDE.md): **when two documents disagree, the executable artifact (hook/code) wins, report the conflict to the user immediately, and never silently pick a side**.

### Pain point 3 — 26 senior-* agents + plugin agents coexist with NO dispatch contract (most frequent cause of tool-call errors)

**Symptom**:
- `.claude/agents/` holds 26 specialized senior-* agents while plugins add overlapping roles (Explore, feature-dev:*, pr-review-toolkit:*), and **no document tells the main model whom to dispatch, how, or what to do on failure**.
- Most senior agents have Edit+Write+Bash simultaneously → an implementer can self-verify, violating isolation; no escalation path → weaker models retry the same error indefinitely (the "same problem failed ≥ 3 attempts" rule existed but had no operational steps).
- The main model (commander) does bulk file reading and repo scanning itself, burning the context needed for decisions.

**Physical blocks** (all landed this session):
- `01-dispatch.md`: commander stays off the field; agent selection table (26 agents converged to 8 common entry points); 3-part dispatch packet; escalation ladder (Haiku fails 1× → Sonnet; Sonnet fails the same subtask 2× → Opus with the full failure trail; once a pattern is solved, de-escalate for batch application; max two rounds per approach); fresh-context verification isolation.
- `03-templates.md`: fill-in templates for four task shapes, eliminating one-line dispatches.
- CLAUDE.md routing mandate: "read 01-dispatch.md before dispatching".

## §2 Secondary findings (non-blocking, recorded for reference)

- `session-init.sh` exits 1 with a warning when `.env` is missing — correct behavior, but the message never tells the model "you may continue with non-backend tasks", so a weaker model may stall.
- `memory-reminder.sh` (Stop hook) injects "remember to update memory" at the end of EVERY turn — high frequency, low value; trains the model to ignore systemMessages. Suggest making it conditional (e.g. only after commit/PR events).
- `settings.local.json` allows `Bash(git push *)` — "no push to main" then relies on the pre-tool-use.sh regex, and `git push[^|&]*(\s|^|:)(main|master)(\s|$)` does NOT catch `git push origin HEAD` (when the current branch is main). Known residual risk.
- `.claude/templates/` contains claude-progress.md and feature_list.json templates, but the old CLAUDE.md never named the path, so weaker models didn't know to use them. Fixed in the rewritten routing table.
- `docs/adr/` holds 30 ADRs — a high-quality decision record; the harness now requires "check ADR precedents before architecture changes" (01-dispatch).

## §3 Capability limits and taste decisions (honesty clause)

**What this harness can approach but never reach**: decomposition + isolated verification lets weaker models approach top-tier quality on tasks WITH objective criteria (tests pass, types check, spec consistency). But on the following three task classes, weaker models fail **structurally** — no amount of checklists compensates:

1. **Ambiguous visual/brand aesthetics** ("does this spacing look right", "does this palette feel premium").
2. **Cross-module architectural taste** ("will we regret this abstraction" — counterfactual reasoning).
3. **Academic-contribution judgment** (which selling points the Demo Paper should trade off).

**Concrete handling standard when hit** (weaker models follow this verbatim, no improvisation):
- Aesthetics: only select from the existing design tokens / UI kit in the `label-suite-design` skill; if tokens don't cover it, produce **2–3 candidates (with screenshots) for the user to pick** — inventing new styles is forbidden.
- Architectural taste: trigger the `01-dispatch.md` escalation rule → Opus + check `docs/adr/` precedents; if no precedent exists, write an ADR draft for the user to decide — **implementing directly is forbidden**.
- Academic judgment: always ask the user (see the circuit-breaker list in `02-judgment.md` §3).

## §4 Items awaiting user decision (summary)

1. Pick and consolidate the canonical constitution.
2. Adopt (or not) the global plugin disable list (§1 pain point 1).
3. pre-commit threshold: 600 (currently live) or 300 (documented intent).
4. The 6 ghost skill directories: register or delete.
5. Disable learning output style during autonomous sprints?
6. Long-term convergence plan for the AGENTS.md / CODEX.md / CLAUDE.md triple entry point.

---

## Post-scripts (append-only; body above is frozen)

- **2026-07-03 (same-day correction)**: the "all 10 files in `.claude/rules/` (505 lines total)" figure in §1 pain point 1 is the **pre**-refactor baseline. After this session's slim-down: 9 live rules files (excluding the temporary `.bak`) totaling ~292 lines.
- **2026-07-03**: this file and 05-handover.md were originally written in Traditional Chinese and translated to English at the user's request (content unchanged). Chinese originals archived in the session scratchpad.
