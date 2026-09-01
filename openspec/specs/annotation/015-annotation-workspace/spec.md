# annotation/015-annotation-workspace Specification

## Purpose
Annotation List + Workspace（標記清單與標記作業，Annotator／Reviewer）的 derived view。正典為 `specs/annotation/015-annotation-workspace/spec.md`（v4.58.0）；本文件僅收錄經 OpenSpec change 落地之需求，每條皆引用正典 FR/AC ID，不改動其正典措辭。目前收錄：change `reviewer-action-hint`（issue #526）之 FR-084、AC-4.47 ~ AC-4.50，以及 FR-064 第 7 點第 6 項之範圍註記。

## Requirements

### Requirement: FR-084 角色相依行動提示

本需求對應正典 FR-084（對應 AC-4.47 ~ AC-4.50，issue #526）。workspace reviewer 視圖 MUST 於 FR-064 審核單位脈絡橫幅（`ws-review-unit-context`）之後、審核卡（FR-053）／仲裁版面（FR-061）／唯讀已定稿卡／空狀態卡之前，渲染至多一個行動提示（testid `ws-review-action-hint`，class `.rv-action-hint`），其內容依「該單位 `REVIEW_UNIT_STATUS` × 目前 Reviewer 是否已提交本單位審核 × `isArbiterCandidate()`」推導：

1. `pending`：不渲染提示（操作控件就在下方，不重複說明）。
2. `approved`／`modified` × 尚未提交：`需要你的審核`／`Your review is needed`，帶 `data-needs-action="true"`。
3. `approved`／`modified` × 已提交：`你的審核已記錄，等待另外 {remaining} 位審核員`／`Your review is recorded; waiting for {remaining} more reviewer(s)`。`remaining = minReviewers - readReviewerSubmissions(...).length`，且「是否已提交」與 `remaining` MUST 取自與定稿門檻 chip（FR-064 第（2）項）**同一次** `readReviewerSubmissions()` 讀取與同一個 `minReviewers` 值，不得另行維護第二份計算。
4. `disputed` × `isArbiterCandidate() = true`：`需要你的仲裁`／`Your arbitration is needed`，帶 `data-needs-action="true"`。
5. `disputed` × 已提交本單位（已參與）、不可仲裁：`你已參與此單位，等待其他具資格審核員處理`／`You have reviewed this unit; waiting for an eligible reviewer to resolve it`。
6. `disputed` × 未參與且無仲裁資格：`等待具仲裁資格的審核員處理`／`Waiting for a reviewer with arbitration rights`。
7. `finalized`：`已定稿，此單位為唯讀`／`Finalized; this unit is read-only`。
8. `getReviewUnitStatus` 為 `null`（標記員尚未提交）：`等待標記員提交`／`Waiting for the annotator to submit`。

呈現與無障礙約束：（a）只有第 2、4 點帶 `data-needs-action="true"`，其餘分支不得帶該屬性，且任何分支皆不得額外渲染重複的 `需要行動` pill；（b）`需要你的審核`／`需要你的仲裁` 文字本身完整表意，不只依賴顏色；（c）等待／唯讀說明使用一般文字層級，不得渲染為 `<button>`／`<a>` 或帶 CTA 樣式，`finalized` 與 `null` 亦不使用「下一步」標籤；（d）提示 MUST 為橫幅的下一個兄弟元素而非橫幅子元素，使 DOM 閱讀順序為 run type → 狀態 → 門檻 → 提示，橫幅子元素序列（AC-4.37）逐字不變，且 RWD 不得以 CSS `order` 改變語意順序；（e）`disputed` 之提示不得重複票數、未收斂原因或仲裁卡既有內容。

`run_type` 約束：兩種 `run_type` MUST 使用完全相同的推導與文案矩陣；提示不得描述任何退回或送出後果（送出後果由 FR-070 第 6 點之 `ws-review-note` Tooltip 承載）；`dry_run` 之提示不得出現 `回到待標記` 或 `重標待辦`。本條不改變 FR-051 狀態機、FR-053／FR-061 版面、FR-064 橫幅與抽屜契約，亦不改變任何審核資料模型、提交、收斂、爭議、仲裁與定稿邏輯。

