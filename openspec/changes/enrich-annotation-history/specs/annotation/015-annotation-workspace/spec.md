## Purpose

正典：`specs/annotation/015-annotation-workspace/spec.md`（v4.60.0 → 4.61.0）。本變更（issue #578）修訂 FR-016B 與關鍵實體 `AnnotationHistoryItem`，新增 FR-086 ~ FR-091、AC-1.25、AC-2.15 ~ AC-2.21、AC-3.49 ~ AC-3.50、AC-4.51。

## MODIFIED Requirements

### Requirement: FR-016B 標記歷程呈現

標記歷程 MUST 於右欄 `歷程` 頁籤呈現，annotator 與 reviewer 視角皆可查看；同一樣本的 annotator 與 reviewer 事件合併為單一時序清單，最新事件在前；尚無紀錄時顯示空狀態文案。合併清單納入 reviewer 事件時受 FR-062 盲審隔離約束——僅納入已提交之審核事件與檢視者本人的草稿事件（v4.9.0 既有規則，不變）。

每筆事件 MUST 包含操作者角色與 `actor_id`（FR-050）、時間、`action`（取值範圍見 FR-086）與對應輸出類型作答摘要；自 v4.61.0 起，事件另 MUST 承載 `result_snapshot`（FR-087）、`started_at` 與 `lead_time`（FR-088）、`reason`（FR-089），其呈現受 FR-090 分層遮蔽約束。事件維持 append-only：既有事件不得被覆寫或刪除。

v4.61.0 以前寫入、不具上述新欄位之事件 MUST 原樣顯示且不得因此報錯——缺哪一個欄位就不渲染對應區塊，系統 MUST NOT 為舊事件補寫推估的快照、耗時或理由（沿用 FR-050 對缺 `actor_id` 舊事件的既有處置原則）。

#### Scenario: AC-2.15 歷程卡片呈現擴充欄位
- **GIVEN** 標記員於 `run_type=official_run` 對某樣本提交，且該事件具備新欄位
- **WHEN** 切換至右欄 `歷程` 頁籤
- **THEN** 該筆事件卡片顯示操作者（角色 + `actor_id`）、時間、`action` 徽章與作答摘要；並依 FR-090 可見性顯示 `result_snapshot` 差異區塊與 `reason`
- **AND** 同一清單中一筆 v4.61.0 以前寫入的舊事件僅顯示既有五欄位，不渲染差異區塊、耗時或理由，且不擲出錯誤

## ADDED Requirements

### Requirement: FR-086 歷程動作常數化

歷程事件之 `action` MUST 取自常數集合 `HISTORY_ACTIONS = draft_saved | submitted | skipped | modified | accepted | rejected | adjudicated`，不得為自由字串。每個值 MUST 對應唯一的徽章語意色，且該對應 MUST 為單一資料來源驅動，不得於渲染端逐值硬編分支。

各值語意：`draft_saved`（標記員或審核員儲存草稿）、`submitted`（標記員提交）、`skipped`（標記員跳過）、`modified`（審核員直接修正答案）、`accepted`（審核員通過）、`rejected`（審核員退回）、`adjudicated`（仲裁者定案）。

`HISTORY_ACTIONS` 之每個值 MUST 有對應的產生點——審核員送出「通過」MUST 寫入 `accepted` 事件，送出「修正」MUST 寫入 `modified` 事件。其通過／修正之判定沿用 FR-051 既有的 per-outKey 決策，本條 MUST NOT 改變該判定邏輯，僅要求該決策落為一筆歷程事件。

既有事件中出現於 `HISTORY_ACTIONS` 之外的動作值 MUST 以中性徽章呈現且不得中斷渲染。

#### Scenario: AC-2.16 七種動作各有對應徽章
- **GIVEN** 某樣本歷程依序包含 `HISTORY_ACTIONS` 全部七種動作各一筆
- **WHEN** 檢視 `歷程` 頁籤
- **THEN** 七筆事件各自呈現一個徽章，且七個徽章的語意色兩兩不同
- **AND** 一筆 `action` 為集合外舊值之事件以中性徽章呈現，清單其餘事件正常渲染

#### Scenario: AC-2.21 審核通過與修正皆產生歷程事件
- **GIVEN** 審核員對某樣本一個 `outKey` 送出「通過」、對另一個 `outKey` 送出「修正」
- **WHEN** 檢視該樣本 `歷程` 頁籤
- **THEN** 清單分別出現一筆 `accepted` 事件與一筆 `modified` 事件，兩者之 `actor_id` 皆為該審核員
- **AND** 該次送出未因此產生重複事件（沿用 FR-016B append-only 與既有重複送出防護）

### Requirement: FR-087 結果快照與差異呈現

每筆會改變答案內容的事件（`submitted`、`modified`、`adjudicated`）MUST 保存當下的 `result_snapshot`——該樣本完整的 `outputs[]` 作答結果，且 MUST 排除原始文本與資料集欄位（快照的用途是回答「答案改了什麼」，不是複製受標記資料）。

歷程面板呈現的差異 MUST 由同一操作者維度下相鄰兩筆事件的 `result_snapshot` 於呈現時計算，系統 MUST NOT 另存一份差異結果。差異呈現方式 MUST 由 `OUTPUT_TYPE_REGISTRY` 之輸出類型驅動，不得逐 task 硬編：純值類型（`single_label`、`multi_label`、`single_dim`、`multi_dim`、`free_text`）比對值本身；具位置資訊之類型（`entity_recognition`、`relation_identification`、`sequence_tagging`）MUST 逐實體列出新增、刪除與邊界變更三類差異，僅實體數量相同而邊界不同時亦 MUST 被列出。

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

可見性：`lead_time` MUST NOT 於 annotator 視角之任何呈現路徑出現（避免標記員因看見秒數而改變作答行為，污染以耗時分析標記難度的研究資料）；reviewer 視角與任務層級統計（`task-detail` 標記結果面板）MUST 可見。

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

審核側（`rejected`、`modified`）之理由來源 MUST 沿用 FR-016A 既有持久化路徑（reviewer submission 之 `reasons`），MUST NOT 另存第二份；FR-083 之送出阻擋與 FR-085 之標記員側呈現維持既有行為。

**BREAKING**（標記員互動）：標記員「跳過」自本版起由單鍵動作改為需填寫理由後方可送出；未填理由時該樣本 MUST NOT 產生 `skipped` 事件。

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

1. `role=annotator`：可見自己 `actor_id` 之事件的快照與理由；其他標記員之事件 MUST NOT 進入該檢視者的歷程輸出——**含事件列**。理由是事件列依 FR-016B 承載「對應輸出類型作答摘要」，該摘要即答案內容，僅遮蔽 `result_snapshot` 與 `reason` 仍會經摘要外洩，與 FR-062 及既有跨標記員隔離（他人狀態僅可讀狀態列舉，不得讀作答內容）相衝突。
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

#### Scenario: AC-1.25 清單呈現處理狀況彙總
- **GIVEN** 某樣本已有提交與審核退回兩筆事件
- **WHEN** 以 `role=reviewer` 檢視 `annotation-list`
- **THEN** 該筆樣本顯示最後動作為 `rejected`、最後活動時間為該退回事件時間、累計耗時為兩筆事件耗時之和
- **AND** 以 `role=annotator` 檢視時不呈現累計耗時，最後動作與最後活動時間仍呈現
- **AND** 無歷程事件之樣本三項皆為空狀態
