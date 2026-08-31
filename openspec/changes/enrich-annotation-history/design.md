## Context

動機見 `proposal.md` — Why；需求契約見 `specs/annotation/015-annotation-workspace/spec.md`（本變更之 delta）。此處僅記錄形成實作方式所需的現況與限制。

現況：

- 歷程事件目前由 `annotation-workspace.data.js` 的 `getSampleHistory()` 合併各 bucket 後回傳，渲染於 `annotation-workspace.config.js` 的 `renderHistoryPanel()`（約 1710–1762 行），僅消費 `role` / `actor_id` / `at` / `action` / `summary` 五個欄位。
- 提交紀錄以 `SUBMISSION_BUCKET_DIMENSIONS = task_id × role × run_type × annotator_id × reviewer_id` 定址（FR-049），實際載體為 `localStorage` 的 `wsSubmissions` 單一鍵，讀寫為整包 read-modify-write。
- 原型階段身分來自路由參數，不構成權限判斷（FR-049 已知落差）；後端接上後改由登入 session 提供。
- 既有的 `saved` 事件跨審核員可見性由 FR-062 盲審隔離規範，目前 `getSampleHistory()` 未依 `entryStatus` 過濾，屬已定案的 Implementation mismatch，其修正在本變更的遮蔽工作中一併完成。

限制：

- 本變更全部落在 prototype 層（靜態 HTML + Playwright），無後端、無 DB schema、無 API 契約異動。
- 快照會顯著放大 `localStorage` 體積，且瀏覽器配額有限，須有明確的體積策略。

## Goals / Non-Goals

**Goals:**

- 為三處既有歷程（015 歷程面板、014 審核歷程時間軸、014 試標回合歷程）建立單一事件模型，使後續不再各自擴充。
- 讓遮蔽成為資料供給層的性質，而非呈現層的補救。
- 讓差異呈現由輸出類型驅動，新增輸出類型時不需修改歷程模組。

**Non-Goals:**

- 不實作留言串（Label Studio 的 `comment_id` 系列）與系統稽核層（使用者 ID／IP／request type），兩者屬後端階段。
- 不修改 `specs/task-management/014-task-detail/spec.md`：FR-015d-4 之時間軸與本次事件同源，欄位新增為向後相容擴充，其呈現改版另案處理。
- 不對既有事件做資料遷移（見 Migration Plan）。

## Decisions

### D1：事件模型放在共用模組，而非 workspace 內

`HISTORY_ACTIONS` 常數、事件建構函式與遮蔽過濾放進 `design/prototype/pages/shared/`，由 015 與 014 共同引用。

- **理由**：目前三套歷程各自為政正是本次要收斂的結構問題；若把新模型再寫進 `annotation-workspace.config.js`，014 的時間軸仍需第二份實作。
- **替代方案**：留在 workspace 內、014 之後自行對接 — 否決，會複製一份 `action` 常數與遮蔽規則，違反 DRY，且遮蔽規則複製一份即等於多一個洩漏面。

### D2：差異於呈現時計算，不儲存

`result_snapshot` 只存當下完整結果，差異由相鄰兩筆快照即時計算。

- **理由**：儲存差異等於同一事實存兩份，兩者可能不一致；且差異的呈現粒度日後可能改變，存下來的舊差異無法隨之更新。
- **代價**：每次渲染需比對，量級為單一樣本的事件數（個位數），可忽略。
- **替代方案**：存差異不存快照 — 否決，無法支援仲裁者「看某一時點的完整答案」，也無法在差異演算法改版後重算。

### D3：差異演算法依輸出類型註冊，不逐 task 分支

以 `OUTPUT_TYPE_REGISTRY` 的 `outKey` 查表取得比對器：純值類型用值比對；位置型類型用 span 對齊比對器。

- **span 對齊規則**：以 `[start, end]` 起訖點配對前後兩份實體陣列——起點與標籤皆相同視為同一實體（比對其 `end` 是否變動，變動則列為「邊界變更」）；僅存在於新快照者為「新增」；僅存在於舊快照者為「刪除」。起點相同但標籤不同時，視為一刪一增而非邊界變更，以免掩蓋標籤錯誤。
- **理由**：Generalization-First 為 NON-NEGOTIABLE；新增輸出類型時只需註冊比對器。
- **替代方案**：位置型第一版只顯示數量摘要 — 否決，「數量相同但邊界不同」正是審核修正最常見的形態，數量摘要恰好看不出來。

### D4：耗時以頁面可見時間累計

`visibilitychange` 與 `window.blur` 暫停、`focus` 續計，累計值寫入事件的 `lead_time`。

