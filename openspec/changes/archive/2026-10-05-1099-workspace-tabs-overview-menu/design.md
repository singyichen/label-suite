# Design — issue #1099 工作頁籤總覽選單／重開堆疊／全部關閉／視覺對齊

本文件僅記錄跨 G1–G3 共用的架構決策；各群組各自的測試與實作細節見 `tasks.md`。非 API／DB 契約變更，附於此處純供後續群組與審查參照。

## G1 — 視覺對齊（本次 propose 立即可做，無待確認依賴）

### 頁籤固定寬度與截斷

- 新增規格常數等級 token（寫入 `design/system/MASTER.md` 頁籤小節＋ `design/prototype/assets/tokens.css`）：`--workspace-tab-width: 180px`（light/dark 共用，非色彩 token 不需分主題）。
- `.workspace-tab` 新增 `width: var(--workspace-tab-width); flex: 0 0 var(--workspace-tab-width);`（取代目前 `flex-shrink: 0` 無寬度限制的寫法）。
- `.workspace-tab-label` 新增 `overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0;`（搭配父層 `flex` 需要 `min-width:0` 才能正確截斷）。
- `renderWorkspaceTabBar()`（`sidebar.js`）於建立 `tabEl` 時加一行 `tabEl.title = label;`（完整標題供 tooltip／可存取名稱，瀏覽器原生行為）。
- 此寬度修正同時解除既有 ponytail 註記（`sidebar.js` `renderWorkspaceTabBar()` 註解：「a tab wider than the bar itself... no max-width on `.workspace-tab`/`.workspace-tab-label`」）——固定寬度後該邊界案例不復存在，Green 任務需同一 commit 移除該註解。

### 頁面種類圖示

沿用側欄 L0 導覽既有圖示對照（`sidebar.js` `renderSidebar()` 內 `navItems` 之 `icon` 欄位，Lucide、24×24、2px stroke、`currentColor`，ADR-030），不新畫圖示、不新增圖示庫依賴。工作頁籤之「頁面種類」比 L0 類別更細，對照如下（新函式 `workspaceTabIconFor(pageKind)`，置於 `sidebar.js` 既有 `workspacePageKindI18n` 定義附近）：

| 頁籤 `pageKind`（去重鍵對照表） | 對應 L0 圖示 | Lucide 名稱（供註解） |
|---|---|---|
| `dashboard` | `navItems` 之 `dashboard` icon | layout-dashboard |
| `task-list`、`task-new`、`task-detail` | `navItems` 之 `task-management` icon | circle-plus |
| `annotation-workspace`、`annotation-list` | `navItems` 之 `annotation` icon | pen-line |
| `dataset-analysis-list`、`dataset-analysis-detail` | `navItems` 之 `dataset` icon | layout-grid |
| `user-management`、`role-settings` | `navItems` 之 `admin` icon | settings |
| `profile` | `navItems` 之 `profile` icon | user |

實作方式：將上述六組 SVG 字串字面量提取為一個共用常數物件（例如 `WORKSPACE_PAGE_KIND_ICON_SVG`），`navItems` 建構與 `workspaceTabIconFor()` 共同讀取，避免兩處各自維護一份重複的 SVG 字串（DRY；目前 `navItems` 內已是行內字串常數，Green 任務需做最小幅度的抽取，不得連帶重寫 `navItems` 其餘欄位或格式）。

**選擇器契約（Red 已鎖定）**：`workspaceTabIconFor()` 插入之 `<svg>` MUST 帶 `class="workspace-tab-icon"`，與頁籤關閉按鈕自身未加 class 的 `<svg>` 區隔（見 `workspace-tabs-visual.spec.ts` 檔頭註解）。

### 作用中頁籤視覺（低彩度中性色）

