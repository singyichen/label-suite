## Context

動機見 `proposal.md` 的 `## Why`；需求契約見本 change 的 `specs/task-management/014-task-detail/spec.md`（FR-019）。本節只記錄影響實作取捨的現況事實。

`task-detail.html` 的三項結構特徵決定了整個實作形狀：

1. **單一 `state` 物件即真相來源**（`design/prototype/pages/task-management/task-detail.html:3680-3727`）。本頁十五項待同步的檢視狀態全部是這個物件的欄位，渲染器一律單向由 `state` 推向 DOM（例：`task-detail.html:9436` `arStageSelect.value = state.arStage;`）。因此網址還原不需要逐一操作控制項——寫入 `state` 後重新渲染即可。
   **實作修正（Source-Verify gate 複驗補記）**：「一律單向」在提案時並不成立。`renderArReviewerSelect()`／`renderArReviewStatusSelect()`／`renderArAnnotatorSelect()` 三處原本寫 `var current = sel.value || state.X;`（DOM 與 `state` 雙真相來源，且 `sel.value` 首次渲染即為 `all` 這個真值，使 `|| state.X` 成為死碼），`#memberProgressSort` 則從未由 `state` 推回控制項。本變更的 Green 把這四處改為單向，前提才真正成立——見 `task-detail.html:8713`／`:8731`／`:8760`／`:7670`。
2. **網址讀取已有既成入口**。`parseRole()`（`task-detail.html:4836-4880`）已讀取 `task_id`、`task_role`／`role`、`status` 與 `tab` 四個參數，並以 `setTabByRole(resolvedTab, true)` 套用頁籤。缺的只有寫回，以及讀取範圍的擴充。
3. **分頁器已自帶上界收斂**。三個清單的分頁渲染都已有 `if (state.XPage > totalPages) state.XPage = totalPages;`（`task-detail.html:6999`／`:8436`／`:9372`）。FR-019 第 (4) 點要求的「頁碼超出總頁數回退」因此不需新寫邏輯，只需在解析端補上下界與型別守衛。

一項時序限制：頁籤面板是非同步載入的（`loadAllTabPanels()`，`task-detail.html:4544`），四個渲染器皆在面板落地後才首次執行（`init()`，`task-detail.html:10317`）。任何在 `parseRole()` 階段寫入 `state` 的值，都會在首次渲染時自然生效。

## Goals / Non-Goals

**Goals:**

- 網址寫回與還原各只有一個進入點，新增一個篩選器時只需在參數對照表加一列。
- 還原路徑不新增任何依賴資料就緒的時序耦合——不引入「等資料載入完再套網址」的第二段流程。
- 不改動任何既有渲染器的輸出行為；本變更對畫面的唯一可見影響是網址列本身。

**Non-Goals:**

- 不做瀏覽器上一頁／下一頁的篩選回溯（`pushState`），見 D3。
- 不建立通用的 URL-state 抽象層供其他頁面複用。本頁是 `UXC-11` 的第五個落地點，前四頁各自實作且形狀不同；在沒有第二個消費端的情況下抽共用層屬於過早抽象（憲法 Simplicity First）。若日後要收斂，那是另一張獨立的重構單。
- 不調整 `state` 物件的欄位結構或既有預設值。

## Decisions

### D1 — 一組 `applyViewStateFromUrl()` / `syncUrlToViewState()` 函式，由一份參數對照表驅動

**決定**：新增兩個函式與一份 `URL_VIEW_STATE` 對照表；表的每一列描述一個參數：查詢參數名、對應的 `state` 欄位、型別（列舉／日期字串／正整數）、合法值取得方式、預設值。兩個函式都只走訪這張表。

**理由**：FR-019 的同步範圍有 15 個參數。若逐一硬寫讀寫，會是 30 段幾乎相同的程式碼，且新增篩選器時必然漏改其中一半——這正是「單向可讀、不可產生」這個既有缺陷的成因。對照表讓讀與寫共用同一份定義，結構上不可能只改一半。

**替代方案**：(a) 逐參數手寫 —— 被上述漏改風險否決。(b) 由 DOM 反向掃描所有 `<select>` 自動產生參數 —— 看似更少維護，但參數名會被 DOM id 綁架、無法表達「頁碼」這種非控制項狀態，且違反 `state` 是 SSoT 的既有設計。

