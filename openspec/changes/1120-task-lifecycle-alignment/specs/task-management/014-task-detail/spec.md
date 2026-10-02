> 正典：`specs/task-management/014-task-detail/spec.md`（v4.3.0 → v4.4.0，**MINOR**，版本判定理由見 proposal.md Impact 節）。issue #1120：正式標記池歸零之發布阻擋，以及跨頁籤衍生計數的共用查詢上下文與聚合單位。
>
> **本 delta 刻意不含的範圍**：issue #1120 §4 驗收 01／02／03 所要求的「試標完成＝標註＋必要審核＋必要仲裁」會使 AC-3.2 的 **Then** 子句變為偽，屬 MAJOR／BREAKING，依 CLAUDE.md MAJOR 停止規則待維護者裁示後另開 change 承載。本 delta 未修改 `DRY_RUN_COMPLETION_RULE`、FR-008a、AC-3.2、AC-3.16、SC-004、FR-013 任何文字，亦無 `## MODIFIED Requirements` 內容。

## ADDED Requirements

### Requirement: FR-022 正式標記池歸零之發布阻擋（成功標準 SC-049）

發布 `開始正式標記` 前，系統 MUST 驗證剩餘正式標記池筆數大於 `0`。剩餘筆數之推導一律沿用 FR-010f-3 之既有推導式，本條 MUST NOT 複製或另建第二份推導式。

**(1) 發布阻擋**。剩餘正式標記池筆數為 `0` 時，系統 MUST 阻擋 `開始正式標記` 發布，任務狀態 MUST 維持 `waiting_iaa_confirmation`，且 MUST NOT 建立任何正式標記清單或 assignment。

**(2) 與 IAA 語意分列**。資料池不足之原因 MUST 與 IAA 相關狀態分列呈現：MUST NOT 以「IAA 未達標」或「IAA 計算中／計算失敗」表述資料池不足，亦 MUST NOT 因資料池不足而改變最新試標回合之 `iaa_computation_status`。最新回合 `iaa_computation_status = done`（含「無法計算」記為 `done`）且 IAA 已達標時，本條之阻擋 MUST 仍然生效——此阻擋依據為資料池筆數，與 IAA 達標與否及計算是否結束皆無關，不構成 FR-010o-3 所禁止之「因 IAA 未達標而停用」，亦不改變 FR-010o-4 之既有停用規則。

**(3) `draft` 階段提前揭露**。任務處於 `draft` 且目前 `sampling_value` 與既有回合設定會使剩餘正式標記池為 `0` 時，系統 MUST 於發布前即顯示原因，並 MUST 以停用狀態呈現對應的執行控制 CTA。此提前揭露 MUST NOT 取代 FR-010t 之成員人數檢查，兩者各自獨立逐項呈現。

**(4) handler 同樣驗證**。本條之驗證 MUST 在操作 handler 內執行：直接呼叫發布 handler（繞過停用的按鈕）MUST 同樣失敗，MUST NOT 改變任務狀態或建立任何清單資料。

**(5) 可取得性**。阻擋原因 MUST NOT 僅以 hover 或顏色傳達；原因文字 MUST 為可見文字，且 MUST 可由鍵盤操作與螢幕閱讀器取得。

**成功標準 SC-049**：任一任務之剩餘正式標記池筆數為 `0` 時，`開始正式標記` 發布成功次數為 `0`——包含點擊停用 CTA 與直接呼叫 handler 兩條路徑；阻擋原因以可見文字逐項呈現且可由螢幕閱讀器取得，並與 IAA 相關狀態分列，最新試標回合之 `iaa_computation_status` 不因阻擋而改變。

#### Scenario: `draft` 抽樣設定會使正式池歸零時提前揭露並停用 CTA

- **GIVEN** 一個 `draft` 任務，其資料集總筆數與目前每回合抽樣筆數設定會使扣除試標後的剩餘正式標記池為 `0`
- **WHEN** `project_leader` 檢視 Overview「任務狀態與執行控制」
- **THEN** 畫面以可見文字顯示剩餘正式標記池為 `0` 的原因，對應執行控制 CTA 呈現停用狀態
- **AND** 該原因文字可由鍵盤聚焦路徑與螢幕閱讀器取得，並非僅由 hover 或顏色傳達

#### Scenario: 計算狀態為 `done` 且 IAA 已達標，仍因正式池為 0 阻擋發布

- **GIVEN** 一個任務處於 `waiting_iaa_confirmation`，最新試標回合 `iaa_computation_status = done` 且 IAA 已達目標門檻，但剩餘正式標記池筆數為 `0`
- **WHEN** `project_leader` 點擊 `開始正式標記`
- **THEN** 系統阻擋發布，任務狀態維持 `waiting_iaa_confirmation`，未建立任何正式標記清單或 assignment
- **AND** 畫面逐項列出未滿足的原因，其中資料池不足與 IAA 相關狀態分列呈現

#### Scenario: 資料池不足不得被表述為 IAA 問題

