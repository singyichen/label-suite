## 1. PR 群組 A — 事件模型與 action 常數化（FR-016B、FR-086）

> 本群組為後續所有群組的地基，必須最先合併。組內 1.1 → 1.2 → 1.3 → 1.4 → 1.5 嚴格序列；與其他群組無並行空間。
> 產品檔案：`design/prototype/pages/shared/annotation-history.js`（新增）、`annotation-workspace.html`、`annotation-workspace.config.js`（共 3 檔）。
> 本群組只換渲染層。資料層仍寫入舊值 `saved`，因此既有草稿事件在本群組合併後暫時以中性徽章呈現（符合 FR-086 對集合外值的規定）；寫入端更名於群組 B 的 2.2 完成。

- [x] 1.1 撰寫 Red 測試 `design/prototype/tests/annotation/issue-578-history-actions.spec.ts`：斷言 AC-2.16（七種 `HISTORY_ACTIONS` 各自呈現一個徽章且七色兩兩不同；集合外舊值以中性徽章呈現且清單其餘事件正常渲染）與 AC-2.15 第二個 **AND**（缺新欄位之舊事件原樣顯示、不擲錯）；提交並執行，記錄預期失敗原因 [@senior-qa]
- [x] 1.2 新增 `design/prototype/pages/shared/annotation-history.js`：定義 `HISTORY_ACTIONS` 常數、`action` → 徽章語意色的單一對應表與事件建構函式；驗證方式為 `corepack pnpm typecheck`（於 `design/prototype/`）exit 0 [@senior-frontend]
- [x] 1.3 修改 `design/prototype/pages/annotation/annotation-workspace.html`：載入 1.2 的共用模組，並為七個 action 各定義一組語意色徽章樣式（既有 `.saved` 規則由 `.draft-saved` 取代，`.adjudicated` 由死碼轉為 FR-086 用途）；驗證方式為 `corepack pnpm typecheck` exit 0 [@senior-frontend]
- [x] 1.4 修改 `design/prototype/pages/annotation/annotation-workspace.config.js`：`renderHistoryPanel()` 改由 1.2 的對應表推導徽章，移除三值硬編分支，集合外值走中性徽章；驗證方式為 1.1 的 Red 測試轉綠 [@senior-frontend]
- [x] 1.5 執行 `cd design/prototype && corepack pnpm typecheck && corepack pnpm playwright test`，預期兩者皆 exit 0 且 1.1 新增案例全綠；核對 Red／Green 證據後勾選本群組 [@main]

## 2. PR 群組 B — 結果快照與分層遮蔽（FR-087 純值部分、FR-090）

> 依賴群組 A 合併。組內 2.1 → 2.2 → 2.3 → 2.4 → 2.5 嚴格序列。
> 產品檔案：`annotation-workspace.data.js`、`annotation-workspace.config.js`、`annotation-workspace.html`、`shared/annotation-history.js`（共 4 檔）。
> **實測修正**：`wsSubmissions` 早已於 issue #283 由整包 blob 改為 per-bucket key（`labelsuite.wsSubmissions.<bucketKey>`），design.md D6 所述的「整包 read-modify-write」現況不成立。同一 bucket 內仍是 read-modify-write，但單一 bucket 的寫入視窗遠小於整包 blob，CONC-03 的 lost-update 風險等級低於 propose 時的判斷。原 2.2 末句「同一 bucket 內改為事件層級追加寫入」因此刪除（2026-08-31 使用者裁示）：其依據（design.md D6 的整包 RMW）已不成立，且儲存層寫入格式變更與本群組「快照＋遮蔽」的單一目的無關，屬另一件事。
> **實測修正（模組職責反轉）**：`annotation-workspace.data.js` 於 module boot 即呼叫 `seedReviewFlowDemo()` 並寫入歷程事件，而載入它的頁面共六個（`task-new` / `task-detail` / `dataset-analysis-detail` / `annotation-list` / `annotation-workspace` / `dashboard`）。若依 propose 時的設計讓 data.js 反向依賴 `shared/annotation-history.js`，六頁都得補 `<script>`，本群組將達 9 個產品檔案而違反 Principle X。故改為職責反轉：`shared/annotation-history.js` 只保留**渲染側**徽章對應表（僅需畫歷程的頁載入），**寫入側**的事件建構、`result_snapshot` 與遮蔽邏輯改由六頁本已載入的 `annotation-workspace.data.js` 承載，新增依賴數為 0。原 2.2b（補 `<script>` 接線）因此取消。
> **範圍追加**（2026-08-31 使用者裁示）：`accepted` 與 `modified` 現況從無產生點（全碼庫只發出 `submitted`／`saved`／`rejected`），propose 時未察覺，六個群組皆未指派。已於 delta 補 FR-086 產生點條文與 AC-2.21，實作併入本群組 2.2，不新增產品檔案。
> 本群組含 Data Fairness NON-NEGOTIABLE 的遮蔽契約，測試必須斷言「被遮蔽內容不存在於檢視者可取得的輸出中」，不得只斷言畫面不可見。

