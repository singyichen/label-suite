## MODIFIED Requirements

### Requirement: FR-024 授權契約

正式服務端 MUST 依下列授權契約檢查每次請求。

正式服務端須依 ADR-037 以當前 active membership 與已啟用矩陣格判斷：詳情讀取用 `task.detail.view`，設定分頁的 `OVERVIEW_EDITABLE_FIELDS` 儲存用 `task.detail.edit`，成員操作用 `task.members.manage`，資料匯出用 `dataset.export`，並保留各自任務狀態、資料範圍、blind review 與答案隔離限制。reviewer 有 view 而無 edit；一人多角色時非 workspace 可用 active 角色權限聯集，狀態與移除只作用於選定 membership。發布、結案、仲裁與其他生命週期命令尚無完整 V1 專用鍵，不得借用上述鍵或只憑矩陣放行，須在 runtime 轉換前另行核准操作鍵、種子資料與安全測試。標記者不得透過匯出檔、條件快照或歷史列取得私有答案、測試集答案或未提交審核草稿；公開回應亦不得暴露受限物件參照。Prototype 的 URL `task_role` 僅保留檢視上下文，不可當作正式授權身分。

**v12.1.0 修訂（issue #1270，生命週期與名冊的鍵）**：

1. 發布、退回 draft、結案、重試 IAA、停用資料隔離 MUST 對應 `task.lifecycle.manage`（admin-007 任務層鍵，種子 PL ✅／RV ❌／AN ❌）。
2. 設定分頁儲存時，`reviewer_ids`／`arbiter_ids` 的寫入 MUST 用 `task.members.manage`，不再用 `task.detail.edit`；其餘 `OVERVIEW_EDITABLE_FIELDS`，包含資料集重綁（FR-014b），仍用 `task.detail.edit`。同一次儲存同時含名冊與其他欄位時，兩個鍵都必須通過。
3. `task.lifecycle.manage` 處於 admin-007 的「已登錄、待啟用」狀態：啟用前以它做的授權判斷 MUST 依未知鍵拒絕；生命週期命令 MUST 維持既有的角色、狀態與資源閘門，MUST NOT 改為只憑矩陣格放行。
4. 仲裁寫入不屬生命週期命令，仍依 `annotation/015-annotation-workspace` FR-104 沿用 `annotation.workspace.review`；`arbiter_ids` 為空時的負責人裁定見 FR-023 v12.1.0 修訂。

上文原文逐字保留；文中「發布、結案、仲裁與其他生命週期命令尚無完整 V1 專用鍵」一句，自本版起由第 1、4 點取代。

#### Scenario: FR-024 主要驗收

- **GIVEN** 正式服務端收到本需求作用域內的請求
- **WHEN** 使用者執行本需求描述的操作
- **THEN** 詳情檢視、儲存、成員管理與匯出各用專屬鍵，其他命令不得借鍵（FR-024）

#### Scenario: 標記者無法透過匯出歷史取得隱藏資料

- **GIVEN** 標記者知道一筆歷史 ID，但沒有當前任務的匯出權限或資料範圍
- **WHEN** 其讀取歷史列、快照或原檔
- **THEN** 授權拒絕，回應不含私有答案、測試集答案、審核草稿或受限物件參照

#### Scenario: 生命週期命令與名冊寫入使用各自的鍵

- **GIVEN** 某任務的 active `project_leader` P 與 active `reviewer` W，且 `task.lifecycle.manage` 仍為「已登錄、待啟用」
- **WHEN** W 發布任務或儲存 `reviewer_ids`，P 儲存 `arbiter_ids` 與資料集重綁，Super Admin 把 `project_leader × task.members.manage` 改為 ❌ 後 P 再次儲存 `reviewer_ids`
- **THEN** W 的兩個請求都拒絕；P 的名冊寫入依 `task.members.manage`、資料集重綁依 `task.detail.edit` 與既有狀態規則判斷
- **AND** 格改為 ❌ 後，P 的下一次名冊寫入拒絕，資料集重綁不受影響
- **AND** 任何以 `task.lifecycle.manage` 作為必要條件的判斷依未知鍵拒絕；P 的發布只依既有的角色、狀態與資源閘門判斷

### Requirement: FR-023 無仲裁者時爭議由專案負責人裁定（成功標準 SC-051）

任務之 `arbiter_ids` 為空時，`project_leader` MUST 能對該任務的爭議項做最終裁定，其裁定 MUST 與仲裁者裁定等效地使該爭議項視為已解決。本條是試標完成條件（FR-008a）與結案條件（FR-008b）納入「必要仲裁完成」後的唯一出口，避免未指定仲裁者的任務永遠無法完成。

**(1) 觸發條件**。本通道 MUST 僅在 `arbiter_ids` 為空時對 `project_leader` 開放。`arbiter_ids` 非空時 MUST NOT 提供此通道——該情形的爭議仍須由具仲裁資格者依 `annotation/015-annotation-workspace` FR-060 之非當事人條件處理，`project_leader` MUST NOT 藉本條繞過仲裁者。

