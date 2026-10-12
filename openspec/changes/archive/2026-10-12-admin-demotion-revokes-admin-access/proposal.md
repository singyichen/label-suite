# 超管降級即撤銷管理權

對應 Spec: specs/admin/006-user-management/spec.md

## Why

Issue #1269（權限矩陣唯讀稽核的條文補齊單）。

FR-009 規定本頁只能管理 system role（`user`／`super_admin`），FR-002 則規定只有「當前 active `super_admin`」且通過 `admin.user_management.view`／`admin.user_management.manage` 格的人才能讀寫帳號（ADR-037）。可是一位 `super_admin` 被降級為 `user` 之後，其**下一個**管理請求會不會被拒絕，正典沒有直接寫出來。現在只能從 `account/020-auth-session-security` FR-002「權限依當前 DB `role` 判定，JWT `role` 僅供顯示」推出來。後端實作者若只讀 006，可能會依仍有效的 access JWT 中的 `role` claim 放行，讓降級後的帳號在 token 效期內繼續管理他人帳號。

維護者裁定（2026-10-12，issue #1269 預期調整清單）：006 補一則「降級即撤權」AC。

不走 Lightweight Path，因為需要新增一則可測 AC。

分級：MINOR。FR-002 原文逐字保留，只在後面補一段修訂，明寫降級後的判定時點；沒有移除或推翻任何 FR／AC。

## What Changes

- **修訂 FR-002**：在原文後補一段修訂。`super_admin` 被降級為 `user` 之後，該帳號的下一個 `/user-management` 讀取或管理命令 MUST 依 `account/020-auth-session-security` FR-002 以當前 DB `role` 判定並拒絕（403）。仍在效期內的 access JWT 帶有舊 `role` claim，也 MUST NOT 延續管理權；拒絕時 MUST NOT 回傳任何帳號資料。
- **新增一則 AC**：在 gate 4 回寫正典時編號，接續「帳號生命週期驗收條件」現行最大者 AC-1.2。內容是降級後的下一個管理讀取與命令都被拒絕，而且不需要等 token 到期。
- **正典回寫**：FR-002 補 v1.4.0 修訂段（原文逐字保留）、新增一則 AC、版號 1.3.1 → 1.4.0、Changelog 加一列。

**非目標**：

- 不改 FR-009 本文（本頁只管 system role）。
- 不改 `account/020-auth-session-security` 的 session 撤銷規則；降級是否同時撤銷 session 不在本單範圍。
- 不新增權限鍵；admin-007 鍵註冊表不變。

## Capabilities

`admin` — 使用者管理授權的降級時點。
