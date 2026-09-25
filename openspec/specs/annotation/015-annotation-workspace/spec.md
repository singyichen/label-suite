# annotation/015-annotation-workspace Specification

## Purpose
Annotation List + Workspace（標記清單與標記作業，Annotator／Reviewer）的 derived view。正典為 `specs/annotation/015-annotation-workspace/spec.md`（v6.19.0）；本文件僅收錄經 OpenSpec change 落地之需求，每條皆引用正典 FR/AC ID，不改動其正典措辭。目前收錄：change `reviewer-action-hint`（issue #526）之 FR-084、AC-4.47 ~ AC-4.50 與 FR-064 第 7 點第 6 項之範圍註記；change `2026-09-01-single-owner-review-relay`（issue #596）之 FR-092 ~ FR-097（新增）、FR-014B／FR-016A／FR-044／FR-051／FR-053／FR-054／FR-055／FR-060／FR-061／FR-062／FR-063／FR-064／FR-070／FR-083／FR-086（修訂）、FR-014I／FR-069／FR-074／FR-085（移除）；change `seq-tagging-span-workspace`（issue #581）之 FR-024A／FR-024A-1／FR-024A-2／FR-024A-3／FR-052／FR-024L（修訂）；change `reserve-arbiters-from-review-assignment`（issue #868）之 FR-060／FR-073／FR-093／FR-099（修訂）；change `pl-exception-disposal-screen-shell`（issue #907）之 FR-095（修訂，新增最終例外處置畫面外殼段落與 AC-4.69）；change `gate-review-assignment`（issue #921）之 FR-093（修訂，新增工作區側送出指派閘門段落與 AC-4.70、AC-4.71）；以及 change `fix-910-review-unit-status-consistency`（issue #910）之 FR-064（修訂，補齊與 FR-053 同源之 FR-044a 遞補列限定語）與 FR-016B（新增，審核決策事件之 outKey 範圍雙送出去重）；以及 change `fix-908-annotator-finalized-lock`（issue #908）之 FR-101（新增，標記員定稿鎖定，首次以獨立標題收錄）與 FR-072（首次以獨立標題收錄，修訂第 3 點加入「未定稿單位」限定語）。

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

### Requirement: FR-016B 標記歷程呈現

標記歷程 MUST 於右欄 `歷程` 頁籤呈現，annotator 與 reviewer 視角皆可查看；同一樣本的 annotator 與 reviewer 事件合併為單一時序清單，最新事件在前；尚無紀錄時顯示空狀態文案。合併清單納入 reviewer 事件時受 FR-062 盲審隔離約束——僅納入已提交之審核事件與檢視者本人的草稿事件（v4.9.0 既有規則，不變）。

每筆事件 MUST 包含操作者角色與 `actor_id`（FR-050）、時間、`action`（取值範圍見 FR-086）與對應輸出類型作答摘要；自 v4.61.0 起，事件另 MUST 承載 `result_snapshot`（FR-087）、`started_at` 與 `lead_time`（FR-088）、`reason`（FR-089），其呈現受 FR-090 分層遮蔽約束。事件維持 append-only：既有事件不得被覆寫或刪除。

v4.61.0 以前寫入、不具上述新欄位之事件 MUST 原樣顯示且不得因此報錯——缺哪一個欄位就不渲染對應區塊，系統 MUST NOT 為舊事件補寫推估的快照、耗時或理由（沿用 FR-050 對缺 `actor_id` 舊事件的既有處置原則）。

**v4.62.0 新增（issue #600，顯示層與 action 常數脫鉤）**：事件卡片之 `action` 徽章可見文字 MUST 經由單一資料來源之顯示標籤對照表（`ACTION_LABEL`，見 FR-086）轉換為繁體中文，MUST NOT 直接以 `action` 常數值作為畫面文案。徽章元素之 `data-action` 屬性 MUST 維持為該事件之原始英文 `action` 值，供測試與稽核取得，不受本段顯示轉換影響。

**本版修訂（issue #583，審核員外層提交事件停產）**：審核員送出自本版起不再寫入外層 `submitted` 事件（FR-086），v4.63.0（issue #601）之審核員外層 `submitted` 折疊規則因此僅適用於本版以前已寫入之舊事件——舊事件依 append-only 原則 MUST 原樣保留、MUST NOT 被刪除或改寫，其呈現層折疊與三項邊界照舊；新資料不再產生可折疊之對象。

**本版新增（issue #910，審核決策重複送出去重）**：既有「連續重複 `submitted` 事件不疊加」的雙送出防護（issue #201）MUST 擴及審核決策事件（`accepted`／`modified`／`bypassed`）：同一 `outKey` 之上一筆決策事件，若其 `action`、`role`、`actor_id`、`reason` 與該決策之修正值皆與新決策相同，新送出 MUST NOT 再疊加第二筆內容相同的事件。比對 MUST 以該 `outKey` 最近一筆事件為對象，MUST NOT 僅比對陣列最後一筆——同一次送出可能一次寫入多個不同 `outKey` 之事件，僅比對陣列最後一筆會誤刪其他 `outKey` 的合法事件。內容有實質差異（例如修正值改變）之重複送出仍 MUST 正常記錄為新事件，不受本段去重規則影響。本段不改變既有 append-only 語意——去重僅發生於「即將寫入前」，不覆寫、不刪除任何已寫入之事件。

#### Scenario: 歷程合併呈現且受盲審隔離
- **GIVEN** 某樣本已有標記員提交事件與一位審核員之已提交審核事件，另一位審核員尚有未提交之草稿事件
- **WHEN** 檢視右欄 `歷程` 頁籤
- **THEN** 清單以最新事件在前合併呈現標記員與已提交之審核事件，另一位審核員之未提交草稿事件不出現

#### Scenario: 舊外層提交事件仍折疊、新送出不再產生
- **GIVEN** 某樣本歷程含一筆本版以前寫入之審核員外層 `submitted` 事件，其後緊接同一 `actor_id` 之 `accepted` 事件
- **AND** 另一位審核員於本版對同一樣本送出一次審核
- **WHEN** 以 `role=reviewer` 檢視該樣本 `歷程` 頁籤
- **THEN** 舊外層 `submitted` 事件不呈現卡片，其後之 `accepted` 事件照常呈現
- **AND** 本版送出之審核員於清單中只有決策事件卡片，無任何 `submitted` 卡片

#### Scenario: AC-2.15 歷程卡片呈現擴充欄位
- **GIVEN** 標記員於 `run_type=official_run` 對某樣本提交，且該事件具備新欄位
- **WHEN** 切換至右欄 `歷程` 頁籤
- **THEN** 該筆事件卡片顯示操作者（角色 + `actor_id`）、時間、`action` 徽章（`data-action` 屬性為原始英文 `action` 值，可見文字為對應繁體中文標籤）與作答摘要；並依 FR-090 可見性顯示 `result_snapshot` 差異區塊與 `reason`
- **AND** 同一清單中一筆 v4.61.0 以前寫入的舊事件僅顯示既有五欄位，不渲染差異區塊、耗時或理由，且不擲出錯誤

#### Scenario: 審核決策重複送出不疊加重複事件（issue #910）
- **GIVEN** 審核員對某審核單位一個 `outKey` 送出「通過」決策，該單位因 FR-053 之雙條件判定仍維持可送出狀態（例如受審標記員無儲存提交、僅有 FR-044a 遞補列頂替，因此 `getReviewUnitStatus` 恆為 null）
- **WHEN** 審核員以完全相同的決策再次送出審核
- **THEN** 該 `outKey` 之 `accepted` 事件於 `歷程` 頁籤中 MUST 仍只有一筆，MUST NOT 疊加第二筆內容相同的事件
- **AND** 若該次重複送出改變了另一個 `outKey` 的決策或修正值，該 `outKey` 的新事件 MUST 正常寫入，不受前一 `outKey` 去重規則影響

### Requirement: FR-086 歷程動作常數化

歷程事件之 `action` MUST 取自常數集合，MUST NOT 為自由字串。自 v5.0.0 起集合為：

`HISTORY_ACTIONS = draft_saved | submitted | skipped | modified | accepted | bypassed | adjudicated | exception_resolved | excluded`

各值語意：`draft_saved`（標記員或審核員儲存草稿）、`submitted`（標記員提交）、`skipped`（標記員跳過）、`modified`（審核員直接修正答案）、`accepted`（審核員通過）、`bypassed`（審核員決策為 `無法裁決`）、`adjudicated`（仲裁者裁定，含採 A／採 B／兩者皆非）、`exception_resolved`（專案負責人於最終例外池定案）、`excluded`（專案負責人自資料集排除）。每個值 MUST 對應唯一的徽章語意色，且該對應 MUST 為單一資料來源驅動，MUST NOT 於渲染端逐值硬編分支。每個值 MUST 有對應的產生點。

**v5.0.0 移除**：`rejected` 隨退回機制移除而自集合刪除。v5.0.0 以前寫入的 `rejected` 事件 MUST 原樣保留、MUST NOT 被刪除或改寫，並依既有規則以中性徽章呈現且不中斷渲染（集合外值之相容處置）。

`bypassed` 之徽章文案 MUST 讀自決策值之唯一來源（FR-092 v6.8.0 修訂），MUST NOT 另行手寫。

**v6.8.0 修訂**（issue #811）：`bypassed` 之語意描述由「標記為無法判定」改為「決策為 `無法裁決`」，僅措辭；集合、產生點與徽章語意色不變。

**本版修訂（issue #583）**：`submitted` 之產生點 MUST 僅為標記員提交；審核員送出 MUST NOT 寫入 `submitted`，其產生點僅為逐 `outKey` 之決策事件（`accepted`／`modified`／`bypassed`，對應 FR-092 三向決策）。本版以前已寫入之審核員 `submitted` 事件 MUST 原樣保留並依 FR-016B 折疊。集合九值、徽章語意色與顯示標籤不變。

本條一併修訂關鍵實體 `AnnotationHistoryItem`：其 `action` 可能值 MUST 改列上述九值。

#### Scenario: AC-2.16 七種動作各有對應徽章
- **GIVEN** 某樣本歷程依序包含 `HISTORY_ACTIONS` 全部九種動作各一筆
- **WHEN** 檢視 `歷程` 頁籤
- **THEN** 九筆事件各自呈現一個徽章，且九個徽章的語意色兩兩不同
- **AND** 一筆 v5.0.0 以前寫入的 `rejected` 事件（現已為集合外值）以中性徽章原樣呈現，清單其餘事件正常渲染

#### Scenario: AC-2.21 審核通過與修正皆產生歷程事件
- **GIVEN** 審核員對某樣本一個 `outKey` 送出 `通過`、對另一個 `outKey` 送出 `修正`、對第三個 `outKey` 送出 `無法裁決`
- **WHEN** 檢視該樣本 `歷程` 頁籤
- **THEN** 清單分別出現一筆 `accepted`、一筆 `modified` 與一筆 `bypassed` 事件，三者之 `actor_id` 皆為該審核員
- **AND** 該次送出未因此產生重複事件（沿用 FR-016B append-only 與既有重複送出防護）

#### Scenario: 審核員送出不產生 submitted 事件
- **GIVEN** 審核員對某審核單位之每個 `outKey` 各選定一個決策
- **WHEN** 審核員送出審核
- **THEN** 該次送出寫入之事件數等於 `outKey` 數，每筆之 `action` 皆屬 `accepted`／`modified`／`bypassed`，`role` 皆為 `reviewer`
- **AND** 該次送出未寫入任何 `action` 為 `submitted` 之事件
- **AND** 標記員提交仍寫入恰一筆 `submitted` 事件

### Requirement: FR-087 結果快照與差異呈現

每筆會改變答案內容的事件（`submitted`、`modified`、`adjudicated`）MUST 保存當下的 `result_snapshot`——該樣本完整的 `outputs[]` 作答結果，且 MUST 排除原始文本與資料集欄位（快照的用途是回答「答案改了什麼」，不是複製受標記資料）。

歷程面板呈現的差異 MUST 由同一操作者維度下相鄰兩筆事件的 `result_snapshot` 於呈現時計算，系統 MUST NOT 另存一份差異結果。差異呈現方式 MUST 由 `OUTPUT_TYPE_REGISTRY` 之輸出類型驅動，不得逐 task 硬編：純值類型（`single_label`、`multi_label`、`single_dim`、`multi_dim`、`free_text`）比對值本身；具位置資訊之類型（`entity_recognition`、`relation_identification`、`sequence_tagging`）MUST 逐實體列出新增、刪除與邊界變更三類差異，僅實體數量相同而邊界不同時亦 MUST 被列出。

**已知落差（範圍收斂，本版修訂）**：`relation_identification` 屬本條所稱「具位置資訊之類型」，其答案結構之起訖攜帶、逐實體差異之索引鍵與逐快照對回退規則改由 FR-098 定義。本條之逐實體差異要求於該型別上 MUST 依來源形狀分流——來源本身帶位置資訊者（工作區互動標記、物件形狀之資料集匯入）MUST 逐實體列出；來源本身不帶位置資訊者（gold 純字串三元組、內建示範資料之字串串接值）MUST 維持以純值比對遞補，見 FR-098 第 6 點與第 7 點。此分流不是本條的例外開口，而是「來源資料本身沒有位置資訊時 MUST NOT 偽造位置」的落實；處置方式沿用 FR-052 之「已知落差」先例。原記載於本條的「整個 `relation_identification` 型別暫以純值比對遞補」自本版起不再成立。

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

**本版修訂（issue #583，一次作業一份耗時）**：上段「每筆事件 MUST 承載」修訂為：每次作業（標記員提交、草稿儲存或審核員送出）所寫入之事件中，`started_at` 與 `lead_time` MUST 恰出現一次，MUST NOT 於同一次作業之多筆事件重複寫入。審核員送出寫入多筆決策事件時，MUST 僅由其中第一筆寫入之決策事件承載，其餘決策事件 MUST NOT 帶這兩個欄位；呈現端依 FR-016B「缺哪一個欄位就不渲染對應區塊」處置，不得補寫推估值。本版以前寫入、同一次作業重複承載之舊事件 MUST 原樣保留。

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

#### Scenario: 審核送出之耗時僅由第一筆決策事件承載
- **GIVEN** 審核員開啟某審核單位作業一段時間後，對三個 `outKey` 分別送出三個決策
- **WHEN** 讀取該次送出寫入之事件
- **THEN** 恰有一筆事件帶 `started_at` 與 `lead_time`，且為三筆中最先寫入者
- **AND** 以 `role=reviewer` 檢視 `歷程` 頁籤時，該次送出只有一張卡片顯示耗時

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

**本版修訂（issue #583，同時戳事件之最後動作）**：同一紀錄內多筆事件時間相同時（例如一次審核送出於同一毫秒寫入之多筆決策事件），「最後動作」與「最後活動時間」MUST 取其中最後寫入（append 順序最後）之一筆。

**本版修訂（issue #864，累計耗時之彙總口徑）**：前段「累計耗時為該樣本全部事件 `lead_time` 之和」MUST 改為以**作業階段**為彙總單位。作業階段之識別鍵 MUST 為 `actor_id` 與 `started_at` 之配對——僅以 `started_at` 識別會把同一瞬間開啟該樣本的兩個人併為一段；僅以 `actor_id` 識別會把同一人前後兩次開啟併為一段，而後者是真實的額外工時，MUST 分別計入。彙總 MUST 依下列三條規則：(1) 同一作業階段之多筆事件，取其 `lead_time` 之**最大值**，MUST NOT 相加、MUST NOT 取首筆或末筆——FR-088 之 `lead_time` 為該次開啟期間只增不減的頁面可見時間累計，最大值即該段的最終時長，與事件合併順序無關；(2) 不同 `started_at` 之作業階段各自取值後相加；(3) 不具 `started_at` 之事件（早於 FR-088、無作業階段身分可資分組）MUST 各自獨立計入，MUST NOT 假設其共屬同一段。第 (1) 條之最大值 MUST 於各作業階段內取得，MUST NOT 取全體事件之全域最大值——後者會把規則 (2) 才剛分開的兩段再度併回一段。不具 `lead_time` 之事件不計入，沿用 FR-016B「缺哪一個欄位就不渲染對應區塊、MUST NOT 補寫推估值」之處置。

本修訂之必要性不因 FR-088 於本規格 v6.9.0（issue #583）收斂產生側而消失：該版使每次作業之 timing 恰寫入一次，但同一次開啟內的多次作業（例如先 `draft_saved` 再 `submitted`）仍共用同一 `started_at`，且各自合法承載一份持續遞增的 `lead_time`，相加即為重複計算；且該版明定「本版以前寫入、同一次作業重複承載之舊事件 MUST 原樣保留」，舊資料之重複 timing 永久存在於歷程中，彙總端 MUST 自行處理。

