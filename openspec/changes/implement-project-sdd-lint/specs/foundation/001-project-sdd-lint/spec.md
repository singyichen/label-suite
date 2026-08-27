## Purpose

Project SDD lint 的 derived capability；正典為 `specs/foundation/001-project-sdd-lint/spec.md` v1.1.2。本變更實作正典 FR-001–FR-009、AC-1.1–AC-4.4 與 SC-001–SC-008，包含 Stage 3 的 same-trust-root generator boundary 與 control-character pathname preflight。

## ADDED Requirements

### Requirement: 可重複執行的命令與診斷

本需求依正典 `specs/foundation/001-project-sdd-lint/spec.md` 的 FR-001、FR-002、AC-1.1、AC-1.2、AC-1.3、AC-1.4、AC-1.5、SC-001、SC-003、SC-004 與 SC-008。系統 MUST 提供可從任意 current directory 執行的離線 lint command，並以排序診斷、固定 summary 與穩定 exit code 回報結果；動態 scanned pathname 含 control character 時必須先以安全 path `.` fail closed。

#### Scenario: AC-1.1 合法 fixture 通過
- **GIVEN** fixture 的 canonical spec、STATUS、active change、tasks 與 consumers 全部合法
- **WHEN** 執行 `scripts/check-sdd.sh <fixture-root>`
- **THEN** command 以 exit `0` 結束，且 summary 顯示零個 errors

#### Scenario: AC-1.2 缺少功能目標 heading
- **GIVEN** active change 引用的 canonical spec 缺少 `## 功能目標`
- **WHEN** 執行 lint command
- **THEN** command 以 exit `1` 結束，並輸出 `SPEC_REQUIRED_HEADING` 與相對路徑

#### Scenario: AC-1.3 active change 的 STATUS stage 錯誤
- **GIVEN** active change 存在但 STATUS 仍為 `spec-ready`
- **WHEN** 執行 lint command
- **THEN** command 以 exit `1` 結束，並輸出 `ACTIVE_CHANGE_STAGE`

#### Scenario: AC-1.4 Source-Verify ID 無法定位
- **GIVEN** active change 引用不存在於 canonical spec 的 FR、SC 或 AC ID
- **WHEN** 執行 lint command
- **THEN** command 以 exit `1` 結束，並輸出 `SOURCE_VERIFY_ID`

#### Scenario: AC-1.5 control-character pathname preflight
- **GIVEN** 任一動態 scanned path 含 newline、tab 或 carriage return
- **WHEN** 執行 lint command
- **THEN** command 在 pathname 進入文字或 TSV flow 前以 `ERROR [SCANNER_CONFIG] .: repository paths containing control characters are unsupported` 結束並 exit `2`，且不輸出 hostile pathname

### Requirement: Task 與來源治理

本需求依正典 `specs/foundation/001-project-sdd-lint/spec.md` 的 FR-003、FR-005、FR-006、AC-2.1、AC-2.2、AC-2.3 與 SC-007。系統 MUST 驗證 active OpenSpec change 的正典來源、task ownership 與 retired guidance，並阻擋不符合治理契約的 active artifact；Issue #375 交接只得勾選實際交付的六個 D 子項（正典標題、STATUS/stage、Source-Verify、task 單檔／例外、assignee／file ownership、design inventory freshness）。複合 retired-path/command D checkbox 與 combined acceptance 維持未勾選並延期，直到取得 ADR-034/path authority 並完成 named filesystem paths 的 QA Red 與 production Green；本變更不接受 ADR-034，亦不修改執行期程式碼；inventory workstream C、baseline-zero cleanup 與其他 acceptance items 保持不變。

#### Scenario: AC-2.1 assignee 無效
- **GIVEN** task 沒有恰好一個結尾 assignee，或 assignee 指向不存在的 agent
- **WHEN** 執行 lint command
- **THEN** command 以 exit `1` 結束，並輸出 `TASK_ASSIGNEE`

#### Scenario: AC-2.2 one-file exception 無效
- **GIVEN** task 使用未允許的 exception，或缺少 `Exception:`、`Files:` 或 `Reason:` 任一欄位
- **WHEN** 執行 lint command
- **THEN** command 以 exit `1` 結束，並輸出 `TASK_EXCEPTION`