- [x] 2.1 撰寫 Red 測試 `design/prototype/tests/annotation/issue-578-history-snapshot-masking.spec.ts`：斷言 AC-2.17（純值前後差異、首次提交呈現為全新內容）、AC-2.21（審核通過產生 `accepted`、修正產生 `modified`，且不重複）與 AC-4.51（標記員取不到他人快照與理由、reviewer 兩人皆可見、仲裁者仍看不到他人未提交草稿）；提交並執行，記錄預期失敗原因 [@senior-qa]
- [x] 2.2 修改 `design/prototype/pages/annotation/annotation-workspace.data.js`：`appendHistoryEvent()` 於資料層建構事件（草稿事件由 `saved` 更名為 `draft_saved`），事件寫入 `result_snapshot`（精簡 `outputs[]`，排除原始文本與資料集欄位），`getSampleHistory()` 改為接受檢視者脈絡並依序套用 FR-062、FR-090 回傳已遮蔽事件；並補上 FR-086 缺漏的產生點——審核員 per-outKey 決策送出時，通過寫入 `accepted`、修正寫入 `modified`（沿用 FR-051 既有判定，不改判定邏輯）；驗證方式為 2.1 中 AC-4.51 三個斷言與 AC-2.21 轉綠，且既有 `issue-470-autosave-indicator-honesty.spec.ts` 的 `action === 'saved'` 斷言同步更名後仍綠 [@senior-frontend]
- [x] 2.3 修改 `design/prototype/pages/annotation/annotation-workspace.html`：歷程卡片新增差異區塊與理由區塊的版型容器；驗證方式為 `corepack pnpm typecheck` exit 0 且卡片於既有事件下不產生空白區塊 [@senior-frontend]
- [x] 2.4 修改 `design/prototype/pages/annotation/annotation-workspace.config.js`：渲染純值輸出類型的前後差異與理由，缺欄位不渲染；驗證方式為 2.1 中 AC-2.17 斷言轉綠 [@senior-frontend]
- [x] 2.5 執行 `cd design/prototype && corepack pnpm typecheck && corepack pnpm playwright test`，預期兩者皆 exit 0 且既有盲審隔離測試（FR-062 相關）未退化；核對 Red／Green 證據後勾選本群組 [@main]

## 3. PR 群組 C — 位置型輸出差異（FR-087 位置型部分）

> 依賴群組 B 合併。組內 3.1 → 3.2 → 3.3 嚴格序列。
> 產品檔案：`design/prototype/pages/shared/annotation-history.js`、`annotation-workspace.config.js`（共 2 檔）。
> **實測修正（產品檔案數）**：原列 1 檔。比對器本身確實只落在 `shared/annotation-history.js`，但 AC-2.18 斷言的是「檢視後一筆事件之差異區塊」，而差異區塊由群組 B 落在 `annotation-workspace.config.js` 的 `buildHistoryDiff()` 產生；比對器若無人呼叫則 AC 無從觀察，故本群組必須含該處接線，共 2 檔（仍在 Principle X 的 5 檔以內）。
> **實測修正（位置型涵蓋範圍）**：FR-087 列出三種位置型（`entity_recognition`、`relation_identification`、`sequence_tagging`）。實測快照結構中，前兩者的位置資料狀況不同：`previewEntities` 具 `start`／`end`（`entity_recognition`），`previewState.sequence_tagging.tokens` 以陣列索引即為位置（每個非 `O` 標記為一單位 span），兩者皆已註冊 span 對齊比對器；`previewTriples`（`relation_identification`）僅有 `subj`／`rel`／`obj`，全碼庫未存任何位移，無 span 可對齊，故本群組維持其既有純值比對路徑。此落差記錄於本區塊，待 `relation_identification` 具備位移資料後另開 issue 補齊。

