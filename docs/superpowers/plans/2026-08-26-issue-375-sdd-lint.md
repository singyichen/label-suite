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
- `scripts/check-sdd.sh` must run on macOS Bash 3.2 and Ubuntu Bash; do not use associative arrays, `mapfile`, `readarray`, `grep -P`, `sed -r`, GNU-only flags, Python, Bats, Node-based scanner logic, or new dependencies。唯一 Node boundary 是呼叫 resolved target root 的既有 `scripts/gen-screen-inventory.mjs --check`。
- Default mode uses the ratchet baseline; `--strict` promotes baseline-eligible violations only. E2E path decision, semantic goal review, and external PR state remain warning-only；inventory freshness 則依 canonical v1.1.1 的 exact-sentinel contract 在 default／`--strict` 皆保持 blocking。
- `scripts/check-sdd.sh`, `openspec validate --changes --no-interactive`, and affected code/test commands are never presented as equivalents.
- The user explicitly authorized this workstream to modify protected `CLAUDE.md` on 2026-08-26.
- ADR-034 remains Proposed; no root E2E path migration occurs here.
- Inventory generator／manifest implementation 已由既有 upstream workstream 交付，本計畫只組合其 `--check` contract，不修改 generator、manifest 或 source-set authority。合併 upstream source additions 後，本 branch 曾以既有 generator 刷新 generated `design/system/screen-inventory.md`，使 real-repository `--check` 維持 current；不宣稱 `design/system/inventory.md` 或 `design-inventory.dc.html` 也受生成或 freshness 驗證。
- Each PR group stays within ≤5 non-test files and ≤300 non-test diff lines, or stops at the maintainer checkpoint before opening the PR.
- Every commit command in this plan must include the repository-required `Co-Authored-By: OpenAI Codex GPT-5.6 <noreply@openai.com>` trailer in addition to the listed subject and action bullets.

---

### Task 1: Create the canonical Project SDD Lint specification

**Files:**
- Create: `specs/foundation/001-project-sdd-lint/spec.md`

**Interfaces:**
- Consumes: Issue #375 and the approved design document.
- Produces: stable IDs `FR-001`–`FR-009`, `AC-1.1`–`AC-4.3`, and `SC-001`–`SC-007` used verbatim by the OpenSpec delta and implementation tasks.

- [ ] **Step 1: Write the canonical spec**

Create the file with this exact contract and no placeholder text:

