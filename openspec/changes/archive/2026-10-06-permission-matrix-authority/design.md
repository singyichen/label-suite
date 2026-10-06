# Design: permission-matrix-authority

## Goal

Issue #1160 D-9～D-13 的設計來源為 `docs/superpowers/specs/2026-10-06-permission-matrix-authority-design.md` 及 Accepted ADR-037。本 change 固定授權組合規則與候選矩陣 schema，讓 `admin/006`、`admin/007`、`task-management/010`、`013`、`014`、`annotation/015` 的 FR／SC 可逐條追溯；不建立 ORM、migration、API 或執行時授權程式。

## Authority and evaluation

1. 依 ADR-021 驗證當前帳號、active 狀態、credential version 與 token family；JWT 的 `role` 僅供顯示。任務操作讀取目標任務的當前 active membership；system role 不隱含 task membership。
2. 操作必須對應已啟用、白名單內且層級正確的權限鍵，適用的當前角色格須為 `allowed=true`。未知鍵、缺列、錯層、失效 membership 或缺失版本列均拒絕；⛔ 格不儲存。
3. 最後檢查操作自己的任務擁有權與狀態、指派、reviewer roster、資料集範圍、盲審與答案隔離。隱藏任務的拒絕不能揭露其存在；前端 server-derived capability 只作 task-scoped 呈現提示，每個命令仍由服務端重新判斷。

## Roles and operation mapping

- Admin 頁、矩陣讀寫／歷程與帳號管理同時要求當前 `super_admin` 及相應的 `admin.*` 格。`admin/006` 對應 `admin.user_management.view/manage`；`admin/007` 對應 `admin.role_settings.view/manage`。seeder 與最後超管保護仍生效。
- `task-management/010` 的列表入口使用 system 層 `task.list.view`，一般使用者只看自己有 active membership 的任務。刪除仍守其 active leader／當前超管與 draft 條件；V1 無 `task.delete` 鍵，不借用其他鍵。
- `task-management/013` 的建立操作同時要求 `TASK_CREATOR_SYSTEM_ROLES` 與 system 層 `task.create`；成功後原子建立 creator 的 leader membership。
- `task-management/014` 詳情讀取、Overview 儲存、成員管理、資料匯出分別使用 `task.detail.view`、`task.detail.edit`、`task.members.manage`、`dataset.export`，並各自保留資源條件。reviewer 的 view 為 true、edit 為 false。其他未映射生命週期命令待審查專用鍵。
- 同一人於同一任務可持有多個 task role，membership 邏輯唯一鍵為 `(task_id,user_id,task_role)`；非 workspace 頁面可聯集該任務 active membership 的允許鍵，但選定角色的狀態與移除只作用於該列。`annotation/015` 的標記／審核寫入只依明選 active role、該角色 active membership、對應格與實際指派判斷；URL 人員／角色參數不能建立正式身分。

## Matrix schema and write contract

`admin_role_permission` 候選表採非空複合 PK `(role_type,role_key,permission_key)` 與 `allowed BOOLEAN NOT NULL`；SQLite 另以 `allowed IN (0,1)` 檢查。V1 共有 9 個平台鍵 × 2 個 system role 加 8 個任務鍵 × 3 個 task role，即 42 列適用格；錯層 ⛔ 不存列。儲存須拒絕非白名單、缺列、多列、錯層與固定格違例。`super_admin × admin.*` 固定 true，`user × admin.*` 固定 false，既有 `dashboard.view` 對兩種 system role 固定 true。新可配置格預設 false；新鍵完成審查、完整種子與安全測試前仍屬未知鍵。新 `admin.*` 鍵核准啟用時，兩個固定格原子建立為 true／false。

`admin_role_permission_version` 候選表只允許 `id=1`，但缺列仍須拒絕。每次儲存含無變更提交都比較預期版本；有實際 diff 時以 compare-and-swap 更新版本與格，並於同交易插入 ADR-032 `role_permissions.changed`，`target_type='role_permission_matrix'`、`target_id='1'`。diff 由伺服器已存列計算；版本正確的無變更不遞增、不產生事件。兩表維持候選、未部署；任務表實體 PK／FK 待後續決策，不在此建立假 FK。

## Verification boundary

本 change 執行 OpenSpec schema validation、Project SDD lint、canonical 原文比對與 archive 後 Source-Verify。日後 runtime change 須先有安全 Red tests，涵蓋角色及 membership 撤銷、矩陣修改後下一請求、缺列／未知鍵、跨任務、reviewer view/edit、workspace active role、admin 硬邊界、CAS／稽核原子性與答案隔離；migration 另驗證 SQLite／PostgreSQL 的 PK、CHECK、42 列種子與回復路徑。

## Constitution Check

| 原則 | 設計對應 |
|---|---|
| II. Generalization-First | 權限鍵 registry 與操作映射依能力設計，不依 NLP task type 分支。 |
| III. Data Fairness | `allowed=true` 仍不能繞過 blind review 或取得 test-set answer。 |
| XI、XV. Security／RBAC | 當前身分、membership、格與資源條件皆為必要條件；缺漏拒絕且撤銷下次請求生效。 |
| XVIII. Deployment Safety | 本次只定候選契約；runtime/migration 分開，以回復與跨資料庫驗證為門檻。 |
