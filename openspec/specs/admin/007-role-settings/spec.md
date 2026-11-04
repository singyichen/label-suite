# admin/007-role-settings Specification

## Purpose
TBD - created by archiving change shared-audit-events. Update Purpose after archive.

## Requirements

### Requirement: FR-010 矩陣儲存共用稽核

- **FR-010**：角色權限矩陣儲存且實際有變更後，系統必須與矩陣及版本更新同交易寫入 ADR-032 共用 `audit_events` 的 `role_permissions.changed` 事件（`target_type=role_permission_matrix`、穩定 `target_id=1`），保存操作者、時間、版本前後值及伺服器依已儲存列計算的變更前後格子 diff；不得直接信任前端提交的 diff，審計紀錄至少保留 1 個曆年。無變更也須先檢查預期版本；版本列不存在則拒絕，無變更不遞增版本或產生事件。

#### Scenario: SC-010 有變更才產生事件

- **GIVEN** 角色權限矩陣的版本與已儲存格子
- **WHEN** 授權超管儲存實際變更
- **THEN** 矩陣、版本與 `role_permissions.changed` 同交易提交，事件 diff 由伺服器已儲存資料計算（SC-010）

#### Scenario: FR-010 主要驗收

- **GIVEN** 正式服務端收到本需求作用域內的請求
- **WHEN** 使用者執行本需求描述的操作
- **THEN** 實際變更同交易更新格、版本及伺服器計算的稽核事件（FR-010）

### Requirement: SC-010 操作紀錄與保存

**SC-010**：每次有實際格子變更的儲存均可在共用稽核事件查得操作者、時間、版本與由伺服器計算的 diff；失敗或無變更的儲存不產生該事件。至少 1 個曆年內的紀錄可供追蹤；`/role-settings` 頁面的「操作紀錄」抽屜可正確列出歷史紀錄，每筆包含時間、操作者、diff。

#### Scenario: 無變更與失敗儲存

- **GIVEN** 矩陣儲存沒有實際格子變更，或交易失敗
- **WHEN** 檢視共用稽核事件與操作紀錄抽屜
- **THEN** 不出現虛假的成功變更事件，既有紀錄至少保留 1 個曆年（SC-010）

### Requirement: AC-3.4 缺列與硬邊界拒絕

4. **AC-3.4**：**Given** 一個 `user` 直接呼叫 admin API，或任一當前角色所需的已啟用權限格缺列，**When** 服務端判斷授權，**Then** 前者無法越過 Super Admin 硬邊界、後者一律拒絕；不得因 JWT 舊 role、前端按鈕或錯層格而放行。

#### Scenario: AC-3.4 缺列與硬邊界

- **GIVEN** 一般使用者直接呼叫 admin API，或當前角色所需矩陣格缺列
- **WHEN** 服務端判斷授權
- **THEN** 請求遭拒，JWT 舊 role、前端按鈕及錯層格均不能放行（AC-3.4）

### Requirement: FR-002 授權契約

- **FR-002**：只有當前 active `super_admin` 且對應 `admin.role_settings.view`／`admin.role_settings.manage` 格允許時，才可分別存取與編輯 `/role-settings`；矩陣不可授權 `user` 繞過 system role 硬邊界。

#### Scenario: FR-002 主要驗收

- **GIVEN** 正式服務端收到本需求作用域內的請求
- **WHEN** 使用者執行本需求描述的操作
- **THEN** 讀取與編輯各自要求當前超管及對應 admin 格（FR-002）

### Requirement: FR-005b 授權契約

- **FR-005b**：每次儲存（含無變更）必須使用 `version` 或 `etag` 樂觀鎖驗證；版本不一致或單列版本資料不存在時必須拒絕並提示衝突，不可覆蓋其他人的變更。

#### Scenario: FR-005b 主要驗收

- **GIVEN** 正式服務端收到本需求作用域內的請求
- **WHEN** 使用者執行本需求描述的操作
- **THEN** 版本衝突或缺失版本列拒絕，無變更也檢查版本（FR-005b）

### Requirement: FR-008 授權契約

