# Issue #375 Project SDD Lint Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建立一個可在本地與 CI 重複執行的 Project SDD lint，以 ratchet baseline 阻擋新的治理漂移，同時保留四個 verification gates 的獨立責任。

**Architecture:** 先建立 `foundation-001` canonical spec，再用 OpenSpec change `implement-project-sdd-lint` 承載 implementation delta。Runtime 由 Bash 3.2-compatible `scripts/check-sdd.sh` 掃描 canonical specs、STATUS、active changes、tasks 與 active governance consumers；legacy violations 以排序的 TSV baseline ratchet，CI 以獨立 job 執行同一 command。

**Tech Stack:** Bash 3.2、POSIX `awk`/`grep`/`sed`/`sort`/`comm`、Git、OpenSpec CLI、GitHub Actions YAML。

**Spec:** `docs/superpowers/specs/2026-08-26-issue-375-sdd-lint-design.md`

## Global Constraints

- Canonical authority order remains: main constitution → testing constitution → Accepted ADR → canonical feature spec → `docs/sdd-workflow.md` → machine guidance/derived views.
- OpenSpec schema validation, Project SDD lint, code/test gates, and Source-Verify + write-back/archive remain four distinct results.
- Every OpenSpec artifact is Traditional Chinese except structural keywords, IDs, paths, commands, and code identifiers.
- Code, comments, script diagnostics, commit messages, and CI identifiers are English-only.
- No production file may be written before the paired Red contract is committed and observed failing for the expected reason.
- Red test ownership is `[@senior-qa]`; Green script/CI ownership is `[@senior-devops]`; only main updates OpenSpec task checkboxes.
- Artifact-producing tasks touch exactly one file unless they declare an allowed exception with exact `Exception:`, `Files:`, and `Reason:` fields.
- `scripts/check-sdd.sh` must run on macOS Bash 3.2 and Ubuntu Bash; do not use associative arrays, `mapfile`, `readarray`, `grep -P`, `sed -r`, GNU-only flags, Python, Node, Bats, or new dependencies.
- Default mode uses the ratchet baseline; `--strict` promotes baseline-eligible violations only. Inventory freshness, E2E path decision, semantic goal review, and external PR state remain warning-only.
- `scripts/check-sdd.sh`, `openspec validate --changes --no-interactive`, and affected code/test commands are never presented as equivalents.
- The user explicitly authorized this workstream to modify protected `CLAUDE.md` on 2026-08-26.
- ADR-034 remains Proposed; no root E2E path migration occurs here.
- Inventory generator/freshness enforcement is deferred to `feat/issue-375-design-inventory`; this plan emits a visible non-blocking warning only.
- Each PR group stays within ≤5 non-test files and ≤300 non-test diff lines, or stops at the maintainer checkpoint before opening the PR.
- Every commit command in this plan must include the repository-required `Co-Authored-By: OpenAI Codex GPT-5.6 <noreply@openai.com>` trailer in addition to the listed subject and action bullets.

---

### Task 1: Create the canonical Project SDD Lint specification

**Files:**
- Create: `specs/foundation/001-project-sdd-lint/spec.md`

**Interfaces:**
- Consumes: Issue #375 and the approved design document.
- Produces: stable IDs `FR-001`–`FR-008`, `AC-1.1`–`AC-4.1`, and `SC-001`–`SC-006` used verbatim by the OpenSpec delta and implementation tasks.

- [ ] **Step 1: Write the canonical spec**

Create the file with this exact contract and no placeholder text:

