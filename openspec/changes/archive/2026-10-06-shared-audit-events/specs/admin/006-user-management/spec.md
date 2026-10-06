> 正典：`specs/admin/006-user-management/spec.md`；對應 FR-013、SC-012。

## ADDED Requirements

### Requirement: FR-013 帳號異動共用稽核

**FR-013**：新增、編輯、停用、啟用與 system role 變更皆必須以 ADR-032 的共用 `audit_events` 保留審計紀錄（操作者、目標使用者、時間、操作類型、變更前後的非敏感 diff），與帳號異動同交易寫入。紀錄的 `target_type='user'`、`target_id` 為目標使用者 ID；`member.updated` 表示一般欄位編輯。異動紀錄 drawer 只讀所選使用者的事件，且仍須通過 `super_admin` 守門；摘要不得包含密碼、token 或原始請求內容。

#### Scenario: SC-012 異動紀錄限所選使用者

- **GIVEN** 兩位使用者都有帳號異動事件
- **WHEN** 授權超管打開其中一位的異動紀錄 drawer
- **THEN** 只顯示該目標的非敏感事件；其他使用者事件不混入，帳號寫入與稽核寫入同成同敗（SC-012）

### Requirement: SC-012 異動紀錄 drawer

**SC-012**：異動紀錄 drawer 在 `RWD_VIEWPORTS` 下可開啟、關閉且內容不重疊；`<= MOBILE_BP` 時以下方 sheet 呈現。正式後端在帳號異動成功時同交易寫入共用事件，drawer 只回傳所選目標使用者的事件；其他使用者事件與敏感摘要不得混入。

#### Scenario: 帳號異動失敗

- **GIVEN** 一次帳號異動將在提交時失敗
- **WHEN** 同交易的寫入回滾
- **THEN** 帳號與共用稽核事件都不留下該異動（SC-012）