#### Scenario: AC-4.47 approved／modified 依目前 Reviewer 是否已提交分流
- **GIVEN** `min_reviewers = 3` 之 T016 `ofm-02-approved-interim`（僅 `reviewer_wang` 已提交，狀態 `approved`）與 `min_reviewers = 2` 之 T017 `oft-03-modified-interim`（僅 `reviewer_wang` 已提交，狀態 `modified`）
- **WHEN** 分別以 `reviewer_id=reviewer_chen`（尚未提交）與 `reviewer_id=reviewer_wang`（已提交）開啟
- **THEN** 前者之 `ws-review-action-hint` 文字恰為 `需要你的審核` 且帶 `data-needs-action="true"`；後者文字恰為 `你的審核已記錄，等待另外 2 位審核員`（T016）／`你的審核已記錄，等待另外 1 位審核員`（T017）且不帶 `data-needs-action`
- **AND** 已提交者所見之 `{remaining}` 必須等於同一橫幅定稿門檻 chip `定稿門檻 {x} / {n} 位審核員` 之 `n - x`
- **AND** 切換語言後分別為 `Your review is needed` 與 `Your review is recorded; waiting for 2 more reviewer(s)`

#### Scenario: AC-4.48 disputed 區分可仲裁、已參與不可仲裁、無仲裁資格
- **GIVEN** T017 `oft-01-even-tie`（`reviewer_wang`／`reviewer_li` 已提交，狀態 `disputed`）與 T016 `ofm-05-all-divergent`（`reviewer_wang`／`reviewer_li`／`reviewer_lin` 已提交，狀態 `disputed`）
- **WHEN** 分別以 `reviewer_chen`（`can_arbitrate`、未參與）、`reviewer_wang`（已參與、不可仲裁）、`reviewer_lin`（T017 未參與、不可仲裁）開啟
- **THEN** `reviewer_chen` 之提示恰為 `需要你的仲裁` 且帶 `data-needs-action="true"`；`reviewer_wang` 之提示恰為 `你已參與此單位，等待其他具資格審核員處理`；`reviewer_lin` 之提示恰為 `等待具仲裁資格的審核員處理`；後兩者皆不帶 `data-needs-action`
- **AND** 提示文字不得含票數、`data-reason` 之未收斂原因或仲裁卡既有文案

#### Scenario: AC-4.49 pending 無提示；finalized／null 為無 CTA 之狀態說明；需要行動只在兩分支
- **GIVEN** T015 `ofs-04-pending-review`（`pending`）、T016 `ofm-01-unanimous-gold`（`finalized`）、T015 `ofs-05-not-submitted` 與 T017 `oft-05-pending-review`（後者經 seed 退回而回到標記員 `pending`，reviewer 側 `getReviewUnitStatus` 為 `null`）
- **WHEN** 以 `reviewer_chen` 開啟
- **THEN** `pending` 單位之 `ws-review-action-hint` 為 0 個；`finalized` 單位之提示恰為 `已定稿，此單位為唯讀`；`null` 單位之提示恰為 `等待標記員提交`
- **AND** 兩者皆不帶 `data-needs-action`、不是 `<button>`／`<a>`、不含 `下一步`
- **AND** 於 AC-4.47／AC-4.48 全部單位中，帶 `data-needs-action="true"` 之元素恰為文字 `需要你的審核` 或 `需要你的仲裁` 者，且頁面不得出現文字為 `需要行動` 之 pill

#### Scenario: AC-4.50 DOM 順序、375px、run_type 一致與反向文案守衛
- **GIVEN** 任一渲染提示之審核單位（如 T016 `ofm-02-approved-interim` 以 `reviewer_chen` 開啟）
- **WHEN** 於 375px 視窗寬度下渲染
- **THEN** `ws-review-action-hint` 必須是 `ws-review-unit-context` 之下一個兄弟元素，橫幅子元素序列維持 AC-4.37（`.rv-unit-run`、`.rv-unit-state`、`.rv-unit-threshold`、…），提示之 `getBoundingClientRect().top` 不小於橫幅之 `bottom`，且 `documentElement.scrollWidth <= clientWidth`
- **AND** `run_type=dry_run` 之 T014 `dry-05-pending-review`（標記員 `kioleemg12`，`reviewer_wang` 純退回後 `disputed`）以 `reviewer_chen` 開啟時提示為 `需要你的仲裁`、以 `reviewer_wang` 開啟時為 `你已參與此單位，等待其他具資格審核員處理`——與 `official_run` 同一矩陣
- **AND** `dry_run` 之提示文字不得含 `回到待標記` 或 `重標待辦`

### Requirement: FR-064 審核單位脈絡橫幅——第 7 點第 6 項範圍註記

