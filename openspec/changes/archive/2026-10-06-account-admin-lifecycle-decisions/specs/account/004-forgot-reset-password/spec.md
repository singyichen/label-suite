> 正典：`specs/account/004-forgot-reset-password/spec.md`；對應 FR-009A／SC-004A。

## ADDED Requirements

### Requirement: FR-009A 作廢的重設連結

**FR-009A**：真實後端連結若因重發、改密碼、Email 變更或帳號停用而作廢，必須與成功使用的連結區分；作廢連結不可設定密碼，回覆通用「連結無法使用」，不得顯示「已使用」或重設成功。`RESET_TOKEN_STATES` 仍只描述目前 prototype 的三種手動展示狀態。

#### Scenario: SC-004A 作廢但未使用

- **GIVEN** 重設連結已作廢且尚未使用
- **WHEN** 使用者嘗試設定新密碼
- **THEN** 密碼不變，回通用不可使用結果，不顯示使用成功（account/004-forgot-reset-password SC-004A）
