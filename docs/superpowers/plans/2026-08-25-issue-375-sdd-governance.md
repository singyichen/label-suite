# Issue #375 SDD Governance Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Align Label Suite's canonical SDD governance and every active consumer so frontend handoff, TDD ownership, validation gates, and stacked-PR archive timing have one unambiguous definition.

**Architecture:** Apply source-first governance amendments, copy their bodies exactly into agent-loading caches, then propagate the approved vocabulary into workflow, skill, OpenSpec, and multi-agent guidance. This branch remains documentation/configuration-only; executable lint, inventory generation, and canonical spec cleanup stay in later issue #375 branches.

**Tech Stack:** Markdown, YAML, Bash verification, Git.

**Spec:** `docs/superpowers/specs/2026-08-25-issue-375-sdd-governance-design.md`

## Global Constraints

- Work only in `/Users/mandychen/mandy/project/label-suite/.worktrees/issue-375-sdd-governance` on `feat/issue-375-sdd-governance`.
- The user explicitly authorized changes to `AGENTS.md`, `CLAUDE.md`, and constitution source/cache for this branch.
- `specs/_governance/constitution.md` and `specs/_governance/testing-constitution.md` are sources; `.specify/memory/constitution.md` and `.specify/memory/testing-constitution.md` are exact-body caches with wrapper headers only.
- Every task is one file unless it declares `Exception: governance-propagation`, lists every source/cache file, and explains why an atomic commit is required.
- `senior-qa` owns Red test tasks; implementation agents own Green tasks; main/team lead verifies evidence and marks checkboxes.
- A prototype shell may exist before a Red test, but selector contracts and target behavior must not be added until the Red failure is confirmed.
- `/label-suite-design` is the canonical prototype-stage command. Repository-local frontend and prototype commands use `pnpm`, never `npm`.
- ADR-034 remains Proposed. Do not accept it, create root `e2e/`, rewrite historical ADR paths, or introduce an E2E-path lint rule in this branch.
- Required OpenSpec schema validation is non-strict: `openspec validate --changes --no-interactive`. Do not add `--strict` to required gates.
- Keep four gates distinct: OpenSpec schema validation; project SDD lint; code/test gates; Source-Verify plus write-back/archive.
- Do not modify inventory files, canonical feature specs, `specs/STATUS.md`, OpenSpec changes, API/DB contracts, backend code, or frontend runtime code.
- Commit messages are English Conventional Commits with body bullets beginning with bold English action words.
- Subagents must not spawn subagents and must not edit `tasks.md` checkboxes.

---

### Task 1: Amend and synchronize the main constitution

**Files:**
- Modify: `specs/_governance/constitution.md`
- Modify: `.specify/memory/constitution.md`

**Exception:** `governance-propagation` — the source amendment and its declared tool cache must be committed atomically so no commit contains a misleading cache.

**Interfaces:**
- Consumes: the authority matrix, validation boundaries, and ADR status rules from the approved design.
- Produces: constitution version `1.32.1`, the canonical authority order, the four-gate boundary, and exact cache content used by Tasks 2–10.

- [ ] **Step 1: Verify the starting version and cache marker**

Run:

```bash
rg -n '\*\*Version\*\*: 1\.31\.1|BEGIN CACHE.*v1\.31\.1' \
  specs/_governance/constitution.md .specify/memory/constitution.md
```

Expected: the source version and cache marker both report `1.31.1`.

- [ ] **Step 2: Add the PATCH amendment to the source**

Update the Sync Impact Report, version line, and newest changelog row to `1.32.1` dated `2026-08-25`. Add a Governance subsection named `Source of Truth And Authority Order` containing this order:

```text
main constitution
→ applicable domain constitution
→ Accepted ADR
→ canonical feature spec
→ docs/sdd-workflow.md for SDD orchestration
→ machine guidance and derived views
```

The subsection must state that Proposed ADRs do not supersede current rules, `specs/STATUS.md` is the delivery-state source, and derived/cache files fail toward their upstream authority rather than overriding it.

Replace the two governance gates that currently claim `/opsx:verify` or `openspec validate` can check project alignment. The amended wording must assign:

```text
openspec validate = OpenSpec schema/delta/scenario structure
project SDD lint = project headings, goal/status/ownership/retired-path rules
code/test gates = affected implementation verification
Source-Verify + write-back = archive-time canonical ID/version/Changelog integrity
```

- [ ] **Step 3: Synchronize the cache exactly**

