---
對應 Spec: specs/task-management/013-task-new/spec.md
對應 Issue: #1338
基準版本: 013 v8.3.2
目標版本: 013 v8.4.0
---

## Why

issue #1337（複雜樣本顯示）要讓標記者在標記清單中看到有意義的樣本標題，而非一律退回 `id` 或列號。#1338 是該母單四個子單的第一張（A→B、A→C、B+C→D）：先在建立者的 Step 1 欄位預覽提供「清單標題」下拉與「標記清單預覽」，讓建立者明確指定哪一個欄位當標題；「自動」摘要規則由 #1339 負責，對話型樣本由 #1340／#1341 負責，皆不在本單。

本變更新增一個任務設定鍵 `list_title_field`（`null` ＝ 自動），屬新 FR／AC 與新設定鍵，不符合 Lightweight Path，走完整 OpenSpec change，並因設定鍵需定義型別與持久化契約而附 `design.md`。

**是否需要存在（YAGNI 檢查）**：需要。目前建立者沒有任何方式指定清單標題，且標題欄位的候選範圍牽涉 Data Fairness（Output 欄位不得外洩給標記者），必須由規格明文約束，不能留給實作自行決定。

**Data Fairness（NON-NEGOTIABLE）**：下拉選項只含角色為 Input 或 Evidence 的欄位與 `id`；Output 欄位永不列入。標題預覽僅顯示標記者本就可見的欄位內容。FR-002c-8 已確立「不以欄名字面決定 Output」，本變更不新增任何欄名推測。

**Frontend Ready Gate 九項紀錄**

1. 通過：013 正典有 `## 功能目標`、FR／AC／SC 與依賴。
2. 通過：013 Prototype Traceability 已連到 `task-new.html`、`task-config.engine.js`、`task-config.data.js` 與對應測試；014 FR-014k（specs/task-management/014-task-detail/spec.md） 連到 `task-detail.*`。
3. `N/A`：本變更不新增 route，沿用 task-new 與 task-detail 既有 route 與角色白名單（Project Leader 可編輯、其他角色依 014 既有唯讀規則）。
4. 通過：預覽於無資料列來源時不渲染；所選欄位失效時回退「自動」並顯示提示（disabled／read-only 沿用 014 唯讀規則，不另增狀態）。
5. 通過：新增 `data-testid` 於 `design.md` D4 列出，Red 與 React 實作共用。
6. 通過：欄位為 `list_title_field`（string 或 `null`）、選項集合與預覽規則見 delta 與 `design.md` D1～D3；錯誤情境為所選欄位失效（D3）。
7. 通過：沿用既有 `TASK_CONFIG_I18N` zh／en 字串機制；下拉為原生 `<select>`，鍵盤可操作；提示以 `role="status"` 呈現。
8. 通過：屬 `task-config.engine.js` 共用引擎（013／014 共用），無新增 shared 元件；Storybook 不適用（prototype 階段）。
9. 通過：Step 1 目標完成後去向仍為 Step 2；`design/system/user-path-map.html` 無 F3／F4 命中新增。

**已知過渡缺口（兩組堆疊 PR）**：本變更拆為兩組堆疊 PR（憲法原則 X，產品檔案上限 5 個）。第一組合併後，task-detail 設定›基本資料編輯模式因共用引擎已顯示下拉，但該值在 task-detail 尚不持久化；第二組補上 task-detail 的讀寫與 task-new → task-detail 往返。兩組之間 014 只算顯示、不算功能完成，change 保持 open，僅第二組執行 archive。

## What Changes

- **新增 FR-002c-9**：Step 1 欄位預覽於資料列來源列下方提供「清單標題」下拉（預設「自動」＝ `null`）、選項只含 Input／Evidence 欄位與 `id`、物件陣列欄位以「取第 1 則的文字」標示，並於表格下方提供隨下拉、角色與資料列來源即時更新的「標記清單預覽」；所選欄位轉為不使用或 Output、或不在新來源時回退「自動」並提示。
- **新增 AC-1.8、AC-1.9、SC-002i**：驗收選項不含 Output、預覽即時更新、失效回退提示，以及建立任務 payload 帶 `list_title_field`。
- **新增任務設定鍵 `list_title_field`**：型別 `string | null`，見 `design.md`。
- **不修訂既有條文**：全部以 `## ADDED Requirements` 承載（理由同 #755：衍生檢視 `openspec/specs/` 不含 FR-002c 其餘條文，MODIFIED 會使 archive 硬中止）。014 FR-014k（specs/task-management/014-task-detail/spec.md） 已規定 task-detail 編輯模式與 013 Step 1 同構，本變更不改 014 條文。
- **不處理**：「自動」摘要規則（#1339）、對話型樣本（#1340、#1341）、T013 seed 的 `text` 角色、`getDatasetPreviewText`、engine 端點 offset 缺陷。

## Capabilities

- 修改：`task-management/013-task-new`（新增 FR-002c-9）。

## Impact

- 產品檔案（第一組，3 個）：`task-config.engine.js`、`task-config.data.js`、`task-new.html`。
- 產品檔案（第二組，3 個）：`task-detail.html`、`task-detail.config.js`、`task-detail.data.js`。
- 正典 013 於第二組 archive 時寫回 v8.3.2 → v8.4.0（MINOR：純新增條文）。

## Constitution Check

- **Generalization-First（NON-NEGOTIABLE）**：選項集合由欄位角色與資料形狀推導，不依任務類型硬編。
- **Data Fairness（NON-NEGOTIABLE）**：Output 永不列入選項與預覽（FR-002c-9、AC-1.8）。
- **Simplicity First / YAGNI**：沿用原生 `<select>` 與既有預覽容器；UI 在引擎內動態建立，不修改兩份重複的 HTML 容器；不做依來源記憶標題欄位（`ponytail`：所選欄位不在新來源即回退，需要記憶時另案）。
- **PR 規模（Principle X）**：兩組堆疊 PR，各組產品檔案 3 個、預估各 ≤ 300 行。