```markdown
---
功能分支: feat/issue-375-sdd-lint
建立日期: 2026-08-26
版本: 1.1.1
狀態: Draft
---

# 功能規格：Project SDD Lint

## 功能目標

讓維護者與開發 agent 能以一個離線、可重複執行的命令，在 PR 合併前偵測 SDD 文件、STATUS、OpenSpec task ownership 與 retired guidance 的新漂移；同時以 ratchet baseline 隔離既有文件債務，避免未完成的 cleanup 阻斷所有開發。

**需求來源**：GitHub issue #375、PR #387 與 `docs/superpowers/specs/2026-08-26-issue-375-sdd-lint-design.md`。

## 已釐清事項

- OpenSpec schema validation、Project SDD lint、code/test gates、Source-Verify + write-back/archive 是四個獨立 gate。
- Default mode 阻擋 strict violations 與 baseline 新增/過期；`--strict` 額外阻擋 baseline-eligible debt。
- Generated `design/system/screen-inventory.md` freshness 由 Project SDD lint 組合既有 generator `--check` 作為 blocking rule；ADR-034 E2E path、goal 語意一致性與 GitHub PR 外部狀態在本版只提供 warning。
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

### 使用者故事 4 — 獨立 CI 與 generated screen inventory freshness（優先級：P2）

PR 上以 `Project SDD Lint` 獨立 job 顯示結果，本地使用相同 command，並以 blocking rule 驗證 generated `design/system/screen-inventory.md` 是否與生成來源一致。

**此優先級原因**：合併到 generic validation 會重新製造 Issue #375 要消除的 gate 邊界混淆；只提供 warning 也無法阻止 generated screen inventory 漂移。
**獨立測試方式**：檢查 CI YAML 與本地 command 文字契約，並以 fresh、stale 與 configuration fixtures 驗證 generator exit mapping。

**驗收情境**：

1. **AC-4.1**：**Given** resolved target root 的 `node scripts/gen-screen-inventory.mjs --check` exit `0`，**When** Project SDD lint 執行 inventory freshness rule，**Then** 不輸出 inventory diagnostic，且 lint outcome 依其他 rules 決定。
2. **AC-4.2**：**Given** generator `--check` exit `1`，且 captured combined output 在 command substitution 移除 trailing newlines 後整體恰好等於 sentinel `design/system/screen-inventory.md is stale — run: node scripts/gen-screen-inventory.mjs`，**When** lint 執行，**Then** 輸出 `ERROR [INVENTORY_FRESHNESS] design/system/screen-inventory.md: ...` 並以 exit `1` 阻擋，除非其他 scanner configuration error 要求 exit `2`。
3. **AC-4.3**：**Given** generator 或 Node 缺少、generator 無法讀取／load／執行、exit `2`、exit `1` 但未伴隨 exact sentinel，或任何其他 unexpected result，**When** lint 執行，**Then** suppress child raw output、輸出 `ERROR [INVENTORY_CHECK_CONFIG] scripts/gen-screen-inventory.mjs: ...` 並以 exit `2` 結束。

## 需求規格 *(必填)*

### 功能需求

- **FR-001**：系統必須提供 `scripts/check-sdd.sh [--strict] [repo-root]`；未指定 root 時從 script path 解析 repository，指定 root 時不得掃描 caller checkout。
- **FR-002**：系統必須輸出 `ERROR|WARNING [RULE_ID] relative/path: message` 格式的排序診斷與固定 summary；exit `0` 表示無 blocking error、exit `1` 表示 governance violation、exit `2` 表示 usage 或 scanner configuration error。
- **FR-003**：系統必須 strict 驗證 active OpenSpec change 的 canonical path、STATUS stage、必要 headings、FR/SC/AC Source-Verify 與新/變更 canonical spec。
- **FR-004**：系統必須以排序、唯一、無 glob 的 `scripts/sdd-lint-baseline.txt` ratchet legacy spec/status debt；new、stale、duplicate、unsorted 或不允許 rule 都必須失敗。
- **FR-005**：系統必須驗證 tasks 的結尾 assignee、agent existence、User Story `**故事目標**` + SC ID、Red owner、允許的 one-file exceptions 與可明確判斷的 file ownership。
- **FR-006**：系統必須在 active governance consumers 與 active OpenSpec artifacts 阻擋 repository-local `npm test`、`npm run`、將 `/ui-ux-pro-max` 當 pipeline stage，以及非歷史內容的 `/speckit.analyze`；不得把 `pnpm` 誤判為 `npm`。
- **FR-007**：系統必須將 goal semantic review、ordinary task file-count ambiguity、runtime Red evidence、GitHub PR state 與 ADR-034 E2E path 標為 warning-only；`--strict` 不得將明確 deferred warning 升級。
- **FR-008**：CI 必須以獨立 `Project SDD Lint` job 執行 `scripts/check-sdd.sh`，`CLAUDE.md` 必須列出相同本地命令；job 不得包裝或取代 `openspec validate`。
- **FR-009**：系統必須從 resolved target root 執行 `node "$repo_root/scripts/gen-screen-inventory.mjs" --check`，capture 且 suppress child raw output；只將 exit `1` 加上 whole-output exact sentinel 映射為 blocking `INVENTORY_FRESHNESS`／exit `1`，其餘缺少、不可執行、sentinel-less 或 unexpected result 一律映射為 `INVENTORY_CHECK_CONFIG`／exit `2`，且 `--strict` 不改變 inventory severity。

## 規格相依性

### 上游（本規格依賴的規格）

| 規格編號 | 功能 | 本規格需要的內容 |
|---|---|---|
| foundation-000 | Foundation — 工程基準與共同約束 | CI、deterministic tooling、local/CI parity 與 single-purpose PR 基線 |
| Issue #375 inventory generator | 可再生 generated screen inventory | `scripts/gen-screen-inventory.mjs --check` 對 `design/system/screen-inventory.md` 的已交付契約：byte-current exit `0`、stale exit `1`、manifest/source validation failure exit `2` |

### 下游（依賴本規格的規格）

| 規格編號 | 功能 | 依賴本規格的內容 |
|---|---|---|
| Issue #375 spec cleanup | Canonical traceability cleanup | baseline entries 逐步歸零與 `--strict` 證據 |

## 成功標準 *(必填)*

- **SC-001**：passing fixture 在 default mode exit `0`；每個 strict mutation 以正確 rule ID exit `1`；usage/config error exit `2`。
- **SC-002**：baseline exact/new/stale/duplicate/unsorted/strict fixtures 全部通過，且 real repository default lint 不增加既有 debt。
- **SC-003**：`bash -n scripts/check-sdd.sh scripts/speckit-tests.sh` 與 `bash scripts/speckit-tests.sh` exit `0`，且 Red commit 的 expected missing-command failure 可定位。
- **SC-004**：`scripts/check-sdd.sh` 在 macOS Bash 3.2-compatible syntax 與 Ubuntu CI 執行，不增加 package dependency。
- **SC-005**：CI 具有獨立 `Project SDD Lint` job，且 OpenSpec schema command 仍被文件化為另一個 gate。
- **SC-006**：fresh、exit `1` + exact stale sentinel、unrunnable／sentinel-less exit `1` 與其他 configuration inventory fixtures 分別驗證無 inventory diagnostic、`INVENTORY_FRESHNESS`／exit `1`、`INVENTORY_CHECK_CONFIG`／exit `2`；real repository `node scripts/gen-screen-inventory.mjs --check` 必須 exit `0`。
- **SC-007**：Issue #375 交接只勾選實際交付的六個 D 子項：正典標題、STATUS/stage、Source-Verify、task 單檔／例外、assignee／file ownership 與 design inventory freshness；inventory workstream C、baseline-zero cleanup 與其他 acceptance items 保持不變。複合 D checkbox `阻擋 retired path/command，例如 npm、舊 frontend/tests/ E2E 路徑與不存在的 panels directory。` 與 combined acceptance `CI 或本地單一命令可偵測 STATUS drift、retired path、規格必要段落與 inventory stale。` 必須維持未勾選並延期，直到取得 ADR-034/path authority，並完成所列 filesystem paths 的 QA Red 與 production Green；本工作流不接受 ADR-034，亦不修改執行期程式碼。

## 範圍外（Out of Scope）*(必填)*

- Inventory manifest 與 `scripts/gen-screen-inventory.mjs` 的實作或修改、hand-maintained `design/system/inventory.md` 的生成契約，以及 `design-inventory.dc.html` coverage；本 branch 僅在合併 upstream source additions 後使用既有 generator 刷新 generated `design/system/screen-inventory.md`。
- 17 份 canonical specs 的批次 heading/link cleanup。
- ADR-034 acceptance 或 E2E path migration。
- GitHub branch protection mutation、產品 runtime、API、DB、frontend 與 backend behavior。

## Changelog

| 版本 | 日期 | 變更摘要 |
|---|---|---|
| 1.1.1 | 2026-08-27 | Stage 2 誠實交接修正：SC-007 僅宣告六個已交付 D 項目；複合 retired-path/command D 項目與 combined acceptance 維持延期，待 ADR-034/path authority、QA Red 與 named filesystem-path production Green 的獨立實作 |
| 1.1.0 | 2026-08-26 | 將 generated `design/system/screen-inventory.md` freshness 納入 blocking Project SDD lint，定義 fresh、stale 與 configuration exit/diagnostic 契約 |
| 1.0.0 | 2026-08-26 | 建立 Project SDD lint command、ratchet baseline、task/Source-Verify/retired guidance rules與獨立 CI gate 的 canonical contract |
```