```markdown
---
功能分支: feat/issue-375-sdd-lint
建立日期: 2026-08-26
版本: 1.0.0
狀態: Draft
---

# 功能規格：Project SDD Lint

## 功能目標

讓維護者與開發 agent 能以一個離線、可重複執行的命令，在 PR 合併前偵測 SDD 文件、STATUS、OpenSpec task ownership 與 retired guidance 的新漂移；同時以 ratchet baseline 隔離既有文件債務，避免未完成的 cleanup 阻斷所有開發。

**需求來源**：GitHub issue #375、PR #387 與 `docs/superpowers/specs/2026-08-26-issue-375-sdd-lint-design.md`。

## 已釐清事項

- OpenSpec schema validation、Project SDD lint、code/test gates、Source-Verify + write-back/archive 是四個獨立 gate。
- Default mode 阻擋 strict violations 與 baseline 新增/過期；`--strict` 額外阻擋 baseline-eligible debt。
- Inventory freshness、ADR-034 E2E path、goal 語意一致性與 GitHub PR 外部狀態在本版只提供 warning。
- 本功能是 command-line tooling，沒有產品 route、prototype、page design、React component 或 Storybook scope；Frontend Ready Gate 不適用。

## 使用者情境與測試 *(必填)*

### 使用者故事 1 — 執行一致的 SDD gate（優先級：P1）

維護者可在任意 current directory 針對指定 repository root 執行 Project SDD lint，並取得穩定 exit code 與排序診斷。

**此優先級原因**：沒有穩定 command contract，就無法把 project-specific governance 變成 CI gate。
**獨立測試方式**：以 throwaway repository fixture 驗證 pass、error 與 usage error。

**驗收情境**：

1. **AC-1.1**：**Given** fixture 的 canonical spec、STATUS、active change、tasks 與 consumers 全部合法，**When** 執行 `scripts/check-sdd.sh <fixture-root>`，**Then** exit `0` 且 summary 為零 errors。
2. **AC-1.2**：**Given** active change 引用的 canonical spec 缺少 `## 功能目標`，**When** 執行 lint，**Then** exit `1` 並輸出 `SPEC_REQUIRED_HEADING` 與相對路徑。
3. **AC-1.3**：**Given** active change 存在但 STATUS 仍為 `spec-ready`，**When** 執行 lint，**Then** exit `1` 並輸出 `ACTIVE_CHANGE_STAGE`。
4. **AC-1.4**：**Given** active change 引用不存在於 canonical spec 的 FR/SC/AC ID，**When** 執行 lint，**Then** exit `1` 並輸出 `SOURCE_VERIFY_ID`。

### 使用者故事 2 — 驗證 task ownership 與例外（優先級：P1）

OpenSpec 作者能在 apply 前發現無效 assignee、Red owner、story goal 或 one-file exception record。

**此優先級原因**：這些錯誤會直接破壞 TDD handoff 與 multi-agent file ownership。
**獨立測試方式**：逐一 mutation passing fixture 並斷言 rule ID。

**驗收情境**：

1. **AC-2.1**：**Given** task 沒有恰好一個結尾 assignee 或 agent 不存在，**When** 執行 lint，**Then** exit `1` 並輸出 `TASK_ASSIGNEE`。
2. **AC-2.2**：**Given** task 使用未允許 exception，或缺少 `Exception:`、`Files:`、`Reason:` 任一欄，**When** 執行 lint，**Then** exit `1` 並輸出 `TASK_EXCEPTION`。
3. **AC-2.3**：**Given** Red task 不屬於 `[@senior-qa]`、缺少可定位 SC goal，或明確 file ownership 不符，**When** 執行 lint，**Then** exit `1` 並輸出相應 task rule。

### 使用者故事 3 — Ratchet legacy debt（優先級：P1）

維護者能保留已知 legacy debt，但任何新增 debt、已修復卻未移除的 stale entry、重複或未排序 baseline 都會阻擋合併。

**此優先級原因**：直接全 repository strict 會讓既有 12/17 heading debt 阻斷所有 PR；只警告又無法防止惡化。
**獨立測試方式**：建立 exact baseline/new/stale/duplicate/unsorted fixtures。

**驗收情境**：

