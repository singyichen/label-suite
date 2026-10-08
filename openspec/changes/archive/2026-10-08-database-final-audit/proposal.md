---
對應 Spec: specs/task-management/014-task-detail/spec.md
對應 Issue: #1160
基準版本: 014 v10.0.0
目標版本: 014 v11.0.0
---

# MVP 試標結果與任務稽核資料落點

## Why

014 要求試標 IAA 每個需計算輸出取得確定結果才可將回合設為 `done`，但目前候選表只保存狀態，缺少可查證的結果來源。ADR-022 與 014 的 `RunStateTransition`／`IsolationAuditLog` 邏輯實體，也還沒有與 ADR-032 共用 `audit_events` 的物理落點裁決。本 change 將 MVP 必要的持久化證據與稽核單一事實來源定案，讓資料集分析報告表繼續留在後 MVP。

## What Changes

- 新增 014 FR-010o-5、AC-3.51、SC-062：每試標回合一份有版本與輸入摘要的完整 IAA 結果；`done` 和結果同交易，`De = 0` 視為已完成而非計算錯誤。
- 新增 014 FR-025、AC-3.52、SC-063：任務狀態及隔離設定異動，各由一筆型別化 `audit_events` 記錄；邏輯歷程是查詢投影，不另建重複的持久化表。
- 同步修訂 Accepted ADR-022／032 的專表敘述，讓新事件 action、allowlist 和同交易寫入成為唯一現行契約；`audit_events.task_id` 在候選層接上 task 真 FK。
- 014 升 v11.0.0；取消 ADR-022 原本專表承諾屬內部持久化契約變更。

## Capabilities

### Modified Capabilities

- `task-management/014-task-detail`：試標 IAA 結果證據與任務稽核歷程。

## Impact

- 正典：014 v10.0.0 → v11.0.0、Accepted ADR-022／032；不變更 017 FR-039 的計算規則。
- 候選：新增 `task_trial_iaa_result` 六欄；`audit_events.task_id` 變成候選真 FK；NoteCraft 預計 39 表／333 欄／46 個單欄 FK，已部署業務表仍為 0。
- 本 change 不新增 ORM、migration 或 API；SQLite／PostgreSQL 約束與資料保存上限仍需獨立裁決或實作驗證。

## 憲章檢查

- **Generalization-First**：逐輸出結果依 registry 驗證，無 task type 特判。
- **Data Fairness**：結果只存指標／無法計算原因與輸入摘要，不複製 hidden answer 或私有來源。
- **Traceability**：每次異動一筆同交易稽核事件，與 domain 狀態及原因碼可對照。
- **Test-First**：senior-qa 先提交 Red 文件契約測試，後續正典／字典／NoteCraft 分檔 Green。
