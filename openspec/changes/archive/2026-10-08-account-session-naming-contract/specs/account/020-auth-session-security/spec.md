## RENAMED Requirements

- FROM: `### Requirement: FR-001 Token family identity`
- TO: `### Requirement: FR-001 一次登入 session 身份`

- FROM: `### Requirement: FR-002 每次請求的 JWT 與 family 核對`
- TO: `### Requirement: FR-002 JWT 與 session 核對`

- FROM: `### Requirement: FR-003 Refresh 與 absolute TTL`
- TO: `### Requirement: FR-003 Refresh 與絕對期限`

- FROM: `### Requirement: FR-006 改密碼保留目前 family`
- TO: `### Requirement: FR-006 改密碼保留目前 session`

- FROM: `### Requirement: FR-007 全量憑證事件與停用`
- TO: `### Requirement: FR-007 憑證事件與停用`

- FROM: `### Requirement: FR-008 單一裝置登出`
- TO: `### Requirement: FR-008 單一裝置明確登出`

## MODIFIED Requirements

### Requirement: FR-001 一次登入 session 身份

**FR-001**：每次登入必須建立一筆 `account_session`，其 UUID `id` 主鍵、`user_id` FK 與非空 `started_at` 識別一次登入，`revoked_at` 可空，`logged_out_at` 可空；`refresh_tokens.session_id` 必須為指向 `account_session.id` 的真實 FK。`refresh_tokens` 不得重複儲存 `user_id` 或 `started_at`。`revoked_at` 表示任何原因造成 session 失效；`logged_out_at` 僅表示可驗證的明確登出成功，且有值時必須同交易寫入 `revoked_at`，兩者均為 UTC 且 `logged_out_at <= revoked_at`。此表仍為未部署的規劃契約。

#### Scenario: 一次登入身份

- **WHEN** 登入並核發 refresh token
- **THEN** 新 token 以 `refresh_tokens.session_id` 真實 FK 指向 `account_session`，不重複存使用者與登入起點；`logged_out_at` 初始為空

#### Scenario: 一次登入的輪替身份

- **GIVEN** 使用者登入並獲得 token
- **WHEN** refresh 成功
- **THEN** 新 token 沿用同一 session，且 session 的使用者與起點不複製到 token 列

### Requirement: FR-002 JWT 與 session 核對

**FR-002**：access JWT 必須包含 `sub`、`sid`、`credential_version`、`iat`、`exp`。每個已認證請求必須確認簽章／效期、`sub` 使用者 active、JWT 版本等於目前 `users.credential_version`、`sid` 所指 `account_session` 未撤銷、其 `user_id = sub` 且 `now < account_session.started_at + REFRESH_TOKEN_ABSOLUTE_MAX_TTL`；權限依當前 DB `role` 與資源權威來源判定，JWT `role` 僅供顯示。

#### Scenario: JWT 所屬人與絕對期限

- **WHEN** JWT `sid` 指向其他使用者的 session，或 session 已過絕對期限
- **THEN** 受保護請求拒絕；JWT `role` 不供授權且不得洩漏他人資訊

#### Scenario: 目前角色與憑證版本

- **WHEN** JWT 仍在 `exp` 內但使用者已停用、角色異動或 `credential_version` 改變
- **THEN** 每次請求依 DB 現值判定，停用或版本不符即拒絕，JWT `role` 不得授權

#### Scenario: `sid` 與 `sub` 不相符

- **GIVEN** JWT `sid` 指向另一使用者的 session
- **WHEN** 呼叫受保護資源
- **THEN** 拒絕認證且不洩漏另一使用者資訊（SC-001）

#### Scenario: family 絕對期限先於 JWT 到期

- **GIVEN** access JWT `exp` 尚未到，但 `sid` session 已達絕對期限
- **WHEN** 請求受保護資源
- **THEN** 拒絕認證並要求重新登入（SC-009）

### Requirement: FR-003 Refresh 與絕對期限

**FR-003**：每次 refresh（含寬限重發）必須由 token 的 `session_id` 載入未撤銷的 `account_session`，確認帳號 active、token 未過期與 `now < started_at + REFRESH_TOKEN_ABSOLUTE_MAX_TTL`，並將新 refresh token 及登入／refresh 核發的 access JWT 到期上限限制在該 session absolute max；輪替與新增 token 必須為同一交易。

#### Scenario: Refresh 輪替

- **WHEN** 有效 token 在 session 絕對期限前 refresh
- **THEN** 新 token 沿用 `session_id`，輪替與新增同交易，refresh 與 access JWT 到期均不越過絕對期限

#### Scenario: 絕對期限已到

