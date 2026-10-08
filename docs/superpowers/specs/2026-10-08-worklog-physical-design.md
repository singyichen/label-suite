# MVP 工時紀錄實體候選設計（issue #1160）

## 目的、現況與界線

任務詳情的「工時紀錄」須顯示可追溯的工作時間與完成筆數，並依任務、發布執行、成員、實際登入工作階段及報表日期分開。使用者已指定 Lite 使用 SQLite、正式機使用 PostgreSQL；本切片只制定正典契約、候選欄位字典及 NoteCraft Wiki／Diagram，**不建立 ORM、migration、API 或已部署資料表**。資料集分析 016／017 的專用統計與 IAA 報告依 MVP 範圍裁決延後。

現行 014 要求登入／登出、上線與工作時長、三種完成筆數及速度；015 FR-088 明言標記歷程的 `lead_time_ms` 與工時是兩套資料。現有 `account_session.started_at` 能證實登入，`logged_out_at` 只在可驗證明確登出時有值；`revoked_at` 不能證明登出。014 FR-007b 的三類筆數相加，與 FR-010u 禁止混合標記 assignment、審核單位及爭議項的規則衝突。這些事實先於任何欄位設計。

成功條件：一次登入的不同任務／run 不混列；同日多次登入不混列；跨日區間只在查詢時切日；同一完成動作不因多個 outKey 或重送重複計數；沒有可信工作時間或明確登出時顯示「未知」，不捏造零分鐘或登出時間；標記者不因此得到私有答案或其他成員資料。

## 方案比較與裁決

| 方案 | 好處 | 缺點 | 結論 |
|---|---|---|---|
| 只從登入工作階段、標記歷程推算 | 不加原始表 | 登入不等於工作，`lead_time_ms` 不是工時；無法辨認失焦與閒置 | 不採用 |
| 每次操作另建完成事件表與每日彙總表 | 查詢容易 | 與既有 `annotation_history_event` 重複事實；晚到事件、修訂與跨日會使彙總漂移 | 不採用 |
| 一張工作區間表，加既有歷程的 session 來源，按需投影 | 原始時間與完成事實分開；可重算日報表；來源可追溯 | 需定義心跳與中斷邊界，跨表一致性須交易驗證 | **採用** |

`WorkLogEntry` 保留為唯讀查詢投影，**不建同名資料表**。DBA 建議的原始表名為常見、表意直接的 `task_work_interval`。一列只記錄一位使用者在同一任務、run、membership、登入工作階段與工作種類下的一段連續可觀測前景工作；不保存累計時長、日報表、角色副本、run stage 或完成筆數。

## 候選實體與資料流

### `task_work_interval`

候選 11 欄：`id uuid` 非空 PK；`user_id uuid`、`account_session_id uuid`、`task_id uuid`、`run_id uuid`、`membership_id uuid` 非空身分；`work_kind varchar(16)` 非空，限 `annotation | review | arbitration`；`started_at timestamptz`、`last_seen_at timestamptz` 非空；`ended_at timestamptz`、`close_reason varchar(32)` 可空且成對。所有時間以 server UTC 寫入。身分重複只用於 DB 複合 FK 驗同一使用者與任務，不保存可變顯示屬性。

候選複合 FK：`(task_id,run_id) → task_run(task_id,id)`；`(task_id,membership_id,user_id) → task_membership(task_id,id,user_id)`；`(user_id,account_session_id) → account_session(user_id,id)`。父表需同序 UNIQUE；單欄 FK 僅在字典明列為實際候選時才畫 NoteCraft 線，複合 FK 以 Wiki 說明，不能畫假線。歷史父列刪除先採 RESTRICT 候選。DB CHECK `started_at <= last_seen_at <= ended_at`（結束時間可空）、`ended_at` 與 `close_reason` 同有同無；部分 UNIQUE `(user_id) WHERE ended_at IS NULL` 防跨分頁／裝置同時計重。服務驗 `work_kind` 與 membership 角色，並以條件 UPDATE 關閉前段再開後段。

進入可編輯的標記、審核或仲裁工作區且頁面可見、聚焦時開段。MVP 候選心跳每 30 秒送一次，只在仍可見且聚焦時有效；最近 10 分鐘無互動視為閒置並停止。失焦、背景化、切任務／run／工作種類、明確登出或 session 安全作廢均結束當前段。90 秒未收到心跳由服務以**最後已收到的有效 `last_seen_at`**關閉，不把等待的 90 秒算入工時。工作時長是「可觀測前景工作時長」，不宣稱測出實際認知工作。服務需處理頁面突然關閉、重送與跨裝置競爭；客戶端時間或 `now` 不得用來填補失聯區間。

### 完成事件歸屬

`annotation_history_event` 增可空 `account_session_id uuid`，為真 FK → `account_session.id`；舊資料或系統事件可空，**新認證使用者動作必填**。同一動作交易從已驗證 JWT `sid` 取得，不接受客戶端傳來的 session ID；服務核對 session 所屬 `user_id` 與 actor membership 所屬帳號一致。既有 `run_id`、`actor_membership_id`、`occurred_at` 與來源 FK 足以分組，不再建重複的完成事件表。此欄只供受授權的報表與稽核查詢，標記者 API 不下發其他人的 session 或私有答案。

