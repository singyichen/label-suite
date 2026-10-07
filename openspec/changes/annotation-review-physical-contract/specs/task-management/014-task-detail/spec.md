> 正典：`specs/task-management/014-task-detail/spec.md`。此 delta 為未提交 slot 草稿隔離，其他發布契約維持原樣。

## MODIFIED Requirements

### Requirement: FR-005f 移除成員與草稿退回

- **FR-005f**：移除仍有未完成作業的**選定角色 membership** 時，系統必須顯示二次確認；確認後保留該角色已完成提交與歷史統計。移除 annotator membership 時只把該角色未完成標記作業改為未指派，等待 `project_leader` 手動重新指派或處理；移除 reviewer membership 的 pending 審核依 FR-005j 退回分派池。此人其他仍有效的 task role、提交與指派不得被連帶停用或清空。 **V1 草稿退回**：未提交標記草稿於 slot 退回時同交易轉 `abandoned`，保留原作者與內容供受限追溯；繼任者不得讀取或繼承，須從自己的空白紀錄開始。已提交紀錄不得轉 `abandoned`。

#### Scenario: 移除後重派不繼承草稿

- **GIVEN** 原標記員有未提交草稿
- **WHEN** PL 移除 membership 並重派同一 slot
- **THEN** 舊草稿私下保留為 `abandoned`，繼任者從空白紀錄開始（AC-3.47）

### Requirement: FR-005l 停用成員與草稿隔離

- **FR-005l**：停用 `task_role = annotator` 的成員時：(1) 其已提交之標記（試標與正式皆然）必須全數保留，繼續計入歷史統計與 IAA，既有 review unit 不受影響；(2) 其尚未提交的已指派標記作業（含草稿）必須改為未指派狀態退回未指派池，等待 `project_leader` 依 FR-005g 重新指派或依 FR-005h 排除（比照 FR-005j 對審核員 `pending` 退回的規則）；(3) 停用期間該成員不得成為新指派對象，亦不得提交任何標記；(4) 重新啟用僅恢復可被指派資格，不自動取回先前退回的作業。停用操作本身不受 FR-010t 阻擋，但若停用後 active 標記員人數 `< min_annotators`，二次確認 modal 必須加註後續發布將被 FR-010t 阻擋的警告。 **V1 草稿隔離**：第 (2) 點退回時，舊未提交草稿同交易轉 `abandoned`；重派者看不到前任答案，原成員重新啟用不自動恢復舊草稿或 slot 寫權。（來源：`specs/task-management/014-task-detail/spec.md` 的 FR-005g／FR-005h。）

#### Scenario: 重新啟用不還原舊草稿

- **GIVEN** 原標記員有未提交草稿及已提交紀錄
- **WHEN** PL 停用、重派，稍後重新啟用
- **THEN** 舊草稿保持 `abandoned`，已提交紀錄保留，原成員不自動取回 slot（AC-3.47）

## ADDED Requirements

### Requirement: AC-3.47 未提交草稿重派隔離

同一穩定 assignment ID 的受派者異動不改寫前任草稿或責任鏈。

#### Scenario: AC-3.47 未提交草稿重派隔離

- **GIVEN** 一個已儲存未提交草稿的 assignment
- **WHEN** membership 停用、移除或 PL 明確重派
- **THEN** 前任草稿標記 `abandoned` 且受限保存；繼任者無法讀取，原受派者失去寫權，已提交紀錄保持不變
