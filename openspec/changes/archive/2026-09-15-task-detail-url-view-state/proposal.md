---
對應 Spec: specs/task-management/014-task-detail/spec.md
對應 Issue: #726
基準版本: 014 v3.0.1
目標版本: 014 v3.1.0
---

## Why

`task-detail` 是全站唯一一個「有五個頁籤、四張清單、十餘個篩選器」卻完全不把畫面狀態寫進網址的頁面。使用者在 `annotation-results` 篩到第 3 頁、挑出某位標記員的爭議項後，只要按下重新整理、分享連結給同事、或從 `annotation-workspace` 返回，整個篩選與頁碼一律歸零回 `overview` 第 1 頁——同一份爭議項要靠口頭描述「你先點第四個頁籤，階段選 R2，狀態選爭議中，再翻到第三頁」才能交接。

這與專案既有的 UX 慣例 `UXC-11`（可分享的畫面狀態）直接抵觸，而同慣例已在 `admin/user-management.html`、`annotation-list.html`、`dashboard`、`dataset/dataset-analysis-detail.html` 四頁落地。`task-detail` 是這四頁之外清單密度最高的一頁，卻是唯一的漏網之魚。

現況並非完全沒有讀取：`parseRole()` 已經會讀 `?tab=` 並套用（`design/prototype/pages/task-management/task-detail.html:4836-4880`），但只有讀、沒有寫——使用者手動打的 `?tab=work-log` 會生效，而使用者在畫面上點的 `work-log` 卻不會反映到網址，形成「單向可讀、不可產生」的半套狀態。本變更補上缺的另一半，並把讀取範圍從 `tab` 一項擴充到四個頁籤的篩選、排序與頁碼。

## What Changes

- **新增 FR-019：`task-detail` 的頁籤與清單檢視狀態必須與網址雙向同步**。涵蓋範圍為 issue #726 字面所列的四項——`tab`、四個頁籤的篩選、排序、頁碼：
  - `annotation-progress`：階段（`progressStage`）、排序（`progressSort`）
  - `annotation-results`：階段、任務狀態、標記員、審核員、審核狀態五個篩選與頁碼
  - `member-management`：頁碼
  - `work-log`：日期起訖、階段、成員四個篩選與頁碼
- **寫回一律使用 `history.replaceState()`，不得使用 `pushState()`**：篩選點擊屬於同一畫面的調整而非導頁，用 `pushState` 會讓上一頁鍵變成「逐格回退篩選歷史」。此選擇與 `dataset-analysis-detail.html:1897-1904` 的既有作法一致，也與正典既有條款「tab 切換為頁內行為，不觸發路由跳轉」（`specs/task-management/014-task-detail/spec.md:338`）相容——`replaceState` 不產生導頁。
- **網址參數採用頁籤前綴命名空間**（`ap_` / `ar_` / `mm_` / `wl_`）。`task-detail` 已佔用 `task_id`、`task_role`／`role`、`tab`、`status` 四個參數名，其中 `status` 已被既有的任務狀態覆寫語意佔用，篩選器不得再爭用同名參數。
- **既有路由參數必須被保留**：寫回時必須以現有 `URLSearchParams` 為基底增刪，不得重建空白參數集——`task_id` 遺失會使頁面退回未知任務。
- **無效參數必須靜默回退為預設值**，不得讓清單呈現空白或拋錯：每個參數在套用前必須對照其合法值集合（篩選器選項、頁碼為正整數且不超出總頁數）驗證。
- **`reviewer` 直連 `member-management` 的既有導回行為必須延伸至網址**：依 FR-006 導回 `overview` 後，網址必須一併改寫為 `overview` 與其參數，不得留下與畫面不符的 `?tab=member-management`。

無 **BREAKING**：本變更只新增行為，既有網址（含只帶 `task_id` 或帶 `?tab=`）的解讀結果不變。

## Capabilities

### New Capabilities

（無——本變更不引入新的 capability 路徑。）

### Modified Capabilities

- `task-management/014-task-detail`：新增 FR-019（頁籤與清單檢視狀態的網址雙向同步）、AC-1.8、AC-1.9、AC-2.5 與 SC-044。既有需求全部維持原文，僅 FR-006 的導回行為由 FR-019 補上「網址一併改寫」的延伸條款，不修改 FR-006 本文。

## Impact

**規格**

- 正典：`specs/task-management/014-task-detail/spec.md`（v3.0.1 → v3.1.0，**MINOR**：只新增 FR-019／AC-1.8／AC-1.9／AC-2.5／SC-044，無移除、無語意反轉）。該正典已封存，apply 期間須自 `specs/_archive/` 取回編輯，合併後再歸位（CLAUDE.md「Modify Existing Feature」第 1／5 步）。
- 衍生檢視：`openspec/specs/task-management/014-task-detail/spec.md`（archive 時自動合併）。
- 上游／下游：皆不修改。本變更純屬單頁的網址檢視狀態，不改變任何跨規格契約；`015` 的審核單位身分參數（FR-018 第 (3) 點所述的 `task_id × run_type × annotator_id × sample_id`）屬於導向 `annotation-workspace` 的導頁參數，與本變更的頁內檢視狀態互不重疊。