Copy the complete amended source between the cache's `BEGIN CACHE` and `END CACHE` markers. Preserve only the cache-specific wrapper above `BEGIN CACHE`, and update its marker to `v1.32.1 (2026-08-25)`.

- [ ] **Step 4: Verify version, authority wording, and exact cache body**

Run:

```bash
rg -n 'Version\*\*: 1\.31\.2|Source of Truth And Authority Order|OpenSpec schema' \
  specs/_governance/constitution.md .specify/memory/constitution.md
diff -u specs/_governance/constitution.md \
  <(awk '/<!-- BEGIN CACHE/{inside=1; next} /<!-- END CACHE/{inside=0} inside{print}' \
    .specify/memory/constitution.md | sed '1{/^$/d;}')
git diff --check
```

Expected: `rg` finds both files, `diff` prints nothing, and `git diff --check` exits 0.

- [ ] **Step 5: Commit the atomic amendment**

```bash
git add specs/_governance/constitution.md .specify/memory/constitution.md
git commit -m "docs: clarify SDD governance authority boundaries" \
  -m "- **Define** the canonical authority order and keep Proposed ADRs non-binding" \
  -m "- **Separate** OpenSpec schema checks from project lint and archive verification" \
  -m "- **Synchronize** the constitution tool cache with version 1.32.1" \
  -m "Co-Authored-By: OpenAI Codex GPT-5.6 <noreply@openai.com>"
```

### Task 2: Amend and synchronize testing governance

**Files:**
- Modify: `specs/_governance/testing-constitution.md`
- Modify: `.specify/memory/testing-constitution.md`

**Exception:** `governance-propagation` — the testing source and agent-loading cache are one semantic contract and must not land separately.

**Interfaces:**
- Consumes: Task 1 authority order and the approved Red/Green, task-exception, prototype-shell, and validation decisions.
- Produces: exact ownership/evidence vocabulary consumed by Tasks 3–10.

- [ ] **Step 1: Add Red/Green ownership and evidence rules**

Under `## I. Mandatory TDD`, add rules that state exactly:

- `senior-qa` owns each separate Red test task.
- The Red task is committed and run before Green, with the expected failure reason recorded.
- The implementation agent owns the paired Green task and cannot modify the Red contract merely to make it pass.
- Main/team lead verifies Red and Green evidence and is the only role that marks task checkboxes.
- A static prototype shell may precede Red; target selectors and behavior follow Red → Green.

- [ ] **Step 2: Define the structured task exception record**

Under `## II. Task Decomposition For Testability`, allow only these exception identifiers:

```text
package-manager
scaffold
governance-propagation
```

Every exception must include three fields in task text:

```text
Exception: <identifier>
Files: <complete explicit file list>
Reason: <why atomic multi-file output is unavoidable>
```

Clarify that a PR may contain multiple one-file tasks and that command-only verification tasks list exact commands and expected results.

- [ ] **Step 3: Separate merge-gate responsibilities**

Rewrite `## XIV. Merge Gate` so it references the four distinct gates from Task 1 and does not claim `/opsx:verify` and `openspec validate` are equivalent project-wide checks. Do not change the existing E2E directory rule or ADR source list in this branch.

- [ ] **Step 4: Synchronize and verify the cache**

Copy the complete source body below the cache wrapper. Then run:

```bash
rg -n 'senior-qa|governance-propagation|prototype shell|project SDD lint' \
  specs/_governance/testing-constitution.md .specify/memory/testing-constitution.md
diff -u specs/_governance/testing-constitution.md \
  <(sed -n '9,$p' .specify/memory/testing-constitution.md)
git diff --check
```

Expected: required concepts appear in both files, body diff is empty, and whitespace check passes.

- [ ] **Step 5: Commit the testing amendment**

```bash
git add specs/_governance/testing-constitution.md .specify/memory/testing-constitution.md
git commit -m "docs: align TDD ownership and evidence rules" \
  -m "- **Assign** Red tasks to senior QA and Green tasks to implementation agents" \
  -m "- **Define** auditable multi-file exception records and checkbox ownership" \
  -m "- **Synchronize** testing governance into its agent-loading cache" \
  -m "Co-Authored-By: OpenAI Codex GPT-5.6 <noreply@openai.com>"
```

### Task 3: Make the SDD workflow the orchestration authority

**Files:**
- Modify: `docs/sdd-workflow.md`