本需求對應正典 FR-064 第 7 點第 6 項（v4.57.0 修訂）。原文將「角色相依提示（issue #526）」與 `ws-review-note` 文案並列為不屬第 7 點之範圍；本版於該項補註：角色相依提示已由 FR-084 落地為橫幅之**下一個兄弟元素**（`ws-review-action-hint`），仍不屬第 7 點之橫幅組成契約，AC-4.37 之橫幅子元素序列逐字不變。FR-064 其餘文字、第 1–8 點之全部契約、AC-4.27／AC-4.32／AC-4.35 ~ AC-4.42 皆不變。

#### Scenario: AC-4.37 橫幅子元素序列不因提示改變
- **GIVEN** T016 `ofm-02-approved-interim` 以 `reviewer_chen` 開啟
- **WHEN** 脈絡橫幅與行動提示皆渲染
- **THEN** 橫幅子元素仍依序恰為 `.rv-unit-chip.rv-unit-run`、`.rv-unit-state`、`.rv-unit-chip.rv-unit-threshold`、`.rv-flow-trigger`、`.rv-review-note`，`.rv-action-hint` 不在橫幅之內

正典：`specs/annotation/015-annotation-workspace/spec.md`（v4.55.0 → 4.58.0）。本變更（issue #552）修訂 FR-016A、FR-014I、FR-070 第 6 點、FR-083、AC-3.40、AC-3.47，新增 FR-085、AC-2.14、AC-3.48。

### Requirement: FR-016B 標記歷程呈現

標記歷程 MUST 於右欄 `歷程` 頁籤呈現，annotator 與 reviewer 視角皆可查看；同一樣本的 annotator 與 reviewer 事件合併為單一時序清單，最新事件在前；尚無紀錄時顯示空狀態文案。合併清單納入 reviewer 事件時受 FR-062 盲審隔離約束——僅納入已提交之審核事件與檢視者本人的草稿事件（v4.9.0 既有規則，不變）。

每筆事件 MUST 包含操作者角色與 `actor_id`（FR-050）、時間、`action`（取值範圍見 FR-086）與對應輸出類型作答摘要；自 v4.61.0 起，事件另 MUST 承載 `result_snapshot`（FR-087）、`started_at` 與 `lead_time`（FR-088）、`reason`（FR-089），其呈現受 FR-090 分層遮蔽約束。事件維持 append-only：既有事件不得被覆寫或刪除。

v4.61.0 以前寫入、不具上述新欄位之事件 MUST 原樣顯示且不得因此報錯——缺哪一個欄位就不渲染對應區塊，系統 MUST NOT 為舊事件補寫推估的快照、耗時或理由（沿用 FR-050 對缺 `actor_id` 舊事件的既有處置原則）。

**v4.62.0 新增（issue #600，顯示層與 action 常數脫鉤）**：事件卡片之 `action` 徽章可見文字 MUST 經由單一資料來源之顯示標籤對照表（`ACTION_LABEL`，見 FR-086）轉換為繁體中文，MUST NOT 直接以 `action` 常數值作為畫面文案。徽章元素之 `data-action` 屬性 MUST 維持為該事件之原始英文 `action` 值，供測試與稽核取得，不受本段顯示轉換影響。

#### Scenario: 歷程合併呈現且受盲審隔離
- **GIVEN** 某樣本已有標記員提交事件與一位審核員之已提交審核事件，另一位審核員尚有未提交之草稿事件
- **WHEN** 檢視右欄 `歷程` 頁籤
- **THEN** 清單以最新事件在前合併呈現標記員與已提交之審核事件，另一位審核員之未提交草稿事件不出現

#### Scenario: AC-2.15 歷程卡片呈現擴充欄位
- **GIVEN** 標記員於 `run_type=official_run` 對某樣本提交，且該事件具備新欄位
- **WHEN** 切換至右欄 `歷程` 頁籤
- **THEN** 該筆事件卡片顯示操作者（角色 + `actor_id`）、時間、`action` 徽章（`data-action` 屬性為原始英文 `action` 值，可見文字為對應繁體中文標籤）與作答摘要；並依 FR-090 可見性顯示 `result_snapshot` 差異區塊與 `reason`
- **AND** 同一清單中一筆 v4.61.0 以前寫入的舊事件僅顯示既有五欄位，不渲染差異區塊、耗時或理由，且不擲出錯誤

### Requirement: FR-016A 審計理由擴及所有退回

