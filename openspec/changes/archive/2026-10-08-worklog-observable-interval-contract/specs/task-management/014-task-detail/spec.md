## MODIFIED Requirements

### Requirement: FR-010u 跨頁籤衍生計數的共用查詢上下文與聚合單位（成功標準 SC-050）

- **FR-010u**（**v5.0.0 新增**，對應 AC-1.26、AC-1.27、SC-050，issue #1120）：`task-detail` 五個頁籤（`TASK_TABS`）呈現的衍生計數必須以同一組查詢上下文推導，並必須依既有正典定義之聚合單位計數。(1) **共用查詢上下文**：任務、cycle、`run_type` 與回合為共用查詢上下文，概覽、成員、進度、結果四個頁籤之計數必須由同一組 `task_id × cycle_id × run_type × round_no` 推導；選取某一回合時不得混入其他回合或其他任務的資料。工時與匯出歷史必須依當前任務篩選；該任務無對應紀錄時必須呈現真實空狀態，不得呈現其他任務的通用示範資料。(2) **`已提交` 的分子分母**：分子為該 `task_id × cycle_id × run_type × round_no` 範圍內已提交之標記 assignment 數；分母為同範圍內未排除之標記工作 slot 數（含退回未指派的 slot）。依 FR-005h 被 `project_leader` 明確排除之標記作業不得計入分子或分母，與 FR-005h 既有的「不計入完成率或標記分布統計」一致。(3) **`已完成輪次` 的分子**：分子為已結束之試標回合數；當前進行中之回合不得計入。歷史回合與當前回合必須分列呈現，兩者之計數與決策不得交叉累計。「已結束」之判定依既有試標完成規則（FR-008a），本條不另定義該規則。(4) **既有定義不得重複**：`已定案 review unit` 之判定式與聚合單位（穩定 run／assignment 範圍內之樣本／標記員維度）以 `annotation/015-annotation-workspace` FR-051 為正典；`最終例外輸出項目` 之來源與逐筆收尾動作以 `annotation/015-annotation-workspace` FR-095 為正典，其分 `run_type` 獨立計數規則沿用本規格 FR-018 第 (5) 點。本規格必須讀取該兩處既有定義，不得另建第二份判定式、分母或狀態清單。(5) **單位不得相加**：標記 assignment、審核單位、爭議項（同一 run 範圍，以 `annotation/015-annotation-workspace` FR-061 第 7 點為計數單位：審核單位內之 `outKey × 合併鍵`，依 FR-059）分屬三個不同聚合層級，不得相加為單一數字，亦不得共用同一分母。畫面呈現必須使每個計數的單位可辨識；提交進度與定案進度必須分別命名，不得以同一標題涵蓋兩者。(6) **時間語意**：已提交時間不得被呈現為審核完成或仲裁完成時間；各階段時間必須取自其各自的事件來源。(7) **資料分配與工作完成分離**：樣本池分配的視覺呈現（FR-010p）必須附明確的「資料分配」語意說明；分配比例達滿不得被表述為標記或審核工作已完成。 上述範圍等價於穩定 `run_id`；重複 R1 不得合併 cycle。提交分母為同 run 未排除工作 slot 數（含退回未指派者），重指派不增分母；舊 cycle 回合不納入目前閘門。 **v9.0.0 工時補充**：工時與完成事件須依 `account_session_id × task_id × run_id × membership_id × work_kind × report_date` 分組；相同 task 的不同 session、cycle、run 不得合併。工時速度逐類顯示，標記 assignment、審核單位與爭議項不得相加；同一審核 submission head 的多筆 outKey 決策與修訂只計一次。

#### Scenario: 五個頁籤的計數同源且不混入其他任務或回合

- **GIVEN** 一個任務同時存在已結束的試標回合與一個進行中的回合
- **WHEN** `project_leader` 依序檢視概覽、成員、進度、結果、工時五個頁籤
- **THEN** 各頁籤呈現的計數皆由同一組 `task_id × cycle_id × run_type × round_no` 推導，數值彼此一致，且不同 cycle 的同名 R1 不混算
- **AND** 畫面不出現其他任務的回合、樣本數、工時或匯出歷史紀錄
- **AND** 該任務無工時或匯出紀錄時，對應區塊呈現空狀態而非其他任務的示範資料

