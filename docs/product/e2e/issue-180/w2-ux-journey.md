# Issue #180 — W2 角色旅程與 UX 走查報告（senior-uiux 視角）

- 走查方式：純程式碼閱讀（不啟動瀏覽器、不跑 Playwright），依 issue #180 第 12.2 節 MUST READ 清單，沿 PL01 / A01-A03 / R01-R03 三條旅程推演實際行為。
- 排除範圍：`design/prototype/pages/dataset/**` 與 dataset 分析頁面，完全未讀取。
- Classification 用詞說明：本報告僅使用 `UX finding` 與「疑似 mismatch，待 W1 規格對照」，未使用 `Implementation mismatch`（無正典 spec 對照權限，依邊界規則不得自行判定）。

---

## 0. 角色旅程推演摘要（依程式碼實際行為）

### PL01（專案負責人）
`login.html`（帳密不驗證、必成功）→ `dashboard.html`（預設 `user` 場景卡片，`開始建立任務` 按鈕僅有 click-tracking，未見導向 `task-new.html` 的實際導覽邏輯，見 F-10）→ `task-new.html`（建立任務）→ `task-list.html`（清單，全部任務種子皆為 `draft`，見 F-01）→ `task-detail.html` 五個 panel（overview / member-management / annotation-progress / annotation-results / work-log）→ 發布試標 → 待 IAA 確認 → 正式標記 → 標記完成 → 匯出。
關鍵風險：發布前檢查未驗證實際成員人數（F-06）、「標記完成」無確認機制與前置條件檢查（F-07）、Dashboard IAA 待辦卡片不可互動且與清單不對帳（F-03）。

### A01–A03（標記員）
`dashboard.html`（`annotator` 場景卡片，讀 `dashboard.assignments.js` 進度 seed）→ `annotation-list.html`（讀同一組 `LabelSuiteAssignmentSeeds`，數字對齊，未見不一致）→ `annotation-workspace.html`（強制指引 modal → 逐筆標記 → 草稿/提交 → 上一筆/下一筆）。
關鍵風險：強制指引 modal 不呈現指引內容且為全域旗標（F-01）、指引附件與任務類型不符且 PDF 死連結（F-02）、Dashboard 任務卡片無排序／期限／篩選（F-04）、標記頁清單長文字不截斷（F-05）。

### R01–R02（審核員）與 R03（仲裁者）
`dashboard.html`（`reviewer` 場景卡片，文案沿用「退回」語意，F-08a）→ `annotation-list.html`（reviewer 篩選、待審清單、dispute 標記為「仲裁」入口）→ `annotation-workspace.html`（審核決策 UI：per-row 通過／退回按鈕，快捷鍵 A/R）→ `handleReviewSubmit()` 呼叫 `markSampleRejected()`，將標記狀態打回 `pending` 由標記員重新標記（F-08b，與同檔案內 `REVIEW_UNIT_STATUS`（pending/approved/modified/disputed/finalized）獨立審核＋直接修正＋仲裁模型並存但語意衝突）→ 爭議池／仲裁入口存在於 `member-management.html` 面板（`分派給仲裁者`，正向發現）。
關鍵風險：審核模型文案與互動邏輯自相矛盾（F-08）、審核歷程面板可能在提交前洩漏其他審核員的草稿活動（F-09）。

---

## 1. Findings（依 Severity 排序）

### F-01｜強制指引 modal 不呈現指引內容，且為全域（非任務別）閘門
- **Flow / Role**：標記員（A01-A03）與審核員第一次進入任一任務的 `annotation-workspace.html`
- **User goal**：在開始標記前，確實理解該任務的標記規則與判斷準則
- **Steps / Evidence**：
  - `design/prototype/pages/annotation/annotation-workspace.html:755-762` — `#wsGuidelineModal` 僅包含一個 `<h2>` 標題與一個確認按鈕，無任何指引內文渲染節點
  - `design/prototype/pages/annotation/annotation-workspace.config.js:39-40,90-91` — modal 文案固定為「請先閱讀任務說明」＋「我已閱讀，開始標記」，標題本身即為靜態字串，不含實際指引內容
  - `design/prototype/pages/annotation/annotation-workspace.config.js:2812-2836`（`setupGuidelineModal`）— 是否顯示 modal 僅取決於單一、非任務範圍的 key：`window.localStorage.getItem('labelsuite.guidelineModalSeen')`；確認後寫入同一 key，且從未依 `taskId` 或任務的「開始標記前強制顯示」設定（`task-detail.panels/overview.html:267-269` `editForceGuidelineToggle`）做區分