- 問題：現行 `.workspace-tab.active` 使用 `background: var(--color-surface)`（Violet 50，頁面背景色，非中性色）＋整圈 `border: 1px solid var(--color-border)`，被維護者實測認定過於突兀。
- 規則：移除整圈外框（`border` 改回 `transparent`，與 inactive 一致，不再對 `.active` 覆寫 `border-color`），僅以背景色區分 active／inactive／hover／focus。
- Token 決策（KISS：優先重用既有中性色 token，不無謂新增）：
  - `--color-slate-50`（light `#F8FAFC`／dark `#1F1F28`）已存在且為中性色，值本身適合當作「active 底色」；但其命名是色票名稱非語意名稱，直接在 `.workspace-tab.active` 寫 `background: var(--color-slate-50)` 會讓语意不明確且未來若要單獨調整 active 底色需改到一個「色票」token 而非「用途」token。依本專案既有慣例（如 `--color-ink-muted` 之類語意別名），新增一個語意別名 token `--color-tab-active-bg: var(--color-slate-50);`（light／dark 兩個 `:root` 區塊都要補），`.workspace-tab.active` 改用 `background: var(--color-tab-active-bg);`。
  - Hover（inactive 頁籤 `:hover`，新規則，目前不存在）與 focus-visible（鍵盤移動焦點，`FR-020`／`AC-8.2` 既有方向鍵移焦但未定義視覺樣式）需要與 active 可區分的中性色：新增 `--color-tab-hover-bg`（light 建議 `--color-border-muted` #F1F5F9；dark 需選一個與 `--color-tab-active-bg` dark 值 `#1F1F28` 可區分的中性色——dark 下 `--color-border-muted` 與 `--color-slate-50` 目前為同一色號，Green 任務須從既有 dark 色票挑一个可區分且達 WCAG AA 的鄰近值，或在 `tokens.css` dark 區塊新增專屬 `--color-tab-hover-bg` dark 值；精確色號由 `senior-frontend`／可徵詢 `senior-visual-designer` 定案，並在 PR body 記錄對比度數據）。
  - Focus-visible：複用瀏覽器原生 focus ring（`outline`），不新增 token；僅需確保 `.workspace-tab.active` 移除 `border` 後不會讓 `:focus-visible` 的 outline 被其他樣式蓋掉。
  - `FR-010` 階段徽章（`data-stage-badge`）顏色（`--color-warning` / `--color-primary`）不受本次調整影響，截斷後徽章色彩與文字需同時可辨識——徽章目前是 `.workspace-tab` 本身的文字色而非獨立 DOM 節點，Green 任務若發現截斷後徽色與中性底色對比不足，需個別調整，不在本設計文件預先定值。
- 頁籤列整體：`padding` 現有 `var(--space-sm) var(--space-md) 0` 已經偏薄；「變薄、貼齊頂端」主要由移除 active 整圈外框與固定寬度達成，不預期需要改動 `.workspace-tab-bar` 自身 padding／height，除非 Green 任務發現視覺仍不符合，需在 PR body 說明具體改動與理由。
- Light／dark、zh-TW／en、窄螢幕、鍵盤 focus、長標題溢出、關閉入口、階段 badge 複驗為 issue 新增視覺驗收項目，對應 Red 測試需逐項覆蓋（見 `tasks.md`）。

### 範圍邊界（G1 明確不做）

- 不改動 `#1098` 負責的頁籤列掛載位置／寬度計算（`sidebar.css:958-993`、`sidebar.js:1921-1928` 的側欄收合連動邏輯本身不動，只動 `.workspace-tab`／`.workspace-tab.active`／`.workspace-tab-label` 規則與一個新增 icon 函式）。
- 不改動 `renderWorkspaceTabBar()` 的 DOM 結構契約（`role="tab"`、`aria-selected`、`data-testid="workspace-tab"`、方向鍵焦點移動邏輯）——僅新增 icon 子元素與 `title` 屬性、调整既有 class 的 CSS 規則。
- 不改動行動版下拉選單（`.workspace-tab-mobile-*`）；D2 總覽選單取代行動版下拉是 G2 範圍。

