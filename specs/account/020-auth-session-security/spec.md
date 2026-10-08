---
功能分支: feat/database-auth-canonical
建立日期: 2026-10-06
版本: 1.2.0
狀態: Draft
---

# 功能規格：Authentication and Session Security

## 功能目標

定義正式認證、跨裝置 session、refresh token 輪替及高風險憑證事件的使用者可觀察契約。此規格承接 account-001 `spec.md` 明示排除的真實驗證、JWT、session 與 API 行為；現階段只核准規劃契約，**不表示 backend、migration 或 frontend 已實作**。來源為 issue #1160、[核准設計](../../../docs/superpowers/specs/2026-10-06-auth-token-family-canonical-design.md)、foundation F-04 與 ADR-021。

## 已釐清事項

- `users`、`refresh_tokens`、`role`、`is_active` 保留既有名稱；新表用單數模組前綴 `account_session`。
- 同一次登入建立一筆 `account_session`，其 refresh token 輪替群組仍可稱為 token family。access JWT 的 `sid` 指向該 session；後端必須確認 session 的 `user_id` 與 JWT `sub` 相同，並每次讀取目前的帳號角色、啟用狀態、憑證版本、session 撤銷狀態與絕對存續期限。
- `logged_out_at` 僅記錄可驗證的明確登出成功；安全撤銷、自然到期及無有效憑證時僅清除 cookies 均不得記為登出。
- `credential_version` 只處理密碼、email、重設與帳號連結等高風險憑證事件；角色變更與停用仍以現行 DB 值判定。
- 同一張已輪替 token 在 30 秒內最多額外重發一次；再用回 `409`，不得藉競爭誤撤銷其他裝置。
- Email 儲存與比較使用 Unicode NFC 加 casefold；長度在正規化後驗證。SQLite 與 PostgreSQL 均須得出相同的應用層結果。

## 使用者情境與測試 *(必填)*

### 使用者故事 1 — 穩定且可撤銷的登入（優先級：P1）

使用者登入後可在有效期限內持續操作；單一裝置登出或帳號停用立即使該裝置的既有 access token 在下個請求失效。

**此優先級原因**：只有 refresh token 撤銷會讓已簽發的 access token 在到期前繼續通行。

**獨立測試方式**：以兩個登入 family 發行 access/refresh token，輪流執行 access-only 登出、停用、啟用、絕對期限到達與帶錯 `sid` 的請求。

**驗收情境**：

1. **AC-1.1**：**Given** 有效 access JWT 的 `sid` 對應未撤銷 family，且其 `user_id` 等於 `sub`，**When** 使用者請求受保護資源，**Then** 以 DB 當前 `role`、`is_active`、`credential_version` 及 family 絕對期限判定；即使 JWT `exp` 尚未到，期限已到仍拒絕。
2. **AC-1.2**：**Given** JWT 的 `sid` 指向不存在、已撤銷或屬於另一個 `sub` 的 family，**When** 請求受保護資源，**Then** 拒絕認證，不提供該 family 或其使用者的資訊。
3. **AC-1.3**：**Given** 同一帳號在 A、B 兩筆 session 登入，且 A 的 refresh cookie 已遺失或過期、access JWT 仍有效，**When** A 明確登出成功，**Then** 從已驗證 access JWT 的 `sid` 撤銷 A session、同交易寫入 `revoked_at` 與 `logged_out_at` 並清除 cookies；A 的 access JWT 下個請求與 refresh 均失敗，B 繼續有效。
4. **AC-1.4**：**Given** 帳號已停用，**When** 任何舊 access JWT、refresh token 或 Google callback 被使用，**Then** 不得核發有效 session；重新啟用亦不復活舊 session，且停用撤銷不寫入 `logged_out_at`。
5. **AC-1.5**：**Given** access 與 refresh 憑證均不可驗證，**When** 使用者請求登出，**Then** 僅清除 cookies，不宣稱伺服器 session 已撤銷，亦不寫入 `logged_out_at`。

### 使用者故事 2 — 安全的輪替與分頁競爭（優先級：P1）

兩個分頁同時 refresh 時，使用者不會因正常競爭被當作遭竊；同一舊 token 也不能在寬限期內無限換發。

**此優先級原因**：輪替必須兼顧一次性憑證和真實瀏覽器的並發請求。

