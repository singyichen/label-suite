---
功能分支: feat/issue-375-sdd-lint
建立日期: 2026-08-26
版本: 1.1.0
狀態: Draft
---

# 功能規格：Project SDD Lint

## 功能目標

讓維護者與開發 agent 能以一個離線、可重複執行的命令，在 PR 合併前偵測 SDD 文件、STATUS、OpenSpec task ownership 與 retired guidance 的新漂移；同時以 ratchet baseline 隔離既有文件債務，避免未完成的 cleanup 阻斷所有開發。

**需求來源**：GitHub issue #375、PR #387 與 `docs/superpowers/specs/2026-08-26-issue-375-sdd-lint-design.md`。

## 已釐清事項

- OpenSpec schema validation、Project SDD lint、code/test gates、Source-Verify + write-back/archive 是四個獨立 gate。
- Default mode 阻擋 strict violations 與 baseline 新增/過期；`--strict` 額外阻擋 baseline-eligible debt。
- 已生成的 `design/system/screen-inventory.md` freshness 由 Project SDD lint 組合既有 generator `--check` 作為 blocking rule；ADR-034 E2E path、goal 語意一致性與 GitHub PR 外部狀態在本版只提供 warning。
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

PR 上以 `Project SDD Lint` 獨立 job 顯示結果，本地使用相同 command，並以 blocking rule 驗證已生成的 `design/system/screen-inventory.md` 是否與生成來源一致。

**此優先級原因**：合併到 generic validation 會重新製造 Issue #375 要消除的 gate 邊界混淆；只提供 warning 也無法阻止 generated screen inventory 漂移。
**獨立測試方式**：檢查 CI YAML 與本地 command 文字契約，並以 fresh、stale 與 configuration fixtures 驗證 generator exit mapping。

**驗收情境**：

1. **AC-4.1**：**Given** resolved target root 的 `node scripts/gen-screen-inventory.mjs --check` exit `0`，**When** Project SDD lint 執行 inventory freshness rule，**Then** 不輸出 inventory diagnostic，且 lint outcome 依其他 rules 決定。
2. **AC-4.2**：**Given** resolved target root 的 generator `--check` exit `1`，**When** Project SDD lint 執行 inventory freshness rule，**Then** 輸出 `ERROR [INVENTORY_FRESHNESS] design/system/screen-inventory.md: ...`，且 lint exit `1`，除非其他 scanner configuration error 要求 exit `2`。
3. **AC-4.3**：**Given** resolved target root 缺少 `scripts/gen-screen-inventory.mjs`、執行環境缺少 Node、generator exit `2` 或回傳 `1` 以外的任何 unexpected nonzero，**When** Project SDD lint 執行 inventory freshness rule，**Then** 輸出 `ERROR [INVENTORY_CHECK_CONFIG] scripts/gen-screen-inventory.mjs: ...` 且 lint exit `2`。

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
- **FR-009**：系統必須使用 resolved target root 執行 `node "$repo_root/scripts/gen-screen-inventory.mjs" --check`，不得使用 caller checkout；必須 capture 且 suppress generator raw output，並以穩定 Project SDD lint diagnostic 與 summary 映射 exit `0` 為無 inventory diagnostic、exit `1` 為 blocking `INVENTORY_FRESHNESS`、exit `2` 或其他 unexpected nonzero 為 `INVENTORY_CHECK_CONFIG` configuration error；缺少 generator 或 Node 亦必須映射為 `INVENTORY_CHECK_CONFIG` 與 lint exit `2`，且 `--strict` 不得改變 inventory severity。

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
- **SC-006**：fresh、stale 與 configuration inventory fixtures 必須分別驗證無 inventory diagnostic/exit 依其他 rules、`INVENTORY_FRESHNESS`/exit `1`、`INVENTORY_CHECK_CONFIG`/exit `2`，且 real repository `node scripts/gen-screen-inventory.mjs --check` 必須 exit `0` 作為 `design/system/screen-inventory.md` freshness 證據。
- **SC-007**：Issue #375 handoff 只勾選實際交付的七個 D 子項，以及 combined acceptance `CI 或本地單一命令可偵測 STATUS drift、retired path、規格必要段落與 inventory stale。`；inventory workstream C 與其他 acceptance items 在本 workflow 中保持不變。

## 範圍外（Out of Scope）*(必填)*

- Inventory manifest 與 `scripts/gen-screen-inventory.mjs` 實作或修改、HTML/Markdown regeneration、hand-maintained `design/system/inventory.md` 的生成契約，以及 `design-inventory.dc.html` coverage。
- 17 份 canonical specs 的批次 heading/link cleanup。
- ADR-034 acceptance 或 E2E path migration。
- GitHub branch protection mutation、產品 runtime、API、DB、frontend 與 backend behavior。

## Changelog

| 版本 | 日期 | 變更摘要 |
|---|---|---|
| 1.1.0 | 2026-08-26 | 將 generated `design/system/screen-inventory.md` freshness 納入 blocking Project SDD lint，定義 fresh、stale 與 configuration exit/diagnostic 契約 |
| 1.0.0 | 2026-08-26 | 建立 Project SDD lint command、ratchet baseline、task/Source-Verify/retired guidance rules與獨立 CI gate 的 canonical contract |
