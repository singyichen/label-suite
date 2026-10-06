> 正典：`specs/task-management/013-task-new/spec.md`；以下 FR／SC 條文逐字鏡射正典，情境說明其主要驗收路徑。

## ADDED Requirements

### Requirement: FR-001a 授權契約

- **FR-001a**：僅當前角色屬 `TASK_CREATOR_SYSTEM_ROLES` 且已啟用的 system 層 `task.create` 矩陣格允許者可進入 `/task-new` 與呼叫建立任務 API；服務端依 ADR-037 重新檢查，不信任 JWT role 或前端按鈕。建立後仍須原子建立 creator 的 `project_leader` membership。

#### Scenario: FR-001a 主要驗收

- **GIVEN** 正式服務端收到本需求作用域內的請求
- **WHEN** 使用者執行本需求描述的操作
- **THEN** 當前角色與已啟用 create 格均允許才建立任務及 creator membership（FR-001a）

### Requirement: SC-006 授權契約

- **SC-006**：非 `TASK_CREATOR_SYSTEM_ROLES` 或 `task.create` 格不允許者不可建立任務；角色／矩陣格變更後下一次請求即套用新權限。同一 `Idempotency-Key` 於 `IDEMPOTENCY_WINDOW_HOURS` 內重送不會重複建立任務。

#### Scenario: SC-006 主要驗收

- **GIVEN** 正式服務端收到本需求作用域內的請求
- **WHEN** 使用者執行本需求描述的操作
- **THEN** 不合格角色或格遭拒，同一冪等鍵時窗內不重複建立（SC-006）

