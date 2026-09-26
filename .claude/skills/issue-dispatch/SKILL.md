---
name: issue-dispatch
description: Scan GitHub issues labeled agent-ready, schedule the non-conflicting ones into waves, and drive each issue from dispatch through independent review to merge using parallel subagents in isolated worktrees. Use when asked to dispatch issues, work the agent-ready queue, run a wave, pick up labelled issues, or resume an in-flight dispatch given only an issue number.
---

# Issue Dispatch

GitHub issues are the only state store for this workflow. Never record progress in `claude-progress.md`, a memory file, or the scratchpad: parallel sessions overwrite those, and another machine cannot read them. Any session, on any machine, resumes work by reading an issue's last checkpoint comment.

The maintainer decides what is actionable by applying the `agent-ready` label. Everything from dispatch to merge is automated. The only stop for a maintainer decision is a MAJOR spec change.

## Authority

Follow the authority order in `.claude/skills/sdd-workflow/SKILL.md`: main constitution → applicable domain constitution → Accepted ADR → canonical feature spec → `docs/sdd-workflow.md` → machine guidance. This skill is machine guidance and never overrides any of them. Where it departs from `.claude/commands/pr-flow.md`, the departure is listed in **Deviations from pr-flow** below; anything not listed there follows `pr-flow` as written.

## What this skill never does

- Apply `agent-ready` itself. Whether an issue is actionable is the maintainer's judgment alone.
- Handle Critical or High severity security findings. Those follow the private path in `.claude/rules/issue-reporting.md` — no public issue, no exploit detail in a comment.
- Act as a CI gate. This is a human-triggered orchestration flow, not a verification suite. If a future revision adds a script under `scripts/`, declare it in `scripts/ci-jobs.tsv` as `none` with a reason.
- Commit or push to `main`.

## Roles and topology

```
main session  (sole arbiter, sole merger, sole label editor)
|  scan → collision check → classify → conflict graph → waves (max 3 parallel)
|  dispatch N leads → collect N agentIds → send each lead the wave roster
|
+- per-issue lead  (general-purpose, Sonnet, own worktree, own PW_PORT)
|    +- senior-qa               Red: write the test, commit it, run the expected failure
|    +- senior-frontend | senior-backend | senior-debugger   Green: implement only
|    +- senior-code-reviewer    independent review (did not write the code)
|    The lead plays CLAUDE.md's "main agent/team lead" role for its own issue:
|    verifies Red and Green evidence, is the only role that ticks tasks.md,
|    posts checkpoint comments, opens the PR.
|
+- per-issue lead  (next issue, next port)
```

The per-issue lead **must** be `general-purpose`. Every agent under `.claude/agents/` — `team-lead` and `senior-qa` included — omits `Agent` and `SendMessage` from its `tools:` list, so a specialist can neither delegate nor communicate. Specialists are leaves by construction, which caps nesting depth at two levels.

Budget rule: a lead runs at most one nested specialist at a time. Red completes before Green is dispatched.

**Nested-specialist stall.** If a dispatched specialist goes unresponsive with no checkpoint for a normal working session, the lead may take over and produce the deliverable itself, but must independently verify the evidence — read the actual command output, not a self-report — and must declare the deviation explicitly in the PR body. This is what #931's stalled `senior-qa` (~25 minutes, no report) required in practice, and it is a deviation from CLAUDE.md's TDD ownership rule, not a substitute for it. If the specialist leaves a diagnostic probe patch uncommitted in the worktree, the lead must revert it before trusting the worktree's state: #921's `senior-qa` left a full Green implementation uncommitted after probing, and rerunning Red against that dirty tree produced a false `3 passed`.

**The main session reads every lead's diff before that lead opens its PR.** This is a role-level rule, not a Step 6 suggestion: both real defects found in the first run — #932's blank-avatar regression and #934's hardcoded `<h1>標記作業` — were caught only at this layer, never by a lead's review of its own work.

