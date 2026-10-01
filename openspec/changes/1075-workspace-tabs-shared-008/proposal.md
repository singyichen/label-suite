---
對應 Spec: specs/shared/008-sidebar-navbar-shared/spec.md
對應 Issue: https://github.com/singyichen/label-suite/issues/1075
基準版本: 2.1.0
目標版本: 2.2.0
---

## Why

issue #1075（系統內建工作頁籤）已透過獨立規格 `specs/shared/019-workspace-tabs/spec.md`（v1.0.0）定義工作頁籤之完整行為——開啟／切換／去重、狀態還原、淘汰保護、快捷鍵、行動版下拉選單、403/404、無障礙，並已於 9 個堆疊 PR 群組（G1、G2a-1、G2a-2、G2b、G2c-1、G2c-2、G2d、G2e、G2f、G2g，對應 PR #1078／#1080／#1083／#1086／#1090／#1091／#1093／#1094／#1095／#1096）逐一實作並合併至 `design/prototype/pages/shared/sidebar.js`／`sidebar.css`。

spec 019 於撰寫當下即已明確劃清歸屬邊界（Q7）：頁籤列本身之行為由 019 定義與擁有，但有兩項內容因其性質屬於「共用 Sidebar 殼層」本身的既有規格（`shared-008`）管轄範圍，019 刻意不越界重複定義，而是留待本次變更以 `shared-008` 之 MODIFIED 條文補齊：

1. **關閉作用中頁籤後的焦點移動規則**（`specs/shared/019-workspace-tabs/spec.md` 之 FR-009／Q7）：`specs/shared/019-workspace-tabs/spec.md` 之 AC-1.5 僅規定「焦點依 `shared-008` MODIFIED 條文移至下一個頁籤」，規則本身的文字定義（優先移至右鄰、否則左鄰）留給本次補上。此規則已於 G2a-2（PR #1080）落地為 `closeWorkspaceTab()` 之 `Math.min(index, tabs.length - 1)` 邏輯，並有 `workspace-tabs-close-badge.spec.ts` 既有測試鎖定；本次為**純規格補述**，不異動程式碼。
2. **快捷鍵總覽新增頁籤快捷鍵條目**：`shared-008` 既有 FR-016 群（快捷鍵總覽入口）定義了總覽 modal 之顯示格式與規則（獨立 keycap、不合併列、僅列跨任務共用快捷鍵），但目前 modal 內容（`全域`／`標記作業`／`審核` 三個 section）尚未列出 `specs/shared/019-workspace-tabs/spec.md` 已實作的 `Alt+1…8`（切換頁籤）與 `Alt+W`（關閉作用中頁籤）——這兩個快捷鍵本身的行為定義（含可輸入元素抑制規則）已由 `specs/shared/019-workspace-tabs/spec.md` 之 FR-013、AC-5.1、AC-5.2、AC-5.3、AC-5.4 完整定義並實作（G2d，PR #1093），本次僅依 `shared-008` 既有 FR-016 群之總覽顯示規則，為其補上對應列表項目。此為**需要異動原型的小型 Green 工作**（modal 目前無「頁籤」相關 section）。

此外，`shared-008` 本身現在也是「工作頁籤列掛載所在的共用殼層」，故新增一個簡短使用者故事說明此一事實並交叉引用 019 為行為擁有方，避免重複定義其 FR。

## What Changes