標記筆數只計 `submitted` 並按完成的 `run_id × assignment_id` 去重（`annotation_record_id` 用來追溯原提交）；審核筆數按同一 `annotation_review_submission.id` 去重，透過 `review_revision_id` 回查 submission head，再以第一次完整提交事件所屬 session 歸屬；逐 outKey 的 `accepted/modified/bypassed` 不逐列相加，後續改判亦不新算一個審核單位。仲裁筆數按終局爭議鍵去重，`arbitration_vote_id` 用來追溯原票，後續修正不新算一個爭議項。來源缺失、舊事件無 session 或身份不一致時不猜測歸屬，標記為無法計入該 session 報表並留受限稽核追蹤。

### `WorkLogEntry` 查詢投影

一列以 `account_session × task × run × membership × work_kind × report_date` 定址，`task_role` 從不可變 membership 讀取，`run_stage` 從 `task_run.run_type` 讀取。原始區間不跨日拆列；報表固定 `Asia/Taipei` 時區，應用層依當地午夜裁切區間後求和，SQLite／PostgreSQL 得出相同日界。合法完成事件即使沒有可用工作區間仍顯示筆數，該列工作時長與速度為「未知」，不是 0。只有區間但沒有完成事件時對應筆數可為 0。

`login_at = account_session.started_at`；`logout_at = account_session.logged_out_at`，後者空值顯示「未知」。`online_duration` 僅在已驗證明確登出時表示該登入工作階段於報表日內的登入到登出時差；它不是網路連線或工作證據，同 session 在多個任務／run 列重複展示時不得相加。若產品未來需要真正「在線時間」，須另定 presence 來源，不能從 auth 時間推定。

工作種類分別計算「標記件／時」「審核單位／時」「仲裁項／時」；審核員同日做審核與仲裁時分兩列。卡片位置可維持，但名稱改為「各類工作速度」並清楚標出單位；**沒有跨類別單一加權平均速度**。沒有可信工作區間或分母為零時顯示「—」。三種完成筆數保留分欄且依角色顯示，總工時只加總互不重疊的工作區間。若日後要單一速度值，先由產品另訂共同工作單位或權重並明修 014 FR-010u。

## 保留、權限與雙資料庫界線

`task_work_interval`、帶 session FK 的責任歷程與 `account_session` 的最低候選保留期為一年，對齊 ADR-032 稽核下限；session 至少保留到所有合法歷程引用清理完成。現有 `users → account_session ON DELETE CASCADE` 需改為 RESTRICT 候選；停用使用者或 membership 不刪舊區間與提交。硬刪／匿名化的確切期限與資料主體請求流程屬產品與隱私政策，**本切片不設自動清理**，在 migration 前須另行定案；不能由 FK cascade 靜默刪掉工時證據。refresh token 的安全性清理可獨立於歷史 session 保留。

索引先以部分唯一 open user、`(task_id,run_id,started_at,id)`、`(account_session_id,started_at,id)` 及歷程 `(account_session_id,run_id,occurred_at,id)` 為候選；其餘依 SQLite query plan 與 PostgreSQL `EXPLAIN` 再加。SQLite 每連線 `PRAGMA foreign_keys=ON`，複合父鍵同序 UNIQUE、UTC adapter 與 `BEGIN IMMEDIATE`／條件更新要實測；PostgreSQL 用交易鎖及相同部分唯一索引。兩庫都測跨裝置同開、失聯恢復、跨日切割、同日二次登入與不重複計數，不能把文檔檢查當成 DB 執行證據。

## 正典、字典與驗證順序

1. 014 修 FR-007b、Tab E 與速度相關 SC：三類筆數保留，速度改逐類單位；新增 FR-007d 定工作區間、心跳／失聯、報表時區、未知值及日列鍵；FR-010u 補 session/run/day 歸屬與不混單位。關鍵實體將 `WorkLogEntry` 明列為投影、增加 `work_kind`。新增同日多次登入、跨日、失聯／撤銷、無時間但有提交、雙庫唯一 open 與不重複計數的 AC／SC。
2. 015 FR-088 及歷程來源條文補 `annotation_history_event.account_session_id` 的驗證來源、舊／系統事件可空及授權遮蔽；account-020 FR-001／FR-008、ADR-021 補歷史保留與憑證有效性分離。正典／Accepted ADR 先形成 OpenSpec delta，通過 schema validate、SDD lint 與歸檔 Source-Verify。
3. 新增 `task-work-db-schema.md`，同步 account／annotation 字典、盤點總帳、NoteCraft JSON／README；task/run 字典只加交叉引用。表、欄、型別、PK、FK、索引與可空語意以來源檢查雙向核對；Red 測試先證實缺口，Green 後跑全套相關檢查及 NoteCraft build／實際 Wiki／Diagram。
4. 最終交付明示新表和所有 FK 皆為**未部署候選**；SQLite／PostgreSQL migration、DB 約束、API 與性能測試屬後續實作階段。本切片不納入 016／017 分析專用表。

## 留待 migration 前的明示政策

- 個資最長保存、匿名化與資料主體刪除的合法順序。最低一年是候選下限，不代表可以無限保留。
- 若產品堅持原「加權平均速度」單一卡，須先定共同工作單位或權重；目前採逐類速度，不能把不同單位等權相加。
- 心跳 30 秒、閒置 10 分鐘、失聯 90 秒為可測的 MVP 候選門檻；正式 runtime／使用者研究可再調整，但任何調整須同時修正正典及雙庫測試。
