> 正典：`specs/task-management/014-task-detail/spec.md`（v10.0.0 → v11.0.0，MAJOR）。本 delta 新增 FR-010o-5、FR-025、AC-3.51～3.52、SC-062～063；不重定義 dataset-017 FR-039 計算規則，也不新增 ORM、migration 或 API。

## ADDED Requirements

### Requirement: FR-010o-5 試標 IAA 完成證據

- **FR-010o-5**（**v11.0.0 新增**，issue #1160）：每個 `TrialRound` 的 IAA 結果須有單一、可持久驗證的來源。候選 `task_trial_iaa_result` 以 `trial_round_id` 一對一保存結果格式版本、演算法版本、釘住的輸入摘要、經驗證的逐輸出結果及計算時間；結果不得包含 hidden answer、來源 split、原始私有內容或可讓標記者推知 test 身分的欄位。`result_payload` 對回合釘住的 task config 每個非 `IAA_GATE_EXCLUDED_TYPES` 輸出恰有一個確定結果：數值，或 dataset-017 FR-039 第 4 點的 `De = 0`「無法計算」。在同一資料庫交易驗完完整性、保存結果並把該回合 `iaa_computation_status` 轉為 `done`；狀態為 `pending`／`failed` 或結果缺失／不完整時，不得視為完成；「開始正式標記」與「新增試標回合」兩個轉換都須核對完整結果，不能只看狀態字串。失敗重試只讓同一回合 `failed → pending`，不產生新回合或舊版成功結果；`done` 的結果不可原地覆寫。指標與門檻計算仍僅依 dataset-017 FR-039。

#### Scenario: AC-3.51 完整結果與狀態同交易

- **GIVEN** 最新試標回合有多個需計算輸出，其中一個可能是 `De = 0`
- **WHEN** 非同步計算完成或部分輸出缺失
- **THEN** 只有逐輸出完整且結果列與狀態同交易提交時才為 `done`；缺列、缺輸出或回滾保持不可發布，`De = 0` 不誤標為 `failed`

### Requirement: FR-025 任務稽核事件唯一落點

- **FR-025**（**v11.0.0 新增，BREAKING**，issue #1160）：`RunStateTransition` 與 `IsolationAuditLog` 是受授權讀取 `audit_events` 的邏輯投影，不建立同義持久化表。每一次成功的 task 狀態變化在相同資料庫交易寫恰一筆 `task.status_changed`，其受控摘要保存 `from_status`、`to_status`、觸發來源與必要的原因碼；每一次 `isolation_enabled` 實際變化在相同交易寫恰一筆 `task.isolation_changed`，受控摘要保存前後布林值與原因碼；關閉隔離須驗證二次確認並記其受控原因碼，重新啟用隔離採獨立固定原因碼，不需二次確認。`audit_events` 本身保存事件 ID、非空 task 作用域、驗證過的人員 actor 或受信系統 actor、UTC 時間及 request 關聯；非空 `task_id` 為候選 FK 指向 `task.id`。對 `task.status_changed` 與 `task.isolation_changed`，`target_type` 必須為 `task`，`target_id` 正規化為小寫連字號 UUID 後必須相等於 `task_id`；即使兩個 ID 分別指向有效任務，錯配也須拒絕。值未變時不得建立稽核事件；交易失敗或冪等重送也不得多建事件。讀權、敏感摘要 allowlist、最低保留期與多型 target 驗證依 Accepted ADR-032。不得從用戶端接收自稱 system actor，也不得在摘要寫入答案、token、原始標記或未受控理由文字。

#### Scenario: AC-3.52 同交易且無重複的任務稽核

- **GIVEN** 狀態或隔離設定的合法變更與相同命令重送
- **WHEN** 變更成功、資料庫回滾或重送
- **THEN** 成功變更各有一筆可按 task 查詢的相應 typed audit event；回滾沒有事件，重送不重複，邏輯歷程不依賴第二張表

#### Scenario: AC-3.52 任務目標與作用域錯配

- **GIVEN** 兩個分別存在的任務 A 與 B
- **WHEN** `task.status_changed` 或 `task.isolation_changed` 的 `task_id` 指向 A，而 `target_id` 指向 B，或 `target_type` 不是 `task`
- **THEN** 拒絕整個交易，不變更任務狀態或隔離值，也不寫入稽核事件；兩個 ID 各自有效不能取代兩者相等的驗證

#### Scenario: AC-3.52 隔離關閉與重新啟用的確認條件

- **GIVEN** 有權變更隔離設定的操作者與已存在的任務
- **WHEN** 關閉隔離但未通過二次確認，或重新啟用隔離
- **THEN** 未確認的關閉遭拒且不產生事件；重新啟用不要求二次確認，使用獨立固定原因碼，成功的實際變更在同一交易恰寫一筆 `task.isolation_changed`

### Requirement: AC-3.51 IAA 結果證據

51. **AC-3.51**（v11.0.0，issue #1160）：**Given** 最新試標回合須計算的每個輸出有數值或 `De = 0` 結果，**When** 計算服務提交結果，**Then** 單一版本化結果來源與 `done` 同交易保存；缺任一輸出、結果缺失或回滾時仍不可開始 Official 或下一回合，`De = 0` 不算計算失敗（FR-010o-5）。

#### Scenario: AC-3.51 缺失結果不通過閘門

- **GIVEN** round 標示 `done` 但結果列缺失或不完整
- **WHEN** 請求開始 Official 或下一試標回合
- **THEN** 服務拒絕，不能以狀態字串代替完整結果證據

### Requirement: AC-3.52 任務稽核單一事實來源

52. **AC-3.52**（v11.0.0，issue #1160）：**Given** 任務狀態或隔離開關實際改變，**When** 變更與稽核交易提交，**Then** `audit_events` 各新增恰一筆相應 typed action，保存可驗證的前後值、actor、task、UTC 時間與必要原因碼；回滾或冪等重送不重複，`RunStateTransition`／`IsolationAuditLog` 由此投影而不另建表（FR-025）。

#### Scenario: AC-3.52 變更與事件不可分離

- **GIVEN** 任務變更交易中途失敗
- **WHEN** 交易回滾
- **THEN** 狀態或隔離值及相應事件均不提交

### Requirement: SC-062 IAA 完成證據一致性

- **SC-062**（v11.0.0，issue #1160）：最新試標回合的 `done` 與完整、版本化逐輸出結果不一致之已提交狀態數為 0；`De = 0` 誤記為計算失敗數為 0。

#### Scenario: SC-062 結果與狀態一致

- **GIVEN** 完成、失敗與回滾的合成試標計算
- **WHEN** 核對每回合狀態與結果來源
- **THEN** 不存在 `done` 無完整結果或 `pending`／`failed` 被當作已完成

### Requirement: SC-063 任務稽核與狀態一致性

- **SC-063**（v11.0.0，issue #1160）：成功的任務狀態／隔離設定異動缺少或重複 typed `audit_events` 的數量為 0；交易失敗與冪等重送新增事件數為 0。

#### Scenario: SC-063 稽核唯一

- **GIVEN** 成功、失敗與重送的任務變更
- **WHEN** 依 task、action 和變更身分核對稽核歷程
- **THEN** 每個成功變更恰有一筆事件，失敗與重送沒有額外事件
