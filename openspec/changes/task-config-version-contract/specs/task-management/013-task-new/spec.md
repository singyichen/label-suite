> 正典：`specs/task-management/013-task-new/spec.md` v8.3.0；以下 FR 與關鍵實體條文鏡射該版本。AC-4.3～AC-4.6 保留正典 ID；既有 SC-006 由已封存的 permission-matrix change 建立，本次依正典修訂。

## ADDED Requirements

### Requirement: FR-006 任務建立與不可變 TaskConfig 版本

- **FR-006**：提交成功後，系統必須建立任務並導向 `/task-detail`。第一次通過 registry 驗證的完整 TaskConfig 必須保存為同任務不可變版本，`version_no = schema_version_no = 1`；完整 config 與內嵌 label-schema snapshot 共用該列。後續依 `014-task-detail` FR-014 在 draft 成功儲存完整 config 時，每次建立新列並同步遞增兩個版本號，不覆寫歷史列；即使僅修改非 schema 設定亦遞增，`schema_digest` 可重複。schema digest 對釘住的 `schema_registry_version` 下 canonicalized outputs／field roles 計算，該 registry version 的驗證定義必須保留供歷史版本解析。

#### Scenario: AC-4.5 draft 儲存建立新版本並保留歷史

- **Given** 已建立 config/schema v1
- **When** 依 014 FR-014 在 draft 成功儲存修改後的完整 config
- **Then** 建立新不可變列且兩個版本號同步遞增；僅修改非 schema 設定時，正規化 outputs／field roles 與 registry version 相同可得到相同 digest，v1 內容及其 registry 定義仍可解析；驗證失敗不建立新版本（AC-4.5）

### Requirement: FR-006a 建立交易與 creator membership

- **FR-006a**：任務建立成功時，系統必須自動建立一筆 `task_membership`，並將建立者設為 `project_leader`。task、creator membership、初始 TaskConfig、初始 TaskGuidelineConfig 內容版本及 FR-006c 啟動設定必須在同一交易提交；任一步失敗全部回滾。

#### Scenario: AC-4.3 任務建立為單一交易

- **Given** 四步設定通過驗證（Step 4 可留空）
- **When** 成功建立任務
- **Then** 同一交易建立 task、建立者的 `project_leader` membership、不可變 TaskConfig（`version_no = schema_version_no = 1`，含 `schema_digest` 與釘住且保留的 `schema_registry_version`）、初始指引版本及啟動設定；任一步失敗時全部回滾，不留下部分任務（AC-4.3）

### Requirement: FR-006d 建立請求冪等性

- **FR-006d**：建立任務 API 必須支援 `Idempotency-Key`，其比對範圍為已驗證的建立者與 `task.create` 操作；每次重送仍須依 FR-001a 檢查當下權限。同一範圍內，同一 key 在 `IDEMPOTENCY_WINDOW_HOURS` 內搭配相同的經驗證與正規化請求內容重送，才回傳原 `task_id`，不重複建立 membership、config 或指引版本；同 key 搭配不同內容須回報衝突，不建立任務，亦不得將原 `task_id` 當作此次請求的成功結果。

#### Scenario: AC-4.4 同一建立請求不重複建立關聯版本

- **Given** 任務建立成功，且建立者仍有 `task.create` 權限
- **When** 同一已驗證建立者對 `task.create` 以同一 `Idempotency-Key`、相同的經驗證與正規化請求內容在 `IDEMPOTENCY_WINDOW_HOURS` 內重送
- **Then** 回傳原 `task_id`，不重複建立 membership、config 或指引版本，成功仍依既有流程導向 task-detail（AC-4.4）

#### Scenario: AC-4.6 同 key 異內容回報衝突

- **Given** 同一已驗證建立者已用 `Idempotency-Key` 成功建立任務，且仍有 `task.create` 權限
- **When** 在 `IDEMPOTENCY_WINDOW_HOURS` 內以相同 key 重送不同的經驗證與正規化請求內容
- **Then** 回報衝突，不建立新任務，也不把原 `task_id` 當作此次請求的成功結果（AC-4.6）

### Requirement: TaskConfig 不可變版本實體

- **TaskConfig**：提交時的完整設定，含 `input_type` + `outputs[]` 與 `field_role_map`（供 annotation/dataset 模組使用）。持久化為同任務不可變 `task_config_version`，含 `config_version_id`、`task_id`、正整數 `version_no`／`schema_version_no`、`schema_digest` 與釘住且保留驗證定義的 `schema_registry_version`；完整 config 與內嵌 label-schema snapshot 共用該列。首次兩個版本號皆為 1，每次後續完整 config 成功儲存同步遞增，約束 `schema_version_no = version_no` 與 `(task_id, version_no)` 唯一。digest 對指定 registry 下 canonicalized outputs／field roles 計算，可跨版本重複；014 的 cycle 參照精確同任務版本。

#### Scenario: TaskConfig 版本可被精確追溯

- **Given** 同一任務已建立初始 TaskConfig 並在 draft 成功儲存下一版完整設定
- **When** 依 `config_version_id` 讀取其中一版
- **Then** 該版的完整 config、schema snapshot、相等的版本號及釘住的 registry 定義可定位，且不以相同 digest 合併兩個版本（TaskConfig；AC-4.5）

### Requirement: TaskGuidelineConfig 初始內容版本

- **TaskGuidelineConfig**：任務說明設定。四個內容欄位為 `annotator_guideline_text`、`annotator_guideline_assets[]`、`reviewer_guideline_text`、`reviewer_guideline_assets[]`，形成同任務不可變內容版本，含 `guideline_version_id`、`task_id` 與正整數 `guideline_version`（建立時初始化為 1，`(task_id, guideline_version)` 唯一）；Step 4 留空亦建立初始版本。`force_guideline` 為 task 顯示政策，不屬內容版本；後續遞增規則與 run／round 消費關係見 `014-task-detail` FR-017a。

#### Scenario: Step 4 留空仍建立初始指引版本

- **Given** Step 4 留空且其餘建立設定通過驗證
- **When** 任務建立交易成功
- **Then** 建立同任務不可變的指引內容版本 1，`force_guideline` 留在 task 顯示政策中（TaskGuidelineConfig；AC-4.3）

## MODIFIED Requirements

### Requirement: SC-006 授權契約

- **SC-006**：非 `TASK_CREATOR_SYSTEM_ROLES` 或 `task.create` 格不允許者不可建立任務；角色／矩陣格變更後下一次請求即套用新權限，含冪等重送。同一已驗證建立者對 `task.create` 於 `IDEMPOTENCY_WINDOW_HOURS` 內以同一 `Idempotency-Key` 重送相同的經驗證與正規化請求內容，僅取得原 `task_id`，不重複建立任務；同 key 異內容回報衝突，不建立新任務或將舊 `task_id` 作為成功結果。

#### Scenario: SC-006 主要驗收

- **GIVEN** 正式服務端收到本需求作用域內的請求
- **WHEN** 使用者執行本需求描述的操作
- **THEN** 不合格角色或格遭拒，同一冪等鍵時窗內不重複建立（SC-006）
