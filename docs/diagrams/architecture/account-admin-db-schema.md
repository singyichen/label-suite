# account 與 admin 資料庫 schema（實體層）

> **受眾為寫 migration、repository 與 service 的工程師。** 圖面與表格保留 spec／ADR 的原始識別字，方便用 `grep` 回到來源條文。

- **定位**：[`core-data-model-er.md`](./core-data-model-er.md) 圖 2 回答「有哪些實體、彼此怎麼關聯」（概念層）；本文件回答「建哪些表與欄位、哪些規則 DB 擋不住、各用什麼測試驗證」（實體層）。
- **衍生視圖，不是正典**：依 [`SDD 權威矩陣`](../../sdd-workflow.md#0-權威矩陣與衝突裁決)，衝突裁決順序為主憲法 → 適用的 domain constitution → Accepted ADR → canonical feature spec → 衍生視圖；Proposed ADR 不改變現行規則。發現衝突時須回到正典裁決並修正本文件。
- **範圍**：account 001–005、account-020、admin-006、admin-007。admin-007 規格仍為 **Draft**，且其表是否需要建立取決於 §5 D-9。
- **不歸屬任何單一 spec**：同一張 `users` 表被 001、003、005、006 共同修改，因此放在 `docs/diagrams/architecture/`，不隨任何 spec 進 `specs/_archive/`。各 spec 的 plan.md「實體與資料模型」段落應連結本文件，不各自複製欄位表。
- **狀態：草稿**。§5 仍有阻擋性待裁決，定案前不得據以產生 migration。
- **NoteCraft 規劃檢視**：[`database-schema.er.json`](./database-schema.er.json) 對應 `/view/diagrams/architecture/database-schema.er` 的 Wiki／Diagram。它只投影本文件 §3 的 9 張候選表（61 欄、6 個候選 FK），當中 2 張是否存在取決於 D-9；目前已落地業務表為 0，其他模組留在[盤點總帳](./database-table-inventory.md)。改動欄位字典後執行 `node scripts/check-database-schema.mjs` 檢查投影差異。
- **驗證方式**：本文件不執行 SQL。每條限制的正確性在實作時由 Alembic migration 的 upgrade／downgrade／roundtrip 測試，以及 §4 指定的測試驗證。

## 1. 關鍵設計決定

| 項目 | 決定 | 依據 |
|---|---|---|
| 權限判定與憑證作廢 | 每個已認證請求重讀 `users.role`／`is_active`／`credential_version`；JWT 的 `credential_version` 不符即拒絕。`credential_version` 僅處理憑證失效，不承載角色版本 | ADR-021、account-020 FR-002／FR-010 |
| 表名與角色、狀態欄名 | 沿用既有契約 `users`、`refresh_tokens`、`role`、`is_active`；新表採 `account_token_family`。這是 FR-105 對既有 auth 表的明確例外 | ADR-021、foundation FR-105、account-020；原 N-1 已裁決 |
| Google SSO 帳號的判定 | 維持 `hashed_password = null`，不改用 `google_subject IS NOT NULL` | 005 FR-008；ADR-035 修訂 |
| Google 連結時的既有密碼 | 同一交易清空 `hashed_password` 並撤銷該使用者全部 refresh token | ADR-035 修訂 |
| refresh token 重用偵測的撤銷範圍 | 寬限期內最多一次重發；逾期重用撤銷該使用者全部有效 family，並拒絕請求 | ADR-021、account-020 FR-003／FR-004 |
| session 表形 | 一次登入一列 `account_token_family`；輪替 token 只持有 `family_id`，使用者與開始時間由 family 取得 | ADR-021、account-020 FR-001／FR-002 |
| email 識別 | 寫入前以 NFC＋casefold 正規化，DB 保留 `lower(email)` 唯一表達式索引 | account-020 FR-009；原 D-8 已裁決 |
| `users.name` 長度 | 不加上限 | 003 Clarifications（「不加長度上限」） |
| `users.email` 長度 | 254 | 001 plan v2.2.0 `String(254)`；account-020 FR-009 |
| 外部身分 | 不建獨立身分表，用 `users.google_subject` | ADR-035（單一 provider） |
| 角色權限矩陣表形 | 逐格一列（`admin_role_permission`）＋整份矩陣一個版本號（`admin_role_permission_version`，單列表） | 007 關鍵實體 RolePermissionMatrix、RolePermissionVersion |
| 矩陣樂觀鎖粒度 | 整份矩陣共用一個版本號，不逐格加版本 | 007 FR-005b、區塊 D（衝突時整頁重新載入） |
| `permission_key` 白名單 | 放在後端程式常數，不建權限鍵表 | 007 `PERMISSION_KEYS_SOURCE = backend_whitelist`、FR-003a |
| 約束命名 | 交給 `NAMING_CONVENTION`（`column_0_N_name`），不逐一手寫 `name=` | `backend/app/db/base.py` |

## 2. ERD

```mermaid
erDiagram
    users {
        uuid id PK "app-generated"
        varchar email "len<=254; UNIQUE lower(email)"
        varchar name "trim non-empty; no max length"
        varchar contact_info "len<=255; default ''"
        text avatar_url "nullable"
        varchar hashed_password "nullable (SSO / invited)"
        varchar google_subject "UNIQUE nullable"
        varchar role "CK user|super_admin"
        boolean is_active
        boolean is_seeder "partial UNIQUE where true"
        integer credential_version "default 1; CK >= 1"
        timestamptz created_at
        timestamptz updated_at
    }
    account_token_family {
        uuid id PK
        uuid user_id FK "indexed; CASCADE"
        timestamptz started_at "absolute session anchor"
        timestamptz revoked_at "nullable"
    }
    refresh_tokens {
        uuid id PK
        uuid family_id FK "indexed"
        char token_hash UK "sha256 hex"
        timestamptz expires_at
        timestamptz revoked_at "nullable"
        varchar revoked_reason "nullable; CK paired with revoked_at"
        timestamptz grace_reissued_at "nullable; at most one reissue"
        timestamptz created_at
    }
    account_password_token {
        bigint id PK
        uuid user_id FK
        varchar purpose "CK reset|invite"
        char token_hash UK
        timestamptz expires_at
        timestamptz used_at "nullable"
        timestamptz created_at
    }
    account_email_change_request {
        bigint id PK
        uuid user_id FK
        varchar pending_email "len<=254"
        char token_hash UK "nullable; cleared on verify"
        timestamptz expires_at
        timestamptz last_sent_at
        timestamptz verified_at "nullable"
        timestamptz created_at
    }
    account_notification_preference {
        uuid user_id PK,FK
        varchar event_key PK "CK 6 keys"
        boolean in_app_enabled
        boolean email_enabled
    }
    audit_event {
        bigint id PK
        uuid actor_user_id FK "RESTRICT"
        varchar actor_role
        varchar action "registry, no CK"
        varchar target_type "registry, no CK"
        varchar target_id "polymorphic, no FK"
        jsonb payload_summary "before/after allowlist"
        varchar request_id "nullable"
        timestamptz occurred_at
    }
    admin_role_permission {
        varchar role_type PK "CK system|task"
        varchar role_key PK "CK consistent with role_type"
        varchar permission_key PK "backend whitelist, no CK"
        boolean allowed
        timestamptz updated_at
    }
    admin_role_permission_version {
        smallint id PK "CK id = 1 (single row)"
        integer version "optimistic lock"
        timestamptz updated_at
    }

    users ||--o{ account_token_family : "logins (CASCADE)"
    account_token_family ||--o{ refresh_tokens : "rotation (CASCADE)"
    users ||--o{ account_password_token : "reset / invite (CASCADE)"
    users ||--o{ account_email_change_request : "email change (<=1 pending)"
    users ||--o{ account_notification_preference : "preferences (<=6)"
    users ||--o{ audit_event : "actor (RESTRICT)"
```

**表的來源**（001 plan v2.2.0、account-020 與 ADR-021 定義登入表形；以下列跨規格來源）：

| 表或欄位 | 來源 |
|---|---|
| `users.name`／`contact_info`／`avatar_url` | 005 實體 User；006 PlatformUser |
| `users.hashed_password` 可為 null | ADR-035、005 FR-008、006 FR-006a、001 plan v2.2.0；原 D-1 已裁決 |
| `users.credential_version` | ADR-021、account-020 FR-002／FR-010 |
| `users.google_subject` | ADR-035 |
| `users.is_seeder` | 006 FR-008c；007 FR-008b |
| `account_token_family`／`refresh_tokens.family_id` | ADR-021、account-020 FR-001／FR-002、005 FR-010 |
| `account_token_family.started_at` | foundation FR-076、account-020 FR-002 |
| `refresh_tokens.grace_reissued_at`／`revoked_reason` | foundation FR-075、account-020 FR-003／FR-004 |
| `account_password_token` | 004；006 FR-006a；ADR-013（reset token 存於 DB） |
| `account_email_change_request` | 005 FR-004C–FR-004M |
| `account_notification_preference` | 005 FR-013B–FR-013E |
| `audit_event` | 006 FR-013、007 FR-010；表形依 ADR-032（**Proposed**，見 §5 D-4） |
| `admin_role_permission` | 007 關鍵實體 RolePermissionMatrix、「角色 × 權限預設矩陣（V1）」 |
| `admin_role_permission_version` | 007 關鍵實體 RolePermissionVersion、FR-005b |

## 3. 欄位字典

「可空」＝該欄可以是 null；「規則」欄的編號對應 §4。

### 3.1 users：平台帳號

一列＝一個能登入的人。email 註冊、Google 登入、管理員邀請建立的帳號都在這張表。

| 欄位 | 型別 | 可空 | 代表什麼 | 何時寫入／改變 | 規則 |
|---|---|---|---|---|---|
| `id` | uuid | 否 | 帳號的內部識別碼，由應用程式產生 | 建立帳號時 | X-04 |
| `email` | varchar(254) | 否 | 登入帳號，也是寄信地址 | 註冊／邀請時寫入；005 email 變更驗證成功或 006 管理員修改時改變 | U-01、U-02、E-06、E-08 |
| `name` | varchar | 否 | 顯示名稱 | 註冊時填；005 可改 | U-03 |
| `contact_info` | varchar(255) | 否（預設 `''`） | 使用者自填的聯絡方式文字，可為空字串 | 005 可改 | 005 FR-003 |
| `avatar_url` | text | 是 | 頭像位置；null＝未上傳，顯示預設頭像 | 005 上傳或移除並儲存時 | 005 FR-004H–FR-004J |
| `hashed_password` | varchar | **是** | 密碼雜湊。**null 有業務意義**：帳號沒有可用密碼（Google 帳號或尚未設密碼的受邀帳號），改密碼時不需輸入舊密碼 | 註冊、重設、改密碼時寫入；受邀帳號初始為 null；Google 連結時清為 null | U-09、U-10 |
| `google_subject` | varchar | 是 | Google 帳號的固定識別碼（OIDC `sub`）；Google 端 email 可變，因此以此識別 | 首次 Google 登入或連結時寫入 | U-10、U-11 |
| `role` | varchar | 否 | 平台層級角色 `user`／`super_admin`；**不是**任務內角色 | 建立時 `user`；006 升降級 | U-04、U-08、U-12 |
| `is_active` | boolean | 否 | false＝已停用：不能登入、不能 refresh，既有 access token 下個請求即 401 | 006 停用／啟用 | U-12–U-15 |
| `is_seeder` | boolean | 否 | 系統初始化時建立的超管，不可停用或降級；全表最多一位 | 只在初始化時設為 true | U-05–U-07 |
| `credential_version` | integer | 否（預設 `1`） | 憑證世代，必須 ≥ 1；access JWT `credential_version` 與之比對，高風險事件遞增 | 建帳時為 1；改密碼、重設密碼、email 變更、Google 連結、管理員改 email 等事件遞增 | U-16 |
| `created_at` | timestamptz | 否 | 建立時間（UTC） | 建立時 | X-02 |
| `updated_at` | timestamptz | 否 | 最後修改時間 | 每次 UPDATE | X-02 |

### 3.2 account_token_family：一次登入的 token 家族

一列＝一次登入／一個裝置的 session。使用者與最初登入時間只存在這張表，所有輪替 token 以外鍵指向它；撤銷整個 session 時寫 `revoked_at`，不逐張 token 重複保存家族狀態。

| 欄位 | 型別 | 可空 | 代表什麼 | 何時寫入／改變 | 規則 |
|---|---|---|---|---|---|
| `id` | uuid | 否 | 一次登入的內部識別碼，由應用程式產生 | 建立 session 時 | F-01 |
| `user_id` | uuid → users | 否 | 這次登入所屬帳號；FK 採 CASCADE，另建 B-tree 索引 | 登入時 | F-01、F-02 |
| `started_at` | timestamptz | 否 | 最初登入時間，為 refresh token 絕對最長存續時間的唯一基準 | 登入時 | F-01、F-03 |
| `revoked_at` | timestamptz | 是 | 整個家族撤銷時間；null＝未撤銷 | 登出、跨裝置作廢、高風險事件或重用偵測時 | F-02、F-04 |

### 3.3 refresh_tokens：家族中的一張輪替 token

一列＝一張 refresh token。每次 refresh 換發新的一張、舊的標為已輪替；同一次登入的使用者與開始時間只從 `account_token_family` 取得。

| 欄位 | 型別 | 可空 | 代表什麼 | 何時寫入／改變 | 規則 |
|---|---|---|---|---|---|
| `id` | uuid | 否 | token 識別碼 | 發行時 | — |
| `family_id` | uuid → account_token_family | 否 | 所屬登入家族；FK 採 CASCADE，另建 B-tree 索引 | 發行時沿用 family 的 id | R-04、R-08 |
| `token_hash` | char(64) | 否 | token 的 SHA-256 雜湊；DB 不存 token 原值 | 發行時 | — |
| `expires_at` | timestamptz | 否 | 到期時間 | 發行時 | R-07 |
| `revoked_at` | timestamptz | 是 | 撤銷時間；null＝未撤銷 | 輪替、登出、改密碼、停用等事件 | R-01、R-03 |
| `revoked_reason` | varchar | 是 | 撤銷原因；**只有 `rotated` 可進入寬限期重發** | 與 `revoked_at` 同時寫入 | R-01、R-02、R-05 |
| `grace_reissued_at` | timestamptz | 是 | 已輪替 token 的一次寬限重發時間；null＝尚未使用此機會 | 原 token 在寬限期內首次再送達時，以條件式 UPDATE 寫入 | R-06 |
| `created_at` | timestamptz | 否 | 發行時間 | 發行時 | — |

### 3.4 account_password_token：重設密碼／邀請設定密碼連結

一列＝一封信中的一次性連結。004 忘記密碼與 006 新增使用者後的設定密碼信共用此表。

| 欄位 | 型別 | 可空 | 代表什麼 | 何時寫入／改變 | 規則 |
|---|---|---|---|---|---|
| `id` | bigint | 否 | 流水號 | 建立時 | — |
| `user_id` | uuid → users | 否 | 連結所屬帳號（CASCADE） | 建立時 | — |
| `purpose` | varchar | 否 | `reset`＝忘記密碼；`invite`＝受邀帳號首次設定密碼 | 建立時 | P-03、P-06 |
| `token_hash` | char(64) | 否 | 連結 token 的雜湊 | 建立時 | — |
| `expires_at` | timestamptz | 否 | 到期時間 | 建立時 | P-01、P-06 |
| `used_at` | timestamptz | 是 | 使用或作廢時間；null＝未使用。**不另存狀態欄**：有效／已使用／已過期由 `used_at` 與 `expires_at` 推導 | 使用成功，或因改密碼、改 email、停用而作廢時 | P-01、P-02、P-05 |
| `created_at` | timestamptz | 否 | 寄出時間 | 建立時 | — |

### 3.5 account_email_change_request：email 變更申請

一列＝一次 email 變更申請。驗證完成前仍以舊 email 登入（005 FR-004D）。

| 欄位 | 型別 | 可空 | 代表什麼 | 何時寫入／改變 | 規則 |
|---|---|---|---|---|---|
| `id` | bigint | 否 | 流水號 | 建立時 | — |
| `user_id` | uuid → users | 否 | 申請人 | 建立時 | E-02 |
| `pending_email` | varchar(254) | 否 | 欲變更成的新 email，尚未生效 | 建立時；再次申請時覆蓋 | E-03 |
| `token_hash` | char(64) | 是 | 驗證連結 token 的雜湊；驗證成功後清為 null，因此非 null＝等待驗證中 | 建立／重新申請時寫入；驗證成功時清空 | E-01、E-04 |
| `expires_at` | timestamptz | 否 | 驗證連結到期時間 | 建立／重新申請時 | E-04 |
| `last_sent_at` | timestamptz | 否 | 最後一次寄出驗證信的時間，用於重送冷卻 | 每次寄信時 | E-05 |
| `verified_at` | timestamptz | 是 | 驗證完成時間；null＝未完成 | 驗證成功時 | E-01、E-02、E-07 |
| `created_at` | timestamptz | 否 | 申請時間 | 建立時 | — |

### 3.6 account_notification_preference：通知開關

一列＝某帳號對某通知事件的兩個開關；每人最多 6 列。

| 欄位 | 型別 | 可空 | 代表什麼 | 何時寫入／改變 | 規則 |
|---|---|---|---|---|---|
| `user_id` | uuid → users | 否 | 設定所屬帳號（主鍵之一） | 儲存設定時 | — |
| `event_key` | varchar | 否 | 通知事件（主鍵之一），限 005 定義的 6 個：`annotation_complete`、`review_complete`、`dry_run_all_done`、`formal_annotation_all_done`、`assignment_created_annotator`、`assignment_created_reviewer` | 儲存設定時 | N-01 |
| `in_app_enabled` | boolean | 否 | 是否發站內通知 | 儲存設定時 | N-03 |
| `email_enabled` | boolean | 否 | 是否寄 email | 儲存設定時 | N-03 |

### 3.7 audit_event：操作稽核紀錄

一列＝一次需留紀錄的操作（006 FR-013：新增、編輯、停用、啟用、角色變更；007 FR-010：角色權限矩陣儲存）。只能新增。

| 欄位 | 型別 | 可空 | 代表什麼 | 何時寫入／改變 | 規則 |
|---|---|---|---|---|---|
| `id` | bigint | 否 | 流水號 | 寫入時 | — |
| `actor_user_id` | uuid → users | 否 | 操作者；FK 為 RESTRICT，有稽核紀錄的帳號不可實體刪除。007 操作紀錄抽屜顯示的「操作者名稱」讀取時以此欄 join `users.name`（顯示目前名稱） | 與被稽核操作同一交易 | A-01、A-04 |
| `actor_role` | varchar | 否 | 操作**當下**的角色快照（ADR-032） | 同上 | — |
| `action` | varchar | 否 | 命名空間動詞，例如 `member.deactivated`；值由 registry 管理，DB 不加 CHECK | 同上 | — |
| `target_type` | varchar | 否 | 操作對象種類，例如 `user` | 同上 | — |
| `target_id` | varchar | 否 | 操作對象識別碼；對象可能在任何表，不加 FK | 同上 | X-04 |
| `payload_summary` | jsonb | 否 | 變更前後摘要，只含 allowlist 欄位 | 同上 | A-03 |
| `request_id` | varchar | 是 | 對應 API log 的請求 ID | 同上 | — |
| `occurred_at` | timestamptz | 否 | 伺服器端發生時間（UTC） | 同上 | A-02 |

### 3.8 admin_role_permission：角色權限矩陣的一格

一列＝某個角色對某個 `permission_key` 是否允許。只存 007 預設矩陣中有意義的格：system role × 平台層級鍵（9 個鍵 × 2 個角色），task role × 任務層級鍵（7 個鍵 × 3 個角色），共 39 列；矩陣中標「⛔（需 task role）」的格不存（見 §5 D-13）。

| 欄位 | 型別 | 可空 | 代表什麼 | 何時寫入／改變 | 規則 |
|---|---|---|---|---|---|
| `role_type` | varchar | 否 | `system`＝平台層級角色；`task`＝任務內角色。兩層不可互相推導（007 授權判斷規則） | migration 建立 | M-01 |
| `role_key` | varchar | 否 | `role_type='system'` 時為 `user`／`super_admin`；`task` 時為 `project_leader`／`reviewer`／`annotator` | migration 建立 | M-01 |
| `permission_key` | varchar | 否 | 007「權限鍵白名單（V1）」中的鍵，例如 `task.create`；白名單在後端程式，DB 不加 CHECK | migration 建立；白名單增減時由 migration 補列或刪列 | M-02、M-08 |
| `allowed` | boolean | 否 | 是否允許。**注意**：007 預設矩陣中 reviewer 的 `task.detail.view` 標為「✅（唯讀）」，boolean 表達不了，見 §5 D-10 | migration 寫入 V1 預設值；007 儲存時改變 | M-03、M-04 |
| `updated_at` | timestamptz | 否 | 最後一次被改變的時間 | 該格值改變時 | X-02 |

### 3.9 admin_role_permission_version：矩陣版本號

整張表只有一列（`id = 1`）。每次儲存成功，版本號加一；儲存時帶上讀取當下的版本號，不一致就拒絕（007 FR-005b）。操作者與變更內容記在 `audit_event`，這張表不重複記。

| 欄位 | 型別 | 可空 | 代表什麼 | 何時寫入／改變 | 規則 |
|---|---|---|---|---|---|
| `id` | smallint | 否 | 固定為 1，保證單列 | migration 建立 | M-06 |
| `version` | integer | 否 | 目前矩陣版本，初始為 1；前端讀取時一併取得，儲存時送回 | 每次有實際變更的儲存 +1 | M-06、M-07 |
| `updated_at` | timestamptz | 否 | 最後一次儲存時間 | 與 `version` 同時 | X-02 |

## 4. 限制清單（ERD 表達不了的規則）

類型：**CK**＝CHECK 與欄位互動／**SM**＝狀態轉換／**CC**＝併發保護／**CD**＝條件式必填或禁填／**XT**＝跨表連動（同一交易）／**PT**＝跨方言可攜性。

測試層級：**M**＝migration roundtrip（SQLite＋CI PG）／**DB**＝直接寫入違規資料並斷言 `IntegrityError`（SQLite 與 PG 各跑一次）／**PG**＝只在 CI 的 PostgreSQL 跑／**SVC**＝service 層測試／**API**＝route 整合測試。測試名稱是預定名稱，實作時可調整，但每條都必須有對應測試。

### 4.1 users

| ID | 類型 | 規則 | 執行位置 | 實作時驗證 | 來源 |
|---|---|---|---|---|---|
| U-01 | CK | 寫入 canonical email；`lower(email)` 為 DB 第二層唯一防線，同一列只改大小寫不衝突 | DB 表達式唯一索引 `lower(email)` | DB：大小寫不同的兩列不可並存；同列改大小寫成功 | account-020 FR-009；原 D-8 已裁決 |
| U-02 | PT | 註冊、邀請、登入、改 email 均在比對及寫入前用 Unicode NFC＋casefold，然後檢查長度 ≤254；SQLite 與 PG 的 `lower()` Unicode 行為不同，不依賴它作主要識別規則 | 應用層＋DB | SVC：ASCII、非 ASCII、組合字元及正規化後超長 email 在兩種 DB 判定一致 | account-020 FR-009；ADR-024 |
| U-03 | CK | `trim(name)` 非空；不加長度上限 | DB＋Pydantic | DB：全空白失敗；10,000 字元成功 | 003 FR-005A、003 Clarifications |
| U-04 | CK | `role IN ('user','super_admin')` | DB | DB：未知值失敗 | 006 PlatformUser、ADR-021 |
| U-05 | CK | seeder 必定是 active super_admin：`NOT is_seeder OR (role='super_admin' AND is_active)` | DB | DB：seeder 列停用或降級各失敗 | 006 FR-008c；007 FR-008b |
| U-06 | CK | 最多一位 seeder | DB 部分唯一索引 `WHERE is_seeder` | DB：第二筆失敗；M：downgrade 後索引消失 | 006 FR-008c |
| U-07 | SM | `is_seeder` 只能在初始化時設為 true，之後不可改回 false 或移轉；seeder 列不可刪除。U-05 只檢查單列當下狀態，不涵蓋旗標本身的變更，因此需另外保證 | 應用層不提供此路徑＋PG trigger | SVC：清除旗標被拒；PG：直接 UPDATE 旗標或 DELETE seeder 列被 trigger 擋下 | 006 FR-008c；007 FR-008b（含刪除） |
| U-08 | CC | 任何時刻至少一位 active super_admin，**併發**停用或降級時也必須成立。不得採「先查數量、再更新」的兩步寫法（SQLite 驅動延遲開始交易，兩步之間沒有鎖） | 單一條件式 UPDATE（條件內含 active super_admin 數量 > 1），依 rowcount 判定；或 SQLite 改用 `BEGIN IMMEDIATE` | SVC（SQLite）與 PG：兩個連線同時停用彼此 → 恰一個成功，active super_admin ≥ 1 | 006 FR-008d |
| U-09 | CD | `hashed_password` 為 null 時可免舊密碼設定密碼；判定條件不得改為 `google_subject IS NOT NULL`，否則已設密碼又連結 Google 的帳號會被免除舊密碼驗證 | 應用層 | API：有密碼且有 `google_subject` 的帳號改密碼時缺 `current_password` → 拒絕 | 005 FR-006、FR-008 |
| U-10 | XT | Google 連結（canonical email 相符且 `email_verified=true`）時同一交易：寫入 `google_subject`、`hashed_password=null`、`credential_version+1`、撤銷全部 family；`email_verified` 非 true → 拒絕，不寫任何列 | 應用層單一交易 | SVC：連結後密碼為 null、版本增加、family 全撤銷；`email_verified=false` → 無任何寫入；中途失敗 → 全部回滾 | ADR-035、account-020 FR-007 |
| U-11 | CD | `google_subject` 唯一，且允許多筆 null | DB | DB：兩筆 null 成功、兩筆相同值失敗（SQLite＋PG） | ADR-035 |
| U-12 | SM | 停用與降級立即生效：每個已認證請求重讀 `role`、`is_active`；停用 → 401、降級 → 403；`/auth/refresh` 也檢查 `is_active` | 應用層（`get_current_user`、`require_role`） | API：停用後同一 access token → 401；降級後打 super_admin 端點 → 403；停用後 refresh → 401 | ADR-021 修訂 |
| U-13 | XT | 停用時同一交易：`is_active=false`、撤銷全部 family、作廢未使用的 password token、清除 pending email 變更申請 | 應用層單一交易 | SVC：停用前發出的邀請連結與 email 驗證連結皆失效 | 006 FR-008a、account-020 FR-007；password token 與 email 申請的作廢為設計建議 |
| U-14 | XT | 重新啟用不恢復任何已撤銷的 token | 應用層 | SVC：停用→啟用後，舊 refresh token 仍 401 | 006 FR-008b；001 plan（refresh token 單向轉換） |
| U-15 | CC | Google callback 也檢查 `is_active`；停用帳號不得取得 session | 應用層 | API：停用帳號走 callback → 拒絕，不寫 family 或 refresh token | ADR-021、account-020 FR-007 |
| U-16 | CK／XT | `credential_version >= 1`，非空且預設 1；高風險憑證事件在原資料寫入交易內遞增。每個已認證請求比對 JWT claim、當前使用者及 family owner／撤銷狀態；角色和停用仍讀 DB | DB CHECK＋應用層 | DB：0 與 null 不可寫；API：舊版本或 `sid` 與 `sub` 不符拒絕；SVC：事件失敗時版本不變 | account-020 FR-002／FR-006／FR-007／FR-010 |

### 4.2 account_token_family

| ID | 類型 | 規則 | 執行位置 | 實作時驗證 | 來源 |
|---|---|---|---|---|---|
| F-01 | CK | `id` 為非空唯一 UUID PK；`user_id` 為非空 FK 至 `users.id`，`started_at` 非空且以 UTC 保存 | DB | DB：不存在的 user FK 及 null 值失敗；M：SQLite＋PG roundtrip | account-020 FR-001 |
| F-02 | XT | `user_id` 建 B-tree 索引以支援帳號層級撤銷；單裝置登出只撤銷對應 `sid` family，全部登出以 `user_id` 找到有效 family | DB 索引＋應用層同一交易 | SVC：登出 A 不影響 B；DB：可用該索引按 user 查 family | account-020 FR-007／FR-008 |
| F-03 | XT | `started_at` 是絕對存續上限的唯一來源；每個已認證請求與 refresh 都必須查到未撤銷 family、active user，並檢查 `now < started_at + REFRESH_TOKEN_ABSOLUTE_MAX_TTL`；登入及 refresh 核發的 access JWT `exp` 亦不得超過此上限 | 應用層；跨表和設定值不能由 token 列 CHECK | API：即使 JWT 自身未到期，family 超過上限仍拒絕；SVC：接近上限輪替不延長 | account-020 FR-002／FR-003／SC-009、foundation FR-076 |
| F-04 | SM | `revoked_at` 一旦設定不可回復；單裝置 logout、密碼修改、email 變更、停用或逾期重用依 FR-004／FR-006／FR-007 範圍設定 | 應用層 | SVC：重新啟用不恢復 family；逾期重用撤銷全部使用者 family | account-020 FR-004／FR-006／FR-007／FR-008 |

### 4.3 refresh_tokens

| ID | 類型 | 規則 | 執行位置 | 實作時驗證 | 來源 |
|---|---|---|---|---|---|
| R-01 | CK | `revoked_at` 與 `revoked_reason` 同時為 null 或同時非 null；`grace_reissued_at` 非 null 時必須已以 `rotated` 撤銷 | DB | DB：只填撤銷配對其中一欄或未輪替卻填 grace 時失敗 | account-020 FR-004；設計建議 |
| R-02 | CK | `revoked_reason IN ('rotated','logout','password_changed','email_changed','password_reset','user_disabled','reuse_detected','account_linked')` | DB | DB：未知值失敗 | 005 FR-010、FR-004K；006 FR-008a；ADR-021；ADR-035 |
| R-03 | SM | 只能由有效轉為已撤銷，不可回復 | 應用層（repository 不提供回復方法）；R-01 擋下只清一欄 | SVC：repository 無回復方法；同時清兩欄在 DB 層仍可寫，列為已知限制 | 001 plan 狀態轉換 |
| R-04 | XT | 輪替：舊列標 `rotated`＋新增同一 `family_id` 的新列，兩者在同一交易；`family_id` 為非空真實 FK 並建 B-tree 索引 | DB＋應用層 | DB：不存在的 family FK 失敗；SVC：新增失敗則舊列仍有效 | account-020 FR-001／FR-003、foundation FR-016 |
| R-05 | CC | 寬限期重發僅限 `revoked_reason='rotated'` 且 `now - revoked_at <= 30s`；其他撤銷原因拒絕。寬限期外重用須撤銷同一使用者全部有效 family | 應用層（時間比較在 SQL 端） | API：並發首次 refresh 與一次寬限重發成功；登出 token 重用 → 401；逾期重用 → 全部 family 撤銷 | account-020 FR-004、ADR-021 |
| R-06 | CC | 寬限資格只可再用一次：條件式 UPDATE `grace_reissued_at=now WHERE grace_reissued_at IS NULL` 與新 token 發行同一交易；第三次在寬限期內使用回 409，不核發、不撤銷其他 family | 應用層，以 rowcount 判定原子占用 | SQLite＋PG 多連線：最多一次額外成功；第三次 409 且 family 不變 | account-020 FR-004；原 D-3 已裁決 |
| R-07 | XT | token 本列 `expires_at` 必須晚於 `created_at`；發行／輪替前查 family `started_at`，將 refresh 與 access JWT 到期時間限制在絕對存續上限內。跨表 TTL 不能用 token 列 CHECK | DB（本列時間）＋應用層（跨表上限） | DB：本列倒置時間失敗；SVC：接近 family 上限時兩種 token 均不延長超過上限 | account-020 FR-003、foundation FR-076 |
| R-08 | XT | 改密碼成功：更新 hash、`credential_version+1`、撤銷同一使用者其他 family，保留目前 `sid` family；目前裝置以原 family refresh 取得新版 JWT | 應用層同一交易 | API：兩裝置登入，A 改密碼 → B refresh 401、A refresh 成功；兩者舊 JWT 均失效 | account-020 FR-006、005 FR-010 |
| R-09 | XT | email 驗證成功、管理員改 email、密碼重設及 Google 連結：`credential_version+1` 並撤銷全部 family（含目前裝置） | 應用層同一交易 | API：事件後全部舊 access／refresh 失效 | account-020 FR-007 |

### 4.3 account_password_token

| ID | 類型 | 規則 | 執行位置 | 實作時驗證 | 來源 |
|---|---|---|---|---|---|
| P-01 | SM | 狀態由資料推導：`used_at` 非 null → used；否則 `now > expires_at` → expired；否則 valid | 應用層 | SVC：三種狀態各一 | 004 FR-009 |
| P-02 | CC | 一次性使用：`UPDATE ... SET used_at=now WHERE id=:id AND used_at IS NULL AND expires_at > now`，rowcount=0 視為失效 | 條件式 UPDATE | SQLite 與 PG：同一 token 兩個連線同時使用 → 恰一個成功 | ADR-013（one-time token） |
| P-03 | CK | 同一使用者同一 `purpose` 最多一筆未使用 token | DB 部分唯一索引 `(user_id, purpose) WHERE used_at IS NULL` | DB：第二筆未使用失敗；M：PG 與 SQLite 的部分索引都生效 | 設計建議 |
| P-04 | CC | 同一 email 併發的忘記密碼請求觸發 P-03 衝突時，回應必須與一般情況相同 | 應用層處理 `IntegrityError` | API：並發兩請求，兩個回應的 status 與 body 相同，且與不存在的 email 相同 | 004 FR-004 |
| P-05 | XT | 改密碼成功、email 驗證成功、停用帳號時，作廢該使用者全部未使用 token | 應用層同一交易 | SVC：改 email 後，舊信箱中的重設連結失效 | 設計建議（延伸 005 FR-004K、006 FR-008a 的撤銷範圍） |
| P-06 | CD | `purpose='invite'` 的有效期限 | — | 待 §5 D-2 | 006 FR-006a |
| P-07 | XT | 006 新增使用者＝建立帳號＋建立 invite token＋寄信；寄信失敗不得留下使用者列。不得在持有 DB 寫入鎖時呼叫外部寄信服務 | 應用層 | SVC：模擬寄信失敗 → `users` 無此 email；API：回應顯示寄信錯誤 | 006 FR-006b |

### 4.4 account_email_change_request

| ID | 類型 | 規則 | 執行位置 | 實作時驗證 | 來源 |
|---|---|---|---|---|---|
| E-01 | CK | `verified_at` 為 null ⇔ `token_hash` 非 null | DB | DB：兩者同時為 null、同時非 null 各失敗 | 005 FR-004E |
| E-02 | CK | 每位使用者最多一筆等待驗證的申請（`verified_at IS NULL`） | DB 部分唯一索引 | DB：第二筆失敗；已驗證的歷史列可多筆 | 005 FR-004M |
| E-03 | SM | 新申請覆蓋同一列的 `pending_email`、`token_hash`、`expires_at`、`last_sent_at`，舊 token 立即失效 | 應用層 | API：申請 a 再申請 b → a 的連結失效 | 005 FR-004M |
| E-04 | CC | 驗證以條件式 UPDATE 完成：`SET verified_at=now, token_hash=NULL WHERE id=:id AND token_hash=:h AND verified_at IS NULL AND expires_at > now`，rowcount=1 才更新 `users.email` | 條件式 UPDATE | PG：驗證舊連結與送出新申請同時發生 → 不得以舊的 `pending_email` 寫入 | 005 FR-004M |
| E-05 | CC | 重送冷卻：`WHERE last_sent_at <= now - cooldown` 條件式 UPDATE | 應用層 | API：冷卻時間內連點兩次 → 只寄一封 | 005 FR-004L |
| E-06 | XT | 驗證時新 email 已被他人使用 → 觸發 U-01，回「Email 已被使用」，本列不變 | DB＋應用層 | API：兩人申請同一 email，先驗證者成功，後者得到可理解的錯誤 | 005 邊界情況 |
| E-07 | XT | 驗證成功同一交易：更新 canonical `users.email`、清除 token、`credential_version+1`、撤銷全部 family（R-09）、作廢 password token（P-05） | 應用層 | SVC：任一步失敗 → 全部回滾；舊 access／refresh 均失效 | 005 FR-004E／FR-004F／FR-004K、account-020 FR-007／FR-009 |
| E-08 | XT | 管理員在 006 修改 email 時，同一交易寫 canonical email、`credential_version+1`、撤銷全部 family 並清除待驗證變更申請，避免舊連結覆蓋管理員修改 | 應用層 | SVC：使用者申請 x → 管理員改為 y → 舊連結失效，email 維持 y，舊 JWT 失效 | 006 FR-007、account-020 FR-007／FR-009 |

### 4.5 account_notification_preference

| ID | 類型 | 規則 | 執行位置 | 實作時驗證 | 來源 |
|---|---|---|---|---|---|
| N-01 | CK | `event_key` 限 005 定義的 6 個值 | DB＋Pydantic `Literal` | DB：未知值失敗；M：downgrade 移除 CHECK | 005 FR-013E |
| N-02 | CD | 沒有資料列時的預設值 | — | 待 §5 D-5 | 005 |
| N-03 | XT | 儲存為整份覆蓋：同一交易 upsert 6 列 | 應用層 | SVC：連續儲存兩次結果一致，列數恆為 6 | 005 FR-013E |

### 4.6 audit_event

| ID | 類型 | 規則 | 執行位置 | 實作時驗證 | 來源 |
|---|---|---|---|---|---|
| A-01 | XT | 與被稽核的異動同一交易寫入；任一方失敗則兩者皆不留 | 應用層 | SVC：模擬稽核寫入失敗 → 使用者列不變 | 006 FR-013；ADR-032 |
| A-02 | SM | 只能新增，禁止 UPDATE | 應用層＋DB trigger（兩種 DB 各一份） | SQLite 與 PG：直接 UPDATE 被 trigger 擋下；M：downgrade 移除 trigger | ADR-032（Proposed） |
| A-03 | CD | `payload_summary` 只含 allowlist 欄位（`name`、`email`、`role`、`is_active`、`contact_info`），不得含 `hashed_password`、任何 token 或雜湊 | 應用層 allowlist | SVC：改密碼、停用等操作後，`payload_summary` 不含上述鍵 | 006 FR-013；ADR-032 |
| A-04 | CK | `actor_user_id` 的 FK 為 RESTRICT | DB | SQLite 與 PG：刪除有稽核紀錄的使用者 → 失敗（SQLite 依賴 X-01） | 設計建議 |
| A-05 | CD | 角色權限矩陣的稽核紀錄至少保存 1 年；日後的清理作業不得刪除未滿 1 年的這類紀錄 | 清理作業的條件 | SVC：清理作業執行後，未滿 1 年的矩陣稽核紀錄仍在 | 007 FR-010；ADR-032 的保存期限尚未訂定 |
| A-06 | CD | 矩陣儲存的 `payload_summary` 記錄版本號前後值與每個變更格的 `role_type`、`role_key`、`permission_key`、前後值；diff 由伺服器比對儲存前後的資料列算出，不採用前端送來的 diff | 應用層 | SVC：前端送出的 diff 與實際變更不一致時，稽核紀錄以實際變更為準 | 007 FR-010、區塊 C；伺服器端計算為設計建議 |

### 4.7 admin_role_permission 與 admin_role_permission_version

以下規則的前提是 §5 D-9 選 (a) 或 (b)；若選 (c)，這兩張表與本節整節刪除。

| ID | 類型 | 規則 | 執行位置 | 實作時驗證 | 來源 |
|---|---|---|---|---|---|
| M-01 | CK | `role_type IN ('system','task')`，且 `role_key` 與 `role_type` 一致：system 限 `user`／`super_admin`，task 限 `project_leader`／`reviewer`／`annotator` | DB | DB：`('task','super_admin', …)` 失敗；未知 `role_type` 失敗 | 007 `SYSTEM_ROLES`、`TASK_ROLES`、授權判斷規則 |
| M-02 | CD | `permission_key` 必須在後端白名單內，且層級相符：system 列只能用平台層級鍵，task 列只能用任務層級鍵 | 應用層（白名單常數附帶層級屬性） | API：送出白名單外的鍵 → 拒絕；送出 system × `task.detail.view` → 拒絕 | 007 FR-003a、SC-009、預設矩陣中的「⛔（需 task role）」；層級屬性為設計建議 |
| M-03 | CK | `super_admin` 的所有 `admin.*` 格必須為 true | DB CHECK：`NOT (role_type='system' AND role_key='super_admin' AND permission_key LIKE 'admin.%') OR allowed` | DB：把其中任一格改為 false 失敗；API：錯誤訊息指出是哪一格 | 007 FR-008a、邊界情況（指出哪個組合有問題） |
| M-04 | CK | `user` 的所有 `admin.*` 格必須為 false | DB CHECK（形式同 M-03） | DB：把其中任一格改為 true 失敗 | 由 007 FR-002 與使用者故事 3 行為規則（admin 兩頁僅允許 `super_admin`）推得；是否另訂其他不可變更的格見 §5 D-13 |
| M-05 | CD | 儲存後的列集合必須恰好等於「白名單 × 適用角色」；不得缺列或多列 | 應用層 | SVC：送出缺一格的矩陣 → 拒絕且資料不變 | 007 FR-003b、FR-003c；設計建議 |
| M-06 | CC | 樂觀鎖：`UPDATE admin_role_permission_version SET version = version + 1 … WHERE id = 1 AND version = :expected`，rowcount = 0 → 回傳版本衝突，本次所有變更不寫入 | 條件式 UPDATE | SQLite 與 PG：兩個連線帶同一版本號同時儲存 → 恰一個成功，另一個收到衝突 | 007 FR-005b、SC-007 |
| M-07 | XT | 儲存在同一交易內完成：M-06 版本檢查、更新變更的格、寫入 `audit_event`（A-01、A-06）。沒有任何格改變的儲存不加版本、不寫稽核紀錄 | 應用層單一交易 | SVC：稽核寫入失敗 → 矩陣與版本號皆不變；空變更儲存 → 版本號不變、無稽核紀錄 | 007 FR-004、FR-010；空變更的處理為設計建議 |
| M-08 | SM | 白名單新增鍵時，同一個 migration 為每個適用角色補列，初始值取 V1 預設矩陣；未列在預設矩陣的新鍵預設 false。授權判斷查不到列時一律視為不允許 | migration＋應用層 | M：新增鍵的 migration 後列數正確；SVC：刪除某列後該權限判斷為不允許 | 設計建議，見 §5 D-12 |
| M-09 | CD | 讀取矩陣、讀取矩陣稽核紀錄、儲存矩陣三個端點都在伺服器端以 `require_role(super_admin)` 驗證 | 應用層 | API：`user` 呼叫三個端點皆 403；未登入 401 | 007 FR-002、FR-008、使用者故事 3 行為規則；ADR-021 修訂 |

### 4.8 跨表與基礎設施

| ID | 類型 | 規則 | 執行位置 | 實作時驗證 | 來源 |
|---|---|---|---|---|---|
| X-01 | PT | SQLite 必須開啟 `PRAGMA foreign_keys=ON`，否則 FK、CASCADE、RESTRICT 在 quick-start 層都不生效 | engine connect 事件 | DB（SQLite）：寫入不存在的 `user_id` → 失敗 | ADR-024（SQLite／PG 雙層） |
| X-02 | PT | SQLite 讀回 `DateTime(timezone=True)` 不帶時區，與 aware datetime 比較會丟例外；以 TypeDecorator 讀回補 UTC，或時間比較一律在 SQL 端 | ORM 型別 | DB（SQLite）：寫入 UTC、讀回後與 `datetime.now(timezone.utc)` 比較不丟例外 | ADR-024（SQLite／PG 雙層） |
| X-03 | PT | Alembic `render_as_batch=True`，否則 SQLite 無法 ALTER 既有表 | `alembic/env.py` | M：對既有表加欄的 migration 在 SQLite roundtrip 通過 | ADR-024（SQLite／PG 雙層） |
| X-04 | PT | UUID 字串形式統一為小寫含連字號；SQLite 的 `Uuid` 以 32 位無連字號儲存，SQL 端直接比對字串不會相等 | 應用層在 Python 端比對；`target_id` 寫入前正規化 | DB（SQLite＋PG）：`audit_event.target_id` 與 `str(users.id)` 比對相等 | ADR-024（SQLite／PG 雙層） |
| X-05 | M | 每張表的 upgrade／downgrade／roundtrip 在 SQLite 與 PG 都通過；約束名稱符合 `NAMING_CONVENTION` | Alembic | M：`upgrade head → downgrade base → upgrade head`；PG 查 `pg_constraint` 名稱 | ADR-024；`backend/app/db/base.py` |

### 4.9 查詢與索引對照（候選）

| 查詢／寫入路徑 | 索引或鍵 | 理由與界線 |
|---|---|---|
| 每請求驗證 `sub`／`sid`、單列 refresh | `users.id`、`account_token_family.id`、`refresh_tokens.id` 的 PK | 按主鍵定位；`credential_version` 只在定位後比對，不另建索引 |
| 註冊／邀請／登入／改 email 比對帳號 | `UNIQUE lower(users.email)` | canonical 值的第二層唯一防線；Unicode 識別仍以應用層 NFC＋casefold 為準 |
| 依 token 原值雜湊查找 | `UNIQUE refresh_tokens.token_hash` | 唯一定位；不存明文 token |
| 使用者全裝置撤銷與列出 family | `account_token_family.user_id` B-tree | FK 並作 `WHERE user_id = ?`；全帳號作廢要能尋得所有家族 |
| 輪替／刪除 family 時查找 token | `refresh_tokens.family_id` B-tree | FK 並作 `WHERE family_id = ?`；避免 family→token 全表掃描 |
| 密碼／邀請 token、email 變更、稽核記錄依 user 查找 | `account_password_token.user_id`、`account_email_change_request.user_id`、`audit_event.actor_user_id` B-tree | 各 FK 查詢及參照動作；部分唯一索引只涵蓋 pending 列，不取代全 FK 索引 |
| 通知設定按 user 查找 | `account_notification_preference(user_id, event_key)` 複合 PK | 前導欄已涵蓋 user FK，無需重複單欄索引 |

`revoked_at`、`expires_at`、`grace_reissued_at`、`credential_version` 暫不各建單欄索引；等實際查詢與 EXPLAIN 證據再調整。上述索引與限制仍是 migration 前候選，未在 SQLite／PostgreSQL 部署。

## 5. 待裁決（影響 migration）

| ID | 題目 | 選項 | 建議 | 阻擋 migration |
|---|---|---|---|---|
| D-2 | invite token 有效期限（006 未定義）；被作廢的 token 在 004 三種狀態中顯示為哪一種 | 沿用 reset 的期限或另訂；作廢顯示為 used | 補 006 條文 | 否 |
| D-4 | 稽核依 Proposed ADR-032 建共用表，或 006 自建表；另外 ADR-032 事件模型含 `task_id`、表名為 `audit_events`，本文件兩者皆未採用 | (a) ADR-032 先轉 Accepted，表形完全依 ADR (b) 006 自建 `admin_user_audit_log`。另外 ADR-032 的 admin 動作清單沒有矩陣儲存的動作，保存期限也未訂，而 007 FR-010 要求至少 1 年（A-05） | (a)，`task_id` 保留為可空欄以供後續模組使用；ADR-032 補矩陣儲存動作與保存期限 | **是** |
| D-5 | 通知偏好沒有資料列時的預設值 | 全開／全關 | 補 005 條文 | 否 |
| D-7 | seeder 由誰、何時建立 | bootstrap 指令／data migration／環境變數指定首位 super_admin | bootstrap 指令 | 否 |
| D-9 | 矩陣是否真的參與授權判斷。007 使用者故事 2 寫「新配置成為平台後續授權判斷基準」，但 ADR-021 的 `require_role` 以程式內的角色集合判斷、007 使用者故事 3 要求 admin 兩頁用 RoleGuard 僅允許 `super_admin`、014 AC-2.2／AC-2.4 以固定的 task role 決定能否進入頁面，且沒有任何其他 spec 或 ADR 引用 `permission_key` | (a) 矩陣為授權依據：所有守門改查 `permission_key`，需新 ADR，並改寫 006、014、015 以鍵描述權限；每次請求讀矩陣或依 foundation FR-054 快取 (b) 矩陣可編輯並留稽核，但守門仍依角色，007 需改寫使用者故事 2 並在畫面上說明 (c) V1 矩陣改為唯讀展示，刪除編輯、樂觀鎖、稽核需求（007 MAJOR 改版），不建 §3.8、§3.9 兩張表 | 需維護者依論文需求裁決；技術面傾向 (c)：沒有下游使用者，且 (a) 無法表達 014／015 中「reviewer 唯讀」「只看自己的工時」這類規則 | **是**（決定兩張表是否存在） |
| D-10 | reviewer 的 `task.detail.view` 在預設矩陣標為「✅（唯讀）」，但 `allowed` 是 boolean；白名單也沒有「編輯任務詳情」的鍵 | (a) 新增鍵 `task.detail.edit`，`allowed` 維持 boolean (b) `allowed` 改為三值（不允許／唯讀／完整） | (a) | **是**（D-9 選 (a)、(b) 時；決定欄位型別或列數） |
| D-11 | 007 授權判斷規則允許同一人在同一任務同時有多個 task role，但 014 FR-005d 在新增成員時排除已在任務中的人，`TaskMembership` 每列只有一個 `task_role` | (a) 允許多角色，`task_membership` 唯一鍵為 `(task_id, user_id, task_role)`，014 補條文 (b) 一人一角色，唯一鍵為 `(task_id, user_id)`，007 刪除多角色條文 | 屬 task-management 盤點範圍，於該模組盤點時裁決 | 否（不影響本文件的表） |
| D-12 | 白名單新增鍵時的預設值（M-08） | (a) 取 V1 預設矩陣，未列者為 false (b) 一律 false (c) 一律 true | (a) | 否 |
| D-13 | 除了 M-03、M-04，是否還有不可變更的格。例如 `user` 的 `dashboard.view` 若可關閉，007 FR-007 的無權限導向目標 `/dashboard` 本身就不可進入；「⛔（需 task role）」的格是否完全不存 | 列出固定格清單並補 007 條文；⛔ 格不存 | 固定 `dashboard.view`；⛔ 格不存 | 否（不改表形，只改 CHECK 與種子資料） |

**已裁決**：N-1 採既有 auth 命名例外與新表模組前綴（ADR-021、foundation FR-105）；D-1 密碼可空（001 plan v2.2.0、account-020 FR-010）；D-3 最多一次寬限重發（account-020 FR-004）；D-6 以每請求 `credential_version` 比對實現高風險事件立即失效（ADR-021、account-020 FR-002／FR-007）；D-8 採 canonical email 與 `lower(email)` 唯一索引（account-020 FR-009）。這些不再列為 migration 阻擋；D-4／D-9／D-10 等仍未決。

## 6. 刻意不做

- 不建外部身分表：單一 provider，用 `users.google_subject`（ADR-035）。
- 不建登入失敗計數或鎖定欄位：005 FR-009 明文不啟用鎖定或節流。
- 不為 `role`、`is_active`、`created_at` 建索引：目前規模不需要。
- 不建角色／狀態用 `token_version`；高風險憑證事件使用 `credential_version`，仍每請求重讀角色與啟用狀態（ADR-021、account-020 FR-002／FR-010）。
- 不提供使用者實體刪除，只能停用。
- 不建權限鍵表：白名單以後端程式常數為唯一來源（007 `PERMISSION_KEYS_SOURCE`）。
- 不在矩陣表存操作者：操作者與變更內容只記在 `audit_event`，避免兩處不一致。

## 7. 維護方式

- 上游 spec 或 ADR 異動涉及本文件的表、欄位或規則時，同一個 PR 更新本文件。
- §5 每項定案後：刪除該列、把結果寫回 §1 或 §4 對應位置，並在來源欄引用定案的 spec／ADR 版本。
- 實作時若測試證明某條規則寫錯，先修本文件，再修程式。
- 新增其他模組的表時另開文件，不擴充本檔範圍；本檔只描述 account 與 admin（006、007）。