#### Scenario: 三種計數單位分列呈現且不相加

- **GIVEN** 一個任務之標記 assignment、審核單位與爭議項三者數量互不相等
- **WHEN** `project_leader` 檢視進度與結果頁籤
- **THEN** 提交進度與定案進度分別命名呈現，各自的分子分母可辨識其單位
- **AND** 畫面不存在將標記 assignment 數、審核單位數與爭議項數相加後的單一數字
- **AND** 歷史回合與當前回合的計數分列呈現，未交叉累計

#### Scenario: FR-010u 對應 AC-1.26

- **GIVEN** 一個任務同時存在已結束的試標回合與一個進行中的回合
- **WHEN** `project_leader` 依序檢視概覽、成員、進度、結果、工時五個頁籤
- **THEN** 各頁籤呈現的計數皆由同一組 `task_id × cycle_id × run_type × round_no` 推導、數值彼此一致，畫面不出現其他任務的回合、樣本數、工時或匯出歷史紀錄；該任務無工時或匯出紀錄時，對應區塊呈現空狀態而非其他任務的示範資料（FR-010u）。（FR-010u；AC-1.26）

## ADDED Requirements

### Requirement: FR-007b 各類工作速度與完成單位

- **FR-007b**（**v9.0.0 修訂，BREAKING**，issue #1160）：`工時明細表` 的完成筆數必須拆分為 `標記筆數`、`審核筆數`、`仲裁筆數` 三欄；角色不適用的欄位顯示 `—`（標記員僅有標記筆數；審核員僅有審核筆數與仲裁筆數）。匯總卡片為 `總工時`、`總標記筆數`、`總審核筆數`、`各類工作速度` 四張。速度只逐類顯示 `標記件/時`、`審核單位/時`、`仲裁項/時`，各以對應種類之完成筆數及可信工作時長計算；無可信時長或分母為零時顯示 `—`。審核送出按 `annotation_review_submission.id` 去重，逐 outKey 決策及後續修訂不增加審核單位；標記按 run 內完成 assignment 去重，仲裁按終局爭議鍵去重。異常提醒亦須按同種類與同單位比較，不得混合三類完成筆數。

#### Scenario: 各類速度不混單位

- **WHEN** 標記、審核與仲裁完成筆數同時存在
- **THEN** 三類速度以各自筆數與可信工作時長計算，不能相加；無分母顯示未知

### Requirement: FR-007d 可觀測工作區間與日報表

- **FR-007d**（v9.0.0 新增，issue #1160）：工時原始來源為未部署候選 `task_work_interval`，每列限定同一 `account_session_id`、`task_id`、`run_id`、`membership_id`、`work_kind` 的一段可觀測前景工作；`work_kind = annotation | review | arbitration`，後端依有效身分及 membership 角色驗證。服務端以 UTC 記錄 `started_at`、`last_seen_at`、可空 `ended_at`，工作區可見且聚焦時開始，候選心跳每 30 秒；10 分鐘無互動視為閒置，失焦、背景、切換任務/run/種類、登出或安全撤銷皆結束區間。失聯 90 秒時只以最後有效 `last_seen_at` 關閉，不以等待時間或客戶端時鐘補工時；同一使用者至多一筆未結束區間，跨裝置競爭須由交易與部分唯一約束防重。原始 UTC 區間不拆列；報表固定 `Asia/Taipei`，跨日於查詢時計算當地午夜裁切，按 session × task × run × membership × work kind × 報表日期分組。同一 session 可跨任務/run，登入不等於工作；`annotation_history_event.lead_time_ms` 亦不得當工時。合法完成事件即使沒有可信區間仍可計數，該列工作時長與速度顯示「未知」；僅有可信區間但無完成事件時筆數可為 0。`login_at` 只取 `account_session.started_at`；`logout_at` 只取可驗證明確登出的 `logged_out_at`，無值及上線時長顯示「未知」，不得由 `revoked_at` 推估。上線時長僅代表該 session 登入到明確登出的當日切片，非網路連線證據；同 session 跨多列展示不得相加。標記完成按 run × assignment 去重，審核完成按 submission head 去重，仲裁完成按終局爭議鍵去重；無可驗證 session 的舊事件不猜測歸屬。`WorkLogEntry` 為唯讀查詢投影，不建立同名表。