- **Observed**：標記員第一次在任何一個任務點擊「我已閱讀，開始標記」後，之後**所有任務**（無論該任務是否設定強制顯示指引）都不會再看到這個 modal；且即使顯示時，modal 本身也不含指引全文，真正指引內容位於右側分頁（`wsTabGuideline`）需另外點開才看得到
- **Expected**：依 issue 已知風險與 PL 驗收標準（`可設定...標記員指引...` / `可閱讀完整且與任務類型相符的標記指引`），「強制閱讀指引」應（a）在 modal 內或強制導向實際呈現指引全文，而非僅要求確認；（b）閘門狀態應以任務為單位（同一使用者換到另一個有強制顯示設定的新任務時應再次出現）
- **Impact**：標記員可能完全未讀過任務說明就開始標記，直接影響標記品質與 IAA；對 PL 而言，「強制顯示指引」設定形同虛設，造成錯誤的品質保證假象
- **Workaround**：標記員可自行點開右側「說明」分頁閱讀，但無強制力
- **Classification**：UX finding
- **Severity**：Blocking（涉及標記品質保證機制失效，且與 constitution 的資料品質意圖直接相關）
- **Recommendation**：(1) modal 內容改為渲染該任務的實際指引文字/檔案清單，或至少提供「查看完整說明」的強制展開；(2) `guidelineModalSeen` 旗標改為以 `taskId`（或 `taskId + runType`）為 key；(3) 未設定強制顯示的任務不應觸發此 modal。實作面調整。

---

### F-02｜指引附件與實際任務類型不符，且引用檔案不存在
- **Flow / Role**：PL01 設定指引 → A01-A03 / R01-R02 閱讀指引
- **Steps / Evidence**：
  - `design/prototype/pages/task-management/task-detail.data.js:1016-1027` — `DEFAULT_GUIDELINE_FILES` 對 T001-T013 全部 13 種任務（情感分類、NER、關係辨識、摘要、QA、VA 評分…）套用同一組附件：`標記範例圖.png`（實為 `assets/images/task-management/VA_emj.png`，Valence-Arousal 情緒量表示意圖）、`標記指引.pdf`（`assets/guidelines/annotation-guideline.pdf`）、通用「常見問題.md」
  - 檔案系統確認：`assets/guidelines/` 目錄整個不存在（`ls` 結果：`No such file or directory`），故 `annotation-guideline.pdf` 為死連結
  - 例：T006（新聞命名實體序列標註）與 T009（醫療文本摘要）與 T001（情感分類）都會顯示同一張「VA 情緒量表」範例圖，與各自任務的實際標記型態無關
- **Observed**：不論任務類型，標記員看到的「標記範例圖」都是同一張 VA 情緒量表圖，且「標記指引.pdf」連結會 404／載入失敗
- **Expected**：PL 驗收標準「可設定...標記員指引」與已知風險「任務指引、附件與實際任務類型必須一致」要求指引內容/附件應對應實際任務
- **Impact**：對非 VA 評分類任務的標記員造成誤導或困惑（範例圖與任務無關）；PDF 連結失敗會讓「強制閱讀」流程出現無法讀取的破損連結，降低信任
- **Workaround**：無（示意圖與任務不符時，使用者只能自行忽略）
- **Classification**：UX finding（附件與任務類型不一致部分）＋ 疑似 mismatch，待 W1 規格對照（PDF 資源缺失是否為 spec 已規範但未實作的產物）
- **Severity**：High
- **Recommendation**：至少為不同任務類別提供對應範例圖／或改用任務無關的通用占位圖並清楚標示「範例圖」而非暗示對應本任務；修正或移除死連結的 PDF 參照。實作面調整。

---

### F-03｜PL Dashboard「待 IAA 確認」統計無可執行入口，且與卡片清單對不上帳
- **Flow / Role**：PL01 於 Dashboard 查看待辦
- **Steps / Evidence**：
  - `design/prototype/pages/dashboard/dashboard.html:253`（`adminPendingIaaValue` = "5 個"）、`:318`（`plPendingIaaValue` = "5 個"）— 純文字 `<strong>`，無 `<button>`/`<a>` 包裹
  - `design/prototype/pages/dashboard/dashboard.js:390-414`（`bindStaticEvents`）— 僅為 `adminViewAllBtn`／`plViewAllBtn`（連到整體任務清單）與 annotator/reviewer CTA 綁定事件；沒有任何 selector 對應 `plPendingIaaValue`/`adminPendingIaaValue`，代表這兩個數字完全不可點擊、不可篩選
  - `design/prototype/pages/dashboard/dashboard.data.js:200-234`（`roleLists.projectLeader`）— 下方僅列出 3 張任務卡片（T003 `dry_run/in_progress`、T007 `official_run/in_progress`、T010 `official_run/in_progress`），沒有任何一張卡片狀態為「待 IAA 確認」，與「5 個」的統計數字無法對應、也看不到究竟是哪 5 個任務
