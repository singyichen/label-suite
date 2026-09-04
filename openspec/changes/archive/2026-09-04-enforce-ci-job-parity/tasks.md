# 任務清單：enforce-ci-job-parity

## 1. 規則契約（Red／Green）

**故事目標**：SC-009 — 讓「驗證套件必須接 CI」從人工複核變成可機檢規則，先以失敗的 fixture 契約釘住行為，再實作規則。

- [x] 1.1 於 `scripts/speckit-tests.sh` 新增六項 CI job parity 的 Red 契約測試，涵蓋 AC-5.1 至 AC-5.6；驗證：五項以 `Expected check-sdd.sh to exit 1` 失敗 [@senior-qa]
- [x] 1.2 於 `scripts/check-sdd.sh` 實作 `CI_JOB_PARITY` 規則與必要輸入 preflight，使 Red 轉 Green [@senior-devops]

## 2. 登錄表與 CI 接線

**故事目標**：SC-009 — 建立唯一的對照來源，並清償三支既有未接 CI 的驗證套件。

- [x] 2.1 建立 `scripts/ci-jobs.tsv`，以三欄 TSV 宣告每個 CI job 的本機命令、每支腳本的歸屬或豁免理由 [@senior-devops]
- [x] 2.2 於 `.github/workflows/ci.yml` 新增 inventory-tests、pre-commit-tests、pre-tool-use-tests 三個獨立 job [@senior-devops]
- [x] 2.3 於 `CLAUDE.md` 的 Verification Commands 區塊補上三支套件的本機命令與新規則說明 [@main]

## 3. 驗證

**故事目標**：SC-009 — 以外部工具證明規則在真實 repo 上為綠，且未回歸既有 gate。

- [x] 3.1 執行 `scripts/speckit-tests.sh`；預期 exit `0` [@senior-qa]
- [x] 3.2 執行 `scripts/check-sdd.sh`；預期零個 error [@senior-devops]
- [x] 3.3 執行三支新接線的驗證套件與 `scripts/check-spec-artifacts.sh`；預期全部 exit `0` [@senior-devops]

## 4. Archive 與正典回寫

**故事目標**：SC-009 — 讓新增的 FR-010 與 SC-009 落回正典，完成第四道 gate。

- [x] 4.1 於 `specs/foundation/001-project-sdd-lint/spec.md` 回寫 FR-010、SC-009 與 AC-5.1–AC-5.6，版本升至 1.2.0 並新增 Changelog 列 [@main]
- [x] 4.2 更新 `specs/STATUS.md` 的 foundation-001 狀態、分支欄與備註 [@main]
