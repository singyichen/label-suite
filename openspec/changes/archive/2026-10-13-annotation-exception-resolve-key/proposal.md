# 最終例外池處置改對應專用權限鍵

對應 Spec: specs/annotation/015-annotation-workspace/spec.md

## Why

Issue #1270（2026-10-12 權限矩陣唯讀稽核的增鍵單）。

FR-095 的「V1 單次收尾」段要求確認處置時驗證「PL 即時權限」，但沒有寫明用哪一個權限鍵。admin-007 原本的 17 個鍵裡沒有合適的鍵：`annotation.workspace.review` 屬於審核員，`task.detail.edit` 屬於設定欄位，而授權判斷規則禁止借用其他鍵。另外，prototype 的處置紀錄把 `resolver_id` 寫死為 `DEFAULT_PROJECT_LEADER_ID`，沒有呼叫者身分可以檢查。

admin-007 同一 issue 的 change（`admin-permission-matrix-56-cells`）登錄了 `annotation.exception.resolve`（任務層，PL ✅／RV ❌／AN ❌），狀態為「已登錄、待啟用」。本 change 在 015 補上處置動作對應的鍵。

維護者裁定（2026-10-12，issue #1270）：五個新鍵全部採用、預設停用。

**為什麼不走 Lightweight Path**：FR-095 新增一項 MUST（處置動作的鍵），並新增一則可測 AC，超出「只釐清」的範圍。

**分級：MINOR。** FR-095 原文逐字保留，只在後面補修訂段。四種處置的集合、`run_type` 分流與資料寫入契約都不變。沒有移除或推翻任何 FR／AC。

## What Changes

- **修訂 FR-095**：補一段 v12.4.0 修訂。
  - 四種處置的確認寫入 MUST 對應 `annotation.exception.resolve`，MUST NOT 借用 `annotation.workspace.review`、`task.detail.edit` 或 `task.lifecycle.manage`。
  - 「PL 即時權限」指 active `project_leader` membership 加上該格；處置者身分 MUST 取自受驗證帳號，不得取自路由參數或預設常數。
  - 該鍵待啟用期間依未知鍵拒絕，處置維持既有的角色與資源閘門，不得只憑矩陣放行。
- **新增一則 AC**：在 gate 4 回寫正典時編號，接續第 4 章現行最大者 AC-4.84。
- **正典回寫**：FR-095 補 v12.4.0 修訂段（原文逐字保留），新增一則 AC，版號 12.3.0 → 12.4.0，Changelog 加一列。

**非目標**：

- 不改 admin-007（由 `admin-permission-matrix-56-cells` 承接）。
- 不改 prototype 的 `resolver_id` 寫死行為：prototype 沒有受驗證身分，授權正確性屬於後端職責；本 change 只在條文中禁止把它移植為正式授權來源。
- 不啟用新鍵，也不實作正式後端。

## Capabilities

`annotation` — 最終例外池處置的授權鍵。