1. **AC-3.1**：**Given** legacy violation 與排序 baseline 完全一致，**When** 執行 default mode，**Then** exit `0` 並輸出 warning。
2. **AC-3.2**：**Given** 新 legacy violation 不在 baseline，或 baseline entry 已 stale，**When** 執行 default mode，**Then** exit `1`。
3. **AC-3.3**：**Given** baseline 仍有 legacy violation，**When** 執行 `--strict`，**Then** exit `1`；warning-only deferred rules 不因 `--strict` 升級。

### 使用者故事 4 — 獨立 CI 可見性（優先級：P2）

PR 上以 `Project SDD Lint` 獨立 job 顯示結果，且本地使用相同 command。

**此優先級原因**：合併到 generic validation 會重新製造 Issue #375 要消除的 gate 邊界混淆。
**獨立測試方式**：CI YAML 與本地 command 文字契約檢查。

**驗收情境**：

1. **AC-4.1**：**Given** inventory generator 尚不存在，**When** CI 執行 lint，**Then** 顯示 `INVENTORY_FRESHNESS_UNVERIFIED` warning 但不宣稱 freshness 已通過，且 job 仍依其他 blocking rules 決定 exit code。

## 需求規格 *(必填)*

### 功能需求

- **FR-001**：系統必須提供 `scripts/check-sdd.sh [--strict] [repo-root]`；未指定 root 時從 script path 解析 repository，指定 root 時不得掃描 caller checkout。
- **FR-002**：系統必須輸出 `ERROR|WARNING [RULE_ID] relative/path: message` 格式的排序診斷與固定 summary；exit `0` 表示無 blocking error、exit `1` 表示 governance violation、exit `2` 表示 usage 或 scanner configuration error。
- **FR-003**：系統必須 strict 驗證 active OpenSpec change 的 canonical path、STATUS stage、必要 headings、FR/SC/AC Source-Verify 與新/變更 canonical spec。
- **FR-004**：系統必須以排序、唯一、無 glob 的 `scripts/sdd-lint-baseline.txt` ratchet legacy spec/status debt；new、stale、duplicate、unsorted 或不允許 rule 都必須失敗。
- **FR-005**：系統必須驗證 tasks 的結尾 assignee、agent existence、User Story `**故事目標**` + SC ID、Red owner、允許的 one-file exceptions 與可明確判斷的 file ownership。
- **FR-006**：系統必須在 active governance consumers 與 active OpenSpec artifacts 阻擋 repository-local `npm test`、`npm run`、將 `/ui-ux-pro-max` 當 pipeline stage，以及非歷史內容的 `/speckit.analyze`；不得把 `pnpm` 誤判為 `npm`。
- **FR-007**：系統必須將 goal semantic review、ordinary task file-count ambiguity、runtime Red evidence、GitHub PR state、ADR-034 E2E path 與 inventory freshness 標為 warning-only；`--strict` 不得將明確 deferred warning 升級。
- **FR-008**：CI 必須以獨立 `Project SDD Lint` job 執行 `scripts/check-sdd.sh`，`CLAUDE.md` 必須列出相同本地命令；job 不得包裝或取代 `openspec validate`。

## 規格相依性

### 上游（本規格依賴的規格）

| 規格編號 | 功能 | 本規格需要的內容 |
|---|---|---|
| foundation-000 | Foundation — 工程基準與共同約束 | CI、deterministic tooling、local/CI parity 與 single-purpose PR 基線 |

### 下游（依賴本規格的規格）

| 規格編號 | 功能 | 依賴本規格的內容 |
|---|---|---|
| Issue #375 inventory generator | 可再生 design inventory | 由 warning 升級的 inventory `--check` 接點 |
| Issue #375 spec cleanup | Canonical traceability cleanup | baseline entries 逐步歸零與 `--strict` 證據 |

## 成功標準 *(必填)*