AC-1.25 之「累計耗時為兩筆事件耗時之和」於本口徑下仍然成立——該情境之提交與審核退回兩筆事件分屬不同 `actor_id`，即兩個作業階段，本即應相加；本修訂不改寫該斷言。
#### Scenario: AC-1.25 清單呈現處理狀況彙總
- **GIVEN** 某樣本已有提交與審核退回兩筆事件
- **WHEN** 以 `role=reviewer` 檢視 `annotation-list`
- **THEN** 該筆樣本之「最後動作」欄位 `data-action` 屬性為 `rejected`、可見文字為對應繁體中文標籤「審核退回」，最後活動時間為該退回事件時間，累計耗時為兩筆事件耗時之和
- **AND** 以 `role=annotator` 檢視時不呈現累計耗時，最後動作與最後活動時間仍呈現
- **AND** 無歷程事件之樣本三項皆為空狀態

#### Scenario: 同時戳決策事件取最後寫入者
- **GIVEN** 審核員一次送出對兩個 `outKey` 依序寫入 `accepted` 與 `modified` 兩筆事件，且兩筆之 `at` 相同
- **WHEN** 以 `role=reviewer` 檢視 `annotation-list`
- **THEN** 該筆樣本之「最後動作」欄位 `data-action` 屬性為 `modified`

#### Scenario: 累計耗時以作業階段為單位彙總
- **GIVEN** 某樣本之歷程含三類事件：同一審核員一次送出所寫入、共用同一 `started_at` 且各承載遞增 `lead_time` 的多筆事件；同一審核員另一次開啟（不同 `started_at`）所寫入之事件；以及一筆不具 `started_at` 的舊事件
- **WHEN** 以 `role=reviewer` 檢視 `annotation-list` 之「累計耗時」
- **THEN** 共用同一 `started_at` 之多筆事件僅以其 `lead_time` 最大值計入一次
- **AND** 另一次開啟之作業階段另外計入，兩段相加
- **AND** 不具 `started_at` 之舊事件獨立計入，MUST NOT 併入任一作業階段

### Requirement: FR-014B 審核決策控件的 toggle 語意

工作區 reviewer 視圖的逐 outKey 決策控件 MUST 支援 active/inactive 切換；再次點擊當前 active 的選項時，視為取消該筆決策並回到未選取狀態。

自 v5.0.0 起，該控件承載的是 `REVIEW_DECISIONS = approve | modify | bypass` 三向決策（FR-092），不再是 `通過 / 退回` 兩向；`退回` 選項 MUST NOT 渲染。三向決策於兩種 `run_type` 完全一致（FR-053），本條 MUST NOT 再依 `run_type` 分流。

**v6.8.0 修訂**（issue #811）：三向決策之按鈕文案為 `通過`／`修正`／`無法裁決`（FR-092），僅措辭。

#### Scenario: AC-3.51 三向決策控件的 toggle
- **GIVEN** reviewer 開啟一個狀態為 `待審` 的審核單位
- **WHEN** 對某個 outKey 點擊 `通過`
- **THEN** 該 outKey 之 `通過` 呈 active，`修正`／`無法裁決` 呈 inactive，畫面上不存在任何 `退回` 控件
- **AND** 再次點擊 `通過` 時該 outKey 回到未決策狀態

### Requirement: FR-044 審核列的呈現與 seed 來源

Reviewer 審查列 MUST 僅呈現**受審標記員本人**的提交，MUST NOT 渲染標記分布統計盒（`ws-review-stats`）、批次操作列、FR-014A 之偏差著色，或多標記員清單（`ws-review-annotator-list`）——MUST NOT 以空殼 DOM 形式存在，須完全不渲染。標記員答案 MUST 直接帶入修正/作答控制項（該控制項同時作為顯示與編輯用途，不另外呈現唯讀答案列）。

決策控制 MUST 置於該輸出類型標題列右側（卡片語意 = 單一審查項目），其選項自 v5.0.0 起為 `REVIEW_DECISIONS` 三向（FR-092）。「送出審核」驗證維持「每個 outKey 皆須有決策」，範圍為單一標記員。

**v5.0.0 移除**：原文末段「退回後回退為待標記並保留原答案供修改之機制沿用 FR-014I／AC-3.15」隨退回機制移除而失效——兩種 `run_type` 皆 MUST NOT 提供任何使標記員重新標記的通道。seed 來源規則（真實提交 → FR-044a 示範遞補）不變。

**本版新增——示範 seed 的合法性**：審核流程示範任務的種子列 MUST 只示範現行資料模型可產生的形狀。任一種子列所描述的狀態，MUST 能由 FR-051 的三態推導、FR-093 的指派粒度、FR-092 的 `REVIEW_DECISIONS` 與 FR-061 的 `ARBITRATION_OUTCOMES` 共同產生；MUST NOT 保留任何只能由已廢止規則（定稿門檻 `min_reviewers`、多數決收斂、審核員層級的退回決策）產生的列。示範任務整組的種子 MUST 集體見證 `REVIEW_DECISIONS` 的每一個值——含 `bypass`——以及仲裁「兩者皆非」進入最終例外池（FR-095）的路徑；任一決策值於整組種子零命中時，該組 MUST 視為覆蓋不足。

**本版新增——雙份副本一致性**：示範審核單位的種子資料存在兩份手寫副本（`docs/product/example-data/review-flow-*.json` 與 prototype `task-detail.data.js` 各示範任務 profile 的 `datasetFileName`／`datasetRecords`）。兩份 MUST 逐列一致，以實際渲染的 prototype 種子為基準；此一致性 MUST 由一道可執行的檢查守住，並依本專案的兩向契約同時登錄本機驗證指令與對應 CI job，MUST NOT 僅以文件約定或人工比對代替。

#### Scenario: AC-6.11 正式標記不再產生重標待辦
- **GIVEN** `run_type = official_run` 的一筆樣本，其審核員對某 outKey 送出 `修正`
- **WHEN** 該樣本的標記員回到工作區
- **THEN** 該樣本 MUST NOT 出現於其待辦，狀態 MUST NOT 回退為 `待標記`，畫面上不存在重標理由橫幅

#### Scenario: 示範審核單位的 sample id 不得編碼已廢止的審核狀態詞
- **GIVEN** `run_type = official_run` 的審核流程示範任務 T016，其審核單位種子同時被 workspace 種子、task-detail 樣本清單與 `docs/product/example-data` fixture 三處消費
- **WHEN** 任一消費端列舉該審核單位的 `sample_id`
- **THEN** 該 `sample_id` MUST NOT 含 v5.0.0 已自 `REVIEW_UNIT_STATUS` 移除的中間狀態詞（`approved`、`modified`），MUST 改以該情境實際發生的審核行為命名，使 id 與 FR-051 現行三態語彙一致
- **AND** 同一個 id 的每一處出現（種子物件的 map key 與資料列欄位、樣本清單、fixture、Playwright 測試與正典條文引文）MUST 於同一次變更內同步改名；只改其中一部分會使該筆種子查無對應答案而整列不渲染，因此部分改名 MUST NOT 發生

#### Scenario: 示範種子集體見證三向決策與例外池路徑
- **GIVEN** 審核流程示範任務整組的審核單位種子
- **WHEN** 列舉每一列所攜帶的審核決策與仲裁裁定
- **THEN** `REVIEW_DECISIONS` 的三個值 MUST 各至少有一列見證，其中 `bypass` MUST 有一列以 `official_run` 形態呈現非空理由與空答案值——`bypass` 依設計不寫入答案值，此為其與 `modify` 在資料層的唯一區辨
- **AND** MUST 有一列見證審核員 `修正` 後仲裁裁定為 `reject`（兩者皆非），使該單位維持 `爭議中` 並列入最終例外池；此路徑 MUST NOT 因任何示範任務被移除而失去其唯一見證
- **AND** MUST NOT 存在任何一列，其狀態只能由 `MIN_REVIEWERS_DEFAULT`、多數決收斂或審核員層級的 `reject` 產生

#### Scenario: 兩份示範資料副本逐列一致
- **GIVEN** `docs/product/example-data` 的審核流程 fixture 與 prototype 的審核單位種子
- **WHEN** 執行示範資料一致性檢查
- **THEN** 兩份的任務集合、每個任務的樣本 id 序列與每筆樣本的文字內容 MUST 完全相同，任一差異 MUST 使該檢查以非零 exit 失敗並逐筆指名差異所在
- **AND** 該檢查 MUST 同時被列為本機驗證指令與 CI job；只存在其一時，本專案的 `CI_JOB_PARITY` 檢查 MUST 回報缺口

### Requirement: FR-051 審核單位定址與狀態機

審核單位（`ReviewUnit`）MUST 以 `REVIEW_UNIT_DIMENSIONS`（`sample_id × annotator_id × run_type`）定址——同一樣本由 N 位標記員標記即為 N 個各自獨立、狀態互不影響的審核單位。此定址於 `dry_run` 與 `official_run` 完全一致，MUST NOT 依 `run_type` 分流。

自 v5.0.0 起狀態依 `REVIEW_UNIT_STATUS = pending | disputed | finalized`（中文語彙 `待審 / 爭議中 / 已定稿`）單一狀態欄線性推進，判定式為：

1. 標記員未提交 → 不成立審核單位（推導為 null，畫面顯示 `尚無標記提交`）。
2. 該單位之指派審核員尚未送出審核 → `pending`。
3. 審核員送出，且該單位每個 outKey 之決策皆為 `approve` → `finalized`（定稿值即標記員原答案）。
4. 審核員送出，且任一 outKey 之決策為 `modify` 或 `bypass` → `disputed`；該單位之爭議項全部經仲裁裁定（採 A／採 B）或經最終例外池收尾（FR-095）後推導為 `finalized`；任一爭議項仍未解決時維持 `disputed`。
5. 經最終例外池「自資料集排除」處置之單位 MUST NOT 推導為 `finalized`，而以獨立的排除記號呈現且不進入定稿集合（FR-063）。

**v5.0.0 移除**：`approved`／`modified` 兩個過渡態、`min_reviewers` 定稿門檻與「已提交審核員人數 `n`」之計數皆 MUST NOT 再參與推導——一個審核單位恰有一位指派審核員（FR-093），「未達門檻」在結構上不存在。狀態推導 MUST 僅讀取該單位指派審核員之已提交決策與該單位之仲裁／例外池結果；未送出的草稿 MUST NOT 計入。

#### Scenario: AC-4.52 三態狀態機
- **GIVEN** 一個 `official_run` 審核單位，標記員已提交、審核員尚未送出
- **WHEN** 讀取該單位狀態
- **THEN** 狀態為 `待審`
- **AND** 審核員全部 outKey 送出 `通過` 後狀態直接為 `已定稿`，過程中 MUST NOT 出現 `已同意` 或 `已修改`
- **AND** 另一單位之審核員送出任一 `修正` 或 `無法裁決` 後狀態為 `爭議中`，直到仲裁或例外池收尾才轉為 `已定稿`

### Requirement: FR-053 審核卡版面、空單位閘門與定稿卡

工作區 reviewer 審核卡 MUST 對兩種 `run_type` 渲染**同一套版面**，MUST NOT 存在任何依 `run_type` 分流的呈現分支。版面契約：每個 outKey 一列（span 型別依 FR-014N 合併為一列），列內僅有作答/修正控件與其上的一組 `REVIEW_DECISIONS` 三向決策控件（FR-092），無型別標題（FR-014P）；seed 來源為受審標記員本人答案（FR-044、FR-044a）；送出驗證為「每個 outKey 一筆決策」（FR-044）。

**空審核單位閘門**：審核單位「真空」——受審標記員無儲存提交（FR-051 推導為 null）**且**該樣本無 `REVIEWER_MOCK_ROWS` 遞補列——時，本條版面 MUST NOT 渲染決策控件、修正控件與送出按鈕，改渲染空狀態卡（`ws-review-empty-unit`）並保持送出按鈕隱藏（FR-058 快捷鍵同步失效）；「真空」判定 MUST 與 FR-064 橫幅顯示 `尚無標記提交` 的判定同源。

**已定稿單位鎖定**：審核單位狀態推導為 `已定稿`（FR-051）時，本條版面 MUST NOT 渲染決策、修正或送出控件，改渲染 FR-094 之**純文字唯讀結果卡**；`handleReviewSubmit()` 之同源守衛於**進入時**判定，促成定稿的那一筆送出本身不受影響。已定稿單位**全面唯讀**——無決策、無直接修正、無送出；重啟流程延後至後端階段，原型 MUST NOT 發明任何解鎖入口。中間狀態（`待審`／`爭議中`）不受本鎖定影響。

`dry_run` 原有之共識模型元件（`ws-review-stats`、`ws-review-consensus-badge`、`ws-review-apply-majority`、`ws-review-annotator-list` / `ws-review-annotator-row`、`ws-review-set-draft`、`ws-review-source-text`）MUST 完全不渲染，MUST NOT 以空殼 DOM 形式存在。

#### Scenario: AC-3.52 已定稿單位渲染純文字唯讀卡
- **GIVEN** 一個狀態為 `已定稿` 的審核單位
- **WHEN** reviewer 開啟該單位
- **THEN** 畫面渲染純文字唯讀結果卡，不存在任何 disabled 或 enabled 的作答控件、決策控件與送出按鈕
- **AND** 卡上呈現 FR-094 之單行微型衝突歷程

### Requirement: FR-054 審核決策快捷鍵

工作區 reviewer 模式 MUST 實作決策快捷鍵，作用對象為**當前審核單位的全部輸出類型**：一次按鍵即完成該單位的決策，與 FR-044 的「每個 outKey 一筆決策」送出驗證對齊；介面不提供「目前聚焦輸出類型」的概念，因此 MUST NOT 只決定其中一個 outKey。重複按同一鍵取消回未決策（沿用 FR-014B 的 toggle 語意）。

自 v5.0.0 起快捷鍵集合為：`A` = 通過（`approve`）、`B` = 無法裁決（`bypass`）。**`R` = 退回 MUST 移除**（退回機制已不存在）。`修正`（`modify`）MUST NOT 綁定快捷鍵——快捷鍵作用於當前單位的**全部** outKey，而修正的替代值因 outKey 而異，單一按鍵無法表達；`無法裁決` 是全單位一致的決策故可綁鍵。兩者的必填理由（FR-016A）皆於決策標記後展開，MUST NOT 因快捷鍵而放寬。

下列情況 MUST NOT 觸發：焦點位於 `input` / `textarea` / `select` / contenteditable、按鍵帶有 `Shift` / `Ctrl` / `Cmd` / `Alt` 修飾鍵、以及 `role = annotator`。共用側欄（spec 008）之快捷鍵總覽 MUST 同步移除 `R`、列出 `B`，且 `B` 列之說明文案 MUST 讀自與決策按鈕相同之決策值來源（FR-092 v6.8.0 修訂），MUST NOT 另行手寫；批次快捷鍵 `Shift+A` / `Shift+R` 維持既有之廢止狀態。

#### Scenario: AC-3.54 快捷鍵 A 與 B 可用、R 已移除
- **GIVEN** reviewer 開啟一個 `待審` 審核單位且焦點不在輸入控件上
- **WHEN** 按下 `A`
- **THEN** 該單位全部 outKey 標為 `通過`
- **AND** 按下 `B` 時全部 outKey 標為 `無法裁決`，按下 `R` 時無任何作用且不產生任何決策

### Requirement: FR-055 annotation-list reviewer 清單粒度

`annotation-list` reviewer 視圖的清單粒度 MUST 為**審核單位**（`REVIEW_UNIT_DIMENSIONS`，FR-051）——同一樣本由 N 位標記員標記即渲染為 N 個連續資料列，兩種 `run_type` 完全一致，MUST NOT 存在任何依 `run_type` 分流的清單分支。

每列 MUST 呈現：樣本 ID、該列標記員帳號、該審核單位的 `REVIEW_UNIT_STATUS`、完成時間、文本摘要、**該標記員本人**的逐輸出類型答案摘要 tag，以及該樣本的跨標記員標記分布統計（統計單位仍為樣本，故同一樣本各列數值相同）。分頁總筆數計審核單位數。

狀態篩選選項 MUST 依角色由對應常數推導，MUST NOT 於選單硬編狀態清單：自 v5.0.0 起 reviewer 為 `REVIEW_UNIT_STATUS` **三態**（`待審`／`爭議中`／`已定稿`），annotator 維持既有三態。導頁（列點擊與行動按鈕）MUST 帶出該列的 `annotator_id`，使工作區審核卡開在同一審核單位。

展開控制項與標記員明細列、逐列決策控件、清單層級 `送出審核` 按鈕維持既有之廢止狀態，testid 與 i18n key 保留不重用。

