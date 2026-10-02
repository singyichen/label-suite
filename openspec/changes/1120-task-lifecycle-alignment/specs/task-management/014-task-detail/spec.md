> 正典：`specs/task-management/014-task-detail/spec.md`（v4.3.0 → **5.0.0**，**MAJOR／BREAKING**，版本判定理由見 proposal.md Impact 節）。issue #1120：對齊試標完成條件與正式結案條件，並對齊跨頁籤的資料與衍生狀態。
>
> **BREAKING 來源與授權**：維護者於 2026-10-02 經主 session 問答裁示，授權將「試標完成」自「僅標註提交」改為「該輪標註＋必要審核＋必要仲裁全部完成」。此改寫收回既有可用行為（全員提交即自動進入 `waiting_iaa_confirmation`），比照 014 v4.0.0（issue #791）先例屬 BREAKING。裁示四項：① 接受 014 升 5.0.0；② 無仲裁者時爭議由專案負責人裁定，視為仲裁完成；③「必要審核／仲裁」包含試標階段的最終例外池；④ 另行授權一份獨立的 `annotation/015-annotation-workspace` 之 MODIFIED delta 定義「仲裁輸出項目」的可計數單位（獨立 PR，不在本 delta）。
>
> **delta 形式**：`DRY_RUN_COMPLETION_RULE` 與 FR-008a 雖為正典的原地改寫（BREAKING），仍置於 ADDED 區段——衍生檢視 `openspec/specs/task-management/014-task-detail/spec.md` 僅累積歷次 delta，尚未收錄此二者，archive 的 MODIFIED 標題比對會因找不到既有標題而拒絕整份 delta。已收錄於衍生檢視的 FR-013、FR-018、FR-010t 置於 MODIFIED 區段，其標題與衍生檢視逐字一致，且完整保留該requirement 既有的全部 scenario（MODIFIED 會整塊取代，遺漏既有 scenario 會被 archive 拒絕）。
>
> **連帶修訂的既有編號**：`DRY_RUN_COMPLETION_RULE`、FR-008a、FR-013 第 (1) 點、FR-018 第 (5) 點、FR-010t 之無仲裁者警示，以及驗收／成功標準 AC-3.2、AC-3.16、SC-004。本 delta 不新增或移除任何任務狀態，`TASK_STATUSES` 五態不變。
>
> **ADR-022**：`docs/adr/022-task-state-machine-location.md` 的 Transition Table `dry_run_in_progress → waiting_iaa_confirmation` 列與新增 Amendment 於本 change 的 apply 階段同步修訂。該檔另有與 #1120 無關的既有技術債（`:104`／`:106` 仍引用 014 v3.0.0 已移除的 `min_reviewers`、Amended 標頭缺 2026-09-07 一列），**不併入本 change**，另案處理。

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

### Requirement: FR-023 無仲裁者時爭議由專案負責人裁定（成功標準 SC-051）

任務之 `arbiter_ids` 為空時，`project_leader` MUST 能對該任務的爭議項做最終裁定，其裁定 MUST 與仲裁者裁定等效地使該爭議項視為已解決。本條是試標完成條件（FR-008a）與結案條件（FR-008b）納入「必要仲裁完成」後的唯一出口，避免未指定仲裁者的任務永遠無法完成。

**(1) 觸發條件**。本通道 MUST 僅在 `arbiter_ids` 為空時對 `project_leader` 開放。`arbiter_ids` 非空時 MUST NOT 提供此通道——該情形的爭議仍須由具仲裁資格者依 `annotation/015-annotation-workspace` FR-060 之非當事人條件處理，`project_leader` MUST NOT 藉本條繞過仲裁者。

**(2) 裁定選項與效果**。`project_leader` 之裁定選項 MUST 與仲裁者相同（`annotation/015-annotation-workspace` FR-061 之 `ARBITRATION_OUTCOMES`：採標記員答案／採審核員答案／兩者皆非）。裁定為「兩者皆非」時，該項 MUST 依既有規則落入最終例外池由 `project_leader` 逐筆收尾（FR-018、`annotation/015-annotation-workspace` FR-095），MUST NOT 因裁定者本身即為 `project_leader` 而跳過例外池。`dry_run` 之例外池收尾動作 MUST NOT 提供 `custom_answer`——依 `annotation/015-annotation-workspace` FR-095 第 (3) 點該動作僅適用 `official_run`。

