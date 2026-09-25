---
對應 Spec: specs/shared/008-sidebar-navbar-shared/spec.md
對應 Issue: https://github.com/singyichen/label-suite/issues/944
基準版本: 1.5.1
目標版本: 1.6.0
---

## Why

issue #944 發現共用側欄 `sidebar.js` 的 `navItems` 之 `標記作業` L0 項目與使用者晶片下方的 `roleIndicator` 角色標示，皆只由一個寫死字串渲染（分別為 `標記作業`、`一般使用者`），不隨任務角色（`project_leader / reviewer / annotator`）解析。`annotation-workspace` 頁面（reviewer 視角必須讀作「審核作業」「審核員」）因此各自在消費端（`annotation-workspace.config.js` 的 `applyStaticI18nText()`）以 `document.getElementById(...).textContent = ...` 直接補寫，繞過 `sidebar.js` 既有之 `updateUserChip()` 安全寫入管道，且與麵包屑首層（specs/annotation/015-annotation-workspace/spec.md 的 **FR-080**，同樣讀 reviewer→審核作業／annotator・project_leader→標記作業）各自維護一份判斷邏輯。

維護者裁定（2026-09-25，issue #944）：**採方向 A——收斂到來源**。這件事已被遺忘兩次——issue #309（角色指示器覆寫）與 issue #931（「標記作業」vs「審核作業」覆寫）都是消費端事後補丁，來源側欄從未真正支援角色解析。不收斂就會有第三次遺忘。

`sidebar.js` 已具備解決此問題的既有擴充點（`opts.roleIndicator`、`updateUserChip({ roleLabel })`、`adminSubmenuI18n` 這類側欄自帶雙語小型對照表之既有前例），本次變更延伸同一慣例：新增 `opts.taskRole`（值域與正典既有「任務角色」一致：`reviewer` / `project_leader` / `annotator`），由 `renderSidebar()`／`mountSidebar()` 內部依此解析 `navAnnotation` 標籤與 `roleIndicator` 預設文字，移除 `annotation-workspace.config.js` 內兩處直接操作 DOM 的消費端覆寫。

麵包紙既有的角色分流（specs/annotation/015-annotation-workspace/spec.md 的 FR-080 之 `crumbWorkAreaReviewer`／`crumbWorkAreaAnnotator`）**不變更**；側欄新增之解析結果與其一致（reviewer → 審核作業／審核員，project_leader・annotator → 標記作業／一般使用者），但不共用同一份 i18n 表——`sidebar.js` 於掛載當下（頁面尚未載入自身 i18n 模組）以獨立、僅含本條所需雙語詞彙之對照表解析，與 `adminSubmenuI18n`（使用者管理／角色設定）既有前例同構；不引入跨模組共用 i18n 架構，該架構性議題超出本次範圍。

## What Changes

- 新增 **FR-020**（`navAnnotation` 標籤依任務角色解析）：`sidebar.js` 的 `navItems` 之 `annotation` 項目，MUST 依 `opts.taskRole` 解析顯示文字——`reviewer` 時顯示「審核作業」(en: Review)，`project_leader`／`annotator`／未提供時維持既有預設「標記作業」；解析 MUST 於 `renderSidebar()` 掛載當下完成，頁面 MUST NOT 於掛載後另行以 DOM 操作覆寫 `#navAnnotation` 文字節點。
- 新增 **FR-020A**（`roleIndicator` 角色標示依任務角色解析）：`sidebar.js` 的使用者晶片 `roleIndicator`，於頁面未透過既有 `opts.roleIndicator` 顯式覆寫時（例如系統管理頁固定顯示「系統管理員」，不受本條影響），MUST 依 `opts.taskRole` 解析預設文字——`reviewer` → 「審核員」(en: Reviewer)、`project_leader` → 「專案負責人」(en: Project leader)、`annotator`／未提供時維持既有預設「一般使用者」；解析 MUST 於掛載當下完成，頁面 MUST NOT 於掛載後另行以 DOM 操作覆寫 `#roleIndicator` 文字節點。
- 移除 `design/prototype/pages/annotation/annotation-workspace.config.js` 的 `applyStaticI18nText()` 內兩處消費端覆寫（issue #309 之 `roleIndicatorEl.textContent = t('wsHistoryRoleReviewer')` 分支、issue #931 之 `navAnnotationEl.textContent = t('crumbWorkAreaReviewer')` 分支），改由 `design/prototype/pages/annotation/annotation-workspace.html` 之 `mountSidebar()` 呼叫，於掛載時自 URL `role` 參數同步解析並傳入 `taskRole` 選項。