**獨立測試方式**：在 SQLite 與真實 PostgreSQL 以兩個及三個連線競爭同一 token，並涵蓋撤銷原因與 absolute TTL。

**驗收情境**：

1. **AC-2.1**：**Given** 有效 token 與 active family，**When** 登入或 refresh 核發憑證，**Then** refresh 輪替與新 token 寫入為同一交易，新 token 沿用 family，且 refresh 與 access JWT 的到期均不超過該 family 的 absolute max。
2. **AC-2.2**：**Given** 舊 token 因 `rotated` 撤銷且仍在 30 秒寬限期，**When** 兩個競爭請求先後使用，**Then** 只有一個取得額外重發權；再次使用回 `409 Conflict`，不核發新 token，也不全量撤銷 family。
3. **AC-2.3**：**Given** 前端收到 AC-2.2 的 `409`，**When** 同來源分頁在 2 秒內回報成功 refresh，**Then** 原請求只重試一次；若重試仍 401，最多再 refresh 一次，失敗或逾時則導向登入，不得無限重試。
4. **AC-2.4**：**Given** 已輪替 token 超過寬限期，**When** 再次使用，**Then** 依 reuse 偵測撤銷該使用者全部有效 family；登出或安全事件撤銷的 token 無寬限資格。

### 使用者故事 3 — 憑證變更後的裝置結果（優先級：P1）

使用者修改密碼時保留目前裝置；修改 email、重設密碼或連結 Google 後則由所有裝置重新登入。

**此優先級原因**：不同事件若只撤銷 refresh token，舊 access JWT 在剩餘效期仍可能通行。

**獨立測試方式**：以兩個登入 family 的舊 access/refresh token 分別觸發四種憑證事件，確認下一請求與回滾結果。

**驗收情境**：

1. **AC-3.1**：**Given** A、B 兩個 family，**When** A 成功改密碼，**Then** 憑證版本增加、B 被撤銷；A 與 B 的舊 access JWT 下個請求均失效，但 A 可用保留的 family silent refresh 取得新版本 JWT，B 不可 refresh。
2. **AC-3.2**：**Given** 任一已登入帳號，**When** 新 email 驗證成功、管理員修改 email 成功、密碼重設成功或經驗證的 Google 帳號連結成功，**Then** 同一資料交易增加憑證版本並撤銷全部 family，所有舊 access JWT 下個請求失效；Google 連結另依 ADR-035 清除本地密碼 hash。
3. **AC-3.3**：**Given** AC-3.1 或 AC-3.2 的任何交易步驟失敗，**When** 交易回滾，**Then** 密碼、email、版本與 family 撤銷均不部分生效。

### 使用者故事 4 — 一致的 Email 識別（優先級：P1）

登入、註冊、邀請和變更 email 以同一識別規則判定重複。

**此優先級原因**：只靠資料庫 `lower()`，SQLite 與 PostgreSQL 的非 ASCII 行為可能不同。

**獨立測試方式**：用 ASCII 與非 ASCII 大小寫、組合字元和正規化後超長 email，跨兩種資料庫比較應用層結果。

**驗收情境**：

1. **AC-4.1**：**Given** email 輸入，**When** 註冊、邀請、登入或改 email，**Then** 先做 Unicode NFC 與 casefold，再以正規化值判定唯一性與 254 字元上限。
2. **AC-4.2**：**Given** 兩個輸入正規化後相同，**When** 建立第二個帳號或改成已占用 email，**Then** 拒絕重複值，且 SQLite 與 PostgreSQL 的應用層判定一致。

## 需求規格 *(必填)*

### 功能需求