Every nested agent's prompt must state the worktree's absolute path and require the agent to enter it first. Do not assume a nested agent inherits the lead's working directory.

Model selection follows CLAUDE.md: the lead defaults to Sonnet; escalate to Opus for architecture, counter-factual, or security threat modeling work.

## Peer communication

Leads may talk to each other directly. The rules below are not style preferences — each follows from what the harness actually permits.

| Rule | Why |
|---|---|
| The main session distributes the roster (`#N → agentId`) after all leads are dispatched | A subagent has no `ListAgents` and cannot discover peers; addressing a peer by name fails. The raw `agentId` from a spawn result is the only working address, and it does not exist until that agent is spawned |
| One-shot notification only. An agent must never send a message and then wait for the reply | A waiting on B while B waits on A deadlocks the wave |
| Never use a message as a lock to coordinate a shared file. Escalate a discovered file conflict to the main session, which arbitrates | Issues in one wave are scheduled to be non-conflicting, so needing to coordinate means the conflict graph was wrong. That is a scheduling bug to report, not something to negotiate around |
| The main session judges progress **only** from `gh issue view <N> --comments`, never from task notifications | When one agent resumes a peer, the resumed agent's completion notification goes to the peer that sent the message, not to the main session. Notification routing is therefore unreliable; issue comments are not |
| Evidence is always written into the issue's checkpoint comment, not only returned through `SubagentHandback` or a peer message. A failed handback delivery needs no redispatch | Several `SubagentHandback` reports never reached their caller in #921; the checkpoint comment was the only surviving copy of that evidence, and redispatching would only repeat finished work |
| A late or duplicate nested-agent report — one that arrives after its issue already merged — is superseded by that issue's checkpoint comment; never act on it again | #921 received review reports for issues #942 and others after they had already merged |

## Re-entry safety

`/goal` and `/loop` both re-enter this flow, and so does a fresh session handed nothing but an issue number. Three mechanisms make re-entry safe: the collision check (step 2), the `agent-running` label, and the checkpoint comments. On re-entry, read the issue's last checkpoint comment and continue from there. Never restart an issue that already has a checkpoint comment without first reconciling its branch, worktree, and PR.

## Permission pre-flight

Before dispatching the first wave, confirm `.claude/settings.json` allows every `gh` mutation this flow issues unattended — at minimum `gh issue edit` (labels), `gh issue comment`, `gh pr create`, `gh pr merge`, and `gh api -X DELETE` (branch cleanup). A missing allow rule stalls the whole flow at the first blocked call with nobody watching: the first real run stopped dead on `gh issue edit --add-label` in step 5. Run `/fewer-permission-prompts` once per machine, or add the rule directly.

## Step 1 — Scan

```bash
gh issue list --label agent-ready --state open --limit 50 \
  --json number,title,labels \
  --jq '.[] | select((.labels | map(.name)) as $l
        | ($l | index("blocked") | not)
        and ($l | index("agent-running") | not))
        | "\(.number)\t\(.title)"'
```

An issue without `agent-ready` is never claimed, even when nothing blocks it.

Then, for every candidate, read the **entire comment thread** before deciding anything:

```bash
gh issue view <N> --comments
```

The body alone is not the requirement. Adjudications are routinely written in later comments — #920 and #921 both settled their real scope that way. An issue whose body and latest comment disagree is classified as needing adjudication, not guessed at.

## Step 2 — Collision check

Keyed on the issue number. Any hit means someone is already on it: skip the issue and say so in the wave report.

```bash
N=<number>
git worktree list | grep -E "(^|[^0-9])${N}([^0-9]|$)"
git branch -a | grep -E "(^|[^0-9])${N}([^0-9]|$)"
git log --all --grep="#${N}" --oneline | head
gh pr list --state all --search "${N}" --json number,title,state,headRefName
```

Match the bare issue number, not a `issue-<N>-` prefix. Worktrees in this repository carry at least three naming shapes — `.worktrees/feat-620-guideline-anchors`, `../wt-issue-576-diagrams`, `/private/tmp/wt-657-test` — and a prefix match finds none of them, so #620 would wrongly read as uncontested.

