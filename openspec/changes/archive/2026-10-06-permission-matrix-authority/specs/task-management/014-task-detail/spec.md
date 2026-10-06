> 正典：`specs/task-management/014-task-detail/spec.md`；以下 FR／SC 條文逐字鏡射正典，情境說明其主要驗收路徑。
> 本正典 `specs/task-management/014-task-detail/spec.md` 的 FR-005j 定義 pending 審核分派池。

## ADDED Requirements

### Requirement: FR-002 授權契約

- **FR-002**：僅持有目標任務 active `project_leader` 或 `reviewer` membership、且其 active task role 的 `task.detail.view` 格允許者可進入 `/task-detail`；同一人在同一任務有多個 active role 時，非 workspace 詳情頁可用允許權限聯集，但仍須通過 task_id、任務狀態與各項資源條件（ADR-037）。

#### Scenario: FR-002 主要驗收

- **GIVEN** 正式服務端收到本需求作用域內的請求
- **WHEN** 使用者執行本需求描述的操作
- **THEN** 目標任務 active leader 或 reviewer 的 view 格允許才進入詳情（FR-002）

### Requirement: FR-005 授權契約

- **FR-005**：持有目標任務 active `project_leader` membership 且 `task.members.manage` 格允許者，必須可於 `member-management` 執行成員新增、移除/停用；新加入時可指派角色。此格不免除對目標成員、任務狀態與未完成作業的檢查。

#### Scenario: FR-005 主要驗收

- **GIVEN** 正式服務端收到本需求作用域內的請求
- **WHEN** 使用者執行本需求描述的操作
- **THEN** active leader 與 members.manage 格同時允許才管理所選角色（FR-005）

### Requirement: FR-005d 授權契約

- **FR-005d**：搜尋結果僅排除已持有當前任務中「本次選定 task role」membership 的人；同一人仍可被加入另一個 task role，加入後才從該角色的候選結果消失。membership 的邏輯唯一鍵為 `(task_id,user_id,task_role)`，停用／移除只作用於所選角色列，不得連帶改變此人的其他任務角色。

#### Scenario: FR-005d 主要驗收

- **GIVEN** 正式服務端收到本需求作用域內的請求
- **WHEN** 使用者執行本需求描述的操作
- **THEN** 候選人只因已持有選定 task role 排除；其他角色不受影響（FR-005d）

### Requirement: FR-005e 授權契約

- **FR-005e**：Email 邀請必須驗證 email 格式並阻擋同一任務、同一 email 與本次選定 task role 的重複邀請；既有其他 task role 不構成重複。寄送成功後該角色 membership 需以 `invited` 狀態出現在目前成員清單，不得覆寫另一角色的狀態。

#### Scenario: FR-005e 主要驗收

- **GIVEN** 正式服務端收到本需求作用域內的請求
- **WHEN** 使用者執行本需求描述的操作
- **THEN** 同任務同 email 同角色邀請被拒，其他角色仍可邀請（FR-005e）

### Requirement: FR-005f 授權契約

- **FR-005f**：移除仍有未完成作業的**選定角色 membership** 時，系統必須顯示二次確認；確認後保留該角色已完成提交與歷史統計。移除 annotator membership 時只把該角色未完成標記作業改為未指派，等待 `project_leader` 手動重新指派或處理；移除 reviewer membership 的 pending 審核依 FR-005j 退回分派池。此人其他仍有效的 task role、提交與指派不得被連帶停用或清空。

#### Scenario: FR-005f 主要驗收

- **GIVEN** 正式服務端收到本需求作用域內的請求
- **WHEN** 使用者執行本需求描述的操作
- **THEN** 移除只作用於選定角色；annotator 與 reviewer 的 pending 處置各循原有規則（FR-005f）

### Requirement: FR-006 授權契約

- **FR-006**：只有 `reviewer` membership、沒有通過 `task.members.manage` 的 active `project_leader` membership 者，不可見 `member-management` tab；若以直連方式進入，系統必須導回 `overview` 並提示無權限。同時有兩種角色者只能經由實際有效的 leader membership 與矩陣格取得管理能力，不能由 reviewer role 本身推導。

#### Scenario: FR-006 主要驗收

- **GIVEN** 正式服務端收到本需求作用域內的請求
- **WHEN** 使用者執行本需求描述的操作
- **THEN** 單獨 reviewer 不能管理成員；多角色者須有效 leader 與格（FR-006）

### Requirement: FR-024 授權契約

- **FR-024**（issue #1160 D-9～D-11）：正式服務端須依 ADR-037 以當前 active membership 與已啟用矩陣格判斷：詳情讀取用 `task.detail.view`，Overview 的 `OVERVIEW_EDITABLE_FIELDS` 儲存用 `task.detail.edit`，成員操作用 `task.members.manage`，資料匯出用 `dataset.export`，並保留各自任務狀態、資料範圍、blind review 與答案隔離限制。reviewer 有 view 而無 edit；一人多角色時非 workspace 可用 active 角色權限聯集，狀態與移除只作用於選定 membership。發布、結案、仲裁與其他生命週期命令尚無完整 V1 專用鍵，不得借用上述鍵或只憑矩陣放行，須在 runtime 轉換前另行核准操作鍵、種子資料與安全測試。Prototype 的 URL `task_role` 僅保留檢視上下文，不可當作正式授權身分。

#### Scenario: FR-024 主要驗收

- **GIVEN** 正式服務端收到本需求作用域內的請求
- **WHEN** 使用者執行本需求描述的操作
- **THEN** 詳情檢視、儲存、成員管理與匯出各用專屬鍵，其他命令不得借鍵（FR-024）

### Requirement: SC-052 授權契約

- **SC-052**：同一人在同一任務可同時有 reviewer 與 project_leader membership，但不得有重複 `(task_id,user_id,task_role)`；成員搜尋與 Email 邀請只對同角色判重，移除其中一個角色不影響另一個。reviewer 單獨可讀詳情、不能編輯或管理成員；其矩陣格或 membership 失效後下一請求立即拒絕，且無法以 URL 角色參數升權。

#### Scenario: SC-052 主要驗收

- **GIVEN** 正式服務端收到本需求作用域內的請求
- **WHEN** 使用者執行本需求描述的操作
- **THEN** 三元組不重複；同角色判重，移除互不影響，URL 不能升權（SC-052）
