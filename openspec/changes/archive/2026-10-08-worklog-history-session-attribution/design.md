# 標記歷程 session 歸屬設計

新認證動作在同一交易中從已驗證 JWT `sid` 寫入 `annotation_history_event.account_session_id`，並核對 session 的 user 與 actor membership。舊資料及系統事件可空；缺 session 不猜歸屬。`lead_time` 保持單次作業口徑，工時由 014 所定可觀測區間計算。標記員資料供給層遮蔽他人 session 及私有答案。資料表仍為未部署候選。