**(2) 裁定選項與效果**。`project_leader` 之裁定選項 MUST 與仲裁者相同（`annotation/015-annotation-workspace` FR-061 之 `ARBITRATION_OUTCOMES`：採標記員答案／採審核員答案／兩者皆非）。裁定為「兩者皆非」時，該項 MUST 依既有規則落入最終例外池由 `project_leader` 逐筆收尾（FR-018、`annotation/015-annotation-workspace` FR-095），MUST NOT 因裁定者本身即為 `project_leader` 而跳過例外池。`dry_run` 之例外池收尾動作 MUST NOT 提供 `custom_answer`——依 `annotation/015-annotation-workspace` FR-095 第 (3) 點該動作僅適用 `official_run`。

**(3) 可追溯性**。裁定 MUST 記錄裁定者帳號、裁定時間與理由，且 MUST 可與仲裁者所做的裁定區分——畫面與匯出 MUST 標明該筆定案來源為「負責人裁定（無指定仲裁者）」，MUST NOT 呈現為一般仲裁者裁定。「兩者皆非」之理由 MUST 為必填，與 `annotation/015-annotation-workspace` FR-061 第 3 點一致。

**(4) 不改變盲審隔離**。本通道 MUST NOT 使 `project_leader` 看到任何尚未提交的審核判斷，`annotation/015-annotation-workspace` FR-062 之盲審隔離規則不因本條放寬。

**成功標準 SC-051**：`arbiter_ids` 為空且存在爭議項的任務，`project_leader` 可逐項完成裁定並使該任務具備試標完成與結案資格，成功率 100%；裁定來源在畫面與匯出中皆可與仲裁者裁定區分；`arbiter_ids` 非空的任務中，此通道對 `project_leader` 的開放次數為 `0`。

**v12.1.0 修訂（issue #1270，負責人裁定的鍵）**：本通道 MUST 對應 `annotation.dispute.adjudicate`（admin-007 任務層鍵，種子 PL ✅／RV ❌／AN ❌），不得借用 `annotation.workspace.review` 或 `task.lifecycle.manage`。該鍵處於「已登錄、待啟用」狀態：啟用前以它做的授權判斷 MUST 依未知鍵拒絕；本通道 MUST 維持第 (1) 點的觸發條件與既有角色閘門，MUST NOT 改為只憑矩陣格放行。啟用後，`arbiter_ids` 非空時即使格為 ✅ 也 MUST 拒絕。上文原文逐字保留。

#### Scenario: 無仲裁者任務的爭議可由負責人裁定並解除卡死

- **GIVEN** 一個 `arbiter_ids` 為空的任務，其某審核單位因審核員 `modify` 而推導為「爭議中」
- **WHEN** `project_leader` 開啟該爭議項並選擇採標記員答案或採審核員答案，填妥理由後送出
- **THEN** 該爭議項視為已解決，該審核單位依既有判定式推導為「已定稿」
- **AND** 畫面與匯出標明該筆定案來源為負責人裁定（無指定仲裁者），可與仲裁者裁定區分
- **AND** 該任務不再因此爭議項而無法完成試標或結案

#### Scenario: 有仲裁者時負責人不得取得此通道

- **GIVEN** 一個 `arbiter_ids` 非空的任務，其某審核單位推導為「爭議中」
- **WHEN** `project_leader` 檢視該爭議項
- **THEN** 不提供負責人裁定入口，該爭議項仍僅能由具仲裁資格者處理
- **AND** 嘗試直接呼叫裁定 handler 失敗，該審核單位狀態維持「爭議中」

#### Scenario: 負責人裁定「兩者皆非」仍須經最終例外池

- **GIVEN** 一個 `arbiter_ids` 為空的 `dry_run` 任務，`project_leader` 正在裁定某爭議項
- **WHEN** 其選擇「兩者皆非」並填妥必填理由送出
- **THEN** 該項落入最終例外池並計入 `dry_run` 待處置項目數，該審核單位維持「爭議中」
- **AND** 該任務在例外池收尾前不具備試標完成資格
- **AND** `dry_run` 的收尾動作選項不包含 `custom_answer`

#### Scenario: 負責人裁定通道的鍵與拒絕條件

- **GIVEN** 一個 `arbiter_ids` 為空且有爭議項的任務，有 active `project_leader` P、active `reviewer` W，以及 membership 已停用的 `project_leader` Q
- **WHEN** W 與 Q 嘗試直接呼叫負責人裁定 handler，P 在 `annotation.dispute.adjudicate` 啟用前裁定，以及該鍵啟用後 P 對另一個 `arbiter_ids` 非空的任務裁定
- **THEN** W 與 Q 被拒；P 在啟用前依既有角色閘門與第 (1) 點判斷，任何以該鍵作為必要條件的判斷依未知鍵拒絕
- **AND** `arbiter_ids` 非空的任務中，P 的裁定被拒，該審核單位維持「爭議中」