- [ ] **Step 2: Verify the canonical spec contract**

Run:

```bash
rg -n '^## 功能目標$|^## 規格相依性$|FR-00[1-9]|AC-[1-4]\.|SC-00[1-7]' specs/foundation/001-project-sdd-lint/spec.md
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
| foundation-001 | Project SDD Lint | foundation | `spec-ready` | `feat/issue-375-sdd-lint` | spec v1.1.1；Issue #375 follow-up；command-line tooling，prototype／Frontend Ready Gate 不適用 |
```

Add the newest changelog row:

```markdown
| 2026-08-26 | `foundation-001` canonical spec 更新至 v1.1.0；加入 blocking generated screen inventory freshness、exact sentinel 與 configuration fail-closed contract。 |
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
- Consumes: `specs/foundation/001-project-sdd-lint/spec.md` FR-001–FR-009 and SC-001–SC-007.
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
- Inventory freshness 組合既有 generator 的 exact-sentinel contract，stale 為 blocking exit `1`，configuration boundary fail closed 為 exit `2`。
- No API, DB, product UI, dependency, ADR-034 decision, generator/manifest implementation, or other inventory-view generation contract；合併 upstream source additions 後只以既有 generator 刷新 generated `design/system/screen-inventory.md`。
- Constitution check explicitly covers Test-First, Change Scope Discipline, CI/CD Quality Gates, Source of Truth, and both non-negotiable principles as not affected.
- PR split names Design/Specify, Propose, Red/Green, and CI/final groups; each remains single-purpose.

- [ ] **Step 2: Verify the proposal**

Run:

```bash
rg -n '^對應 Spec: specs/foundation/001-project-sdd-lint/spec.md$|^## Why$|^## What Changes$|FR-00[1-9]|Project SDD Lint|Constitution Check' openspec/changes/implement-project-sdd-lint/proposal.md
```

Expected: canonical path, structural headings, requirement range, and constitution check are present.

- [ ] **Step 3: Commit**

```bash
git add openspec/changes/implement-project-sdd-lint/proposal.md
git commit -m "docs: propose the project SDD lint change" -m "- **Link** the implementation change to the foundation-001 canonical contract.\n- **Bound** the lint, baseline, CI, and existing inventory-generator integration responsibilities."
```

---

### Task 4: Create the OpenSpec delta

**Files:**
- Create: `openspec/changes/implement-project-sdd-lint/specs/foundation/001-project-sdd-lint/spec.md`

**Interfaces:**
- Consumes: canonical FR-001–FR-009, AC-1.1–AC-4.3, SC-001–SC-007.
- Produces: OpenSpec scenarios used by QA acceptance.

- [ ] **Step 1: Write the delta**

Start with:

```markdown
## Purpose