#### Scenario: AC-2.3 Red task 與可追溯性不符合契約
- **GIVEN** Red task 不屬於 `[@senior-qa]`、缺少可定位的 SC goal，或明確 file ownership 不相符
- **WHEN** 執行 lint command
- **THEN** command 以 exit `1` 結束，並輸出相應的 task rule

### Requirement: Ratchet baseline

本需求依正典 `specs/foundation/001-project-sdd-lint/spec.md` 的 FR-004、FR-007、AC-3.1、AC-3.2、AC-3.3 與 SC-002。系統 MUST 以排序、唯一且無 glob 的 baseline 隔離既有 legacy debt，阻擋新增或 stale debt，並維持明確 deferred 規則為 warning-only。

#### Scenario: AC-3.1 baseline 中的 legacy debt 只產生 warning
- **GIVEN** legacy violation 與排序 baseline 完全一致
- **WHEN** 以 default mode 執行 lint command
- **THEN** command 以 exit `0` 結束，並輸出 warning

#### Scenario: AC-3.2 新增或 stale 的 legacy debt 會失敗
- **GIVEN** 新 legacy violation 不在 baseline，或 baseline entry 已 stale
- **WHEN** 以 default mode 執行 lint command
- **THEN** command 以 exit `1` 結束

#### Scenario: AC-3.3 strict mode 不升級 deferred warning
- **GIVEN** baseline 仍有 legacy violation，且存在明確 deferred 的 warning-only rule
- **WHEN** 以 `--strict` 執行 lint command
- **THEN** command 以 exit `1` 結束，且 warning-only rule 不會因 `--strict` 升級為 blocking error

### Requirement: 獨立 CI gate 與 generated screen inventory freshness

本需求依正典 `specs/foundation/001-project-sdd-lint/spec.md` 的 FR-008、FR-009、AC-4.1、AC-4.2、AC-4.3、AC-4.4、SC-005、SC-006 與 SC-008。CI MUST 以獨立 `Project SDD Lint` job 執行與本地相同的 lint command，且不得包裝或取代 `openspec validate`。lint MUST 僅在 canonical resolved target root 與 checker root 相同時執行 `node "$repo_root/scripts/gen-screen-inventory.mjs" --check`，capture 並 suppress generator raw output；foreign root 必須在 child execution 前以 `INVENTORY_CHECK_CONFIG` 拒絕。此 freshness claim 僅涵蓋 generated `design/system/screen-inventory.md`，不涵蓋 hand-maintained `design/system/inventory.md` 或 `design-inventory.dc.html`。`--strict` 不得改變 inventory severity。

#### Scenario: AC-4.1 fresh inventory 不產生診斷
- **GIVEN** resolved target root 與 checker root 相同，且 `node scripts/gen-screen-inventory.mjs --check` exit `0`
- **WHEN** CI 執行 Project SDD lint
- **THEN** 不輸出 inventory diagnostic，且 lint outcome 依其他 rules 決定

#### Scenario: AC-4.2 exact stale sentinel 映射為 blocking error
- **GIVEN** resolved target root 與 checker root 相同，且 generator `--check` exit `1`，並且 child output 含 versioned generator 的 exact stale sentinel `design/system/screen-inventory.md is stale — run: node scripts/gen-screen-inventory.mjs`
- **WHEN** CI 執行 Project SDD lint
- **THEN** suppress child raw output，輸出 `ERROR [INVENTORY_FRESHNESS] design/system/screen-inventory.md: ...`，並以 exit `1` 結束，除非其他 scanner configuration error 要求 exit `2`

#### Scenario: AC-4.3 inventory check configuration error
- **GIVEN** resolved target root 與 checker root 相同，且 target root 缺少 generator、generator 無法讀取、load 或執行、執行環境缺少 Node、generator exit `2`、generator exit `1` 但無 exact stale sentinel，或回傳任何其他 unexpected result
- **WHEN** CI 執行 Project SDD lint
- **THEN** suppress child raw output，輸出 `ERROR [INVENTORY_CHECK_CONFIG] scripts/gen-screen-inventory.mjs: ...`，並以 exit `2` 結束

#### Scenario: AC-4.4 foreign-root generator refusal
- **GIVEN** explicit target root 在 canonical resolution 後不同於 checker root，且 hostile generator 嘗試寫入 marker
- **WHEN** 執行 lint command
- **THEN** command 以 `ERROR [INVENTORY_CHECK_CONFIG] scripts/gen-screen-inventory.mjs: ...` 與 exit `2` 拒絕，marker 不存在，且不輸出 raw child output