**(3) 可追溯性**。裁定 MUST 記錄裁定者帳號、裁定時間與理由，且 MUST 可與仲裁者所做的裁定區分——畫面與匯出 MUST 標明該筆定案來源為「負責人裁定（無指定仲裁者）」，MUST NOT 呈現為一般仲裁者裁定。「兩者皆非」之理由 MUST 為必填，與 `annotation/015-annotation-workspace` FR-061 第 3 點一致。

**(4) 不改變盲審隔離**。本通道 MUST NOT 使 `project_leader` 看到任何尚未提交的審核判斷，`annotation/015-annotation-workspace` FR-062 之盲審隔離規則不因本條放寬。

**成功標準 SC-051**：`arbiter_ids` 為空且存在爭議項的任務，`project_leader` 可逐項完成裁定並使該任務具備試標完成與結案資格，成功率 100%；裁定來源在畫面與匯出中皆可與仲裁者裁定區分；`arbiter_ids` 非空的任務中，此通道對 `project_leader` 的開放次數為 `0`。

#### Scenario: 無仲裁者任務的爭議可由負責人裁定並解除卡死

- **GIVEN** 一個 `arbiter_ids` 為空的任務，其某審核單位因審核員 `modify` 而推導為「爭議中」
- **WHEN** `project_leader` 開啟該爭議項並選擇採標記員答案或採審核員答案，填妥理由後送出
- **THEN** 該爭議項視為已解決，該審核單位依既有判定式推導為「已定稿」
- **AND** 畫面與匯出標明該筆定案來源為負責人裁定（無指定仲裁者），可與仲裁者裁定區分
- **AND** 該任務不再因此爭議項而無法完成試標或結案

#### Scenario: 有仲裁者時負責人不得取得此通道

- **GIVEN** 一個 `arbiter_ids` 非空的任務，其某審核單位推導為「爭議中」
- **WHEN** `project_leader` 檢視該爭議項
- **THEN** 不提供負責人裁定入口，該爭議項仍僅能由具仲裁資格者處理
- **AND** 嘗試直接呼叫裁定 handler 失敗，該審核單位狀態維持「爭議中」

#### Scenario: 負責人裁定「兩者皆非」仍須經最終例外池

- **GIVEN** 一個 `arbiter_ids` 為空的 `dry_run` 任務，`project_leader` 正在裁定某爭議項
- **WHEN** 其選擇「兩者皆非」並填妥必填理由送出
- **THEN** 該項落入最終例外池並計入 `dry_run` 待處置項目數，該審核單位維持「爭議中」
- **AND** 該任務在例外池收尾前不具備試標完成資格
- **AND** `dry_run` 的收尾動作選項不包含 `custom_answer`

### Requirement: DRY_RUN_COMPLETION_RULE 試標完成規則涵蓋標註、必要審核與必要仲裁（BREAKING）

> **delta 形式註記**：本條改寫正典既有的規格常數 `DRY_RUN_COMPLETION_RULE`（`specs/task-management/014-task-detail/spec.md:56`），屬 BREAKING。置於 ADDED 區段而非 MODIFIED 區段，因為衍生檢視尚未收錄此常數，archive 的標題比對會找不到既有標題。回寫正典時仍為原地改寫。

規格常數 `DRY_RUN_COMPLETION_RULE` MUST 自「僅計標註提交」改為涵蓋標註、必要審核與必要仲裁三者：

`DRY_RUN_COMPLETION_RULE = no unassigned dry-run assignments AND all membership_status=active annotators: assigned_count == completed_count AND all dry_run review units derived as finalized AND no dry_run review unit derived as disputed AND no pending dry_run final-exception-pool item`

**(1) 審核與仲裁的判定來源**。審核單位之定址與狀態判定式 MUST 沿用 `annotation/015-annotation-workspace` FR-051，MUST NOT 於本規格另建第二份判定式。爭議項之裁定 MUST 沿用 `annotation/015-annotation-workspace` FR-061，或於 `arbiter_ids` 為空時沿用本規格 FR-023。