Project SDD lint 的 derived capability；正典為 `specs/foundation/001-project-sdd-lint/spec.md` v1.1.1。本變更實作既有 FR-001–FR-009、AC-1.1–AC-4.3 與 SC-001–SC-007，不發明新 ID。

## ADDED Requirements
```

Add four `### Requirement:` blocks:

1. deterministic command and diagnostics — FR-001/FR-002; scenarios AC-1.1–AC-1.4.
2. task and source governance — FR-003/FR-005/FR-006; scenarios AC-2.1–AC-2.3.
3. ratchet baseline — FR-004/FR-007; scenarios AC-3.1–AC-3.3.
4. independent CI gate and generated screen inventory freshness — FR-008/FR-009; scenarios AC-4.1–AC-4.3.

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
→ run target-root inventory check and capture child output/status
→ map exact-sentinel stale/configuration results
→ stable sort/render
→ select exit 2 > 1 > 0
```

State Bash 3.2 limitations, normalized TSV baseline, exact rule IDs from the approved design, historical exclusions, the exact-sentinel blocking inventory mapping, and the separate CI job. Do not duplicate the full governance wording; link canonical sources.

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

**故事目標**：以 SC-001–SC-003 與 SC-006 建立可證明 command、rule、baseline、warning 與 blocking inventory contract 的預期失敗測試。

- [ ] 1.1 修改 `scripts/speckit-tests.sh`，加入 passing、strict mutation、task ownership、retired command、baseline 與 inventory fresh／exact-sentinel stale／configuration fixtures；提交後執行 `bash scripts/speckit-tests.sh`，預期因 `scripts/check-sdd.sh` 不存在而失敗，並記錄該 expected failure。 `[@senior-qa]`

## 2. PR-SDD-LINT-GREEN — Baseline and lint engine

**故事目標**：落實 SC-001–SC-004，使 Red contract 轉綠並保持零 dependency。

- [ ] 2.1 建立 `scripts/sdd-lint-baseline.txt`，只收錄目前 12 個缺 `## 功能目標`、shared-018 缺 `## 規格相依性` 與 `## Prototype Traceability` 的 14 筆排序 legacy entries；驗證格式無重複且路徑存在。 `[@senior-devops]`
- [ ] 2.2 建立 Bash 3.2-compatible `scripts/check-sdd.sh`，實作 FR-001–FR-009，使 committed Red contract 全綠；驗證 `bash -n scripts/check-sdd.sh scripts/speckit-tests.sh`、`bash scripts/speckit-tests.sh`、`scripts/check-sdd.sh` 與 `node scripts/gen-screen-inventory.mjs --check` exit `0`。 `[@senior-devops]`

## 3. PR-SDD-LINT-CI — Independent CI gate

**故事目標**：落實 SC-005，以獨立 CI job 與相同本地 command 曝露 Project SDD lint。

- [ ] 3.1 修改 `scripts/speckit-tests.sh`，加入獨立 CI job 的 contract test；提交後執行 `bash scripts/speckit-tests.sh`，預期因 `sdd-lint` job 尚不存在而失敗，並記錄 expected failure。 `[@senior-qa]`
- [ ] 3.2 修改 `.github/workflows/ci.yml`，新增不依賴 app installs 的 top-level `sdd-lint` job，display name 為 `Project SDD Lint` 且只 checkout + 執行 `scripts/check-sdd.sh`；使 committed CI Red contract 轉綠。 `[@senior-devops]`
- [ ] 3.3 修改 `CLAUDE.md` Verification Commands，加入 project-root `scripts/check-sdd.sh`，保持 OpenSpec command 為獨立 gate；使用者已於 2026-08-26 明確授權。 `[@main]`

## 4. Final verification and archive

**故事目標**：以 SC-001–SC-007 完成四個 gate 的獨立 evidence、write-back 與誠實的 Issue #375 checkbox 更新。

