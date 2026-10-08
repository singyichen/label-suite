---
對應 Spec: specs/task-management/014-task-detail/spec.md
---

# MVP 匯出快照時間與隔離契約釐清

## Why

PR #1201 審查發現 v8.0.0 規劃文件將請求接受時間 `requested_at` 投影為原檔 `exported_at`，與背景工作可能稍後才讀取內容的事實不符；`conditions_snapshot` 又把尚未產生的 `exported_at` 當成接受時固定條件。FR-010b／FR-010c／SC-005 的隔離描述也可被誤解為隔離開啟時禁止明確選取 Dry 與 Official run 同檔匯出，和 FR-009a 不一致。

## Goal

正典明定兩個時間的生命週期、接受條件快照的不可變界線及跨 run 同檔封裝的隔離語意，讓候選資料字典與圖可追溯至同一契約。

## What Changes

- `requested_at` 保留請求接受時間；新增可空 `task_export.exported_at` 表示成功原檔實際使用的結果讀取快照時間，與原始產物及檔名在 `ready` 轉換固定。
- `conditions_snapshot` 在接受時保存命令、篩選與逐 run 身分，保持不可變且不含 `exported_at`；未 `ready` 的 worker 重試可取得較晚結果快照，`ready` 後重試只回原檔。
- 釐清隔離開啟時仍允許使用者明確選取 Dry Run 與 Official Run 同檔封裝；各 run 結果分離，每列保留 `run_id`／`run_stage`，禁止跨 run 合併、聚合或去重。
- 更新 014 正典版本與 Changelog；保留原有 `dataset.export`、答案隔離、SHA-256、到期與撤銷規則。

## Constitution Check

| 原則 | 對應 |
|---|---|
| III. Data Fairness | 同檔封裝不擴張可見資料，私有答案及未提交審核草稿仍排除。 |
| XIV／XVI. Lineage 與 Export Integrity | 結果讀取快照時間、逐 run 身分、不可變原始位元組及檔名一致。 |
| XV. RBAC | 每次下載仍重新檢查當前 `dataset.export` 與任務範圍。 |
| XXVIII. Lifecycle | `pending → processing → ready | failed`、未完成重試及完成後冪等讀取有明確界線。 |

## 回滾與界線

此 change 只修正規劃契約，不交付 ORM、migration、API、物件儲存或已部署功能。候選字典、ER 圖及 checker 由各自擁有人同步；先前已封存的 change 與 derived view 不在本次直接修改。