- **Observed**：PL 看到「等待 IAA 確認：5 個」但沒有辦法從這個數字直接前往任何一個等待中的任務；且畫面上僅有的 3 張範例任務卡片沒有一張是這個狀態，數字與可見清單不一致
- **Expected**：已知風險「專案負責人看到等待 IAA 的項目時，應有直接可執行的待辦入口」；且「Dashboard 摘要數字必須與各任務卡片及明細加總一致」
- **Impact**：PL 必須自行前往 `task-list.html` 手動套用「狀態：待 IAA 確認」篩選才能找到，多一層不必要的操作與認知負擔；數字與清單不對帳會降低對 Dashboard 摘要資料的信任
- **Workaround**：可手動至 task-list.html 用狀態篩選找到（`task-list.html:396` 有 `waiting_iaa_confirmation` 篩選選項）——存在但非顯而易見
- **Classification**：UX finding
- **Severity**：High
- **Recommendation**：將摘要卡片改為可點擊，直接帶出已預先套用「待 IAA 確認」篩選的任務清單；示範資料需保證卡片與統計數字可對帳。實作面調整。

---

### F-04｜標記員／審核員 Dashboard 任務清單缺乏排序、期限、優先序或篩選
- **Flow / Role**：A01-A03、R01-R02 於 Dashboard 尋找應優先處理的任務
- **Steps / Evidence**：
  - `design/prototype/pages/dashboard/dashboard.js:260-283`（`renderTaskList` / `renderTaskLists`）— 直接依 `dashboard.assignments.js` 陣列固定順序（T001→T013）渲染卡片，無任何 sort/filter/priority 邏輯或 UI 控制項
  - `design/prototype/pages/dashboard/dashboard.html:341-411`（annotator / reviewer view）— 僅有 3 個彙總指標卡與一個純清單容器（`#annotatorTaskList` / `#reviewerTaskList`），沒有排序下拉、篩選、或期限欄位
- **Observed**：13 筆任務全部平鋪列出（demo 中 annotator/reviewer view 會渲染全部 13 筆而非篩選過的「我的任務」子集），使用者只能從上到下逐張卡片比對百分比進度才能判斷「該先做哪個」
- **Expected**：已知風險「標記員與審核員 Dashboard 應提供優先順序、期限、排序或篩選依據，避免大量快速操作卡片無法判斷先後」
- **Impact**：任務量增加時，使用者難以判斷優先序，增加操作前的認知負擔與找錯任務的風險
- **Classification**：UX finding
- **Severity**：Medium
- **Recommendation**：至少提供「依進度／依最後提交時間／依待審筆數」排序，或加入期限/優先權欄位。實作面調整。

---

### F-05｜`annotation-list.html` 長文字欄位無摘要或展開機制
- **Flow / Role**：A01-A03（挑選待標樣本）、R01-R02（挑選待審樣本）
- **Steps / Evidence**：
  - `design/prototype/pages/annotation/annotation-list.html:308-315` — `.text-snippet { max-width:520px; white-space: normal; overflow: visible; text-overflow: clip; }`：刻意不做省略號/截斷
  - `design/prototype/pages/annotation/annotation-list.html:1269-1271, 1393-1395` — `textTd.textContent = item.text` 直接塞入完整原文，無長度限制或「展開」按鈕
  - 對照 `task-detail.data.js` 中長文字樣本（如 T012 `background` 欄位為完整文章、T009 摘要來源文本 200+ 字、T013 多輪對話 `utterances`），這些內容會整段顯示在清單列
- **Observed**：長文本任務（QA/摘要/多輪對話類）的清單列會因整段原文換行而變得非常高，難以在同一畫面快速掃視多筆樣本
- **Expected**：已知風險「長文字資料在清單中應提供可掃讀的摘要或展開方式」
- **Impact**：降低清單可掃描性，標記員/審核員需要更多捲動與時間才能挑到目標樣本，增加操作耗時
- **Classification**：UX finding
- **Severity**：Medium
- **Recommendation**：預設以固定行數截斷＋「展開全文」toggle，或改用 tooltip/抽屜呈現全文。實作面調整。