- [ ] 4.1 執行 `bash -n scripts/check-sdd.sh scripts/speckit-tests.sh`、`bash scripts/speckit-tests.sh`、`scripts/check-sdd.sh`、`node scripts/gen-screen-inventory.mjs --check`、`scripts/check-spec-artifacts.sh`、`openspec validate --changes --no-interactive`、Source-Verify 與 `git diff --check`，並逐命令記錄 exit `0`；lint output 不得含 retired `INVENTORY_FRESHNESS_UNVERIFIED`。 `[@main]`
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
rg -n '^## 功能目標$|^## 規格相依性$|FR-00[1-9]|AC-[1-4]\.|SC-00[1-7]' specs/foundation/001-project-sdd-lint/spec.md
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

### Task 8: Commit the Red fixture contract

**Files:**
- Modify: `scripts/speckit-tests.sh`

**Interfaces:**
- Consumes: FR-001–FR-009 and AC-1.1–AC-4.3.
- Produces: committed Red contract consumed unchanged by Task 10.

- [ ] **Step 1: Add hermetic fixtures**

Add `make_sdd_repo`, `run_check_sdd`, `assert_command_fails_with`, and individual tests with these exact names:

```bash
test_check_sdd_passes_for_valid_repo
test_check_sdd_uses_explicit_repo_root
test_check_sdd_fails_for_missing_goal_heading
test_check_sdd_fails_for_active_change_stage_drift
test_check_sdd_fails_for_missing_source_id
test_check_sdd_fails_for_invalid_assignee
test_check_sdd_fails_for_incomplete_exception
test_check_sdd_fails_for_wrong_red_owner
test_check_sdd_fails_for_retired_command
test_check_sdd_does_not_match_pnpm
test_check_sdd_accepts_exact_legacy_baseline
test_check_sdd_fails_for_new_baseline_violation
test_check_sdd_fails_for_stale_baseline_entry
test_check_sdd_fails_for_duplicate_or_unsorted_baseline
test_check_sdd_strict_promotes_baseline_debt
test_check_sdd_inventory_fresh_has_no_diagnostic
test_check_sdd_inventory_exact_stale_sentinel_is_blocking
test_check_sdd_inventory_configuration_failures_exit_two
test_check_sdd_inventory_does_not_emit_retired_warning
```

`make_sdd_repo` creates only synthetic files under `$TMP_ROOT`, including agent stubs, a valid foundation-001 spec, STATUS row, active proposal/delta/tasks, and a fixture-local baseline. New tests must store captures below `$TMP_ROOT`, never fixed `/tmp/check-sdd.*` paths.

- [ ] **Step 2: Verify Red**

Run: `bash scripts/speckit-tests.sh`

Expected: nonzero with an explicit message that `scripts/check-sdd.sh` is missing; existing speckit tests before the new check remain green.

- [ ] **Step 3: Commit Red evidence**

```bash
git add scripts/speckit-tests.sh
git commit -m "test: define the project SDD lint contract" -m "- **Add** hermetic fixtures for strict, ratcheted, task, retired-command, and warning behavior.\n- **Record** the expected missing-command Red failure before implementation."
```

Main records the commit SHA, exact command, exit code, and expected failure reason before checking OpenSpec task 1.1.

---

### Task 9: Add the initial legacy baseline

**Files:**
- Create: `scripts/sdd-lint-baseline.txt`

**Interfaces:**
- Consumes: current 17-spec audit.
- Produces: exact sorted debt set consumed by Task 10.

- [ ] **Step 1: Create the sorted 14-entry TSV baseline**

Use one real tab between fields and these stable details:

```text
LEGACY_SPEC_HEADING\tspecs/account/001-login-email-password/spec.md\tmissing:## 功能目標
LEGACY_SPEC_HEADING\tspecs/account/002-login-google-sso/spec.md\tmissing:## 功能目標
LEGACY_SPEC_HEADING\tspecs/account/003-register-email-password/spec.md\tmissing:## 功能目標
LEGACY_SPEC_HEADING\tspecs/account/004-forgot-reset-password/spec.md\tmissing:## 功能目標
LEGACY_SPEC_HEADING\tspecs/account/005-profile-settings/spec.md\tmissing:## 功能目標
LEGACY_SPEC_HEADING\tspecs/admin/006-user-management/spec.md\tmissing:## 功能目標
LEGACY_SPEC_HEADING\tspecs/admin/007-role-settings/spec.md\tmissing:## 功能目標
LEGACY_SPEC_HEADING\tspecs/annotation/015-annotation-workspace/spec.md\tmissing:## 功能目標
LEGACY_SPEC_HEADING\tspecs/dataset/017-dataset-analysis-detail/spec.md\tmissing:## 功能目標
LEGACY_SPEC_HEADING\tspecs/shared/008-sidebar-navbar-shared/spec.md\tmissing:## 功能目標
LEGACY_SPEC_HEADING\tspecs/shared/018-help-button/spec.md\tmissing:## Prototype Traceability
LEGACY_SPEC_HEADING\tspecs/shared/018-help-button/spec.md\tmissing:## 功能目標
LEGACY_SPEC_HEADING\tspecs/shared/018-help-button/spec.md\tmissing:## 規格相依性
LEGACY_SPEC_HEADING\tspecs/task-management/014-task-detail/spec.md\tmissing:## 功能目標
```