- **SC-001**：passing fixture 在 default mode exit `0`；每個 strict mutation 以正確 rule ID exit `1`；usage/config error exit `2`。
- **SC-002**：baseline exact/new/stale/duplicate/unsorted/strict fixtures 全部通過，且 real repository default lint 不增加既有 debt。
- **SC-003**：`bash -n scripts/check-sdd.sh scripts/speckit-tests.sh` 與 `bash scripts/speckit-tests.sh` exit `0`，且 Red commit 的 expected missing-command failure 可定位。
- **SC-004**：`scripts/check-sdd.sh` 在 macOS Bash 3.2-compatible syntax 與 Ubuntu CI 執行，不增加 package dependency。
- **SC-005**：CI 具有獨立 `Project SDD Lint` job，且 OpenSpec schema command 仍被文件化為另一個 gate。
- **SC-006**：Issue #375 只勾選實際落地的 lint/CI 子項；inventory freshness 與全 repository baseline 歸零在各自後續工作流完成前維持未完成。

## 範圍外（Out of Scope）*(必填)*

- Inventory manifest/generator、HTML/Markdown regeneration 與 blocking freshness `--check`。
- 17 份 canonical specs 的批次 heading/link cleanup。
- ADR-034 acceptance 或 E2E path migration。
- GitHub branch protection mutation、產品 runtime、API、DB、frontend 與 backend behavior。

## Changelog

| 版本 | 日期 | 變更摘要 |
|---|---|---|
| 1.0.0 | 2026-08-26 | 建立 Project SDD lint command、ratchet baseline、task/Source-Verify/retired guidance rules與獨立 CI gate 的 canonical contract |
```

- [ ] **Step 2: Verify the canonical spec contract**

Run:

```bash
rg -n '^## 功能目標$|^## 規格相依性$|FR-00[1-8]|AC-[1-4]\.|SC-00[1-6]' specs/foundation/001-project-sdd-lint/spec.md
```

Expected: every named heading and ID is present; no `TBD`, `TODO`, or bracket placeholder remains.

- [ ] **Step 3: Commit**

```bash
git add specs/foundation/001-project-sdd-lint/spec.md
git commit -m "docs: specify the project SDD lint contract" -m "- **Define** stable FR, AC, and SC identifiers for the repository governance gate.\n- **Bound** legacy debt, deferred warnings, and independent CI responsibilities."
```

---

### Task 2: Register foundation-001 as spec-ready

**Files:**
- Modify: `specs/STATUS.md`

**Interfaces:**
- Consumes: canonical spec from Task 1.
- Produces: one `foundation-001` STATUS row used by Project SDD lint and OpenSpec proposal.

- [ ] **Step 1: Add the STATUS row and changelog**

Immediately after `foundation-000`, add:

```markdown
| foundation-001 | Project SDD Lint | foundation | `spec-ready` | `feat/issue-375-sdd-lint` | spec v1.0.0；Issue #375 follow-up；command-line tooling，prototype／Frontend Ready Gate 不適用 |
```

Add the newest changelog row:

```markdown
| 2026-08-26 | 新增 `foundation-001` Project SDD Lint canonical spec v1.0.0，狀態設為 `spec-ready`；範圍為 ratchet baseline、task/Source-Verify/retired guidance checks 與獨立 CI gate。 |
```

- [ ] **Step 2: Verify artifact synchronization**

Run: `scripts/check-spec-artifacts.sh`

Expected: `Spec artifact check passed`.

- [ ] **Step 3: Commit**

```bash
git add specs/STATUS.md
git commit -m "docs: register the project SDD lint spec" -m "- **Track** foundation-001 as spec-ready in the canonical delivery-state index.\n- **Record** the Issue #375 tooling scope and non-page exception."
```

---

### Task 3: Create the OpenSpec proposal

**Files:**
- Create: `openspec/changes/implement-project-sdd-lint/proposal.md`

**Interfaces:**
- Consumes: `specs/foundation/001-project-sdd-lint/spec.md` FR-001–FR-008 and SC-001–SC-006.
- Produces: exact canonical path and single-purpose change scope.

- [ ] **Step 1: Write proposal.md in Traditional Chinese**

Use exact structural headings `## Why` and `## What Changes`. The frontmatter must be:

```yaml
---
對應 Spec: specs/foundation/001-project-sdd-lint/spec.md
---
```

