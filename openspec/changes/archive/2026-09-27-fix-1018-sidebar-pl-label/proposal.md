---
對應 Spec: specs/shared/008-sidebar-navbar-shared/spec.md
對應 Issue: https://github.com/singyichen/label-suite/issues/1018
基準版本: 1.6.0
目標版本: TBD
---

## Why

issue #1018 承接自 #994（PR #1017）之發現：`design/prototype/pages/shared/sidebar.js` 之 `renderSidebar()` 於 `taskRole === 'project_leader'` 時，`navAnnotation`（L0「標記作業」項目）仍落回既有預設「標記作業」——這是 `specs/shared/008-sidebar-navbar-shared/spec.md` FR-020（issue #944，2026-09-25 裁定，方向 A——收斂到來源）明文之既有判定，其依據為「與 annotation-015 FR-080 之 `crumbWorkAreaAnnotator` 文字一致」。

但 #994／PR #1017 已讓同一畫面（`annotation-workspace.html`，`role=project_leader`）之入口麵包屑第一層改用新增之 `crumbWorkAreaProjectLeader`（「例外處置」／`Exception Disposition`），不再與 `crumbWorkAreaAnnotator`（「標記作業」）一致。FR-020 原本用來支撐「`project_leader` 應維持標記作業」的交叉引用已因此失效，造成同一畫面上「側欄說標記作業、麵包屑說例外處置」的自相矛盾——與 #931／#934／#994 這一系列修補的正是同一類缺陷（來源與消費端／不同展示位置的角色文案不一致）。

原 issue body 建議沿用 #931 手法（於 `annotation-workspace.config.js` 消費端覆寫）已不可行：該手法已被 #944／PR #979 收斂進 `sidebar.js` 本身而移除，且現行 FR-020 明文禁止消費頁面掛載後以 DOM 操作覆寫 `#navAnnotation`。實查 11 個 `mountSidebar()` 呼叫點，僅 `annotation-workspace.html:1111` 傳入 `taskRole`，故本次變更之實際影響面僅一個畫面。

維護者裁定（2026-09-27）：授權推翻 FR-020 對 `project_leader` 之既有判定（MAJOR 規格變更），理由：(1) 影響面實查僅一個頁面；(2) FR-020 原判定依據之交叉引用已被 #994／PR #1017 推翻，不改則兩支正典持續矛盾；(3) 修補的是同一系列角色文案不一致缺陷。

## What Changes

- **MODIFIED FR-020**：`navAnnotation` 標籤解析新增 `project_leader` 分支——`project_leader` 顯示「例外處置」(en: `Exception Disposition`)，與 annotation-015 麵包屑 `crumbWorkAreaProjectLeader` 文字一致；`reviewer` 分支不變（「審核作業」/`Review`）；`annotator` 或未提供時維持既有預設「標記作業」不變。解析仍必須於 Shared Sidebar 元件內部（`renderSidebar()`）完成，消費頁面不得於掛載後另行以 DOM 操作覆寫。
- **MODIFIED SC-013A**：同步修訂為「`annotator` 任務角色下 `#navAnnotation` 維持既有預設『標記作業』；`project_leader` 任務角色下 `#navAnnotation` 改為『例外處置』」，不再將二者併列同一預設。`role-indicator`（FR-020A／SC-013A 之 `annotator` → 「一般使用者」）部分不變，不在本次範圍內。
- 延伸 `design/prototype/pages/shared/sidebar.js` 現有 `taskRoleI18n` 對照表，新增一鍵（zh：「例外處置」/en：`Exception Disposition`），並於 `navItems` 之 `annotation` 項目 `defaultLabel` 解析新增 `project_leader` 分支。解析全部於 `sidebar.js` 元件內部完成，不新增或修改任何消費頁面之 DOM 覆寫程式碼。

## Capabilities

### New Capabilities

無。

### Modified Capabilities

- `shared/008-sidebar-navbar-shared`：MODIFIED FR-020、SC-013A（`navAnnotation` 新增 `project_leader` → 「例外處置」分支）。

## Impact

- `design/prototype/pages/shared/sidebar.js`：`taskRoleI18n` 新增鍵、`navItems` 之 `annotation` 項目 `defaultLabel` 解析新增 `project_leader` 分支。
- `specs/shared/008-sidebar-navbar-shared/spec.md`：MODIFIED FR-020、SC-013A；版本 bump（MAJOR，版本號由主 session 於合併時指派，本次先留佔位符），Changelog 新增一列。
- 影響面：僅 `annotation-workspace.html`（唯一傳入 `taskRole` 之 `mountSidebar()` 呼叫點）之 `role=project_leader` 畫面；其餘 10 個 `mountSidebar()` 呼叫點未傳 `taskRole`，落回既有預設，不受影響。
- 不影響 `reviewer`、`annotator` 分支既有輸出；不影響 API 契約、DB schema；不影響 `specs/annotation/015-annotation-workspace/spec.md`（該正典已於 issue #994／PR #1017 完成麵包屑修訂，本次不重複修改，僅使側欄與其一致）。
- 不處理 issue #1023（`annotation-list.html` 未傳 `taskRole`），依維護者排程留待下一波。

## Constitution Check

- **Generalization-First**：新增分支為通用角色→文字對照的延伸，沿用既有 `taskRoleI18n` 機制（比照 #944 前例），不含任何任務 ID 或頁面專屬硬編碼分支。
- **Data Fairness**：不涉及任何測試集答案或 ground-truth 顯示邏輯。
- 未觸及 API 契約或 DB schema，`design.md` 依 schema 規則列為選用，本變更省略。