### D2 — 還原掛在 `parseRole()` 內；寫回掛在四個渲染器與 `setTabByRole()` 之後

**決定**：`applyViewStateFromUrl()` 於 `parseRole()` 末尾呼叫（在 `setTabByRole()` 之後，使頁籤守門結果先確立）。`syncUrlToViewState()` 掛在四個清單渲染器 `renderMemberManagement()`（`task-detail.html:7414`）、`renderAnnotationProgress()`（`:8207`）、`renderWorkLog()`（`:8497`）、`renderAnnotationResults()`（`:9433`）與 `setTabByRole()`（`:6928-6948`）的末尾，而非掛在約二十個個別的篩選／排序／翻頁事件處理器上。

**理由**：本頁所有篩選處理器的既有寫法一律是「寫 `state` → 呼叫渲染器」（例：`task-detail.html:10077` `state.arStage = e.target.value || 'all';`）。掛在渲染器出口，等於掛在所有這些路徑的共同下游——新增一個篩選器時不需要記得補寫回。掛在事件處理器上則會重蹈 D1 想避免的漏改。

`setTabByRole()` 是 `state.activeTab` 的唯一變更點，也是 `reviewer` 被擋下時回傳 `false` 的判定處；寫回掛在其**之後**，被拒絕的頁籤就不會進入網址，FR-019 第 (5) 點因此是結構上成立而非靠額外檢查。

**代價**：渲染器在初始載入時各執行一次，會觸發四次 `replaceState`。四次寫入同一份結果，對使用者不可見，也不產生歷史紀錄。相較「漏掛一個處理器就靜默失效」，這個代價可接受。

**替代方案**：掛在事件處理器 —— 見上。掛在 `state` 的 setter proxy —— 本頁是 ES5 風格的 `var state = {}` 直接賦值，導入 Proxy 會改寫全檔賦值習慣，違反 Surgical Changes。

### D3 — `replaceState()`，不用 `pushState()`

**決定**：一律 `history.replaceState()`。

**理由**：篩選點擊是同一畫面的調整，不是導頁。`pushState` 會讓「上一頁」變成逐格回退篩選歷史——使用者篩了五次後要按五次才能離開本頁。正典既有條款亦載明「tab 切換為頁內行為，不觸發路由跳轉」（`specs/task-management/014-task-detail/spec.md:338`），`replaceState` 與之相容。`UXC-11` 既有落地頁 `dataset-analysis-detail.html:1897-1904` 同樣採 `replaceState`。

**替代方案**：`pushState` —— 可讓上一頁回到前一個篩選狀態，但與既有四頁的行為不一致，且未被 issue #726 要求（YAGNI）。

### D4 — 參數名帶頁籤前綴；預設值不寫入網址

**決定**：參數名為 `ap_` / `ar_` / `mm_` / `wl_` 前綴加狀態名（完整對照表見 FR-019 第 (1) 點）。處於預設值的狀態自網址移除。

**理由**：本頁已佔用 `task_id`、`task_role`、`role`、`tab`、`status` 五個參數名，其中 `status` 是任務狀態覆寫、與 `annotation-results` 的狀態篩選同名不同義——不加前綴必然撞名。前綴同時讓網址自我說明：讀者一眼看得出 `wl_page=2` 屬於哪個頁籤。

預設值省略是為了讓未經操作的頁面維持 `?task_id=T-001` 這種簡短網址；否則每次載入都會把十五個參數全寫進網址列，可分享性反而下降。

**替代方案**：扁平命名（`stage` / `sort` / `page`）—— 四個頁籤各有頁碼，扁平命名無法區分，且與 `status` 直接衝突。單一序列化參數（如 `view=<base64>`）—— 網址不可讀、不可手改，違背 `UXC-11` 的分享目的。

### D5 — 無效值的驗證分兩層：解析端守型別與列舉，渲染端守上界

**決定**：`applyViewStateFromUrl()` 只負責型別與列舉驗證（非正整數的頁碼、不在選項集合內的篩選值 → 回退預設值）；「頁碼超出總頁數」交給三個分頁渲染器既有的收斂邏輯（`task-detail.html:6999`／`:8436`／`:9372`）。