**已知取捨（不在本次範圍內修正）**：`sidebar.js` 本身不具備頁面級語言即時切換能力（`navItems` 預設文字恆為繁體中文，其餘 L0 項目如 `navDashboard` 在 `annotation-workspace`／`annotation-list` 頁面上亦從未隨語言切換翻譯，為既有、已被接受之限制）。移除前，`#309` 覆寫曾使 reviewer 模式下的 `roleIndicator`／`navAnnotation` 在**即時切換**語言時翻譯為英文（因該覆寫呼叫頁面自身 `t()`）；移除後，兩者僅於**頁面載入當下**依 `taskRole` 與（`roleIndicator` 部分）掛載當下的既有語言狀態正確解析一次，不再隨後續即時切換更新——此行為與同頁其餘 L0 項目、`annotator`／`project_leader` 模式下原本即存在之限制一致，且無任何既有測試涵蓋即時切換情境，故視為本次「消費端覆寫」移除之合理連帶結果，不另立新 FR 承諾即時翻譯。

## Capabilities

### New Capabilities

無。

### Modified Capabilities

- `shared/008-sidebar-navbar-shared`：新增 FR-020、FR-020A（`navAnnotation`／`roleIndicator` 依任務角色解析）。

## Impact

- `design/prototype/pages/shared/sidebar.js`：`renderSidebar()` 新增 `opts.taskRole` 解析（含一個僅含「審核員／Reviewer／專案負責人／Project leader／審核作業／Review」雙語對照的小型內部表，比照既有 `adminSubmenuI18n` 前例）。
- `design/prototype/pages/annotation/annotation-workspace.html`：`mountSidebar()` 呼叫新增自 URL `role` 參數同步解析之 `taskRole` 選項。
- `design/prototype/pages/annotation/annotation-workspace.config.js`：`applyStaticI18nText()` 移除 issue #309、#931 兩處消費端 DOM 覆寫分支。
- `specs/shared/008-sidebar-navbar-shared/spec.md`：新增 FR-020、FR-020A；版本 bump 至 1.6.0，Changelog 新增一列。
- 既有測試位移：`design/prototype/tests/annotation/issue-309-reviewer-workspace-vocab.spec.ts`（`role-indicator` 斷言）、`design/prototype/tests/annotation/issue-931-sidebar-reviewer-label.spec.ts`（`#navAnnotation` 斷言）行為不變，僅斷言來源由消費端覆寫改為 `sidebar.js` 原生解析，不刪除既有斷言。
- 新增 Playwright 契約測試驗證解析發生於 `sidebar.js` 本身（不依賴 `applyStaticI18nText()` 覆寫）與 issue #946 XSS 契約迴歸防護。
- 不影響 API 契約、DB schema、specs/annotation/015-annotation-workspace/spec.md 的 FR-080 麵包屑既有邏輯與文字、其他模組。

## Constitution Check

- **Generalization-First**：`taskRole` 解析為通用的角色→文字對照，不含任何任務 ID 或頁面專屬分支；沿用既有 `opts.roleIndicator` 顯式覆寫優先序，不破壞系統管理頁等既有非任務角色用途。
- **Data Fairness**：不涉及任何測試集答案或 ground-truth 顯示邏輯。
- 未觸及 API 契約或 DB schema，`design.md` 依 schema 規則列為選用，本變更省略。