- **FR-001**：每次登入必須建立一筆 `account_session`，其 UUID `id` 主鍵、`user_id` FK 與非空 `started_at` 識別一次登入，`revoked_at` 可空，`logged_out_at` 可空；`refresh_tokens.session_id` 必須為指向 `account_session.id` 的真實 FK。`refresh_tokens` 不得重複儲存 `user_id` 或 `started_at`。`revoked_at` 表示任何原因造成 session 失效；`logged_out_at` 僅表示可驗證的明確登出成功，且有值時必須同交易寫入 `revoked_at`，兩者均為 UTC 且 `logged_out_at <= revoked_at`。此表仍為未部署的規劃契約。
- **FR-002**：access JWT 必須包含 `sub`、`sid`、`credential_version`、`iat`、`exp`。每個已認證請求必須確認簽章／效期、`sub` 使用者 active、JWT 版本等於目前 `users.credential_version`、`sid` 所指 `account_session` 未撤銷、其 `user_id = sub` 且 `now < account_session.started_at + REFRESH_TOKEN_ABSOLUTE_MAX_TTL`；權限依當前 DB `role` 與資源權威來源判定，JWT `role` 僅供顯示。
- **FR-003**：每次 refresh（含寬限重發）必須由 token 的 `session_id` 載入未撤銷的 `account_session`，確認帳號 active、token 未過期與 `now < started_at + REFRESH_TOKEN_ABSOLUTE_MAX_TTL`，並將新 refresh token 及登入／refresh 核發的 access JWT 到期上限限制在該 session absolute max；輪替與新增 token 必須為同一交易。
- **FR-004**：只有以 `rotated` 撤銷且在 30 秒寬限期內的舊 token 可額外重發一次；須以 `grace_reissued_at IS NULL` 的原子條件占用資格。第三次使用回 `409`，不核發 token、不全量撤銷；寬限期外 reuse 則撤銷該使用者全部有效 family。
- **FR-005**：前端收到 FR-004 的 `409` 時，至多等 2 秒接收同來源其他分頁的成功 refresh 訊號，再重試原請求一次；若仍 401，最多再 refresh 一次；失敗或逾時且無成功訊號時導向登入。重試必須有界，不能形成循環。
- **FR-006**：改密碼須同一交易更新 hash、增加 `credential_version` 並撤銷其他 `account_session`，保留目前 session；目前裝置舊 access JWT 先失效，再以保留的 session refresh 取得新版本 JWT。安全撤銷的 session 可寫入 `revoked_at`，不得寫入 `logged_out_at`。`hashed_password = null` 可依 account-005 FR-008 設定新密碼。
- **FR-007**：新 email 驗證成功、管理員修改 email 成功、密碼重設成功或已驗證 Google 連結成功時，須同一交易增加 `credential_version` 並撤銷全部 `account_session`；Google 連結另須清除 `hashed_password`。停用帳號須令認證與 refresh 立即失敗，撤銷全部 session；重新啟用不得恢復舊 token。上述安全撤銷可寫入 `revoked_at`，不得寫入 `logged_out_at`。
- **FR-008**：單一裝置明確登出優先以已驗證的 access JWT `sid` 定位目前 `account_session`；access cookie 缺失或過期時，才以有效 refresh token 的 `session_id` 定位。可驗證的明確登出成功時須在同一交易對該 session 寫入 `revoked_at` 與 `logged_out_at`，並清除 cookies，不增加 user-wide `credential_version`；該裝置既有 access JWT 下個請求失效，其餘 session 繼續有效。兩種憑證均不可驗證時只能清除 cookies，不宣稱已撤銷伺服器 session，`logged_out_at` 保持空值。改密碼或 email 安全作廢時，`logged_out_at` 保持空值。無效憑證依既有認證失敗語意處理；只有 FR-004 的競爭情境回 `409`，錯誤不得洩漏 token 原值或其他裝置資訊。
- **FR-009**：登入、註冊、邀請與 email 變更必須在寫入及比較前執行 Unicode NFC 加 casefold，對結果檢查 `varchar(254)` 長度；`users.email` 儲存該 canonical 值，DB 設 `lower(email)` 唯一表達式索引作第二層防線。SQLite 與 PostgreSQL 對合法應用層寫入必須產生相同識別結果。
- **FR-010**：`users.credential_version` 必須為非空整數，僅高風險憑證事件遞增；角色變更和停用狀態不以版本取代每請求 DB 檢查。`users.hashed_password` 可為 null，表示沒有可用的本地密碼。

## 關鍵實體

| 實體 | 身份與責任 |
|---|---|
| `users` | UUID 主鍵；canonical email、可空密碼 hash、非空 `credential_version`、即時角色與啟用狀態 |
| `account_session` | UUID 主鍵；一列一次登入；`user_id` 指向 `users.id`；`started_at` 為 absolute TTL 基準；`revoked_at` 為任意失效原因；可空 `logged_out_at` 僅記明確登出成功 |
| `refresh_tokens` | UUID 主鍵；一列一次發行；`session_id` 真實 FK 指向 `account_session.id`；唯一 token hash、到期、撤銷狀態與可空 `grace_reissued_at`；不複製 session 的 user/time |