- [ ] **Step 2: Verify the baseline mechanically**

Run:

```bash
test "$(wc -l < scripts/sdd-lint-baseline.txt | tr -d ' ')" = 14
test -z "$(sort scripts/sdd-lint-baseline.txt | uniq -d)"
LC_ALL=C sort -c scripts/sdd-lint-baseline.txt
```

Expected: all commands exit `0`.

- [ ] **Step 3: Commit**

```bash
git add scripts/sdd-lint-baseline.txt
git commit -m "chore: record the SDD lint legacy baseline" -m "- **Capture** the fourteen known heading and traceability violations as exact paths.\n- **Prevent** baseline globbing, duplication, and silent debt expansion."
```

---

### Task 10: Implement the Project SDD lint command

**Files:**
- Create: `scripts/check-sdd.sh`

**Interfaces:**
- Consumes: `scripts/sdd-lint-baseline.txt`, `scripts/check-spec-artifacts.sh`, active repository artifacts.
- Produces: `scripts/check-sdd.sh [--strict] [repo-root]` with exit codes 0/1/2 and stable diagnostics.

- [ ] **Step 1: Create the Bash entry point**

Use `set -euo pipefail`, TMPDIR `mktemp -d`, and EXIT cleanup. Implement these focused functions:

```bash
usage
emit_error RULE PATH MESSAGE
emit_warning RULE PATH MESSAGE
require_layout
collect_status_artifact_sync
collect_spec_heading_diagnostics
collect_active_change_diagnostics
collect_task_diagnostics
collect_retired_command_diagnostics
validate_baseline
apply_baseline_ratchet
collect_deferred_warnings
collect_inventory_diagnostic
render_diagnostics
```

Store strict, eligible, warnings, and final diagnostics in temp files. Normalize eligible keys as tab-separated `rule/path/detail`; compare sorted actual and baseline with `comm -23` for new entries and `comm -13` for stale entries. Treat duplicate/unsorted/unknown baseline rule as exit `2` configuration error. Use `LC_ALL=C` for every sort/comm.

Required parser details:

- canonical specs: `find "$ROOT/specs" -mindepth 3 -maxdepth 3 -path '*/[0-9][0-9][0-9]-*/spec.md' -print`.
- active changes: `find "$ROOT/openspec/changes" -mindepth 2 -maxdepth 2 -name proposal.md` excluding `/archive/`.
- proposal canonical line: exact `對應 Spec: specs/.../spec.md`, exactly once.
- STATUS allowed states: `spec-ready|change-open|in-progress|review|done|archived|deferred`.
- active change canonical STATUS state: `change-open|in-progress|review` only.
- exact headings: `^## 功能目標$`, `^## 規格相依性(?: \*\([^)]*\)\*)?$`, and for non-foundation modules `^## Prototype Traceability$`.
- source IDs: portable ERE `(FR|SC|AC)-[[:alnum:]]+([.-][[:alnum:]]+)*`, exact whole-token lookup in canonical file.
- task assignee: every `^- \[[ xX]\]` line ends with exactly one `[@...]`; agent maps to `.claude/agents/<name>.md` or `main`.
- task exception IDs and three exact fields follow testing constitution; static ambiguous file count emits warning, not error.
- retired `npm` regex must require a non-alphanumeric boundary so `pnpm` stays legal.
- historical paths from the approved design are excluded.
- run resolved target root 的 `node "$ROOT/scripts/gen-screen-inventory.mjs" --check`，capture/suppress combined output；只有 exit `1` 且 normalized whole output 恰等於 `design/system/screen-inventory.md is stale — run: node scripts/gen-screen-inventory.mjs` 時輸出 blocking `INVENTORY_FRESHNESS`，所有 unavailable、unreadable、unloadable、unrunnable、sentinel-less 或 unexpected result 都輸出 `INVENTORY_CHECK_CONFIG` 並 exit `2`。

- [ ] **Step 2: Make the command executable**

Run: `chmod +x scripts/check-sdd.sh`

- [ ] **Step 3: Verify Green without changing the Red contract**

Run:

```bash
bash -n scripts/check-sdd.sh scripts/speckit-tests.sh
bash scripts/speckit-tests.sh
scripts/check-sdd.sh
node scripts/gen-screen-inventory.mjs --check
scripts/check-spec-artifacts.sh
```

Expected: all exit `0`; real repository inventory 沒有 diagnostic，且 lint output 不含 retired `INVENTORY_FRESHNESS_UNVERIFIED`。

- [ ] **Step 4: Commit**

