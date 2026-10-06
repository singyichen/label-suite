---
對應 Spec: specs/task-management/014-task-detail/spec.md
對應 Issue: #1141
基準版本: 014 v5.0.0
目標版本: 014 v5.1.0
---

## Why

issue #1141（承接 #1120 驗收 07(5)）：014 FR-008b 第 5 項「品質指標計算完成可用」是既有 MUST，但原型 `getCompletionSignals()` 從不傳入 `qualityMetricsReady`，`getTaskCompletionBlockers()` 的 `=== false` 判斷永遠不成立，第 5 項在原型中恆為放行；#1120 群組 3 依維護者 2026-10-05 裁定把它延後到本 issue。

姊妹 change `1141-dataset-quality-metrics-ready-signal` 已在 `specs/dataset/017-dataset-analysis-detail/spec.md` 定義品質指標就緒訊號 `QUALITY_METRICS_READY_RULE`。本 change 讓 014 FR-008b 第 5 項引用該訊號，並讓原型真正依訊號阻擋「標記完成」，使 #1120 驗收 07(5) 完成。

語意已定案（維護者 2026-10-05）：最新一輪 IAA 計算 `done` 即就緒（含「無法計算」）、`pending`／`failed` 為未就緒、缺資料視為就緒；未就緒時停用「標記完成」並顯示可閱讀的繁體中文原因。

**是否需要存在（YAGNI 檢查）**：需要。沒有它，FR-008b 第 5 項是一條無法驗證的 MUST。

## What Changes

- **FR-008b 第 5 項改寫**：品質指標就緒 MUST 依 `dataset/017-dataset-analysis-detail` 之 `QUALITY_METRICS_READY_RULE` 判定；未就緒時阻擋轉換並列出「品質指標尚在計算中或計算失敗」類原因。其餘四項、既有情境逐字沿用。
- **新增兩條 Scenario**：未就緒時阻擋結案並顯示原因；就緒（含無法計算與缺資料）時不被第 5 項阻擋。
- **原型**：`task-detail.html` 之 `getCompletionSignals()` 於 `official_run` 傳入 `qualityMetricsReady`（由最新試標回合的 `iaa_computation_status` 推導）；新增 `quality_metrics_not_ready` 原因文案（zh／en）。`task-detail.data.js` 的 `getTaskCompletionBlockers()` 既有判斷不變，僅更新註解。
- **不新增 FR／AC**；不改 `dry_run` 試標閘門。

**BREAKING 判定**：非 BREAKING。FR-008b 第 5 項原本就是 MUST，本 change 只補上引用與可驗證行為 → MINOR（v5.1.0）。若審查發現需改既有 AC 語意，須停止並回報。

## Capabilities

### New Capabilities

（無。）

### Modified Capabilities

- `task-management/014-task-detail`：FR-008b 第 5 項引用品質指標就緒訊號並補兩條情境。

## Impact

**規格**

- 正典：`specs/task-management/014-task-detail/spec.md`（v5.0.0 → v5.1.0，**MINOR**）。
- 正典待改寫錨點（gate 4）：FR-008b 第 5 項、Changelog 新增 v5.1.0 列、版本列同步。
- 衍生檢視：`openspec/specs/task-management/014-task-detail/spec.md`（archive 時以 FR-008b 全文取代）。
- 與姊妹 change 同一 PR；本 change 以規格路徑加常數名引用 017，不引用尚未寫入正典的 FR／AC 編號。

**原型程式（Principle X 之產品檔案盤點）**

- `design/prototype/pages/task-management/task-detail.html`（`getCompletionSignals`、原因文案）
- `design/prototype/pages/task-management/task-detail.data.js`（僅註解）

## Constitution Check

- **Generalization-First（NON-NEGOTIABLE）**：訊號由單一欄位推導，不依任務類型分支。
- **Data Fairness（NON-NEGOTIABLE）**：不接觸答案資料。
- **Simplicity First / YAGNI**：重用既有 `getRoundComputationStatus` 與 `getTaskCompletionBlockers`，不新增狀態或判定式。
