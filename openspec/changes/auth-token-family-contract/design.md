# Design: auth-token-family-contract

## Context

權威設計見 `docs/superpowers/specs/2026-10-06-auth-token-family-canonical-design.md`，正典目標為 `specs/account/020-auth-session-security/spec.md`。目前沒有已部署的業務表、ORM 或 Alembic revision；此變更屬契約／規劃階段。

## Decision

1. `users`、`refresh_tokens`、`role`、`is_active` 作明示命名例外；新 `account_token_family` 依 `specs/foundation/000-foundation/spec.md` FR-105 採單數模組前綴。family 擁有 `user_id` 與 `started_at`；token 只以 `family_id` FK 指向它，避免遞移重複。
2. Access JWT 加 `sid`、`credential_version`，每次受保護請求核對 active user、現行 role、family 未撤銷且 `family.user_id = sub`。角色／停用仍直接查 DB，不使用版本代替；高風險憑證事件增加版本並依事件撤銷 family。
3. 原子條件更新 `grace_reissued_at IS NULL` 限制每張 rotated token 在 30 秒內額外重發一次；其後競爭回 `409`，前端最多等待 2 秒並有界重試。family 起點提供 refresh absolute TTL；不得以跨表 CHECK 假裝已保證。
4. Email 寫入與查找用 Unicode NFC 加 casefold，對 canonical 值檢查 254 字元，DB `lower(email)` 唯一表達式索引作第二層防線。合法寫入須經同一應用層規則；SQLite `lower()` 的 ASCII 行為不能單獨代表 PostgreSQL。
5. `users.hashed_password` 可為 null，表示沒有本地密碼；`credential_version` 為非空整數。NULL 保留真正的業務語意，不以空字串代替。

## Runtime And Migration Boundary

本變更不執行 API／frontend 行為或 Alembic migration。後續實作須先寫失敗測試，於 SQLite 啟用 `PRAGMA foreign_keys=ON` 並測 PK/FK/UNIQUE、nullable、一次性條件更新；於真實 PostgreSQL 測多連線競爭、Unicode 唯一性、索引查詢和 `upgrade → downgrade → upgrade`。兩層皆須驗證交易回滾和 family TTL。查詢索引依實際 `WHERE`／JOIN 與 `EXPLAIN` 選擇，不替每個欄位預建。

## Derived Views

`docs/diagrams/architecture/account-admin-db-schema.md` 是實體層欄位字典，`database-table-inventory.md` 是跨模組總帳，`database-schema.er.json` 是 NoteCraft renderer 資料。三者須標記「候選／未部署」並由 source checker 驗證一致；未定案的 dataset/task/review 表不畫成已確認 FK。