## G2 — 總覽選單（維護者裁定已採納，G1 PR 合併後開始）

- 共用元件命名建議：`renderWorkspaceTabOverviewMenu()`，由 `mountWorkspaceTabBar()` 呼叫，依 `viewport > MOBILE_BP` 決定掛載為桌面頁籤列右端固定項，或行動版取代整條頁籤列（沿用現有 `<= MOBILE_BP` 判斷分支，刪除 `renderWorkspaceTabMobileDropdown()`，改呼叫同一個共用 renderer 並傳入 `variant: 'desktop' | 'mobile'` 決定外層容器／定位 class）。
- 篩選演算法（2026-10-02 已採納裁定）：比對頁籤標題與頁面種類名稱（`workspacePageKindI18n` 目前語系之字串），不比對網址參數，`toLowerCase()` 後比對、不分大小寫；命中則保留該清單項目，不命中則隱藏（不移除 DOM，避免重建清單造成焦點流失）。
- 選單鍵盤操作模型（2026-10-02 已採納裁定）：開啟時 `filterInput.focus()`；`ArrowDown`／`ArrowUp` 在可見清單項目間移動反白（循環，比照既有 `renderWorkspaceTabBar()` 方向鍵 wrap-around 寫法），不觸發切換；`Enter` 切換至目前反白項目並關閉選單；`Esc` 關閉選單並 `triggerBtn.focus()`。對應 `FR-023` 第 3／4 點、`AC-023.3`～`AC-023.7`。
- 清單列點擊切換頁籤：直接呼叫既有 `activateWorkspaceTab(index)`（`mountWorkspaceTabBar()` 內既有閉包函式），不新增第二套切換路徑。

## G3 — 重開堆疊＋全部關閉（維護者裁定已採納，G2 PR 合併後開始）

### 重開堆疊

- 新 `sessionStorage` key：`TAB_REOPEN_STORAGE_KEY = labelsuite.workspaceTabReopenStack`（比照既有 `TAB_STORAGE_KEY` 命名風格），儲存結構為陣列，`push` 到陣列尾端代表「最新關閉」，`TAB_REOPEN_CAP = 10`，超過時 `shift()` 丟棄最舊（索引 0）。
- 三個推入點：`closeWorkspaceTab()`（手動關閉單一頁籤）、新的「全部關閉」批次路徑（G3）、`TAB_CAP` 自動淘汰路徑（既有 `openWorkspaceTab()` 內達到 `TAB_CAP` 時淘汰的分支，`FR-011`）——三處共用一個 `pushWorkspaceTabToReopenStack(tabEntry)` helper，避免三份重複的 push/cap 邏輯（DRY）。
- 重開時：彈出堆疊最後一筆（LIFO），依 `computeWorkspaceDedupeInfo()`／`FR-006` 既有去重鍵判定——命中既有頁籤則僅切換並將該筆從堆疊移除；未命中則視為一般開啟新頁籤（受 `TAB_CAP`／`FR-011` 既有規則約束，包含可能再次觸發淘汰、進而再次推入堆疊）。
- 登出清空（`MODIFIED FR-018`）：既有登出流程清空 `TAB_STORAGE_KEY`／`TAB_SCROLL_STORAGE_KEY` 之同一處，新增清空 `TAB_REOPEN_STORAGE_KEY`。
- 重開快捷鍵（`FR-024A`／`FR-024B`，2026-10-02 已採納裁定）：`Alt+Shift+T`，判斷用 `event.code === 'KeyT'` 搭配 `event.altKey && event.shiftKey`，焦點在可輸入元素時不攔截（比照既有 `FR-013` 守門寫法）；呼叫與「重開剛關閉的」按鈕相同的處理函式，不建立第二套重開邏輯。`shared-008` 之 `FR-016H` MODIFIED delta（已於本 change 之 `specs/shared/008-sidebar-navbar-shared/spec.md` 隨附）新增第三列顯示；Green 任務需同時修改 `sidebar.js` 之快捷鍵總覽 markup 新增該列與 zh/en 字串，不得只修行為不修顯示（或反之）。