**原型程式（Principle X 之產品檔案盤點）**

- `design/prototype/pages/task-management/task-detail.html`（唯一產品檔案：新增 `applyViewStateFromUrl()` 與 `syncUrlToViewState()` 一組函式，並在既有篩選／排序／頁碼事件處理與 `parseRole()` 接線）

合計 1 個產品檔案，遠低於 Principle X 之 5 檔上限；行數預估以 `admin/user-management.html:1132-1166` 的同型實作（35 行）為基準，因參數數量約為其四倍而估於 120–150 行區間，仍在 300 行門檻內。單一目的（「讓 task-detail 的檢視狀態可分享」），不拆 PR。

**既有機制交互**

- **`parseRole()`（`task-detail.html:4836-4880`）**：已讀 `?tab=` 並經 `setTabByRole(resolvedTab, true)` 套用。本變更 MUST 沿用此入口擴充，MUST NOT 另建第二處網址解析——否則 `tab` 會有兩套互相覆寫的讀取路徑。
- **`state` 物件（`task-detail.html:3680-3727`）**：本頁所有篩選與頁碼值皆存於此單一物件，渲染器一律單向由 `state` 推向 DOM（例：`task-detail.html:9436` `arStageSelect.value = state.arStage;`）。因此網址還原只需在渲染前寫入 `state`，所有控制項自然跟隨，不需逐一操作 DOM。
- **`setTabByRole()`（`task-detail.html:6928-6948`）**：`state.activeTab` 的唯一變更點，且是 `reviewer` 被擋在 `member-management` 之外時回傳 `false` 的判定處。網址寫回 MUST 掛在此函式之後而非之前，否則會把被拒絕的頁籤寫進網址。
- **`getTrackingContext()`（`task-detail.html:10308`）**：回傳的 `tab` 欄位取自 `state.activeTab`，與網址同源，本變更不需另行調整埋點。
- **`UXC-11` 既有落地頁**：`admin/user-management.html:1132-1166` 是最完整的參照實作，但它以全新的 `URLSearchParams()` 重建參數集——該作法在 `task-detail` 會抹掉 `task_id`，MUST NOT 照抄，須改為在既有參數上增刪（作法見 `dataset-analysis-detail.html:1897-1904`）。

**範圍界線（明示排除，供審閱者確認）**

以下三項不屬 issue #726 所稱「四個 tab 的篩選、排序、頁碼」，本變更不納入：

- `state.activeRunControlTab`（`task-detail.html:3684`）：`overview` 內「執行控制」區塊的次級頁籤，非四個主頁籤的清單控制項。
- `state.arExportPage`（`task-detail.html:3721`）：匯出記錄「對話框」內的分頁，屬對話框開啟期間的暫態，對話框關閉即失去意義。
- `state.mdPage`（`task-detail.html:3723`）：成員標記細項的「下鑽」區塊分頁，其資料列 `state.mdRows` 由點選特定成員後即時建構（`task-detail.html:7873-7885`），不是頁籤層級的清單。

若審閱者認為上述任一項應納入，於 apply 前提出即可併入 FR-019，不需另開 change。

## Constitution Check

- **Generalization-First（NON-NEGOTIABLE）**：每個網址參數的合法值集合 MUST 由既有的選項來源推導（篩選器 `<option>` 值、`ANNOTATION_PROGRESS.rounds` 的回合 id、成員名冊），MUST NOT 在網址解析處硬編第二份選項清單——否則新增一個試標回合或一種審核狀態就會讓網址還原靜默失效。本變更亦 MUST NOT 依 task type 或 task id 分流參數集合。
- **Data Fairness（NON-NEGOTIABLE）**：網址只承載「檢視狀態」（哪個頁籤、哪個篩選值、第幾頁），MUST NOT 承載任何答案內容或跨角色資料。角色仍由 `task_role` 與既有守門決定：`reviewer` 以任何參數組合直連 `member-management` 皆須依 FR-006 導回，本變更不得成為繞過角色邊界的旁路——這是 AC-2.5 的存在理由。
- **Simplicity First / YAGNI**：實作僅新增一組 `apply` / `sync` 函式與一份參數對照表，MUST NOT 引入路由函式庫、狀態管理層或通用的「URL state」抽象；`state` 物件已是單一真相來源，不需再包一層。不實作瀏覽器上一頁／下一頁的篩選回溯（`pushState`），該行為未被要求且與 `UXC-11` 既有落地頁不一致。
- **可追溯性**：寫回後的網址即為可貼上的畫面座標，使爭議項與篩選結果可在 issue、審核討論與交接紀錄中被精確指認——這正是本變更的產品價值。
- **PR 規模（Principle X）**：1 個產品檔案、單一目的，一個 PR 完成 propose／apply／archive 回寫（ADR-033 Rule 1）。
