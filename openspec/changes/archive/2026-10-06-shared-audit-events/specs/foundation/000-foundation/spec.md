> 正典：`specs/foundation/000-foundation/spec.md`；對應 FR-105、SC-046。

## ADDED Requirements

### Requirement: FR-105 資料表與欄位命名

**FR-105**：系統必須讓 DB table 與 column 使用 `lower_case_snake`；table name 預設使用 singular form，join table 或 module-owned table 應以前綴表達 domain ownership，例如 `task_assignment`、`dataset_item`、`account_token_family`。歷史契約 `users`、`refresh_tokens` 與欄名 `role`、`is_active` 為明示命名例外；ADR-032 的跨模組共用表 `audit_events` 是唯一新增的明示表名例外，不得據此擴張其他新表的命名例外。

#### Scenario: SC-046 唯一新增表名例外

- **GIVEN** 後續 migration 新增 DB table
- **WHEN** 檢查表名與 domain ownership
- **THEN** `users`、`refresh_tokens`、`audit_events` 是明示表名例外，其餘新表仍使用 FR-105 預設的單數與 ownership 規則（SC-046）

### Requirement: SC-046 命名例外驗收

**SC-046**：資料表命名檢查須允許 `users`、`refresh_tokens` 與 ADR-032 共用的 `audit_events` 三個明示表名例外；任何其他新表仍須符合 FR-105 的單數與 domain ownership 預設，不能從例外推導出普遍的複數或無前綴規則。

#### Scenario: 未列入的複數表名

- **GIVEN** 一張新增且不在例外清單的複數表
- **WHEN** 執行資料表命名檢查
- **THEN** 不因 `audit_events` 例外而自動通過（SC-046）
