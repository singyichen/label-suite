# 登入工作階段保留設計

`account_session` 是工時與責任歷程的被參照來源。歷史保留至少一年為候選下限；普通 users 硬刪採 RESTRICT 候選，不能 CASCADE 靜默刪證據。refresh token 可依安全策略清理；保留的 session 即使有歷程 FK，`revoked_at` 後仍不得通過認證。個資最長期限、資料主體刪除及匿名化順序在雙庫 migration 前另訂。
