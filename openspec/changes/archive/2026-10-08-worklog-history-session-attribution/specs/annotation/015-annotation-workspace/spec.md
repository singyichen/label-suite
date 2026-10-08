## MODIFIED Requirements

### Requirement: FR-088 標記耗時記錄與可見性

- **FR-088**（v4.61.0 新增，對應 AC-2.19、AC-3.49，issue #578；**v6.9.0 修訂**，對應 AC-2.26，issue #583）：**標記耗時記錄與可見性**。每筆事件必須承載 `started_at`（該次作業起算時間）與 `lead_time`（該次作業耗時）。`lead_time` 之口徑必須為頁面可見時間累計：分頁切離背景或視窗失焦時必須暫停計時，回到前景時必須續計，不得以「事件時間相減」的掛鐘時間充當耗時。可見性：`lead_time` 不得於 annotator 視角之任何呈現路徑出現（避免標記員因看見秒數而改變作答行為，污染以耗時分析標記難度的研究資料）；reviewer 視角與任務層級統計（`task-detail` 之 `annotation-results` 分頁「標記結果表」）必須可見。本條僅規定歷程耗時之可見性；014 的 `work-log` 以 `task_work_interval` 計算可觀測工作時長，`WorkLogEntry` 為查詢投影，歷程事件之 `lead_time` 不得當成工時。**v6.9.0 修訂（issue #583，一次作業一份耗時）**：本條首句「每筆事件必須承載」修訂為：每次作業（標記員提交、草稿儲存或審核員送出）所寫入之事件中，`started_at` 與 `lead_time` 必須恰出現一次，不得於同一次作業之多筆事件重複寫入。審核員送出寫入多筆決策事件時，必須僅由其中第一筆寫入之決策事件承載，其餘決策事件不得帶這兩個欄位；呈現端依 FR-016B「缺哪一個欄位就不渲染對應區塊」處置，不得補寫推估值。本版以前寫入、同一次作業重複承載之舊事件必須原樣保留。 **v12.1.0 工時歸屬補充（issue #1160）**：`annotation_history_event.account_session_id` 為可空真實 FK 指向 `account_session.id`；新認證使用者動作必填，從已驗證 JWT `sid` 由服務端寫入，並核對 session 所屬 user 與 actor membership，不接受客戶端指定。舊事件及系統事件可空，缺值不得猜測歸屬到任何 session。`lead_time`／`lead_time_ms` 仍只描述單次歷程作業，不得作為工時或工作時長來源；標記員可見投影不得暴露其他人的 session、私有答案或其他成員歷程。

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

#### Scenario: 已驗證 session 歸屬與遮蔽

- **WHEN** 新認證使用者提交標記、審核或仲裁動作
- **THEN** 服務以已驗證 JWT `sid` 寫入真實 session FK，確認 actor 所屬帳號；舊與系統事件可空，不以歷程耗時推算工時
- **AND** 標記員可見投影不含他人 session 或私有答案
