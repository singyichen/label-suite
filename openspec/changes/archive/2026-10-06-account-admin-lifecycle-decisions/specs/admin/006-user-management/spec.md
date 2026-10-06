> 正典：`specs/admin/006-user-management/spec.md`；對應 FR-006c／FR-008e／FR-008f、SC-013／SC-014。

## ADDED Requirements

### Requirement: FR-006c 邀請連結期限與作廢

**FR-006c**：設定密碼連結自核發起 24 小時有效，僅能成功使用一次。重發同一使用者的邀請連結時，須先使原連結失效；過期或作廢的連結均回覆通用「連結無法使用」，不得顯示設定密碼成功。作廢時間與成功使用時間須分別記錄。

#### Scenario: SC-013 重發邀請

- **GIVEN** 一封尚未使用的邀請信
- **WHEN** 重發邀請後使用舊連結
- **THEN** 舊連結、已作廢連結與過期連結均不能設定密碼且不顯示成功；新連結在 24 小時內僅能成功使用一次（SC-013）

### Requirement: FR-008e 冪等 seeder bootstrap

**FR-008e**：首位 seeder `super_admin` 由明確執行的 bootstrap 指令建立**全新帳號**，不得提升既有非 seeder 帳號，也不由一般管理 API 或 schema migration 自動建立；指令不得內建預設密碼，必須由安全的外部輸入取得憑證。同一 seeder 身份重跑須保持冪等，指定既有非 seeder 或另一身份時須明確失敗；建立帳號、設定憑證、`role=super_admin`、`is_active=true` 與 `is_seeder=true` 須原子完成。

#### Scenario: SC-014 重跑 bootstrap

- **GIVEN** 指定身份已建立 seeder
- **WHEN** 同身份重跑及另一身份重跑
- **THEN** 前者無副作用，後者失敗且不新增 seeder（SC-014）

#### Scenario: 既有帳號不能繼承舊 session 升權

- **GIVEN** 既有非 seeder 帳號持有已簽發的 access 與 refresh token
- **WHEN** bootstrap 指定該身份
- **THEN** 拒絕升權，帳號與既有 session 權限不變（SC-014）

### Requirement: FR-008f 跨資料庫超管保護

**FR-008f**：系統必須在 SQLite 與 PostgreSQL 都阻止清除 seeder 旗標、刪除 seeder，並在併發停用或降級時維持至少一位 active `super_admin`；此規則不得只依序執行「查數量、再更新」。

#### Scenario: 併發停用不同超管

- **GIVEN** 兩位 active 超管在兩個連線上
- **WHEN** 同時嘗試停用對方
- **THEN** 完成後仍有 active 超管；若既有不可停用 seeder，兩個非 seeder 的停用可以都成功（SC-014）

#### Scenario: 直接寫入不得移除 seeder

- **GIVEN** 已由 bootstrap 建立 seeder
- **WHEN** 在 SQLite 或 PostgreSQL 直接清除其旗標或刪除其列
- **THEN** 資料庫拒絕寫入，仍保留 active seeder（SC-014）
