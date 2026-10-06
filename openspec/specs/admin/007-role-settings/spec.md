# admin/007-role-settings Specification

## Purpose
TBD - created by archiving change shared-audit-events. Update Purpose after archive.

## Requirements

### Requirement: FR-010 矩陣儲存共用稽核

**FR-010**：角色權限矩陣儲存且實際有變更後，系統必須與矩陣及版本更新同交易寫入 ADR-032 共用 `audit_events` 的 `role_permissions.changed` 事件（目標為 `role_permission_matrix`），保存操作者、時間、版本前後值及伺服器依已儲存列計算的變更前後格子 diff；不得直接信任前端提交的 diff，審計紀錄至少保留 1 個曆年。此共用事件契約不提前裁決 D-9 的授權判斷方式。

#### Scenario: SC-010 有變更才產生事件

- **GIVEN** 角色權限矩陣的版本與已儲存格子
- **WHEN** 授權超管儲存實際變更
- **THEN** 矩陣、版本與 `role_permissions.changed` 同交易提交，事件 diff 由伺服器已儲存資料計算（SC-010）

### Requirement: SC-010 操作紀錄與保存

**SC-010**：每次有實際格子變更的儲存均可在共用稽核事件查得操作者、時間、版本與由伺服器計算的 diff；失敗或無變更的儲存不產生該事件。至少 1 個曆年內的紀錄可供追蹤；`/role-settings` 頁面的「操作紀錄」抽屜可正確列出歷史紀錄，每筆包含時間、操作者、diff。

#### Scenario: 無變更與失敗儲存

- **GIVEN** 矩陣儲存沒有實際格子變更，或交易失敗
- **WHEN** 檢視共用稽核事件與操作紀錄抽屜
- **THEN** 不出現虛假的成功變更事件，既有紀錄至少保留 1 個曆年（SC-010）