- **GIVEN** 一個任務之剩餘正式標記池筆數為 `0`，且最新試標回合 `iaa_computation_status = done`
- **WHEN** `project_leader` 檢視發布阻擋原因
- **THEN** 原因文字指向資料池筆數不足，不含「IAA 未達標」「IAA 計算中」「IAA 計算失敗」任何表述
- **AND** 最新試標回合之 `iaa_computation_status` 不因本次阻擋而改變

#### Scenario: 直接呼叫發布 handler 同樣失敗

- **GIVEN** 一個任務之剩餘正式標記池筆數為 `0`，其 `開始正式標記` CTA 為停用狀態
- **WHEN** 直接呼叫發布 handler，繞過停用的按鈕
- **THEN** 發布失敗，任務狀態不變，未建立任何正式標記清單或 assignment

### Requirement: FR-010u 跨頁籤衍生計數的共用查詢上下文與聚合單位（成功標準 SC-050）

`task-detail` 五個頁籤（`TASK_TABS`）呈現的衍生計數 MUST 以同一組查詢上下文推導，並 MUST 依既有正典定義之聚合單位計數。

**(1) 共用查詢上下文**。任務、`run_type` 與回合為共用查詢上下文：概覽、成員、進度、結果四個頁籤之計數 MUST 由同一組 `task_id × run_type × round` 推導。選取某一回合時 MUST NOT 混入其他回合或其他任務的資料。工時與匯出歷史 MUST 依當前任務篩選；該任務無對應紀錄時 MUST 呈現真實空狀態，MUST NOT 呈現其他任務的通用示範資料。

**(2) `已提交` 的分子分母**。分子為該 `task_id × run_type × round` 範圍內已提交之標記 assignment 數；分母為同範圍內已指派之標記 assignment 數。依 FR-005h 被 `project_leader` 明確排除之標記作業 MUST NOT 計入分子或分母，與 FR-005h 既有的「不計入完成率或標記分布統計」一致。

**(3) `已完成輪次` 的分子**。分子為已結束之試標回合數；當前進行中之回合 MUST NOT 計入。歷史回合與當前回合 MUST 分列呈現，兩者之計數與決策 MUST NOT 交叉累計。「已結束」之判定依既有試標完成規則（FR-008a），本條不另定義該規則。

**(4) 既有定義不得重複**。`已定案 review unit` 之判定式與聚合單位（`sample_id × annotator_id × run_type`）以 `annotation/015-annotation-workspace` FR-051 為正典；`最終例外輸出項目` 之來源與逐筆收尾動作以 `annotation/015-annotation-workspace` FR-095 為正典，其分 `run_type` 獨立計數規則沿用本規格 FR-018 第 (5) 點。本規格 MUST 讀取該兩處既有定義，MUST NOT 另建第二份判定式、分母或狀態清單。

**(5) 單位不得相加**。標記 assignment、審核單位、爭議項（審核單位 × 輸出類型）分屬三個不同聚合層級，MUST NOT 相加為單一數字，亦 MUST NOT 共用同一分母。畫面呈現 MUST 使每個計數的單位可辨識；提交進度與定案進度 MUST 分別命名，MUST NOT 以同一標題涵蓋兩者。

**(6) 時間語意**。已提交時間 MUST NOT 被呈現為審核完成或仲裁完成時間；各階段時間 MUST 取自其各自的事件來源。

**(7) 資料分配與工作完成分離**。樣本池分配的視覺呈現（FR-010p）MUST 附明確的「資料分配」語意說明；分配比例達滿 MUST NOT 被表述為標記或審核工作已完成。

**成功標準 SC-050**：對同一任務依序檢視五個頁籤時，由同一 `task_id × run_type × round` 推導之計數在各頁籤間完全一致，且無任一數字由標記 assignment、審核單位、爭議項三種單位相加而得；該任務無工時或匯出紀錄時兩區塊皆呈現空狀態，不出現其他任務的通用資料。

#### Scenario: 五個頁籤的計數同源且不混入其他任務或回合

- **GIVEN** 一個任務同時存在已結束的試標回合與一個進行中的回合
- **WHEN** `project_leader` 依序檢視概覽、成員、進度、結果、工時五個頁籤
- **THEN** 各頁籤呈現的計數皆由同一組 `task_id × run_type × round` 推導，數值彼此一致
- **AND** 畫面不出現其他任務的回合、樣本數、工時或匯出歷史紀錄
- **AND** 該任務無工時或匯出紀錄時，對應區塊呈現空狀態而非其他任務的示範資料

#### Scenario: 三種計數單位分列呈現且不相加

- **GIVEN** 一個任務之標記 assignment、審核單位與爭議項三者數量互不相等
- **WHEN** `project_leader` 檢視進度與結果頁籤
- **THEN** 提交進度與定案進度分別命名呈現，各自的分子分母可辨識其單位
- **AND** 畫面不存在將標記 assignment 數、審核單位數與爭議項數相加後的單一數字
- **AND** 歷史回合與當前回合的計數分列呈現，未交叉累計