```bash
git add scripts/check-sdd.sh
git commit -m "feat: add the project SDD lint command" -m "- **Enforce** active spec, status, task, source-ID, and retired-guidance contracts.\n- **Ratchet** legacy violations with stable Bash-compatible diagnostics and exit codes."
```

Main verifies Green evidence and only then checks OpenSpec tasks 2.1/2.2.

---

### Task 11: Commit the independent CI Red contract

**Files:**
- Modify: `scripts/speckit-tests.sh`

**Interfaces:**
- Consumes: SC-005 and the executable command from Task 10.
- Produces: a committed failing assertion consumed unchanged by Task 12.

- [ ] **Step 1: Add the CI contract test**

Add `test_check_sdd_ci_job_is_independent`. It parses `.github/workflows/ci.yml` as text and asserts all of the following without installing a YAML dependency:

- one top-level job ID `sdd-lint` exists;
- its display name is `Project SDD Lint`;
- its steps include `actions/checkout@v5` and `run: scripts/check-sdd.sh`;
- the job has no `needs:`, dependency-install step, OpenSpec command, or path-filter coupling.

The fixture must mutate a copied CI file under `$TMP_ROOT`, not the real workflow.

- [ ] **Step 2: Verify CI Red**

Run: `bash scripts/speckit-tests.sh`

Expected: nonzero with the exact assertion explaining that the independent `sdd-lint` job is missing; all command-level SDD lint tests remain green.

- [ ] **Step 3: Commit Red evidence**

```bash
git add scripts/speckit-tests.sh
git commit -m "test: define the SDD lint CI contract" -m "- **Require** an independent Project SDD Lint job with the root-local command.\n- **Record** the expected missing-job Red failure before workflow implementation."
```

Main records the commit SHA, command, exit code, and exact expected failure before checking OpenSpec task 3.1.

---

### Task 12: Add the independent CI job

**Files:**
- Modify: `.github/workflows/ci.yml`

**Interfaces:**
- Consumes: executable `scripts/check-sdd.sh`.
- Produces: top-level job ID `sdd-lint`, display name `Project SDD Lint`.

- [ ] **Step 1: Add the job after validate**

```yaml
  sdd-lint:
    name: Project SDD Lint
    runs-on: ubuntu-24.04
    steps:
      - uses: actions/checkout@v5
      - name: Check project SDD governance
        run: scripts/check-sdd.sh
```

Do not add `needs: validate`, dependency installation, OpenSpec validation, or path filters.

- [ ] **Step 2: Preserve the committed CI Red contract**

Do not edit `scripts/speckit-tests.sh` in this task. If the committed Red test does not cover the required name, command, and independence constraints, stop and return to the QA owner.

- [ ] **Step 3: Verify**

Run:

```bash
bash scripts/speckit-tests.sh
rg -n '^  sdd-lint:|name: Project SDD Lint|run: scripts/check-sdd.sh' .github/workflows/ci.yml
```

Expected: tests exit `0`; exactly one job/name/command match.

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add the project SDD lint gate" -m "- **Expose** Project SDD Lint as an independent pull-request job.\n- **Reuse** the same dependency-free command developers run locally."
```

---

### Task 13: Document the local CI-equivalent command

**Files:**
- Modify: `CLAUDE.md`

**Interfaces:**
- Consumes: CI job contract from Tasks 11–12.
- Produces: protected-file local command documentation authorized by the user.

- [ ] **Step 1: Add the command under Verification Commands**

Insert before backend commands:

```bash
# Project SDD lint (run from project root)
scripts/check-sdd.sh
```

Do not combine it with `openspec validate`, `/opsx:verify`, or other gates.

- [ ] **Step 2: Verify local/CI parity and boundary wording**

Run:

```bash
rg -n 'scripts/check-sdd.sh|Project SDD Lint|openspec validate --changes --no-interactive' CLAUDE.md .github/workflows/ci.yml docs/sdd-workflow.md
```

Expected: local and CI commands match; OpenSpec command remains separately named.

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: document the project SDD lint command" -m "- **Add** the root-local command that mirrors the independent CI job.\n- **Preserve** the documented boundary between SDD lint and OpenSpec validation."
```

---

### Task 14: Verify, review, archive, and update Issue #375

**Files:**
- Modify during final archive/write-back only: `specs/foundation/001-project-sdd-lint/spec.md`
- Modify after approved OpenSpec archive: paths produced by `openspec archive implement-project-sdd-lint --yes`
- Modify after final merge in a follow-up state commit: `specs/STATUS.md`

**Interfaces:**
- Consumes: all prior committed tasks.
- 產出：四個 gate 的證據、已審查的 final branch、v1.1.1 正典回寫、已 archive 的 OpenSpec change，以及 SC-007 定義的六個已交付 D 項目、複合 retired-path/command D 項目與 combined acceptance 的延期事實。

