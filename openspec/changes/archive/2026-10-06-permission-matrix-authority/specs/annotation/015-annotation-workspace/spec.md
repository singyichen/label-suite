> 正典：`specs/annotation/015-annotation-workspace/spec.md`；以下 FR／SC 條文逐字鏡射正典，情境說明其主要驗收路徑。
> 本正典 `specs/annotation/015-annotation-workspace/spec.md` 的 FR-049 說明 prototype 路由身分維度。

## ADDED Requirements

### Requirement: FR-104 授權契約

- **FR-104**（issue #1160 D-9／D-11）：正式後端的標記／審核 workspace 必須依 ADR-037 以當前帳號、目標任務 active membership、使用者明確選定的 active task role、對應 `annotation.workspace.annotate`／`annotation.workspace.review` 格、實際 assignment／reviewer roster 及盲審與答案隔離條件逐次授權；多角色使用者的其他 task role 不得以聯集提升本次寫入權限。路由中的 `role`、`annotator_id`、`reviewer_id` 僅作檢視／定址上下文，不得作為正式後端的操作者身分或指派證據；正式身分由受驗證帳號與任務資料決定。FR-049 的 prototype 路由預設身分與示範 bucket 行為仍只屬 prototype，不得直接移植為後端授權來源；被拒絕的呼叫不得讀出測試集答案或其他審核員未提交內容。

#### Scenario: FR-104 主要驗收

- **GIVEN** 正式服務端收到本需求作用域內的請求
- **WHEN** 使用者執行本需求描述的操作
- **THEN** 寫入只用明選 active role、其 membership、格與真實指派，不洩漏答案（FR-104）

### Requirement: SC-013 授權契約

- **SC-013**：正式後端在 active role 為 reviewer 時不能提交 annotator 動作，反之亦然；停用 membership、撤銷矩陣格、跨任務或偽造 URL 身分的下一次請求都被拒絕，且回應不含隱藏答案或其他審核員未提交內容。prototype 的路由示範資料不作為正式授權證據。

#### Scenario: SC-013 主要驗收

- **GIVEN** 正式服務端收到本需求作用域內的請求
- **WHEN** 使用者執行本需求描述的操作
- **THEN** 相反角色寫入、失效 membership、撤銷格、跨任務或偽造 URL 均拒絕（SC-013）