### 全部關閉

- 遍歷目前 `state.tabs`，依既有未儲存狀態回報（`FR-012` 既有 `captureWorkspaceTabUnsavedState()`／頁面回報機制）分兩組：可關閉／有未儲存變更。
- 可關閉者批次呼叫既有單一頁籤關閉邏輯（不新增第二套確認機制，`FR-012` 既有未儲存確認對話僅在使用者個別點擊頁籤關閉鈕時出現，全部關閉本身直接跳過有未儲存變更者，不彈出確認）；全部推入重開堆疊（複用上述 `pushWorkspaceTabToReopenStack()`）。
- 跳過數量 > 0 時顯示提示（複用既有 `#toast` 機制，比照 `showWorkspaceTabCapNotice()` 前例新增 `showWorkspaceTabCloseAllSkippedNotice(count)`）。
- 作用中頁籤若被關閉，焦點規則比照 `shared-008` `FR-022`（優先右鄰、否則左鄰、全空則空狀態）——全部關閉情境下「右鄰」「左鄰」皆可能同時被關閉，此時最終焦點應落在**僅存的未儲存頁籤**（若有）或空狀態；此邊界規則由 G3 的 Red 測試明確定義一個可觀測斷言，不留给實作臆測。

## G4 — 頁籤貼齊頂端／直角＋總覽選單單行（維護者 2026-10-05 補充，G3 合併後實際查看所得）

### G4a 頁籤貼齊頂端、直角（PR-A，僅 CSS，無 spec delta）

- 動機：NoteCraft 的頁籤上緣貼齊視窗頂端、為與頁籤列同高的直角矩形；目前 `.workspace-tab-bar` 以 `padding-top: var(--space-sm)` 讓頁籤浮在頁籤列上，且 `.workspace-tab` 上方兩角帶 `--radius-md` 圓角，呈現卡片感。屬 G1「視覺對齊 NoteCraft」同一驗收主題之延伸，未新增也未推翻任何 FR／AC（`FR-010`／`FR-001` 文字不變），故不寫 spec delta，僅更新本 design 與 `tasks.md`。
- 規則：`.workspace-tab-bar` 頂部 padding 改為 0（左右 padding 與下緣 `border-bottom` 不動）；`.workspace-tab` `border-radius: 0`，高度填滿頁籤列（`align-self: stretch`，頁籤列 `align-items` 由 `center` 改為 `stretch` 或讓頁籤自行 stretch，以 computed style 複驗後擇一最小改動）。總覽選單觸發鈕維持原本相對位置（不得因 stretch 被拉高，需自行 `align-self: center`）。
- 不動 `#1098` 的掛載位置／寬度邏輯；側欄展開／收合兩種狀態下頁籤列 top 皆為 0、頁籤上緣等於頁籤列 top。

### G4b 總覽選單每列單行（PR-B，delta `FR-023`(2) 修訂）

- 移除 `.workspace-tab-overview-item-secondary` 的 DOM 產生與 CSS 規則；每列＝圖示＋標題＋關閉鈕。`FR-023`(3)／`AC-023.3` 篩選比對範圍（標題＋頁面種類名稱）不變——種類名稱仍用於比對，只是不再顯示。
- `FR-023` 目前僅存在於本 change delta（正典 019 v1.1.0 僅收 FR-001～022），故為 archive 前修改 delta，不推翻任何正典條文，非 MAJOR；最終回寫的 Changelog 一併載明。

## 待後續事項

無——選單鍵盤模型、篩選演算法、重開快捷鍵三項已於 2026-10-02 由主 session 轉達維護者裁定全數採納，並已直接併入本文件與 `proposal.md`／spec delta（含 `specs/shared/008-sidebar-navbar-shared/` 的 MODIFIED delta）。G2／G3 現僅待各自前一群組 PR 合併後依序開始（嚴格序列，不可並行）。
