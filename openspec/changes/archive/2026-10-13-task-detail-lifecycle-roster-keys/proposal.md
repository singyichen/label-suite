# 任務詳情的生命週期、名冊與負責人裁定改對應新權限鍵

對應 Spec: specs/task-management/014-task-detail/spec.md

## Why

Issue #1270（2026-10-12 權限矩陣唯讀稽核的增鍵單）。

FR-024 目前寫明「發布、結案、仲裁與其他生命週期命令尚無完整 V1 專用鍵」，FR-023 的負責人裁定通道也沒有對應鍵。另外，審核名冊（`reviewer_ids`／`arbiter_ids`）屬於 `OVERVIEW_EDITABLE_FIELDS`，所以現行條文讓名冊寫入跟著 `task.detail.edit`。

admin-007 同一 issue 的 change（`admin-permission-matrix-56-cells`）登錄了 `task.lifecycle.manage` 與 `annotation.dispute.adjudicate`，狀態為「已登錄、待啟用」，並把名冊改歸 `task.members.manage`。本 change 在 014 補上「操作 → 鍵」的對應，讓後端實作者不必自行推測。

維護者裁定（2026-10-12，issue #1270）：五個新鍵全部採用、預設停用；名冊改歸 `task.members.manage`；資料集重綁留在 `task.detail.edit`。

**為什麼不走 Lightweight Path**：FR-024 與 FR-023 各新增一項 MUST（操作對應的鍵），並各新增一則可測 AC，超出「只釐清」的範圍。

**分級：MINOR。** FR-024、FR-023 原文逐字保留，只在後面補修訂段。待啟用期間既有的角色與資源閘門不變。名冊改歸對 PL 的實際權限沒有影響（PL 在兩個鍵都是 ✅）。沒有移除或推翻任何 FR／AC。

## What Changes

- **修訂 FR-024**：補一段 v12.1.0 修訂。
  - 發布、退回 draft、結案、重試 IAA、停用資料隔離對應 `task.lifecycle.manage`。
  - 設定分頁儲存中，`reviewer_ids`／`arbiter_ids` 改用 `task.members.manage`；其餘 `OVERVIEW_EDITABLE_FIELDS`，包含資料集重綁，仍用 `task.detail.edit`。
  - `task.lifecycle.manage` 待啟用期間依未知鍵拒絕，生命週期命令維持既有閘門，不得只憑矩陣放行。
  - 仲裁仍依 `annotation/015-annotation-workspace` FR-104 沿用 `annotation.workspace.review`。
- **修訂 FR-023**：補一段 v12.1.0 修訂。負責人裁定通道對應 `annotation.dispute.adjudicate`（待啟用），觸發條件 `arbiter_ids` 為空不變。
- **新增兩則 AC**：在 gate 4 回寫正典時編號，接續使用者故事 3 現行最大者。
- **正典回寫**：FR-024、FR-023 各補 v12.1.0 修訂段（原文逐字保留），新增兩則 AC，版號 12.0.4 → 12.1.0，Changelog 加一列。

**非目標**：

- 不改 admin-007（由 `admin-permission-matrix-56-cells` 承接）。
- 不改 FR-010s／FR-010s-1 的名冊欄位規則與 `ARBITER_CANDIDATE_RULE`；只改寫入所需的鍵。
- 不改 prototype；prototype 的 `task_role` 只是檢視上下文，不是授權依據。
- 不啟用新鍵，也不實作正式後端。

## Capabilities

`task-management` — 任務詳情操作對應的權限鍵。
