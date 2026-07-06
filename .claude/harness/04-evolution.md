# F. Knowledge Iteration & Reflection Protocol

> How future (weaker) models may update this harness without corrupting it.

## §1 Edit-permission tiers

| Tier | Files | Who may change |
|------|-------|----------------|
| **T0 — frozen without user approval** | `specs/_governance/constitution.md` + domain constitutions · `.claude/hooks/*` · `scripts/git-hooks/*` · `.claude/settings.json` permissions/hooks blocks · Prohibitions section of CLAUDE.md | Model may **propose a diff** in chat; user must explicitly approve before any edit. Never self-approve. |
| **T1 — propose-then-apply** | `.claude/harness/00–05` (all harness files, incl. this one) · CLAUDE.md (non-Prohibitions) · `.claude/rules/*` · agent definitions in `.claude/agents/` | Model drafts the exact diff, states the triggering incident, asks the user in the same session, applies only after a yes. Back up to `<file>.bak` first. **Exception**: `00-diagnosis.md` §1–3 and the body of `05-handover.md` are frozen — even with approval, changes go in a dated post-script, never in-place (§4). After any T1 edit, extract every markdown link in the edited file and verify each target exists. |
| **T2 — self-serve (no approval)** | `.specify/memory/lessons-learned.md` (append) · `MEMORY.md` + memory files · `specs/STATUS.md` · `claude-progress.md` | Append/update freely, following formats below. |

Rationale: T2 files are additive logs — a bad entry wastes lines but can't redirect behavior. T1 files steer every future session — a bad edit compounds. T0 files are enforcement — a bad edit silently removes a safety net.

## §2 Lesson entry format (append to `.specify/memory/lessons-learned.md`)

> Note: the three entries already in that file predate this format (they use `### Lesson`/`### Incident Summary` subsections). Do NOT retrofit them and do NOT copy their structure — new entries use the format below. The `## YYYY-MM-DD: Title` header and `### Rule` subsection are common to both.

Write a lesson when: a verification failed for a non-obvious reason · a rule was misread · an approach was abandoned per [02-judgment.md](02-judgment.md) §1 · the user corrected the model's behavior. One incident = one entry:

```markdown
## YYYY-MM-DD: <imperative title, ≤ 60 chars>

### Trigger
<1–2 sentences: what happened, with path:line or command>

### Wrong move
<what the model did or almost did>

### Rule
<the corrected behavior, stated as a directly executable instruction —
"run X before Y", never "be more careful">

### Harness link
<which harness/rules file this reinforces or contradicts; "none" if new ground>
```

If the entry **contradicts** an existing T1 rule → do not edit the rule silently; add the entry, flag the conflict at the top of your next user-facing report (README Invariant 3).

## §3 Compaction trigger & procedure

When `lessons-learned.md` exceeds **300 lines or 15 entries** (check with `wc -l` when appending):

1. Propose (T1 process) a distillation: cluster entries, promote recurring patterns into ≤ 5-line rules in the matching harness/rules file, citing entry dates.
2. Move raw promoted entries to `.specify/memory/lessons-archive.md` (create if absent); keep un-promoted entries in place.
3. Never delete raw entries — archive them. The archive is grep-able history; the live file stays under the trigger threshold.

Same trigger for `MEMORY.md`: > 40 index lines → consolidate per the memory instructions.

## §4 Forbidden self-edits (any tier)

- Weakening a rule to make the current task pass (e.g. raising a threshold mid-task you are being blocked by). If a rule seems wrong, finish or abort the task under the old rule, THEN propose the change.
- Editing `00-diagnosis.md` §1–3 or `05-handover.md` — these are Fable 5's frozen snapshot; append a dated "post-script" section instead.
- Adding vague rules. Every new rule must pass this test: could a model verify compliance with a command or a yes/no file check? "Keep dispatches high-quality" fails; "every dispatch contains the 3 packet parts of 01-dispatch.md §3" passes.
- Deleting a `.bak` file created by another session without user confirmation.