Reviewer 在 `dry_run` 與 `official_run` 執行修正／刪除**或判定退回（`decision = reject`）**時，系統 MUST 強制填寫審計理由並記錄。審核卡上該 outKey 按下「退回」後，MUST 於同一列作答面板下方展開必填理由欄 `ws-review-reject-reason`（帶 `data-outkey`）；「通過」或取消決策時 MUST 隱藏。理由 MUST 沿用既有審核提交持久化路徑（reviewer submission payload 之 `reasons` map），並隨 FR-014S 決策草稿持久化。`ReviewDecision.reason` 於 `decision = reject` 時 MUST 為必填。兩種 `run_type` 皆強制（FR-053 審核卡不得分流）。

#### Scenario: AC-3.48 退回展開必填理由欄並持久化
- **GIVEN** `role=reviewer` 進入可互動審核單位（任一 `run_type`）
- **WHEN** 對某 outKey 點擊「退回」
- **THEN** 該列出現 `ws-review-reject-reason[data-outkey=<outKey>]`；點「通過」或再次點「退回」取消後該欄隱藏；填入理由並 reload 後理由與決策一併還原；填入理由並送出後，reviewer submission `answers.reasons[<outKey>]` 等於所填理由

### Requirement: FR-014I 退回回退狀態並攜帶理由

`official_run` 下「目前標記員」列任一 outKey 於送出審核時被判定為 `退回`，系統 MUST 將樣本狀態回退為 `待標記` 並新增 `{action:'rejected', role:'reviewer'}` 歷程事件（既有機制不變）；該事件摘要 MUST 含逐 outKey 退回理由。退回理由的標記員側呈現依 FR-085。

#### Scenario: 退回歷程事件含理由
- **GIVEN** `run_type=official_run` reviewer 對 `single_label` 退回並填理由「情緒判讀有誤」後送出
- **WHEN** 讀取該樣本歷程
- **THEN** 最新事件 `action` 為 `rejected` 且 `summary` 含「情緒判讀有誤」

### Requirement: FR-070 第 6 點 `official_run` 文案說明理由可見性

`ws-review-note` 泡泡之 `official_run` 分支 MUST 於「全部通過則標記員狀態不變」之後陳述「退回理由會顯示給標記員」；`dry_run` 分支 MUST NOT 出現此句。zh／en 同步（FR-070 第 4 點）。AC-3.40 同步修訂。

#### Scenario: AC-3.40 official_run 文案含理由可見性
- **GIVEN** `role=reviewer`、`run_type=official_run`
- **WHEN** 檢視 `ws-review-note-bubble`
- **THEN** 文字含「退回理由會顯示給標記員」；切換 `run_type=dry_run` 後不含

### Requirement: FR-083 送出阻擋同時指名缺理由之退回

送出驗證 MUST 為「每個 outKey 一筆決策，且退回者皆有非空理由」。阻擋 toast MUST 指名全部阻擋之 outKey（多筆以「、」串接）：存在尚未決策者時沿用 `toastSelectDecision`；全部阻擋皆為缺理由時使用 `toastRejectReasonRequired`。兩類 outKey 之推導 MUST 與送出驗證共用同一份逐 outKey 判定，不得另建第二份計算。存在缺理由之退回時「送出審核」按鈕 MUST 帶 `data-submit-blocked="reason"` 以呈現停用外觀，且 MUST NOT 使用 `disabled` 或 `aria-disabled`（兩者皆會攔下點擊，使 toast 無法指名 outKey）。

#### Scenario: AC-3.47 缺理由阻擋送出並指名 outKey
- **GIVEN** `role=reviewer` 對 `single_label` 點「退回」但未填理由
- **WHEN** 點擊「送出審核」
- **THEN** 送出中止，toast 顯示「請填寫以下輸出類型的退回理由：single_label」，且 `ws-review-submit-btn` 帶 `data-submit-blocked="reason"`；填入理由後該屬性移除，再送出成功

### Requirement: FR-085 標記員重標理由橫幅

`run_type=official_run` 之 annotator 開啟帶有重標待辦的樣本（樣本狀態為 `pending` 且最新歷程事件為 `rejected`）時，工作區 MUST 於 `#annotationPreview` 頂部渲染 `ws-rework-reasons` 橫幅，逐被退回 outKey 一列 `ws-rework-reason-row`（帶 `data-outkey`）列出理由、審核員帳號與時間（`formatHistoryTime()` 格式），並於被退回 outKey 之作答面板 `ws-output-panel-{outKey}` 加 `data-rework-rejected="true"`。理由來源 MUST 為 reviewer submission 之 `decisions`／`reasons`（`getReworkReasons()`），不得另存第二份。`dry_run` MUST NOT 渲染本橫幅；無重標待辦之樣本亦不渲染。歷程面板（FR-016B）不變。

