# admin/006-user-management Specification

## Purpose
Canonical: `specs/admin/006-user-management/spec.md`; FR-006c／FR-008e／FR-008f、SC-013／SC-014。

讓授權超管安全地管理平台帳號，並以可稽核、可重試的方式核發邀請連結及初始化首位超管；所有帳號異動均保留 active 超管與 seeder 保護。

## Requirements

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

### Requirement: FR-013 帳號異動共用稽核

- **FR-013**：新增、編輯、停用、啟用與 system role 變更皆必須以 ADR-032 的共用 `audit_events` 保留審計紀錄（操作者、目標使用者、時間、操作類型、變更前後的非敏感 diff），與帳號異動同交易寫入。紀錄的 `target_type='user'`、`target_id` 為目標使用者 ID；`member.updated` 表示一般欄位編輯。異動紀錄 drawer 只讀所選使用者的事件，且仍須通過當前 `super_admin` 與 `admin.user_management.view` 守門；摘要不得包含密碼、token 或原始請求內容。

#### Scenario: SC-012 異動紀錄限所選使用者

- **GIVEN** 兩位使用者都有帳號異動事件
- **WHEN** 授權超管打開其中一位的異動紀錄 drawer
- **THEN** 只顯示該目標的非敏感事件；其他使用者事件不混入，帳號寫入與稽核寫入同成同敗（SC-012）

#### Scenario: FR-013 主要驗收

- **GIVEN** 正式服務端收到本需求作用域內的請求
- **WHEN** 使用者執行本需求描述的操作
- **THEN** 目標歷程須通過當前超管及 view 格守門，且只含非敏感事件（FR-013）

### Requirement: SC-012 異動紀錄 drawer

**SC-012**：異動紀錄 drawer 在 `RWD_VIEWPORTS` 下可開啟、關閉且內容不重疊；`<= MOBILE_BP` 時以下方 sheet 呈現。正式後端在帳號異動成功時同交易寫入共用事件，drawer 只回傳所選目標使用者的事件；其他使用者事件與敏感摘要不得混入。

#### Scenario: 帳號異動失敗

- **GIVEN** 一次帳號異動將在提交時失敗
- **WHEN** 同交易的寫入回滾
- **THEN** 帳號與共用稽核事件都不留下該異動（SC-012）

### Requirement: FR-002 授權契約

- **FR-002**：只有當前 active `super_admin` 且 `admin.user_management.view` 已啟用並允許時可以存取 `/user-management`；新增、編輯、停用、啟用與 system role 變更另需 `admin.user_management.manage`，每個命令仍須通過本規格的 seeder／最後超管等資源限制。矩陣格不可授權 `user` 越過 system role 硬邊界（ADR-037）。

#### Scenario: FR-002 主要驗收

- **GIVEN** 正式服務端收到本需求作用域內的請求
- **WHEN** 使用者執行本需求描述的操作
- **THEN** 當前超管與相應格允許才可讀寫帳號，原有資源限制仍生效（FR-002）

### Requirement: SC-015 授權契約

- **SC-015**：當前 `super_admin` 通過對應矩陣格後才可讀取或修改帳號；一般 `user` 即使偽造 admin 格請求也被拒絕。矩陣變更後的下一個請求立即依新格判斷，而 seeder 與最後超管保護仍生效。

#### Scenario: SC-015 主要驗收

- **GIVEN** 正式服務端收到本需求作用域內的請求
- **WHEN** 使用者執行本需求描述的操作
- **THEN** user、被撤銷格與受 seeder／最後超管保護的異動均拒絕（SC-015）
