# Harness — Agent Operating System for Label Suite

> Written by Claude Fable 5 on 2026-07-03 as a one-time knowledge externalization.
> Audience: **weaker models** (Sonnet 4.6, Opus 4.8, Haiku 4.5) operating this repo long-term.
> These files are NOT auto-loaded into context. CLAUDE.md routes to them; load on demand.

## File Map (skeleton — each file's required structure is defined here)

| File | Deliverable | Language | Load when |
|------|-------------|----------|-----------|
| [00-diagnosis.md](00-diagnosis.md) | A. Harness leak diagnosis — top-3 token/focus/tool-misfire leaks + physical fixes + capability limits | EN | User asks "why was this changed" / auditing the harness |
| [01-dispatch.md](01-dispatch.md) | C. Model dispatch & escalation contract — commander rules, agent selection, escalation ladder, verification isolation | EN | **Before dispatching any subagent** |
| [02-judgment.md](02-judgment.md) | D. Judgment externalization matrix — wrong-direction signals, definition-of-done, circuit-breaker triggers; each with positive/negative examples | EN | Stuck ≥ 2 attempts, before claiming "done", or unsure whether to ask user |
| [03-templates.md](03-templates.md) | E. Standard delegation prompt templates — research / implement / refactor / review | EN | When writing a subagent prompt |
| [04-evolution.md](04-evolution.md) | F. Knowledge iteration protocol — which files models may self-edit, lesson format, compaction trigger | EN | After hitting a pitfall, or when updating any harness file |
| [05-handover.md](05-handover.md) | G. Handover letter — 3 unasked-but-critical facts, predicted decay modes + prevention, unfinished items | EN | Start of a new long-horizon session |

## Structure contracts (if a file above is missing or truncated, rebuild it to this outline)

- `00-diagnosis.md`: §1 top-3 pain points (each: symptom / evidence path / physical blocking fix) · §2 secondary findings · §3 capability limits & taste-decision handling · §4 items awaiting user decision
- `01-dispatch.md`: §1 Commander rules · §2 Agent/model selection table · §3 Dispatch packet (3 mandatory parts) · §4 Escalation ladder · §5 Verification isolation · §6 Worked example
- `02-judgment.md`: §1 Wrong-direction signals (≥6, each with ✅ positive / ❌ negative example) · §2 Definition of done (quantified) · §3 Circuit-breaker → ask user (enumerated) · §4 Taste-decision protocol
- `03-templates.md`: 4 fill-in templates, each: Context block / Goal / Acceptance criteria / Report format · 1 fully-filled example
- `04-evolution.md`: §1 Edit-permission tiers · §2 Lesson entry format (for appending to `.specify/memory/lessons-learned.md`) · §3 Compaction trigger & procedure · §4 Forbidden self-edits
- `05-handover.md`: §1 three critical facts · §2 degradation modes & prevention · §3 unfinished items

## Invariants

1. CLAUDE.md is a **router**: core loop + pointers only. Long content lives here or in `.claude/rules/`.
2. Everything in `.claude/rules/*.md` is auto-loaded into EVERY session — keep those files short; anything > ~80 lines belongs elsewhere with a pointer.
3. Conflict rule: if two documents disagree, **the executable artifact wins** (hook script > doc describing it; code > spec describing it). Report the conflict to the user; never silently pick.