**本版修訂（issue #792，審核單位之列舉來源）**：一筆樣本的審核單位 MUST 為下列兩者之聯集：(1) 該樣本的示範標記員列（FR-044a 第二 seed 來源）；(2) 該樣本在本 `run_type` 下具**已儲存提交**之標記員（FR-044a 第一 seed 來源）。未提交之草稿 MUST NOT 構成審核單位；兩個 seed 來源皆缺之單位仍不在列舉範圍內（v6.3.1 釐清，issue #784，不變）。此聯集 MUST 由資料層單一函式提供，`annotation-list` 清單列、工作區 reviewer 導覽（FR-056）、任務摘要（FR-072）、快速審核候選（FR-073）、審核指派之輸入（FR-093）與定稿卡剩餘量（FR-100）皆讀同一份結果，MUST NOT 各自列舉。列舉 MUST NOT 依任務 ID、樣本 ID 或輸出類型分流（Generalization-First）。

**本版修訂（issue #866，IAA 之評分者列舉亦同源）**：前段之消費端清單 MUST 再含**本規格供應給 IAA 的評分者列舉**（FR-079 所述之輸入）——IAA 的評分者數與值集合 MUST 由同一份聯集結果推導，MUST NOT 只取示範標記員列這一個 seed 來源。因此一位在本 `run_type` 下具已儲存提交、但無示範列之標記員，MUST 與其他標記員同樣計入評分者數與各樣本的值集合。本條僅規範供應給 IAA 的**輸入**；α 之計算公式、可計算性門檻與閘門語意之正典仍在 `dataset-017`（閘門語意見 FR-039），MUST NOT 因本修訂而改變。

#### Scenario: AC-1.26 狀態篩選為三態
- **GIVEN** reviewer 開啟 `annotation-list`
- **WHEN** 展開狀態篩選選單
- **THEN** 選項恰為 `待審`／`爭議中`／`已定稿` 三項，MUST NOT 出現 `已同意` 或 `已修改`

#### Scenario: 已提交但無示範列之審核單位進入列舉
- **GIVEN** 某任務某樣本沒有示範標記員列，而一位標記員已於本 `run_type` 提交該樣本
- **WHEN** 被指派到該單位的審核員開啟 `annotation-list` 與 dashboard
- **THEN** 清單出現一列該樣本 × 該標記員之審核單位，狀態為 `待審`，答案欄顯示該標記員提交的答案
- **AND** 任務摘要的待審與未定稿計數各含此單位
- **AND** `快速審核` 可導向此單位，該單位恰被指派給一位審核員

#### Scenario: 草稿與兩個 seed 來源皆缺之單位不進入列舉
- **GIVEN** 某樣本沒有示範標記員列，而一位標記員對該樣本只存了草稿、未提交
- **WHEN** 審核員開啟 `annotation-list`
- **THEN** 清單不出現該樣本之任何審核單位，任務摘要亦不計入

#### Scenario: 已提交但無示範列之標記員計入 IAA 評分者
- **GIVEN** 某任務某 `run_type` 下，一位標記員對該任務的樣本具已儲存提交，但不在任何樣本的示範標記員列中
- **WHEN** 檢視該任務該輸出類型的 IAA
- **THEN** 評分者數含該標記員，各該樣本的值集合含其答案
- **AND** α 依含該標記員之完整值集合計算

### Requirement: FR-060 仲裁資格與清單入口

`annotation-list` reviewer 視圖中，狀態為 `爭議中`（FR-051）的審核單位列，對具仲裁資格的審核員 MUST 將列動作按鈕由 `編輯` 換為 `仲裁`（testid `list-arbitrate-entry`）。仲裁資格 MUST 同時符合：

1. 目前審核員的 `user_id` 存在於該任務 `arbiter_ids`；該欄位是 `can_arbitrate = true` 的唯一任務層來源，系統 MUST NOT 只以全域示範名冊或其他任務的旗標授權；
2. 目前審核員於該審核單位沒有自己的已提交審核（FR-049 reviewer bucket 查無提交）。

不符資格者維持 `編輯`；非 `爭議中` 列不得出現 `仲裁`。`仲裁` 與 `編輯` 導向同一工作區網址並攜帶完整審核單位身分，MUST NOT 新增任何網址參數。非當事人限制只適用仲裁，不得用來排除審核員對自己標記資料的審核指派。

#### Scenario: 任務仲裁名冊覆蓋全域示範旗標

- **GIVEN** 任務 profile 的 `arbiter_ids` 只含 reviewer L，而全域示範名冊另將 reviewer C 標為可仲裁
- **WHEN** L 與 C 分別檢視一個兩人皆未參與的爭議單位
- **THEN** L 具仲裁資格且 C 不具仲裁資格

#### Scenario: AC-4.53 仲裁資格兩條件

- **GIVEN** 審核員 X 已被勾選進仲裁者名冊且未對某 `爭議中` 單位提交過審核
- **WHEN** X 檢視該列
- **THEN** 該列動作按鈕為 `仲裁`
- **AND** 對該單位已提交審核的審核員 Y（同樣具名冊勾選）看到的是 `編輯`

### Requirement: FR-061 仲裁版面：逐項二選一與 Reject 出口

工作區 reviewer 視圖 MUST 為爭議池提供**逐項仲裁版面**，切換條件為「該審核單位狀態為 `爭議中`（FR-051）**AND** 目前審核員具仲裁資格（FR-060 兩條件）」——條件成立時整張審核卡切換為仲裁版面，不成立時維持 FR-053 審核卡，兩者互斥、MUST NOT 混渲染：

1. **仲裁者選邊、不重新標記**：仲裁版面呈現標記員答案的唯讀摘要（一致項的脈絡）與逐爭議項的 A／B 選擇；修正控件與決策控件 MUST NOT 渲染——仲裁的產出是「採哪一側」，不是第三份新答案。仲裁 MUST NOT 觸發任何形式的重標。
2. **A／B 取值與 B 的動態渲染**：A ＝ `annotator_value`（標記員原答案）。B ＝ 該單位審核員的答案，其呈現 MUST 依決策來源動態決定：
   - 來源 `modify` → 呈現 `B · 審核員：{修正值}`；採 B 即以該修正值定案。
   - 來源 `bypass` → 呈現 `B · 審核員：無法裁決`（與來源 `modify` 同一組字規則，冒號後改為決策值文案，決策值文案讀自 FR-092 v6.8.0 修訂之唯一來源）；採 B 即**定案為無法判定**，該項之定案值記為無法判定，MUST NOT 回填標記員原答案。
   一個審核單位恰有一位審核員（FR-093），故每個爭議項恰有一個 B 選項，MUST NOT 出現多個 B 或需要合併相同值的情形。
3. **第三出口：兩者皆非（Reject）**：仲裁者判定 A 與 B 皆不可採時 MUST 可選 `兩者皆非`，**理由必填**；送出後該爭議項 MUST 落入最終例外池（FR-095），該單位維持 `爭議中` 直到例外池收尾。
4. **送出與寫入**：所有爭議項皆已裁定（採 A／採 B／兩者皆非）方可送出，未完成時 MUST 阻擋且 MUST NOT 寫入任何狀態。送出時逐項寫入 `votes[]`（`arbiter_id`、`choice`、`voted_at`）與 `finalized_value` / `finalized_by`；`choice` 取值 MUST 為 `ARBITRATION_OUTCOMES = adopt_a | adopt_b | reject`。仲裁狀態以**審核單位**定址（`task_id × run_type × annotator_id × sample_id`），MUST NOT 寫入任何 reviewer bucket——爭議屬於單位本身，任何仲裁者的定案必須對該單位的所有檢視者可見。
5. **仲裁效果說明**：版面 MUST 載明仲裁的效果為「逐爭議項選定定稿值、不重新標記」。

**v5.0.0 移除**：逐項多數決收斂（`DISPUTE_CONVERGENCE_RULE`）、隱含同意票、偶數平手／全數分歧之不收斂情境、以及 issue #551 之「純退回恆不收斂」與「維持退回」語意 MUST 全部移除——單一審核員沒有票數可計，且退回機制已不存在。爭議項 MUST 全數由仲裁者逐項裁定，不存在自動收斂路徑。
**v6.8.0 修訂**（issue #811）：B 選項之 `bypass` 呈現由 `B · 審核員 Bypass（無法判定）` 改為 `B · 審核員：無法裁決`——舊標籤把答案值與決策值兩個概念的名字疊在同一個標籤裡。「採 B 即定案為無法判定」描述的是定案後的值，不在本版改名範圍。

#### Scenario: AC-4.54 B 依來源動態渲染且 Reject 進例外池
- **GIVEN** 一個 `爭議中` 單位含兩個爭議項：項目 1 之審核員決策為 `修正`（改為 `positive`），項目 2 為 `無法裁決`
- **WHEN** 具資格之仲裁者開啟仲裁版面
- **THEN** 項目 1 之 B 選項顯示審核員修正值 `positive`，項目 2 之 B 選項顯示 `審核員：無法裁決`，且不含 `Bypass` 字樣
- **AND** 仲裁者對項目 2 選 `兩者皆非` 且未填理由時送出被阻擋；填妥理由送出後該項出現於最終例外池，該單位狀態維持 `爭議中`

### Requirement: FR-062 盲審隔離——未提交的審核判斷僅本人可見

審核員對某審核單位**尚未提交**的審核判斷（草稿決策、修正內容、Bypass 標記，及其草稿歷程事件）MUST 僅對該審核員本人可見：其他任何角色——具仲裁資格的審核員、專案負責人、其他審核員——於任何可見的呈現路徑（右欄 `歷程` 頁籤之合併時序清單、審核卡、仲裁版面、清單、最終例外池收尾畫面）皆 MUST NOT 看到他人未提交的判斷；「已有動作」的事實本身即構成污染，MUST NOT 以摘要或去內容化形式呈現。

**已提交**之審核判斷維持既有規則：獨立保存並可依序讀出（FR-049）、以真實 `actor_id` 合併入時序清單（FR-050）、仲裁定案對所有檢視者可見（FR-061）；annotator 之儲存/提交事件為受審內容之一部分，不受本條影響。

**v5.0.0 理由改寫**：本條原以「獨立審核（一式 N 份，審核員互不影響）」為立論；單人接力模型下已無並行審核員，該立論失效。本條之規則**不變**，其現行理由為：草稿是尚未成立的判斷，讓下游決策者（仲裁者、專案負責人）看到未送出的草稿，會使他們對一個作者尚可撤回的立場產生預設立場，且該草稿在歷程中沒有可究責的送出時點。

#### Scenario: 仲裁者看不到審核員未提交的草稿
- **GIVEN** 某審核單位之審核員已存草稿決策但尚未送出
- **WHEN** 具仲裁資格之另一位審核員或專案負責人檢視該單位之任何畫面與歷程
- **THEN** 該草稿決策、修正內容與其草稿歷程事件皆不出現於其可取得的輸出中

### Requirement: FR-063 official_run 定案即產生 gold

`official_run` 之審核單位推導為 `已定稿`（FR-051）時 MUST 產生該樣本的定案答案（gold）；`dry_run` MUST NOT 產生任何樣本層級之定案答案——試標的產物是一致性與被修改率兩項品質指標（FR-096），不是答案。

自 v5.0.0 起定稿值之來源 MUST 為下列四者之一，且 MUST 逐筆記錄其來源與決策者：

1. 審核員 `approve` → 定稿值 = 標記員原答案，決策者 = 該審核員；
2. 仲裁 `adopt_a` → 定稿值 = 標記員原答案，決策者 = 該仲裁者；
3. 仲裁 `adopt_b` → 定稿值 = 審核員修正值，或「無法判定」（來源為 `bypass` 時），決策者 = 該仲裁者；
4. 最終例外池收尾（FR-095）→ 定稿值 = 採 A／採 B／專案負責人自訂答案，決策者 = 該專案負責人。

經最終例外池「自資料集排除」處置之樣本 MUST NOT 產生定案答案、MUST NOT 進入匯出之最終答案集合，但 MUST 保留排除紀錄（處置者、理由、時間）。

#### Scenario: 定稿值可回溯至來源與決策者
- **GIVEN** 一筆 `official_run` 樣本經審核員 `修正`、仲裁者採 B 而定稿
- **WHEN** 讀取該樣本之定案答案
- **THEN** 定案值為審核員的修正值，且記錄之來源為仲裁 `adopt_b`、決策者為該仲裁者
- **AND** 另一筆經例外池「自資料集排除」之樣本不出現於最終答案集合，但其排除紀錄可讀出處置者與理由

### Requirement: FR-016A 審核修正與 Bypass 的稽核理由

Reviewer 於 `dry_run` 與 `official_run` 執行**直接修正**（`decision = modify`）或**決策為無法裁決**（`decision = bypass`）時，系統 MUST 強制填寫審計理由並記錄；`decision = approve` 時 MUST NOT 要求理由。

理由呈現契約：該 outKey 選定 `修正` 或 `無法裁決` 後，MUST 於同一 `ws-review-row` 內、作答面板之後展開必填理由欄（`<textarea required>`，帶 `data-outkey`）；選 `通過` 或取消決策時 MUST NOT 出現。FR-014N 合併 span 列之每個 outKey 各一欄。理由沿用既有審核提交持久化路徑——reviewer submission payload 於 `decisions` map 旁的 `reasons` map（`{ [outKey]: reason }`）——MUST NOT 另存第二份。

自 v5.0.0 起，本條原涵蓋的 `decision = reject`（退回）已隨退回機制移除（見 FR-014I 之 REMOVED）；既有已寫入的退回理由資料 MUST 原樣保留於歷程中，MUST NOT 被刪除或改寫。

#### Scenario: AC-3.48 退回展開必填理由欄並持久化
- **GIVEN** `role=reviewer` 進入可互動審核單位（任一 `run_type`）
- **WHEN** 對某 outKey 點擊 `修正` 或 `無法裁決`
- **THEN** 該列出現必填理由欄（帶 `data-outkey=<outKey>`）；改點 `通過` 或取消決策後該欄隱藏
- **AND** 填入理由並 reload 後理由與決策一併還原；送出後 reviewer submission `answers.reasons[<outKey>]` 等於所填理由

#### Scenario: AC-3.53 修正與 Bypass 皆須理由，通過不須
- **GIVEN** reviewer 對某 outKey 選擇 `無法裁決` 而未填理由
- **WHEN** 按下送出審核
- **THEN** 送出被阻擋並指名該 outKey 缺少理由，且不寫入任何審核狀態
- **AND** 同一單位另一個選 `通過` 的 outKey 不出現理由欄，亦不因缺理由而阻擋送出

### Requirement: FR-064 審核單位脈絡橫幅

workspace reviewer 視圖 MUST 於審核卡（FR-053）、仲裁版面（FR-061）或唯讀定稿卡（FR-094）上方渲染一個審核單位脈絡橫幅（testid `ws-review-unit-context`），逐審核單位依序呈現：

1. `run_type` 徽章——`dry_run` 為 `試標 R{round}`（`{round}` 取自該任務 `materializedRuns.dry_run.round`，缺值回退為 `1`），`official_run` 為 `正式標記`；
2. 該單位 `REVIEW_UNIT_STATUS` 之**三態** pill（`爭議中` 用 warning／error 色系、`已定稿` 用 success 色系、`待審` 用 info 色系）；標記員未提交時 pill 改顯示 `尚無標記提交`——但存在 FR-044a 遞補列（示範標記員答案）時視為已有標記員答案，pill MUST 顯示 `待審`，MUST NOT 落到 `尚無標記提交`（issue #910）；本判定 MUST 與 FR-053 空審核單位閘門之「真空」判定同源，MUST NOT 另行維護第二份判定；本 pill 之推導與工作區左欄清單審核單位狀態標籤（FR-056）MUST 共用同一推導，不得各自維護一份判定；
3. 開啟審核流程抽屜的觸發鈕（`ws-review-flow-trigger`，文案 `了解審核流程`／`Review flow`），抽屜（桌機靠右側邊、`< 768px` 全寬 modal，`ws-review-flow-drawer`）內渲染審核狀態軌；抽屜重用既有 `.modal-overlay` 覆蓋層與 `LabelSuiteModalFocus` 焦點陷阱，MUST NOT 另立第二套；
4. 可互動單位再於其後掛 FR-070 之審核說明 Tooltip。

**v5.0.0 移除**：`定稿門檻 {x} / {n} 位審核員` chip（`.rv-unit-threshold`）MUST 移除——一個審核單位恰有一位審核員（FR-093），沒有門檻可陳述。橫幅之主題界定維持「審核模型」（`run_type`、狀態、狀態軌），身分不屬之。