- [x] 3.1 撰寫 Red 測試 `design/prototype/tests/annotation/issue-578-entity-diff.spec.ts`：斷言 AC-2.18（3→4 實體且一個 span 由 `[0,4]` 改為 `[0,6]` 時列出 1 筆新增與 1 筆邊界變更；實體數量相同但邊界不同時差異區塊不得為空；起點相同而標籤不同時列為一刪一增）；提交並執行，記錄預期失敗原因 [@senior-qa]
- [x] 3.2 修改 `design/prototype/pages/shared/annotation-history.js`：新增依 `OUTPUT_TYPE_REGISTRY` 註冊的 span 對齊比對器（起點＋標籤配對，比對 `end` 判定邊界變更），不得逐 task 硬編；驗證方式為 3.1 的 Red 測試轉綠 [@senior-frontend]
- [x] 3.3 執行 `cd design/prototype && corepack pnpm typecheck && corepack pnpm playwright test`，預期兩者皆 exit 0；核對 Red／Green 證據後勾選本群組 [@main]

## 4. PR 群組 D — 標記耗時（FR-088）

> 依賴群組 A 合併，與群組 C 無檔案交集，可與群組 C 並行開發但須各自獨立開 PR。組內 4.1 → 4.2 → 4.3 → 4.4 嚴格序列。
> 產品檔案：`annotation-workspace.config.js`、`annotation-workspace.data.js`（共 2 檔）。
> 計時器測試必須全程使用假時鐘，不得混用真實 `Date.now()`（本頁 autosave 有真／假時鐘混用競態前例）。

> **實測修正（`rejected` 事件的耗時來源）**：FR-088 要求「每筆事件」承載 `started_at` 與 `lead_time`，但 `markSampleRejected()` 原簽章不收 payload，無從取得計時。已於其尾端加上選用的 `timing` 參數，由審核送出端把同一次 `submitPayload.timing` 一併傳入，使退回事件與同批 `accepted`／`modified` 事件的耗時同源；未傳入時沿用既有行為（不寫任何耗時欄位）。

> **實測修正（測試夾具）**：T001 各筆資料帶有 `gold_label` 預填，該預填在位時作答 chip 不接受標記員自己的點擊，提交會被「請完成所有標記項目後再提交」擋下而寫不出事件。4.1 的測試比照 issue #470 spec 的 `beforeEach` 先行清掉該預填。另 `page.clock.pauseAt()` 必須落在 `install()` 之後的虛擬時間點（同 issue #524 競態），不得與 `install()` 同一瞬間。

- [x] 4.1 撰寫 Red 測試 `design/prototype/tests/annotation/issue-578-lead-time.spec.ts`：斷言 AC-2.19（分頁切背景期間不計入、`lead_time` 小於 `at` 與 `started_at` 之差）與 AC-3.49（annotator 視角無任何耗時呈現、reviewer 視角可見）；提交並執行，記錄預期失敗原因 [@senior-qa]
- [x] 4.2 修改 `design/prototype/pages/annotation/annotation-workspace.config.js`：以 `visibilitychange`／`blur`／`focus` 驅動可見時間累計，並依角色決定是否渲染耗時；驗證方式為 4.1 中 AC-3.49 斷言轉綠 [@senior-frontend]
- [x] 4.3 修改 `design/prototype/pages/annotation/annotation-workspace.data.js`：事件寫入 `started_at` 與 `lead_time`；驗證方式為 4.1 中 AC-2.19 斷言轉綠 [@senior-frontend]
- [x] 4.4 執行 `cd design/prototype && corepack pnpm typecheck && corepack pnpm playwright test`，預期兩者皆 exit 0 且既有 autosave 測試未因新計時器退化；核對 Red／Green 證據後勾選本群組 [@main]