#### Scenario: AC-2.14 official_run 重標待辦顯示退回理由
- **GIVEN** `official_run` reviewer 對 `single_label` 退回並填理由「情緒判讀有誤」後送出
- **WHEN** 該標記員開啟同一樣本
- **THEN** `ws-rework-reasons` 恰一個，含 `ws-rework-reason-row[data-outkey=single_label]` 且文字含「情緒判讀有誤」與審核員帳號；`ws-output-panel-{outKey}`（此例為 `single_label`）帶 `data-rework-rejected="true"`

#### Scenario: dry_run 不渲染橫幅
- **GIVEN** `dry_run` reviewer 退回並填理由後送出
- **WHEN** 該標記員開啟同一樣本
- **THEN** `ws-rework-reasons` 計數為 0

### Requirement: FR-086 歷程動作常數化

歷程事件之 `action` MUST 取自常數集合 `HISTORY_ACTIONS = draft_saved | submitted | skipped | modified | accepted | rejected | adjudicated`，MUST NOT 為自由字串。每個值 MUST 對應唯一的徽章語意色，且該對應 MUST 為單一資料來源驅動，不得於渲染端逐值硬編分支。

各值語意：`draft_saved`（標記員或審核員儲存草稿）、`submitted`（標記員提交）、`skipped`（標記員跳過）、`modified`（審核員直接修正答案）、`accepted`（審核員通過）、`rejected`（審核員退回）、`adjudicated`（仲裁者定案）。

`HISTORY_ACTIONS` 之每個值 MUST 有對應的產生點：v4.61.0 以前的實作只發出 `submitted`、`draft_saved`（舊值 `saved`）與 `rejected` 三種，其餘四種皆無產生點，v4.61.0 逐一補齊——審核員送出「通過」MUST 寫入 `accepted` 事件，送出「修正」MUST 寫入 `modified` 事件，其通過／修正之判定沿用既有的逐 outKey 機制（逐筆通過／退回按鈕之 active/inactive 語意見 FR-014B，「每個 outKey 皆須有決策」之送出驗證見 FR-044，「該 outKey 之答案是否被更動」之比對見 FR-052），本條不改變該判定邏輯，僅要求該決策落為一筆歷程事件；`skipped` 與 `adjudicated` 之產生點見 FR-089。

既有事件中出現於 `HISTORY_ACTIONS` 之外的動作值 MUST 以中性徽章呈現且不得中斷渲染。

本條一併修訂關鍵實體 `AnnotationHistoryItem`（正典「關鍵實體」章節）：其 `action` 可能值 MUST 改列 `HISTORY_ACTIONS` 七值並改引本條，MUST NOT 續引 FR-043——FR-030 ~ FR-043 已於 v4.0.0 隨審核單位收斂整體廢止（見正典使用者故事 3 之 v4.0.0 適用範圍收斂），實體卻仍指向該已廢止條文。原清單中的 `approved` 於本版正名為 `accepted`：v4.61.0 以前的實作從未產生 `approved` 事件（產生點僅 `submitted`／`saved`／`rejected`），故此為文件層的更名而非行為變更；`overridden`／`gold_confirmed`／`gold_reopened` 隨 FR-030 ~ FR-043 之廢止一併自實體移除。實體欄位另 MUST 新增 `result_snapshot`（FR-087）、`started_at` 與 `lead_time`（FR-088）、`reason`（FR-089），四者對 v4.61.0 以前寫入之事件皆為選填（沿用 `actor_id` 對舊事件的既有容忍原則，FR-050）。

**v4.62.0 新增（issue #600，顯示層與 action 常數脫鉤）**：本條之 `HISTORY_ACTIONS` 常數值 MUST 保持不變，僅作為資料契約與事件產生依據，MUST NOT 直接作為畫面顯示文案。畫面呈現（工作區歷程徽章、`annotation-list` 最後動作欄，見 FR-016B、FR-091）MUST 另外經由單一資料來源之顯示標籤對照表 `ACTION_LABEL`（與本條之徽章語意色對照表同置一處）轉換為繁體中文文案：`draft_saved` → 已存草稿、`submitted` → 已提交、`skipped` → 已跳過、`modified` → 審核修正、`accepted` → 審核通過、`rejected` → 審核退回、`adjudicated` → 仲裁定案。`HISTORY_ACTIONS` 集合外之舊值（例如 `consensus`）MUST 原樣以英文原值呈現，MUST NOT 為其臆測中文譯名，此處理方式與既有「集合外值以中性徽章呈現」原則一致。承載 `action` 之畫面元素 MUST 保留 `data-action` 屬性為原始英文 `action` 值，不受本段顯示轉換影響——工作區歷程徽章為本版新增此屬性，`annotation-list` 最後動作欄之 `data-action` 屬性為既有契約，維持不變。本條新增之 `ACTION_LABEL` 對照表 MUST NOT 視為 `AnnotationHistoryItem` 實體之儲存欄位，純為渲染時依 `action` 值查表得出的呈現轉換，不寫入儲存資料。