**狀態軌（抽屜內）**：MUST 依 FR-051 三態渲染，節點恰為 `待審`／`爭議中`／`已定稿`（`role="listitem"` 恰 3 個），MUST NOT 渲染 `已同意`／`已修改`。分軌版式維持——`待審` 之後分為全同軌（`通過` 直達 `已定稿`）與差異軌（`修正`／`無法裁決` → `爭議中` → `已定稿`），`已定稿` 自兩軌皆可達，軌別由資料層推導（`getReviewUnitLane()` 回傳 `'same'`／`'differing'`／`null`，與狀態推導共用同一述詞）。分支條件 MUST 以文字標籤（`.review-track-branch`，`data-branch` 攜帶條件鍵）渲染於連接線上，取值為 `審核通過`／`修正或無法裁決`／`仲裁後` 三者；分支標籤 MUST NOT 帶 `aria-hidden`，亦 MUST NOT 帶 `role="listitem"`。`done` 之語意為「位於該單位所屬軌上、且排在目前位置之前的節點」（路線，非訪問紀錄），MUST 以非顏色訊號（加粗）標示。`getReviewUnitStatus` 為 null 時 MUST NOT 渲染狀態軌，亦 MUST NOT 渲染觸發鈕。

#### Scenario: AC-4.37 橫幅子元素序列不因提示改變
- **GIVEN** 任一成立且可互動的審核單位以 reviewer 身分開啟
- **WHEN** 脈絡橫幅與角色相依行動提示皆渲染
- **THEN** 橫幅子元素依序恰為 `.rv-unit-chip.rv-unit-run`、`.rv-unit-state`、`.rv-flow-trigger`、`.rv-review-note`，`.rv-unit-threshold` 不存在
- **AND** `.rv-action-hint` 仍不在橫幅之內

#### Scenario: AC-4.55 橫幅無門檻 chip 且狀態軌為三節點
- **GIVEN** reviewer 開啟任一成立的審核單位
- **WHEN** 檢視橫幅並開啟審核流程抽屜
- **THEN** 橫幅子元素依序為 `run_type` 徽章、三態 pill、抽屜觸發鈕（可互動單位另有說明 Tooltip），且不存在任何定稿門檻元素
- **AND** 抽屜內狀態軌恰 3 個 `role="listitem"` 節點，分支標籤為 `審核通過`／`修正或無法裁決`／`仲裁後`

#### Scenario: 橫幅與左欄清單對示範列遞補單位顯示一致狀態（issue #910）
- **GIVEN** `role = reviewer` 開啟一個受審標記員從未儲存提交、但該樣本存在 FR-044a 遞補列（示範標記員答案）的審核單位
- **WHEN** 檢視工作區左欄清單該筆項目之狀態標籤與頂部審核單位脈絡橫幅之三態 pill
- **THEN** 兩者 MUST 皆顯示 `待審`，MUST NOT 出現左欄 `待審`、橫幅 `尚無標記提交` 並存的不一致
- **AND** 該單位仍無真實標記員提交（`getReviewUnitStatus` 為 null）時，空審核單位閘門（FR-053）之渲染分支不受本條影響——本條只改變狀態文字之顯示，不改變 FR-053 之雙條件判定式

### Requirement: FR-070 審核決策說明必須與真實效果一致

審核說明（`ws-review-note`）MUST 以 `design/system/MASTER.md` §Tooltip 規格呈現——預設隱藏、由真實 `<button>` 觸發、內容以 `role="tooltip"` 泡泡承載並由 `aria-describedby` 關聯，MUST NOT 使用原生 `title` 屬性。渲染位置為 FR-064 橫幅之內、緊接 `ws-review-flow-trigger` 之後（該單位無觸發鈕時為橫幅末項），於審核單位層級、審核卡堆疊之上、不在任何審核卡之內；每個審核單位恰渲染一次。

說明內容 MUST 逐字對應 `REVIEW_DECISIONS` 三向決策的真實效果，MUST NOT 描述任何已不存在的機制：

1. `通過` → 該項直接定稿（`official_run` 即成為最終答案）；
2. `修正` → 修正**不會立即生效**，該項進入爭議池待仲裁；
3. `無法裁決` → 同樣進入爭議池，仲裁者採 B 即定案為無法判定；
4. 兩種 `run_type` 皆**不退回重標**；
5. `dry_run` 之定稿不產生最終答案，只彙總一致性與被修改率。

說明 MUST NOT 出現「退回」「退回理由」「重新標記」「定稿門檻」「多數決」等字樣。

#### Scenario: AC-3.40 兩種 run_type 皆不出現理由可見性句
- **GIVEN** `role=reviewer`、`run_type=official_run`
- **WHEN** 檢視 `ws-review-note-bubble`
- **THEN** 文字不含「退回理由會顯示給標記員」；切換 `run_type=dry_run` 後同樣不含
- **AND** 兩種 `run_type` 之文案僅在「試標之定稿不產生最終答案」一句上不同，其餘逐字相同

#### Scenario: 說明文案與三向決策一致
- **GIVEN** reviewer 開啟一個可互動的審核單位
- **WHEN** 觸發審核說明 Tooltip
- **THEN** 泡泡逐項說明通過／修正／無法裁決三者的效果並載明兩種 run_type 皆不退回重標
- **AND** 泡泡文字不含「退回」「重新標記」「定稿門檻」「多數決」任一字樣

### Requirement: FR-083 送出阻擋同時指名缺理由之決策

送出驗證 MUST 為「每個 outKey 一筆決策，且 `修正` 與 `無法裁決` 者皆有非空理由（FR-016A），且 `修正` 者之修正後答案非空」。阻擋 toast MUST 指名全部阻擋之 outKey（多筆以「、」串接）：存在尚未決策者時沿用 `toastSelectDecision`；全部阻擋皆為缺理由時使用缺理由文案（鍵 `toastReasonRequired`，zh 文案 `請填寫以下輸出類型的審核理由：{list}`）。三類 outKey 之推導 MUST 與送出驗證共用同一份逐 outKey 判定，MUST NOT 另建第二份計算。

存在缺理由之決策時「送出審核」按鈕 MUST 帶 `data-submit-blocked="reason"` 以呈現停用外觀，且 MUST NOT 使用 `disabled` 或 `aria-disabled`（兩者皆會攔下點擊，使 toast 無法指名 outKey）。

**v5.0.0 修訂**：原文之判定對象「退回者」改為「`修正` 與 `無法判定` 者」——退回決策已移除（FR-092）；缺理由文案 MUST NOT 再出現「退回理由」字樣。

**v6.5.0 修訂**（issue #818）：逐 outKey 判定之回傳值集合自兩類阻擋擴為三類，新增「決策為 `修正` 但修正後答案為空」。此前該不變式僅存在於實作註解（「`values[outKey]` 只在 `修正` 時存在，`無法判定` 刻意不存值」），從未由任何條文強制，故一筆空的 `修正` 可被寫入儲存層，於資料層與 `無法判定` 無從區辨。
**v6.8.0 修訂**（issue #811）：缺理由文案之鍵名定為 `toastReasonRequired`、文案定為 `請填寫以下輸出類型的審核理由：{list}`。鍵名不含 `Reject`：退回決策已於 v5.0.0 移除，且與同一判定之第三類阻擋鍵 `toastAnswerRequired` 命名一致；文案保留「審核理由」以指明所缺之理由種類。判定對象之措辭同步為 `無法裁決`，送出驗證本身不變。

#### Scenario: AC-3.47 缺理由阻擋送出並指名 outKey
- **GIVEN** `role=reviewer` 對 `single_label` 點 `無法裁決` 但未填理由
- **WHEN** 點擊「送出審核」
- **THEN** 送出中止，toast 指名 `single_label` 且文案不含「退回」字樣，`ws-review-submit-btn` 帶 `data-submit-blocked="reason"`
- **AND** toast 文案為 `請填寫以下輸出類型的審核理由：single_label`
- **AND** 填入理由後該屬性移除，再送出成功

#### Scenario: AC-3.59 決策為修正但修正後答案為空時阻擋送出
- **GIVEN** `role=reviewer` 之審核單位中，某 outKey 已選 `修正` 且已填妥非空理由，惟其直接修正控件之當前答案為空
- **WHEN** 點擊「送出審核」
- **THEN** 送出 MUST 中止，該 outKey MUST 列入同一份阻擋清單並由 toast 指名，MUST NOT 有任何審核提交被寫入
- **AND** 此第三類阻擋 MUST 由既有逐 outKey 判定同一份推導產生，其回傳值集合 MUST 擴充而非於其外另設旁路；阻擋清單之唯一來源 MUST NOT 因本版新增而變成兩份
- **AND** 決策為 `無法裁決` 且答案為空時 MUST NOT 阻擋——`無法裁決` 依設計不寫入答案值，其空值為契約而非缺漏，兩者 MUST 分別判定

### Requirement: FR-092 審核員三向決策

審核員對審核單位每個 outKey 的決策 MUST 取自 `REVIEW_DECISIONS = approve | modify | bypass`（中文語彙 `通過`／`修正`／`無法裁決`），三者為全部出口，系統 MUST NOT 提供第四種決策：

1. `approve`（通過）：該 outKey 之定稿值即標記員原答案。該單位全部 outKey 皆為 `approve` 時，單位直接推導為 `已定稿`（FR-051）。
2. `modify`（直接修正）：審核員於作答控件上直接改答案，並依 FR-016A 填寫必填理由。**修正 MUST NOT 立即生效**——該 outKey 之差異成為爭議項（FR-059），單位推導為 `爭議中`，待仲裁裁定方定案。
3. `bypass`（無法裁決）：審核員表示自己無法裁決該 outKey，並依 FR-016A 填寫必填理由。該 outKey MUST 成為爭議項，其審核員側值 MUST 記為「無法判定」而非任何具體答案值——`bypass` MUST NOT 被推導為「與標記員答案相同」，亦 MUST NOT 使單位推導為 `已定稿`。

送出審核前，該單位每個 outKey MUST 恰有一筆決策（FR-044），未完成時 MUST 阻擋送出並指名缺項（FR-083）。

**v6.8.0 修訂**（issue #811）：**同字二義拆分**。「無法判定」原同時承載兩個概念，本版起分為兩套顯示語彙：

- **答案值**（標記員對某 outKey 宣告無法作答，`OutputAnswer.bypass`，由 `allow_bypass` 控制）：zh `無法判定 (Bypass)`／en `Unable to determine (Bypass)`。消費面為任務設定、task-new 預覽 chip、作答與修正面板、清單 pill。
- **決策值**（本條之 `bypass`）：zh `無法裁決`／en `Cannot adjudicate`。消費面為決策按鈕、歷程 `bypassed` 徽章（FR-086）、共用側欄快捷鍵總覽之 `B` 列（FR-054）、仲裁 B 選項（FR-061）、定稿卡微型歷程（FR-094）。

兩套語彙 MUST 各自恰有一個 i18n 來源，上列消費面 MUST 讀自該來源，MUST NOT 另行手寫副本；答案值與決策值 MUST NOT 互相取代。描述定案結果之「無法判定」（FR-061 採 B 之定案值、FR-063、FR-095、FR-097）描述的是定案後的值，不在本版拆分範圍。本版不改 `REVIEW_DECISIONS` 識別字、決策集合或任何行為。

**明確不存在的出口**：`reject`（退回）MUST NOT 存在於任何 `run_type`。審核員 MUST NOT 有任何使標記員重新標記該樣本的通道。

#### Scenario: 修正不立即生效而進入爭議池
- **GIVEN** 一個 `待審` 審核單位，其審核員將某 outKey 由 `neutral` 直接改為 `positive` 並填妥理由
- **WHEN** 送出審核
- **THEN** 該單位狀態為 `爭議中`，該 outKey 之定稿值尚未產生
- **AND** 該 outKey 出現於爭議池，A 側為 `neutral`、B 側為 `positive`

#### Scenario: Bypass 不得被視為同意
- **GIVEN** 一個審核單位之審核員對全部 outKey 選 `無法裁決` 並填妥理由
- **WHEN** 送出審核
- **THEN** 該單位狀態為 `爭議中`，MUST NOT 推導為 `已定稿`
- **AND** 每個 outKey 之爭議項 B 側呈現為「審核員：無法裁決」，而非標記員的原答案值

#### Scenario: 答案值與決策值各自同源且互不混用
- **GIVEN** 某標記員對一個 outKey 宣告 `無法判定 (Bypass)`，其審核員對同一 outKey 選 `無法裁決`
- **WHEN** 分別檢視審核卡、仲裁版面、歷程頁籤與共用側欄快捷鍵總覽
- **THEN** 標記員原答案處顯示 `無法判定 (Bypass)`，決策按鈕、仲裁 B 選項、`bypassed` 徽章與快捷鍵 `B` 說明皆顯示 `無法裁決`
- **AND** 切換為英文時分別為 `Unable to determine (Bypass)` 與 `Cannot adjudicate`，且兩組字串皆等於同一個 i18n 來源所定義之值

### Requirement: FR-073 審核員快速入口必須導向下一個可處理審核單位

`findNextActionableReviewUnit(task_id, run_type, reviewer_id)` MUST 沿用 FR-093 的有效分派名冊。位於任務 `arbiter_ids` 的保留仲裁者對新 `pending` 單位一律不是被指派人，因此該單位不得成為其第 1 順位候選；保留仲裁者只可依 FR-060 把自己未參與的 `disputed` 單位視為可處理。非仲裁審核員的 `pending` 候選與既有第 1 順位不變；issue #824 已黏住給現任仲裁者的歷史提交亦不得因此改派。

#### Scenario: 保留仲裁者不會被快速入口送進待審單位

- **GIVEN** reviewer C 位於任務 `arbiter_ids`，任務同時有一個指派給 reviewer W 的 `pending` 單位與一個 C 可仲裁的 `disputed` 單位
- **WHEN** 系統為 C 推導下一個可處理單位
- **THEN** 回傳該 `disputed` 單位
- **AND** 不得回傳指派給 W 的 `pending` 單位

#### Scenario: 快速入口以可處理單位為目標

- **GIVEN** 任務同時包含可處理與不可處理的審核單位
- **WHEN** 審核員由快速入口進入工作區
- **THEN** 目標必須由 `findNextActionableReviewUnit()` 依登入身分與既有優先序推導

### Requirement: FR-093 審核指派粒度

審核工作 MUST 由系統自動指派；`dry_run` 以樣本為粒度，`official_run` 以審核單位為粒度。新審核工作的有效分派名冊 MUST 為該任務 `reviewer_ids - arbiter_ids`，且集合差 MUST 保留 `reviewer_ids` 原順序。所有指定於 `arbiter_ids` 的人都 MUST 自新分派池排除，不得只保留第一位或依人員身分硬編例外。有效名冊中的新單位仍依既有位置性規則平均分配。

issue #824 的黏住規則 MUST 優先於本次保留規則：已有已提交審核的單位仍黏住原提交者，即使該人目前位於 `arbiter_ids`；該人依 FR-060 仍不得仲裁自己參與的單位。`arbiter_ids` 為空時，有效分派名冊 MUST 等於完整 `reviewer_ids`。所有 reviewer 同時也是 arbiter 的零分派池形狀由 companion change `validate-reviewer-arbiter-role-separation` 在 014 儲存時阻擋，annotation 不得私自把仲裁者加回分派池。

指派 MUST NOT 提供手動模式；每個審核單位恰有一位指派審核員。`dry_run` 採 per-sample 粒度，同一樣本的所有審核單位由同一人承接；`official_run` 採 per-unit 粒度。平均分配的差距規則只計尚無已提交審核的待分配池，已黏住單位不參與差距判定。示範種子同樣不得替一個 `official_run` 單位登錄多位 reviewer。黏住 MUST 由既有提交推導，不得另存第二份指派表，且不得依 task、sample 或帳號硬編分流。離冊審核員仍可唯讀檢視自己已提交的單位與歷程，但不得再送出審核；其仲裁資格仍依 FR-060 判定。

審核員以直接網址開啟未指派給自己的審核單位時，工作區 MUST 仍顯示樣本內容（標記員原答案），MUST NOT 渲染任何可送出的審核控件（含經鍵盤捷徑之送出路徑，FR-058），並 MUST 顯示「本單位未指派給你」之類的明確原因說明；此唯讀呈現與已定稿單位（FR-094）、離冊審核員之唯讀呈現同構，MUST NOT 實作為完全擋下的無權限頁——真正的存取控管屬於後端職責，非本規格範圍。本點之閘門判定 MUST 晚於仲裁分支與已定稿分支：具仲裁資格者之爭議單位入口，以及已定稿單位之唯讀卡（FR-094），皆優先於本點之唯讀呈現。本點之閘門 MUST 沿用既有之 `getAssignedReviewUnits()` 推導，MUST NOT 另立第二套指派判定。本版不涵蓋工作區左欄、上一筆／下一筆導覽之指派過濾（issue #956，待該變更落地後另行修訂本條）。

#### Scenario: 唯一仲裁者不再收到新審核單位

