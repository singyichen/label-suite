# Spec Delta

## MODIFIED Requirements

### Requirement: FR-016B 標記歷程呈現

標記歷程 MUST 於右欄 `歷程` 頁籤呈現，annotator 與 reviewer 視角皆可查看；同一樣本的 annotator 與 reviewer 事件合併為單一時序清單，最新事件在前；尚無紀錄時顯示空狀態文案。合併清單納入 reviewer 事件時受 FR-062 盲審隔離約束——僅納入已提交之審核事件與檢視者本人的草稿事件（v4.9.0 既有規則，不變）。

每筆事件 MUST 包含操作者角色與 `actor_id`（FR-050）、時間、`action`（取值範圍見 FR-086）與對應輸出類型作答摘要；自 v4.61.0 起，事件另 MUST 承載 `result_snapshot`（FR-087）、`started_at` 與 `lead_time`（FR-088）、`reason`（FR-089），其呈現受 FR-090 分層遮蔽約束。事件維持 append-only：既有事件不得被覆寫或刪除。

v4.61.0 以前寫入、不具上述新欄位之事件 MUST 原樣顯示且不得因此報錯——缺哪一個欄位就不渲染對應區塊，系統 MUST NOT 為舊事件補寫推估的快照、耗時或理由（沿用 FR-050 對缺 `actor_id` 舊事件的既有處置原則）。

**v4.62.0 新增（issue #600，顯示層與 action 常數脫鉤）**：事件卡片之 `action` 徽章可見文字 MUST 經由單一資料來源之顯示標籤對照表（`ACTION_LABEL`，見 FR-086）轉換為繁體中文，MUST NOT 直接以 `action` 常數值作為畫面文案。徽章元素之 `data-action` 屬性 MUST 維持為該事件之原始英文 `action` 值，供測試與稽核取得，不受本段顯示轉換影響。

**本版修訂（issue #583，審核員外層提交事件停產）**：審核員送出自本版起不再寫入外層 `submitted` 事件（FR-086），v4.63.0（issue #601）之審核員外層 `submitted` 折疊規則因此僅適用於本版以前已寫入之舊事件——舊事件依 append-only 原則 MUST 原樣保留、MUST NOT 被刪除或改寫，其呈現層折疊與三項邊界照舊；新資料不再產生可折疊之對象。

**本版新增（issue #910，審核決策重複送出去重）**：既有「連續重複 `submitted` 事件不疊加」的雙送出防護（issue #201）MUST 擴及審核決策事件（`accepted`／`modified`／`bypassed`）：同一 `outKey` 之上一筆決策事件，若其 `action`、`role`、`actor_id`、`reason` 與該決策之修正值皆與新決策相同，新送出 MUST NOT 再疊加第二筆內容相同的事件。比對 MUST 以該 `outKey` 最近一筆事件為對象，MUST NOT 僅比對陣列最後一筆——同一次送出可能一次寫入多個不同 `outKey` 之事件，僅比對陣列最後一筆會誤刪其他 `outKey` 的合法事件。內容有實質差異（例如修正值改變）之重複送出仍 MUST 正常記錄為新事件，不受本段去重規則影響。本段不改變既有 append-only 語意——去重僅發生於「即將寫入前」，不覆寫、不刪除任何已寫入之事件。

**v7.2.0 新增（issue #992，審核決策摘要之顯示層中文化）**：`.history-summary` 渲染 `accepted`／`modified`／`bypassed` 事件之 `event.summary` 時，若該行內容符合 `<outKey> · <actor_id>: <decision>` 樣式（`decision` 取值 `approve`／`modify`／`bypass`），顯示層 MUST 將 `outKey` 換成 `window.OUTPUT_TYPE_REGISTRY[outKey][state.lang]` 之對應標籤、`decision` 換成既有審核決策標籤對照（`approve`→`通過`／`Approve`、`modify`→`修正`／`Modify`、`bypass`→既有 `BYPASS_WORDING.{zh,en}.decision`）；`actor_id` MUST NOT 被轉譯，MUST 維持原識別碼。此轉換 MUST 僅發生於渲染時查表，`event.summary` 之持久化字串（含 v7.2.0 以前寫入之既有 localStorage 資料）MUST NOT 因此被改寫、遷移或刪除——舊資料於下次渲染時即自動套用新對照，無需資料遷移。此規則 MUST NOT 變更 `handleReviewSubmit()` 送出時寫入 `#wsReviewHistory`（工作區內、逐樣本清空之送出確認卡片）之既有內部格式文字，亦 MUST NOT 變更本段以外之任何既有呈現規則（含前述 `.history-diff` fallback 抑制邏輯）。

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

## ADDED Requirements

### Requirement: AC-2.28 審核決策摘要之顯示層中文化，持久化格式不變

本條為 FR-016B（見上，v7.2.0 新增段）之新增驗收條件：`.history-summary` 對 `accepted`／`modified`／`bypassed` 事件之顯示文字 MUST 將 `outKey`／`decision` 兩個 token 轉換為既有對照表之繁體中文／英文標籤，`actor_id` 與 `event.summary` 之持久化格式 MUST NOT 改變。

#### Scenario: AC-2.28 審核決策摘要之顯示層中文化，持久化格式不變
- **GIVEN** 審核員對 `single_label` 輸出類型送出 `通過`（`approve`）決策，其對應 `accepted` 事件之 `event.summary` 含 `single_label · kioleemg12: approve`
- **WHEN** 以 `role=reviewer` 檢視右欄 `歷程` 頁籤
- **THEN** 該卡片 `.history-summary` 之可見文字為 `單一標籤 · kioleemg12：通過`（`lang=zh`）或 `Single label · kioleemg12: Approve`（`lang=en`），`kioleemg12` 維持原樣不譯
- **AND** 透過 `getSampleHistory()` 讀取該事件之 `event.summary` 仍逐字為 `single_label · kioleemg12: approve`，未被顯示層轉換改寫
- **AND** 若該決策為 `modify` 或 `bypass` 且附有理由，卡片 `.history-reason` 仍正確顯示該理由，且理由文字不因本段顯示轉換而重複或遺失
- **AND** 一筆 v7.2.0 以前寫入之既有 localStorage 事件（`event.summary` 為舊內部格式字串）以本段規則渲染時同樣呈現繁體中文／英文標籤，不需任何資料遷移
