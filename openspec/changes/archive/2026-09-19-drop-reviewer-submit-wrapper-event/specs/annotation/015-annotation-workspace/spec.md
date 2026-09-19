## MODIFIED Requirements

### Requirement: FR-016B 標記歷程呈現

標記歷程 MUST 於右欄 `歷程` 頁籤呈現，annotator 與 reviewer 視角皆可查看；同一樣本的 annotator 與 reviewer 事件合併為單一時序清單，最新事件在前；尚無紀錄時顯示空狀態文案。合併清單納入 reviewer 事件時受 FR-062 盲審隔離約束——僅納入已提交之審核事件與檢視者本人的草稿事件（v4.9.0 既有規則，不變）。

每筆事件 MUST 包含操作者角色與 `actor_id`（FR-050）、時間、`action`（取值範圍見 FR-086）與對應輸出類型作答摘要；自 v4.61.0 起，事件另 MUST 承載 `result_snapshot`（FR-087）、`started_at` 與 `lead_time`（FR-088）、`reason`（FR-089），其呈現受 FR-090 分層遮蔽約束。事件維持 append-only：既有事件不得被覆寫或刪除。

v4.61.0 以前寫入、不具上述新欄位之事件 MUST 原樣顯示且不得因此報錯——缺哪一個欄位就不渲染對應區塊，系統 MUST NOT 為舊事件補寫推估的快照、耗時或理由（沿用 FR-050 對缺 `actor_id` 舊事件的既有處置原則）。

**v4.62.0 新增（issue #600，顯示層與 action 常數脫鉤）**：事件卡片之 `action` 徽章可見文字 MUST 經由單一資料來源之顯示標籤對照表（`ACTION_LABEL`，見 FR-086）轉換為繁體中文，MUST NOT 直接以 `action` 常數值作為畫面文案。徽章元素之 `data-action` 屬性 MUST 維持為該事件之原始英文 `action` 值，供測試與稽核取得，不受本段顯示轉換影響。

**本版修訂（issue #583，審核員外層提交事件停產）**：審核員送出自本版起不再寫入外層 `submitted` 事件（FR-086），v4.63.0（issue #601）之審核員外層 `submitted` 折疊規則因此僅適用於本版以前已寫入之舊事件——舊事件依 append-only 原則 MUST 原樣保留、MUST NOT 被刪除或改寫，其呈現層折疊與三項邊界照舊；新資料不再產生可折疊之對象。

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

### Requirement: FR-091 標記清單處理狀況彙總

`annotation-list` 每筆樣本 MUST 呈現「最後動作」「最後活動時間」「累計耗時」三項彙總，使檢視者不需逐筆開啟工作區即可掌握處理狀況。三項 MUST 由該樣本之歷程事件推導（最後動作與最後活動時間取最新一筆事件；累計耗時為該樣本全部事件 `lead_time` 之和），MUST NOT 另存第二份彙總資料。

彙總之可見性沿用 FR-088 與 FR-090：「累計耗時」MUST NOT 於 annotator 視角呈現；「最後動作」與「最後活動時間」屬事件列層級，對所有可檢視者可見。無任何歷程事件之樣本，三項皆呈現空狀態而非零值。

**v4.62.0 新增（issue #600，顯示層與 action 常數脫鉤）**：「最後動作」欄位之可見文字 MUST 比照 FR-086 顯示層規定改為繁體中文標籤，MUST NOT 直接呈現 `action` 常數值；其 `data-action` 屬性 MUST 維持原始英文值（既有契約，不因本版變更）。

**本版修訂（issue #583，同時戳事件之最後動作）**：同一紀錄內多筆事件時間相同時（例如一次審核送出於同一毫秒寫入之多筆決策事件），「最後動作」與「最後活動時間」MUST 取其中最後寫入（append 順序最後）之一筆。

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