---

### F-06｜發布前檢查（試標／正式標記）未驗證實際成員人數，只驗證設定數值
- **Flow / Role**：PL01 啟動試標／正式標記
- **Steps / Evidence**：
  - `design/prototype/pages/task-management/task-detail.html:8822-8831`（`canPublish()`）— 僅呼叫 `validateSampling()`
  - `design/prototype/pages/task-management/task-detail.html:5011-5030`（`validateSamplingData`）— 驗證項目為：抽樣筆數範圍、IAA override 是否落在 0-1、以及**設定值** `data.minAnnotators < 2`；完全沒有比較「目前實際加入且啟用中的標記員/審核員人數」是否 ≥ 設定的 `minAnnotators`/`minReviewers`
  - `design/prototype/pages/task-management/task-detail.html:8833-8859`（`publishDryRun`）／`:8861-8868`（`publishOfficialRun`）— 都只 gate 在 `canPublish()`，發布成功後才把 `TASK_DATA.currentAnnotators` 事後設成等於 `minAnnotators`（`:8852`），顯示這只是展示用途，不是真實成員盤點
  - 對照 UI：`overview.html:513-525`（`execStopRow`／`stopAnnotatorPill`）僅是「顯示用」的達標徽章（`task-detail.html:5162-5169` 依 `currentAnnotators >= minAnnotators` 切換 class），與實際能否點擊發布按鈕無關聯
- **Observed**：即使成員管理面板中「目前成員清單」的啟用標記員/審核員實際人數低於設定的最低人數，發布按鈕在目前程式邏輯下依然可以成功送出（因為 `canPublish()` 從未讀取成員清單的真實人數）
- **Expected**：PL 驗收標準「缺少必要資料、成員不足或設定不完整時，不可發布且須指出具體原因」；已知風險「成員不足或其他發布條件未滿足時，操作應被阻擋並清楚說明缺少條件」
- **Impact**：可能在成員不足的情況下就進入試標/正式標記，事後才發現任務無法如期完成或 IAA 樣本不足，屬於流程層級的風險而非單純外觀問題
- **Workaround**：PL 可自行留意 `stopAnnotatorPill` 是否為綠色，但這只是提示，不是強制阻擋
- **Classification**：UX finding（本輪僅能確認 prototype 互動邏輯本身缺這道檢查；是否為 spec 已規範但未實作，留待 W1 對照）
- **Severity**：High
- **Recommendation**：`canPublish()`/`validateSamplingData` 應加入「實際啟用成員數 ≥ 設定最低人數」的檢查，未通過時明確標示缺少的角色與人數。實作面調整，若 spec 已有此要求則屬於 Bug。

---

### F-07｜「標記完成」（Mark complete）無確認對話框，也無任何前置條件檢查
- **Flow / Role**：PL01 將任務標記為完成
- **Steps / Evidence**：
  - `design/prototype/pages/task-management/task-detail.html:9199-9202` — `publishCompleteBtn` 點擊事件直接呼叫 `publishComplete()`，中間沒有任何 confirm modal（對照同一段程式碼 `:9183-9186, :9192-9195`，`publishDryRun`/`publishOfficialRun` 在「資料隔離關閉」情境下至少會開 `riskModal` 二次確認，但 `publishComplete` 完全沒有等效機制）
  - `design/prototype/pages/task-management/task-detail.html:8870-8876`（`publishComplete`）— 直接 `TASK_DATA.status = 'completed'`，沒有檢查是否所有正式 assignment 已提交、review unit 是否完成、是否有未解決 dispute、是否仲裁完成
- **Observed**：點擊「標記完成」按鈕即立即、不可逆地把任務狀態切成 `completed`，沒有二次確認，也沒有阻擋含未解決爭議或未完成審核的任務被標記完成
- **Expected**：issue 附註「決定專案進入 `completed` 的正式條件；建議至少包含正式標記完成、必要審核完成、無未解決歧異、必要仲裁完成」；UX 評估項目「不可逆或高影響操作是否有適當確認，且不會因重複點擊產生重複提交」
- **Impact**：PL 可能誤觸而提早結案，或在仍有未解決 dispute 時完成專案，導致後續匯出/稽核資料不完整；缺乏確認機制也提高誤操作風險
- **Classification**：UX finding
- **Severity**：Blocking
- **Recommendation**：新增二次確認 modal，且完成前檢查未解決 dispute／未完成 review unit／仲裁狀態，不符合時清楚列出阻擋原因。實作面調整（若 spec/ADR-022 已定義完成條件，則同時視為對應規格的實作缺口）。