## 5. PR 群組 E — 動作理由必填（FR-089）

> 依賴群組 B 合併（`reason` 欄位由該群組落地）。組內 5.1 → 5.2 → 5.3 → 5.4 → 5.5 嚴格序列。
> 產品檔案：`annotation-workspace.html`、`annotation-workspace.config.js`、`design/prototype/pages/annotation/annotation-workspace.data.js`（共 3 檔）。
> **實測修正（跳過動作與 `adjudicated` 事件皆為新建，範圍擴大）**：本群組原訂前提為「跳過動作與 `adjudicated` 事件皆已存在，只需替它們補上理由必填」，經實測不成立——（a）原型完全沒有任何跳過 UI，`design/prototype/` 全域查無 `markSampleSkipped` 之類的寫入函式，`shared/annotation-history.js` 的 `SKIPPED: 'skipped'` 是群組 A 新增的常數、至今無任何產生點；（b）正典 `specs/annotation/015-annotation-workspace/spec.md` 全文查無 `skipped`；（c）`annotation-workspace.data.js#submitArbitration()` 只寫仲裁票與定案值（必要時再呼叫 `markSampleRejected()`），不呼叫 `appendHistoryEvent()`，`adjudicated` 同樣無產生點——`appendHistoryEvent()` 現有呼叫點只有 `submitted`／`modified`／`accepted`／`draft_saved`／`rejected`。範圍因此擴充為一次做完：**新建標記員跳過動作、補寫 `adjudicated` 歷程事件、兩者自始即以理由必填為契約**（2026-08-31 使用者裁示）。兩個新事件的寫入都落在寫入側，故加入 `annotation-workspace.data.js`，產品檔案由 2 檔增為 3 檔，仍在 Principle X 的 5 檔門檻內。
> 因跳過動作在本版以前並不存在，本群組於標記員互動面屬**新增能力**而非既有行為的 **BREAKING** 變更；delta 之 FR-089 已同步改寫（見該條「新增能力」段落）。

- [x] 5.1 撰寫 Red 測試 `design/prototype/tests/annotation/issue-578-reason-required.spec.ts`：斷言 AC-2.20（標記員跳過入口存在；未填理由時送出被阻擋且不產生 `skipped` 事件、填理由後產生一筆 `skipped` 事件且其 `reason` 等於所填值）與 AC-3.50（仲裁未填理由被阻擋並指名缺理由項目、填後產生一筆 `adjudicated` 事件且帶 `reason`——本版以前仲裁送出不寫任何歷程事件，故此事件之存在本身即為斷言標的）；提交並執行，記錄預期失敗原因 [@senior-qa]
- [x] 5.2 修改 `design/prototype/pages/annotation/annotation-workspace.html`：新增標記員「跳過」動作入口與其理由輸入，以及仲裁理由輸入的必填欄位版型；驗證方式為 `corepack pnpm typecheck` exit 0 且理由欄位於未觸發跳過／仲裁時計數為 0 [@senior-frontend]
- [x] 5.3 修改 `design/prototype/pages/annotation/annotation-workspace.data.js`：新增跳過之寫入函式，寫入一筆 `skipped` 歷程事件；並於 `submitArbitration()` 補寫一筆 `adjudicated` 歷程事件（本版以前該函式不寫任何歷程事件）。兩者之 `reason` 皆為必要參數，並沿用群組 B／D 既有的 `result_snapshot`（FR-087）與耗時（FR-088）欄位建構路徑，不另寫第二套；驗證方式為 5.1 中「事件產生」相關斷言轉綠 [@senior-frontend]
- [x] 5.4 修改 `design/prototype/pages/annotation/annotation-workspace.config.js`：接上 5.2 的跳過入口與 5.3 的寫入函式，跳過與仲裁送出前驗證理由並阻擋、理由寫入事件 `reason`，審核側沿用 FR-016A 既有 `reasons` 來源不另存第二份；驗證方式為 5.1 的 Red 測試全數轉綠 [@senior-frontend]
- [x] 5.5 執行 `cd design/prototype && corepack pnpm typecheck && corepack pnpm playwright test`，預期兩者皆 exit 0 且既有 FR-016A／FR-083／FR-085 退回理由測試未退化；核對 Red／Green 證據後勾選本群組 [@main]

