# 規格狀態索引

> **用途**：作為所有功能規格流程狀態的單一真實來源（Single Source of Truth）。
> **更新規則**：當建立新的 spec 產物、開啟分支，或功能被封存時，需更新本表。
> **封存規則**：功能實作合併至 `main` 後，執行 `mv specs/[module]/NNN-feature specs/_archive/NNN-feature`，並將 Status 更新為 `archived`。

## 狀態說明

| Status | 說明 |
|--------|------|
| `spec-ready` | 已有 `spec.md`，尚未開始 planning |
| `plan-ready` | 已建立 `plan.md`，尚未拆解 tasks |
| `tasks-ready` | 已建立 `tasks.md`，尚未開始實作 |
| `in-progress` | 實作分支進行中 |
| `review` | PR 已開啟，等待合併 |
| `done` | 已合併至 `main`，尚未封存 |
| `archived` | 已移至 `specs/_archive/` |

---

## 功能流程（已存在 Spec 檔案）

| ID | 功能 | 模組 | 狀態 | 分支 | 備註 |
|---|------|------|------|------|------|
| account-001 | Login — Email / Password | account | `in-progress` | `feat/dashboard-012-spec-simplify` | 規格文案已對齊最新原型（語言切換為單一代碼 `ZH/EN`） |
| account-002 | Login — Google SSO | account | `in-progress` | `feat/dashboard-012-spec-simplify` | 規格文案已對齊最新原型（語言切換為單一代碼 `ZH/EN`） |
| account-003 | Register — Email / Password | account | `in-progress` | `feat/dashboard-012-spec-simplify` | 規格文案已對齊最新原型（語言切換為單一代碼 `ZH/EN`） |
| account-004 | Forgot / Reset Password | account | `in-progress` | `feat/dashboard-012-spec-simplify` | forgot/reset 流程文案已同步目前原型狀態 |
| account-005 | Profile Settings | account | `spec-ready` | — | |
| admin-006 | User Management | admin | `spec-ready` | — | IA v7 重建完成（`specs/admin/006-user-management/spec.md`） |
| admin-007 | Role & Permission Settings | admin | `spec-ready` | — | IA v7 重建完成（`specs/admin/007-role-settings/spec.md`） |
| dashboard-012 | Dashboard | dashboard | `in-progress` | `feat/dashboard-012-spec-simplify` | spec 與 IA 對齊進行中；wireframe 已完成（PR #27） |
| shared-008 | Shared Sidebar Navbar | shared | `in-progress` | `feat/design-system-pen-sync` | shared navbar spec 已建立並與 IA 對齊 |
| annotation-015 | Annotation Workspace | annotation | `spec-ready` | — | IA v1.3.1 重建完成（`specs/annotation/015-annotation-workspace/spec.md`） |
| task-management-010 | Task List | task-management | `spec-ready` | `docs/admin-tab-navigation` | IA 重建完成（`specs/task-management/010-task-list/spec.md`） |
| task-management-013 | New Task (+ Config Builder) | task-management | `spec-ready` | `docs/admin-tab-navigation` | IA 重建完成（`specs/task-management/013-task-new/spec.md`） |
| task-management-014 | Task Detail (incl. task-member-management/work-log) | task-management | `spec-ready` | `docs/admin-tab-navigation` | IA 重建完成（`specs/task-management/014-task-detail/spec.md`） |

---

## 待辦清單（Spec 檔案尚未建立／需重建）

| ID | 功能 | 目標模組 | 規劃備註 |
|---|------|----------|----------|
| dataset-016 | Dataset Stats | dataset | spec 檔案已移除；將依最新 IA/模組規劃重建 |
| dataset-017 | Dataset Quality | dataset | spec 檔案已移除；將依最新 IA/模組規劃重建 |

---

## 變更紀錄

| 日期 | 更新內容 |
|------|----------|
| 2026-04-23 | 新增 `annotation-015` 規格檔（`specs/annotation/015-annotation-workspace/spec.md`）；狀態更新為 `spec-ready`，並自 backlog 移除。 |
| 2026-04-20 | 新增 `task-management-010`、`task-management-013`、`task-management-014` 規格檔；狀態更新為 `spec-ready`，並自 backlog 移除。 |
| 2026-04-16 | 新增 `admin-006` 與 `admin-007` 規格檔（IA v7 重建）；狀態更新為 `spec-ready`，並自 backlog 移除。 |
| 2026-04-16 | 已同步 STATUS 與目前 repository 狀態：自 active pipeline 移除已刪除 spec 項目、加入 `shared-001`，並將 `006/007/010/013/014/015/016/017` 移至 backlog 等待重建。 |
| 2026-04-15 | 將 `001/002/003/004/012` 狀態由 `spec-ready` 更新為 `in-progress`；分支設定為 `feat/dashboard-012-spec-simplify`；並同步備註與最新 account/dashboard spec 及 IA 對齊進度。 |

---

## 封存紀錄

> 功能資料夾移至 `specs/_archive/` 後，請在此新增紀錄。

| # | 功能 | 封存日期 | 合併 PR |
|---|------|----------|---------|
| — | — | — | — |
