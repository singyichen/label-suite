## MODIFIED Requirements

### Requirement: FR-104 授權契約

- **FR-104**（issue #1160 D-9／D-11）：正式後端的標記／審核 workspace 必須依 ADR-037 以當前帳號、目標任務 active membership、使用者明確選定的 active task role、對應 `annotation.workspace.annotate`／`annotation.workspace.review` 格、實際 assignment／reviewer roster 及盲審與答案隔離條件逐次授權；多角色使用者的其他 task role 不得以聯集提升本次寫入權限。路由中的 `role`、`annotator_id`、`reviewer_id` 僅作檢視／定址上下文，不得作為正式後端的操作者身分或指派證據；正式身分由受驗證帳號與任務資料決定。FR-049 的 prototype 路由預設身分與示範 bucket 行為仍只屬 prototype，不得直接移植為後端授權來源；被拒絕的呼叫不得讀出測試集答案或其他審核員未提交內容。

**v12.3.0 修訂（issue #1269，仲裁寫入的鍵與名冊）**：仲裁寫入（FR-061 仲裁版面、FR-065 仲裁票）MUST 沿用 `annotation.workspace.review`，不得另立仲裁專用權限鍵。授權條件為以下各項同時成立：

1. active task role 為 `reviewer`，且有該任務當前 active reviewer membership；
2. `reviewer × annotation.workspace.review` 格為 `allowed=true`；
3. 資源條件：該審核員在該任務的 `arbiter_ids` 中（FR-060 第 1 點），且於該審核單位沒有自己的審核提交（FR-060 第 2 點）。

`arbiter_ids` MUST 是 `reviewer_ids` 的子集合，不是新的 task role，其成員資格依 `task-management/014-task-detail` 的 `ARBITER_CANDIDATE_RULE`。只通過第 1、2 項而不在 `arbiter_ids` 中的審核員，MUST NOT 寫入仲裁票。`arbiter_ids` 成員一旦失去 active reviewer membership，下一次仲裁請求即 MUST 拒絕，即使仍留在名冊中也一樣。上文原文逐字保留。

#### Scenario: FR-104 主要驗收

- **GIVEN** 正式服務端收到本需求作用域內的請求
- **WHEN** 使用者執行本需求描述的操作
- **THEN** 寫入只用明選 active role、其 membership、格與真實指派，不洩漏答案（FR-104）

#### Scenario: 仲裁沿用審核鍵並受名冊條件約束
- **GIVEN** 某任務 `reviewer_ids = [W, L, C]`、`arbiter_ids = [C]`，`reviewer × annotation.workspace.review` 格允許，且某爭議單位 U 的當事審核員不含 C 與 L
- **WHEN** C 與 L 各自以 active role `reviewer` 對 U 提交仲裁票
- **THEN** C 的仲裁票 MUST 通過；L 的仲裁票 MUST 被拒絕，因為 L 不在 `arbiter_ids` 中
- **AND** C 的 reviewer membership 停用後，即使 `arbiter_ids` 仍含 C，C 下一次的仲裁請求 MUST 被拒絕
- **AND** 系統 MUST NOT 依任何仲裁專用權限鍵判斷；未登錄的仲裁鍵不得出現在授權路徑中