#### Scenario: AC-2.16 七種動作各有對應徽章
- **GIVEN** 某樣本歷程依序包含 `HISTORY_ACTIONS` 全部七種動作各一筆
- **WHEN** 檢視 `歷程` 頁籤
- **THEN** 七筆事件各自呈現一個徽章，其 `data-action` 屬性依序為七個 `HISTORY_ACTIONS` 值、可見文字為對應繁體中文標籤，且七個徽章的語意色兩兩不同
- **AND** 一筆 `action` 為集合外舊值之事件以中性徽章呈現、可見文字原樣呈現該英文原值，清單其餘事件正常渲染

#### Scenario: AC-2.21 審核通過與修正皆產生歷程事件
- **GIVEN** 審核員對某樣本一個 `outKey` 送出「通過」、對另一個 `outKey` 送出「修正」
- **WHEN** 檢視該樣本 `歷程` 頁籤
- **THEN** 清單分別出現一筆 `accepted` 事件與一筆 `modified` 事件，兩者之 `actor_id` 皆為該審核員
- **AND** 該次送出未因此產生重複事件（沿用 FR-016B append-only 與既有重複送出防護）

### Requirement: FR-087 結果快照與差異呈現

每筆會改變答案內容的事件（`submitted`、`modified`、`adjudicated`）MUST 保存當下的 `result_snapshot`——該樣本完整的 `outputs[]` 作答結果，且 MUST 排除原始文本與資料集欄位（快照的用途是回答「答案改了什麼」，不是複製受標記資料）。

歷程面板呈現的差異 MUST 由同一操作者維度下相鄰兩筆事件的 `result_snapshot` 於呈現時計算，系統 MUST NOT 另存一份差異結果。差異呈現方式 MUST 由 `OUTPUT_TYPE_REGISTRY` 之輸出類型驅動，不得逐 task 硬編：純值類型（`single_label`、`multi_label`、`single_dim`、`multi_dim`、`free_text`）比對值本身；具位置資訊之類型（`entity_recognition`、`relation_identification`、`sequence_tagging`）MUST 逐實體列出新增、刪除與邊界變更三類差異，僅實體數量相同而邊界不同時亦 MUST 被列出。

**已知落差**：`relation_identification` 雖屬本條所稱「具位置資訊之類型」，但其作答結構於原型階段不攜帶可對齊的 span 起訖，逐實體差異目前僅 `entity_recognition` 與 `sequence_tagging` 兩型別有實作；`relation_identification` 暫以純值比對遞補，位置維度待答案結構補上起訖後統一，追蹤於 issue #590（處置方式沿用 FR-052 之「已知落差」先例）。

同一操作者維度下無前一筆事件時（首次提交），該事件 MUST 呈現為全新內容而非差異。

#### Scenario: AC-2.17 純值類型呈現前後值差異
- **GIVEN** 標記員先提交 `single_label = neutral`，其後審核員修正為 `positive`
- **WHEN** 檢視 `歷程` 頁籤之 `modified` 事件
- **THEN** 該事件顯示 `single_label` 由 `neutral` 變更為 `positive`
- **AND** 標記員該筆首次 `submitted` 事件呈現為全新內容，不顯示差異箭頭

#### Scenario: AC-2.18 位置型類型逐實體列出差異
- **GIVEN** 某樣本 `entity_recognition` 之前一筆快照有 3 個實體，後一筆有 4 個實體且其中一個實體的 span 邊界由 `[0,4]` 改為 `[0,6]`
- **WHEN** 檢視後一筆事件之差異區塊
- **THEN** 差異逐實體列出，包含 1 筆新增與 1 筆邊界變更（列出變更前後 span）
- **AND** 另一組實體數量相同但有一個 span 邊界不同的前後快照，其差異區塊 MUST NOT 為空

### Requirement: FR-088 標記耗時記錄與可見性

每筆事件 MUST 承載 `started_at`（該次作業起算時間）與 `lead_time`（該次作業耗時）。`lead_time` 之口徑 MUST 為頁面可見時間累計：分頁切離背景或視窗失焦時 MUST 暫停計時，回到前景時 MUST 續計，不得以「事件時間相減」的掛鐘時間充當耗時。

