---
對應 Spec: specs/task-management/014-task-detail/spec.md
對應 Issue: #1160
基準版本: 014 v9.0.0
目標版本: 014 v10.0.0
---

# Task/run 發布完整性

## Why

任務發布已要求同 run 的有序 item 清單、不可變 snapshot 及外部審計回執，但正典尚未定義回執的精確位元組、物件儲存與資料庫提交的界線，也未定義失敗後如何安全重試。標記工作位若另存 `status`，可能與已提交標記及終局排除證據分歧。此 change 使成功發布可驗證、失敗不可見半套資料，且工作位只有一個可推導的顯示狀態。

## What Changes

- 修訂 014 FR-010f：以 `label-suite-run-items-v1` 固定 UTF-8 位元組、排序後 UUID 及 SHA-256 定義私有、不可覆寫的內容定址回執；不納入答案、split 或受限來源。
- 修訂 014 FR-010f-6：先寫入並讀回驗證外部回執，再以一個資料庫交易提交其引用與所有發布列；相同冪等鍵／摘要回原 run，不明提交先查資料庫，壞回執拒絕讀取並告警，無引用物件只在租約與引用檢查後清理。
- 新增 014 FR-010f-7：assignment 不保存第二份 `status`，依終局排除、目前已提交紀錄、空受派者、目前草稿及其餘受派 slot 的順序推導唯讀狀態。
- 新增 014 AC-3.48～AC-3.50 與 SC-059～SC-061；關鍵實體同步精確欄位。014 由 v9.0.0 升至 v10.0.0，因移除持久化狀態與重新界定外部回執交易邊界屬破壞性契約修訂。
- `specs/task-management/013-task-new/spec.md` FR-006a／AC-4.3 的預配置 task、config、guideline 三個 UUID 是既有同交易初建要求的實作精度釐清，單獨以 PATCH v8.3.1 回寫；不新增使用者流程或 API 形狀，故不為 013 建立第二份 OpenSpec delta。

## Capabilities

### Modified Capabilities

- `task-management/014-task-detail`：FR-010f、FR-010f-6、FR-010f-7、AC-3.48～AC-3.50、SC-059～SC-061。

## Impact

- 正典：`specs/task-management/014-task-detail/spec.md`（v9.0.0 → v10.0.0）；013 FR-006a 僅 PATCH 釐清，見 `specs/task-management/013-task-new/spec.md`。
- 未部署候選來源：`docs/diagrams/architecture/task-run-db-schema.md`、`docs/diagrams/architecture/database-schema.er.json`、`docs/diagrams/architecture/database-table-inventory.md`；NoteCraft 預期仍為 38 張表、327 欄、44 個候選單欄 FK。
- 本次不新增 ORM、migration 或 API。SQLite／PostgreSQL 循環 FK、發布競爭及物件故障仍須後續雙庫與物件儲存實作測試；資料保留上限與匿名化順序另待政策裁決。

## 憲章檢查

- **Generalization-First**：回執只依公開 item 身分與既有 run 順序，不依任務類型分支。
- **Data Fairness／Security**：抽樣、回執及標記者回應不讀取或洩漏 hidden answer、`declared_split`、gold/test 標記與受限 `source_ref`。
- **Test-First**：`senior-qa` 已先提交並執行 Red 契約測試；正典、字典與投影於 Red 後分檔 Green。
- **Source of Truth／Traceability**：run-item SQL 清單為成員正典，外部物件只作相同位元組的審計回執；assignment 狀態只從紀錄與排除事實推導。
- **Retention／Deployment Safety**：無引用回執清理受租約與引用檢查約束；候選約束不宣稱已部署，資料保存上限仍未裁決。