The body must state:

- Issue #375 currently has governance rules but no executable Project SDD lint.
- The change adds `scripts/check-sdd.sh`, `scripts/sdd-lint-baseline.txt`, fixture tests, an independent CI job, and the matching `CLAUDE.md` local command.
- Inventory freshness is warning-only until the generator branch.
- No API, DB, product UI, dependency, ADR-034 decision, or inventory regeneration.
- Constitution check explicitly covers Test-First, Change Scope Discipline, CI/CD Quality Gates, Source of Truth, and both non-negotiable principles as not affected.
- PR split names Design/Specify, Propose, Red/Green, and CI/final groups; each remains single-purpose.

- [ ] **Step 2: Verify the proposal**

Run:

```bash
rg -n '^對應 Spec: specs/foundation/001-project-sdd-lint/spec.md$|^## Why$|^## What Changes$|FR-00[1-8]|Project SDD Lint|Constitution Check' openspec/changes/implement-project-sdd-lint/proposal.md
```

Expected: canonical path, structural headings, requirement range, and constitution check are present.

- [ ] **Step 3: Commit**

```bash
git add openspec/changes/implement-project-sdd-lint/proposal.md
git commit -m "docs: propose the project SDD lint change" -m "- **Link** the implementation change to the foundation-001 canonical contract.\n- **Bound** the lint, baseline, CI, and deferred inventory responsibilities."
```

---

### Task 4: Create the OpenSpec delta

**Files:**
- Create: `openspec/changes/implement-project-sdd-lint/specs/foundation/001-project-sdd-lint/spec.md`

**Interfaces:**
- Consumes: canonical FR-001–FR-008, AC-1.1–AC-4.1, SC-001–SC-006.
- Produces: OpenSpec scenarios used by QA acceptance.

- [ ] **Step 1: Write the delta**

Start with:

```markdown
## Purpose

Project SDD lint 的 derived capability；正典為 `specs/foundation/001-project-sdd-lint/spec.md` v1.0.0。本變更實作既有 FR-001–FR-008、AC-1.1–AC-4.1 與 SC-001–SC-006，不發明新 ID。

## ADDED Requirements
```

Add four `### Requirement:` blocks:

1. deterministic command and diagnostics — FR-001/FR-002; scenarios AC-1.1–AC-1.4.
2. task and source governance — FR-003/FR-005/FR-006; scenarios AC-2.1–AC-2.3.
3. ratchet baseline — FR-004/FR-007; scenarios AC-3.1–AC-3.3.
4. independent CI gate — FR-008; scenario AC-4.1.

Each scenario uses exact OpenSpec `#### Scenario:` plus `- **WHEN**` and `- **THEN**` syntax and cites its canonical IDs in the requirement paragraph.

- [ ] **Step 2: Run schema validation after all OpenSpec artifacts exist**

Defer the command to Task 7 because OpenSpec change validation also expects design/tasks context.

- [ ] **Step 3: Commit**

```bash
git add openspec/changes/implement-project-sdd-lint/specs/foundation/001-project-sdd-lint/spec.md
git commit -m "docs: add the project SDD lint delta" -m "- **Translate** the canonical lint, task, baseline, and CI contracts into OpenSpec scenarios.\n- **Preserve** exact FR, AC, and SC traceability without inventing identifiers."
```

---

### Task 5: Create the OpenSpec technical design

**Files:**
- Create: `openspec/changes/implement-project-sdd-lint/design.md`

**Interfaces:**
- Consumes: approved superpowers design and canonical IDs.
- Produces: Bash/data-flow contract used by Green implementation.

- [ ] **Step 1: Write design.md in Traditional Chinese**

Include these exact sections and decisions:

```markdown
# Design: implement-project-sdd-lint

## Context（脈絡）
## Goals / Non-Goals
## Command contract
## Diagnostic pipeline
## Ratchet baseline algorithm
## Rule matrix
## Scan boundaries
## CI integration
## TDD and evidence
## Error handling
## Constitution Check（憲法檢查）
```

