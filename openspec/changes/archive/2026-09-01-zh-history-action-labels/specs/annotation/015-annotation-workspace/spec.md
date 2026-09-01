## MODIFIED Requirements

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
