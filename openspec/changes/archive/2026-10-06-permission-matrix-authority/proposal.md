---
對應 Spec: specs/admin/007-role-settings/spec.md
---

## Why

Issue #1160 D-9～D-13 要裁決可編輯權限矩陣是否實際參與授權。既有固定角色守門、任務 membership 與 boolean 格未定義完整組合規則；`task.detail.view` 的 reviewer「唯讀」也無法由單一格表達。若只保存矩陣而不將其納入伺服器判斷，管理設定與正式操作會失去一致性。

## Goal

依 Accepted ADR-037，讓每個已映射操作以當前身分與角色、已啟用矩陣格、資源條件依序授權，並把 V1 的 42 列適用格、固定格、多重 task role、版本與稽核契約寫入正典。這是規劃契約；矩陣表仍為候選 schema，runtime、migration 與 API 另立實作變更。

## What Changes

- `admin/007` 增加 `task.detail.edit`，將 reviewer 的檢視與編輯分開；定義 9 個平台鍵、8 個任務鍵與 42 列適用格，未知鍵、缺列、錯層與失效 membership 預設拒絕。
- 保留當前 `super_admin` 與 admin 格的雙重守門；固定 `super_admin × admin.*=true`、`user × admin.*=false`、兩種 system role 的 `dashboard.view=true`。新鍵須經層級、操作映射、完整種子與安全測試審查後啟用。
- 對齊 `admin/006`、`task-management/010`、`013`、`014` 與 `annotation/015` 的操作鍵與資源限制；任務 membership 以 `(task_id,user_id,task_role)` 區分，workspace 寫入只使用明選的 active role。
- 矩陣每次儲存都檢查預期版本；真正變更與 ADR-032 共用 `role_permissions.changed` 在同一交易提交，穩定目標為 `role_permission_matrix/1`。任務刪除及部分生命週期命令在 V1 沒有專用鍵，待另案核准。

## Capabilities

主規格：`specs/admin/007-role-settings/spec.md`。受影響正典：`specs/admin/006-user-management/spec.md`、`specs/task-management/010-task-list/spec.md`、`specs/task-management/013-task-new/spec.md`、`specs/task-management/014-task-detail/spec.md`、`specs/annotation/015-annotation-workspace/spec.md`。各 delta 鏡射其正典路徑；ADR-037 為跨規格授權決策來源。

## Constitution Check

| 原則 | 符合方式 |
|---|---|
| II. Generalization-First | 操作映射至可審查的權限鍵，不依 NLP task type 建立硬編分支。 |
| III. Data Fairness | workspace 與匯出仍受盲審、指派及測試集答案隔離限制；能力提示不含隱藏答案。 |
| XI. Security & Privacy、XV. RBAC | 當前角色、active membership、矩陣格與資源條件逐次檢查；缺漏一律拒絕。 |
| XII. Traceability、XX. Source of Truth | 正典 FR／SC 與 Accepted ADR-037 為來源，候選字典與衍生視圖僅投影該決策。 |
