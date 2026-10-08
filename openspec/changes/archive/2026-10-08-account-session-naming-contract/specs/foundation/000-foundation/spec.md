## ADDED Requirements

### Requirement: FR-016 Session persistence

**FR-016**：系統必須維護 `account_session` 與 `refresh_tokens` persistence：session 一列代表一次登入，至少有 `id`、`user_id` FK、非空 `started_at`、可空 `revoked_at` 與可空 `logged_out_at`；token 至少有 `id`、指向 `account_session.id` 的 `session_id` 真實 FK、唯一 `token_hash`、`expires_at`、`revoked_at`、`revoked_reason`、`grace_reissued_at`。token 列不得重複 session 的 `user_id` 或 `started_at`；`logged_out_at` 僅在可驗證明確登出成功時與 `revoked_at` 同交易寫入且不得晚於它；安全撤銷、自然到期或僅清 cookie 均不得填入；每次 refresh 成功須在同一交易輪替並寫入新 token row，`expires_at` 取當下時間加 `REFRESH_TOKEN_TTL` 與 session absolute max 之較早者。

#### Scenario: 真實 session 外鍵

- **WHEN** 登入建立 session 並核發 refresh token
- **THEN** `refresh_tokens.session_id` 真實 FK 指向 `account_session.id`；token 不複製 session 的使用者或起點

#### Scenario: 登出與安全撤銷

- **WHEN** 可驗證明確登出或安全事件使 session 失效
- **THEN** 只有明確登出同交易寫 `logged_out_at` 與 `revoked_at`；安全撤銷僅可寫 `revoked_at`

### Requirement: FR-076 Refresh 和 access 絕對期限

**FR-076**：系統必須讓 sliding refresh token 與 access JWT 受 `REFRESH_TOKEN_ABSOLUTE_MAX_TTL` 約束；每次 refresh（含寬限重發）及每個已認證請求以 `account_session.started_at` 作首次登入基準，達 absolute max 後強制重新登入，登入與 refresh 核發的新 token 到期不得超過此上限。

#### Scenario: 絕對期限

- **WHEN** session 到達 `REFRESH_TOKEN_ABSOLUTE_MAX_TTL`
- **THEN** 已認證請求遭拒，新 token 到期不得越過期限

### Requirement: FR-077 憑證版本和即時撤銷

**FR-077**：系統必須以 `users.credential_version` 與 JWT 同名 claim 在每次已認證請求比對，使改密碼、改 email、重設密碼、Google 連結等高風險憑證事件立即作廢舊 access JWT；每次請求另須核對 `sid` 指向未撤銷 `account_session` 且 `account_session.user_id = sub`，以支援單一裝置登出。角色與停用仍重讀 `users.role`／`is_active`，不得用版本代替。具體實作與跨資料庫測試由 `specs/account/020-auth-session-security/spec.md` 承接。

#### Scenario: 版本與所屬人

- **WHEN** JWT `sid` 指向他人或已撤銷 session，或版本過時
- **THEN** 下一次已認證請求拒絕；角色與停用仍讀 DB 現值

## RENAMED Requirements

- FROM: `### Requirement: FR-105 資料表與欄位命名`
- TO: `### Requirement: FR-105 資料表命名`

## MODIFIED Requirements

### Requirement: FR-105 資料表命名

**FR-105**：系統必須讓 DB table 與 column 使用 `lower_case_snake`；table name 預設使用 singular form，join table 或 module-owned table 應以前綴表達 domain ownership，例如 `task_assignment`、`dataset_item`、`account_session`。歷史契約 `users`、`refresh_tokens` 與欄名 `role`、`is_active` 為明示命名例外；ADR-032 的跨模組共用表 `audit_events` 是唯一新增的明示表名例外，不得據此擴張其他新表的命名例外。

#### Scenario: SC-046 唯一新增表名例外

- **GIVEN** 後續 migration 新增 DB table
- **WHEN** 檢查表名與 domain ownership
- **THEN** `users`、`refresh_tokens`、`audit_events` 是明示表名例外，其餘新表仍使用 FR-105 預設的單數與 ownership 規則（SC-046）

#### Scenario: 候選表命名

- **WHEN** 新增一次登入的 module-owned table
- **THEN** 使用單數模組前綴 `account_session`，不擴張歷史命名例外