The technical data flow must be:

```text
resolve root/config
→ collect strict diagnostics
→ collect baseline-eligible diagnostics
→ validate/sort baseline
→ comm actual vs baseline for new/stale entries
→ collect warning-only diagnostics
→ stable sort/render
→ exit 0/1/2
```

State Bash 3.2 limitations, normalized TSV baseline, exact rule IDs from the approved design, historical exclusions, the always-visible inventory warning, and the separate CI job. Do not duplicate the full governance wording; link canonical sources.

- [ ] **Step 2: Verify no unresolved design language**

Run:

```bash
if rg -n 'TBD|TODO|待決定|之後再說' openspec/changes/implement-project-sdd-lint/design.md; then exit 1; fi
```

Expected: exit `0` with no matches.

- [ ] **Step 3: Commit**

```bash
git add openspec/changes/implement-project-sdd-lint/design.md
git commit -m "docs: design the project SDD lint implementation" -m "- **Specify** the Bash-compatible diagnostic and baseline data flow.\n- **Separate** strict, ratcheted, warning-only, and CI responsibilities."
```

---

### Task 6: Create executable OpenSpec tasks

**Files:**
- Create: `openspec/changes/implement-project-sdd-lint/tasks.md`

**Interfaces:**
- Consumes: delta scenarios and design interfaces.
- Produces: task IDs used for Red/Green evidence and main-owned checkboxes.

- [ ] **Step 1: Write tasks.md**

Use these PR groups and one-file tasks:

```markdown
# Tasks: implement-project-sdd-lint

## 1. PR-SDD-LINT-RED — Fixture contract

**故事目標**：以 SC-001、SC-002、SC-003 建立可證明 command、rule、baseline 與 warning contract 的預期失敗測試。

- [ ] 1.1 修改 `scripts/speckit-tests.sh`，加入 passing、strict mutation、task ownership、retired command、baseline 與 warning fixtures；提交後執行 `bash scripts/speckit-tests.sh`，預期因 `scripts/check-sdd.sh` 不存在而失敗，並記錄該 expected failure。 `[@senior-qa]`

## 2. PR-SDD-LINT-GREEN — Baseline and lint engine

**故事目標**：落實 SC-001–SC-004，使 Red contract 轉綠並保持零 dependency。

- [ ] 2.1 建立 `scripts/sdd-lint-baseline.txt`，只收錄目前 12 個缺 `## 功能目標`、shared-018 缺 `## 規格相依性` 與 `## Prototype Traceability` 的 14 筆排序 legacy entries；驗證格式無重複且路徑存在。 `[@senior-devops]`
- [ ] 2.2 建立 Bash 3.2-compatible `scripts/check-sdd.sh`，實作 FR-001–FR-007，使 committed Red contract 全綠；驗證 `bash -n scripts/check-sdd.sh scripts/speckit-tests.sh`、`bash scripts/speckit-tests.sh` 與 `scripts/check-sdd.sh` exit `0`。 `[@senior-devops]`

## 3. PR-SDD-LINT-CI — Independent CI gate

**故事目標**：落實 SC-005，以獨立 CI job 與相同本地 command 曝露 Project SDD lint。

- [ ] 3.1 修改 `scripts/speckit-tests.sh`，加入獨立 CI job 的 contract test；提交後執行 `bash scripts/speckit-tests.sh`，預期因 `sdd-lint` job 尚不存在而失敗，並記錄 expected failure。 `[@senior-qa]`
- [ ] 3.2 修改 `.github/workflows/ci.yml`，新增不依賴 app installs 的 top-level `sdd-lint` job，display name 為 `Project SDD Lint` 且只 checkout + 執行 `scripts/check-sdd.sh`；使 committed CI Red contract 轉綠。 `[@senior-devops]`
- [ ] 3.3 修改 `CLAUDE.md` Verification Commands，加入 project-root `scripts/check-sdd.sh`，保持 OpenSpec command 為獨立 gate；使用者已於 2026-08-26 明確授權。 `[@main]`