**Interfaces:**
- Consumes: Tasks 1–2 canonical vocabulary.
- Produces: the human-readable authority matrix, Frontend Ready Gate, apply loop, four-gate table, and stacked-PR lifecycle used by all later consumers.

- [ ] **Step 1: Add the authority matrix and conflict rule**

After the introduction, add `## 0. 權威矩陣與衝突裁決`. Reproduce the approved authority matrix without inventing a second order, and state that machine guidance must fail toward its canonical source.

- [ ] **Step 2: Insert Spec Lint and Frontend Ready Gate into the macro flow**

The flow must read:

```text
brainstorm → specify → Spec Lint
→ prototype shell → Red prototype tests → Green behavior → page design
→ Frontend Ready Gate
→ opsx:propose → OpenSpec schema validation → Project SDD lint
→ opsx:apply
```

Add the eight approved Frontend Ready checks from the design: canonical goal/IDs/dependencies, direct design/prototype/test links, route/role, UI states, selector contract, API shape, RWD/a11y/i18n, and component/Storybook ownership.

- [ ] **Step 3: Replace the apply loop's same-task testing model**

Change the micro loop and responsibility table to separate `senior-qa` Red tasks from implementer Green tasks. Preserve main-agent checkbox ownership. Remove the statement that white-box tests and implementation occur in the same task.

- [ ] **Step 4: Add validation and stacked-PR timing**

Add a four-layer gate table with one responsibility and command class per layer. Rewrite archive wording to distinguish intermediate PR groups, the final group with archive/write-back inside the final PR, and post-merge canonical spec movement. Remove `八原則` and use `所有適用原則`.

- [ ] **Step 5: Update prompt examples and verify**

The prototype prompt must request a shell first and Red tests before selector/behavior implementation. The apply/archive prompts must use the new evidence and final-group language.

Run:

```bash
rg -n '權威矩陣|Frontend Ready Gate|OpenSpec schema|Project SDD lint|final PR|senior-qa.*Red' docs/sdd-workflow.md
if rg -n '與實作同 task|八原則' docs/sdd-workflow.md; then exit 1; fi
git diff --check
```

Expected: every required section is found; forbidden stale wording has zero matches.

- [ ] **Step 6: Commit the workflow**

```bash
git add docs/sdd-workflow.md
git commit -m "docs: align the canonical SDD workflow" \
  -m "- **Add** frontend readiness and distinct validation gates to the canonical flow" \
  -m "- **Separate** Red and Green ownership throughout the apply loop" \
  -m "- **Clarify** final-PR archive timing for stacked delivery" \
  -m "Co-Authored-By: OpenAI Codex GPT-5.6 <noreply@openai.com>"
```

### Task 4: Reduce the SDD skill to consistent machine guidance

**Files:**
- Modify: `.claude/skills/sdd-workflow/SKILL.md`

**Interfaces:**
- Consumes: Task 3 canonical flow; Tasks 1–2 validation and ownership rules.
- Produces: a concise machine guide that references the canonical workflow and contains no conflicting command, package-manager, test-timing, or verification claims.

- [ ] **Step 1: Align pipeline and prototype TDD**

Replace `/ui-ux-pro-max` with `/label-suite-design`. Describe `/ui-ux-pro-max` only as a non-canonical capability if it remains mentioned. Rewrite prototype sequencing as shell → Red Playwright failure → selector/behavior Green.

- [ ] **Step 2: Replace stale commands and path claims**

Use these commands:

```bash
pnpm test
pnpm run test:headed
pnpm run test:ui
```

Remove the `Relationship to frontend/tests/` path claim. Replace it with a path-neutral statement that formal React E2E placement follows Accepted ADR and testing constitution authority; do not add an ADR-034 acceptance claim.

- [ ] **Step 3: Correct verification and archive descriptions**

Replace claims that `/opsx:verify` or `openspec validate` performs cross-spec/project lint. Link to the four gates in `docs/sdd-workflow.md`, describe non-strict schema validation, and use final-PR/post-merge archive wording.

- [ ] **Step 4: Verify and commit**

Run:

```bash
rg -n '/label-suite-design|shell.*Red|pnpm test|four|four-layer|four layers' .claude/skills/sdd-workflow/SKILL.md
if rg -n '/ui-ux-pro-max.*→|(^|[^[:alnum:]_])npm (test|run)|Relationship to `frontend/tests/`|checks cross-spec consistency' .claude/skills/sdd-workflow/SKILL.md; then exit 1; fi
git diff --check
```

Expected: canonical command and pnpm are present; stale normative wording has zero matches.