此表形為規劃契約；實際 PK／FK／UNIQUE／CHECK、跨 DB 競爭及 migration roundtrip 須由後續獨立實作驗證。

## 規格相依性 *(本功能依賴其他規格，或被其他規格依賴時填寫)*

| 來源 | 本規格承接內容 |
|---|---|
| `specs/foundation/000-foundation/spec.md` FR-016／075／076／077／105 | token persistence、競爭、absolute TTL、立即失效與命名基準 |
| `docs/adr/021-jwt-refresh-token-auth.md` | JWT／cookie／refresh 策略；本規格的行為與 ADR 的機制須一致 |
| `specs/account/005-profile-settings/spec.md` FR-004K／008／010 | email 全部登出、無本地密碼設定、改密碼保留目前裝置 |
| `specs/account/003-register-email-password/spec.md`、`specs/account/004-forgot-reset-password/spec.md`、`specs/admin/006-user-management/spec.md` | 註冊、重設、邀請與停用流程 |
| `specs/account/001-login-email-password/spec.md` | 僅 prototype UI；本規格不改變該檔的原型行為 |

## 成功標準 *(必填)*

- **SC-001**：兩裝置測試中，A 的 refresh cookie 遺失但 access JWT 仍有效時，A 明確登出須在同交易寫入 A session 的 `revoked_at` 與 `logged_out_at`，使 A 的舊 access/refresh 失效，B 保持有效；JWT `sid` 指向 B 的 session 但 `sub` 為 A 時必須拒絕。兩種憑證都不可驗證時僅清 cookies，`logged_out_at` 保持空值。
- **SC-002**：兩個競爭 refresh 至多一次額外寬限重發；第三次回 `409` 且不核發 token、不撤銷其他 family；寬限期外 reuse 使所有 family 失效。
- **SC-003**：前端在 `409` 後的等待不超過 2 秒，原請求只重試一次，後續 refresh 最多一次；無訊號或再次失敗時終止並導向登入。
- **SC-004**：A 改密碼後，A 與 B 舊 access 均在下個請求失效；A 以原 family refresh 後維持登入，B refresh 失敗。
- **SC-005**：使用者 email 變更驗證、管理員修改 email、重設密碼及已驗證 Google 連結各使所有舊 access/refresh 失效；任何交易失敗時版本、密碼／email 和 family 均維持原狀。
- **SC-006**：停用帳號後舊 access、refresh 與 Google callback 均不可取得有效 session；重新啟用不復活舊 family。
- **SC-007**：ASCII、非 ASCII 與 NFC 等價 email 在 SQLite／PostgreSQL 的合法應用層寫入皆有相同唯一性結果；正規化後超過 254 字元會被拒絕。
- **SC-008**：每張規劃表均有非空且唯一 PK；`refresh_tokens.session_id` 真實 FK、token hash UNIQUE、`lower(email)` UNIQUE 及 `logged_out_at` nullable 欄位語意可由後續 SQLite／PostgreSQL migration 測試逐項驗證，規劃圖不得標示已部署。
- **SC-009**：family 達 `REFRESH_TOKEN_ABSOLUTE_MAX_TTL` 時，即使 access JWT 自身 `exp` 尚未到也拒絕受保護請求；在期限前最後一次登入或 refresh 所核發的 access JWT `exp` 不得越過該 family 期限。

## Changelog

| 版本 | 日期 | 變更 |
|---|---|---|
| 1.2.0 | 2026-10-08 | Issue #1160：將一次登入候選表定名 `account_session`、refresh FK 定名 `session_id`；新增僅限可驗證明確登出成功的 `logged_out_at`，區分安全撤銷與 cookie-only 清理。仍無 runtime／migration。 |
| 1.1.0 | 2026-10-06 | Source-Verify／安全審查回寫：FR-002／FR-003 加入每請求 family absolute TTL 與 access JWT 到期上限；FR-008 定義 access-only 登出與 refresh fallback；新增 SC-009、補 AC-1.1／AC-1.3／AC-2.1。OpenSpec 規劃契約 archive，尚無 runtime／migration。 |
| 1.0.0 | 2026-10-06 | 建立真實 auth/session owning spec，記錄 issue #1160 token-family 與跨 DB 規劃契約；尚無 runtime 實作。 |
