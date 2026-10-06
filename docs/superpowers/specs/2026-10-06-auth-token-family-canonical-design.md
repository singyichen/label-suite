# Label Suite 認證與 token family 正典契約設計

> Issue [#1160](https://github.com/singyichen/label-suite/issues/1160) 的下一個設計切片。2026-10-06 使用者同意先處理 auth/token-family，再擴充 account/admin 欄位字典與 NoteCraft。此文件記錄待回寫的設計，**不是生效的 feature spec、Accepted ADR、migration 或 API 契約**。

## 目標與完成判準

將 `senior-dba` 對 N-1、D-1、D-3、D-6、D-8 及 token family 3NF 的裁決，轉成一致、可驗證的認證契約。完成此切片時，正典規格須能回答：一個登入 session 如何識別、輪替與撤銷；改密碼、改 email、停用帳號、單一裝置登出後，既有 access/refresh token 各何時失效；SQLite quick-start 與 PostgreSQL 正式環境如何得到相同的安全結果。

這個切片先完成 owning spec、ADR-021、foundation 條文及相依規格的設計與 SDD，再同步實體層字典和 NoteCraft 第九張**候選表**。Issue #1160 不含建立 migration、修改 API／frontend runtime 或部署。資料庫約束與併發測試列為後續獨立實作 PR 的驗收條件，不能以規劃圖代替執行證據。

## 來源、衝突與方案選擇

權威順序依 [SDD workflow](../../sdd-workflow.md) §0：constitution → domain constitution → Accepted ADR → canonical feature spec。現行 [ADR-021](../../adr/021-jwt-refresh-token-auth.md) 已接受，仍以 `refresh_tokens.user_id` 儲存所屬帳號、允許 30 秒內多次寬限重發，且拒絕的是**角色／停用狀態**的 token versioning。現行 [foundation F-04](../../../specs/foundation/000-foundation/spec.md) FR-016 同樣要求 token 列有 `user_id`；FR-077 則要求高風險事件有立即失效機制。現行 [account-001 spec](../../../specs/account/001-login-email-password/spec.md) 排除真實驗證、JWT、session 與 API 契約，因此不能只修改其 `plan.md` 來建立新產品規則。

| 方案 | 代價與效果 | 選擇 |
|---|---|---|
| 先建立 auth/security owning spec，修訂 ADR-021 與 foundation，再更新衍生字典和 ER JSON | 需 SDD 與下游規格核對；能解除正典衝突，讓九張候選表有一致來源 | **採用** |
| 直接把第九張表與新欄位寫入 NoteCraft | 畫面會先於正典宣稱已定案，且無法解釋 session/access token 行為 | 不採用 |
| 一次回寫所有資料模組與權限矩陣 | 會將 auth、dataset lineage、task/run 鍵與授權變更混入同一審查單位 | 不採用 |

## 契約邊界與資料形狀

認證 owning spec 描述使用者可觀察結果、狀態轉移、錯誤與驗收情境；ADR-021 描述 JWT、token family、併發與失效機制；foundation 保留跨模組不可違反的約束。`account-admin-db-schema.md` 與 `.er.json` 只投影已定契約，不反向定義它。

- 保留 `users`、`refresh_tokens`、`role`、`is_active` 作明示的既有命名例外；新表依 foundation FR-105 使用單數與模組前綴。`users.hashed_password = NULL` 表示沒有可用的本地密碼，不能用空字串代替。`users.credential_version` 為非空整數，只因高風險憑證事件增加；角色／停用狀態仍由每次請求讀取現行 DB 值。
- 新增候選 `account_token_family`：`id` UUID 主鍵、`user_id` 對 `users.id` 的 FK、`started_at` 非空 UTC 時間，以及供單一 session 撤銷的 `revoked_at`。一列代表一次登入的 token family。`refresh_tokens.family_id` 改成對該列的真實 FK；移除 refresh token 列的 `user_id` 與 `session_started_at`，使 `family_id → user_id, started_at` 不再重複於每張 token。token 列保留自身 PK、唯一 hash、到期、撤銷原因，並新增可空 `grace_reissued_at`。
- Access JWT 包含 `sub`、token-family `sid`、`credential_version`、簽發與到期時間。`role` 若保留，只供前端顯示。每個已認證請求核對目前 `users.is_active`、`users.role`、`users.credential_version`、`account_token_family.revoked_at`，且 `sid` 指向的 `account_token_family.user_id` **必須等於 JWT `sub`**；任一身份／family 不存在、失效或不相符則拒絕。resource-scoped 權限仍從各模組的權威來源查，不從 JWT 推論。
- Email 寫入前以同一規則做 Unicode NFC 正規化與 casefold，登入、註冊、邀請、改 email 都使用該規則；**正規化後**再檢查 `varchar(254)` 長度。`users.email` 儲存此 canonical 值，也作為目前 UI 顯示值，不另增未經需求支持的原字串欄。DB 以 `lower(email)` 唯一表達式索引防止大小寫重複。測試必須包含 ASCII 與非 ASCII 樣本，在 SQLite／PostgreSQL 比對相同的應用層結果。直接繞過應用層寫入非正規化值不屬合法寫入路徑。

## 狀態流程、失敗處理與交易

1. **登入與輪替。** 登入建立一個 family 與第一張 refresh token。每次 refresh（包含寬限重發）都必須依 `refresh_tokens.family_id` 載入對應 family，確認該 family 的 `user_id` 指向仍 active 的使用者、`family.revoked_at IS NULL`、token 本身未過期，且 `now < family.started_at + REFRESH_TOKEN_ABSOLUTE_MAX_TTL`；任一不符即拒絕核發。有效 token 旋轉時，在同一交易撤銷舊 token 並建立新 token，沿用 family；新到期時間不得超過 family 的 absolute max。跨表的到期上限由服務交易檢查；不把原本依賴 token 列 `session_started_at` 的 CHECK 原樣搬到新表形。
2. **並發 refresh。** 只有 `revoked_reason='rotated'` 且仍在 30 秒寬限期的舊 token 可額外重發一次。以 `grace_reissued_at IS NULL` 的原子條件更新保證最多一個請求占用。第三次在寬限期內重用同一舊 token 回 `409 Conflict`，不核發 token，也不連坐撤銷其他 family。前端收到此 `409` 後，等待同來源其他分頁的成功 refresh 訊號至多 2 秒，再重試原受保護請求一次；若仍為 401，只再 refresh 一次。這次 refresh 仍失敗（401／409）或等待逾時且沒有成功訊號，就導向登入；不得無限重試。超過寬限期後重用才按攻擊處理，撤銷該使用者全部有效 family。登出、改密碼等其他撤銷原因沒有寬限重發。
3. **改密碼。** 在同一交易更新 hash、增加 `credential_version`、撤銷其他 family，保留目前 family。其他裝置的舊 access JWT 下個請求因版本不符失效，refresh 也因 family 撤銷而失敗。目前裝置的舊 access JWT 同樣先失效，但可用仍有效的目前 family refresh，取得新版本 JWT，再重試請求；不預設修改密碼 API 的成功 response shape。Google SSO 帳號 `hashed_password` 為 null 時，可依 account-005 規則設定密碼。
4. **改 email、重設密碼、Google 連結、停用與登出。** Email 驗證成功時，依 account-005 FR-004K 增加 `credential_version`、撤銷所有 family（包含目前裝置），並導回登入。重設密碼成功與已驗證的 Google 帳號連結成功，也都在其資料交易中增加 `credential_version` 並撤銷所有 family；連結時依 ADR-035 清除本地密碼 hash。這些事件使所有舊 access JWT 於下個請求失效。停用帳號後，`is_active=false` 使每次認證與 refresh 都失敗，已發行 family 一併撤銷；重新啟用不復活舊 token。單一裝置登出只撤銷該 `sid` family，不增加 user-wide `credential_version`，因此其他裝置繼續有效；該裝置的 access JWT 下個請求即失效。
5. **錯誤界線。** 無效、過期、已撤銷的身份憑證回現有的認證失敗語意；只有寬限期內已用盡一次額外重發的競爭情境使用 `409`。新錯誤不得洩漏 token 原值或其他裝置資訊。前端對這種 `409` 的協調行為要先寫入 owning spec 與 ADR，再進入 API／frontend 實作。

## 正典回寫順序與驗證

1. 透過完整 SDD 建立或擴充 auth/security owning spec，承接 account-001 明示排除的真實認證、JWT、session、refresh 與錯誤契約。先核對 account-005 密碼／email 行為、account-003 註冊、004 重設、admin-006 邀請／停用與 foundation FR-016、FR-075、FR-076、FR-077、FR-105；相依 spec 的 FR／SC、版本與 Changelog 依專案規則同步。權限矩陣 D-9～D-13 另開 SDD 切片，不在此改變授權來源。
2. 修訂並接受 ADR-021 的命名例外、family/`sid`、`credential_version`、一次寬限重發與 `409`、立即登出、跨 DB 策略；保留原先「角色與停用狀態直接查 DB」的理由。同步修訂 foundation 中與新形狀衝突的直接 `refresh_tokens.user_id` 要求及 reuse 例外。更新 001 plan 與 auth 生命週期衍生圖時，以新的正典為準。
3. OpenSpec schema validation、Project SDD lint、受影響規格引用檢查分別通過；archive 階段再做 Source-Verify、正典版本／Changelog 與引用定位。設計審查需覆蓋兩裝置改密碼、email 全登出、密碼重設、Google 帳號連結、單一裝置登出、JWT `sid`／`sub` 不相符拒絕、兩／三個並發 refresh、`409` 有界前端協調、寬限期後重用、disabled user 及大小寫 email 衝突。
4. 未來獨立 migration／runtime PR 依 TDD 先建立失敗測試，再在 SQLite 與真實 PostgreSQL 驗證 PK、FK、UNIQUE、NULL、回滾、條件式更新與 Alembic `upgrade → downgrade → upgrade`。SQLite 必須有寬限占用與一次性 token 的功能／冪等測試；真實多連線競爭、email Unicode、`sid` 每請求讀取成本須在 PostgreSQL 再驗。SQLite 連線須啟用 `PRAGMA foreign_keys=ON`。索引由查詢樣式與 `EXPLAIN` 證據決定，避免替每個欄位預建索引。
5. 正典生效後，更新 `account-admin-db-schema.md`、資料落點總帳與 `database-schema.er.json`，以來源一致性檢查驗證新增第九張候選表、欄位數與 FK 數。NoteCraft 頁面仍標示「規劃中／尚無已部署業務表」，直到 migration 實際落地才變更狀態。

## 範圍與剩餘風險

本設計不觸及 migration、實際資料、API、frontend runtime、角色權限矩陣、稽核 ADR-032、dataset/task/run 鍵或 annotation/review FK。`sid` 每請求多一次 family 查詢，須用核心路徑 P95 ≤ 500ms 目標檢查；若要導入快取，仍須保證撤銷立即生效。`lower(email)` 在兩種 DB 的 Unicode 行為不同，因此相同的應用層 canonicalization 與跨 DB 測試是必要契約，不能僅因一種 DB 的唯一索引通過便宣稱等價。