- **GIVEN** 任務 `reviewer_ids = [W, L, C, N]` 且 `arbiter_ids = [C]`
- **WHEN** 系統對尚無提交的審核單位建立自動指派
- **THEN** 新單位只在 W、L、N 間平均分配，C 的新分派數為 0
- **AND** 爭議由 W、L 或 N 的提交產生時，C 仍符合 FR-060 的非當事人條件並可仲裁

#### Scenario: 多位指定仲裁者全部保留

- **GIVEN** `reviewer_ids = [W, L, C, N]` 且 `arbiter_ids = [C, N]`
- **WHEN** 系統建立新指派
- **THEN** 有效分派名冊恰為 `[W, L]`，不得把 N 當作備用審核員加入

#### Scenario: 歷史黏住優先於新角色保留

- **GIVEN** C 過去已對單位 U 提交審核，之後 C 被加入 `arbiter_ids`
- **WHEN** 系統重新推導指派
- **THEN** U 仍指派給 C，不得改寫歷史責任鏈
- **AND** C 對 U 不具仲裁資格，但對自己未參與的其他爭議單位仍可仲裁

#### Scenario: 未指定仲裁者時不縮小審核池

- **GIVEN** `arbiter_ids` 為明確空陣列
- **WHEN** 系統建立新指派
- **THEN** 有效分派名冊等於完整 `reviewer_ids`
- **AND** 系統不得以全域示範名冊偷偷排除任何人

#### Scenario: 失敗的 v4 示範重播不得提交完成 marker

- **GIVEN** 瀏覽器仍有舊版 review-flow demo marker，且 v4 重播任一必要 seed 寫入失敗
- **WHEN** 頁面完成本次 migration 嘗試
- **THEN** 系統不得寫入 v4 完成 marker，亦不得移除舊 marker
- **AND** 下次載入必須重試，只有逐筆驗證 T014～T016 的必要標記提交、審核決策與仲裁票皆存在後，才可寫入 v4 marker 並移除舊 marker

#### Scenario: 試標以樣本為單位指派

- **GIVEN** 一份試標樣本由三位標記員各標一次，任務勾選了兩位審核員
- **WHEN** 系統建立審核指派
- **THEN** 該樣本產生的三個審核單位全部指派給同一位審核員

#### Scenario: 正式標記平均分派且不排除標記員本人

- **GIVEN** `official_run` 有 7 筆樣本、勾選 2 位審核員，其中一位同時是部分樣本的標記員
- **WHEN** 系統建立審核指派
- **THEN** 兩位審核員的分派筆數差距不超過 1
- **AND** 該審核員仍可能被指派到自己標記的樣本，系統不因此排除或重新分派

#### Scenario: 示範種子不得讓多位審核員並行審同一個正式標記單位

- **GIVEN** 任一 `run_type = official_run` 的示範審核單位種子列
- **WHEN** 讀取該列所登錄的審核員集合
- **THEN** 該集合 MUST 恰含一位審核員；含兩位以上者 MUST 視為與本條文直接衝突的失效種子並汰換
- **AND** 該單位若需示範定稿前的第二個判斷，MUST 循 FR-060 的仲裁路徑表達（一位審核員 + 一位非當事人仲裁者），MUST NOT 以並列多位審核員表達

#### Scenario: 已審單位不因名冊異動而改派

- **GIVEN** `official_run` 任務勾選了數位審核員，其中審核員 X 已對某審核單位提交審核
- **WHEN** 專案負責人變更 `reviewer_ids` 勾選（新增或移除一位審核員）後重新列舉指派
- **THEN** 該單位的指派審核員仍為 X
- **AND** 該單位若因仲裁而被推翻判定或已定稿，指派審核員亦仍為 X

#### Scenario: 離冊審核員對其審過的單位唯讀可見

- **GIVEN** 審核員 X 已對某審核單位提交審核，其後被移出該任務的 `reviewer_ids` 名冊
- **WHEN** X 開啟 `annotation-list` reviewer 清單與該單位的工作區
- **THEN** 清單仍列出該單位，工作區導覽仍含該單位，歷程仍可開啟
- **AND** 工作區不渲染任何可送出的審核控件，X 無法再對該單位提交審核決策

#### Scenario: 平均分配只約束尚未被審核的單位

- **GIVEN** `official_run` 共 6 個審核單位，其中 4 個已由同一位審核員提交審核，名冊勾選 3 位審核員
- **WHEN** 系統建立審核指派
- **THEN** 那 4 個單位全部仍指派給該提交者
- **AND** 其餘 2 個單位在 3 位審核員之間分配，該 2 筆的分派差距不超過 1，且 4 個已黏住的單位不計入差距判定

#### Scenario: 試標樣本內任一單位已被審核即整個樣本黏住

- **GIVEN** `dry_run` 某樣本由三位標記員各標一次，審核員 X 已對其中一個單位提交審核
- **WHEN** 系統重新建立審核指派（名冊已異動）
- **THEN** 該樣本的三個審核單位全部指派給 X

#### Scenario: 未指派審核員以直接網址開啟他人單位為唯讀

- **GIVEN** 審核單位 U 依 FR-093 指派給審核員 A，審核員 B 在同一任務的審核員名冊中但未被指派 U
- **WHEN** B 以直接網址開啟 U 的工作區
- **THEN** 畫面仍顯示 U 的標記員原答案（樣本內容）
- **AND** 審核卡不渲染任何可送出的控件，Ctrl/Cmd+Enter 送出捷徑亦不生效
- **AND** 畫面顯示「本單位未指派給你」之類的原因說明

#### Scenario: 指派閘門不擋掉仲裁入口

- **GIVEN** 審核員 C 在該任務的仲裁者名冊中（`arbiter_ids`）且對某爭議單位 U 未提交過審核（具 FR-060 仲裁資格），U 未依 FR-093 指派給 C
- **WHEN** C 開啟 U 的工作區
- **THEN** 渲染仲裁卡與可送出之仲裁控件
- **AND** C 不會看到「本單位未指派給你」的唯讀說明

### Requirement: FR-094 純文字定稿結果卡與微型衝突歷程

審核單位狀態為 `已定稿`（FR-051）時，工作區 MUST 以**純文字唯讀結果卡**（`ws-review-finalized-card`）呈現定案內容：

1. **純文字，不渲染控件**：每個 outKey 之定稿值 MUST 以純文字呈現，MUST NOT 渲染任何作答控件（含 `disabled` 狀態的控件）——disabled 控件在視覺上仍宣稱「這裡本來可以操作」，與全面唯讀的語意相衝突。
2. **微型衝突歷程**：卡上 MUST 附一行灰字微型衝突歷程（testid `ws-finalized-trace`），以緊湊符號串接該單位的責任鏈，例如 `歷程：標記 A ➔ 審核 B（修正）➔ 仲裁 B`；來源為 `bypass` 時該段呈現為 `審核 B（無法裁決）`（文案沿用決策值來源，FR-092 v6.8.0 修訂），經例外池收尾時末段為 `例外池 {處置}`。完整帳號 MUST 於 hover／focus 時展開（沿用 §Tooltip 規格，MUST NOT 使用原生 `title` 屬性）。
3. **由既有資料層推導**：微型歷程 MUST 由該單位既有的審核決策、仲裁裁定與例外池處置推導，MUST NOT 另存第二份，MUST NOT 引入任何任務 ID 或帳號的硬編碼判斷。

本條取代已移除之 FR-069（逐位審核員投票明細）：單一審核員模型下不存在「逐位投票」，責任鏈才是定稿後真正需要被看見的資訊。

#### Scenario: 定稿卡為純文字且附微型歷程
- **GIVEN** 一個經審核員修正、仲裁採 B 而定稿的單位
- **WHEN** 開啟該單位
- **THEN** 每個 outKey 之定稿值以純文字呈現，頁面上該卡片內不存在任何作答控件（含 disabled 者）
- **AND** 卡上出現一行微型歷程 `歷程：標記 A ➔ 審核 B（修正）➔ 仲裁 B`，hover 後展開對應的完整帳號

### Requirement: FR-095 最終例外池的逐筆收尾

仲裁裁定為 `reject`（兩者皆非，FR-061 第 3 點）的爭議項 MUST 落入該任務的**最終例外池**。最終例外池 MUST 提供專案負責人逐筆收尾的處置畫面，其處置動作 MUST 取自 `EXCEPTION_POOL_ACTIONS`：

1. `adopt_annotator`（採 A）：以標記員原答案定案，一鍵完成；
2. `adopt_reviewer`（採 B）：以審核員的答案（修正值或「無法判定」）定案，一鍵完成；
3. `custom_answer`（自訂答案）：展開**原始標記介面**——重用該輸出類型之 config-driven 作答控件（`OUTPUT_TYPE_REGISTRY` 驅動），MUST NOT 為例外池另建一套作答 UI；作答值 MUST 限於該輸出類型與其 config 所定義的合法答案空間，超出者 MUST 阻擋定案；定案理由**必填**；
4. `exclude_from_dataset`（自資料集排除）：該樣本不產生定案答案、不進入匯出之最終答案集合，但 MUST 保留排除紀錄（處置者、理由、時間）。

**run_type 分流（唯一一處）**：`custom_answer` MUST 僅於 `official_run` 提供；`dry_run` 之例外池 MUST NOT 渲染自訂答案入口——試標不產生定案答案，自訂答案在試標中沒有可寫入的標的。

處置完成後，`adopt_annotator`／`adopt_reviewer`／`custom_answer` 三者 MUST 使該爭議項解決；該單位全部爭議項解決後推導為 `已定稿`（FR-051）並流入標記結果；`exclude_from_dataset` 則使該單位以排除記號呈現且 MUST NOT 推導為 `已定稿`（FR-063）。

每個處置 MUST 寫入一筆歷程事件（`exception_resolved` 或 `excluded`，FR-086），攜帶處置者、動作、理由與時間。

**本版新增——最終例外處置畫面的外殼**：專案負責人視角之最終例外處置畫面 MUST 使用例外池專屬外殼，MUST NOT 沿用標記員工作區的樣本導覽外殼。具體而言：

1. **佇列即左側清單**：左側清單 MUST 列出該 `task_id × run_type` 之最終例外池**全部待處置項目**（每列一個待處置爭議項），並 MUST 與任務詳情頁的例外池計數推導自同一個來源，兩處 MUST NOT 對「還有幾項待處置」產生分歧。該清單 MUST NOT 列出一般標記樣本，亦 MUST NOT 對其列套用標記進度狀態（待標記／已儲存／已提交）。
2. **計數單位為例外項**：畫面進度 MUST 以待處置例外項為單位呈現，MUST NOT 使用標記提交進度（「{done} / {total} 已提交」）文案——專案負責人在本畫面不執行標記提交。
3. **無自動儲存狀態**：自動儲存狀態列 MUST NOT 呈現於本畫面。專案負責人於本畫面無草稿儲存路徑（其儲存與送出入口 MUST 隱藏），該狀態永遠不會前進，呈現即為誤導。
4. **仲裁理由就地可見**：每一待處置項 MUST 呈現使其落入例外池的仲裁理由與裁定者身分（FR-061 第 3 點之必填理由），使處置決定不需離開本畫面即可查證。
5. **排除動作的危險樣式**：`exclude_from_dataset` 之操作項 MUST 在視覺上與其餘三個採用型處置可區辨（危險樣式）——該動作不產生定案答案且不可於本畫面復原。

本段僅規範畫面外殼，MUST NOT 改變上列四個處置動作的集合、run_type 分流或各自的資料寫入契約。

#### Scenario: AC-4.56 正式標記例外池四動作可用
- **GIVEN** `official_run` 之最終例外池有一筆待處置項目，操作者為專案負責人
- **WHEN** 開啟該項目的收尾畫面
- **THEN** 提供採 A、採 B、自訂答案、自資料集排除四個處置
- **AND** 選自訂答案時展開該輸出類型的原始作答控件，輸入合法值並填妥理由後可定案；未填理由時定案被阻擋

#### Scenario: AC-4.57 試標例外池無自訂答案出口
- **GIVEN** `dry_run` 之最終例外池有一筆待處置項目
- **WHEN** 開啟該項目的收尾畫面
- **THEN** 僅提供採 A、採 B、自資料集排除三個處置
- **AND** 畫面上不存在自訂答案入口，亦不渲染任何作答控件

#### Scenario: AC-4.69 最終例外處置畫面不沿用標記員外殼
- **GIVEN** 某任務之 `official_run` 最終例外池有待處置項目，操作者以專案負責人身分開啟該任務的最終例外處置畫面
- **WHEN** 畫面完成渲染
- **THEN** 左側清單只列出該任務該 run_type 的待處置例外項，不列出該資料集的一般標記樣本，也不出現「待標記」之類的標記進度狀態
- **AND** 進度以待處置例外項為單位呈現，畫面上不存在「已提交」的標記提交進度文案
- **AND** 畫面上不存在自動儲存狀態列
- **AND** 每一待處置項同時呈現裁定「兩者皆非」的仲裁者與其理由
- **AND** `exclude_from_dataset` 的操作項帶有與其餘三個處置可區辨的危險樣式

### Requirement: FR-096 試標歷史回饋

標記員視角 MUST 提供**試標歷史回饋**列表，使標記員在「不退回重標」的前提下仍能自我對齊。列表逐筆呈現該標記員於已完成試標回合中的標記，並 MUST 包含：

1. 被修改筆數（該回合中該標記員被審核員修正或被仲裁改判的項目數）與其占比——MUST 逐回合分列計算，MUST NOT 將多個回合合併為單一分母；
2. 逐筆之「我的答案 → 定案結果」對照；
3. 定案來源（審核員通過／仲裁採 A／仲裁採 B／例外池收尾）與具名決策者；
4. 原因——審核員或仲裁者填寫的理由原文；理由中引用之標註指南段落 MUST 可點擊跳轉至該段落。

**揭露時機（Data Fairness NON-NEGOTIABLE）**：揭露閘門 MUST 以**回合**為單位判定，MUST NOT 以任務狀態整體判定。某試標回合 R{n} 之回饋 MUST 僅在 R{n} 全部標記提交、R{n} 轉入 `waiting_iaa_confirmation` 之後對標記員開放；開放後 MUST NOT 因任務建立 R{n+1}（任務狀態回到 `dry_run_in_progress`）或轉入 `official_run_in_progress`／`completed` 而收回。**進行中之回合** MUST NOT 對標記員揭露任何定案結果、他人答案或審核判斷——否則標記員可據以回頭對齊，直接污染同輪 IAA。無法判定所屬回合之提交，於任務處於 `dry_run_in_progress` 時 MUST 視為屬於進行中回合而不揭露（fail closed）。

本列表 MUST 僅呈現該標記員**本人**的標記與其定案結果，MUST NOT 呈現其他標記員的答案。

**本版修訂**（issue #834）：原條文以「任務轉入 `waiting_iaa_confirmation`」作為唯一開放條件，並將「回合進行中」等同於「任務狀態為 `dry_run_in_progress`」——此等同僅在單一試標回合下成立。`task-management/014-task-detail` 開放自 `waiting_iaa_confirmation` 建立 R{n+1} 後，任務狀態層級之閘門使已結束之 R{n} 回饋在 R{n+1} 進行期間整段消失，與本需求「自我對齊」之目的相反；而 R{n} 之揭露前提在 R{n+1} 建立前即已成立（`task-management/014-task-detail` FR-013 第 (6) 點）。本版將閘門改為逐回合判定；進行中回合不揭露之 Data Fairness 保證不變。

**本版修訂（issue #620，第 4 點之段落錨點與引用解析）**：上列第 4 點自 issue #596 落實以來僅屬**部分達成**——指南之 Markdown 標題不帶錨點，回饋列的連結只能指向該樣本工作區，無法定位到被引用的段落。本版將第 4 點之達成方式界定如下，三者 MUST 全數成立：

1. **錨點之存在與推導**：指南 Markdown 經渲染後，其每個標題（`#`～`###`，見 FR-020D）MUST 帶有一個錨點 `id`。該 `id` MUST 由標題文字推導，使同一份未經改寫的指南在每次渲染都得到相同的錨點；同一份指南內若有多個標題推導出相同 `id`，MUST 以序號後綴去重，使錨點在該份指南內唯一。MUST NOT 以標題在文件中的序位作為 `id` 的唯一來源——序位會因在其前方插入段落而整批位移，使既有引用指向錯誤段落。
2. **引用之記號與解析**：理由原文中以 `[[段落標題]]` 記號表達對指南段落之引用。回饋列呈現理由時 MUST 逐一將該記號渲染為可點擊連結，其目標 MUST 為該樣本之標記工作區網址加上第 1 點所述之錨點。指南中不存在對應標題時 MUST 退化為純文字呈現該標題，MUST NOT 產生指向不存在錨點的連結，亦 MUST NOT 使該筆理由無法呈現。
3. **跳轉後之定位**：自該連結進入工作區時，系統 MUST 開啟指南並定位至被引用之段落，且 MUST 以可見方式標示該段落，使標記員知道自己落在哪一段——僅捲動而無標示不足以滿足本點。