**(2) 合法排除仍然有效**。依 FR-005h 被 `project_leader` 明確排除的標記作業 MUST NOT 計入標註完成度；經最終例外池「自資料集排除」處置的項目 MUST 視為已解決，與 FR-008b 第 (2) 項既有語意一致。本條 MUST NOT 使任何既有合法處置變成永遠無法完成。

**(3) 連帶修訂的驗收與成功標準**。AC-3.2 之 **Then** 子句 MUST 改為「僅在標註、必要審核與必要仲裁皆完成時才自動轉為 `waiting_iaa_confirmation`」；AC-3.16 之充分性敘述 MUST 同步改為新規則；SC-004 MUST 同步改為新規則。三者的 ID 不變。

**(4) 不變動的部分**。`TASK_STATUSES` 五態不變，MUST NOT 新增「待確認完成」狀態或任何重開流程。IAA 仍為顧問性警示，FR-010o-3 與 FR-010o-4 文字不變——本條新增的前置條件與 IAA 達標與否、計算是否結束皆無關，MUST NOT 被表述為 IAA 問題。

#### Scenario: 全員提交但仍有待審核單位時維持試標中

- **GIVEN** 一個 `dry_run_in_progress` 任務，其本回合所有 active 標記員皆 `assigned_count == completed_count` 且無未指派作業，但存在至少一個推導為「待審」的審核單位
- **WHEN** 系統依 FR-008a 評估試標完成條件
- **THEN** 任務狀態維持 `dry_run_in_progress`，不自動轉為 `waiting_iaa_confirmation`
- **AND** 畫面以可見文字說明標註已提交、尚有審核待完成，並顯示帶單位的剩餘數

#### Scenario: 審核完成但必要仲裁未完成時仍維持試標中

- **GIVEN** 一個 `dry_run_in_progress` 任務，其本回合標註全數提交、所有審核員皆已提交決策，但存在至少一個推導為「爭議中」的審核單位
- **WHEN** 系統依 FR-008a 評估試標完成條件
- **THEN** 任務狀態維持 `dry_run_in_progress`
- **AND** 畫面區分「待審核」與「待仲裁」兩種剩餘項目並各自顯示數量與單位

#### Scenario: 試標例外池有待處置項目時仍維持試標中

- **GIVEN** 一個 `dry_run_in_progress` 任務，其本回合標註與審核皆完成、爭議項皆已裁定，但其中一項裁定為「兩者皆非」而落入 `dry_run` 最終例外池尚未收尾
- **WHEN** 系統依 FR-008a 評估試標完成條件
- **THEN** 任務狀態維持 `dry_run_in_progress`
- **AND** 畫面揭露 `dry_run` 例外池待處置項目數為未完成原因之一

#### Scenario: 三者皆完成後才自動轉入待 IAA 確認

- **GIVEN** 一個 `dry_run_in_progress` 任務，其本回合無未指派作業、所有 active 標記員皆完成各自全部試標內容、所有 `dry_run` 審核單位皆推導為「已定稿」、無「爭議中」單位、`dry_run` 最終例外池已清空
- **WHEN** 系統依 FR-008a 評估試標完成條件
- **THEN** 任務自動轉為 `waiting_iaa_confirmation` 並對 `project_leader` 發送提醒
- **AND** 此轉換不因最新回合 IAA 未達標或計算尚未結束而被阻擋

### Requirement: FR-008a 試標完成之自動狀態轉換涵蓋審核與仲裁（BREAKING）

> **delta 形式註記**：同上——FR-008a 尚未收錄於衍生檢視，故置於 ADDED 區段；回寫正典（`specs/task-management/014-task-detail/spec.md:584`）時為原地改寫，屬 BREAKING。

FR-008a MUST 原地改寫為：當任務本回合滿足 `DRY_RUN_COMPLETION_RULE` 修訂後之全部條件——沒有未指派 Dry Run 標記作業、每一位 `membership_status = active` 的 `annotator` 皆滿足 `assigned_count == completed_count`、全部 `dry_run` 審核單位皆推導為「已定稿」、不存在推導為「爭議中」的 `dry_run` 審核單位、`dry_run` 最終例外池已清空——時，系統 MUST 自動轉為 `waiting_iaa_confirmation` 並建立提醒。任一條件不符時，系統 MUST 維持 `dry_run_in_progress`，並 MUST 以可見文字逐項列出未滿足的條件與其帶單位的剩餘數。