```bash
git add .claude/skills/sdd-workflow/SKILL.md
git commit -m "docs: align the SDD machine guidance" \
  -m "- **Reference** the canonical workflow instead of duplicating conflicting policy" \
  -m "- **Replace** stale prototype commands and npm examples" \
  -m "- **Clarify** prototype TDD and validation responsibilities" \
  -m "Co-Authored-By: OpenAI Codex GPT-5.6 <noreply@openai.com>"
```

### Task 5: Align OpenSpec-injected rules

**Files:**
- Modify: `openspec/config.yaml`

**Interfaces:**
- Consumes: Tasks 1–3 authority, test ownership, exception, validation, and archive rules.
- Produces: OpenSpec task/apply/archive guidance that can be injected without redefining canonical policy.

- [ ] **Step 1: Update context and task rules**

Replace `eight principles` with `all applicable principles`. Require separate `[@senior-qa]` Red tasks, paired Green implementer tasks, Red commit/failure evidence, main checkbox ownership, and the exact three-field exception record from Task 2.

- [ ] **Step 2: Update operation guidance**

State that `openspec validate` is the non-strict schema gate and project lint is separate. Ensure `operations.apply.guidance` dispatches Red before Green, and `operations.archive.guidance` applies only to the final PR group before post-merge canonical movement.

- [ ] **Step 3: Validate YAML and stale wording**

Run:

```bash
openspec validate --changes --no-interactive
rg -n 'senior-qa|expected failure|Exception:|Project SDD lint|final PR' openspec/config.yaml
if rg -n 'eight principles|opsx:verify[^[:alnum:]_]*(\(or[[:space:]]+|or[[:space:]]+)[^[:alnum:]_]*openspec validate' openspec/config.yaml; then exit 1; fi
git diff --check
```

Expected: OpenSpec exits 0, required guidance is present, stale equivalence is absent.

- [ ] **Step 4: Commit the config**

```bash
git add openspec/config.yaml
git commit -m "docs: align OpenSpec governance guidance" \
  -m "- **Require** separate Red and Green tasks with explicit evidence" \
  -m "- **Add** structured task-exception metadata for auditable multi-file work" \
  -m "- **Separate** schema validation from project and archive gates" \
  -m "Co-Authored-By: OpenAI Codex GPT-5.6 <noreply@openai.com>"
```

### Task 6: Propagate governance into AGENTS.md

**Files:**
- Modify: `AGENTS.md`

**Interfaces:**
- Consumes: Tasks 1–5 canonical rules.
- Produces: the Codex-facing project rule summary with correct Red/Green ownership, validation, frontend readiness, and archive timing.

- [ ] **Step 1: Update required behavior and SDD pipeline**

Replace the single verify-equivalence sentence with four distinct gates. Add Spec Lint and Frontend Ready Gate to the SDD pipeline, and state final-PR archive/write-back followed by post-merge spec movement.

- [ ] **Step 2: Update Agent Team ownership**

Phase 2A must assign Red test tasks to `senior-qa`, require committed expected-failure evidence, and avoid a normative E2E directory list while ADR-034 is Proposed. Phase 2B implementation owners execute Green tasks only. Preserve main/team-lead checkbox ownership and user checkpoint rules.

- [ ] **Step 3: Verify and commit**

Run:

```bash
rg -n 'Frontend Ready Gate|OpenSpec schema|Project SDD lint|Red.*senior-qa|Green|final PR' AGENTS.md
if rg -n 'opsx:verify[^[:alnum:]_]*(\(or[[:space:]]+|or[[:space:]]+)[^[:alnum:]_]*openspec validate|senior-qa.*frontend/tests' AGENTS.md; then exit 1; fi
git diff --check
```

Expected: all required concepts appear and stale equivalence/path ownership has zero matches.

```bash
git add AGENTS.md
git commit -m "docs: align Codex SDD execution rules" \
  -m "- **Separate** Red and Green ownership in the agent phase map" \
  -m "- **Add** frontend readiness and four explicit verification gates" \
  -m "- **Clarify** final-PR and post-merge archive responsibilities" \
  -m "Co-Authored-By: OpenAI Codex GPT-5.6 <noreply@openai.com>"
```

### Task 7: Propagate governance into CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

**Interfaces:**
- Consumes: Tasks 1–5 canonical rules.
- Produces: the Claude-facing project summary with the same SDD stages and gate meanings as `AGENTS.md`.

- [ ] **Step 1: Update SDD and TDD summaries**

