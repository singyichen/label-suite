> 正典：`specs/task-management/014-task-detail/spec.md`（v3.3.1 → v4.0.0，**MAJOR**，維護者 2026-09-18 裁定：收回既有行為屬破壞性變更，理由見 proposal.md Impact 節）。issue #791。
>
> **為何既有 ID 放在 `## ADDED Requirements` 底下**：FR-013 與 AC-3.12 皆已存在於正典，但**不在** `openspec/specs/task-management/014-task-detail/spec.md` 衍生檢視內（衍生檢視目前只收錄 FR-005j、FR-005k、FR-008b、FR-010s、FR-010s-1、FR-010s-2、FR-010t、FR-018、FR-019、FR-020、FR-021）。對它們下 `## MODIFIED` 會在 archive 階段以 header not found 硬中止，而 `openspec validate` 對此零訊號。因此本 delta 以既有 ID 在衍生檢視中「首次收錄」修訂後的全文；gate 4 回寫正典時 MUST **原地改寫** FR-013 與 AC-3.12，不得在正典中新增第二條同 ID 條文。本 delta 內未帶 AC ID 的情境為新增驗收情境，AC 編號於 gate 4 回寫時依正典既有順序配發（接續 AC-3.13）。

## ADDED Requirements

### Requirement: FR-013 執行控制按鈕依任務狀態顯示，新增試標回合僅自待 IAA 確認狀態發起

Overview「任務狀態與執行控制」的執行控制按鈕 MUST 與任務狀態一一對應，且按鈕 MUST 與「達標條件」位於同一操作列：

| 任務狀態 | 顯示的執行控制按鈕 |
|----------|--------------------|
| `draft` | `新增試標回合 R1` |
| `dry_run_in_progress` | `新增試標回合 R{trial_round+1}` 以**停用**狀態顯示，並於按鈕旁以可見文字顯示原因「本回合全部提交並完成 IAA 後才能新增下一回合」 |
| `waiting_iaa_confirmation` | `開始正式標記` 與 `新增試標回合 R{trial_round+1}` 兩者並列 |
| `official_run_in_progress` | `標記完成` |
| `completed` | 不顯示執行控制按鈕，只顯示狀態 badge 與說明文字 |

**(1) 回合必須先結束才能開下一回合**。`dry_run_in_progress` 表示目前回合仍在進行；此狀態下 `新增試標回合 R{trial_round+1}` MUST 維持可見但停用，點擊 MUST NOT 建立回合、MUST NOT 改變任務狀態，原因文字 MUST 以可見文字呈現（MUST NOT 只放在 tooltip）。下一個回合只能在目前回合依 FR-008a 完成、任務自動進入 `waiting_iaa_confirmation` 之後發起。此停用的依據是「本回合尚未結束」，與 IAA 是否達標無關，因此不違反 FR-010o-3。

**(2) 待 IAA 確認是唯一的決策點**。`waiting_iaa_confirmation` 狀態 MUST 同時提供 `開始正式標記` 與 `新增試標回合 R{trial_round+1}`：兩者是同一決策點上的互斥選項，任一成功後任務即轉入新狀態、操作列改依新狀態的對照表呈現，因此不構成「語意衝突的操作」。本需求不改變 FR-010o-3——IAA 達標與否仍只是顧問性警示，兩個按鈕 MUST NOT 因 IAA 未達標而停用或隱藏。

**(3) 新狀態轉換**。自 `waiting_iaa_confirmation` 成功建立 `新增試標回合 R{n}`（`n >= 2`）時，任務狀態 MUST 轉為 `dry_run_in_progress`；該回合清單建立（FR-010f-2）與狀態轉換 MUST 視為同一動作，MUST NOT 出現「清單已建立但狀態仍為 `waiting_iaa_confirmation`」或「狀態已轉換但清單尚未建立」的可觀察中間狀態。轉換後 MUST NOT 在新回合任何一筆標記提交之前，就因 FR-008a 的完成條件立即轉回 `waiting_iaa_confirmation`——FR-008a 對新回合的評估 MUST 涵蓋本回合剛建立的標記作業。

**(4) 修訂紀錄必填檢查不變**。點擊 `新增試標回合 R{n}`（`n >= 2`）時，若未通過 FR-017 之修訂紀錄必填檢查，系統 MUST 阻擋建立並逐欄列出缺項提示，阻擋樣式比照 FR-010t（逐項顯示未滿足條件，不得靜默忽略點擊）；被阻擋時任務狀態 MUST 維持 `waiting_iaa_confirmation`。