---

### F-08｜審核模型文案與互動邏輯仍混用「退回／通過」舊語意，與「獨立審核＋直接修正＋仲裁」新模型並存衝突
- **Flow / Role**：R01-R02 執行審核（此為 issue 第 8 節已列的已知風險項目，本節提供程式碼層級證據）

**F-08a（文案）**
- `design/prototype/pages/dashboard/dashboard.html:163`（`roleReviewerSubtitle`）＝「檢查標記內容、退回修正或通過資料。」
- `design/prototype/pages/dashboard/dashboard.html:180`（`stepReviewer2Desc`）＝「確認標記正確，或退回修正原因」
- `design/prototype/pages/dashboard/dashboard.i18n.js:52,68` 為同一文案的 i18n 來源
- `design/prototype/pages/shared/sidebar.js:48,512`（`reviewReject: '退回目前結果'`）— 鍵盤捷徑說明面板明確標示「R」鍵 = 「退回目前結果」

**F-08b（實際互動邏輯）**
- `design/prototype/pages/annotation/annotation-workspace.config.js:49-53`（`reviewApproveLabel: '通過'`／`reviewRejectLabel: '退回'`／`reviewNote: '通過：此筆標記有效。退回：該標記狀態會回到未標記，標記員需要重新標記。'`）
- `design/prototype/pages/annotation/annotation-workspace.config.js:1970-2005`（per-row 通過/退回按鈕）＋ `:2043-2051`（快捷鍵 A/R 直接呼叫 `setReviewUnitDecision('approve'|'reject')`）
- `design/prototype/pages/annotation/annotation-workspace.config.js:2600-2657`（`handleReviewSubmit`）第 2649-2650 行：一旦該標記員的任一輸出被判定 `reject`，即呼叫 `window.LabelSuiteAnnotationWorkspaceData.markSampleRejected(...)`
- `design/prototype/pages/annotation/annotation-workspace.data.js:331-358`（`markSampleRejected`，函式註解明白寫著："Reviewer rejection: sends a sample back to the annotator for revision... flips status back to 'pending'"）

**與新模型的衝突對照**
- 同一份 `annotation-workspace.data.js:1332-1494` 另外定義了 `REVIEW_UNIT_STATUS`（`PENDING/APPROVED/MODIFIED/DISPUTED/FINALIZED`）與完整的 dispute/arbitration 狀態機（多數決、爭議池、仲裁者候選資格等），語意上預期審核員應該「直接修正」答案（產生 `MODIFIED` 狀態）而非把樣本退回給標記員重做
- `annotation-workspace.data.js:360-378` 的註解也自陳這是「restores the legacy per-output-type review card」——即刻意保留的舊版審核卡邏輯，與新版 `REVIEW_UNIT_STATUS` 模型同時存在於同一個工作區
- **Observed**：審核員在同一個標記工作區中，看到的可互動按鈕（通過/退回）實際執行的是「退回給標記員重做」的舊模型，而不是「審核員直接修正答案」；但同一資料層卻也維護著假設「審核員直接修正」的 `MODIFIED`/`DISPUTED`/仲裁狀態機。兩者在同一個審核流程中並存，語意矛盾
- **Expected**：已知風險「審核者文案應與最新『獨立審核、直接修改、歧異仲裁』模型一致，避免沿用過時的『退回／通過』語意」
- **Impact**：審核員的心智模型會被文案與快捷鍵誤導成「這是退回重工模式」，但底層卻同時記錄仲裁/爭議池等只有在「直接修正」模型下才有意義的狀態；PL 在「審核設定」面板設定的「一致即定案」「不一致時交第三人仲裁」等選項，其行為預期與實際「退回重做」邏輯如何整合並不清楚，容易造成流程認知混亂與資料狀態不可預期
- **Workaround**：無，這是核心互動路徑
- **Classification**：疑似 mismatch，待 W1 規格對照（`docs/product/reviewer-model-redesign.md` 為正典來源，需 W1 確認何者才是目前唯一正確模型）
- **Severity**：High
- **Recommendation**：依 `reviewer-model-redesign.md` 統一審核互動模型；若「直接修正」為正典，應移除/重構 `markSampleRejected` 呼叫路徑與「退回」相關文案／快捷鍵說明，改為「approve/modify」二元決策並讓 `modify` 直接寫入修正後的答案。

---

