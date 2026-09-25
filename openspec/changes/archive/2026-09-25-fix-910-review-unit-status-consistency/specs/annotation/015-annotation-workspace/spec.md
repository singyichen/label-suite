# Spec Delta

## MODIFIED Requirements

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