**已知上限**：錨點由標題文字推導，故改寫標題會使既有理由中的引用失效並依第 2 點退化為純文字。此為刻意取捨——標題改名是真實的內容變更，引用隨之失效是正確行為；本條不要求引用跨標題改名存活。

#### Scenario: AC-1.27 回合結束後才開放試標歷史回饋
- **GIVEN** 某試標回合仍在進行中（任務狀態為 `dry_run_in_progress`）
- **WHEN** 標記員嘗試進入試標歷史回饋
- **THEN** 該回合之資料不揭露，畫面說明需待該回合結束
- **AND** 任務轉入 `waiting_iaa_confirmation` 後，同一標記員可看到被修改筆數、逐筆「我的答案 → 定案結果」、定案來源與具名決策者、以及理由原文與可跳轉的指南段落引用，且看不到其他標記員的答案

#### Scenario: AC-1.28 下一回合進行中仍可見已結束回合之試標歷史回饋
- **GIVEN** 某 `dry_run` 任務之 R{n} 已轉入 `waiting_iaa_confirmation`，其後負責人建立 R{n+1}，任務狀態回到 `dry_run_in_progress`，且同一標記員於 R{n} 與 R{n+1} 皆有已提交之標記
- **WHEN** 該標記員進入試標歷史回饋
- **THEN** R{n} 之回饋 MUST 照常呈現，其被修改筆數與占比 MUST 僅以 R{n} 之提交計算
- **AND** R{n+1} 之任何提交、定案結果與審核判斷 MUST NOT 出現在回饋中，且畫面 MUST 說明 R{n+1} 需待該回合結束
- **AND** 任務轉入 `official_run_in_progress` 後，已結束之各試標回合回饋 MUST 仍可見

#### Scenario: AC-5.5 指南 Markdown 之標題帶有可跳轉的穩定錨點
- **GIVEN** 某任務之 `guidelineFiles` 含一份帶多個標題的 Markdown 指南
- **WHEN** 標記員於工作區開啟該指南
- **THEN** 每個標題 MUST 帶有由其標題文字推導之錨點 `id`
- **AND** 重複渲染同一份未經改寫的指南 MUST 得到相同的錨點
- **AND** 兩個文字相同之標題 MUST 取得互不相同的錨點

#### Scenario: AC-1.34 試標歷史回饋之理由引用可跳轉並定位到該段落
- **GIVEN** 某已結束試標回合中，標記員某筆標記被審核員修正，其理由原文含 `[[段落標題]]` 形式之指南段落引用，且該標題存在於該任務之指南中
- **WHEN** 該標記員檢視試標歷史回饋之該筆理由
- **THEN** 該引用 MUST 呈現為可點擊連結，其目標為該樣本工作區網址加上該段落之錨點
- **AND** 點擊後進入工作區時 MUST 開啟指南、定位至該段落並以可見方式標示之
- **AND** 若引用之標題不存在於該任務之指南中，該引用 MUST 退化為純文字，不得產生連結、亦不得使該筆理由無法呈現

### Requirement: FR-097 歷程事件的責任鏈加詳

右欄 `歷程` 頁籤之事件卡片 MUST 逐卡加詳，使「標記 → 審核 → 仲裁 →（必要時）例外池」的責任鏈可從歷程本身讀出。每張卡片 MUST 呈現：

1. **動作**：`HISTORY_ACTIONS` 之語意徽章與其中文語彙（FR-086）；
2. **值變化**：該事件造成的答案變化，逐 outKey 呈現「前值 → 後值」；`bypassed` 呈現為「→ 無法判定」；`adjudicated` 呈現所採一側及其值；`excluded` 無值變化而呈現排除記號；
3. **耗時**：沿用 FR-088 之 `lead_time` 與其角色可見性規則，本條 MUST NOT 放寬該可見性；
4. **決策者**：真實 `actor_id` 與其角色（沿用 FR-050）。

卡片版式 MUST 沿用既有「說明與檔案｜歷程」頁籤之卡片式設計，MUST NOT 另建第二套版式。全部欄位 MUST 由既有歷程事件推導（FR-016B、FR-087、FR-088、FR-089），MUST NOT 另存第二份；受 FR-062 盲審隔離與 FR-090 分層遮蔽約束。

#### Scenario: 歷程呈現完整責任鏈
- **GIVEN** 一筆經標記員提交、審核員修正、仲裁者採 B 而定稿的樣本
- **WHEN** reviewer 檢視該樣本 `歷程` 頁籤
- **THEN** 清單依序含 `submitted`／`modified`／`adjudicated` 三張卡片，各自呈現動作徽章、逐 outKey 前值 → 後值、耗時與具名決策者
- **AND** 該審核員尚未提交的草稿事件不出現

### Requirement: FR-024A sequence_tagging 的 annotator 標記介面

當 `outputs[]` 含 `sequence_tagging` 時，Annotator 工作區 MUST 顯示帶「原始文本」標題的、**未經任何切分**的原始文本作為單一圈選面；使用者拖曳圈出一段文字後點選標籤類型完成標記，產出 `spans[]`（`{ start, end, label }`，`start`／`end` 為相對於原始文本的字元 offset，`end` 不含端點）。已標記 span MUST 以對應標籤顏色底線呈現，並提供含類型徽章、文字、字元位置與刪除按鈕的已標記清單。

`sequence_tagging` 的 span MUST NOT 相交（型別不變式，見 `task-management/013-task-new` 的 `SPAN_OVERLAP_POLICY_BY_OUTPUT_TYPE`）；相交落點 MUST 給出即時可見的拒絕回饋且不建立該 span，相鄰但不相交（前一 span 的 `end` 等於新 span 的 `start`）MUST 被允許。

**下列 v5.0.0 以前的機制隨 token 座標系一併移除**，MUST NOT 於工作區任何路徑保留：Token 網格；「先依 `tagging_scheme` 選定完整 tag 再點擊 Token」互動；依方案產生的完整 tag 按鈕列（`B-X`／`I-X`／`E-X`／`S-X`／`O`）；依前一 Token 標籤自動推導 `B-`／`I-` 前綴的邏輯。`tagging_scheme` 自 013 設定契約移除後，工作區 MUST NOT 再讀取或呈現該欄位；BIO 序列改由匯出層自 `spans[]` 決定性推導。

`allow_bypass` 的行為不變：Bypass 仍為整張輸出卡片層級的「無法判定」宣告，與 span 標記互斥。

#### Scenario: AC-2A.5 annotator 以拖曳圈選完成 sequence_tagging 標記
- **GIVEN** `outputs[]` 含 `sequence_tagging`，annotator 開啟工作區某筆樣本
- **WHEN** 該輸出卡片渲染
- **THEN** 顯示帶「原始文本」標題的未切分文本，且畫面上不存在 Token 網格、不存在任何 `B-`／`I-`／`E-`／`S-` 前綴的 tag 按鈕、不存在「標記方案」相關呈現
- **WHEN** annotator 於文本上拖曳圈出一段文字並點選標籤類型
- **THEN** 新增一筆 `{ start, end, label }`，該範圍以對應標籤顏色底線呈現，已標記清單新增一列（類型徽章、文字、字元位置、刪除按鈕）
- **WHEN** annotator 拖曳圈出與既有 span 相交的範圍並點選標籤類型
- **THEN** 給出可見的拒絕回饋，該 span 不被建立，已標記清單筆數不變
- **AND** 改為圈出與既有 span 相鄰但不相交的範圍時，該 span 正常建立

### Requirement: FR-024A-1 sequence_tagging 的選取吸附與降級

`sequence_tagging` 工作區 MUST 依任務 config 的 `snap_unit`（`SPAN_SNAP_UNITS = character | word`）決定拖曳放開時的落點吸附行為：`character` 不吸附，`word` 將起訖點各自吸附至最近的詞界。**吸附只影響滑鼠落點，不影響儲存值**——兩種設定產出的資料結構完全相同。

詞界判定 MUST 使用前端 `Intl.Segmenter`（`granularity: 'word'`），MUST NOT 依賴後端 tokenizer、MUST NOT 於任務建立時凍結任何 engine 或 version。

**v5.0.0 以前的「後端權威 Token 邊界」契約整組作廢**（原 ADR-031：tokenization 為 annotation 資料契約的一部分、engine/version 依任務凍結、workspace 不得自行重新切分）。span 的儲存值是使用者實際圈選的字元 offset，不存在需要由單一權威來源裁定的切分結果，因此 MUST NOT 於任何路徑保留凍結 engine／version 的欄位或校驗。

執行環境缺少 `Intl.Segmenter` 時，該標註者端 MUST 退回「不吸附」行為並於標記卡顯示一行提示，MUST NOT 因此改寫任務設定值。

**吸附能力差異不影響資料可比性（本版新增規則）。** 同一任務的不同標註者可能在吸附能力不同的執行環境作業，這在 v5.0.0 以前不可能發生——當時 token 邊界由後端統一供給。因吸附只影響滑鼠落點、不進入資料，降級標註者產出的 `spans[]` 與其他標註者完全相容：系統 MUST 照常將其答案納入 IAA、共識與差異比對計算，MUST NOT 因其吸附能力而標記為可疑、降權或排除，MUST NOT 於事後對其 span 邊界做任何「對齊詞界」的修正。標記卡的降級提示 MUST 定位為操作手感說明，MUST NOT 呈現為資料品質警告。

#### Scenario: 吸附只影響落點，降級標註者的答案照常參與計算
- **GIVEN** 任務 config 的 `snap_unit` 為 `word`，樣本文本為「台積電董事長今天出席」
- **WHEN** annotator 自「事」拖曳至「長」放開並點選標籤類型
- **THEN** 起訖點吸附至詞界而產生涵蓋「董事長」的 `{ start: 3, end: 6 }`
- **WHEN** 執行環境不提供 `Intl.Segmenter`
- **THEN** 該標註者端退回不吸附（拖曳到哪裡就是哪裡），標記卡顯示一行說明目前不吸附的提示
- **AND** 任務 config 的 `snap_unit` 值維持 `word` 不變
- **WHEN** 同一任務由吸附可用的標註者 A 與降級的標註者 B 各自完成標記，系統計算該樣本的 IAA 與差異比對
- **THEN** A 與 B 的答案皆完整納入計算，B 的答案未被標記為可疑、未被降權、未被排除
- **AND** B 的 span 邊界維持其實際圈選的 offset，未被事後對齊至任何詞界

### Requirement: FR-024A-2 sequence_tagging 提交前的 span 合法性驗證

`sequence_tagging` 提交前 MUST 驗證每筆 span 的合法性：`start >= end`、`start < 0`、或 `end` 超出原始文本長度者為錯誤，MUST 阻擋提交並顯示可定位的錯誤。

**v5.0.0 的「標記 tag 數量必須等於正式 Token 數量、否則阻擋提交」硬約束移除**——span 模型下不存在需要對齊的 Token 陣列，該驗證已無對象。同理，「可見預標記數量與正式 Token 數量不一致時阻擋提交」的邊界情境一併移除；預標記 span 依字元 offset 直接落位，超出範圍者被拒絕並列出，其餘正常載入。

未標記任何 span 且未宣告 Bypass 時 MUST 阻擋提交（沿用既有的空答案阻擋語意），建立任一 span 後該阻擋 MUST 解除。

#### Scenario: 空 span 阻擋提交、越界預標記為錯誤
- **GIVEN** `outputs[]` 含 `sequence_tagging`，annotator 尚未建立任何 span 且未宣告 Bypass
- **WHEN** annotator 嘗試提交
- **THEN** 提交被阻擋並顯示可定位的錯誤
- **WHEN** annotator 圈選任一段文字並套用標籤類型
- **THEN** 該阻擋解除，提交可進行
- **WHEN** 樣本的預標記含一筆 `end` 超出原始文本長度的 span
- **THEN** 該筆被拒絕並列於錯誤清單，其餘預標記正常落位，且畫面不出現任何「標記數量與 Token 數不一致」錯誤

### Requirement: FR-024A-3 sequence_tagging 標記結果 payload

`sequence_tagging` 標記結果 payload MUST 包含 `spans[]`（`{ start, end, label }`）、`snap_unit`（`SPAN_SNAP_UNITS` 之一）、`bypass`、`version`；annotator 可見資料 MUST NOT 包含 ground truth。

**`tokens[]`、`tags[]`、`scheme`、`unit` 四個欄位移除**：前二者是 token 座標系的儲存形式，`scheme` 隨 `tagging_scheme` 移至匯出層，`unit` 更名為 `snap_unit` 以反映它只影響落點而非資料。BIO 序列 MUST NOT 出現於 payload，其推導契約由 `dataset/017-dataset-analysis-detail` 定義。

#### Scenario: 提交 payload 為 span 形狀
- **GIVEN** annotator 於 `sequence_tagging` 卡片建立了 2 筆 span
- **WHEN** 提交該筆樣本
- **THEN** payload 含 `spans[]`（2 筆 `{ start, end, label }`）、`snap_unit`、`bypass`、`version`
- **AND** payload 不含 `tokens[]`、`tags[]`、`scheme`、`unit`，亦不含任何帶 `B-`／`I-` 前綴的值
- **AND** annotator 可見資料不含 ground truth

### Requirement: FR-052 標記員與審核員答案的差異比對

標記員與審核員答案的差異比對 MUST 逐輸出類型定義，且在共通的 CompactAnswer 形狀上運作：`multi_label`、`sequence_tagging`、`entity_recognition`、`relation_identification` 以合併鍵做順序無關的集合比對（沿用 `CONSENSUS_MERGE_KEYS` 的比對語意，僅存在於單邊者列為差異項）；`multi_dim` 逐維度比對；`single_label` / `single_dim` / `free_text` 為單值比對。`single_dim` 與 `multi_dim` 一律採**嚴格相等**，不得套用 `DIM_CONSENSUS_TOLERANCE`。比對結果 MUST 同時提供「是否相同」與「差異項清單」。

**`sequence_tagging` 由「逐 token 位置比對」改為集合比對。** CompactAnswer 的 `sequence_tagging` 形狀自本版起為 `{ text, label, start, end }`（原為 `{ text, tag }`），合併鍵為 `start + end + label`。三項變更理由：

1. span 模型下不存在可逐位比對的 token 陣列；
2. 逐 token 比對會把「一個 n 字實體被改了型別」計為 n 個差異項，集合比對計為「原項移除 + 新項新增」共 2 項，與 `entity_recognition` 對同一種更動的計法一致；
3. `tag` 更名為 `label` 是因為值不再帶 `B-`／`I-`／`E-`／`S-` 前綴。

`text` 為呈現用的去正規化欄位，MUST 等於原始文本 `[start, end)` 的切片；**`(start, end)` 為權威**，消費端於兩者不一致時 MUST 以 offset 為準，MUST NOT 以 `text` 反向修正 offset。保留 `text` 的理由是審核列表與審核卡的既有呈現路徑直接讀該欄位顯示標記文字，而其資料列未必攜帶原始文本。

**已知落差（範圍收斂）**：`CONSENSUS_MERGE_KEYS` 對 `entity_recognition` 定義的合併鍵為 `start + end + type`，但其 CompactAnswer 不攜帶位置資訊，原型實作退而以 `text + type` 為鍵。本版使 `sequence_tagging` 的 CompactAnswer 確實攜帶位置，因此其合併鍵 MUST 使用完整的 `start + end + label`，MUST NOT 退化為文字比對；`entity_recognition` 的該項落差不在本版範圍。

#### Scenario: AC-4.11 sequence_tagging 差異比對以 span 合併鍵運作
- **GIVEN** 某標記員的 `sequence_tagging` 答案含一筆 `{ text: '台積電', label: 'ORG', start: 0, end: 3 }`
- **WHEN** 審核員將該筆的類型改為 `PRODUCT` 後送出審核
- **THEN** 差異比對回報「不相同」，且差異項清單為 2 項（`ORG` 該項移除、`PRODUCT` 該項新增），MUST NOT 因該實體佔 3 個字元而回報 3 項
- **WHEN** 審核員未更動任何 span 即送出
- **THEN** 差異比對回報「相同」，差異項清單為空，且比對過程不依賴標記文字的左至右依序消耗

### Requirement: FR-024L Reviewer 審查呈現的逐型別對應規則

Reviewer 審查呈現 MUST 依 `outputs[].type` 對應下列規則之一：`single_label` / `multi_label` / `sequence_tagging` 顯示**標籤**出現次數分布；`single_dim` / `multi_dim` 顯示 `mean`/`std`/`±1.5std` 分數統計；`entity_recognition` 顯示 entity diff；`relation_identification` 顯示 triple 清單（monospace，一筆一行）；`free_text` 顯示標記員文字內容比對。此對應規則由 workspace 端呈現層維護，MUST NOT 逐任務硬編分支。