## 6. PR 群組 F — 標記清單處理狀況彙總（FR-091）

> 依賴群組 A 與 D 合併（最後動作取自常數化 `action`，累計耗時取自 `lead_time`）。組內 6.1 → 6.2 → 6.3 嚴格序列。
> 產品檔案：`design/prototype/pages/annotation/annotation-list.html`、`design/prototype/pages/shared/annotation-history.js`、`design/prototype/pages/annotation/annotation-workspace.config.js`（共 3 檔）。
> **實測修正**：原估 1 檔。彙總的累計耗時必須與工作區歷程面板用同一套時間格式，否則同一個 `lead_time` 在兩個畫面可能顯示成不同字串；因此把 `formatLeadTime` 從 `annotation-workspace.config.js` 搬到共用的 `annotation-history.js`（該模組本就負責 render 側），工作區改呼叫共用版本，共 3 檔。仍在 Principle X 的 5 檔內。

- [x] 6.1 撰寫 Red 測試 `design/prototype/tests/annotation/issue-578-list-summary.spec.ts`：斷言 AC-1.25（reviewer 檢視顯示最後動作／最後活動時間／累計耗時；annotator 檢視不呈現累計耗時；無歷程事件之樣本三項皆為空狀態而非零值）；提交並執行，記錄預期失敗原因 [@senior-qa]
- [x] 6.2 修改 `design/prototype/pages/annotation/annotation-list.html`：每筆樣本新增三項彙總，全部由歷程事件推導、不另存第二份；驗證方式為 6.1 的 Red 測試轉綠 [@senior-frontend]
- [x] 6.3 執行 `cd design/prototype && corepack pnpm typecheck && corepack pnpm playwright test`，預期兩者皆 exit 0；核對 Red／Green 證據後勾選本群組 [@main]

## 7. 最終 PR 群組 — Source-Verify 與 archive 回寫

> 僅在群組 A ~ F 全數合併後執行；本群組完成第 4 道驗證閘。

> **Source-Verify 預跑結果（2026-08-31）**：對 58 處引用逐條 grep，48 項 PASS、10 項 FAIL／MISMATCH。`openspec archive` 會把 propose 時的 delta 文字逐字複製進衍生檢視，任何錯誤引用都會原樣進入正典且無 CLI 檢查攔得住，故 7.1／7.2 必須在 7.5 之前完成。

- [x] 7.1 修正 6 項阻斷級引用錯誤 [@main]
      ① `proposal.md` L54 與 `design.md` L8 的「`wsSubmissions` 目前為整包 read-modify-write」已過時——正典 Changelog v4.14.1（issue #283）記載其自該版起改為 per-bucket key，base commit 實測有 3 處 `labelsuite.wsSubmissions.` per-bucket 寫入；改為「per-bucket key，同一 bucket 內仍為 read-modify-write 但寫入視窗遠小於整包 blob」，並與 `design.md` D6／Risks 既有的「實測修正」段落一致。
      ② delta L29「沿用 FR-051 既有的 per-outKey 決策」——FR-051 全文不含 `outKey`，其定義為審核單位層級的 `REVIEW_UNIT_DIMENSIONS` 與五態推導；改引 FR-014B（逐 outKey 通過／退回按鈕）與 FR-052（逐輸出類型差異比對）。
      ③ delta L107「既有跨標記員隔離（他人狀態僅可讀狀態列舉，不得讀作答內容）」——正典查無此條文；改寫為本變更新建之隔離規則，理據引 Constitution III Data Fairness 與現況 `getSampleHistory()` 依 `identity.annotatorId` 分桶，不得宣稱其為既有條文。
      ④ delta L49 對 `relation_identification` 下的逐實體差異 MUST 與實作不符——`SPAN_EXTRACTORS` 只註冊 `entity_recognition` 與 `sequence_tagging`；比照 FR-052 既有慣例於條文內加註「已知落差」，說明其 CompactAnswer／`previewTriples` 不攜帶位移、暫沿用純值比對，並把 follow-up issue #590 的編號寫進條文。
      ⑤ `proposal.md` L20 的「跳過」**BREAKING** 標記與 L29 `### New Capabilities（無）`——跳過動作在本版以前完全不存在（base commit 全 prototype 命中 0），非 BREAKING 而是新增能力；同步 delta FR-089 已於 `4f45556` 改寫的說法。跳過動作本身的定義（僅標記員視角、`pending`／`saved` 可跳過、不改變樣本狀態、導覽沿用 FR-022A／FR-022C）已於群組 E 分支補進 FR-089，本項僅需處理 `proposal.md` 的 BREAKING 標記與 New Capabilities 兩處。
      ⑥ 關鍵實體 `AnnotationHistoryItem` 宣告要改卻無 delta 承載——delta L3 明寫「修訂 FR-016B 與關鍵實體 `AnnotationHistoryItem`」，但 delta 內無對應區塊；正典該實體的 `action` 列舉仍指向已於 v4.0.0 廢止的 FR-043，且列的是 `approved` 而非 FR-086 的 `accepted`。補上實體的 MODIFIED 區塊，並於 Changelog 明記 `approved` → `accepted` 之改名。
