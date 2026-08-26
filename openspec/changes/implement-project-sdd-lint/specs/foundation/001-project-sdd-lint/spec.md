## Purpose

Project SDD lint 的 derived capability；正典為 `specs/foundation/001-project-sdd-lint/spec.md` v1.0.0。本變更實作既有 FR-001–FR-008、AC-1.1–AC-4.1 與 SC-001–SC-006，不發明新 ID。

## ADDED Requirements

### Requirement: 可重複執行的命令與診斷

本需求依正典 `specs/foundation/001-project-sdd-lint/spec.md` 的 FR-001、FR-002、AC-1.1、AC-1.2、AC-1.3、AC-1.4、SC-001、SC-003 與 SC-004。系統 MUST 提供可從任意 current directory 執行的離線 lint command，並以排序診斷、固定 summary 與穩定 exit code 回報結果。

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

### Requirement: Task 與來源治理

本需求依正典 `specs/foundation/001-project-sdd-lint/spec.md` 的 FR-003、FR-005、FR-006、AC-2.1、AC-2.2、AC-2.3 與 SC-006。系統 MUST 驗證 active OpenSpec change 的正典來源、task ownership 與 retired guidance，並阻擋不符合治理契約的 active artifact。

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

### Requirement: 獨立 CI gate

本需求依正典 `specs/foundation/001-project-sdd-lint/spec.md` 的 FR-008、AC-4.1 與 SC-005。CI MUST 以獨立 `Project SDD Lint` job 執行與本地相同的 lint command，且不得包裝或取代 `openspec validate`。

#### Scenario: AC-4.1 inventory freshness 尚未驗證
- **GIVEN** inventory generator 尚不存在
- **WHEN** CI 執行 Project SDD lint
- **THEN** job 顯示 `INVENTORY_FRESHNESS_UNVERIFIED` warning，不宣稱 freshness 已通過，並依其他 blocking rules 決定 exit code