### F-09｜審核歷程（歷程 tab）可能在正式提交前揭露其他審核員的草稿活動
- **Flow / Role**：R01/R02 各自獨立審核同一筆樣本
- **Steps / Evidence**：
  - `design/prototype/pages/annotation/annotation-workspace.data.js:269-296`（`getSampleHistory`）— 掃描該樣本「標記員自己的 bucket + 每一個審核過該標記員的審核員 bucket」的 `history[]`，合併後依時間排序回傳，**未依 `entryStatus`（pending/saved/submitted）做過濾**
  - `design/prototype/pages/annotation/annotation-workspace.data.js:233-250`（`markSampleSaved`）— 每次「儲存草稿」都會 `appendHistoryEvent(...,'saved',...)`，也就是草稿儲存動作本身就會被寫進 `history[]`，因此會被 `getSampleHistory` 一併撈出
  - `design/prototype/pages/annotation/annotation-workspace.config.js:1292-1301`（`renderHistoryPanel`）直接呼叫 `getSampleHistory` 並全部渲染到右欄「歷程」分頁，沒有針對 `role==='reviewer'` 目前檢視者做「僅顯示已提交（submitted）事件」的過濾
- **Observed**：若 R01 已對某筆樣本「儲存草稿」但尚未正式提交審核結果，R02 之後開啟同一筆樣本時，在「歷程」分頁有機會看到 R01 的 `saved`（草稿）事件記錄（是否含具體判斷內容，取決於呼叫端傳入的 `historySummary`，多數草稿儲存路徑目前只傳一般性摘要，但「已有動作」本身即可能造成盲審污染的觀感/實質風險）
- **Expected**：審核員驗收標準「提交前不可看到其他審核員尚未提交的判斷」
- **Impact**：若確實會揭露內容或僅揭露「已介入」的事實，都可能影響第二位審核員在盲審前建立自己獨立判斷的公正性
- **Classification**：疑似 mismatch，待 W1 規格對照（需與 spec 015 FR-016 / AC-3.8 對照，確認歷程 tab 的設計意圖是否本就排除他人未提交紀錄）
- **Severity**：Medium
- **Recommendation**：`getSampleHistory` 或 `renderHistoryPanel` 增加「僅回傳/顯示狀態為 submitted 的審核事件」過濾，草稿儲存事件不應對其他審核員可見。實作面調整，待 spec 對照後決定是否為 Bug。

---

### F-10｜同一任務在 Dashboard／task-list／task-detail 的「狀態」欄位互不對齊，且會依進入路徑不同而顯示不同狀態
- **Flow / Role**：PL01（及間接影響 A/R 對「同一任務目前處於哪個階段」的判斷）
- **Steps / Evidence**：
  - `design/prototype/pages/task-management/task-list.data.js:59-233` — T001-T013 全部 13 筆種子資料 `status` 欄位**清一色為 `'draft'`**（例：T003 `status: 'draft'`）
  - `design/prototype/pages/dashboard/dashboard.assignments.js:72-90`（T003 對應的 `annotator`/`reviewer` work item）— 標示 `progress: 18, runType: 'dry_run', status: 'in_progress'`，即 Dashboard 認為 T003 是「試標進行中，完成 18%」
  - `design/prototype/pages/task-management/task-detail.html:4342-4389`（`resetTaskData`）第 4362 行：`TASK_DATA.status = listEntry.status;` — 由使用者從 `task-list.html` 正常點擊進入 `task-detail.html` 時，狀態直接繼承自 `task-list.data.js` 的 `'draft'`，並非依 `dashboard.assignments.js` 的 `in_progress`/`resume`/`pending_review` 等真實進度重新推導
  - 同段註解（`:4385-4387`）也承認：「None of the unified profiles carry legacy trialRounds/run-control data」——即目前每個任務進入 `task-detail.html` 時使用的試標回合/IAA 歷程資料是**共用的通用示範資料**，不是該任務専屬的真實進度