**理由**：總頁數取決於篩選後的資料筆數，在 `parseRole()` 執行時尚未可知（面板與資料都還沒載入）。若要在解析端驗證上界，就得引入「等資料就緒再套網址」的第二段流程——正是 Goals 明定要避免的時序耦合。而渲染器早已做這件事，重複實作反而是 DRY 違規。

合法值集合 MUST 由既有選項來源推導（篩選器目前的 `<option>` 值、`ANNOTATION_PROGRESS.rounds` 的回合 id、成員名冊），不得在解析端硬編第二份清單——否則新增一個試標回合就會讓 `ap_stage=r3` 靜默失效（憲法 Generalization-First）。

**替代方案**：解析端一次驗證到底 —— 被上述時序問題否決。完全不驗證 —— 一個手改過的網址就能讓清單呈現空白，違反 FR-019 第 (4) 點。

## Risks / Trade-offs

- **[渲染器出口寫回造成初始載入多次 `replaceState`]** → 四次寫入結果相同且不產生歷史紀錄，對使用者不可見。若日後量測到效能疑慮，可在 `syncUrlToViewState()` 內比對目前 `location.search` 相同則跳過；本次不預先優化（YAGNI）。
- **[`reviewer` 導回後殘留他頁籤的參數]** → FR-019 第 (5) 點要求導回後移除不適用的頁籤參數。實作上由 `syncUrlToViewState()` 統一重建參數集時自然達成：它只寫入目前 `state` 所反映的狀態，被拒絕的頁籤本就不在 `state.activeTab` 內。此點 MUST 有對應的 Red 測試（AC-2.5），不得只靠推論。
- **[既有路由參數被覆寫或遺失]** → `admin/user-management.html:1132-1166` 的同型實作以全新 `URLSearchParams()` 重建參數集；在本頁照抄會抹掉 `task_id`，使頁面退回未知任務。實作 MUST 以 `new URLSearchParams(window.location.search)` 為基底增刪（作法見 `dataset-analysis-detail.html:1897-1904`），且 MUST 有涵蓋「翻頁後 `task_id` 仍在」的測試。
- **[篩選值語彙日後改版導致舊網址失效]** → 舊網址的失效項會依 FR-019 第 (4) 點靜默回退為預設值，不會壞頁；這是可接受的降級，網址不是持久化契約。
- **[與 issue #742 的 companion change 對同一正典的競用]** → `specs/task-management/014-task-detail` 受「一 change 一正典」規則約束，同一時間只能有一個開啟中的 change 指向它。本 change MUST 在 #742 的 companion change 開立前完成 archive；若 #742 先行，本 change 須等待。此為排程約束，非技術風險。

## Migration Plan

無資料遷移。本變更只新增行為：既有網址（僅帶 `task_id`、或另帶 `?tab=`）的解讀結果完全不變，未帶新參數的網址一律落在各狀態的預設值，與變更前的畫面一致。

回退方式為單純還原 `task-detail.html` 的該次提交——不存在需要反向遷移的持久化資料。

## Constitution Check

- **Generalization-First（NON-NEGOTIABLE）**：合法值集合由既有選項來源推導（D5），MUST NOT 硬編第二份清單；參數對照表為單一定義、讀寫共用（D1）。本變更不依 task type 或 task id 分流。
- **Data Fairness（NON-NEGOTIABLE）**：網址僅承載檢視狀態，不承載答案內容或跨角色資料；角色守門仍由 `setTabByRole()` 與 FR-006 決定，寫回掛在守門之後（D2），網址不構成旁路。
- **Simplicity First / YAGNI**：新增兩個函式與一份對照表，不引入路由函式庫、不建通用抽象層、不實作未被要求的 `pushState` 回溯。
- **DRY**：頁碼上界收斂沿用渲染器既有邏輯，不重寫（D5）；讀與寫共用同一份參數定義（D1）。
- **Surgical Changes**：不改寫既有渲染器輸出、不改 `state` 結構、不導入 Proxy 改變全檔賦值習慣（D2 替代方案）。
- **PR 規模（Principle X）**：1 個產品檔案 `task-detail.html`，單一目的，一個 PR 完成 propose／apply／archive 回寫（ADR-033 Rule 1）。