可見性：`lead_time` MUST NOT 於 annotator 視角之任何呈現路徑出現（避免標記員因看見秒數而改變作答行為，污染以耗時分析標記難度的研究資料）；reviewer 視角與任務層級統計（`task-detail` 之 `annotation-results` 分頁「標記結果表」）MUST 可見。本條僅規定該處「可見」，MUST NOT 改動 014 既有的 `work-log` 匯總（`總工時`／`每筆平均耗時`，見 014 FR-007b）——該匯總源自 `WorkLogEntry` 之工時紀錄，與本版歷程事件之 `lead_time` 為兩套並存資料，其整併不在本次範圍。

#### Scenario: AC-2.19 耗時以頁面可見時間累計
- **GIVEN** 標記員開啟某樣本後將分頁切至背景一段時間，再切回並提交
- **WHEN** 讀取該提交事件之 `lead_time`
- **THEN** `lead_time` 不包含分頁位於背景的期間
- **AND** `lead_time` 小於 `at` 與 `started_at` 之差

#### Scenario: AC-3.49 耗時僅對 reviewer 呈現
- **GIVEN** 同一筆具 `lead_time` 之標記事件
- **WHEN** 分別以 `role=annotator` 與 `role=reviewer` 檢視該樣本 `歷程` 頁籤
- **THEN** annotator 視角之歷程卡片不含任何耗時呈現
- **AND** reviewer 視角之同一筆事件顯示耗時

### Requirement: FR-089 動作理由必填

下列四個動作於送出時 MUST 強制填寫理由，缺理由時 MUST 阻擋送出並指名缺理由的項目：審核退回（`rejected`）、審核修改（`modified`）、爭議仲裁（`adjudicated`）、標記員跳過（`skipped`）。理由 MUST 寫入該筆歷程事件之 `reason`。

審核側（`rejected`、`modified`）之理由 MUST 寫入 FR-016A 既有的持久化路徑（reviewer submission `decisions` map 旁的 `reasons` map），MUST NOT 另存第二份。惟 FR-016A 之 `reasons` map 現況僅收錄**退回者**，`modified` 之理由屬本版對該既有結構的**擴充**而非既有行為之沿用：`ReviewDecision.reason` 之必填條件自 `decision = reject` 擴及修正動作；FR-083 之送出阻擋與 FR-085 之標記員側呈現維持既有行為。

**新增能力**（標記員互動）：標記員「跳過」為本版**新增**的動作——v4.61.0 以前正典與原型皆無此動作、亦無 `skipped` 事件之產生點，故本條並非既有單鍵行為的變更，而是一個自始即以「理由必填」為契約的新動作；未填理由時該樣本 MUST NOT 產生 `skipped` 事件。

跳過動作本身之定義（本條一併新增，避免 AC-2.20 指涉未定義之控件）：跳過入口 MUST 僅對標記員視角呈現，審核員視角 MUST NOT 呈現；其可用條件與 FR-013A 之樣本三態一致——`pending` 與 `saved` 之樣本可跳過，已 `submitted` 之樣本 MUST NOT 可跳過。跳過 MUST NOT 改變樣本狀態：`skipped` 不是第四種樣本狀態，樣本停留於原本的 `pending` 或 `saved`，跳過僅產生一筆 `skipped` 歷程事件；此為刻意設計，使「這個樣本我暫時跳過」與「這個樣本的作答進度」維持兩件互不覆寫的事實。跳過送出後之導覽 MUST 重用 FR-022A（提交後載入下一筆）與 FR-022C（全數完成後導回清單）所定義之同一套下一筆規則，MUST NOT 另立一套跳過專用導覽——此為本條之新規定，FR-022A／FR-022C 本身係為「提交後」而寫，本版並未主張其原文已涵蓋跳過。

同理，`adjudicated` 事件於本版以前亦無產生點——爭議仲裁送出僅寫入仲裁票與定案值。本條 MUST 使該次定案送出一併寫入一筆 `adjudicated` 歷程事件，且該事件自始即 MUST 承載所填 `reason`。

#### Scenario: AC-2.20 跳過必須填寫理由
- **GIVEN** 標記員於某樣本點擊「跳過」
- **WHEN** 未填寫理由即嘗試送出
- **THEN** 送出被阻擋且提示需填寫理由，該樣本未產生 `skipped` 歷程事件
- **AND** 填寫理由後送出，`skipped` 事件之 `reason` 等於所填理由