An existing `agent-running` label or an existing checkpoint comment also counts as a collision. That is a re-entry case and follows **Re-entry safety**, not a fresh dispatch.

## Step 3 — Classify

| Path | Condition | Handling |
|---|---|---|
| Lightweight | All true: ≤ 2 production files (spec and test files excluded) · no API contract change · minor behavior change needing a spec update · no FR/AC added or removed, only clarified | Fully automated |
| OpenSpec change | Anything else that changes specified behavior | Fully automated through archive, subject to the MAJOR stop |
| Needs adjudication | Requirement unclear or missing · body and comments disagree · two valid readings leading to materially different work · Critical or High security finding | Post a checkpoint comment naming exactly what is undecided, add `blocked`, return it to the maintainer. Nothing was dispatched yet, so there is no `agent-running` label to remove at this stage |

When any Lightweight condition is uncertain, default to the full OpenSpec flow.

## Step 4 — Schedule

Estimate, for each issue, the production files and the canonical spec it will touch. Two issues conflict when they share any of:

- a canonical spec path (`specs/<module>/NNN-feature/spec.md`) — **the main bottleneck**, because both would bump the version and append to the same Changelog
- a production source file, or a prototype page under `design/prototype/pages/`
- an OpenSpec change folder under `openspec/changes/`

`specs/STATUS.md` and `design/system/screen-inventory.md` are touched by almost every issue (any spec version bump; any `design/prototype/pages/**` change) and must not, by themselves, split issues into different waves — flagging them as ordinary conflicts would leave almost no two issues able to share a wave. Handle them by protocol instead: `STATUS.md` edits are append-only, each PR adding only its own row and never touching a peer's; `screen-inventory.md` is always regenerated fresh immediately before merge, never hand-merged; and PRs touching either file merge in ascending issue-number order. This is what #940 needed after #934 merged first and left it `CONFLICTING` with no CI run at all.

Conflicting issues (all other shared-file cases above) go into different waves. When a touched set cannot be determined confidently, treat the pair as conflicting: the conservative direction costs one extra wave, the optimistic direction costs a merge conflict mid-wave.

Wave size is the largest independent set the conflict graph allows, capped at **3** (lowered from 5 on 2026-09-26 — memory and conflict-resolution surface; observed free memory ~750–1000 MB).

A second cap applies on top: **at most two issues per wave may run a full `pnpm playwright test` locally.** This counts local full runs specifically — step 6 now scopes ordinary local verification to the touched spec(s), so a local full run is the exception, not the default, and this cap is what stops it from recreating the flakiness that motivated that scoping. The rest wait for a later wave. See the guardrail below for why the cap cannot be a runtime lock, and for what a mid-flight wave override must also recompute.

Before dispatching, also manually confirm the machine has enough free memory for the wave's planned Playwright scale — a judgment call, not an automated gate. #921's full local run was aborted twice by the harness on roughly 295 MB free, with other sessions' load already accounted for.

Record the conflict graph, the Playwright count, and the resulting waves in the wave report before dispatching anything.

### Controlled exception — function-region granularity (2026-09-26)

The maintainer relaxed the file- and spec-level rules above after wave 2 (2026-09-26) found the single 6,200+ line `annotation-workspace.config.js` touched by all 7 queued issues, collapsing them to one wave. This narrows those rules; it does not replace them.

