---
對應 Spec: specs/foundation/001-project-sdd-lint/spec.md
---

## Why

正典 FR-008 只把「CI job ↔ `CLAUDE.md` 本機命令」的對等關係綁在單一個 `Project SDD Lint` job 上，因此 `CLAUDE.md` 中「每個 CI job 都必須有對應的本機命令」這條治理承諾至今只能靠人工複核。實際後果已經發生：`scripts/inventory-tests.sh`、`scripts/pre-commit-tests.sh`、`scripts/pre-tool-use-tests.sh` 三支驗證套件存在於 repo，但沒有任何 CI job 會執行它們，也沒有列在 `CLAUDE.md` 的 Verification Commands 區塊——沒有任何 gate 會發現這件事（issue #648，自 issue #646 拆出）。

本變更把該承諾從人工複核升級為可機檢規則，並清償已知的三筆欠債。

## What Changes

- 新增 `scripts/ci-jobs.tsv` 作為 CI job、本機命令與 repo 腳本的單一對照登錄表；每列三欄（CI job 名稱或 `none`、本機命令或豁免理由、腳本檔名或 `-`）。
- 於 `scripts/check-sdd.sh` 新增 `CI_JOB_PARITY` 規則，同時檢查兩個方向：方向 A 是 `.github/workflows/ci.yml` 的每個 job 都必須在登錄表中宣告，且其本機命令必須出現在 `CLAUDE.md` 的 Verification Commands 區塊；方向 B 是 `scripts/` 下每支 `.sh`／`.mjs` 都必須在登錄表中恰好出現一次，不是接上 CI job，就是以 `none` 加上明確理由豁免。
- 於 `.github/workflows/ci.yml` 補上 `inventory-tests`、`pre-commit-tests`、`pre-tool-use-tests` 三個獨立 job，並在 `CLAUDE.md` 列出相同的本機命令；選擇接線而非豁免，因為讓新規則一上線就先赦免自己的三筆違規，等同於宣告這條規則可選。
- 於 `scripts/speckit-tests.sh` 補上六項 fixture 回歸測試，涵蓋兩個方向的失敗與合法豁免。
- 不變更 API、DB schema、產品 UI 或 dependency；不修改任何既有 lint 規則的判定邏輯或 severity；不動 `scripts/sdd-lint-baseline.txt`。

## Capabilities

### New Capabilities

無。

### Modified Capabilities

- `foundation/001-project-sdd-lint`：Project SDD Lint 新增驗證套件與 CI job 的雙向對照規則，將正典 FR-008 的單一 job 承諾推廣為全 repo 可機檢的契約。

## Impact

- 影響 `scripts/check-sdd.sh`（新增 `CI_JOB_PARITY` 規則與必要輸入 preflight）、新增 `scripts/ci-jobs.tsv`、`scripts/speckit-tests.sh` fixture harness。
- 影響 `.github/workflows/ci.yml`（新增三個 job）與 `CLAUDE.md`（新增對應本機命令與規則說明）。
- 影響後續所有新增腳本：新增一支 `scripts/*.sh` 或 `scripts/*.mjs` 而未在登錄表登記，`sdd-lint` job 即會失敗。
- 不影響 API、DB、產品 UI 或 dependency。

## Constitution Check

- **IV. Test-First**：六項 fixture 測試先以 Red commit 提交並取得預期失敗證據，再由 Green work 實作規則；Green 未弱化 Red 契約。
- **X. Change Scope Discipline**：本變更只處理「驗證套件與 CI job 對照」單一目的。production 檔為 `scripts/check-sdd.sh` 與 `scripts/ci-jobs.tsv` 兩個；`.github/workflows/ci.yml` 為工具設定檔、`scripts/speckit-tests.sh` 為測試檔、`specs/**` 與 `openspec/**` 為規格產物，依憲法 v1.33.0 均排除於門檻計算。
- **XVII. CI/CD Quality Gates**：新增的三個 CI job 各有對等本機命令，且新規則本身即是維持此對等關係的 gate；`CI_JOB_PARITY` 不包裝也不取代 `openspec validate`。
- **XX. Source of Truth & Contract Governance**：正典來源維持 `specs/foundation/001-project-sdd-lint/spec.md`；本 proposal 引用的 FR-008 可在該正典定位，FR-010、SC-009 與 AC-5.1–AC-5.6 於本變更的 delta 以 `## ADDED Requirements` 宣告，archive 時回寫正典。
- **II. Generalization-First（NON-NEGOTIABLE）**：規則以登錄表驅動，不硬編任何 job 名稱或腳本清單，故符合。
- **III. Data Fairness（NON-NEGOTIABLE）**：不讀取、傳回或新增任何標記資料、gold answer 或評分資料，故不受影響。
