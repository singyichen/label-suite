## ADDED Requirements

### Requirement: FR-001 Token family identity

**FR-001**：每次登入必須建立一筆 `account_token_family`，以 UUID 主鍵、`user_id` FK、非空 `started_at` 及可空 `revoked_at` 表示一次登入的 session；`refresh_tokens.family_id` 必須為真實 FK。`refresh_tokens` 不得重複儲存 `user_id` 或 `session_started_at`。

#### Scenario: 一次登入的輪替身份

- **GIVEN** 使用者登入並獲得 token
- **WHEN** refresh 成功
- **THEN** 新 token 沿用同一 family，且 family 的使用者與起點不複製到 token 列

### Requirement: FR-002 每次請求的 JWT 與 family 核對

**FR-002**：access JWT 必須包含 `sub`、`sid`、`credential_version`、`iat`、`exp`。每個已認證請求必須確認簽章／效期、`sub` 使用者 active、JWT 版本等於目前 `users.credential_version`、`sid` 所指 family 未撤銷、其 `user_id = sub` 且 `now < family.started_at + REFRESH_TOKEN_ABSOLUTE_MAX_TTL`；權限依當前 DB `role` 與資源權威來源判定，JWT `role` 僅供顯示。

#### Scenario: `sid` 與 `sub` 不相符

- **GIVEN** JWT `sid` 指向另一使用者的 family
- **WHEN** 呼叫受保護資源
- **THEN** 拒絕認證且不洩漏另一使用者資訊（SC-001）

#### Scenario: family 絕對期限先於 JWT 到期

- **GIVEN** access JWT `exp` 尚未到，但 `sid` family 已達絕對期限
- **WHEN** 請求受保護資源
- **THEN** 拒絕認證並要求重新登入（SC-009）

### Requirement: FR-003 Refresh 與 absolute TTL

**FR-003**：每次 refresh（含寬限重發）必須由 token 的 `family_id` 載入 active family，確認帳號 active、token 未過期與 `now < started_at + REFRESH_TOKEN_ABSOLUTE_MAX_TTL`，並將新 refresh token 及登入／refresh 核發的 access JWT 到期上限限制在 family absolute max；輪替與新增 token 必須為同一交易。

#### Scenario: 已達絕對期限

- **GIVEN** family 自 `started_at` 已達 `REFRESH_TOKEN_ABSOLUTE_MAX_TTL`
- **WHEN** 使用尚未過期的 token refresh
- **THEN** 拒絕核發且不得延長 session

### Requirement: FR-004 有界寬限重發

**FR-004**：只有以 `rotated` 撤銷且在 30 秒寬限期內的舊 token 可額外重發一次；須以 `grace_reissued_at IS NULL` 的原子條件占用資格。第三次使用回 `409`，不核發 token、不全量撤銷；寬限期外 reuse 則撤銷該使用者全部有效 family。

#### Scenario: 第三次使用

- **GIVEN** 舊 token 已輪替且其一次寬限資格已被占用
- **WHEN** 寬限期內再次 refresh
- **THEN** 回 `409`、不核發 token、不全量撤銷（SC-002）

### Requirement: FR-005 前端競爭協調

**FR-005**：前端收到 FR-004 的 `409` 時，至多等 2 秒接收同來源其他分頁的成功 refresh 訊號，再重試原請求一次；若仍 401，最多再 refresh 一次；失敗或逾時且無成功訊號時導向登入。重試必須有界，不能形成循環。

#### Scenario: 競爭未恢復

- **GIVEN** 前端收到上述 `409` 且沒有成功訊號
- **WHEN** 等待逾 2 秒
- **THEN** 終止流程並導向登入，不循環重試（SC-003）

### Requirement: FR-006 改密碼保留目前 family

**FR-006**：改密碼須同一交易更新 hash、增加 `credential_version` 並撤銷其他 family，保留目前 family；目前裝置舊 access JWT 先失效，再以保留的 family refresh 取得新版本 JWT。`hashed_password = null` 可依 account-005 FR-008 設定新密碼。

#### Scenario: 兩裝置改密碼

- **GIVEN** A、B 兩裝置已登入
- **WHEN** A 改密碼
- **THEN** A 與 B 舊 access 均失效；A 可 refresh，B 不可（SC-004）

### Requirement: FR-007 全量憑證事件與停用

**FR-007**：新 email 驗證成功、管理員修改 email 成功、密碼重設成功或已驗證 Google 連結成功時，須同一交易增加 `credential_version` 並撤銷全部 family；Google 連結另須清除 `hashed_password`。停用帳號須令認證與 refresh 立即失敗，撤銷全部 family；重新啟用不得恢復舊 token。

#### Scenario: 憑證事件

- **GIVEN** 使用者在兩個裝置登入
- **WHEN** 新 email 驗證成功
- **THEN** 兩個舊 access 與 refresh 均失效（SC-005）

### Requirement: FR-008 單一裝置登出

**FR-008**：單一裝置登出優先以已驗證的 access JWT `sid` 定位目前 family；access cookie 缺失或過期時，才以有效 refresh token 的 `family_id` 定位。撤銷該 family 並清除 cookies，不增加 user-wide `credential_version`；該裝置既有 access JWT 下個請求失效，其餘 family 繼續有效。兩種憑證均不可驗證時只能清除 cookies，不宣稱已撤銷伺服器 session。無效憑證依既有認證失敗語意處理；只有 FR-004 的競爭情境回 `409`，錯誤不得洩漏 token 原值或其他裝置資訊。

#### Scenario: 只登出 A

- **GIVEN** A、B 兩裝置已登入，A 的 refresh cookie 遺失但 access JWT 仍有效
- **WHEN** A 登出
- **THEN** 從 A access JWT 的 `sid` 撤銷 A family，A 舊 access／refresh 失效，B 保持有效（SC-001）

### Requirement: FR-009 Email canonicalization

**FR-009**：登入、註冊、邀請與 email 變更必須在寫入及比較前執行 Unicode NFC 加 casefold，對結果檢查 `varchar(254)` 長度；`users.email` 儲存該 canonical 值，DB 設 `lower(email)` 唯一表達式索引作第二層防線。SQLite 與 PostgreSQL 對合法應用層寫入必須產生相同識別結果。

#### Scenario: 跨資料庫同一識別

- **GIVEN** 兩個大小寫或 NFC 正規化後相同的 email
- **WHEN** 在 SQLite 與 PostgreSQL 經合法應用層註冊
- **THEN** 第二筆均被拒絕（SC-007）

### Requirement: FR-010 使用者憑證欄位

**FR-010**：`users.credential_version` 必須為非空整數，僅高風險憑證事件遞增；角色變更和停用狀態不以版本取代每請求 DB 檢查。`users.hashed_password` 可為 null，表示沒有可用的本地密碼。

#### Scenario: 沒有本地密碼

- **GIVEN** Google 或受邀帳號尚無本地密碼
- **WHEN** 建立該帳號
- **THEN** `hashed_password = null` 有明確語意，不能以空字串代替