- **理由**：掛鐘時間差會把「開著分頁去吃飯」算成標記耗時，該數字用於分析標記難度時完全失真。
- **代價**：實作與測試較複雜——必須以假時鐘驅動。本頁既有 autosave 測試有真時鐘與假時鐘混用導致的競態前例，計時器測試須全程使用假時鐘，不得混用 `Date.now()` 的真值。
- **替代方案**：掛鐘時間差 — 否決，理由如上。

### D5：遮蔽在資料供給層，`getSampleHistory()` 收斂為唯一入口

`getSampleHistory(sampleId, viewerContext)` 依檢視者角色與身分回傳「已遮蔽」的事件陣列——被遮蔽的 `result_snapshot` 與 `reason` 不出現在回傳值中，而非帶著值交給渲染端隱藏。

- **理由**：Data Fairness 為 NON-NEGOTIABLE。以樣式隱藏的答案仍在 DOM 與記憶體中，任何檢視原始碼的標記員都能取得，等於沒有遮蔽。
- **疊加順序**：先套 FR-062（未提交之審核判斷僅本人可見，整筆事件不納入），再套 FR-090（納入的事件依角色決定快照與理由是否附帶）。兩者方向不同——前者決定「事件在不在」，後者決定「事件裡有什麼」——必須依序套用，不可合併為單一條件。
- **替代方案**：渲染端遮蔽 — 否決，理由如上。

### D6：快照精簡與體積策略

`result_snapshot` 只存 `outputs[]` 的作答結果，排除原始文本與資料集欄位；同時把 `wsSubmissions` 的整包 read-modify-write 改為以事件為單位的追加寫入。

- **理由**：原始文本可由 `sample_id` 取回，複製進每一筆事件是純粹的體積浪費；整包 RMW 在快照放大體積後，寫入視窗變長，lost-update 風險（CONC-03）隨之升高。
- **開放邊界**：本變更不引入配額回收機制（超額時裁切最舊事件）——原型資料量為示範規模，尚不需要；此判斷記於 Open Questions。

### Constitution Check

- **Generalization-First（NON-NEGOTIABLE）**：D3 以 registry 驅動比對器，`action` 與徽章對應為單一資料來源；歷程模組不含任何 task 專屬分支。
- **Data Fairness（NON-NEGOTIABLE）**：D5 將遮蔽下沉至資料供給層，並明確定義與 FR-062 的疊加順序；`dry_run` 期間標記員無法由任何呈現路徑取得他人快照。
- **Simplicity First / YAGNI**：僅四個欄位、七個 action 值；不引入留言串、系統稽核層與配額回收。
- **Principle X（PR 規模）**：六個 PR 群組加最終 archive 群組，每組獨立可驗證（見 `tasks.md`）。

## Risks / Trade-offs

- **[快照成為新的答案洩漏面]** → 遮蔽在資料供給層完成（D5），並以 AC-4.51 斷言「被遮蔽內容不存在於該檢視者可取得的輸出中」，而非只斷言畫面看不到。
- **[FR-062 與 FR-090 疊加順序寫錯，導致草稿快照外洩]** → 兩條規則的測試分別覆蓋且交叉一例（AC-4.51 第三個 **AND**：仲裁者仍看不到他人未提交草稿）。
- **[`localStorage` 體積成長觸及配額]** → D6 精簡快照；體積監測與回收策略列為 Open Question，不預先發明。
- **[整包 RMW 的 lost-update（CONC-03）在快照放大後更易觸發]** → 於「快照＋遮蔽」PR 群組中一併改為事件層級追加寫入。
- **[耗時計時器測試受真時鐘污染]** → 全程假時鐘，並沿用本頁 autosave 既有競態的處置方式；不以真實等待驗證累計值。
- **[跳過改為必填理由降低標記流暢度]** → 這是刻意取捨：跳過理由的集合正是指出標記指引該修哪裡的直接證據（試標品質迴圈）；風險是標記員亂填，屬資料品質層面，由審核端觀察而非以規格阻擋。

## Migration Plan

- **不遷移既有事件**：v4.61.0 以前寫入的事件缺新欄位，一律原樣顯示、缺欄位不渲染（FR-016B 修訂條文）。理由是補寫不存在的耗時或快照會讓歷程失去稽核價值——一份被推估填充過的紀錄不能作為研究證據使用。
- **不重建示範資料**：T014–T017 既有事件維持原狀，新欄位自本版之後的新事件開始累積。
- **回滾**：六個 PR 群組各自可獨立回滾；新欄位為附加性質，回滾後舊渲染路徑仍能讀取事件（缺欄位不渲染的規則對兩個方向皆成立）。

## Open Questions

- `localStorage` 體積監測與超額回收策略（是否裁切最舊事件、以何為單位）——原型示範規模下不會觸及配額，且此問題的正確解法取決於後端接上後歷程是否仍存於瀏覽器；不影響本變更的規格、方式或任務拆分。