#### Scenario: 失聯與跨日報表

- **WHEN** 可觀測區間跨台北午夜且後續失聯
- **THEN** 原始 UTC 區間不拆列，只按當地日界投影，失聯以最後有效 `last_seen_at` 關閉

### Requirement: AC-1.28 同日兩次登入與跨 run 隔離

28. **AC-1.28**（v9.0.0，issue #1160）：**Given** 同一成員同日在同一任務登入兩次，且第一次登入含兩個不同 run 的工作區間，**When** 負責人檢視工時紀錄，**Then** `account_session_id × task_id × run_id × membership_id × work_kind × report_date` 各自成列，同日兩次登入與不同 run 均不合併；只有可信區間才提供工作時長（FR-007d、FR-010u）。

#### Scenario: 同日登入分列

- **WHEN** 同一成員同日兩次登入並在不同 run 開工
- **THEN** session 與 run 分列，不重複或跨列合併

### Requirement: AC-1.29 跨日與登出未知

29. **AC-1.29**（v9.0.0，issue #1160）：**Given** 一段可觀測工作區間跨日且登入工作階段未能明確登出，**When** 以 `Asia/Taipei` 日期篩選工時，**Then** 原始 UTC 區間不拆列，報表於當地午夜裁切至兩日；登出及上線時長顯示「未知」，不得由 `revoked_at` 推估（FR-007d）。

#### Scenario: 無明確登出與跨日

- **WHEN** 工作區間跨日而 session 無 `logged_out_at`
- **THEN** 報表按台北午夜裁切，登出與上線時長未知

### Requirement: AC-1.30 失聯關閉與時間未知

30. **AC-1.30**（v9.0.0，issue #1160）：**Given** 工作頁面失焦或心跳失聯，**When** 服務結束工作區間，**Then** 失聯段以最後有效 `last_seen_at` 關閉，未觀測等待時間不計入工時；有合法完成事件但無可信區間時筆數保留、工作時長與速度顯示「未知」（FR-007d、FR-007b）。

#### Scenario: 失聯及合法完成事件

- **WHEN** 心跳失聯或頁面失焦，但已有合法完成事件
- **THEN** 工時只算可信區間，完成筆數保留，無可信時長則速度未知

### Requirement: AC-1.31 完成事件按來源去重

31. **AC-1.31**（v9.0.0，issue #1160）：**Given** 一次審核送出產生多個 outKey 決策與後續修訂，**When** 計算該 session/run 的完成筆數，**Then** 同一審核 submission head 只算一個審核單位，仲裁依終局爭議鍵去重，標記 assignment 另算；三類數量不得相加為單一速度（FR-007b、FR-010u）。

#### Scenario: 多 outKey 審核去重

- **WHEN** 同次審核多個 outKey 並有後續改判
- **THEN** 審核 submission head 只計一個審核單位

### Requirement: SC-057 雙庫開啟區間唯一性

- **SC-057**（v9.0.0，issue #1160）：SQLite 與 PostgreSQL 的候選約束驗證均須證實同一 user 雙裝置同時開工時至多一筆未結束 open 區間；失聯只以最後有效 `last_seen_at` 關閉，UTC 區間按台北日期裁切後同日多次登入與不同 run 不合併。規劃圖通過文件驗證不等於雙庫 migration 已通過，正式實作階段須補兩庫交易測試。

#### Scenario: SQLite 與 PostgreSQL 開段競爭

- **WHEN** 同一 user 雙裝置同時開工
- **THEN** SQLite 與 PostgreSQL 均須由候選部分唯一約束及服務交易保證至多一筆 open 區間

### Requirement: SC-058 完成筆數隔離與答案保護

- **SC-058**（v9.0.0，issue #1160）：同 run 的標記 assignment、審核 submission head、終局爭議鍵各自去重；多 outKey 審核決策及後續修訂不重複算審核單位。缺可信時間仍保留合法筆數但速度未知；標記員回應不得包含他人的 session、私有答案或 gold/test 答案。

#### Scenario: 完成數與答案隔離

- **WHEN** 同 run 有多 outKey 決策與仲裁事件
- **THEN** 各類完成筆數依不同單位去重，標記員回應不含他人 session 或私有答案