- **WHEN** token 尚未過期但 session 自 `started_at` 已達絕對期限
- **THEN** 拒絕 refresh 與受保護請求，不延長 session

#### Scenario: 已達絕對期限

- **GIVEN** session 自 `started_at` 已達 `REFRESH_TOKEN_ABSOLUTE_MAX_TTL`
- **WHEN** 使用尚未過期的 token refresh
- **THEN** 拒絕核發且不得延長 session

### Requirement: FR-006 改密碼保留目前 session

**FR-006**：改密碼須同一交易更新 hash、增加 `credential_version` 並撤銷其他 `account_session`，保留目前 session；目前裝置舊 access JWT 先失效，再以保留的 session refresh 取得新版本 JWT。安全撤銷的 session 可寫入 `revoked_at`，不得寫入 `logged_out_at`。`hashed_password = null` 可依 account-005 FR-008 設定新密碼。

#### Scenario: 改密碼

- **WHEN** A、B 兩筆 session 中 A 成功改密碼
- **THEN** 保留 A、撤銷 B；舊 access JWT 均失效，B 的 `logged_out_at` 保持空值

#### Scenario: 兩裝置改密碼

- **GIVEN** A、B 兩裝置已登入
- **WHEN** A 改密碼
- **THEN** A 與 B 舊 access 均失效；A 可 refresh，B 不可（SC-004）

### Requirement: FR-007 憑證事件與停用

**FR-007**：新 email 驗證成功、管理員修改 email 成功、密碼重設成功或已驗證 Google 連結成功時，須同一交易增加 `credential_version` 並撤銷全部 `account_session`；Google 連結另須清除 `hashed_password`。停用帳號須令認證與 refresh 立即失敗，撤銷全部 session；重新啟用不得恢復舊 token。上述安全撤銷可寫入 `revoked_at`，不得寫入 `logged_out_at`。

#### Scenario: 高風險憑證事件與停用

- **WHEN** Email 變更、密碼重設、已驗證 Google 連結或停用成功
- **THEN** 依原交易規則撤銷受影響 session，安全撤銷不得寫 `logged_out_at`；重新啟用不復活舊 token

#### Scenario: 憑證交易失敗

- **WHEN** 高風險憑證事件的交易任一步驟失敗
- **THEN** `credential_version`、憑證變更與 session 撤銷均回滾

#### Scenario: 憑證事件

- **GIVEN** 使用者在兩個裝置登入
- **WHEN** 新 email 驗證成功
- **THEN** 兩個舊 access 與 refresh 均失效（SC-005）

### Requirement: FR-008 單一裝置明確登出

**FR-008**：單一裝置明確登出優先以已驗證的 access JWT `sid` 定位目前 `account_session`；access cookie 缺失或過期時，才以有效 refresh token 的 `session_id` 定位。可驗證的明確登出成功時須在同一交易對該 session 寫入 `revoked_at` 與 `logged_out_at`，並清除 cookies，不增加 user-wide `credential_version`；該裝置既有 access JWT 下個請求失效，其餘 session 繼續有效。兩種憑證均不可驗證時只能清除 cookies，不宣稱已撤銷伺服器 session，`logged_out_at` 保持空值。改密碼或 email 安全作廢時，`logged_out_at` 保持空值。無效憑證依既有認證失敗語意處理；只有 FR-004 的競爭情境回 `409`，錯誤不得洩漏 token 原值或其他裝置資訊。

#### Scenario: Access-only 明確登出

- **WHEN** A 的 refresh cookie 遺失但 access JWT `sid` 可驗證
- **THEN** 同交易寫 A session 的 `revoked_at` 與 `logged_out_at`，清 cookies；A 舊 token 失效，B 有效

#### Scenario: Refresh fallback 明確登出

- **WHEN** access cookie 缺失或過期而 refresh token 可驗證
- **THEN** 以 `session_id` 定位 session，同交易寫 `revoked_at` 與 `logged_out_at`，清 cookies

#### Scenario: 無憑證登出

- **WHEN** access 與 refresh 憑證均不可驗證
- **THEN** 僅清 cookies，不宣稱伺服器 session 撤銷，`logged_out_at` 保持空值

#### Scenario: 無效憑證錯誤

- **WHEN** 登出收到不可驗證憑證或其他裝置的 token
- **THEN** 依既有認證失敗語意處理，不洩漏 token 原值或其他裝置資訊；僅 FR-004 的競爭情境回 `409`

#### Scenario: 只登出 A

- **GIVEN** A、B 兩裝置已登入，A 的 refresh cookie 遺失但 access JWT 仍有效
- **WHEN** A 登出
- **THEN** 從 A access JWT 的 `sid` 撤銷 A session，A 舊 access／refresh 失效，B 保持有效（SC-001）