`sequence_tagging` 的統計主體由「帶 BIO 前綴的 tag」改為「不帶前綴的標籤類型」，因此其實體數量統計與 `entity_recognition` 一致——同一個 n 字實體計為 1，MUST NOT 因方案前綴而拆成多筆。

#### Scenario: AC-3.12 標記分布統計盒以標籤類型計數
- **GIVEN** 標記分布統計盒（`ws-review-stats`）渲染一筆 `sequence_tagging` 輸出，某標記員標了 2 個 `ORG` 實體與 1 個 `PER` 實體
- **WHEN** reviewer 檢視統計文字
- **THEN** 顯示 `ORG×2 · PER×1`（依出現次數降冪、以 `·` 串接）
- **AND** 統計文字不含任何 `B-`／`I-`／`E-`／`S-` 前綴，且不因某實體橫跨多個字元而重複計數
- **AND** 已標記為 Bypass 的標記員結果不計入統計

### Requirement: FR-098 關係識別答案之 span 起訖攜帶與逐實體差異

**FR-098**（本版新增，對應 AC-2.22、AC-2.23、SC-004X，issue #590）：**關係識別答案之 span 起訖攜帶與逐實體差異**。

1. **引擎快照契約**：`relation_identification` 之引擎快照 `previewTriples`，每筆三元組 MUST 於既有 `subj`／`rel`／`obj` 顯示字串之外，另行攜帶機器可讀的主體與客體起訖四欄位 `subjStart`、`subjEnd`、`objStart`、`objEnd`，型別為整數或 `null`，語意為原始文本之半開區間 `[start, end)`，與 `sequence_tagging` 之 `spans[]` 同一座標系（FR-024A-3）。既有顯示字串 MUST 維持原樣，FR-014L 所定義之 `relation-triple-row` 呈現契約不因本條改變。

2. **來源範圍**：起訖之來源僅限**本身已攜帶位置資訊**的兩種輸入形狀——(a) 工作區關係建構器之互動標記，其主體與客體槽位由既有的實體命中查找取得 `start`／`end`；(b) 資料集匯入之物件形狀三元組，其 `entity1`／`entity2` 物件已帶 `start`／`end`。

3. **禁止推測（硬規則）**：來源資料未攜帶位置資訊時，四個欄位 MUST 為 `null`。MUST NOT 以答案字串回原始文本做字串比對推得 offset：同一詞在文本中出現多次時比對會選到錯誤的出現位置，而該錯誤不會產生任何錯誤訊號，等同於把「資料缺失」靜默換成「錯誤資料」；此為本條之硬規則，不得以「多數情況正確」為由放寬。

4. **CompactAnswer 往返對稱**：`relation_identification` 之 CompactAnswer 自 `{ subj, rel, obj }` 擴充為 `{ subj, rel, obj, relType, subjStart, subjEnd, objStart, objEnd }`。序列化端（引擎快照 → CompactAnswer）與回填端（CompactAnswer → 引擎快照）MUST 對稱保留新增的這五個欄位——任一端遺漏，即使上游已產生起訖，位置維度亦到不了差異比對層。`relType` 之所以必須隨往返存活，是因為 §5 之 `relationKey` 於 `relType` 非空時優先取 `relType`：若 CompactAnswer 不攜帶 `relType`，回填後的引擎快照該欄位恆為 `null`，§5 的優先分支在此路徑上永遠走不到，§5 自陳之殘留碰撞率亦無從下降。`relType` 型別為非空字串或 `null`，來源僅限引擎快照既有之同名欄位（互動標記之關係型別選擇器所寫入），MUST NOT 由 `rel` 顯示字串推導或以任何方式猜測。既有僅含三鍵之 CompactAnswer MUST 可讀，缺鍵一律視同 `null`，不得因缺鍵而中斷渲染或往返。

5. **逐實體差異之索引鍵**：`relation_identification` 註冊為具位置資訊之類型後，其 span 抽取 MUST 只產出主體與客體兩個實體——`rel` 為關係型別或觸發詞的顯示欄位，不是原始文本上的可對齊 span，MUST NOT 抽取為實體。每個 span 之 label MUST 為 `role + '@' + relationKey`，其中 `role` 取值為 `subj` 或 `obj`，`relationKey` 於 `relType` 非空時取 `relType`、否則取 `rel` 顯示字串。**殘留碰撞（誠實聲明，非已解決）**：既有索引鍵形狀為 `start + '\u0000' + label`，同起點且同 label 之 span 會互相覆寫；把關係型別編入 label 只降低碰撞率、**不消除碰撞**。仍會碰撞的形狀是「同一實體在同一關係型別下參與多筆三元組」，例如同一主體同時有 `causes → 淤滯` 與 `causes → 血栓` 兩筆。其使用者可見表現為兩項：(a) 該組三元組於歷程差異中只會列出其中一筆；(b) 被覆寫的那一筆若只發生邊界變更，會在差異中呈現為「未變更」而非邊界變更。此外，`relType` 為空而以 `rel` 顯示字串充當 `relationKey` 時，觸發詞本身的邊界變動會使該筆三元組的主體與客體同時被判為「刪除＋新增」而非「邊界變更」。本條 MUST NOT 改以三元組序號或陣列索引為鍵——序號會使「審核員重排三元組順序」被判為全部三元組皆變更，製造不存在的差異，其代價高於上述碰撞。

6. **逐快照對回退**：歷程差異的分派一旦判定某輸出類型屬具位置資訊之類型，即不再有純值遞補路徑。因此 `relation_identification` 之逐實體差異MUST 以**該次比對的兩份快照**為單位判定：當前後兩份快照**皆已載有該輸出鍵之答案**時，僅當兩份皆至少產出一筆帶起訖之三元組，才走逐實體差異；否則該次比對 MUST 回退為純值比對（沿用 FR-087 既有之遞補行為）。**豁免（明文）**：某一側完全沒有該輸出鍵之答案（該快照於該鍵為空）時，屬 FR-087 既有之「全新內容」情形，而非本點所要處理的「有答案但缺位置」情形，MUST NOT 因此回退為純值——此情形沿用既有之逐實體新增呈現，否則帶起訖的全新答案會被壓成單行字串，反而失去本條所要建立的逐實體視圖。該側三元組若本身不帶起訖，其四個位置欄位依第 3 點仍 MUST 為 `null`，不得推測。缺少本點時，第 7 點所列不帶位置資訊的來源形狀會從「今日可用的純值差異」退化為「空差異」，而空差異會被讀成「未變更」——那比現況更差，因此本點是本條落地的前置條件而非優化項。

7. **已知落差（範圍收斂）**：下列兩種來源形狀之三元組於原型階段本身即不攜帶位置資訊，本版**不**為其補齊——(a) gold 形狀，其 `subj`／`rel`／`obj` 為匯入資料中的純字串；(b) 內建示範資料之字串串接形狀，其 `subj`／`obj` 由多個欄位串接而成、並非原始文本之連續子字串，本無對應 span 可言。此兩形狀依第 3 點 MUST 維持 `null`，並依第 6 點回退為純值比對。其位置維度之補齊，待來源資料本身攜帶起訖後另案處理；追蹤出口為 issue #738（承接本點落差，於 issue #590 隨本變更關閉前開立）。處置方式沿用 FR-052 之「已知落差」先例。

#### Scenario: AC-2.22 互動標記之關係三元組於歷程差異逐實體呈現

- **GIVEN** 某樣本之 `relation_identification` 由工作區關係建構器互動標記產生，其前一筆快照有 2 筆三元組、後一筆有 3 筆，且其中一筆的主體 span 邊界由 `[0,3]` 改為 `[0,5]`
- **WHEN** 檢視後一筆事件之差異區塊
- **THEN** 差異逐實體列出，包含新增與邊界變更（列出變更前後 span），而非整段答案字串的替換
- **AND** 未變動的三元組不出現在差異清單中
- **AND** 每筆三元組的顯示字串與標記畫面所見一致，不因本條而改變

#### Scenario: AC-2.23 無位置資訊之來源形狀回退純值比對且不推測 offset

- **GIVEN** 某樣本之 `relation_identification` 來自 gold 純字串形狀或內建示範資料之字串串接形狀，其三元組不攜帶任何起訖
- **WHEN** 檢視該樣本相鄰兩筆事件之差異區塊
- **THEN** 該次比對回退為純值比對，差異照常呈現，不得為空差異
- **AND** 該三元組之 `subjStart`、`subjEnd`、`objStart`、`objEnd` 皆為 `null`
- **AND** 系統不得以答案字串回原始文本做字串比對推得任何 offset

#### Scenario: SC-004X 關係識別位置維度之可用性與誠實邊界

- **GIVEN** 工作區互動標記與物件形狀資料集匯入兩種來源之關係識別樣本
- **WHEN** 逐樣本檢視其歷程差異
- **THEN** 這兩種來源之關係識別樣本 100% 走逐實體差異，其起訖於 CompactAnswer 往返後 100% 與提交當下一致
- **AND** gold 純字串與字串串接兩種來源之樣本 100% 回退為純值比對，且其推測而得的 offset 為 0 筆
- **AND** 同一實體於同一關係型別下參與多筆三元組時之殘留碰撞已於 FR-098 第 5 點明載，不得對外宣稱位置維度已完全防碰撞

### Requirement: FR-099 審核單位送出後的自動前進

未使單位定稿的成功送出仍 MUST 共用 `findNextActionableReviewUnit()`。審核員送出後既有 `pending` 優先序不變；仲裁者送出後因 FR-093 角色保留而不擁有任何新 `pending` 單位，故系統 MUST 在其具資格的 `disputed` 候選中選擇下一個目標。若 `兩者皆非` 使目前單位維持 `disputed` 且沒有列舉順序更前的其他可仲裁爭議，目前單位 MAY 再次成為目標，以保留 FR-065 改票能力。系統不得以全任務存在其他 reviewer 的 `pending` 單位為由，把仲裁者導入未指派的審核工作。

1. **單一目標來源**：審核決策與仲裁送出 MUST 共用 `findNextActionableReviewUnit(task_id, run_type, reviewer_id)`，其列舉、優先序與資格判定沿用 FR-073，MUST NOT 改用標記端 `findNextPendingUnit()` 或另立第二套判定。
2. **頁內切換與網址同步**：取得下一個單位後 MUST 在同一工作區切換，並同步 `sample_id` 與 `annotator_id`；不得以導向新工作區網址代替。網址同步由 FR-057 單一 writer 承擔。
3. **全域最高優先序**：目標為所有可處理單位中優先序最高且列舉最前者，不採自目前位置向後繞行。
4. **不得以排除目前單位的特例取代資格判定**：審核送出後，提交者因已成為該單位當事人而自然不具仲裁資格；仲裁送出 `reject` 後未寫入 reviewer bucket，若單位仍爭議且無更前候選，目前單位仍可再次成為目標。指定仲裁者不擁有其他 reviewer 的 `pending` 指派，該類單位不得成為其目標。
5. **無可處理項目**：推導為空時 MUST 經既有 `buildListReturnUrl()` 返回 `annotation-list`，保留 FR-081 檢視狀態與 FR-049 身分參數，附 `notice=no_actionable_review`，且不得攜帶 `sample_id` 或回退至唯讀單位。
6. **驗證失敗不導覽**：被 FR-083、FR-089、空單位或已定稿守衛阻擋而未寫入的送出不得切換或導頁。
7. **定稿送出留在原單位**：送出使單位定稿時 MUST 就地重渲染 FR-094 唯讀定稿卡，不得前進或導頁。
8. **Generalization-First**：目標推導不得對任何 task id、sample id 或帳號硬編例外。

#### Scenario: 仲裁送出後忽略屬於審核員的待審單位

- **GIVEN** reviewer C 是保留仲裁者，正在處理爭議單位 D，且任務另有指派給 reviewer W 的 `pending` 單位 P
- **WHEN** C 對 D 送出 `兩者皆非`，D 仍為 `disputed`
- **THEN** 下一個可處理單位不得是 P
- **AND** 若沒有其他更前的可仲裁爭議，工作區停留於 D

#### Scenario: AC-3.55 未定稿的審核送出成功後自動前進至下一個可處理審核單位

- **GIVEN** `role = reviewer` 進入某任務一個 `待審` 審核單位，且該任務尚有其他 `待審` 單位
- **WHEN** 成功送出一次未使單位定稿的審核決策
- **THEN** 工作區 MUST 於同一頁面切換至 `findNextActionableReviewUnit()` 選出的單位，網址之 `sample_id` 與 `annotator_id` MUST 同步為該單位，且不得發生跳離工作區的導頁
- **AND** 剛送出的單位不得成為切換目標；無可處理單位時返回清單並保留檢視狀態與 `notice=no_actionable_review`
- **AND** 定稿或驗證失敗的送出不得前進

#### Scenario: AC-3.56 仲裁送出共用同一套前進規則

- **GIVEN** `role = reviewer` 且依 FR-060 具仲裁資格，進入某 `爭議中` 單位之仲裁版面
- **WHEN** 成功送出未使單位定稿的仲裁
- **THEN** 前進行為 MUST 與審核送出共用同一個目標推導函式與返回網址建構器
- **AND** 指定仲裁者不得前進至其他 reviewer 的 `pending` 單位；目前單位仍可處理且無更前候選時，畫面 MUST 停留於該仲裁版面
- **AND** 定稿或驗證失敗的仲裁不得產生前進導覽

#### Scenario: SC-004Y 送出後去向的完整性與一致性

- **GIVEN** 一位審核員在同一任務內連續送出，直到該任務已無其可處理單位
- **WHEN** 逐次觀察每次送出後的落點
- **THEN** 被前進到的不可處理單位數 MUST 為 0，定稿送出發生前進或導頁的次數 MUST 為 0
- **AND** 審核與仲裁兩條路徑的目標推導與返回網址建構器 MUST 完全相同，工作區內「哪些單位可處理」的判定實作恰為 1 份
- **AND** 最後返回清單的網址同時含 FR-081 檢視狀態與 `notice=no_actionable_review`，且不含 `sample_id`

### Requirement: FR-100 定稿卡之本任務剩餘可處理量與歸零去向

**FR-100**（本版新增，對應 AC-3.57、AC-3.58、SC-004Z，issue #766）：**唯讀定稿卡必須說明該審核員在本任務上還剩多少可處理單位，並於歸零時提供回清單的去向**。

`role = reviewer` 之工作區渲染 FR-094 之唯讀定稿卡時，卡上 MUST 渲染一段**剩餘量敘述**（testid `ws-finalized-remaining`），位置在唯讀說明之後、第一個 outKey 定稿值之前。本條適用於一切會渲染該卡的情形——開啟一個已定稿單位、FR-099 第 7 點之定稿後就地重渲染、以及語言切換後之重繪——不限於送出之後。

1. **剩餘量之定義與單一判定來源**：剩餘量為本任務、本 `run_type` 中，依 FR-073 第 2 點對**目前登入之審核員身分**判為可處理（第 1 或第 2 順位）之審核單位數；候選列舉沿用 FR-073 第 1 點。此判定 MUST 與 `findNextActionableReviewUnit()` 共用同一份逐單位判定，使兩者對「哪些單位可處理」不可能給出不同答案——恆有「剩餘量為 0 ⇔ `findNextActionableReviewUnit()` 對同一任務、`run_type` 與審核員回傳空值」。系統 MUST NOT 另立第二套計數公式；MUST NOT 新增任何儲存的計數欄位、計數快取或計數狀態（沿用 issue #761 之推導先例）；MUST NOT 由頂部進度 `我的審核提交 {done} / {total}` 相減或換算得出——該進度計的是本人提交數，與可處理量不是同一個量。目前檢視中的已定稿單位依 FR-073 第 2 點本即不可處理，MUST NOT 以任何特例額外排除或納入。

2. **剩餘量大於 0 時**：敘述 MUST 寫出剩餘量之數字（zh／en 同步），MUST NOT 渲染任何連結或其他行動點——回到清單的既有路徑為 FR-080 麵包屑第 2 層，本條不重複之。

3. **剩餘量為 0 時之措辭**：敘述 MUST 由一個標題（testid `ws-finalized-remaining-title`）與一段說明（testid `ws-finalized-remaining-message`）組成，兩者文字 MUST 分別與 `annotation-list` 之 `list-no-actionable-notice`（FR-073 第 5 點）所顯示的標題與說明**逐字相同**，zh 與 en 皆然。系統 MUST NOT 為定稿卡另寫一套「已無可處理項目」的措辭，亦 MUST NOT 依角色（審核員／仲裁者）或依剩餘可處理單位之類型分流措辭。該組措辭 MUST 只有一份定義、由兩個消費端共讀，使兩處不可能因只改其中一處而分歧。

