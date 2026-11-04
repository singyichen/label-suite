## MODIFIED Requirements

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

### Requirement: SC-011 授權契約

- **SC-011**：V1 只儲存 42 列適用 boolean 格；reviewer 可以檢視任務詳情但不能取得編輯權。未知鍵、缺列、錯層與失效 membership 均拒絕；固定 admin／dashboard 格不能被改變，一般使用者即使提交 admin 格也不能進入管理頁。

**v1.3.0 修訂（issue #1270）**：適用格數改為 **56 列**（10 個平台鍵 × 2、12 個任務鍵 × 3），固定格增加 `admin.platform_overview.view` 的兩格。五個「已登錄、待啟用」的鍵在啟用前，授權判斷結果與未知鍵相同。上文原文逐字保留。

#### Scenario: SC-011 主要驗收

- **GIVEN** 正式服務端收到本需求作用域內的請求
- **WHEN** 使用者執行本需求描述的操作
- **THEN** 只儲存 56 列適用格，reviewer 可讀不能編輯，未知、待啟用或缺漏拒絕（SC-011）