- 新增**使用者故事 10 — 工作頁籤殼層整合**（P2，issue #1075）：說明共用 Sidebar 殼層現在也掛載工作頁籤列，完整行為定義見 `specs/shared/019-workspace-tabs/spec.md`（本規格不重複其 FR），並收斂本次唯二需要 `shared-008` 自身承接的條文。
- 新增 **FR-022**（關閉作用中頁籤焦點移動規則）：MUST 優先移至右鄰頁籤，若關閉者為最右側頁籤則移至左鄰；此為 `specs/shared/019-workspace-tabs/spec.md` 之 FR-009、AC-1.5 明文委由本規格定義的規則，行為已於原型 G2a-2 實作完成。
- 新增 **FR-016H**（快捷鍵總覽新增「頁籤」section，FR-016 群新成員，比照既有 FR-016G 之加列慣例）：總覽 MUST 新增「頁籤」section，列出 `Alt+1…8`（切換至對應位置頁籤）與 `Alt+W`（關閉作用中頁籤）兩列，依既有 FR-016C（獨立 keycap）／FR-016E（不合併列）／FR-016F（緊湊密度）規則呈現；兩快捷鍵本身之觸發行為與可輸入元素抑制規則由 `specs/shared/019-workspace-tabs/spec.md` 之 FR-013、AC-5.1、AC-5.2、AC-5.3、AC-5.4 定義，本條不重複定義，僅規範總覽顯示內容與格式。
- `規格相依性`／`下游（依賴本規格的規格）`表新增一列：`019 | Workspace Tabs | 本規格之共用殼層掛載頁籤列、承接關閉焦點移動規則與快捷鍵總覽項`。
- `Prototype Traceability` 表之 `sidebar.js`／`sidebar.css` 列 responsibility 描述小幅補充，註明現在也包含「workspace tab strip mount point」（行為由 019 擁有）。

## Capabilities

### New Capabilities

無。

### Modified Capabilities

- `shared/008-sidebar-navbar-shared`：新增 FR-022（關閉作用中頁籤焦點移動規則）、FR-016H（快捷鍵總覽頁籤 section）。

## Impact

- `specs/shared/008-sidebar-navbar-shared/spec.md`：新增使用者故事 10、FR-022、FR-016H；`規格相依性`／`Prototype Traceability` 小幅補充；版本 bump 至 2.2.0，Changelog 新增一列。
- `design/prototype/pages/shared/sidebar.js`：`renderSidebar()` 之 `shortcutHelpModal` 樣板新增「頁籤」section markup（`Alt+1…8`／`Alt+W` 兩列，獨立 keycap），並視需要新增/更新對應 zh/en i18n 字串；`closeWorkspaceTab()` 既有焦點移動邏輯**不異動**（FR-022 為既有行為之書面補述）。
- `design/prototype/tests/shared/`：新增 Red 測試驗證快捷鍵總覽 modal 新增之「頁籤」section 內容與 zh/en 呈現；既有 `workspace-tabs-close-badge.spec.ts`（驗證 `specs/shared/019-workspace-tabs/spec.md` 之 AC-1.5）、`workspace-tabs-shortcuts.spec.ts`（驗證 `specs/shared/019-workspace-tabs/spec.md` 之 AC-5.1 至 AC-5.4）不受影響、不重複撰寫。
- `specs/shared/019-workspace-tabs/spec.md`：狀態更新、版本 bump 至 1.1.0，Changelog 記錄本次確認與原型僅能模擬之 AC 清單——此為同一 PR 群組內與本變更配套之收尾動作，獨立於本 `shared-008` delta 之外另行處理（019 本身非本次 OpenSpec change 之 MODIFIED 對象，不透過本 delta 回寫）。
- `specs/STATUS.md`：`shared-008`／`shared-019` 兩列更新（附加歷程，不覆蓋既有欄位）。
- 不影響 API 契約、DB schema；不改變 FR-016（原文）、FR-016A～FR-016G（既有）之任一字；不改變任何既有 L0 導覽、角色解析（FR-019～FR-021 群）行為。

## Constitution Check

- **Generalization-First**：FR-022 之焦點移動規則與 FR-016H 之總覽顯示規則皆為通用殼層行為，不含任何任務 ID 或頁面專屬分支。
- **Data Fairness**：不涉及任何測試集答案或 ground-truth 顯示邏輯。
- 未觸及 API 契約或 DB schema，`design.md` 依 schema 規則列為選用，本變更省略。