4. **剩餘量為 0 時之回清單連結**：敘述 MUST 另含一個回清單連結（testid `ws-finalized-back-to-list`），其目標網址 MUST 與 FR-099 第 5 點之無可處理出口相同：經 `buildListReturnUrl()` 產生（保留 FR-081 之檢視狀態鍵與 FR-049 之身分參數，MUST NOT 另立第二個 query 建構器），並附帶 `notice=no_actionable_review`，MUST NOT 帶 `sample_id`。該連結 MUST 為導覽用之錨點元素，MUST NOT 為 `button`、表單控件或以腳本攔截點擊後再導頁之元素。

5. **與 FR-099 第 7 點之邊界**：本條不改變使單位定稿的送出之去向——該送出 MUST 仍停留於原單位、MUST NOT 前進、MUST NOT 自動導頁；剩餘量為 0 時亦同，回清單連結 MUST 僅於審核員主動點擊時導頁。本條只補上 FR-099 第 7 點未規範的卡片內容；FR-099 第 7 點所稱「審核員離開已定稿單位的路徑是既有的清單返回入口（FR-081）」仍成立——本條之連結以同一個返回網址建構器產生，是同一入口的另一個觸及點，而非第二套返回路徑。

6. **與 FR-094 之邊界**：FR-094 之純文字約束不變。剩餘量敘述為純文字；歸零時之回清單連結為導覽，不是決策控件、修正控件或送出按鈕，亦非作答面板。卡內 `button` 之數量 MUST NOT 因本條增加。

7. **與已撤銷之 FR-082 之邊界**：FR-082（v4.40.0 撤銷，issue #517）之出口卡提供「下一個可處理單位」「返回審核清單」「返回 Dashboard」三個出口，因三者皆與既有導覽重複而撤銷。本條與之不同處在於：出口數恰為 1、僅於剩餘量為 0 時出現、且其存在理由是「宣告本任務對該審核員已無可處理項目」這項麵包屑無法表達的資訊。系統 MUST NOT 於定稿卡提供「下一個可處理單位」或「返回 Dashboard」出口，MUST NOT 重用 FR-082 之任何已撤銷 testid 或樣式類別。

8. **不得硬編任務 ID**（Generalization-First）：剩餘量僅得由審核單位狀態與登入審核員身分推導，MUST NOT 對 T014–T017 或任何任務 ID 分流。

本條不改變 FR-073 之列舉、優先序與資格判定，不改變 FR-094 之卡片既有內容與純文字約束，不改變 FR-099 任一點之導覽行為，亦不改變 `list-no-actionable-notice` 之 testid、觸發條件與顯示文字；`findNextActionableReviewUnit()` 之簽章與回傳值不變。

#### Scenario: AC-3.57 定稿卡依推導之剩餘量呈現兩種敘述
- **GIVEN** `role = reviewer` 開啟某任務一個 `已定稿` 審核單位，而依 FR-073 第 2 點該審核員於本任務、本 `run_type` 尚有 N 個可處理單位（N > 0）
- **WHEN** 定稿卡渲染完成
- **THEN** `ws-finalized-remaining` MUST 恰為 1 個，位於唯讀說明之後、第一個 outKey 定稿值之前，其文字 MUST 含數字 N
- **AND** 卡內 `ws-finalized-back-to-list` MUST 為 0 個，`ws-finalized-remaining-title` 與 `ws-finalized-remaining-message` MUST 為 0 個
- **AND** 同一頁面上 `findNextActionableReviewUnit()` 對同一任務、`run_type` 與審核員 MUST 回傳非空值
- **AND** 以不同審核員身分開啟同一已定稿單位時，敘述之數字 MUST 依該身分之可處理量推導，MUST NOT 沿用前一身分之結果
- **AND**〔歸零〕同一審核員於本任務已無可處理單位（`findNextActionableReviewUnit()` 回傳空值）時，`ws-finalized-remaining-title` 與 `ws-finalized-remaining-message` 之文字 MUST 分別與 `annotation-list` 於 `notice=no_actionable_review` 下渲染之 `list-no-actionable-notice` 標題與說明逐字相同，且 `ws-finalized-back-to-list` MUST 恰為 1 個
- **AND**〔語言〕切換為 en 後重繪，上述逐字相同之關係 MUST 於 en 仍成立
- **AND**〔送出後即時〕仲裁者送出使其最後一個可處理爭議單位定稿後，就地重渲染之定稿卡 MUST 直接呈現歸零敘述，MUST NOT 需要重新整理才更新

#### Scenario: AC-3.58 歸零連結之目標與既有保證之維持
- **GIVEN** `role = reviewer` 於帶有 FR-081 檢視狀態鍵（如 `status`、`q`）與身分參數之工作區網址，開啟一個剩餘量為 0 的定稿卡
- **WHEN** 點擊 `ws-finalized-back-to-list`
- **THEN** 該次導頁所請求之網址 MUST 同時帶有送出前的 FR-081 檢視狀態鍵、FR-049 身分參數與 `notice=no_actionable_review`，MUST NOT 帶 `sample_id`，且落地頁 MUST 渲染 `list-no-actionable-notice`
- **AND** `ws-finalized-back-to-list` MUST 為錨點元素，卡內 `button` 之數量 MUST 與本條新增前相同（AC-3.52、FR-100 第 6 點）
- **AND**〔不自動導頁〕使單位定稿而剩餘量為 0 之送出後，在未點擊連結前 MUST 停留於原單位、MUST NOT 發生任何導頁，`ws-review-finalized-card` MUST 恰為 1 個（FR-099 第 7 點、AC-3.55、AC-3.56）
- **AND**〔已撤銷出口不復活〕頁面上 FR-082 之已撤銷 testid（`ws-post-submit-cta` 及其子項）與 `.rv-exits` 類別 MUST 為 0 個，卡內 MUST NOT 出現「下一個可處理單位」或「返回 Dashboard」出口

#### Scenario: SC-004Z 剩餘量與清單空狀態之一致性
- **GIVEN** 審核員與仲裁者於同一任務內逐一處理可處理單位，直到該身分已無可處理單位
- **WHEN** 逐次觀察每次渲染之定稿卡，並對照同一時點之 `findNextActionableReviewUnit()` 結果與 `list-no-actionable-notice`
- **THEN** 定稿卡剩餘量為 0 與 `findNextActionableReviewUnit()` 回傳空值兩者不一致的次數 MUST 為 0
- **AND** 定稿卡歸零措辭與清單空狀態措辭不一致之語言數 MUST 為 0，該組措辭於原型原始碼中之定義 MUST 恰為 1 份
- **AND** 為產生剩餘量而新增之儲存欄位或計數快取 MUST 為 0 個，工作區與資料層中「哪些單位可處理」的判定實作 MUST 恰為 1 份

### Requirement: FR-072 審核員任務摘要必須由審核單位狀態推導

本需求對應正典 FR-072（issue #450／issue #908）。FR-072 於正典 v4.27.0 新增，早於本 derived view 建立，先前未曾以獨立標題收錄；本次隨 issue #908（change `fix-908-annotator-finalized-lock`）之 MODIFIED delta 首次補齊。**審核員任務摘要 MUST 由審核單位狀態推導**。`annotation-list` 任務資訊卡（FR-007C）與 dashboard 任務卡（012 FR-020）呈現的審核員進度摘要，MUST NOT 取用任何預先組好的顯示字串，MUST 由審核單位狀態（FR-051 `REVIEW_UNIT_STATUS` 三態）即時推導：

1. **單一計算來源**：四項計數與覆蓋率的公式集中定義於 `computeReviewSummary(task_id, run_type)`（`annotation-workspace.data.js`），兩個消費端皆讀取同一函式，MUST NOT 各自重算或各自維護第二套公式。列舉範圍為該任務全部審核單位（`REVIEW_UNIT_DIMENSIONS`＝`sample_id × annotator_id × run_type`，FR-055），與清單資料列同源。FR-044a 兩個 seed 來源（已儲存提交、示範標記員答案）皆缺之單位不在列舉範圍內。
2. **公式**：`待審 = status 為 pending 之單位數`；`未定稿 = 總單位數 − status 為 finalized 之單位數`；`爭議 = status 為 disputed 之單位數`；`審核覆蓋率 = round((總單位數 − 待審) ÷ 總單位數 × 100)`，總單位數為 0 時覆蓋率為 0。
3. **重算時機**：推導為讀取時計算、不快取（沿用 FR-051），因此送出通過、送出修正、送出無法裁決、仲裁定案、例外池收尾、未定稿審核單位之標記員重新提交（**v6.19.0 修訂**，issue #908：已定稿單位之標記員寫入依 FR-101 寫入側守衛直接阻擋，不產生任何狀態變更，故本點原列舉之「標記員重新提交」限定為未定稿單位）等任一改變審核單位狀態的操作之後，重新進入或重新整理清單與 dashboard 皆 MUST 反映最新數值；跨頁往返與 reload 之結果 MUST 一致。
4. **覆蓋率不等於完成率**：審核覆蓋率衡量「已離開待審的單位比例」，達 100% 不代表任務已完成。
5. **顯示文字由計數組成**：顯示字串由 `formatReviewSummary()` 依計數組出，中英文各一份；種子資料 MUST NOT 保留預先組好的摘要字串。
6. **無審核單位狀態不構成例外**：摘要 MUST NOT 因任務尚無任何已儲存的審核單位狀態而回退至種子值。

本條 MUST NOT 改變 FR-051 狀態機、FR-055 清單粒度與 FR-059／FR-061 之爭議推導契約，僅將既有推導結果延伸為任務層級摘要之唯一來源。

#### Scenario: 已定稿單位之標記員寫入不構成重算時機（issue #908）
- **GIVEN** 一個 `official_run` 審核單位已依 FR-051 推導為 `已定稿`
- **WHEN** 該單位對應之標記員嘗試重新提交或儲存草稿，且該寫入依 FR-101 寫入側守衛被擋下（回傳 `false`、未產生任何寫入）
- **THEN** 該單位之審核單位狀態 MUST 維持 `已定稿`，`computeReviewSummary()` 之計數 MUST NOT 因此次被擋下的嘗試而改變
- **AND** 同一任務中另一個 `未定稿`（`待審` 或 `爭議中`）單位之標記員正常重新提交時，其狀態改變仍 MUST 觸發本條既有之讀取時重算，行為與本次修訂前一致

### Requirement: FR-101 標記員定稿鎖定

本需求對應正典 FR-101（**v6.19.0 新增**，對應 AC-2.27，issue #908）。`official_run` 審核單位一旦依 FR-051 推導為 `已定稿`，且該推導成立之前提——受審標記員存在真實已儲存提交（FR-051 判定式首句：標記員未提交 → 不成立審核單位，推導為 `null`）——已滿足時，該標記員自身之後續寫入 MUST 被鎖定，不得再變更已定稿之作答，亦 MUST NOT 使單位狀態翻回 `爭議中` 或 `待審`。

**範圍限定**：本條僅適用 `official_run`；`dry_run` 因 `submissionBucketKey()` 無 round 維度，本條鎖定範圍 MUST NOT 涵蓋 `dry_run`，試標之後續回合不受影響。

**觸發條件（不得誤觸的邊界）**：本條 MUST NOT 對僅由 FR-044a 示範標記員答案遞補、標記員本人尚無任何真實儲存提交的審核單位觸發鎖定。此類單位之 `getReviewUnitStatus()` 依 FR-051 判定式首句恆推導為 `null`，不成立「已定稿」狀態，本條鎖定天然不觸發；標記員本人之首次提交 MUST 正常送出，不得因該單位已有示範列遞補或既有審核員決策而顯示定稿鎖定提示。本條鎖定判定 MUST 沿用（或等價於）`getReviewUnitStatus()` 既有之判定式，使「存在真實已提交紀錄」這項前提結構性地成立，MUST NOT 另立第二套不要求真實提交存在的判定捷徑（例如直接查詢審核決策記錄或 `REVIEWER_MOCK_ROWS` 遞補列本身是否存在）。

**寫入側守衛**：`markSampleSubmitted()`、`markSampleSaved()`、`appendSampleTimelineEvent()`（`annotation-workspace.data.js`）三個標記員寫入點，於執行寫入前，當呼叫之 `role` 為 `annotator` 時，MUST 先以寫入前（pre-write）狀態呼叫上述判定；判定為 `已定稿` 時，MUST 直接回傳 `false`、MUST NOT 寫入任何欄位、MUST NOT 追加任何歷程事件，既有 bucket 內容維持原狀；未鎖定時 MUST 回傳 `true` 並維持既有寫入行為不變。判定所需之 outKeys MUST 由 `resolveTaskProfile(taskId).outputs`（`annotation-workspace.data.js:51`）內部推導取得，三個函式之既有簽章 MUST NOT 因本條新增參數。審核員或仲裁者之寫入路徑不屬本條範圍（FR-094、AC-3.39 已規範），不受本條三個函式之守衛約束於其 `role` 非 `annotator` 之呼叫。標記員自身促成單位轉為已定稿的那一筆提交，因寫入前狀態尚未轉為已定稿，MUST 正常寫入、不被本條擋下。

**呈現**：鎖定生效時，畫面 MUST 渲染鎖定提示（testid `ws-annotator-finalized-notice`），文案為「此標記結果已定稿，無法再修改或提交」（en: "This annotation is finalized and can no longer be edited or submitted."）；視覺 MUST 沿用 FR-094 唯讀卡之語言慣例，但色階 MUST 採資訊色（`--color-info`／`--color-info-bg`／`--color-info-border`），MUST NOT 沿用 FR-094 之錯誤色——定稿是終態，不是錯誤。作答控制與 跳過／儲存草稿／提交 三個既有控件（`wsSkipBtn`、`wsSaveBtn`、`wsSubmitBtn`）MUST 保留在畫面上並套用原生 `disabled` 屬性與 `aria-disabled="true"`，MUST NOT 自 DOM 移除或隱藏，MUST NOT 以非原生互動元素（例如 `div`）取代原生控件；三者既有觸控高度 MUST NOT 因本條縮減。定稿當下已選定之作答 MUST 維持可辨識，MUST NOT 使已選與未選選項套用相同的視覺結果（例如整排轉灰致無法分辨曾選定何值）。自動儲存狀態列（`ws-autosave-status`）鎖定生效時 MUST 改顯示「已定稿，不再自動儲存」（en: "Finalized — autosave stopped."），MUST NOT 沿用鎖定前之 INITIAL／DIRTY／SAVED 三態文案。

**不引入定稿快照**：本條判定 MUST 沿用 FR-072(3) 既有之讀取時計算、不快取原則，MUST NOT 引入任何持久化之定稿快照欄位。

**不提供解鎖入口**：本條 MUST NOT 新增任何一般解鎖操作；重啟流程（FR-016A 審計理由）延後至後端階段，原型不提供任何解鎖入口。

#### Scenario: AC-2.27 已定稿單位鎖定標記員寫入，示範列 seed 單位不觸發鎖定
- **GIVEN** 一個 `official_run` 審核單位已有標記員之真實已儲存提交且依 FR-051 推導為 `已定稿`
- **WHEN** 該標記員以 annotator 身分重新開啟該單位之工作區
- **THEN** 畫面 MUST 渲染鎖定提示 `ws-annotator-finalized-notice`，`wsSkipBtn`、`wsSaveBtn`、`wsSubmitBtn` 三者皆帶 `disabled` 屬性與 `aria-disabled="true"`，且皆仍存在於 DOM 中
- **AND** 嘗試以既有 `Ctrl/Cmd+S`（儲存）或 `Ctrl/Cmd+Enter`（提交）快捷鍵，皆 MUST NOT 改變該單位之儲存內容或狀態
- **AND** 自動儲存狀態列 MUST 顯示「已定稿，不再自動儲存」
- **AND** 該單位狀態於前後兩次讀取皆 MUST 維持 `已定稿`，MUST NOT 因上述任何嘗試翻回 `爭議中` 或 `待審`
- **AND**〔示範列 seed 豁免〕**GIVEN** 另一個 `official_run` 審核單位僅由 FR-044a 示範標記員答案遞補構成一筆審核員已核可決策，該樣本對應之標記員本人尚無任何真實儲存提交，**WHEN** 該標記員以 annotator 身分首次開啟並提交該單位，**THEN** 提交前畫面 MUST NOT 渲染 `ws-annotator-finalized-notice`，三個控件皆 MUST NOT 帶 `disabled` 或 `aria-disabled`；**AND** 該次提交 MUST 正常寫入成功（`markSampleSubmitted()` 回傳 `true`），MUST NOT 被本條鎖定機制阻擋
- **AND**〔dry_run 不受影響〕同一組資料以 `dry_run` 開啟時，本條鎖定機制不生效，標記員之寫入不受任何額外阻擋
