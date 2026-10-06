## ADDED Requirements

### Requirement: FR-001 Token family identity

**FR-001**：每次登入建立 `account_token_family`，`refresh_tokens.family_id` 是其 FK；token 列不重複 `user_id` 或 `session_started_at`。

#### Scenario: 一次登入的輪替身份

- **GIVEN** 使用者登入並獲得 token
- **WHEN** refresh 成功
- **THEN** 新 token 沿用同一 family，且 family 的使用者與起點不複製到 token 列

### Requirement: FR-002 每次請求的 JWT 與 family 核對

**FR-002**：JWT 含 `sub`、`sid`、`credential_version`、`iat`、`exp`；每次受保護請求須核對現行使用者、憑證版本、family 未撤銷及 `family.user_id = sub`，角色取現行 DB 值。

#### Scenario: `sid` 與 `sub` 不相符

- **GIVEN** JWT `sid` 指向另一使用者的 family
- **WHEN** 呼叫受保護資源
- **THEN** 拒絕認證且不洩漏另一使用者資訊（SC-001）

### Requirement: FR-003 Refresh 與 absolute TTL

**FR-003**：所有 refresh 須核對 family、使用者與 absolute TTL；輪替與新 token 寫入同一交易，新到期不超過 family 上限。

#### Scenario: 已達絕對期限

- **GIVEN** family 自 `started_at` 已達 `REFRESH_TOKEN_ABSOLUTE_MAX_TTL`
- **WHEN** 使用尚未過期的 token refresh
- **THEN** 拒絕核發且不得延長 session

### Requirement: FR-004 有界寬限重發

**FR-004**：`rotated` token 在 30 秒內只可透過原子占用 `grace_reissued_at` 額外重發一次；再次使用回 `409`，寬限外 reuse 撤銷所有有效 family。

#### Scenario: 第三次使用

- **GIVEN** 舊 token 已輪替且其一次寬限資格已被占用
- **WHEN** 寬限期內再次 refresh
- **THEN** 回 `409`、不核發 token、不全量撤銷（SC-002）

### Requirement: FR-005 前端競爭協調

**FR-005**：前端在上述 `409` 後最多等 2 秒接收同來源分頁成功訊號、原請求只重試一次，仍 401 時最多再 refresh 一次；失敗或逾時且無成功訊號則導向登入。

#### Scenario: 競爭未恢復

- **GIVEN** 前端收到上述 `409` 且沒有成功訊號
- **WHEN** 等待逾 2 秒
- **THEN** 終止流程並導向登入，不循環重試（SC-003）

### Requirement: FR-006 改密碼保留目前 family

**FR-006**：改密碼同一交易更新 hash、增加 `credential_version`、撤銷其他 family；目前裝置以保留 family refresh 取得新版本 JWT。

#### Scenario: 兩裝置改密碼

- **GIVEN** A、B 兩裝置已登入
- **WHEN** A 改密碼
- **THEN** A 與 B 舊 access 均失效；A 可 refresh，B 不可（SC-004）

### Requirement: FR-007 全量憑證事件與停用

**FR-007**：email 驗證、管理員修改 email、密碼重設、已驗證 Google 連結須同一交易增加版本並撤銷全部 family；停用帳號立即拒絕認證／refresh 並撤銷全部 family。

#### Scenario: 憑證事件

- **GIVEN** 使用者在兩個裝置登入
- **WHEN** 新 email 驗證成功
- **THEN** 兩個舊 access 與 refresh 均失效（SC-005）

### Requirement: FR-008 單一裝置登出

**FR-008**：登出只撤銷該 `sid` family，其他 family 保持有效；競爭 `409` 以外的無效憑證按既有認證失敗語意處理。

#### Scenario: 只登出 A

- **GIVEN** A、B 兩裝置已登入
- **WHEN** A 登出
- **THEN** A 舊 access／refresh 失效，B 保持有效（SC-001）

### Requirement: FR-009 Email canonicalization

**FR-009**：所有 email 寫入及查找先做 Unicode NFC 加 casefold，再檢查 254 字元；DB `lower(email)` UNIQUE 作第二層防線。

#### Scenario: 跨資料庫同一識別

- **GIVEN** 兩個大小寫或 NFC 正規化後相同的 email
- **WHEN** 在 SQLite 與 PostgreSQL 經合法應用層註冊
- **THEN** 第二筆均被拒絕（SC-007）

### Requirement: FR-010 使用者憑證欄位

**FR-010**：`users.credential_version` 非空且僅高風險憑證事件增加；`users.hashed_password` 可為 null；role/is_active 每次請求由 DB 判定。

#### Scenario: 沒有本地密碼

- **GIVEN** Google 或受邀帳號尚無本地密碼
- **WHEN** 建立該帳號
- **THEN** `hashed_password = null` 有明確語意，不能以空字串代替