本條之評估 MUST 以「當前回合」為範圍，與 AC-3.16 既有語意一致：新建立的回合在其本身的標註、審核與仲裁完成前 MUST NOT 轉回 `waiting_iaa_confirmation`。轉換前置條件之狀態機來源仍為 `docs/adr/022-task-state-machine-location.md` Transition Table，該表對應列 MUST 同步修訂並新增 Amendment。

#### Scenario: 未滿足時逐項列出原因與單位

- **GIVEN** 一個 `dry_run_in_progress` 任務同時存在待審核單位與爭議中單位
- **WHEN** `project_leader` 檢視 Overview 的任務狀態與執行控制
- **THEN** 畫面逐項列出未滿足的條件，每一項附帶可辨識單位的剩餘數
- **AND** 原因文字不僅以 hover 或顏色傳達，可由鍵盤與螢幕閱讀器取得

## MODIFIED Requirements

### Requirement: FR-013 執行控制按鈕依任務狀態顯示，新增試標回合僅自待 IAA 確認狀態發起

Overview「任務狀態與執行控制」的執行控制按鈕 MUST 與任務狀態一一對應，且按鈕 MUST 與「達標條件」位於同一操作列：

| 任務狀態 | 顯示的執行控制按鈕 |
|----------|--------------------|
| `draft` | `新增試標回合 R1` |
| `dry_run_in_progress` | `新增試標回合 R{trial_round+1}` 以**停用**狀態顯示，並於按鈕旁以可見文字顯示原因「本回合全部提交並完成 IAA 後才能新增下一回合」 |
| `waiting_iaa_confirmation` | `開始正式標記` 與 `新增試標回合 R{trial_round+1}` 兩者並列 |
| `official_run_in_progress` | `標記完成` |
| `completed` | 不顯示執行控制按鈕，只顯示狀態 badge 與說明文字 |

**(1) 回合必須先結束才能開下一回合**。`dry_run_in_progress` 表示目前回合仍在進行；此狀態下 `新增試標回合 R{trial_round+1}` MUST 維持可見但停用，點擊 MUST NOT 建立回合、MUST NOT 改變任務狀態，原因文字 MUST 以可見文字呈現（MUST NOT 只放在 tooltip）。下一個回合只能在目前回合依 FR-008a 完成、任務自動進入 `waiting_iaa_confirmation` 之後發起。此停用的依據是「本回合尚未結束」，與 IAA 是否達標無關，因此不違反 FR-010o-3。

**(2) 待 IAA 確認是唯一的決策點**。`waiting_iaa_confirmation` 狀態 MUST 同時提供 `開始正式標記` 與 `新增試標回合 R{trial_round+1}`：兩者是同一決策點上的互斥選項，任一成功後任務即轉入新狀態、操作列改依新狀態的對照表呈現，因此不構成「語意衝突的操作」。本需求不改變 FR-010o-3——IAA 達標與否仍只是顧問性警示，兩個按鈕 MUST NOT 因 IAA 未達標而停用或隱藏。

**(3) 新狀態轉換**。自 `waiting_iaa_confirmation` 成功建立 `新增試標回合 R{n}`（`n >= 2`）時，任務狀態 MUST 轉為 `dry_run_in_progress`；該回合清單建立（FR-010f-2）與狀態轉換 MUST 視為同一動作，MUST NOT 出現「清單已建立但狀態仍為 `waiting_iaa_confirmation`」或「狀態已轉換但清單尚未建立」的可觀察中間狀態。轉換後 MUST NOT 在新回合任何一筆標記提交之前，就因 FR-008a 的完成條件立即轉回 `waiting_iaa_confirmation`——FR-008a 對新回合的評估 MUST 涵蓋本回合剛建立的標記作業。

**(4) 修訂紀錄必填檢查不變**。點擊 `新增試標回合 R{n}`（`n >= 2`）時，若未通過 FR-017 之修訂紀錄必填檢查，系統 MUST 阻擋建立並逐欄列出缺項提示，阻擋樣式比照 FR-010t（逐項顯示未滿足條件，不得靜默忽略點擊）；被阻擋時任務狀態 MUST 維持 `waiting_iaa_confirmation`。

