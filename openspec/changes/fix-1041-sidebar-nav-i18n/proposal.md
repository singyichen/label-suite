---
對應 Spec: specs/shared/008-sidebar-navbar-shared/spec.md
對應 Issue: https://github.com/singyichen/label-suite/issues/1041
基準版本: 2.0.1
目標版本: TBD
---

## Why

issue #1041 originally described the six Shared Sidebar L0 nav labels (`navDashboard` / `navTaskManagement` / `navAnnotation` / `navDataset` / `navAdmin` / `navProfile`) as "hardcoded Chinese, not language-aware", implying all non-admin consumer pages leaked untranslated Chinese under `lang=en`. Pre-dispatch investigation and this change's own page-by-page inventory (`grep -rl "mountSidebar(" design/prototype/pages/`, cross-checked against every `applyLang`/i18n-table call site) overturned that premise:

- 10 of the 11 pages that mount the shared sidebar (`admin/user-management.html`、`admin/role-settings.html`、`annotation/annotation-list.html`(5 keys)、`account/profile.html`、`dashboard/dashboard.js`+`dashboard.i18n.js`、`dataset/dataset-analysis-detail.html`、`dataset/dataset-analysis-list.js`+`.i18n.js`、`task-management/task-detail.html`／`task-list.html`／`task-new.html`) already keep their own zh/en i18n tables for these six ids and overwrite the `#navXxx` DOM nodes from their own `applyLang`, at mount and on every language-toggle click. Their users already see the correct English labels — via a page-level DOM overwrite mechanism that directly violates `specs/shared/008-sidebar-navbar-shared/spec.md` FR-020's explicit prohibition ("此解析必須於 Shared Sidebar 元件內部完成，消費頁面不得於掛載完成後另行以 DOM 操作覆寫該節點之顯示文字"), not a real i18n gap.
- The two places where an English-locale user genuinely sees untranslated Chinese are: (1) `annotation/annotation-list.html`'s `#navAnnotation` for the `annotator` role/no-role case — issue #1023／PR #1046 removed that page's own `navAnnotation` overwrite to let the role-aware label take effect, and documented the resulting regression (English `'Annotation'` → untranslated `標記作業`) as deliberately accepted, tracked at this issue (`design/prototype/tests/shared/issue-1023-list-sidebar-taskrole.spec.ts` file header and its regression-guard test); and (2) `annotation/annotation-workspace.html`, which mounts the sidebar with zero page-level override and no language-toggle UI of its own, yet is reachable via a deep link with `localStorage.labelsuite.lang = 'en'` already set by another page — there, only the `annotation` item is language-aware (`taskRoleI18n`), so the other five labels render in Chinese, producing the actual "five Chinese, one English" mix this issue's body described.
- All ten pages' existing zh/en literal values for the six ids are pairwise identical (verified by direct `grep`), and none of them pass `taskRole` to `mountSidebar()`, so once `sidebar.js` resolves all six labels language-aware and re-resolves them on every `applyGlobalLanguage()` call, those ten pages' page-level overwrites become harmless dead code regardless of call order relative to `applyGlobalLanguage()` (confirmed for both orderings present in the inventory). Removing them converges the codebase on FR-020 compliance and removes ten copies of duplicated logic (DRY) — it is not a user-visible bug fix.

Given this, the maintainer directed (2026-09-28) that this remains Direction A (converge into `sidebar.js`, MINOR, no existing FR/AC overturned) but splits into an intermediate PR-group sequence under one OpenSpec change, per `docs/sdd-workflow.md` §"intermediate PR group"／"final PR group": the first PR group fixes the two real user-visible defects; later PR groups remove the now-redundant page-level overwrites in module-sized batches (≤ 5 production files each), with the final group performing the Source-Verify + `/opsx:archive` write-back and closing #1041.

## What Changes

