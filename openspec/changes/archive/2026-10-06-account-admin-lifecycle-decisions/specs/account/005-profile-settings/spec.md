> 正典：`specs/account/005-profile-settings/spec.md`；對應 FR-013F／SC-011A。

## ADDED Requirements

### Requirement: FR-013F 通知偏好缺列與首存

**FR-013F**：尚無通知偏好資料列的事件，其站內通知與電子郵件預設為開啟；讀取設定不得因預設值建立資料列。首次或後續儲存均須在同一交易完整寫入六項支援事件的兩種頻道狀態，不可只保存有變動的事件。

#### Scenario: SC-011A 首次讀取與儲存

- **GIVEN** 新帳號沒有任何通知偏好資料列
- **WHEN** 讀取設定後儲存六項事件
- **THEN** 讀取呈現兩頻道全開且不寫入；儲存後恰有六列，跨裝置重讀一致（account/005-profile-settings SC-011A）