- **Observed**：PL 在 Dashboard 看到「T003：Reviewer A · 8 位標記員 · 已完成 18%（試標）」，但點擊 `plViewAllBtn` 進入 `task-list.html` 後，T003 的狀態欄位顯示「草稿」；再點入 `task-detail.html?task_id=T003` 後，概覽面板依然顯示「草稿」且執行控制面板的回合歷程/IAA 為與任務無關的通用示範數字，而非與 Dashboard 呈現的 18% 對應
- **Expected**：已知風險「修正同一任務在總覽、進度、成果、工作紀錄與標記頁顯示不同狀態或筆數的問題」
- **Impact**：這是本輪走查中最直接命中「已知風險」清單第一項的具體案例：使用者依 Dashboard 建立的心智模型（哪些任務在跑、跑到哪）一進入 task-list/task-detail 就被推翻，嚴重影響狀態可判讀性與信任
- **Workaround**：`task-detail.html` 支援 `?status=` URL 參數手動覆寫狀態（`:4406`），但一般使用者不會、也不應該手動改網址
- **Classification**：UX finding（就 prototype 種子資料/串接邏輯而言可直接證實；是否為 spec 尚未要求 task-list 種子與 dashboard 進度 seed 同步，留待 W1 對照）
- **Severity**：High
- **Recommendation**：task-list.data.js 的 `status`／`runType` 應與 `dashboard.assignments.js` 的 per-task 進度來源同步（比照 `annotation-list.html` 已正確共用 `LabelSuiteAssignmentSeeds` 的做法），task-detail 的試標回合/IAA 歷程也應改為依 `taskId` 取用專屬示範資料而非通用樣板。實作面調整。

---

### F-11｜關鍵 modal 缺乏鍵盤焦點管理（無 focus trap／初始焦點／焦點歸還）
- **Flow / Role**：所有角色（PL 刪除任務確認、PL 資料隔離風險確認、A/R 強制指引 modal、指引圖片預覽 modal）鍵盤操作者與螢幕報讀器使用者
- **Steps / Evidence**：
  - 全檔搜尋確認：`design/prototype/pages/task-management/task-detail.html`、`design/prototype/pages/task-management/task-list.html`、`design/prototype/pages/annotation/annotation-workspace.config.js`、`design/prototype/pages/annotation/annotation-workspace.html` 皆**沒有任何一處呼叫 `.focus()`**（grep 結果為空）
  - 例：`task-list.html:467-476`（`#deleteTaskModal`）、`task-detail.html`（`#riskModal`，`openRiskModal`/`:8808-8813`）、`annotation-workspace.html:755-762`（`#wsGuidelineModal`）皆只切換 `display`/`class`，未見開啟時把焦點移入 modal 內部第一個可互動元素、關閉時把焦點交還觸發按鈕的邏輯
  - 僅 `annotation-workspace.config.js:2741` 對「指引圖片預覽 modal」實作了 `Escape` 關閉，但同樣沒有焦點管理
- **Observed**：以純鍵盤操作開啟這些 modal 時，Tab 鍵仍可能落在背景頁面元素上（無 `inert`/焦點鎖定跡象），且沒有觀察到開啟時自動把焦點移入 modal
- **Expected**：UX 評估項目「檢查鍵盤操作、焦點順序、modal 焦點管理…」；WCAG 2.1 AA 2.4.3（Focus Order）與對話框無障礙慣例
- **Impact**：螢幕報讀器與鍵盤操作使用者可能不會被明確導向到新出現的對話內容，或在對話框開啟後仍可操作背景內容，屬於跨角色、跨頁面的系統性無障礙缺口
- **Classification**：UX finding（無障礙）
- **Severity**：High
- **Recommendation**：為所有 `role="dialog"` modal 統一加上開啟時鎖定焦點於 modal 內、Tab 循環侷限在 modal 內、Esc 關閉、關閉後焦點歸還觸發元素的共用邏輯（可比照 `sidebar.js` 共用元件模式抽成共用函式）。實作面調整。

---

## 2. Issue 第 8 節「已發現的流程／UX 風險」逐項驗證結果