**(5) 狀態機來源**。本需求新增之 `waiting_iaa_confirmation → dry_run_in_progress` 轉換，MUST 同步列入 `docs/adr/022-task-state-machine-location.md` 的 Transition Table 與 `ALLOWED_TRANSITIONS` 白名單；`dry_run_in_progress → dry_run_in_progress`（進行中另開回合）MUST NOT 列入。

**(6) 揭露時點不變**。`annotation/015-annotation-workspace` FR-096 之試標歷史回饋揭露規則不因本需求修改：R{n+1} 只能在 R{n} 已進入 `waiting_iaa_confirmation` 之後建立，因此 R{n} 的揭露前提在 R{n+1} 建立前即已成立；R{n+1} 進行中其本身資料仍一律不揭露。

**(7) 回溯轉換不是跳階（釐清，維護者 2026-09-18 裁定）**。正典使用者故事 3 行為規則「狀態轉換必須符合 `TASK_STATUSES` 順序，不允許跳階」與 SC-004「任務狀態轉換遵循定義順序」的「順序」，MUST 以 `docs/adr/022-task-state-machine-location.md` 的轉換表判定：合法轉換以 ADR-022 轉換表為準；表列的回溯轉換（含本需求新增的 `waiting_iaa_confirmation → dry_run_in_progress`）不視為跳階。gate 4 回寫時於該行為規則與 SC-004 原地補上此句，不新增任何 FR／AC／SC 編號。

**本次修訂（issue #1120，BREAKING）**：第 (1) 點之停用原因文字自「本回合全部提交並完成 IAA 後才能新增下一回合」改為涵蓋審核與仲裁——`dry_run_in_progress` 下 `新增試標回合 R{trial_round+1}` MUST 維持可見但停用，其可見原因文字 MUST 說明本回合的標註、必要審核與必要仲裁全部完成後才能新增下一回合。該停用依據仍為「本回合尚未結束」，與 IAA 是否達標無關，MUST NOT 被視為違反 FR-010o-3。其餘各點文字不變。

#### Scenario: AC-3.12 自待 IAA 確認新增第二回合須先填修訂紀錄

- **GIVEN** 任務已完成 R1 試標且處於 `waiting_iaa_confirmation`
- **WHEN** `project_leader` 點擊 `新增試標回合 R2` 但未填寫 `prior_round_findings` 與 `guideline_change_summary`、也未勾選 `no_change`
- **THEN** 系統阻擋建立並逐欄提示缺項，任務狀態維持 `waiting_iaa_confirmation`
- **AND** 補齊必填欄位（或勾選 `no_change` 並填寫 `no_change_reason`）後方可成功建立 R2，任務狀態轉為 `dry_run_in_progress`，且新建立的 `TrialRound.sampling_value` 等於本輪實際建立之試標清單筆數（FR-017、FR-010f-2）

#### Scenario: 試標進行中的新增試標回合按鈕停用並顯示原因

- **GIVEN** 任務處於 `dry_run_in_progress`（不論目前是 R1 或其後任一回合）
- **WHEN** `project_leader` 檢視 Overview「任務狀態與執行控制」
- **THEN** 操作列顯示停用狀態的 `新增試標回合 R{trial_round+1}`，按鈕旁可見原因文字「本回合全部提交並完成 IAA 後才能新增下一回合」，且不出現其他執行控制按鈕
- **AND** 點擊該按鈕不建立任何回合，任務狀態維持 `dry_run_in_progress`

#### Scenario: 待 IAA 確認同時提供開始正式標記與新增試標回合

- **GIVEN** 任務處於 `waiting_iaa_confirmation` 且已完成 R1，最新回合 IAA 未達目標門檻
- **WHEN** `project_leader` 檢視 Overview「任務狀態與執行控制」
- **THEN** 操作列同時顯示 `開始正式標記` 與 `新增試標回合 R2`，兩者皆可點擊
- **AND** IAA 未達標只以警示樣式呈現，不停用或隱藏任一按鈕（FR-010o-3）

#### Scenario: 新回合建立後在任何提交前不會自動轉回待確認