## 4. Final verification and archive

**故事目標**：以 SC-001–SC-006 完成四個 gate 的獨立 evidence、write-back 與誠實的 Issue #375 checkbox 更新。

- [ ] 4.1 執行 `bash -n scripts/check-sdd.sh scripts/speckit-tests.sh`、`bash scripts/speckit-tests.sh`、`scripts/check-sdd.sh`、`scripts/check-spec-artifacts.sh`、`openspec validate --changes --no-interactive`、`git diff --check`，並逐命令記錄 exit `0`；inventory warning 必須可見且不得宣稱已驗證 freshness。 `[@main]`
- [ ] 4.2 執行 Source-Verify 與 `/opsx:archive` write-back；更新 canonical spec version/Changelog 與 derived view。`foundation-001` 依核准的 umbrella exception 保留 active path、STATUS 在 final merge 後設 `done`，直到 Issue #375 全部子工作流完成才移動。 `[@main]`
```

Add dependency notes: 1.1 → 2.1 → 2.2 → 3.1 → 3.2 → 3.3 → 4.1 → 4.2. No implementation tasks are parallel because they consume the same committed Red/baseline contract.

- [ ] **Step 2: Verify task grammar manually**

Run:

```bash
rg -n '^## [1-4]\.|\*\*故事目標\*\*|^- \[ \].*\[@[^]]+\]$' openspec/changes/implement-project-sdd-lint/tasks.md
```

Expected: four groups, four story goals, every task ends with exactly one assignee.

- [ ] **Step 3: Commit**

```bash
git add openspec/changes/implement-project-sdd-lint/tasks.md
git commit -m "docs: plan the project SDD lint tasks" -m "- **Separate** committed Red, baseline, Green, CI, and archive responsibilities.\n- **Assign** every one-file task to one explicit owner with verifiable gates."
```

---

### Task 7: Open the change and pass proposal gates

**Files:**
- Modify: `specs/STATUS.md`

**Interfaces:**
- Consumes: complete OpenSpec change folder.
- Produces: STATUS `change-open` state and Gate 1–2 evidence for the required user checkpoint.

- [ ] **Step 1: Update STATUS**

Change only the `foundation-001` row status from `spec-ready` to `change-open`, retain branch `feat/issue-375-sdd-lint`, and note OpenSpec change `implement-project-sdd-lint`. Add a newest changelog row recording `/opsx:propose` completion.

- [ ] **Step 2: Run Gate 1 — OpenSpec schema validation**

Run:

```bash
openspec validate --changes --no-interactive
```

Expected: `implement-project-sdd-lint` passes with zero failed changes.

- [ ] **Step 3: Run Gate 2 — manual Project SDD lint evidence**

Because production tooling does not exist yet, run:

```bash
scripts/check-spec-artifacts.sh
rg -n '^## 功能目標$|^## 規格相依性$|FR-00[1-8]|AC-[1-4]\.|SC-00[1-6]' specs/foundation/001-project-sdd-lint/spec.md
rg -n '^對應 Spec: specs/foundation/001-project-sdd-lint/spec.md$|\[@(senior-qa|senior-devops|main)\]$|\*\*故事目標\*\*' openspec/changes/implement-project-sdd-lint/proposal.md openspec/changes/implement-project-sdd-lint/tasks.md
```

Expected: artifact sync passes; canonical IDs/headings and task ownership evidence are all present.

- [ ] **Step 4: Commit**

```bash
git add specs/STATUS.md
git commit -m "docs: open the project SDD lint change" -m "- **Advance** foundation-001 to change-open after proposal artifacts are complete.\n- **Record** the active change and branch in the canonical status index."
```

- [ ] **Step 5: User checkpoint**

Main reports Gate 1 and Gate 2 separately, links `proposal.md`, `design.md`, `tasks.md`, and stops until the user explicitly approves `/opsx:apply`.

---