| # | 風險敘述 | 程式碼驗證結果 | 對應 Finding |
|---|---|---|---|
| 1 | 同一任務在總覽/進度/成果/工作紀錄/標記頁顯示不同狀態或筆數 | **屬實**：task-list 種子固定 `draft`，與 dashboard.assignments.js 的 per-task 進度不同步；task-detail 使用通用回合歷程樣板 | F-10 |
| 2 | 強制閱讀指引 modal 只要求確認、未呈現完整指引 | **屬實**：modal 僅有標題+按鈕，指引全文在另一分頁；且閘門為全域旗標非任務別 | F-01 |
| 3 | 任務指引、附件與實際任務類型須一致 | **屬實**：13 種任務共用同一組附件（含與任務無關的 VA 情緒量表示意圖），且 PDF 檔案不存在 | F-02 |
| 4 | 成員不足等發布條件未滿足時應阻擋並說明原因 | **屬實（缺口）**：`canPublish()` 只驗證設定值，不驗證實際成員人數 | F-06 |
| 5 | Dashboard 摘要數字須與任務卡片及明細加總一致 | **屬實**：「待 IAA 確認 5 個」與畫面上僅有的 3 張範例卡片（皆非該狀態）對不上帳 | F-03 |
| 6 | 審核者文案應與「獨立審核、直接修改、歧異仲裁」模型一致，避免「退回／通過」舊語意 | **屬實，且更嚴重**：不只是文案，實際互動邏輯（`markSampleRejected`）本身仍是舊模型，與同檔案的 `REVIEW_UNIT_STATUS` 新模型並存衝突 | F-08 |
| 7 | PL 看到等待 IAA 項目時應有可執行待辦入口 | **屬實**：`plPendingIaaValue`/`adminPendingIaaValue` 純文字、無點擊事件綁定 | F-03 |
| 8 | 標記員／審核員 Dashboard 應提供優先序/期限/排序/篩選 | **屬實**：`renderTaskList` 純陣列順序渲染，無排序/篩選控制 | F-04 |
| 9 | 長文字資料在清單中應提供可掃讀摘要或展開方式 | **屬實**：`.text-snippet` 明確停用截斷（`overflow: visible; text-overflow: clip`） | F-05 |
| 10 | 答案與敏感欄位防洩漏（私下審查） | **本輪未發現違規**：`fieldRoleMap` 對 `'output'` 欄位在 `annotation-workspace.config.js` 的標記員輸入渲染（約 :956-995,1150-1174）與審核員輸入渲染（`buildReviewerInputText`, :2328-2335,2543,2566）皆有明確過濾，未見 gold 欄位外洩路徑；審核歷程面板的「他人尚未提交活動可見」疑慮（F-09）與 ground-truth 洩漏無關，故不觸發 SECURITY ESCALATION | 無 Blocking 安全發現 |

---

## 3. 補充觀察（Context，非獨立 Finding）

- `design/prototype/pages/account/login.html:687-736` — 任何帳密輸入皆會登入成功並導向同一個 `dashboard.html`；角色切換是透過 Dashboard 頁面上的「場景模式」按鈕（`user/super_admin_data/project_leader/annotator/reviewer`）手動切換，而非依登入帳號自動導向對應角色視圖（`dashboard.js:338-375` `bindScenarioEvents`）。這與 issue 12.8 節已記載的已知限制一致（prototype 以 query params/localStorage 模擬多身分），非新發現，但提醒 W3 Playwright 規劃時：無法僅靠登入動作驗證「角色專屬入口」，需明確在測試腳本中切換 scenario 或帶入對應 `role=`/`task_role=` query 參數。
- `design/prototype/pages/task-management/task-detail.panels/member-management.html:94-124`（審核指派區塊含「分派給仲裁者」按鈕與 `disputePoolText`）是正向設計：PL 有明確的爭議池／指派仲裁者入口，此點與 issue 對「仲裁者可完成仲裁並產生最終結果」的驗收標準方向一致，未發現缺口。
- `design/prototype/pages/annotation/annotation-list.html:746`（`window.LabelSuiteAssignmentSeeds`）— annotation-list 與 Dashboard 共用同一組 assignment seed，兩者數字有對齊，未發現不一致；此為對照 F-10（task-list/task-detail 未同步）的正面對照組，建議實作時比照此模式修正 F-10。

---

## 4. 狀態與未解決事項

**狀態：DONE_WITH_CONCERNS**

未解決事項（需其他工作流或使用者 checkpoint 處理，非本工作流可獨立解決）：
1. F-08（審核模型衝突）與 F-06（發布成員檢查缺口）是否為 spec 已規範但未實作、抑或 prototype 與 spec 皆缺，需 W1（senior-ba/senior-architect 規格盤點工作流）交叉比對 `docs/product/reviewer-model-redesign.md`、`specs/annotation/015-annotation-workspace/spec.md`、`docs/adr/022-task-state-machine-location.md` 後才能定案分類與最終 issue 類型。
2. F-09（審核歷程是否洩漏他人未提交草稿活動）需 W1 對照 spec 015 FR-016/AC-3.8 的原始設計意圖，確認是否為刻意設計。
3. 本報告所有 Finding 尚未執行 issue 第 11 節的「建單前處理」（唯一 Finding ID 已於本文件內以 F-01~F-11 標示，尚待與既有 open/closed issues 比對去重、再由 team-lead／main session 依 Finding→Issue 類型對應表逐一建立 GitHub issue）。
4. 未涉及任何 Critical/High 等級的 ground-truth 或敏感欄位洩漏疑慮，因此本輪無需觸發 SECURITY ESCALATION REQUIRED。