Add Spec Lint and Frontend Ready Gate. State `senior-qa` Red ownership, implementer Green ownership, and main/team-lead evidence and checkbox responsibility. Replace `eight core principles` with `all applicable constitution principles`.

- [ ] **Step 2: Update verification and archive language**

Replace `/opsx:verify`/`openspec validate` equivalence with four gates and non-strict schema validation. Clarify intermediate stacked PRs, final PR archive/write-back, and post-merge canonical spec movement.

- [ ] **Step 3: Verify and commit**

Run:

```bash
rg -n 'Frontend Ready Gate|all applicable constitution principles|senior-qa.*Red|OpenSpec schema|Project SDD lint|final PR' CLAUDE.md
if rg -n 'eight core principles|opsx:verify[^[:alnum:]_]*(\(or[[:space:]]+|or[[:space:]]+)[^[:alnum:]_]*openspec validate' CLAUDE.md; then exit 1; fi
git diff --check
```

Expected: aligned language is present; stale wording is absent.

```bash
git add CLAUDE.md
git commit -m "docs: align Claude SDD execution guidance" \
  -m "- **Add** frontend readiness and separate governance gates" \
  -m "- **Assign** Red and Green work to their approved owners" \
  -m "- **Clarify** stacked-PR archive and post-merge movement" \
  -m "Co-Authored-By: OpenAI Codex GPT-5.6 <noreply@openai.com>"
```

### Task 8: Align the team-lead agent contract

**Files:**
- Modify: `.claude/agents/team-lead.md`

**Interfaces:**
- Consumes: Tasks 1–7 shared vocabulary.
- Produces: orchestration rules that enforce separate Red/Green tasks, evidence, checkboxes, and the four gates.

- [ ] **Step 1: Rewrite phase and ownership rules**

Require `senior-qa` to commit and report expected Red failures before implementation dispatch. Require implementation agents to consume the Red contract and produce Green evidence. Keep team lead as the only checkbox writer. Remove normative `frontend/tests/` ownership and retired `/speckit.checklist` references.

- [ ] **Step 2: Rewrite verification escalation**

Replace verify-equivalence language with separate schema, project lint, code/test, and Source-Verify/archive checkpoints. Do not change security escalation or DB/API user checkpoints.

- [ ] **Step 3: Verify and commit**

Run:

```bash
rg -n 'expected failure|Red|Green|Project SDD lint|Source-Verify|checkbox' .claude/agents/team-lead.md
if rg -n 'frontend/tests|/speckit.checklist|opsx:verify[^[:alnum:]_]*(\(or[[:space:]]+|or[[:space:]]+)[^[:alnum:]_]*openspec validate' .claude/agents/team-lead.md; then exit 1; fi
git diff --check
```

Expected: orchestration terms are present and retired wording is absent.

```bash
git add .claude/agents/team-lead.md
git commit -m "docs: align the team lead SDD contract" \
  -m "- **Require** auditable Red evidence before Green implementation dispatch" \
  -m "- **Preserve** serial checkbox ownership across parallel agents" \
  -m "- **Separate** schema, lint, code, and archive verification checkpoints" \
  -m "Co-Authored-By: OpenAI Codex GPT-5.6 <noreply@openai.com>"
```

### Task 9: Align the agent-team command contract

**Files:**
- Modify: `.claude/commands/agent-team.md`

**Interfaces:**
- Consumes: Task 8 team-lead contract and Tasks 1–7 governance terms.
- Produces: the user-triggered multi-agent command flow with matching ownership and gates.

- [ ] **Step 1: Update phases, ownership, and gates**

Use `/label-suite-design`, remove `/speckit.checklist`, assign Red to `senior-qa`, assign Green to implementation agents, retain team-lead checkbox ownership, and avoid a normative `frontend/tests/` path. Replace verify-equivalence wording with the four checkpoints.

- [ ] **Step 2: Verify and commit**

Run:

```bash
rg -n '/label-suite-design|expected failure|Red|Green|Project SDD lint|Source-Verify' .claude/commands/agent-team.md
if rg -n 'frontend/tests|/speckit.checklist|opsx:verify[^[:alnum:]_]*(\(or[[:space:]]+|or[[:space:]]+)[^[:alnum:]_]*openspec validate' .claude/commands/agent-team.md; then exit 1; fi
git diff --check
```

Expected: canonical command and ownership appear; stale command/path/equivalence has zero matches.

