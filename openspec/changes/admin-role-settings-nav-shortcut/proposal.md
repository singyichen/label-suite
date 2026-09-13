---
對應 Spec: specs/shared/008-sidebar-navbar-shared/spec.md
對應 Issue: #725
基準版本: 008 v1.4.4
目標版本: 008 v1.5.0
---

## Why

Issue #725 指出 `super_admin` 調整角色權限的路徑比預期長：`角色設定` 不是側欄一級項目，得先點側欄「系統管理」進入 `user-management.html`，再點頁內 admin-tabs 的「角色設定」才能到達 `role-settings.html`，實走判定命中 issue #645 使用者到達路徑圖的 F1（點擊數超標）。

維護者已就「是否新增側欄一級項目」的架構衝突做出裁示：採用方案 (b)——「系統管理」改為可展開次選單（`使用者管理`／`角色設定` 兩個子項），不新增 L0 扁平項目，因此不違反 `specs/shared/008-sidebar-navbar-shared/spec.md` 既有鎖定的 FR-002／FR-003A／SC-003（L0 導覽項清單與 `super_admin`=6／`user`=5 之計數契約）。

本變更新增正典行為（次選單觸發、展開/收合、目前子項標示、Mobile 與 Desktop 收合狀態的既有行為維持），因此不符合 Lightweight Path「不新增/移除 FR/AC」的條件，改走完整 OpenSpec change 流程。

## What Changes

- **新增 FR-019 群（FR-019／FR-019A／FR-019B／FR-019C／FR-019D／FR-019E）**：Desktop（`> MOBILE_BP`）且 Sidebar 未收合時，L0「系統管理」項目提供可展開次選單（`role="menu"`），內容為「使用者管理」（→ `user-management`）與「角色設定」（→ `role-settings`）兩個子項連結；次選單以點擊觸發／關閉（再次點擊、點擊選單外、或 `Esc`），子項依目前頁面標示恰一個「目前項」；Mobile 與 Desktop 收合狀態維持既有「點擊直接導向 `user-management`」行為，不開啟次選單。
- **新增 SC-012 群（SC-012／SC-012A／SC-012B）**：`super_admin` 可於 Desktop 未收合 Sidebar 一次點擊內直達 `role-settings`；次選單不影響 SC-003 既有 L0 計數矩陣；Mobile／收合狀態下的既有點擊行為不因本次變更產生落差。
- **新增使用者故事 8（系統管理次選單快速直達，issue #725）**：驗收情境涵蓋次選單開關、直達導頁、目前子項標示、Mobile／收合 fallback、既有 admin-tabs 入口保留。
- 不修改 FR-002／FR-003A／FR-006／FR-007／SC-003 既有文字：L0 導覽項清單、順序、計數與既有 active 映射規則維持不變；`role-settings`／`user-management` 仍同時映射為「系統管理」active（FR-006 不變）。
- 不修改 `specs/admin/006-user-management/spec.md`、`specs/admin/007-role-settings/spec.md`：`user-management.html` 既有 admin-tabs（使用者管理／角色設定）導覽與行為不變，此為額外入口而非取代。
- 不修改 API、DB schema、後端授權邏輯；次選單子項的 href 皆沿用既有頁面既有的相對路徑推導，不新增後端路由。

## Capabilities

### New Capabilities

無（新需求併入既有 `shared/008-sidebar-navbar-shared` capability）。

### Modified Capabilities

- `shared/008-sidebar-navbar-shared`：新增 FR-019 群與 SC-012 群、新增使用者故事 8；「L0 群組與目標頁（IA Contract）」之 Admin 條目補註次選單存在但不改變其映射與計數契約。

## Impact

**規格**

- 正典：`specs/shared/008-sidebar-navbar-shared/spec.md`（v1.4.4 → v1.5.0，**MINOR**：新增能力，不移除或破壞既有 FR/SC）
- 衍生檢視：`openspec/specs/shared/008-sidebar-navbar-shared/spec.md`（archive 時自動合併）
- 確認相容、不修改：`specs/admin/006-user-management/spec.md`（FR-010 既有 admin-tabs 導覽）、`specs/admin/007-role-settings/spec.md`（FR-006 既有 admin-tabs 導覽）——兩者既有導覽契約不受影響，本次只在 `008` 新增額外側欄入口。

**原型程式（Constitution Principle X 之產品檔案盤點）**

- `design/prototype/pages/shared/sidebar.js`：新增次選單 DOM 產生（`adminNavGroup()`）、次選單開關/目前子項判斷邏輯、i18n、事件綁定（點擊開關、點擊外部關閉、`Esc` 關閉、收合/resize 時自動關閉）。既有 5 個 L0 項目（`navItem()`）與既有選項（`adminHref` 等）不變，其餘 13 個消費頁面呼叫 `mountSidebar()` 的既有參數不需修改。
- `design/prototype/pages/shared/sidebar.css`：新增 `.nav-link-group`／`.nav-caret`／`.nav-submenu`／`.nav-sublink` 樣式；Mobile 與收合狀態下以 CSS 保證次選單與展開箭頭不渲染（與 JS fallback 為 defense-in-depth）。
- 新增 Red／Green 測試：`design/prototype/tests/shared/issue-725-admin-submenu-shortcut.spec.ts`。
- 不修改任何模組頁面（`dashboard.html`、`task-list.html`、`user-management.html`、`role-settings.html` 等）既有 `mountSidebar()` 呼叫參數；`roleSettingsHref` 由 `sidebar.js` 內部以既有 `adminHref` 字串推導（`user-management.html` → `role-settings.html`），不需逐頁新增選項。

## Constitution Check

- **II. Generalization-First（NON-NEGOTIABLE）**：次選單只讀既有 `adminHref`／`systemRole`／`window.location.pathname`，不依 task_id 或任務類型分支，不新增 task type 邏輯。
- **III. Data Fairness（NON-NEGOTIABLE）**：純導覽 UI 變更，不涉及任何標記答案或 ground-truth 資料。
- **IV. Test-First**：先提交 Red 測試（次選單觸發前不存在、次選單開關、直達導頁、目前子項標示、Mobile／收合 fallback、既有 admin-tabs 入口保留、L0 計數不變），再由 Green 實作。
- **X. Change Scope Discipline**：手寫生產變更僅 `sidebar.js` 與 `sidebar.css` 兩檔，單一目的、單一 PR 群組（final group）。
- **XX. Source of Truth**：正典為 `specs/shared/008-sidebar-navbar-shared/spec.md` v1.4.4；本 proposal 引用之 FR-002、FR-003A、FR-006、FR-007、SC-003 於 archive 回寫後皆可 grep 定位；新增 FR-019 群、SC-012 群同步可定位。