- **GIVEN** 任務自 `waiting_iaa_confirmation` 成功建立 R2，任務狀態已轉為 `dry_run_in_progress`，且 R2 尚無任何標記提交
- **WHEN** 系統依 FR-008a 評估試標完成條件
- **THEN** 任務狀態 MUST 維持 `dry_run_in_progress`，直到 R2 的標記作業依 `DRY_RUN_COMPLETION_RULE` 全部完成才轉為 `waiting_iaa_confirmation`

#### Scenario: SC-047 每個試標回合都經過待確認決策點

- **GIVEN** `TASK_STATUSES` 五種任務狀態各一個以 `project_leader` 開啟的任務
- **WHEN** 逐一檢視 Overview「任務狀態與執行控制」操作列
- **THEN** 可點擊的 `新增試標回合` 按鈕恰只出現在 `draft`（顯示 R1）與 `waiting_iaa_confirmation`（顯示 R{trial_round+1}）兩種狀態，`dry_run_in_progress` 只出現停用狀態的該按鈕並附原因文字，五種狀態逐一比對 5／5 符合 FR-013 對照表
- **AND** 任一任務自 `draft` 起經歷 N 個試標回合（N >= 2），每一個 R{n}（`n >= 2`）的建立都恰對應一次 `waiting_iaa_confirmation → dry_run_in_progress` 轉換，不存在任何在 `dry_run_in_progress` 期間建立的回合

#### Scenario: 停用原因涵蓋審核與仲裁

- **GIVEN** 一個 `dry_run_in_progress` 任務，其標註已全數提交但仍有審核或仲裁未完成
- **WHEN** `project_leader` 檢視執行控制操作列
- **THEN** `新增試標回合` 按鈕可見且停用，旁側可見原因文字提及必要審核與必要仲裁
- **AND** 點擊該按鈕不建立任何回合，任務狀態維持 `dry_run_in_progress`

### Requirement: FR-018 最終例外池

`annotation-progress` 頁籤 MUST 提供「最終例外池」區塊，作為專案負責人逐筆收尾爭議的入口。

1. **入口與計數**：區塊標題列 MUST 顯示待處置項目數；`0` 時 MUST 渲染空狀態（`最終例外池已清空`），MUST NOT 隱藏整個區塊——結案閘門（FR-008b）依賴此處為唯一可稽核的呈現點。
2. **清單欄位**：逐筆呈現樣本 ID、標記員帳號、審核員帳號、爭議的輸出類型、仲裁者帳號與其「兩者皆非」理由、落入例外池的時間。
3. **逐筆導頁**：每列 MUST 提供進入處置畫面的動作，導向 `annotation/015-annotation-workspace` FR-095 之收尾介面並攜帶完整審核單位身分（`task_id × run_type × annotator_id × sample_id`）與爭議項識別。
4. **權限**：本區塊 MUST 僅對 `project_leader` 呈現；其他角色 MUST NOT 看到此區塊，直連進入時 MUST 比照 FR-006 導回並提示無權限。
5. **run 分流**：清單 MUST 可依 `run_type` 篩選；`dry_run` 與 `official_run` 的例外項各自獨立計數，FR-008b 第 4 項之結案閘門 MUST 僅計 `official_run` 的待處置項目。

**本次修訂（issue #1120，BREAKING）**：第 (5) 點之閘門範圍自「FR-008b 第 (4) 項之結案閘門僅計 `official_run` 的待處置項目」改為兩個閘門各自取用對應 `run_type` 的待處置項目——`dry_run` 的待處置例外項 MUST 計入試標完成閘門（FR-008a 與修訂後之 `DRY_RUN_COMPLETION_RULE`），`official_run` 的待處置例外項 MUST 計入結案閘門（FR-008b 第 (4) 項）。清單仍 MUST 可依 `run_type` 篩選，兩者仍各自獨立計數、MUST NOT 相加。第 (1)～(4) 點文字不變，包含 `0` 時必須渲染空狀態而非隱藏區塊，以及僅 `project_leader` 可見之角色邊界。

#### Scenario: SC-043 例外池清單與導頁
- **GIVEN** 某任務有 2 項 `official_run` 待處置例外
- **WHEN** 專案負責人開啟 `annotation-progress`
- **THEN** 「最終例外池」區塊標題顯示 2 項待處置，逐列呈現樣本 ID、標記員、審核員、爭議輸出類型、仲裁者與其理由
- **AND** 點擊任一列進入該爭議項的處置畫面，網址攜帶完整審核單位身分