```bash
git add .claude/commands/agent-team.md
git commit -m "docs: align the multi-agent SDD command" \
  -m "- **Route** Red and Green work through their approved agent owners" \
  -m "- **Remove** retired checklist and test-path guidance" \
  -m "- **Adopt** the four explicit verification checkpoints" \
  -m "Co-Authored-By: OpenAI Codex GPT-5.6 <noreply@openai.com>"
```

### Task 10: Make the deprecated task template non-normative

**Files:**
- Modify: `.specify/templates/tasks-template.md`

**Interfaces:**
- Consumes: Tasks 1–9 canonical authority and ownership rules.
- Produces: a deprecated template header that cannot override OpenSpec/config/testing governance with stale examples.

- [ ] **Step 1: Replace the deprecation contract**

Change the top warning so the file is an historical, non-normative example. State that active task generation uses `openspec/changes/<change>/tasks.md`, `openspec/config.yaml`, and `specs/_governance/testing-constitution.md`. Explicitly say examples below do not define current ownership, paths, gates, or PR grouping.

Remove the sentence saying this template's task/TDD rules still apply. Do not rewrite the 400-line historical example body in this branch; the new header must prevent it from acting as authority.

- [ ] **Step 2: Verify and commit**

Run:

```bash
sed -n '1,24p' .specify/templates/tasks-template.md
rg -n 'historical|non-normative|openspec/config.yaml|testing-constitution.md' .specify/templates/tasks-template.md
if sed -n '1,24p' .specify/templates/tasks-template.md | rg '規則仍適用'; then exit 1; fi
git diff --check
```

Expected: header names current authorities, states non-normative status, and removes the old continuing-authority sentence.

```bash
git add .specify/templates/tasks-template.md
git commit -m "docs: retire the legacy task template authority" \
  -m "- **Mark** legacy task examples as historical and non-normative" \
  -m "- **Point** active task generation to OpenSpec and testing governance" \
  -m "- **Prevent** stale examples from overriding current paths and ownership" \
  -m "Co-Authored-By: OpenAI Codex GPT-5.6 <noreply@openai.com>"
```

### Task 11: Run the branch-wide governance gate

**Files:**
- No file changes; command-only verification task.

**Interfaces:**
- Consumes: Tasks 1–10 complete branch state.
- Produces: final evidence for task review and whole-branch review.

- [ ] **Step 1: Verify the worktree and source/cache integrity**

```bash
git status --short --branch
diff -u specs/_governance/constitution.md \
  <(awk '/<!-- BEGIN CACHE/{inside=1; next} /<!-- END CACHE/{inside=0} inside{print}' \
    .specify/memory/constitution.md | sed '1{/^$/d;}')
diff -u specs/_governance/testing-constitution.md \
  <(sed -n '9,$p' .specify/memory/testing-constitution.md)
```

Expected: branch is `feat/issue-375-sdd-governance`, status is clean after committed tasks, and both diffs print nothing.

- [ ] **Step 2: Run existing project gates**

```bash
scripts/check-spec-artifacts.sh
bash scripts/speckit-tests.sh
openspec validate --changes --no-interactive
git diff --check main...HEAD
```

Expected: artifact check and speckit tests pass, OpenSpec reports no validation errors, and diff check exits 0.

- [ ] **Step 3: Verify required vocabulary and forbidden active guidance**

```bash
rg -n 'Frontend Ready Gate|Project SDD lint|Source-Verify|senior-qa|final PR' \
  AGENTS.md CLAUDE.md docs/sdd-workflow.md .claude/skills/sdd-workflow/SKILL.md \
  .claude/agents/team-lead.md .claude/commands/agent-team.md openspec/config.yaml

if rg -n '(^|[^[:alnum:]_])npm (test|run)|eight principles|8 principles|八原則|/speckit.checklist|opsx:verify[^[:alnum:]_]*(\(or[[:space:]]+|or[[:space:]]+)[^[:alnum:]_]*openspec validate' \
  AGENTS.md CLAUDE.md docs/sdd-workflow.md .claude/skills/sdd-workflow/SKILL.md \
  .claude/agents/team-lead.md .claude/commands/agent-team.md openspec/config.yaml; then
  exit 1
fi
```

Expected: required vocabulary is found in all applicable consumers and forbidden active guidance has zero matches. Historical changelog rows and ADR documents are intentionally outside this scan.

- [ ] **Step 4: Record final evidence without creating a commit**

Append the exact command outputs and exit codes to the SDD report for Task 11. Do not modify repository files or create an empty commit.
