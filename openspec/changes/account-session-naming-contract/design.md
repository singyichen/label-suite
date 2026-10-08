# 設計：一次登入 session 命名與登出時間

## 功能目標

讓一次登入候選表、refresh token FK 及可驗證的明確登出時間在正典、字典與 NoteCraft 具有相同語意，對應 account-020 SC-001／SC-008。

## Context

詳細裁決見 `docs/superpowers/specs/2026-10-08-account-session-naming-design.md`。目前沒有已部署的 auth session 表、ORM 或 migration；本變更不修改 HTTP API。舊 token family 為輪替群組概念，不能作新資料表別名。

## Schema Contract

`account_session(id UUID PK, user_id UUID FK → users.id, started_at timestamptz NOT NULL, revoked_at timestamptz NULL, logged_out_at timestamptz NULL)` 一列代表一次登入。`refresh_tokens.session_id UUID NOT NULL` 為指向 `account_session.id` 的真實 FK；token 列不複製 session 的使用者或起點。JWT `sid` 仍承載該 session UUID。

`revoked_at` 表示任何原因的 session 失效。`logged_out_at` 只表示可驗證的明確登出成功，並與 `revoked_at` 同交易寫入；有值時 `logged_out_at <= revoked_at`。密碼／Email 安全作廢、停用、token reuse、自然到期及無可驗證憑證僅清除 cookies 不填入 `logged_out_at`。後續 migration 與 service 測試驗證此一致性；本變更不聲稱資料庫約束已部署。

## 行為與相容性

access-only 登出先以有效 JWT `sid` 定位；access 缺失或過期才以有效 refresh token 的 `session_id` 定位。成功時只撤銷目前 session，其他裝置保持有效。每個受保護請求仍查目前使用者狀態、版本、session 所屬人與絕對期限；refresh 輪替、30 秒 grace 及 `409` 協調保持既有契約。對外 endpoint、cookie 名稱與 JWT claim 名稱不變。

## 投影與驗證

先完成現行正典與 Accepted ADR，再更新實體欄位字典、總帳、NoteCraft ER JSON 與 auth lifecycle JSON，從可編輯來源重生 HTML。驗證 OpenSpec schema、Project SDD lint、來源測試與 Source-Verify；歸檔只在最後 PR 且正典版本及 Changelog 核對後進行。

## Constitution Check

| 原則 | 設計回應 |
|---|---|
| I. Spec-First | account-020 與 foundation 的完整 FR delta 可在正典定位。 |
| VII. Security-by-Default | `logged_out_at` 不混淆安全撤銷，`sid` 驗證仍即時生效。 |
| X. Testing And TDD | 來源與投影的 Red 測試先於此契約更新。 |
| XX. Source of Truth | 歷史 archive 不回寫，衍生視圖依正典重生。 |