#### Scenario: 非專案負責人看不到例外池
- **GIVEN** 操作者為 `reviewer`
- **WHEN** 其開啟 `annotation-progress`
- **THEN** 畫面上不存在「最終例外池」區塊

#### Scenario: dry_run 例外項計入試標閘門而不計入結案閘門

- **GIVEN** 一個任務同時存在 `1` 筆待處置的 `dry_run` 例外項與 `0` 筆待處置的 `official_run` 例外項
- **WHEN** 系統分別評估試標完成條件與結案條件
- **THEN** 試標完成條件因該 `dry_run` 例外項而未滿足
- **AND** 結案閘門的例外池條件不因該 `dry_run` 例外項而未滿足
- **AND** 最終例外池清單可依 `run_type` 篩選，兩種計數分列呈現且未相加

### Requirement: FR-010t 發布前的成員人數檢查

發布 `新增試標回合 R{n}` 或 `開始正式標記` 前，系統 MUST 驗證實際啟用成員人數：

1. `membership_status = active` 且 `task_role = annotator` 的人數 `>= min_annotators`；
2. 被勾選為審核員（`reviewer_ids`）且 `membership_status = active` 的人數 `>= 1`。

任一條件不足時，系統 MUST 阻擋發布，並逐角色顯示缺口訊息「還差 N 位」（`N = 應有人數 - 實際人數`）。發布前檢查 MUST NOT 僅驗證抽樣／審核設定值本身（決策 D3，issue #189）。

`arbiter_ids` 為空時 MUST NOT 阻擋發布，但 MUST 於發布確認顯示警示：未指定仲裁者時，爭議項將無人可仲裁而堆積於爭議池，任務將無法結案（FR-008b 第 3 項）。

**v3.0.0 修訂**：原「active reviewer 人數 `>= min_reviewers`」改為上列第 2 項——`min_reviewers` 已移除，審核只需至少一位被勾選的審核員即可運作。

**v4.2.0 修訂**：發布前 MUST 依當下成員狀態重算啟用中的有效分派池 `reviewer_ids - arbiter_ids`，且該集合 MUST 至少一人。若設定儲存後的成員停用或移除使有效分派池歸零，系統 MUST 阻擋發布、顯示至少需一位未被指定為仲裁者的啟用中審核員，且 MUST NOT 建立回合或改變任務狀態。`arbiter_ids = []` 仍依既有規則合法。

**本次修訂（issue #1120）**：`arbiter_ids` 為空時的發布警示文案 MUST 更新。`arbiter_ids` 為空仍 MUST NOT 阻擋發布，但警示文字 MUST 改為說明爭議項將由 `project_leader` 依 FR-023 自行裁定，MUST NOT 再聲稱「任務將無法結案」——該敘述在 FR-023 生效後已不成立。成員人數檢查第 (1)(2) 點與其「還差 N 位」缺口訊息文字不變。

#### Scenario: 未勾選審核員時阻擋發布
- **GIVEN** 某 `draft` 任務有足額標記員但 `reviewer_ids` 為空
- **WHEN** 專案負責人點擊 `新增試標回合 R1`
- **THEN** 發布被阻擋並顯示審核員「還差 1 位」
- **AND** 另一任務已勾選審核員但未勾選仲裁者時發布不被阻擋，僅於確認畫面顯示無仲裁者的警示

#### Scenario: 成員異動不得留下零分派池
- **GIVEN** 任務已儲存 `reviewer_ids = [W, C]`、`arbiter_ids = [C]`，之後 W 被停用而只剩 C 為啟用中 reviewer
- **WHEN** 專案負責人發布新增試標回合或開始正式標記
- **THEN** 發布被阻擋並顯示至少需一位未被指定為仲裁者的啟用中審核員
- **AND** 任務狀態與回合數維持不變

#### Scenario: 空仲裁者名冊的發布警示指向負責人裁定通道

- **GIVEN** 一個 `arbiter_ids` 為空、成員人數檢查皆通過的任務
- **WHEN** `project_leader` 進入發布確認
- **THEN** 發布未被阻擋，警示文字說明爭議項將由負責人自行裁定（FR-023）
- **AND** 警示文字不含「任務將無法結案」之敘述
