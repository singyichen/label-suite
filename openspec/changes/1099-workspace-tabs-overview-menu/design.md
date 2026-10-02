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

## G2 — 總覽選單（待主 session 轉達維護者裁定後開始）

- 共用元件命名建議：`renderWorkspaceTabOverviewMenu()`，由 `mountWorkspaceTabBar()` 呼叫，依 `viewport > MOBILE_BP` 決定掛載為桌面頁籤列右端固定項，或行動版取代整條頁籤列（沿用現有 `<= MOBILE_BP` 判斷分支，刪除 `renderWorkspaceTabMobileDropdown()`，改呼叫同一個共用 renderer 並傳入 `variant: 'desktop' | 'mobile'` 決定外層容器／定位 class）。
- 篩選輸入框、清單、底部兩按鈕的「結構」現在即可定案並撰寫 Red（符合 D1／D2 裁定）；篩選**演算法**（比對範圍、大小寫）與選單**鍵盤操作模型**為待確認事項，G2 的 Red/Green 任務需等待裁定後才可鎖定對應斷言，propose 階段僅记录結構性 FR（見 `specs/shared/019-workspace-tabs/spec.md` delta 的 FR-023 群），不預先鎖定演算法細節到 AC 文字。
- 清單列點擊切換頁籤：直接呼叫既有 `activateWorkspaceTab(index)`（`mountWorkspaceTabBar()` 內既有閉包函式），不新增第二套切換路徑。

## G3 — 重開堆疊＋全部關閉（待主 session 轉達維護者裁定後開始）

### 重開堆疊

- 新 `sessionStorage` key：`TAB_REOPEN_STORAGE_KEY = labelsuite.workspaceTabReopenStack`（比照既有 `TAB_STORAGE_KEY` 命名風格），儲存結構為陣列，`push` 到陣列尾端代表「最新關閉」，`TAB_REOPEN_CAP = 10`，超過時 `shift()` 丟棄最舊（索引 0）。
- 三個推入點：`closeWorkspaceTab()`（手動關閉單一頁籤）、新的「全部關閉」批次路徑（G3）、`TAB_CAP` 自動淘汰路徑（既有 `openWorkspaceTab()` 內達到 `TAB_CAP` 時淘汰的分支，`FR-011`）——三處共用一個 `pushWorkspaceTabToReopenStack(tabEntry)` helper，避免三份重複的 push/cap 邏輯（DRY）。
- 重開時：彈出堆疊最後一筆（LIFO），依 `computeWorkspaceDedupeInfo()`／`FR-006` 既有去重鍵判定——命中既有頁籤則僅切換並將該筆從堆疊移除；未命中則視為一般開啟新頁籤（受 `TAB_CAP`／`FR-011` 既有規則約束，包含可能再次觸發淘汰、進而再次推入堆疊）。
- 登出清空（`MODIFIED FR-018`）：既有登出流程清空 `TAB_STORAGE_KEY`／`TAB_SCROLL_STORAGE_KEY` 之同一處，新增清空 `TAB_REOPEN_STORAGE_KEY`。

### 全部關閉

- 遍歷目前 `state.tabs`，依既有未儲存狀態回報（`FR-012` 既有 `captureWorkspaceTabUnsavedState()`／頁面回報機制）分兩組：可關閉／有未儲存變更。
- 可關閉者批次呼叫既有單一頁籤關閉邏輯（不新增第二套確認機制，`FR-012` 既有未儲存確認對話僅在使用者個別點擊頁籤關閉鈕時出現，全部關閉本身直接跳過有未儲存變更者，不彈出確認）；全部推入重開堆疊（複用上述 `pushWorkspaceTabToReopenStack()`）。
- 跳過數量 > 0 時顯示提示（複用既有 `#toast` 機制，比照 `showWorkspaceTabCapNotice()` 前例新增 `showWorkspaceTabCloseAllSkippedNotice(count)`）。
- 作用中頁籤若被關閉，焦點規則比照 `shared-008` `FR-022`（優先右鄰、否則左鄰、全空則空狀態）——全部關閉情境下「右鄰」「左鄰」皆可能同時被關閉，此時最終焦點應落在**僅存的未儲存頁籤**（若有）或空狀態；此邊界規則由 G3 的 Red 測試明確定義一個可觀測斷言，不留给實作臆測。

## 待後續事項

- 選單鍵盤模型、篩選演算法、重開快捷鍵三項，待主 session 轉達維護者裁定後，以 `/opsx:update` 補入本 change 的 `proposal.md`／spec delta，不開新 change。
- 若採納重開快捷鍵，另立 `specs/shared/008-sidebar-navbar-shared/` 的 MODIFIED delta（比照 `FR-016H` 前例）——可在 G3 之內一併處理，或視裁定時機獨立一個小群組。