- **ADDED FR-021**：Shared Sidebar 之六個 L0 導覽標籤（`navDashboard`／`navTaskManagement`／`navAnnotation`／`navDataset`／`navAdmin`／`navProfile`）之顯示文字必須於元件內部（`design/prototype/pages/shared/sidebar.js`）依語言（`readStoredLang()`）解析雙語值，且必須於每次呼叫 `applyGlobalLanguage(lang, options)` 時重新解析並更新對應 DOM 節點——不只於掛載當下解析一次。`navAnnotation` 項之角色分流（既有 FR-020，`reviewer` / `project_leader` / 其餘）三個分支皆須有對應英文字串（`reviewer` → `Review`、`project_leader` → `Exception Disposition`，兩者為既有值；`annotator` 或未提供 → 新增 `Annotation`，沿用全站既有消費頁一致採用之既有慣例字面值，非新創字串）。此解析必須於元件內部完成；消費頁面不得於掛載完成後另行以 DOM 操作覆寫此六個節點之顯示文字（重申既有 FR-020 消費端覆寫禁令之適用範圍，明確擴及全部六個 L0 標籤，不僅 `navAnnotation`）。
- **ADDED SC-014**：於任一語系（zh/en）、任一 `taskRole`（`reviewer` / `project_leader` / `annotator` / 未提供）組合下，直接呼叫 Shared Sidebar 掛載函式並切換語言（呼叫 `applyGlobalLanguage`），六個 L0 標籤之渲染文字須與 FR-021 定義之雙語對照表逐字一致，且語言切換後立即反映新語系，不需重新掛載或重新整理頁面。
- 修訂 `design/prototype/pages/shared/sidebar.js`：`navItems` 之五個既有硬編碼中文 `defaultLabel`（`儀表板`／`任務管理`／`資料集分析`／`系統管理`／`個人設定`）與 `taskRoleI18n` 之 `annotator`/else 分支，改由 FR-021 定義之語言感知對照表解析；`applyGlobalLanguage()` 新增六個節點之重新解析掛勾（比照既有 `updateShortcutHelpLanguage()`／`updateAdminSubmenuLanguage()` 前例），並持久化最近一次 `mountSidebar()` 傳入之 `taskRole`，供語言切換時重新解析 `navAnnotation` 使用。
- 移除 `design/prototype/pages/annotation/annotation-list.html` 已成孤兒的 5 個 `applyNavLabels()` 覆寫項目（`navDashboard`／`navTaskManagement`／`navDataset`／`navAdmin`／`navProfile`；`navAnnotation` 已於 #1023 移除）與其 `I18N.zh`／`I18N.en` 字典中對應的孤兒 key，本次 PR 群組範圍。
- 改寫 `design/prototype/tests/shared/language-switch-consistency.spec.ts:77`「keeps admin sidebar navigation labels translatable in both admin pages」：原斷言強制 admin 兩頁在自己的 i18n 表定義並於 `applyLang` 更新六個 nav key——這正是 FR-020 明文禁止的消費端覆寫，此測試在強制違規。改寫為斷言新行為：標籤由 `sidebar.js` 內部解析、隨語言切換重新解析，且消費頁面（本次先覆蓋 admin 兩頁；其餘頁面隨後續 PR 群組移除覆寫後一併補上）不得再自行定義或更新這六個 key。
- 更新 `design/prototype/tests/shared/issue-1023-list-sidebar-taskrole.spec.ts` 之「DELIBERATELY ACCEPTED REGRESSION」案例斷言與檔頭／行內註解：該迴歸（英文語系下 `annotator` 角色 `#navAnnotation` 退回未翻譯之「標記作業」）於本次落地後消失，斷言應改為 `'Annotation'`，註解同步移除「此為刻意接受之迴歸、等待 #1041」的說明，改記錄為已由本 issue 修正。
- **本 PR 群組範圍外（後續 PR 群組，change 保持 open）**：移除 `admin/user-management.html`、`admin/role-settings.html`、`dashboard/dashboard.js`+`dashboard.i18n.js`、`dataset/dataset-analysis-detail.html`、`dataset/dataset-analysis-list.js`+`.i18n.js`、`account/profile.html`、`task-management/task-detail.html`／`task-list.html`／`task-new.html` 共 10 個頁面已成為死碼、僅為 FR-020 合規／DRY 考量而移除之冗餘覆寫；最後一個 PR 群組完成 Source-Verify 預掃與 `/opsx:archive` 雙寫（含正典版本 bump 與 Changelog），並 `Closes #1041`。

## Capabilities

### New Capabilities

無。

### Modified Capabilities

- `shared/008-sidebar-navbar-shared`：ADDED FR-021、SC-014（六個 L0 標籤全面語言感知，於元件內部解析並隨 `applyGlobalLanguage` 重新解析；重申 FR-020 消費端覆寫禁令適用全部六個節點）。既有 FR-020／FR-020A／FR-019 群等條文逐字不動，未推翻任何既有 FR/AC。

## Impact

- 本 PR 群組（第一組，`Refs #1041`，不 `Closes`）生產檔案：`design/prototype/pages/shared/sidebar.js`、`design/prototype/pages/annotation/annotation-list.html`（2 個，測試檔與 `specs/**`／`openspec/**` 不計入門檻）。
- 修復兩處真實使用者可見缺陷：`annotation-list.html` 之 `annotator`／無角色情境英文標籤缺失；`annotation-workspace.html` deep-link 情境下五中一英混雜。
- 後續 PR 群組（同一 OpenSpec change，change 保持 open）依模組分批移除其餘 10 個消費頁面已成死碼的冗餘覆寫，純屬 FR-020 合規與 DRY,非修復使用者可見缺陷；分組與檔案清單見 `tasks.md`。
- 不影響 API 契約、DB schema；不影響 FR-002／FR-003A（L0 清單與計數）、FR-019 群（次選單）、FR-020A（roleIndicator）。
- 不推翻任何既有 FR/AC，屬 MINOR。

## Constitution Check

- **Generalization-First**：新增的語言感知解析為通用的 id→雙語字面值對照表機制，比照既有 `adminSubmenuI18n`／`taskRoleI18n` 前例，不含任何任務 ID 或頁面專屬硬編碼分支。
- **Data Fairness**：不涉及任何測試集答案或 ground-truth 顯示邏輯。
- 未觸及 API 契約或 DB schema，`design.md` 依 schema 規則列為選用，本變更省略。
