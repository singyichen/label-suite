## MODIFIED Requirements

### Requirement: FR-010s-1 審核員與仲裁者名冊必須保留可分派審核員

審核設定編輯模式 MUST 提供兩份勾選清單：`reviewer_ids` 的候選為 active reviewer；`arbiter_ids` 的候選 MUST 為 `reviewer_ids` 子集合。兩份名冊元素 MUST 使用 `TaskMembership.user_id`，不得以 Email 或顯示名稱比對。

儲存時 MUST 同時符合：

1. `reviewer_ids` 至少一人；
2. `reviewer_ids - arbiter_ids` 至少一人，因 `arbiter_ids` 成員依 annotation/015 FR-093 保留處理仲裁，不接收新審核單位。

任一條件不符時 MUST 阻擋整筆儲存並顯示可修正錯誤。`arbiter_ids` 仍 MAY 為空；空值依 FR-010s-2 顯示摘要並沿用 FR-010t 發布警示，不構成儲存阻擋。取消 reviewer 勾選時，若同一人亦在 `arbiter_ids`，系統 MUST 同步取消並於儲存前提示。編輯區 MUST 揭露指定仲裁者不會收到新審核單位，且仲裁時另受 015 FR-060 非當事人限制。

#### Scenario: 全部審核員同時是仲裁者時阻擋儲存

- **GIVEN** PL 在審核設定中勾選兩位 reviewer，並把這兩人都勾為 arbiter
- **WHEN** PL 儲存審核設定
- **THEN** 儲存被阻擋，既有設定不被覆寫
- **AND** 畫面明確提示至少保留一位未被指定為仲裁者的審核員

#### Scenario: 保留一位可分派審核員後可儲存

- **GIVEN** `reviewer_ids = [W, C]` 且 `arbiter_ids = [C]`
- **WHEN** PL 儲存審核設定
- **THEN** 儲存成功，W 是新審核單位的有效分派對象，C 保留處理仲裁

#### Scenario: 空仲裁名冊仍可儲存

- **GIVEN** `reviewer_ids` 至少一人且 `arbiter_ids = []`
- **WHEN** PL 儲存審核設定
- **THEN** 儲存成功
- **AND** 摘要與發布確認仍依既有規則警示未指定仲裁者，不新增儲存阻擋
