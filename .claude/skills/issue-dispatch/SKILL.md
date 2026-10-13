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
|    +- Green, by eligibility (step 3):
|    |    claude-only     → senior-frontend | senior-backend | senior-debugger
|    |    codex-eligible  → Codex `task --write --cwd <worktree>` (writes files only;
|    |                      the lead commits, runs the gates, posts the evidence)
|    +- independent review, by eligibility:
|    |    claude-only     → senior-code-reviewer (did not write the code)
|    |    codex-eligible  → Codex `review --base <BASE> --cwd <worktree>`
|    The lead plays CLAUDE.md's "main agent/team lead" role for its own issue:
|    verifies Red and Green evidence, is the only role that ticks tasks.md,
|    posts checkpoint comments, opens the PR.
|
+- per-issue lead  (next issue, next port)
```

**Codex is an execution engine, not a peer.** It runs one turn per call inside a `workspace-write` sandbox that can read and write files under the worktree and nothing else: `.git` is read-only (a `git commit` fails with `.git/index.lock: Operation not permitted`), there is no network (no localhost dev server, no PostgreSQL/Redis, no `gh`), and it never sees this skill, `.claude/agents/*.md`, or the per-path `.claude/rules/*.md` — only `AGENTS.md` plus whatever the prompt names. The lead therefore keeps everything Codex cannot do: commits, pushes, every verification gate that needs a server or the network, `gh` calls, and checkpoint comments. Dialogue is turn-based: the lead reads the result, runs the gates itself, and sends only the failure delta back with `task --resume-last` on the same thread. Decided 2026-10-12 (#1281) after the #1262 pilot (PR #1287).

The per-issue lead **must** be `general-purpose`. Every agent under `.claude/agents/` — `team-lead` and `senior-qa` included — omits `Agent` and `SendMessage` from its `tools:` list, so a specialist can neither delegate nor communicate. Specialists are leaves by construction, which caps nesting depth at two levels.

Budget rule: a lead runs at most one nested specialist at a time. Red completes before Green is dispatched.

**Nested-specialist stall.** If a dispatched specialist goes unresponsive with no checkpoint for a normal working session, the lead may take over and produce the deliverable itself, but must independently verify the evidence — read the actual command output, not a self-report — and must declare the deviation explicitly in the PR body. It is a deviation from CLAUDE.md's TDD ownership rule, not a substitute for it. If the specialist leaves a diagnostic probe patch uncommitted in the worktree, the lead must revert it before trusting the worktree's state: rerunning Red against a dirty tree can produce a false pass.

**The main session reads every lead's diff before that lead opens its PR.** This is a role-level rule, not a Step 6 suggestion: regressions and hardcoded copy are caught at this layer, not by a lead's review of its own work.

Every nested agent's prompt must state the worktree's absolute path and require the agent to enter it first. Do not assume a nested agent inherits the lead's working directory.

Model selection follows CLAUDE.md: the lead defaults to Sonnet; escalate to Opus for architecture, counter-factual, or security threat modeling work.

### Nested-specialist preamble

A nested specialist never loads this skill; it only sees what the lead's prompt gives it. Before dispatching one, copy this block verbatim into its prompt:

- No bare `git stash` / `git stash pop` — the stash stack is shared across every worktree and session. Park changes in a WIP commit; for an unmodified copy use `git worktree add --detach <tmp> <base>`.
- Never run the full Playwright suite. Always use the lead-assigned `PW_PORT`, never the default — 8888 is routinely held by another session and produces false results.
- Revert any diagnostic probe patch before reporting done. The lead runs `git status --short` before trusting Red evidence.
- This environment is zsh: `mapfile` / `readarray` do not exist. Build arrays with `${(f)"$(cat file)"}` or list filenames directly.
- Enter the worktree by its absolute path (`cd <absolute-path> && ...`) before every command; do not assume the working directory persists or inherits the lead's.

### Codex prompt file

A Codex run sees only `AGENTS.md` and its prompt. Write the prompt to a file in the scratchpad and pass it with `--prompt-file`; a long inline prompt is rejected as a compound command in some permission modes. Put **paths, not contents** in it — Codex reads files itself, and every line the lead pastes costs Claude tokens twice. Use these five blocks (the #1262 pilot's shape):

```xml
<task>
Issue #N: <one-sentence goal>.
Read first: AGENTS.md; <the rule files that apply, e.g. .claude/rules/backend.md, .claude/rules/testing-backend.md>; <the canonical spec section>.
Red test: <path>, committed at <sha>; current failure output:
<paste the Red failure lines>
Deliverables: <numbered list, each naming the file it lands in>.
</task>
<action_safety>
Touch only: <explicit file list>. Do not edit the Red test file, specs/, or any other path. Do not run git commit, git stash, or any git command that writes; the lead commits. No network is available.
</action_safety>
<verification_loop>
Run from the repository root: <only the offline commands, e.g. bash <red-test>, scripts/check-sdd.sh, bash -n, ruff, mypy>. If a command needs a server or the network, say so instead of claiming it passed. Never weaken the Red test to make it pass.
</verification_loop>
<completeness_contract>
Done means: <the Red test exits 0 and every deliverable exists>. Finish the others and report a blocker precisely rather than stopping partway.
</completeness_contract>
<compact_output_contract>
At most <N> lines: files changed with one-line reasons; verification commands with exit codes; anything left undone; any ambiguity you resolved. No code in the report.
</compact_output_contract>
```

## Execution attribution

State only the commands you yourself ran. Never write a lead's, a peer's, or the main session's execution as your own, and never claim the main session "already reran" a step it did not run in this session. Describe a future independent re-verification as a mechanism, not as an event that already happened.

## Peer communication

Leads may talk to each other directly. The rules below are not style preferences — each follows from what the harness actually permits.

| Rule | Why |
|---|---|
| The main session distributes the roster (`#N → agentId`) after all leads are dispatched | A subagent has no `ListAgents` and cannot discover peers; addressing a peer by name fails. The raw `agentId` from a spawn result is the only working address, and it does not exist until that agent is spawned |
| One-shot notification only. An agent must never send a message and then wait for the reply | A waiting on B while B waits on A deadlocks the wave |
| Never use a message as a lock to coordinate a shared file. Escalate a discovered file conflict to the main session, which arbitrates | Issues in one wave are scheduled to be non-conflicting, so needing to coordinate means the conflict graph was wrong. That is a scheduling bug to report, not something to negotiate around |
| The main session judges progress **only** from `gh issue view <N> --comments`, never from task notifications | When one agent resumes a peer, the resumed agent's completion notification goes to the peer that sent the message, not to the main session. Notification routing is therefore unreliable; issue comments are not |
| Evidence is always written into the issue's checkpoint comment, not only returned through `SubagentHandback` or a peer message. A failed handback delivery needs no redispatch | A failed handback delivery leaves the checkpoint comment as the only surviving copy of the evidence; redispatching would only repeat finished work |
| A late or duplicate nested-agent report — one that arrives after its issue already merged — is superseded by that issue's checkpoint comment; never act on it again | Review reports can arrive after their issue already merged; the checkpoint comment is authoritative |

## Re-entry safety

`/goal` and `/loop` both re-enter this flow, and so does a fresh session handed nothing but an issue number. Three mechanisms make re-entry safe: the collision check (step 2), the `agent-running` label, and the checkpoint comments. On re-entry, read the issue's last checkpoint comment and continue from there. Never restart an issue that already has a checkpoint comment without first reconciling its branch, worktree, and PR.

## Permission pre-flight

Before dispatching the first wave, confirm `.claude/settings.json` allows every `gh` mutation this flow issues unattended — at minimum `gh issue edit` (labels), `gh issue comment`, `gh pr create`, `gh pr merge`, and `gh api -X DELETE` (branch cleanup) — and the Codex companion call, `Bash(node *codex-companion.mjs *)`. A missing allow rule stalls the whole flow at the first blocked call with nobody watching: the first real run stopped dead on `gh issue edit --add-label` in step 5. Run `/fewer-permission-prompts` once per machine, or add the rule directly.

Also confirm Codex itself is ready once per machine: `node <companion> setup --json` must report `"ready": true` with `loggedIn: true`. The companion script lives at `~/.claude/plugins/cache/openai-codex/codex/<version>/scripts/codex-companion.mjs`; resolve `<version>` from `~/.claude/plugins/installed_plugins.json` (`installPath`) rather than hard-coding it, since a plugin update moves it. `${CLAUDE_PLUGIN_ROOT}` exists only inside the plugin's own commands and agents, never in a lead's shell.

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

The body alone is not the requirement. Adjudications are routinely written in later comments. An issue whose body and latest comment disagree is classified as needing adjudication, not guessed at.

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

### Codex eligibility

Classify each issue a second time, on who may do its Green work and its independent review. UI/UX work never goes to Codex; the maintainer's decision (2026-10-12, #1281).

| Eligibility | Condition | Green | Review |
|---|---|---|---|
| claude-only | Any of: the issue carries the `ui` label · a `claude-only` label · the estimated touched set (step 4) includes `design/**`, `frontend/src/**/components/**`, `**/pages/**`, `*.css`, design tokens, `locales/**`, `design/system/screen-inventory.md`, or spec text that describes a screen | `senior-frontend` / `senior-backend` / `senior-debugger` | `senior-code-reviewer` |
| codex-eligible | All touched paths are under `backend/**`, `scripts/**`, `e2e/**`, `.github/**`, or frontend hooks / api clients / utils / types / `__tests__`, and the spec text touched describes no screen · or the issue carries a `codex-ok` label | Codex `task --write` | Codex `review --base` |
| uncertain | Anything else | claude-only | claude-only |

A `codex-ok` or `claude-only` label is the maintainer's override and wins over the path rule. Red stays with `senior-qa` on every path: CLAUDE.md's TDD rule names it as the Red owner, and moving Red to Codex is a governance change this skill may not make on its own. Record the eligibility in the opening checkpoint comment.

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

### Controlled exceptions — function region, canonical spec, FR/AC IDs

The maintainer relaxed the file- and spec-level rules above because one large shared file touched by every queued issue would otherwise collapse a wave to a single issue. This narrows those rules; it does not replace them.

- **Function-region granularity**: two issues sharing one production file may share a wave if their edited regions do not overlap, located with `grep -n` against the current worktree at scheduling time — never an issue body's quoted line numbers, which drift stale.
- **Shared canonical spec, controlled**: several issues bumping the same canonical spec may still share a wave; each lead writes a placeholder version number first, and the main session assigns the real one at merge time in issue-number order — `git merge origin/main`, renumber the Changelog entry and version, sync `specs/STATUS.md`, re-run `scripts/check-sdd.sh`, then push. `Changelog`/`specs/STATUS.md` conflicts here are near-guaranteed and resolved by hand; paste a `grep` check confirming the version number, the Changelog entry, and the STATUS.md row all agree before push.
- **FR/AC ID allocation**: issues in one wave that each add FR/AC IDs independently number from `main`'s current max and collide with no conflict marker and no gate catching it — `check-sdd.sh`'s duplicate check only covers required headings, and `openspec validate` only checks schema. The main session pre-assigns ID ranges per issue at scheduling time, or assigns a range at merge time and requires the later-merging issue to renumber, then `grep -rn` the repo for the old IDs to confirm zero remaining hits.
- **Standard conflict resolution**: regenerate `design/system/screen-inventory.md` fresh after merging — never hand-pick a side, whose hash won't match the merged content until the next CI `--check` catches it. Canonical Changelog conflicts keep both sides' entries, newest on top. Subsequent branches merge `origin/main`, never rebase — rebase needs a force push, which the pre-tool-use hook requires the maintainer to confirm, stalling an unattended wave.

## Step 5 — Dispatch

One issue, one worktree, one lead, one port.

```bash
N=931
SLUG=sidebar-role-highlight          # short, lowercase, hyphenated
BRANCH=fix/${N}-${SLUG}              # type prefix per .claude/rules/git-workflow.md
BASE=main                            # stacked: the previous PR's branch, not main (see step 6)
WT=.claude/worktrees/issue-${N}-${SLUG}
PORT=8980                            # 8980, 8981, ... one per worktree in the wave

lsof -i:${PORT}                      # must print nothing before the port is handed out
git fetch origin main
git worktree add -b "${BRANCH}" "${WT}" origin/main
gh issue edit ${N} --add-label agent-running
```

Worktrees live under `.claude/worktrees/` — not `.worktrees/`, and not a sibling directory — because it keeps every wave's worktrees in one place, `.gitignore` already excludes the whole directory, and it never pollutes the repository's parent directory. `scripts/worktree-init.sh` creates `../label-suite-<slug>` instead; that is the older convention and is not used here.

**`EnterWorktree` is unavailable to leads and their nested specialists.** Its actual contract: the caller's own cwd must already be inside a worktree before it can switch to another one. A lead's cwd at dispatch is the repository root, not a worktree, so `EnterWorktree` fails for every path, not just some — three leads in the same wave (#1018, #1028, #1035) hit exactly this and each independently worked around it. Use `git -C <absolute-worktree-path> <command>` or `cd <absolute-worktree-path> && <command>` instead; the latter also satisfies the push hook (see "Push from inside the worktree" below).

`agent-ready` **stays on the issue**. It is the maintainer's standing authorization — including the archive authorization below — not a queue token. `agent-running` is added alongside it, and step 1 excludes `agent-running`, so an in-flight issue is never claimed twice. This deliberately refines #937's step 5 wording, which said the label is *changed* to `agent-running`: removing `agent-ready` would also remove the archive authorization that the same label carries.

The lead re-runs `lsof -i:${PORT}` before its first Playwright run: another session's server can appear between dispatch and first use, and 8888 and 8899 are both known to be taken by long-running local servers.

Post the opening checkpoint comment (branch, worktree, `PW_PORT`, lead model) before the lead starts work.

Dispatch every lead of the wave **in one message** so they run concurrently. Each lead's prompt states: the issue number, the worktree absolute path, the branch, its `PW_PORT`, the classification **and Codex eligibility** from step 3, and the applicable verification commands from step 6. Once all spawn results are back, send each lead the wave roster in one `SendMessage` per lead.

A codex-eligible issue does not change the Playwright count in step 4 (a Codex job opens no Chromium), but it still counts as one issue toward the wave cap of 3.

Each lead must follow SDD as written in CLAUDE.md:

1. `senior-qa` writes the Red test, commits it, and runs it to produce the expected failure. The lead records the failure reason. Before trusting that evidence, the lead runs `git status --short` to confirm the worktree is clean and pastes that output into the checkpoint comment — a dirty worktree from an unreverted probe patch is what produced #921's false `3 passed`.
2. Only then is the Green specialist dispatched. It must not weaken or rewrite the Red contract to make it pass.
3. The lead verifies the committed Red evidence and the Green exit-0 evidence, and is the only role that ticks `tasks.md` checkboxes.

### Codex Green (codex-eligible issues only)

The lead calls the companion script directly from its own shell, never through the `codex:codex-rescue` agent: that agent is a forwarder whose cwd is pinned to the repository root and which does not pass `--cwd`, so dispatching through it makes Codex edit the shared `main` checkout instead of the worktree.

```bash
# Shell state does not survive between Bash tool calls: repeat this assignment at the top of EVERY call
# that uses it (launch, status, result, resume, review), or write the resolved absolute path inline.
COMPANION=~/.claude/plugins/cache/openai-codex/codex/<version>/scripts/codex-companion.mjs   # see Permission pre-flight
node "$COMPANION" task --write --background --cwd "<absolute worktree path>" --prompt-file "<scratchpad>/green-${N}-prompt.md" --json
#   → {"jobId": "task-…", …}

# separate Bash call, run_in_background — re-assign COMPANION first
node "$COMPANION" status <jobId> --wait --timeout-ms 1500000 --poll-interval-ms 10000 --cwd "<absolute worktree path>" --json

# separate Bash call — re-assign COMPANION first
node "$COMPANION" result <jobId> --cwd "<absolute worktree path>"
```

When the job completes:

1. Every path in `git status --short` must be in the prompt's `<action_safety>` allowlist; any path outside it is reverted with `git checkout -- <path>` before anything else happens. Then compare `git status --short` with the files Codex reported as touched. On the first turn the two sets match exactly; on a `--resume-last` turn the report lists only that turn's edits while the worktree still holds the earlier turn's uncommitted ones, so the check there is "reported ⊆ status ⊆ allowlist", never equality — comparing for equality on a resumed turn fails a correct run.
2. `git diff HEAD --stat -- <red test file>` must be empty. Codex never edits the Red contract.
3. The lead reruns every gate outside the sandbox — the Red test, `bash -n`/`ruff`/`mypy`/`tsc` as applicable, `scripts/check-sdd.sh`, and anything that needs a server — and reads the full diff. Codex's own "passed" lines are a hint, not evidence.
4. The lead commits with an English Conventional Commit message that names Codex and the thread id in the body.

On a red gate, send only the failing output back on the same thread: `node "$COMPANION" task --write --resume-last --cwd "<worktree>" --prompt-file "<scratchpad>/green-${N}-fix-prompt.md"` (re-assign `COMPANION` in that call). At most **two** such rounds; on the third failure the lead hands Green to the Claude specialist for that path, and records the hand-over in the checkpoint comment. When a review finding needs a new Red case first, `senior-qa` adds it and commits before the resume call, exactly as in the first round.

Codex reports it cannot act on — a mismatch it noticed outside its allowed files, a doubt about a config row — are decided by the lead and recorded in the checkpoint comment; they are never bounced back to Codex automatically.

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

**Independent review, no self-assessment — dispatched in parallel with the gates above, not after them.** For a claude-only issue the lead starts a fresh `senior-code-reviewer` that did not write the code; for a codex-eligible issue it runs Codex's built-in reviewer against the committed branch, `node "$COMPANION" review --base "origin/${BASE}" --scope branch --wait --cwd "<worktree>"` as a background command (re-assign `COMPANION` in that call). The base is the **remote** ref: `git fetch origin main` does not move the local `main` branch, and a stale local `main` makes the reviewer read every commit it is behind — 51 commits and 69 files instead of 2 when this was first drafted — so the review is no longer scoped to the change. For a stacked PR, `origin/<previous branch>` works once that branch is pushed. Either starts at the same time as the gates, so neither sits idle waiting on the other. The implementing agent never reviews its own work, and the lead never substitutes its own reading for the review. The lead verifies each finding against the repository before acting on it: a finding that is in scope and Critical/High goes back to the implementer (for Codex, a `task --resume-last` round, preceded by a `senior-qa` Red case when the fix needs one); an in-scope Medium/Low is listed in the PR body as non-blocking; a finding that is real but outside the issue's scope becomes its own issue per `.claude/rules/issue-reporting.md`, named in the PR body. Record the verdict and each disposition in the checkpoint comment. In the #1262 pilot Codex's review found three High defects — one a pre-existing mapping bug that no Claude layer had caught — so a clean Codex Green is not grounds to skip the review.

Then open the PR. Write the body to a file first and pass `--body-file`: a long `--body` heredoc is rejected as a compound command in some permission modes.

`${BASE}` is `main` for a single PR; for the Nth PR in a stack (N ≥ 2) it is the (N−1)th PR's branch, not `main` — otherwise the diff includes the prior PR's changes too, defeating single-purpose and the file-count cap.

```bash
gh pr create --title "<type>: <中文描述>" --base "${BASE}" --head "${BRANCH}" \
  --label "<type-label>" --body-file "<scratchpad>/pr-${N}.md"
```

The body follows `pr-flow` step 5b — Traditional Chinese, `##` headings in English — and **must contain `Closes #N`**. Every Test Plan item is individually verified: `[x]` with the command and its result for a pass, `[ ]` with the reason for a fail. Commit messages stay English-only.

The **main session** arms the CI watch — never the lead. A background command only re-invokes whoever started it, and merge is the main session's job alone (Step 7); a watch the lead arms wakes an agent that has typically already handed off and finished, leaving the main session with no wake source. The main session arms it in the same tool-call turn it obtains the PR number — whether from its own `gh pr create` call or from the lead's hand-off reporting the PR is open. A PR number that reaches the main session without a watch armed in that same turn leaves it idle: no event exists to wake it up again. Step 7 below has the watch mechanism and the merge conditions.

## Step 7 — Merge

The watch the main session armed in Step 6, in the same turn it obtained the PR number, is what stands in for a foreground `sleep`, which the harness blocks. Its mechanism is either a background command, which re-invokes the session when it exits:

```bash
gh pr checks <pr> --watch --fail-fast
```

or arm a `Monitor` whose filter covers **every** terminal state (`pass|fail|cancel|skipping|timed out`), not just success — a filter that matches only the success marker stays silent through a crash, and silence looks exactly like "still running".

Merge only when the independent review passed and all four hold, checked with `gh pr view <pr> --json mergeable,mergeStateStatus,statusCheckRollup`:

- `mergeable == "MERGEABLE"`
- `mergeStateStatus == "CLEAN"`
- the check count is greater than 0
- every check passed

Also apply the issue checklist gate in `.claude/commands/pr-flow.md` Step 8: every `- [ ]` in the issue body is ticked or marked withdrawn before merge.

`gh pr checks --watch` exiting 0 is not sufficient alone — it also exits 0 when the PR has zero checks (a `CONFLICTING` PR registers none), and separately when the only registered check is an external app while this repo's own workflow run is still `queued`.

These four conditions are necessary but not sufficient — they can all hold before this repo's own CI run has registered a single check. Before merging, also confirm no workflow run for the head SHA is still `queued` or `in_progress`, and that the two unconditional jobs are present and `SUCCESS`:

```bash
gh run list --branch <branch> --json status,conclusion,headSha --jq '[.[] | select(.headSha == "<sha>")] | map(select(.status != "completed")) | length'   # must be 0
gh pr view <pr> --json statusCheckRollup --jq '[.statusCheckRollup[] | select((.name=="Project SDD Lint" or .name=="Validate Project Structure") and .conclusion=="SUCCESS")] | length == 2'   # must be true
```

The first command's `0` alone is not conclusive: an empty result set for this SHA prints the same `0` whether every run has finished or no run has been created yet, so it cannot tell those two states apart — only the second command's job-name check catches the "not created yet" case, and the two must hold together, never the first in isolation.

`Project SDD Lint` and `Validate Project Structure` run unconditionally on every change; their absence from a green-looking rollup means the run has not registered yet, not that they were skipped.

```bash
gh pr merge <pr> --merge
```

Merge is the main session's job alone. Applying `agent-ready` is the maintainer's advance authorization for it (see **Deviations from pr-flow**).

**Stacked PRs merge one at a time, in stack order.** `gh pr merge` merges into whatever base is currently set — after PR N merges, retarget PR N+1 with `gh pr edit <N+1> --base main` *before* merging it, then re-check all four conditions above: the edit makes GitHub recompute `mergeable`/`mergeStateStatus`, so a check taken before the edit does not count. Skipping the retarget is a silent failure that still reports success: if PR N+1's base still points at PR N's branch, merging it lands the change on that branch instead of `main`, yet `gh pr view` still reports `MERGED`, `Closes #N` still closes the issue, and the four conditions can all have passed before the retarget. Confirm `main` actually contains the change afterward, e.g. `git log origin/main --oneline | grep <pr>`.

On a red gate: fix and push, at most **twice**. If it is still red, hand the failure to Codex for one read-only diagnosis pass — `node "$COMPANION" task --cwd "<worktree>" --prompt-file <file>` without `--write`, never the `codex:codex-rescue` agent, whose pinned cwd would diagnose the wrong checkout — CLAUDE.md escalates at three failed attempts on the same problem. If that does not resolve it, post a checkpoint comment containing the **exact** error output, swap `agent-running` for `blocked`, and send a `PushNotification`.

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

Reconcile issues against PRs before cleaning anything up. A merged PR whose body lost its `Closes` line leaves the issue open (a manual close with no closing-PR reference is the symptom).

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
- **A MAJOR stop stops the specialists too.** Raising the question is not a background activity that implementation continues around: before it escalates, the lead dispatches no further implementation or test specialist, and tells any specialist already running to stand down. The reason is that the undecided question *is* the specification — a specialist handed "make the failing tests pass" will resolve it by writing the maintainer's answer into a test, which is the one place a wrong answer looks like ordinary work. A lead's own `TaskStop` on a specialist is refused (`Task <id> is owned by <same id>`), so the stand-down has to be a `SendMessage` to each specialist. Tell it to revert only its own uncommitted files (`git checkout -- <paths>`, never `git reset --hard`, never `git stash` — the stash stack is shared across worktrees), and confirm the worktree is clean yourself afterwards rather than assuming it.
- **Source-Verify pre-scan before archive.** Every citation in the delta must be locatable by `grep` — FR/AC IDs, section references, file paths, ADR/issue/PR numbers, and paraphrased requirement clauses. `openspec archive` copies propose-time delta text verbatim, so a wrong citation survives into the derived view and no CLI check catches it. Follow `docs/sdd-workflow.md` §6.2.
- **Playwright throttle is a scheduling constraint, not a runtime lock.** Concurrent Chromium instances on one machine make runs flaky, so a wave carries at most two issues needing a full local suite (step 4). It cannot be a lock: leads are separate agents with no shared counter, and peer messages must never be used as locks. The main session enforces the cap when it builds the wave, which needs no coordination at run time. A mid-flight override that reshuffles wave membership must recompute both this count and the conflict graph for the new membership, not just PR merge order.
- **Never commit or push to `main`.** Commit messages are English-only; PR titles and bodies are Traditional Chinese.
- **Push from inside the worktree.** Use `EnterWorktree` (only from a session already inside a worktree — see step 5), or prefix with `cd <worktree> && `. The hook resolves the branch from `-C`, then `cd`, then the payload's `cwd` — and a subagent's `cwd` is pinned to the repository root, so an unprefixed push is read as a push from `main` and blocked (`.claude/hooks/pre-tool-use.sh`).
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
| `senior-code-reviewer` | Independent review for claude-only issues |
| Codex companion `task` / `review` (called directly, `--cwd <worktree>`) | Green implementation and independent review for codex-eligible issues; `task --resume-last` for fix rounds; `task` without `--write` for the one diagnosis pass before an issue is marked `blocked` (step 7). Never via the `codex:codex-rescue` agent — its cwd is pinned to the repository root |
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
| Adjudication lives in a later comment, not the body | Step 1 reads the whole thread |
| A merged PR without `Closes` leaves its issue open | Step 9 reconciles issues against merged PRs |
| Citation typos survive archive; no CLI check catches them (`docs/sdd-workflow.md` §6.2) | Source-Verify pre-scan before archive |
| Port 8888 already held by another session's server | One `PW_PORT` per worktree from 8980, `lsof` checked before hand-out |
| Push from a worktree blocked as a push from `main` | `EnterWorktree` (only from a session already inside a worktree), or `cd <worktree> && git push` |
| Two issues bumping one canonical spec's Changelog | Shared canonical spec means different waves |
| Leftover worktrees and `[gone]` branches after a sprint | Step 9 cleanup, plus `pr-flow`'s sprint-end sweep |
| Regenerating a derived file (e.g. screen inventory) after every source edit leaves throwaway commits that go empty on rebase | Regenerate it once, right after the last source edit, not after each one |
| `test-results/.last-run.json` is overwritten by any later Playwright run, including an aborted one | Capture a run's failure list to a file of your own before rerunning anything against it |
| Bare `git stash`/`git stash pop` in a multi-worktree wave can lose or cross-contaminate another lead's uncommitted work — the stash stack is shared repo-wide, not per-worktree | Park changes in a WIP commit; for a read-only probe tree use `git worktree add --detach <tmp> <base>` |
| `specs/STATUS.md`'s per-spec row is a cumulative summary string; taking one side of a merge conflict can silently drop an intermediate version's entry, and `check-sdd.sh` only checks the leading version, never entry continuity | Compare both sides' version-entry sequences and restore any segment missing from the losing side |
| FR/AC IDs collide silently across issues sharing a wave — git merges both with no conflict marker, and no gate (`check-sdd.sh`, `openspec validate`) checks for duplicate IDs | Pre-assign or merge-time-renumber ID ranges per issue (Step 4 controlled exception); `grep -rn` the repo for zero remaining hits after renumbering |
| A PR opened without its CI watch armed in the same turn stalls an autonomous round silently | The main session, not the lead, arms the watch in the same turn it obtains the PR number, in Step 6; re-arm after every `merge main` + repush, since the prior watch already exited with that round's CI. Any already-open PR found unwatched gets one before continuing |
| The four Step 7 merge conditions can all hold before this repo's own CI run has registered a single check (e.g. only a third-party check present while `CI` is still `queued`) | Confirm zero `queued`/`in_progress` runs for the head SHA and `Project SDD Lint` + `Validate Project Structure` both `SUCCESS` before trusting the four conditions |
| Merging a stacked PR while its base still points at the previous stack branch merges the change into that branch, not `main`, yet `gh pr view` still reports `MERGED` | Retarget with `gh pr edit <N+1> --base main` before merging it; afterward confirm `main` contains the change, e.g. `git log origin/main --oneline \| grep <pr>` |
| `EnterWorktree` fails for a lead or nested specialist dispatched at the repository root | `git -C <absolute-path> <command>` or `cd <absolute-path> && <command>` instead of `EnterWorktree` |
| Codex cannot `git commit` inside the companion sandbox: `.git` is read-only under `workspace-write`, so the commit fails with `.git/index.lock: Operation not permitted` (probed 2026-10-12) | Codex writes files only; the lead commits after the `git status` / `touchedFiles` comparison |
| The Codex sandbox has no network: `curl 127.0.0.1:<port>` and `curl example.com` both fail (exit 7 / 6), so Playwright, a dev server, PostgreSQL/Redis-backed pytest, and `gh` are unreachable from inside it | The prompt's `<verification_loop>` lists offline commands only; the lead reruns every gate outside the sandbox |
| Dispatching Codex through the `codex:codex-rescue` agent runs it at the repository root — the agent's cwd is pinned there and it does not forward `--cwd` — so Codex edits the shared `main` checkout | The lead calls the companion script itself with `--cwd <absolute worktree path>` |
| The companion script's path carries the plugin version (`…/codex/1.0.6/scripts/codex-companion.mjs`) and `${CLAUDE_PLUGIN_ROOT}` is unset in a lead's shell | Resolve `installPath` from `~/.claude/plugins/installed_plugins.json` at pre-flight; never hard-code the version in a prompt |
| The main session verified Red with `cd <worktree> && …` and the harness pinned its cwd inside the worktree for the rest of the run (#1262 pilot) | Main-session inspection uses `git -C <worktree>` or a subshell `( cd <worktree> && … )`, never a bare `cd` |
| `gh pr checks --watch` exited 0 while `Prototype — Playwright Tests` was still `IN_PROGRESS` (#1287, 12 minutes after push) | Treat the watch as a wake-up only; the step 7 `gh run list` count of unfinished runs for the head SHA plus the two unconditional jobs decide |
| GitHub returned 502/504 on `gh issue edit`, `gh issue comment`, and `gh issue view` during the pilot; a checkpoint comment that failed to post leaves the issue with no resume contract | Retry the call; never record a checkpoint as posted until the command printed the comment URL |
| Two offline suites run at once (`scripts/speckit-tests.sh` beside a Codex review) pushed the suite past the 300 s foreground limit, though it finishes in well under that alone | Run the slower repository suites with `run_in_background` when a Codex job is active |
