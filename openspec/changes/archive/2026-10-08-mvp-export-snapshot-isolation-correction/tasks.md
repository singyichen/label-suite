# 任務清單：mvp-export-snapshot-isolation-correction

> PR #1201 review-fix 的規劃切片。主 session 負責驗證 Red／Green 證據及更新 checkbox；不建立 ORM、migration 或 API。

## 1. 正典與 delta

**故事目標**：014 SC-005／SC-046、FR-010b／FR-010c／FR-010i-1／FR-010i-2／FR-021 在匯出時間與隔離語意上互相一致。

- [x] 1.1 確認已提交的 `scripts/tests/check-mvp-export-canonical.test.mjs` 對目前錯誤契約取得預期 Red，記錄失敗斷言。 [@senior-qa]
- [x] 1.2 修訂 `specs/task-management/014-task-detail/spec.md` 的上述既有 ID、版本與 Changelog，使正典斷言通過；保留既有安全與逐 run lineage 規則。 [@senior-sa]
- [x] 1.3 建立此 change 的 proposal、design 及 MODIFIED delta，完整攜帶既有 Scenario 並加入時間／隔離驗收情境。 [@senior-sa]

## 2. 衍生候選與驗證

**故事目標**：014 SC-046 的候選字典及 ER 投影以新契約為來源，不把接受時間冒充內容時間。

- [x] 2.1 更新候選 `task_export` 字典：保留 `requested_at` 並新增可空 `exported_at`，更正 `conditions_snapshot`、manifest、檔名及重試的來源規則。 [@senior-dba]
- [x] 2.2 更新 ER JSON 與來源 checker，確保欄位及引用與字典一致；不手改生成 HTML。 [@senior-devops]
- [x] 2.3 執行正典與字典的測試前後對照、`openspec validate mvp-export-snapshot-isolation-correction --type change`、`bash scripts/check-sdd.sh` 及 `git diff --check`，由主 session 核對每個閘門的結果。 [@main]

## 3. 歸檔

**故事目標**：014 SC-046 的 OpenSpec derived view 和正典引用可於 final PR 溯源。

- [x] 3.1 final PR archive 前執行 Source-Verify；archive/write-back 後逐條 grep 檢查 derived view 的正典 ID／版本／Changelog 引用。 [@main]
