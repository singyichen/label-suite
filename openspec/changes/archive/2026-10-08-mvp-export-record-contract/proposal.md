---
對應 Spec: specs/task-management/014-task-detail/spec.md
---

# MVP 匯出紀錄與原始產物契約

## Why

Issue #1160 的資料表盤點發現 014 FR-010i-1 用單一 `run_id` 描述匯出版本，FR-010i-2 卻要求跨 run 逐一保存；FR-021 以目前資料及條件快照重新產檔，無法在標記或審核後續改變時保證原檔相同。`json-min` 純陣列在零筆結果時也無法承載主憲法 XVI 要求的版本及請求人資訊。直接畫匯出表會把未裁決欄位誤當已定 Schema。

## Goal

在 014 正典固定一次匯出、一份不可變原始產物、有序逐 run 身分及重新下載條件，供兩張未部署候選表、物理欄位字典與 NoteCraft 投影。此 change 不建立 ORM、migration、API 或正式物件儲存服務。

## What Changes

- 修訂 FR-009a／FR-010i-1／FR-010i-2，統一多 run 選取、逐 run 版本／快照 manifest、顯示欄位與條件快照分界。
- 修訂 FR-021 及 AC-1.14～AC-1.16／SC-046：首次保存不可變原始 bytes，重新授權後依完整性、到期與撤銷狀態下載同一檔案；有效原檔不因切詞引擎之後停用而不可下載。新匯出仍受 FR-020 的引擎版本前置條件約束。
- 將 FR-015h 的 `json-min` 變為格式 v2 `{manifest,rows[]}`，同時更新格式常數與驗收。保留舊版已存原檔，不能用新版序列化器改寫。
- 定義產物 30 日、歷史 metadata 一年保留，狀態、冪等重試、立即撤銷與私有答案隔離。

## Constitution Check

| 原則 | 對應 |
|---|---|
| III. Data Fairness | 匯出僅取授權的公開來源與已提交結果；標記者、私有答案與未提交審核草稿均受拒絕測試。 |
| XIV／XVI. Lineage 與 Export Integrity | 原始 bytes、SHA-256、格式版本及逐 run 版本身分可追溯，舊版本不被重算。 |
| XV. RBAC | 每次下載重新驗當前 `dataset.export` 與 task 範圍，不因歷史紀錄存在而放行。 |
| XXVIII. Lifecycle | 明訂產生、失敗、到期、撤銷及刪除後不可下載的生命週期。 |
| XVIII／XX. 部署與來源 | 014 正典先於字典與圖；正式 migration、雙庫及 API 測試另案。 |

## 回滾與界線

本次只有規劃文件，撤回須同步回復 014 版本／Changelog、OpenSpec derived view、物理字典與 NoteCraft；無需資料庫 downgrade。既有 prototype 可作行為參照，不代表服務端已實作此新契約。