**(5) 狀態機來源**。本需求新增之 `waiting_iaa_confirmation → dry_run_in_progress` 轉換，MUST 同步列入 `docs/adr/022-task-state-machine-location.md` 的 Transition Table 與 `ALLOWED_TRANSITIONS` 白名單；`dry_run_in_progress → dry_run_in_progress`（進行中另開回合）MUST NOT 列入。

**(6) 揭露時點不變**。`annotation/015-annotation-workspace` FR-096 之試標歷史回饋揭露規則不因本需求修改：R{n+1} 只能在 R{n} 已進入 `waiting_iaa_confirmation` 之後建立，因此 R{n} 的揭露前提在 R{n+1} 建立前即已成立；R{n+1} 進行中其本身資料仍一律不揭露。

**(7) 回溯轉換不是跳階（釐清，維護者 2026-09-18 裁定）**。正典使用者故事 3 行為規則「狀態轉換必須符合 `TASK_STATUSES` 順序，不允許跳階」與 SC-004「任務狀態轉換遵循定義順序」的「順序」，MUST 以 `docs/adr/022-task-state-machine-location.md` 的轉換表判定：合法轉換以 ADR-022 轉換表為準；表列的回溯轉換（含本需求新增的 `waiting_iaa_confirmation → dry_run_in_progress`）不視為跳階。gate 4 回寫時於該行為規則與 SC-004 原地補上此句，不新增任何 FR／AC／SC 編號。

#### Scenario: AC-3.12 自待 IAA 確認新增第二回合須先填修訂紀錄

- **GIVEN** 任務已完成 R1 試標且處於 `waiting_iaa_confirmation`
- **WHEN** `project_leader` 點擊 `新增試標回合 R2` 但未填寫 `prior_round_findings` 與 `guideline_change_summary`、也未勾選 `no_change`
- **THEN** 系統阻擋建立並逐欄提示缺項，任務狀態維持 `waiting_iaa_confirmation`
- **AND** 補齊必填欄位（或勾選 `no_change` 並填寫 `no_change_reason`）後方可成功建立 R2，任務狀態轉為 `dry_run_in_progress`，且新建立的 `TrialRound.sampling_value` 等於本輪實際建立之試標清單筆數（FR-017、FR-010f-2）

#### Scenario: 試標進行中的新增試標回合按鈕停用並顯示原因

- **GIVEN** 任務處於 `dry_run_in_progress`（不論目前是 R1 或其後任一回合）
- **WHEN** `project_leader` 檢視 Overview「任務狀態與執行控制」
- **THEN** 操作列顯示停用狀態的 `新增試標回合 R{trial_round+1}`，按鈕旁可見原因文字「本回合全部提交並完成 IAA 後才能新增下一回合」，且不出現其他執行控制按鈕
- **AND** 點擊該按鈕不建立任何回合，任務狀態維持 `dry_run_in_progress`

#### Scenario: 待 IAA 確認同時提供開始正式標記與新增試標回合

- **GIVEN** 任務處於 `waiting_iaa_confirmation` 且已完成 R1，最新回合 IAA 未達目標門檻
- **WHEN** `project_leader` 檢視 Overview「任務狀態與執行控制」
- **THEN** 操作列同時顯示 `開始正式標記` 與 `新增試標回合 R2`，兩者皆可點擊
- **AND** IAA 未達標只以警示樣式呈現，不停用或隱藏任一按鈕（FR-010o-3）

#### Scenario: 新回合建立後在任何提交前不會自動轉回待確認

- **GIVEN** 任務自 `waiting_iaa_confirmation` 成功建立 R2，任務狀態已轉為 `dry_run_in_progress`，且 R2 尚無任何標記提交
- **WHEN** 系統依 FR-008a 評估試標完成條件
- **THEN** 任務狀態 MUST 維持 `dry_run_in_progress`，直到 R2 的標記作業依 `DRY_RUN_COMPLETION_RULE` 全部完成才轉為 `waiting_iaa_confirmation`

#### Scenario: SC-047 每個試標回合都經過待確認決策點

- **GIVEN** `TASK_STATUSES` 五種任務狀態各一個以 `project_leader` 開啟的任務
- **WHEN** 逐一檢視 Overview「任務狀態與執行控制」操作列
- **THEN** 可點擊的 `新增試標回合` 按鈕恰只出現在 `draft`（顯示 R1）與 `waiting_iaa_confirmation`（顯示 R{trial_round+1}）兩種狀態，`dry_run_in_progress` 只出現停用狀態的該按鈕並附原因文字，五種狀態逐一比對 5／5 符合 FR-013 對照表
- **AND** 任一任務自 `draft` 起經歷 N 個試標回合（N >= 2），每一個 R{n}（`n >= 2`）的建立都恰對應一次 `waiting_iaa_confirmation → dry_run_in_progress` 轉換，不存在任何在 `dry_run_in_progress` 期間建立的回合