- **Function-region granularity**: two issues sharing one production file may share a wave if their edited regions do not overlap, located with `grep -n` against the current worktree at scheduling time — never an issue body's quoted line numbers, which drift stale (#925's `:3083-3084`/`:3565-3585` already pointed at unrelated code by the time it was checked). Evidence: four `git merge origin/main` runs on the config file auto-merged with zero conflicts, at region distances of ~1500–2500 lines.
- **Shared canonical spec, controlled**: several issues bumping the same canonical spec may still share a wave; the main session assigns each PR's real version number at merge time in issue-number order — `git merge origin/main`, renumber the Changelog entry and version, sync `specs/STATUS.md`, re-run `scripts/check-sdd.sh`, then push. Wave 2's own data showed 5 of 7 queued issues bumping one spec: the canonical spec, not the hotspot file, is the real bottleneck. `Changelog`/`specs/STATUS.md` conflicts here are near-guaranteed and resolved by hand; paste a `grep` check confirming the version number, the Changelog entry, and the STATUS.md row all agree before push.
- **FR/AC ID allocation**: issues in one wave that each add FR/AC IDs independently number from `main`'s current max and collide with no conflict marker and no gate catching it — `check-sdd.sh`'s duplicate check only covers required headings, and `openspec validate` only checks schema. The main session pre-assigns ID ranges per issue at scheduling time, or assigns a range at merge time and requires the later-merging issue to renumber, then `grep -rn` the repo for the old IDs to confirm zero remaining hits.
- **Standard conflict resolution**: regenerate `design/system/screen-inventory.md` fresh after merging — never hand-pick a side, whose hash won't match the merged content until the next CI `--check` catches it. Canonical Changelog conflicts keep both sides' entries, newest on top. Subsequent branches merge `origin/main`, never rebase — rebase needs a force push, which the pre-tool-use hook requires the maintainer to confirm, stalling an unattended wave (#924).

## Step 5 — Dispatch

One issue, one worktree, one lead, one port.

```bash
N=931
SLUG=sidebar-role-highlight          # short, lowercase, hyphenated
BRANCH=fix/${N}-${SLUG}              # type prefix per .claude/rules/git-workflow.md
WT=.claude/worktrees/issue-${N}-${SLUG}
PORT=8980                            # 8980, 8981, ... one per worktree in the wave

lsof -i:${PORT}                      # must print nothing before the port is handed out
git fetch origin main
git worktree add -b "${BRANCH}" "${WT}" origin/main
gh issue edit ${N} --add-label agent-running
```

Worktrees live under `.claude/worktrees/` — not `.worktrees/`, and not a sibling directory. The reason is specific: entering a worktree **from the launch directory** works for any path in `git worktree list`, but an agent whose working directory was pinned at launch (subagent isolation) can only `EnterWorktree` into a path under `.claude/worktrees/` of the same repository. Leads and their nested specialists are exactly that case. This comes from the `EnterWorktree` contract, not from an experiment here. `scripts/worktree-init.sh` creates `../label-suite-<slug>` instead; that is the older convention and is not used here.

`agent-ready` **stays on the issue**. It is the maintainer's standing authorization — including the archive authorization below — not a queue token. `agent-running` is added alongside it, and step 1 excludes `agent-running`, so an in-flight issue is never claimed twice. This deliberately refines #937's step 5 wording, which said the label is *changed* to `agent-running`: removing `agent-ready` would also remove the archive authorization that the same label carries.

The lead re-runs `lsof -i:${PORT}` before its first Playwright run: another session's server can appear between dispatch and first use, and 8888 and 8899 are both known to be taken by long-running local servers.

Post the opening checkpoint comment (branch, worktree, `PW_PORT`, lead model) before the lead starts work.

Dispatch every lead of the wave **in one message** so they run concurrently. Each lead's prompt states: the issue number, the worktree absolute path, the branch, its `PW_PORT`, the classification from step 3, and the applicable verification commands from step 6. Once all spawn results are back, send each lead the wave roster in one `SendMessage` per lead.

Each lead must follow SDD as written in CLAUDE.md:

1. `senior-qa` writes the Red test, commits it, and runs it to produce the expected failure. The lead records the failure reason. Before trusting that evidence, the lead runs `git status --short` to confirm the worktree is clean and pastes that output into the checkpoint comment — a dirty worktree from an unreverted probe patch is what produced #921's false `3 passed`.
2. Only then is the Green specialist dispatched. It must not weaken or rewrite the Red contract to make it pass.
3. The lead verifies the committed Red evidence and the Green exit-0 evidence, and is the only role that ticks `tasks.md` checkboxes.

## Per-path execution

### Lightweight path

TDD → implement → spec consistency review (spec version bumped, Changelog entry added, no downstream spec affected, no API contract changed) → step 6. No OpenSpec change folder.

### OpenSpec path

`agent-ready` authorizes the archive and the canonical write-back, so no extra confirmation is needed. The MAJOR stop below still applies. Every OpenSpec artifact is written in Traditional Chinese; only technical terms and structural keywords stay English, and `proposal.md`'s `## Why` / `## What Changes` headings stay exactly that — `openspec archive` matches them literally.

1. `/opsx:propose` — the spec delta against stable FR/AC IDs, `tasks.md`, and `design.md` when an API contract or DB schema changes. For an already-merged feature, carry the change in a change folder whose `proposal.md` names the canonical spec; never start a new spec from scratch.
2. **Gate 1** — `openspec validate --changes --no-interactive`. Non-strict schema only: it checks nothing about project headings, ownership, status, or retired paths.
3. **Gate 2** — Project SDD lint: `scripts/check-sdd.sh` plus the canonical workflow checklist for what the tooling does not cover.
4. `/opsx:apply` — implement under step 5's Red/Green ownership. If apply narrows scope (an AC or FR deferred to a separate issue), narrow the spec delta to match before archive — otherwise archive writes an unimplemented AC into the canonical spec with no gate catching it, as would have happened when #921 deferred left-column filtering to #956.
5. **Gate 3** — the code and test gates in step 6.
6. **Gate 4** — Source-Verify pre-scan, then `/opsx:archive`: dual-write into the derived `openspec/specs/` view **and** write back to `specs/<module>/NNN-feature/spec.md` with a version bump and a Changelog entry. Archive belongs to the final PR group only; an intermediate stacked group merges with the change still open.
7. **After the final PR merges** — the main session updates `specs/STATUS.md` to archived and runs `mv specs/<module>/NNN-feature specs/_archive/`. This happens on `main` after merge, never inside the worktree and never before merge.

Update `specs/STATUS.md` at every stage transition, per its own trigger list.

## Step 6 — Verification and independent review

**CLAUDE.md's Verification Commands section is the authority and is not restated here.** Locally, a lead runs only what its change touches — the affected spec(s)/package(s) plus `pnpm tsc --noEmit` and `mypy` — never the full local suite (the two Playwright exceptions a few lines below aside); CI runs the complete matrix unattended. A full local run measured ~16–17 minutes and blocks the lead for all of it, against CI's ~20–24 minutes in a clean, non-blocking environment; running several full local suites at once in one wave also produced two false failures that were both green on an isolated re-run.

**Regression measurement**, when a change might affect tests outside the touched spec: derive the candidate set with `grep -rl` over test file contents for what the change touches (a shared config, a shared component) — never guess it from a test's directory; guessing by directory in #921 missed 20 specs across three other directories that opened the same page. Compare against a `main` baseline, but only for the branch's failing subset of that candidate set — the diff is always a subset of the branch's failures, so a baseline rerun of the tests that already pass on the branch adds nothing.

Only the prototype group is conditional there (`when design/prototype/** changed`). Two dispatch-specific additions apply:

- the prototype group runs on this worktree's own port: `cd design/prototype && pnpm typecheck && PW_PORT=<port> pnpm playwright test`
- when frontend code changed, `pr-flow` step 3 also requires `cd frontend && pnpm playwright test`

Paste each command and its result into the PR Test Plan. A red gate is never skipped or worked around. Fix it, then re-run.

**Independent review, no self-assessment — dispatched in parallel with the gates above, not after them.** The lead starts a fresh `senior-code-reviewer` that did not write the code (or hands the diff to `codex:rescue`) at the same time it starts running the gates, so neither sits idle waiting on the other. The implementing agent never reviews its own work, and the lead never substitutes its own reading for the review. Record the verdict in the checkpoint comment.

Then open the PR. Write the body to a file first and pass `--body-file`: a long `--body` heredoc is rejected as a compound command in some permission modes.

```bash
gh pr create --title "<type>: <中文描述>" --base main --head "${BRANCH}" \
  --label "<type-label>" --body-file "<scratchpad>/pr-${N}.md"
```

The body follows `pr-flow` step 5b — Traditional Chinese, `##` headings in English — and **must contain `Closes #N`**. Every Test Plan item is individually verified: `[x]` with the command and its result for a pass, `[ ]` with the reason for a fail. Commit messages stay English-only.

## Step 7 — Merge

Wait for CI without a foreground `sleep`, which the harness blocks. Either run the watch as a background command, which re-invokes the session when it exits:

```bash
gh pr checks <pr> --watch --fail-fast
```

or arm a `Monitor` whose filter covers **every** terminal state (`pass|fail|cancel|skipping|timed out`), not just success — a filter that matches only the success marker stays silent through a crash, and silence looks exactly like "still running".

Merge only when the independent review passed and all four hold, checked with `gh pr view <pr> --json mergeable,mergeStateStatus,statusCheckRollup`:

- `mergeable == "MERGEABLE"`
- `mergeStateStatus == "CLEAN"`
- the check count is greater than 0
- every check passed

`gh pr checks --watch` exiting 0 is not sufficient alone — it also exits 0 when the PR has zero checks, which is exactly what a `CONFLICTING` PR looks like; that gap is what nearly merged #940.

```bash
gh pr merge <pr> --merge
```

Merge is the main session's job alone. Applying `agent-ready` is the maintainer's advance authorization for it (see **Deviations from pr-flow**).

On a red gate: fix and push, at most **twice**. If it is still red, hand the failure to `codex:rescue` for one diagnosis pass — CLAUDE.md escalates at three failed attempts on the same problem. If that does not resolve it, post a checkpoint comment containing the **exact** error output, swap `agent-running` for `blocked`, and send a `PushNotification`.

## Step 8 — Checkpoint comments

Post one at every stage transition: dispatch · Red confirmed · Green confirmed · gates passed · review verdict · PR opened · merged · blocked.

```markdown
<!-- issue-dispatch checkpoint -->
### 🤖 issue-dispatch 檢查點 — <階段>

- **已完成**：…
- **已驗證**：<指令 + 結果>
- **剩餘**：…
- **分支 · worktree · PW_PORT**：`fix/931-…` · `.claude/worktrees/issue-931-…` · 8980
- **PR**：#…（或「未開」）
```

The leading HTML comment is the grep anchor for finding the latest checkpoint. The body is Traditional Chinese per CLAUDE.md's Communication section; identifiers, paths, commands, and verbatim error output stay in English.

The last checkpoint comment is the resume contract: a session given only an issue number must be able to continue from it without any local file.

## Step 9 — Sweep

Reconcile issues against PRs before cleaning anything up. A merged PR whose body lost its `Closes` line leaves the issue open: #906's timeline shows a manual close with no closing-PR reference, while PRs #912, #917 and #918 only cross-referenced it.

```bash
gh issue list --state all --limit 100 --json number,state,title
gh pr list --state merged --limit 20 --json number,title,body,closingIssuesReferences
```

Close any issue whose PR merged but which stayed open, naming the PR in the closing comment. Then clean up:

```bash
git worktree remove "${WT}"
git branch -d "${BRANCH}"
gh api -X DELETE "repos/{owner}/{repo}/git/refs/heads/${BRANCH}"
```

Delete the remote branch through the API, not `git push origin --delete`: the pre-tool-use hook blocks any push while the session sits on `main`. The block is visible — the hook prints `❌ Blocked: current branch is 'main' …` and exits 2 — so treat a failed delete as the hook refusing it, not as a silent no-op. (`pr-flow` step 8 describes the same block as a silent failure; that wording is inaccurate but the API route it prescribes is right.)

## Step 10 — Continuous polling

After a wave completes, scan again from step 1.

Stop and report a summary when any of these holds:

1. no `agent-ready` issue remains
2. every remaining candidate is `blocked`
3. every issue in the wave just finished failed

At the end of each wave, output an explicit evaluation of all three conditions — each one stated as holding or not holding, with the evidence. A bare progress summary is not enough: `/goal` evaluates its condition against this block, and a fresh session reads it to decide whether to continue.

## Guardrails

- **`agent-ready` is archive authorization.** Applying the label authorizes `openspec archive` and the canonical write-back for that issue. No separate confirmation is needed.
- **MAJOR stops, MINOR and PATCH do not.** MAJOR means removing or overturning an existing FR or AC. On MAJOR: stop before archive, post a checkpoint comment explaining what would be overturned, swap `agent-running` for `blocked`, send a `PushNotification`, and wait for the maintainer.
- **Source-Verify pre-scan before archive.** Every citation in the delta must be locatable by `grep` — FR/AC IDs, section references, file paths, ADR/issue/PR numbers, and paraphrased requirement clauses. `openspec archive` copies propose-time delta text verbatim, so a wrong citation survives into the derived view and no CLI check catches it. Follow `docs/sdd-workflow.md` §6.2, which records the pilot finding: a derived view cited a `plan.md §Phase 1.3` that did not exist and silently dropped an SC clause, and only human review caught either (issue #356 pilot finding ③).
- **Playwright throttle is a scheduling constraint, not a runtime lock.** Concurrent Chromium instances on one machine make runs flaky, so a wave carries at most two issues needing a full local suite (step 4). It cannot be a lock: leads are separate agents with no shared counter, and peer messages must never be used as locks. The main session enforces the cap when it builds the wave, which needs no coordination at run time. A mid-flight override that reshuffles wave membership must recompute both this count and the conflict graph for the new membership, not just PR merge order — reordering by merge order alone once put three full local suites in one wave, over the cap.
- **Never commit or push to `main`.** Commit messages are English-only; PR titles and bodies are Traditional Chinese.
- **Push from inside the worktree.** Use `EnterWorktree`, or prefix with `cd <worktree> && `. The hook resolves the branch from `-C`, then `cd`, then the payload's `cwd` — and a subagent's `cwd` is pinned to the repository root, so an unprefixed push is read as a push from `main` and blocked (`.claude/hooks/pre-tool-use.sh`).
- **One purpose per PR.** Size limits and the single-purpose rule in `.claude/rules/git-workflow.md` apply to every dispatched PR. An issue that cannot be delivered in one purpose is split into stacked PRs, not widened.
- **The main session never `cd`s into a lead's worktree.** Use `git -C <worktree> <command>` to inspect or act on it instead — `cd` there risks pinning the session inside that worktree for the rest of its run.

## Pairing with /goal and /loop

This skill runs standalone: nothing about it depends on either command. Binding the flow to a harness feature would break the requirement that any session on any machine can resume from an issue number.

- **`/goal`** is the right companion for step 10, because the stop condition is a condition, not an interval. `/goal 直到沒有 agent-ready issue、或剩下的全是 blocked、或整波失敗才停` keeps the session from stopping after one wave. Step 10's explicit evaluation block is what the goal check-in reads.
- **`/loop` without an interval** is for standing watch, when the maintainer labels issues over the course of a day. Never give it a fixed interval: a wave can outlast the interval, the next firing overlaps the running one, and the result is the double dispatch this skill exists to prevent. Self-paced re-entry is safe because of **Re-entry safety**.

## Tooling

| Tool | Use |
|---|---|
| `Bash` with `run_in_background` | Waiting on CI and running full Playwright suites. Foreground `sleep` is blocked; a background command re-invokes the session when it exits |
| `Monitor` (persistent) | Per-check CI results. The filter must cover failure signatures too |
| `SendMessage` | Roster distribution, peer notification, and returning review findings to the same implementing agent with its context intact |
| `senior-code-reviewer` / `codex:rescue` | Independent review, and the escalation before an issue is marked `blocked` |
| `PushNotification` | Only for events needing the maintainer: MAJOR stop, `blocked`, whole-wave failure |
| `/fewer-permission-prompts` | One-time pre-flight. An unattended five-way dispatch otherwise stalls on permission prompts |

Not used: `/schedule` (a cloud routine cannot run the local verification gates), the `Workflow` tool (leads are dispatched with the `Agent` tool), a published dashboard (issue comments are the only state store), and `/code-review ultra` (user-triggered and billed; an agent cannot start it).

## Deviations from pr-flow

| `pr-flow` step | Here | Why |
|---|---|---|
| Step 7 — visual change summary | **Skipped** | It requires the maintainer to preview the artifact and drag the PNG in by hand. An unattended dispatch has nobody to do that |
| Step 8 — merge requires user confirmation | **Pre-authorized** by the `agent-ready` label | The label is the maintainer's decision that this issue may go to merge unattended |

Every other `pr-flow` step is followed as written, including the bot-review loop in step 6.

One deviation is from CLAUDE.md itself and is therefore **not** this skill's to settle:

| CLAUDE.md rule | Here | Status |
|---|---|---|
| Cross-session tasks: create `claude-progress.md` before starting when the triggers apply | Not used. Checkpoint comments on the issue replace it | #937 exists to remove locally-stored progress files — parallel sessions overwrite them and another machine cannot read them. A skill cannot override CLAUDE.md on its own, so reconciling that rule needs a separate governance change. Until then this conflict is declared here rather than left silent |

## Known pits

| Pit | Guard |
|---|---|
| Adjudication lives in a later comment, not the body (#920, #921) | Step 1 reads the whole thread |
| A merged PR without `Closes` leaves its issue open (#906) | Step 9 reconciles issues against merged PRs |
| Citation typos survive archive; no CLI check catches them (issue #356 pilot finding ③, `docs/sdd-workflow.md` §6.2) | Source-Verify pre-scan before archive |
| Port 8888 already held by another session's server | One `PW_PORT` per worktree from 8980, `lsof` checked before hand-out |
| Push from a worktree blocked as a push from `main` | `EnterWorktree`, or `cd <worktree> && git push` |
| Two issues bumping one canonical spec's Changelog | Shared canonical spec means different waves |
| Leftover worktrees and `[gone]` branches after a sprint | Step 9 cleanup, plus `pr-flow`'s sprint-end sweep |
| Regenerating a derived file (e.g. screen inventory) after every source edit leaves throwaway commits that go empty on rebase | Regenerate it once, right after the last source edit, not after each one |
| `test-results/.last-run.json` is overwritten by any later Playwright run, including an aborted one — #921's 143-item failure list was wiped down to 6 by a self-interrupted `--last-failed` rerun | Capture a run's failure list to a file of your own before rerunning anything against it |
| Bare `git stash`/`git stash pop` in a multi-worktree wave can lose or cross-contaminate another lead's uncommitted work — the stash stack is shared repo-wide, not per-worktree | Park changes in a WIP commit; for a read-only probe tree use `git worktree add --detach <tmp> <base>` |
| `specs/STATUS.md`'s per-spec row is a cumulative summary string; taking one side of a merge conflict can silently drop an intermediate version's entry, and `check-sdd.sh` only checks the leading version, never entry continuity | Compare both sides' version-entry sequences and restore any segment missing from the losing side |
| FR/AC IDs collide silently across issues sharing a wave — git merges both with no conflict marker, and no gate (`check-sdd.sh`, `openspec validate`) checks for duplicate IDs | Pre-assign or merge-time-renumber ID ranges per issue (Step 4 controlled exception); `grep -rn` the repo for zero remaining hits after renumbering |