- [x] 7.2 修正 3 項非阻斷但會污染正典的引用問題 [@main]
      ⑦ delta L69「`task-detail` 標記結果面板」——014 的正式名稱為 `標記結果表`（`annotation-results`）；併同處理兩個附帶問題：`design.md` Non-Goals 明說不修改 014，delta 卻對 014 頁面下 MUST（改為非規範性描述或補 014 delta），以及 014 既有 `work-log` 的總工時／每筆平均耗時與 FR-091「MUST NOT 另存第二份彙總」的關係須交代。
      ⑧ delta L87 稱審核側 `rejected`、`modified` 之理由「沿用 FR-016A 既有持久化路徑」——FR-016A 原文的 `reasons` map 僅限退回者；改寫為「MUST 擴充 FR-016A 之 `reasons` map 至 `modified`」，或將 FR-016A 納入 `## MODIFIED Requirements`。
      ⑨ `proposal.md` L12 的 Label Studio「16 欄位、9 值 action enum」在 `docs/research/tool-analysis.md`、`docs/product/ia/label-studio-functional-map.md` 皆 grep 不到——依 Source-Verify gate「找不到即移除或修正，絕不近似」，補進調研文件並標明來源路徑，或刪除括號內數字。
- [x] 7.3 執行 `openspec validate --changes --no-interactive`，預期 `change/enrich-annotation-history` 通過（第 1 道閘：OpenSpec schema） [@main]
- [x] 7.4 逐條以 `grep` 驗證 delta 中每個引用的正典 ID 皆可定位並記錄命中行號（第 4 道閘前置）：`specs/annotation/015-annotation-workspace/spec.md` 之 FR-014B、FR-016A、FR-016B、FR-044、FR-049、FR-050、FR-051、FR-052、FR-062、FR-083、FR-085，以及 `specs/task-management/014-task-detail/spec.md` 之 FR-015d-4 [@main]
- [x] 7.5 執行 `openspec archive enrich-annotation-history`，並回寫正典 `specs/annotation/015-annotation-workspace/spec.md`：版本 4.60.0 → 4.61.0、新增 Changelog 條目、納入 FR-086 ~ FR-091 與對應 AC，並同步改寫關鍵實體 `AnnotationHistoryItem` 的欄位清單（補 `result_snapshot`／`started_at`／`lead_time`／`reason`）與 `action` 列舉（改指 FR-086 `HISTORY_ACTIONS`、移除已廢止 FR-043 的引用）；衍生檢視現無 `### Requirement: FR-016B` 標題，delta 的 MODIFIED 合併無匹配目標，故 MUST 人工核對合併結果，不得只看 exit code [@main]
- [x] 7.6 最終 PR 合併後更新 `specs/STATUS.md`，並於 issue #578 附上完成摘要後關閉 [@main]