- **FR-008**：系統必須在服務端依 ADR-037 驗證當前角色／membership、已啟用的對應矩陣格與各操作的資源條件；前端能力提示不得代替服務端授權。

#### Scenario: FR-008 主要驗收

- **GIVEN** 正式服務端收到本需求作用域內的請求
- **WHEN** 使用者執行本需求描述的操作
- **THEN** 服務端逐次檢查當前角色或 membership、格與資源條件（FR-008）

### Requirement: FR-008a 授權契約

- **FR-008a**：系統必須保護 `super_admin` 的所有 `admin.*` 權限，這些格不可被配置為關閉；`user` 的 `admin.*` 格固定關閉，兩種 system role 的 `dashboard.view` 格固定啟用。⛔ 錯層格不儲存。

#### Scenario: FR-008a 主要驗收

- **GIVEN** 正式服務端收到本需求作用域內的請求
- **WHEN** 使用者執行本需求描述的操作
- **THEN** 固定 admin／dashboard 格不能變更，錯層格不儲存（FR-008a）

### Requirement: FR-011 授權契約

- **FR-011**：矩陣儲存必須拒絕非白名單鍵、錯層、多列、缺列及違反固定格的內容；每個已啟用鍵須有全部適用角色列，⛔ 錯層格不儲存。新增鍵遵守授權判斷規則的預設拒絕與固定格啟用程序。

**v1.3.0 修訂（issue #1270，五個新鍵登錄待啟用、名冊改歸）**：白名單新增五個鍵，矩陣 MUST 儲存 **56 列**適用格（10 個平台鍵 × 2 個 system role、12 個任務鍵 × 3 個 task role）：

1. `task.lifecycle.manage`（任務層）：發布、退回 draft、結案、重試 IAA、停用資料隔離。種子 PL ✅／RV ❌／AN ❌，可配置。
2. `task.delete`（任務層）：刪除 draft 任務。種子 PL ✅／RV ❌／AN ❌，可配置。Super Admin 刪除走 `task-management/010-task-list` FR-010e 的平台層窄規則，不經由任務層格取得。
3. `annotation.exception.resolve`（任務層）：最終例外池四種處置（`annotation/015-annotation-workspace` FR-095）。種子 PL ✅／RV ❌／AN ❌，可配置。
4. `annotation.dispute.adjudicate`（任務層）：`arbiter_ids` 為空時的負責人裁定（`task-management/014-task-detail` FR-023）。種子 PL ✅／RV ❌／AN ❌，可配置。
5. `admin.platform_overview.view`（平台層）：全平台統計（`dashboard/012-dashboard` FR-008）。依新 `admin.*` 鍵程序原子建立固定格：`super_admin` ✅、`user` ❌。

上列五個鍵的狀態為「**已登錄、待啟用**」：本版完成層級、操作對應與完整種子三項審查；安全測試要等正式後端實作並有 runtime 證據後，由另一個經審查的 change 確認。在那之前，任何以這五個鍵做的授權判斷 MUST 依未知鍵拒絕，不論格值為何；對應操作 MUST 維持既有的角色與資源閘門，MUST NOT 改為只憑矩陣格放行。矩陣儲存仍 MUST 收下這五個鍵的全部適用列，缺列、錯層或違反固定格一樣整份拒絕。

審核名冊（`reviewer_ids`／`arbiter_ids`）的寫入改歸 `task.members.manage`，不再用 `task.detail.edit`；資料集重綁仍用 `task.detail.edit`。`task.members.manage` 是現役鍵，改歸直接生效。上文原文逐字保留。

#### Scenario: FR-011 主要驗收

- **GIVEN** 正式服務端收到本需求作用域內的請求
- **WHEN** 使用者執行本需求描述的操作
- **THEN** 非白名單、錯層、重複、缺失或固定格違例的提交均拒絕（FR-011）

#### Scenario: 待啟用鍵的授權判斷一律拒絕

- **GIVEN** 五個新鍵處於「已登錄、待啟用」，矩陣中 `project_leader × task.lifecycle.manage`、`task.delete`、`annotation.exception.resolve`、`annotation.dispute.adjudicate` 皆為 ✅，`super_admin × admin.platform_overview.view` 為 ✅
- **WHEN** 任一授權判斷以這五個鍵之一作為必要條件
- **THEN** 判斷依未知鍵拒絕，格值不使其放行
- **AND** 對應操作仍只依既有的角色與資源閘門判斷，不因矩陣格而放寬或收緊

