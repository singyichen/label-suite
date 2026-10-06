# task-management/010-task-list Specification

## Purpose
TBD - created by archiving change permission-matrix-authority. Update Purpose after archive.

## Requirements

### Requirement: FR-002 授權契約

- **FR-002**：當前 `user` 只有在 system 層 `task.list.view` 格允許時可進入 `/task-list`，且只可看見自己有 active `task_membership` 的任務；矩陣格不得擴大到其他人的任務。`super_admin` 也須通過當前 `task.list.view` 格，才可使用 FR-003 的全平台視角（ADR-037）。

#### Scenario: FR-002 主要驗收

- **GIVEN** 正式服務端收到本需求作用域內的請求
- **WHEN** 使用者執行本需求描述的操作
- **THEN** list 格允許才可讀列表，user 只見自己有 active membership 的任務（FR-002）

### Requirement: FR-010e 授權契約

- **FR-010e**：刪除任務僅允許該任務 active `project_leader` 或當前 `super_admin`，且仍受 draft 狀態與原有資源限制；其他角色不得看到可用刪除操作，且直接觸發刪除時必須被拒絕並顯示無權限提示。V1 矩陣尚無 `task.delete` 專用鍵，實作不得借用 `task.detail.edit` 或 `task.members.manage`，亦不得宣稱 42 列 V1 種子已覆蓋刪除；轉換此命令的矩陣授權前需依 ADR-037 核准增鍵、完整種子與安全測試。

#### Scenario: FR-010e 主要驗收

- **GIVEN** 正式服務端收到本需求作用域內的請求
- **WHEN** 使用者執行本需求描述的操作
- **THEN** 刪除保留角色與 draft 限制，不能借用其他 V1 鍵（FR-010e）

### Requirement: SC-016 授權契約

- **SC-016**：`task.list.view` 缺列或被關閉時不得取得列表；一般 `user` 的列表不含非自己 active membership 的任務，`super_admin` 的全平台視角仍需通過對應格；任務刪除維持 FR-010e 硬邊界，不能被其他 V1 鍵間接授權。

#### Scenario: SC-016 主要驗收

- **GIVEN** 正式服務端收到本需求作用域內的請求
- **WHEN** 使用者執行本需求描述的操作
- **THEN** 格缺失或關閉即拒絕，列表及刪除皆不能間接擴權（SC-016）
