# WorkLog 可觀測區間設計

## Decision

採一張 `task_work_interval` 原始表與既有 `annotation_history_event` 的可空 session FK；不建立 `WorkLogEntry`、每日彙總或重複完成事件表。每位使用者至多一筆開啟區間，DB 部分唯一與服務交易共同防雙裝置重複計時。原始時間以 UTC，報表於 `Asia/Taipei` 午夜裁切。

候選心跳每 30 秒、10 分鐘無互動停止、90 秒失聯只關到最後有效 `last_seen_at`。登入至明確登出只能稱上線時長，不能當工時；安全撤銷不補登出。標記件／時、審核單位／時、仲裁項／時分列，無共同單位不做單一加權速度。

## Data and security

區間以 `(task_id,run_id)`、`(task_id,membership_id,user_id)`、`(user_id,account_session_id)` 複合 FK 驗證同任務同人。新認證歷程從已驗證 JWT `sid` 寫 `account_session_id`；舊與系統事件可空，不猜歸屬。標記員回應不得露出他人 session、私有答案或 test/gold 答案。session 歷史至少一年候選，普通硬刪 RESTRICT；最長保存與匿名化流程尚待裁決。

## Alternatives

只用登入或 `lead_time_ms` 推算會把在線與單次操作誤作工時。另建完成事件表與每日彙總會複製既有歷程事實並在修訂、跨日時漂移，因此不採用。完整分析與驗證依 [設計文件](../../../docs/superpowers/specs/2026-10-08-worklog-physical-design.md)。
