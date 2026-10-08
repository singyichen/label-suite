## MODIFIED Requirements

### Requirement: FR-001 一次登入 session 身份

- **FR-001**：每次登入必須建立一筆 `account_session`，其 UUID `id` 主鍵、`user_id` FK 與非空 `started_at` 識別一次登入，`revoked_at` 可空，`logged_out_at` 可空；`refresh_tokens.session_id` 必須為指向 `account_session.id` 的真實 FK。`refresh_tokens` 不得重複儲存 `user_id` 或 `started_at`。`revoked_at` 表示任何原因造成 session 失效；`logged_out_at` 僅表示可驗證的明確登出成功，且有值時必須同交易寫入 `revoked_at`，兩者均為 UTC 且 `logged_out_at <= revoked_at`。此表仍為未部署的規劃契約。 **v1.3.0 歷史保留補充（issue #1160）**：`account_session` 作為工時與責任歷程的被參照來源，歷史保留與 token 有效性分離；`users` 的普通硬刪不得以 CASCADE 刪除 session、工作區間或責任歷程，候選 FK 採 RESTRICT，合法清理順序及最長保留期在 migration 前另行裁決。

#### Scenario: 一次登入身份

- **WHEN** 登入並核發 refresh token
- **THEN** 新 token 以 `refresh_tokens.session_id` 真實 FK 指向 `account_session`，不重複存使用者與登入起點；`logged_out_at` 初始為空

#### Scenario: 一次登入的輪替身份

- **GIVEN** 使用者登入並獲得 token
- **WHEN** refresh 成功
- **THEN** 新 token 沿用同一 session，且 session 的使用者與起點不複製到 token 列

#### Scenario: 歷史 session 不因硬刪消失

- **WHEN** 帶工時或責任歷程的使用者遭普通硬刪
- **THEN** 候選 RESTRICT 關係拒絕靜默 CASCADE，歷史保留不使撤銷的 token 恢復有效

### Requirement: FR-008 單一裝置明確登出

- **FR-008**：單一裝置明確登出優先以已驗證的 access JWT `sid` 定位目前 `account_session`；access cookie 缺失或過期時，才以有效 refresh token 的 `session_id` 定位。可驗證的明確登出成功時須在同一交易對該 session 寫入 `revoked_at` 與 `logged_out_at`，並清除 cookies，不增加 user-wide `credential_version`；該裝置既有 access JWT 下個請求失效，其餘 session 繼續有效。兩種憑證均不可驗證時只能清除 cookies，不宣稱已撤銷伺服器 session，`logged_out_at` 保持空值。改密碼或 email 安全作廢時，`logged_out_at` 保持空值。無效憑證依既有認證失敗語意處理；只有 FR-004 的競爭情境回 `409`，錯誤不得洩漏 token 原值或其他裝置資訊。 **v1.3.0 工時來源補充（issue #1160）**：`logged_out_at` 僅可作已驗證明確登出時間；歷程／工時因稽核保留不使已 `revoked_at` 的 session、refresh token 或 access JWT 恢復有效。無法驗證登出時不得由安全撤銷時間補登出或上線時長。

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

#### Scenario: 安全撤銷不推定登出

- **WHEN** session 因安全事件失效或登出憑證不可驗證
- **THEN** 工時報表的登出及上線時長維持未知；稽核保留不使 token 再次有效