#### Scenario: AC-3.50 仲裁定案必須填寫理由
- **GIVEN** 具 `can_arbitrate` 之審核員對爭議單位進行仲裁
- **WHEN** 未填寫理由即送出定案
- **THEN** 送出被阻擋且指名缺理由之項目
- **AND** 填寫理由後定案，`adjudicated` 事件之 `reason` 等於所填理由

### Requirement: FR-090 歷程分層遮蔽

歷程事件之呈現 MUST 分兩層：事件列（操作者角色與 `actor_id`、時間、`action`）對所有可檢視該樣本者可見；`result_snapshot` 與 `reason` MUST 依檢視者角色遮蔽——

1. `role=annotator`：可見自己 `actor_id` 之事件的快照與理由；其他標記員之事件 MUST NOT 進入該檢視者的歷程輸出——**含事件列**。理由是事件列依 FR-016B 承載「對應輸出類型作答摘要」，該摘要即答案內容，僅遮蔽 `result_snapshot` 與 `reason` 仍會經摘要外洩，與 FR-062 相衝突。此處之「標記員不得經任何路徑讀取他人作答內容」為本條**新確立**之規則，正典 v4.60.0 以前並無同名的跨標記員隔離條文可資沿用；其依據為憲章 NON-NEGOTIABLE 之 Data Fairness，以及歷程供給層既有以 `identity.annotatorId` 分 bucket 取事件的實作事實（`getSampleHistory()`）。
2. `role=reviewer`：可見自身審核單位範圍內（同一 `sample_id × annotator_id × run_type`）全部事件之快照與理由。
3. 具 `can_arbitrate` 之審核員於爭議單位：可見該樣本全部標記員之快照與理由。

遮蔽 MUST 於資料供給層完成，MUST NOT 僅以樣式隱藏——被遮蔽的內容不得存在於該檢視者可取得的呈現輸出中。本條與 FR-062 盲審隔離為疊加關係：一筆事件必須同時通過 FR-062（未提交之審核判斷僅本人可見）與本條，方得呈現其快照與理由。

#### Scenario: AC-4.51 標記員不得經歷程取得他人答案
- **GIVEN** `run_type=dry_run` 之某樣本已有標記員 A 與標記員 B 各自提交
- **WHEN** 標記員 A 檢視該樣本 `歷程` 頁籤
- **THEN** 標記員 B 之事件完全不出現於 A 可取得的任何呈現輸出中——事件列、`result_snapshot` 與 `reason` 皆然
- **AND** reviewer 於 A 與 B 各自的審核單位檢視同一樣本時，兩人之快照與理由皆可見
- **AND** 一筆其他審核員尚未提交之審核草稿事件，即使檢視者為具 `can_arbitrate` 之審核員，仍依 FR-062 完全不納入清單

### Requirement: FR-091 標記清單處理狀況彙總

`annotation-list` 每筆樣本 MUST 呈現「最後動作」「最後活動時間」「累計耗時」三項彙總，使檢視者不需逐筆開啟工作區即可掌握處理狀況。三項 MUST 由該樣本之歷程事件推導（最後動作與最後活動時間取最新一筆事件；累計耗時為該樣本全部事件 `lead_time` 之和），MUST NOT 另存第二份彙總資料。

彙總之可見性沿用 FR-088 與 FR-090：「累計耗時」MUST NOT 於 annotator 視角呈現；「最後動作」與「最後活動時間」屬事件列層級，對所有可檢視者可見。無任何歷程事件之樣本，三項皆呈現空狀態而非零值。

**v4.62.0 新增（issue #600，顯示層與 action 常數脫鉤）**：「最後動作」欄位之可見文字 MUST 比照 FR-086 顯示層規定改為繁體中文標籤，MUST NOT 直接呈現 `action` 常數值；其 `data-action` 屬性 MUST 維持原始英文值（既有契約，不因本版變更）。

#### Scenario: AC-1.25 清單呈現處理狀況彙總
- **GIVEN** 某樣本已有提交與審核退回兩筆事件
- **WHEN** 以 `role=reviewer` 檢視 `annotation-list`
- **THEN** 該筆樣本之「最後動作」欄位 `data-action` 屬性為 `rejected`、可見文字為對應繁體中文標籤「審核退回」，最後活動時間為該退回事件時間，累計耗時為兩筆事件耗時之和
- **AND** 以 `role=annotator` 檢視時不呈現累計耗時，最後動作與最後活動時間仍呈現
- **AND** 無歷程事件之樣本三項皆為空狀態