#### Scenario: 非專案負責人與失效 membership 不得取得新任務層鍵

- **GIVEN** 某任務有 active `reviewer` W、active `annotator` A，以及 membership 已停用或仍為邀請中的 `project_leader` P
- **WHEN** W、A、P 各自以 `task.lifecycle.manage`、`task.delete`、`annotation.exception.resolve` 或 `annotation.dispute.adjudicate` 為依據提出請求
- **THEN** 三人的請求全部拒絕：W 與 A 因種子格為 ❌，P 因 membership 不是 active
- **AND** 即使日後這些鍵啟用，W 與 A 的拒絕結果也不變，除非 Super Admin 明確改格

#### Scenario: 新任務層鍵仍受狀態與資源條件約束

- **GIVEN** 某任務的 active `project_leader` P，且日後四個新任務層鍵已經啟用
- **WHEN** P 刪除非 draft 任務、在不允許的狀態執行生命週期命令、在 `arbiter_ids` 非空時以負責人身分裁定，或處置一筆不在待處置狀態的例外池項目
- **THEN** 四種請求都依各自的狀態或資源條件拒絕，格為 ✅ 不足以放行

#### Scenario: Super Admin 路徑與平台總覽固定格

- **GIVEN** `super_admin` S 在某任務沒有任何 membership，以及一般使用者 U
- **WHEN** S 檢視全平台統計或刪除 draft 任務，S 嘗試以任務層新鍵處置該任務的例外池，U 檢視全平台統計，並有人提交 `user × admin.platform_overview.view = true` 或 `super_admin × admin.platform_overview.view = false` 的矩陣
- **THEN** S 檢視全平台統計依 `super_admin` 硬邊界與固定格判斷，S 刪除 draft 任務依平台層窄規則判斷，兩者都不經由任務層格
- **AND** S 沒有 membership 時，任務層新鍵不授予任何權限
- **AND** U 被拒，違反固定格的矩陣整份拒絕

#### Scenario: 審核名冊寫入改用成員管理鍵

- **GIVEN** 某任務的 active `project_leader` 其 `task.detail.edit` 為 ✅、`task.members.manage` 被 Super Admin 改為 ❌
- **WHEN** 其儲存 `reviewer_ids` 或 `arbiter_ids`，以及重綁資料集
- **THEN** 名冊寫入拒絕，資料集重綁依 `task.detail.edit` 與既有狀態規則判斷

### Requirement: SC-007 授權契約

- **SC-007**：多人同時編輯時，版本衝突儲存（含無變更提交）會被拒絕並提示重新載入，不發生靜默覆蓋；真正無變更且版本相同時不遞增版本、不寫稽核事件。

#### Scenario: SC-007 主要驗收

- **GIVEN** 正式服務端收到本需求作用域內的請求
- **WHEN** 使用者執行本需求描述的操作
- **THEN** 衝突提交均拒絕；有效無變更不遞增或產生事件（SC-007）

### Requirement: SC-011 授權契約

- **SC-011**：V1 只儲存 42 列適用 boolean 格；reviewer 可以檢視任務詳情但不能取得編輯權。未知鍵、缺列、錯層與失效 membership 均拒絕；固定 admin／dashboard 格不能被改變，一般使用者即使提交 admin 格也不能進入管理頁。

**v1.3.0 修訂（issue #1270）**：適用格數改為 **56 列**（10 個平台鍵 × 2、12 個任務鍵 × 3），固定格增加 `admin.platform_overview.view` 的兩格。五個「已登錄、待啟用」的鍵在啟用前，授權判斷結果與未知鍵相同。上文原文逐字保留。

#### Scenario: SC-011 主要驗收

- **GIVEN** 正式服務端收到本需求作用域內的請求
- **WHEN** 使用者執行本需求描述的操作
- **THEN** 只儲存 56 列適用格，reviewer 可讀不能編輯，未知、待啟用或缺漏拒絕（SC-011）
