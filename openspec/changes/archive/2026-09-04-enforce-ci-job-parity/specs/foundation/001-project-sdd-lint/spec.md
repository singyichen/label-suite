## Purpose

Project SDD Lint 的 derived capability；正典為 `specs/foundation/001-project-sdd-lint/spec.md` v1.1.4。本變更新增驗證套件與 CI job 的雙向對照規則，把正典 FR-008 只涵蓋單一 `Project SDD Lint` job 的對等承諾，推廣為全 repo 可機檢的契約。

## ADDED Requirements

### Requirement: 驗證套件與 CI job 的雙向對照（FR-010、SC-009）

系統 MUST 以 repo 內的登錄表 `scripts/ci-jobs.tsv` 作為 CI job、本機命令與 repo 腳本的單一對照來源，並在 Project SDD Lint 中以 `CI_JOB_PARITY` 規則同時檢查兩個方向：

- **方向 A（CI job → 本機命令）**：`.github/workflows/ci.yml` 中 `jobs:` 下的每個 job MUST 在登錄表中恰好被宣告一次，且該列宣告的本機命令 MUST 出現在 `CLAUDE.md` 的 Verification Commands 區塊內。
- **方向 B（腳本 → CI job）**：`scripts/` 目錄下每支 `.sh` 或 `.mjs` MUST 在登錄表中恰好出現一次，且僅有兩種合法形式——接上一個實際存在於 workflow 的 CI job，或以第一欄 `none` 加上非空的豁免理由明確豁免。

登錄表每列 MUST 為三個非空的 tab 分隔欄位；不符合此形狀時規則 MUST 以 `CI_JOB_PARITY` 診斷失敗。`scripts/ci-jobs.tsv` 與 `.github/workflows/ci.yml` MUST 列入 scanner 的必要輸入 preflight，缺漏時以既有的 `SCANNER_CONFIG` configuration error 處理。本規則 MUST NOT 改變任何既有 lint 規則的判定邏輯或 severity，且 MUST NOT 包裝或取代 `openspec validate`。

正典 FR-008 對 `Project SDD Lint` job 的既有承諾維持不變，並成為本規則涵蓋的其中一列。

#### Scenario: AC-5.1 驗證套件未接 CI job

- **GIVEN** `scripts/` 下存在一支未於登錄表宣告的腳本
- **WHEN** 執行 Project SDD Lint
- **THEN** command 以 exit `1` 結束，並輸出 `CI_JOB_PARITY` 與該腳本路徑

#### Scenario: AC-5.2 CI job 未宣告本機命令

- **GIVEN** workflow 中存在一個未於登錄表宣告的 job
- **WHEN** 執行 Project SDD Lint
- **THEN** command 以 exit `1` 結束，並輸出 `CI_JOB_PARITY` 與 workflow 路徑

#### Scenario: AC-5.3 登錄表宣告不存在的 CI job

- **GIVEN** 登錄表宣告了一個 workflow 中不存在的 job 名稱
- **WHEN** 執行 Project SDD Lint
- **THEN** command 以 exit `1` 結束，並輸出 `CI_JOB_PARITY` 與登錄表路徑

#### Scenario: AC-5.4 本機命令未列於 CLAUDE.md

- **GIVEN** 登錄表某列的本機命令未出現在 `CLAUDE.md` 的 Verification Commands 區塊
- **WHEN** 執行 Project SDD Lint
- **THEN** command 以 exit `1` 結束，並輸出 `CI_JOB_PARITY` 與登錄表路徑

#### Scenario: AC-5.5 豁免列缺少理由

- **GIVEN** 登錄表某列以 `none` 豁免，但理由欄為空
- **WHEN** 執行 Project SDD Lint
- **THEN** command 以 exit `1` 結束，並輸出 `CI_JOB_PARITY` 與登錄表路徑

#### Scenario: AC-5.6 具理由的豁免列合法

- **GIVEN** 登錄表某列以 `none` 豁免且理由欄非空，其餘 fixture 全部合法
- **WHEN** 執行 Project SDD Lint
- **THEN** command 以 exit `0` 結束，且不輸出 `CI_JOB_PARITY` 診斷

#### Scenario: SC-009 既有未接線套件清償

- **GIVEN** repo 中原本存在 `scripts/inventory-tests.sh`、`scripts/pre-commit-tests.sh` 與 `scripts/pre-tool-use-tests.sh` 三支未接 CI 的驗證套件
- **WHEN** 本變更完成
- **THEN** 三支套件各有一個獨立 CI job 與對等的 `CLAUDE.md` 本機命令，且 `scripts/` 下所有 `.sh`／`.mjs` 皆已在登錄表登記，`CI_JOB_PARITY` 在真實 repo 上輸出零個診斷