- [ ] **Step 1: Run fresh verification**

```bash
bash -n scripts/check-sdd.sh scripts/speckit-tests.sh
bash scripts/speckit-tests.sh
scripts/check-sdd.sh
node scripts/gen-screen-inventory.mjs --check
scripts/check-spec-artifacts.sh
openspec validate --changes --no-interactive
openspec validate implement-project-sdd-lint --strict --no-interactive
git diff --check origin/main...HEAD
```

Expected: every command exit `0`；real repository generator freshness current，Project SDD lint output 不含 inventory diagnostic 或 retired `INVENTORY_FRESHNESS_UNVERIFIED`，且其他 gate 仍分開報告。

- [ ] **Step 2: Run Source-Verify**

Extract every FR/SC/AC token in proposal、design、tasks 與 delta，verify exact presence in `specs/foundation/001-project-sdd-lint/spec.md` v1.1.1。另以 exact `rg`／`wc` 驗證 proposal path、Changelog、FR-009、AC-4.1–AC-4.3、SC-006–SC-007、`INVENTORY_FRESHNESS`／`INVENTORY_CHECK_CONFIG`、CI command 與 baseline count `14`；任何 missing citation 或 stale v1.0 instruction 都阻擋 archive。

- [ ] **Step 3: Run ordered reviews with subagents**

Run code review → QA Scenario acceptance → security review. Performance review is `N/A` because the command scans small repository text without runtime user traffic; record the reason. Resolve every Critical/High finding before proceeding.

- [ ] **Step 4: User checkpoint before final PR flow**

Report ordered review evidence and obtain explicit user confirmation before archive/PR.

- [ ] **Step 5: Archive and write back**

先執行 `openspec instructions apply --change implement-project-sdd-lint --json | jq -e '.progress.remaining == 0'`，再執行 repository-supported archive command。Archive 只可產生以下六個 logical artifacts：canonical v1.1.1 write-back、derived spec，以及 proposal／design／tasks／delta 四個 active-to-archive renames；不得包含 CI、`CLAUDE.md`、`specs/STATUS.md`、scripts 或其他 path。若實際 scope 不同，commit 前停在 maintainer scope-drift checkpoint。

Archive 後驗證 canonical version/Changelog、derived canonical path、逐一 FR/SC/AC citation，並確認 derived view 不含 `## ADDED Requirements`。Archive 不得把 FR-009、AC-4.1–AC-4.3、SC-006–SC-007 或 exact-sentinel blocking contract 降回 v1.0 warning-only 語意。

- [ ] **Step 6: Push/open PR and merge only with user authorization**

PR title/body are Traditional Chinese with an English Conventional Commit structural prefix. Do not mutate GitHub branch protection automatically; list `Project SDD Lint` as the check the maintainer should mark required.

- [ ] **Step 7: Update STATUS and Issue #375 after merge**

將 `foundation-001` 設為 `done`，並依核准的 Issue #375 umbrella 例外保留 active path。重新讀取已合併 `main` 的最新 Issue #375 內容後，只將下列六個已交付 D 項目更新為 checked：

1. `驗證 canonical spec 必要章節與精確標題。`
2. `驗證 STATUS、active change、branch、stage 一致性。`
3. `驗證 FR/SC/AC Source-Verify。`
4. `驗證 task one-file rule 與例外。`
5. `驗證 assignee 與 file ownership。`
6. `驗證 design inventory freshness。`

複合 D checkbox `阻擋 retired path/command，例如 npm、舊 frontend/tests/ E2E 路徑與不存在的 panels directory。` 與 combined acceptance `CI 或本地單一命令可偵測 STATUS drift、retired path、規格必要段落與 inventory stale。` 必須維持未勾選並延期。兩者需要另案的 ADR-034/path authority，以及所列 filesystem paths 的 QA Red 與 production Green；本工作流不接受 ADR-034，亦不修改執行期程式碼。更新前後逐項比對，inventory generator workstream C、baseline-zero cleanup 與所有其他 acceptance／inventory checkbox 必須保持原狀。

---

## Plan execution checkpoints

1. After Tasks 1–7: report Gate 1 and manual Gate 2 evidence; stop for explicit `/opsx:apply` approval.
2. After Task 8: report committed Red SHA and expected failure.
3. After Tasks 9–10: report Green commands and task review.
4. After Task 11: report committed CI Red SHA and expected failure.
5. After Tasks 12–13: report CI/local parity and group review.
6. Before Task 14 archive/PR: report ordered reviews and stop for explicit user confirmation.

Execution method is already chosen by the user: use `superpowers:subagent-driven-development`, with fresh implementer and reviewer agents, task briefs/reports, and a whole-branch review.
