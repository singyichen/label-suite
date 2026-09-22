## MODIFIED Requirements

### Requirement: FR-060 仲裁資格以任務名冊與非當事人共同決定

`annotation-list` reviewer 視圖中，狀態為 `爭議中`（FR-051）的審核單位列，對具仲裁資格的審核員 MUST 將列動作按鈕由 `編輯` 換為 `仲裁`（testid `list-arbitrate-entry`）。仲裁資格 MUST 同時符合：

1. 目前審核員的 `user_id` 存在於該任務 `arbiter_ids`；該欄位是 `can_arbitrate = true` 的唯一任務層來源，系統 MUST NOT 只以全域示範名冊或其他任務的旗標授權；
2. 目前審核員於該審核單位沒有自己的已提交審核（FR-049 reviewer bucket 查無提交）。

不符資格者維持 `編輯`；非 `爭議中` 列不得出現 `仲裁`。非當事人限制只適用仲裁，不得用來排除審核員對自己標記資料的審核指派。

#### Scenario: 任務仲裁名冊覆蓋全域示範旗標

- **GIVEN** 任務 profile 的 `arbiter_ids` 只含 reviewer L，而全域示範名冊另將 reviewer C 標為可仲裁
- **WHEN** L 與 C 分別檢視一個兩人皆未參與的爭議單位
- **THEN** L 具仲裁資格且 C 不具仲裁資格

### Requirement: FR-093 自動分派保留所有指定仲裁者

審核工作 MUST 由系統自動指派；`dry_run` 以樣本為粒度，`official_run` 以審核單位為粒度。新審核工作的有效分派名冊 MUST 為該任務 `reviewer_ids - arbiter_ids`，且集合差 MUST 保留 `reviewer_ids` 原順序。所有指定於 `arbiter_ids` 的人都 MUST 自新分派池排除，不得只保留第一位或依人員身分硬編例外。有效名冊中的新單位仍依既有位置性規則平均分配。

issue #824 的黏住規則 MUST 優先於本次保留規則：已有已提交審核的單位仍黏住原提交者，即使該人目前位於 `arbiter_ids`；該人依 FR-060 仍不得仲裁自己參與的單位。`arbiter_ids` 為空時，有效分派名冊 MUST 等於完整 `reviewer_ids`。所有 reviewer 同時也是 arbiter 的零分派池形狀由 companion change `validate-reviewer-arbiter-role-separation` 在 014 儲存時阻擋，annotation 不得私自把仲裁者加回分派池。

#### Scenario: 唯一仲裁者不再收到新審核單位

- **GIVEN** 任務 `reviewer_ids = [W, L, C, N]` 且 `arbiter_ids = [C]`
- **WHEN** 系統對尚無提交的審核單位建立自動指派
- **THEN** 新單位只在 W、L、N 間平均分配，C 的新分派數為 0
- **AND** 爭議由 W、L 或 N 的提交產生時，C 仍符合 FR-060 的非當事人條件並可仲裁

#### Scenario: 多位指定仲裁者全部保留

- **GIVEN** `reviewer_ids = [W, L, C, N]` 且 `arbiter_ids = [C, N]`
- **WHEN** 系統建立新指派
- **THEN** 有效分派名冊恰為 `[W, L]`，不得把 N 當作備用審核員加入

#### Scenario: 歷史黏住優先於新角色保留

- **GIVEN** C 過去已對單位 U 提交審核，之後 C 被加入 `arbiter_ids`
- **WHEN** 系統重新推導指派
- **THEN** U 仍指派給 C，不得改寫歷史責任鏈
- **AND** C 對 U 不具仲裁資格，但對自己未參與的其他爭議單位仍可仲裁

#### Scenario: 未指定仲裁者時不縮小審核池

- **GIVEN** `arbiter_ids` 為明確空陣列
- **WHEN** 系統建立新指派
- **THEN** 有效分派名冊等於完整 `reviewer_ids`
- **AND** 系統不得以全域示範名冊偷偷排除任何人
