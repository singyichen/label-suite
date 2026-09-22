## MODIFIED Requirements

### Requirement: FR-010s-1 審核設定編輯模式

審核設定編輯模式 MUST 提供兩份勾選清單，MUST NOT 提供任何數值輸入框、模式單選或行為 toggle：`reviewer_ids` 的候選為 `membership_status = active AND task_role = reviewer`；`arbiter_ids` 的候選 MUST 為 `reviewer_ids` 子集合，未勾選為 reviewer 者不得出現在 arbiter 候選。兩份名冊元素 MUST 遵守 `REVIEWER_ID_FORMAT`，使用 `TaskMembership.user_id` 作為唯一比對與審核負荷聚合鍵，不得以 Email 或顯示名稱比對；Email 只供顯示。

儲存時 MUST 同時符合：

1. `reviewer_ids` 至少一人；
2. `reviewer_ids - arbiter_ids` 至少一人，因 `arbiter_ids` 成員依 annotation/015 FR-093 保留處理仲裁，不接收新審核單位。

任一條件不符時 MUST 阻擋整筆儲存並顯示可修正錯誤。`arbiter_ids` 仍 MAY 為空；空值依 FR-010s-2 顯示摘要並沿用 FR-010t 發布警示，不構成儲存阻擋。取消 reviewer 勾選時，若同一人亦在 `arbiter_ids`，系統 MUST 同步取消並於儲存前提示。編輯區 MUST 揭露指定仲裁者不會收到新審核單位，且仲裁時另受 015 FR-060 非當事人限制；系統不得因 reviewer 恰為該筆標記員而排除其一般審核指派。

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

#### Scenario: 仲裁者候選限於已勾選審核員

- **GIVEN** 任務有 4 位啟用中審核員，其中 2 位被勾選為 `審核員`
- **WHEN** 專案負責人展開 `仲裁者` 勾選清單
- **THEN** 候選恰為該 2 位被勾選的審核員
- **AND** 取消勾選其中一位審核員時，其仲裁者勾選同步取消並於儲存前提示

#### Scenario: 名冊以不透明 user id 儲存而非 Email

- **GIVEN** 專案負責人於審核設定勾選一位啟用中審核員並儲存
- **WHEN** 檢視該任務的 `reviewer_ids`
- **THEN** 其元素為該成員的 `TaskMembership.user_id`（形如 `reviewer_wang`），不含任何 Email 字串
- **AND** 審核工作分派、審核負荷聚合與審核員身分比對皆以該 id 為鍵，Email 僅出現於成員清單顯示欄
