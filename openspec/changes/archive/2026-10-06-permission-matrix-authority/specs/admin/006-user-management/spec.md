> 正典：`specs/admin/006-user-management/spec.md`；以下 FR／SC 條文逐字鏡射正典，情境說明其主要驗收路徑。

## ADDED Requirements

### Requirement: FR-002 授權契約

- **FR-002**：只有當前 active `super_admin` 且 `admin.user_management.view` 已啟用並允許時可以存取 `/user-management`；新增、編輯、停用、啟用與 system role 變更另需 `admin.user_management.manage`，每個命令仍須通過本規格的 seeder／最後超管等資源限制。矩陣格不可授權 `user` 越過 system role 硬邊界（ADR-037）。

#### Scenario: FR-002 主要驗收

- **GIVEN** 正式服務端收到本需求作用域內的請求
- **WHEN** 使用者執行本需求描述的操作
- **THEN** 當前超管與相應格允許才可讀寫帳號，原有資源限制仍生效（FR-002）

### Requirement: SC-015 授權契約

- **SC-015**：當前 `super_admin` 通過對應矩陣格後才可讀取或修改帳號；一般 `user` 即使偽造 admin 格請求也被拒絕。矩陣變更後的下一個請求立即依新格判斷，而 seeder 與最後超管保護仍生效。

#### Scenario: SC-015 主要驗收

- **GIVEN** 正式服務端收到本需求作用域內的請求
- **WHEN** 使用者執行本需求描述的操作
- **THEN** user、被撤銷格與受 seeder／最後超管保護的異動均拒絕（SC-015）

## MODIFIED Requirements

### Requirement: FR-013 帳號異動共用稽核

- **FR-013**：新增、編輯、停用、啟用與 system role 變更皆必須以 ADR-032 的共用 `audit_events` 保留審計紀錄（操作者、目標使用者、時間、操作類型、變更前後的非敏感 diff），與帳號異動同交易寫入。紀錄的 `target_type='user'`、`target_id` 為目標使用者 ID；`member.updated` 表示一般欄位編輯。異動紀錄 drawer 只讀所選使用者的事件，且仍須通過當前 `super_admin` 與 `admin.user_management.view` 守門；摘要不得包含密碼、token 或原始請求內容。

#### Scenario: SC-012 異動紀錄限所選使用者

- **GIVEN** 兩位使用者都有帳號異動事件
- **WHEN** 授權超管打開其中一位的異動紀錄 drawer
- **THEN** 只顯示該目標的非敏感事件；其他使用者事件不混入，帳號寫入與稽核寫入同成同敗（SC-012）

#### Scenario: FR-013 主要驗收

- **GIVEN** 正式服務端收到本需求作用域內的請求
- **WHEN** 使用者執行本需求描述的操作
- **THEN** 目標歷程須通過當前超管及 view 格守門，且只含非敏感事件（FR-013）
