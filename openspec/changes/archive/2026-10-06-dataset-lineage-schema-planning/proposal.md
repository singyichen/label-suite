---
對應 Spec: specs/dataset/021-dataset-ingestion-and-lineage/spec.md
---

## Why

Issue #1160 的 account/admin 候選表已有逐欄字典與 NoteCraft Wiki／Diagram，但 dataset 的來源、版本、項目與隱藏答案仍只出現在概念規格。若直接畫跨模組 FK，會讓未決的 task/run 綁定被誤認為已建立的 Schema，也無法證明測試集答案與標記資料分離。

## Goal

以 `dataset-021` 為匯入與 lineage 的正典，明確定義多來源批次、完整版本快照、公開項目與私有答案的五張候選表；把已裁決的欄位與單欄 FK 投影到 NoteCraft，並用來源檢查器保證 account/admin 與 dataset 字典對圖面一致。本 change 只交付規劃契約，不建立 ORM、migration、API 或資料搬遷。

## What Changes

- 新增 `dataset-021`，以 FR-001～FR-011、AC-1.1～AC-3.3 及 SC-001～SC-006 定義來源追溯、受保護欄位分類、`draft → sealed`、同 dataset 父版本與答案隔離。
- 建立五張未部署候選表的實體層字典，標示 PK、FK、UNIQUE、CHECK、型別、可空性、索引成本、讀寫權限及 SQLite／PostgreSQL 對應。
- 擴充 `database-schema.er.json` 的 dataset 分群，僅從已列出的單欄 FK 畫線；task/run、annotation、review、quality 與 export 仍保留待決，不用概念關係假裝實體 FK。
- 以獨立 Red 測試擴充來源檢查器，逐表比對字典與 JSON 的欄位、型別、必填、PK、FK 與候選狀態，並在 NoteCraft 實際驗證 Wiki／Diagram。

## Capabilities

主規格：`specs/dataset/021-dataset-ingestion-and-lineage/spec.md`。上游為 foundation FR-105／FR-106、Accepted ADR-005／ADR-024 及 task-013 的多檔上傳與可見 Output 預標記。dataset-016／017 為下游分析投影。task/run 的版本綁定與 snapshot FK 由後續 owning spec 定義。

## Constitution Check

| 原則 | 符合方式 |
|---|---|
| II. Generalization-First | 公開 payload 由來源欄位分類與 allowlist 投影，沒有依 NLP task type 分支。 |
| III. Data Fairness | 隱藏答案獨立於公開 item；儲存後僅授權 scoring worker 讀取，標記者 API／狀態／log／cache／trace 不含答案與 split。 |
| XIV. Lineage、XVI. Reproducibility | item 經 batch FK 追至來源、前處理與完整封存版本；後續 run 的 snapshot 與匯出版本鍵另由 owning spec 定義。 |
| XVIII. Deployment Safety、XX. Source of Truth | 五表明示未部署，正典與 Accepted ADR 優先；SQLite／PostgreSQL 實體約束與 migration roundtrip 留待獨立實作。 |
