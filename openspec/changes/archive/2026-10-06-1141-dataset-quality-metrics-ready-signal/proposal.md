---
對應 Spec: specs/dataset/017-dataset-analysis-detail/spec.md
對應 Issue: #1141
基準版本: 017 v3.0.1
目標版本: 017 v3.1.0
---

## Why

issue #1141（承接 #1120 驗收 07(5)）：正典 `task-management/014-task-detail` FR-008b 第 5 項要求「品質指標計算完成可用」才可結案，但整份規格沒有任何一處定義「品質指標就緒」是什麼訊號、由誰產生。#1120 群組 3 因此只能讓原型在 `qualityMetricsReady === false` 時阻擋，而 `getCompletionSignals()` 從不傳入該值，第 5 項在原型中恆為放行，條文與行為之間有一個無法驗證的洞。

品質指標的語意歸 `dataset/017-dataset-analysis-detail`（IAA 為其 FR-039、被修改率為其 FR-040）。維護者已於 2026-10-05 裁定：就緒訊號由 017 定義，014 只引用。語意已定案：

- `iaa_computation_status = done` 即就緒；`pending`／`failed` 為未就緒。
- 「無法計算」（`De = 0`）依 `specs/task-management/014-task-detail/spec.md` FR-010o-4 已記為 `done`，因此為就緒——不得讓無法計算的任務永遠結不了案。
- 缺資料或訊號不存在視為就緒（不阻擋）。
- 就緒訊號只描述「計算是否結束」，不描述「是否達門檻」，與 FR-039 第 1 點的非阻擋語意一致。

**是否需要存在（YAGNI 檢查）**：需要。014 FR-008b(5) 是既有 MUST，缺少訊號定義時後端無從實作、原型無從驗證；本 change 只補定義，不新增門檻或新狀態值。

本 change 只動正典 017；014 的引用與原型閘門由姊妹 change `1141-task-detail-quality-metrics-gate` 承接，依「一 change 一正典」拆開。

## What Changes

- **新增 FR-044 品質指標就緒訊號**：以常數 `QUALITY_METRICS_READY_RULE` 定義 `quality_metrics_ready` 由最新一輪 IAA 計算的 `iaa_computation_status` 推導（`done` 為就緒；`pending`、`failed` 為未就緒；缺紀錄或缺欄位為就緒）；「無法計算」為 `done`；被修改率（FR-040）為即時推導、無非同步狀態，不是輸入；唯一消費者為正典 014 FR-008b 第 5 項。
- **新增一條 Scenario**涵蓋未就緒、就緒、無法計算、缺資料四種情況。
- **不修改任何既有 FR／AC**；FR-039 的 IAA 閘門語意不變。
- **prototype**：不影響 `dataset-analysis-detail.html`；原型閘門在姊妹 change。

**BREAKING 判定**：非 BREAKING。僅新增一條 FR，既有行為皆不變 → MINOR。

**delta 形式說明**：FR-044 為全新 ID，置於 `## ADDED Requirements`。

## Capabilities

### New Capabilities

（無——本變更不引入新的 capability 路徑。）

### Modified Capabilities

- `dataset/017-dataset-analysis-detail`：新增 FR-044 品質指標就緒訊號。

## Impact

**規格**

- 正典：`specs/dataset/017-dataset-analysis-detail/spec.md`（v3.0.1 → v3.1.0，**MINOR**：新增一條 FR、不改既有行為）。
- 正典待改寫錨點（gate 4）：功能需求段新增 FR-044、成功標準段新增一條、Changelog 新增 v3.1.0 列、版本與狀態列同步。
- 衍生檢視：`openspec/specs/dataset/017-dataset-analysis-detail/spec.md`（archive 時自動合併）。
- 與姊妹 change 的順序：兩個 change 同一 PR，014 的引用以規格路徑加常數名指向 FR-044，不依賴 archive 先後。

**原型程式（Principle X 之產品檔案盤點）**

無產品檔案變更（017 側）。

## Constitution Check

- **Generalization-First（NON-NEGOTIABLE）**：訊號由 `iaa_computation_status` 單一欄位推導，與輸出類型、任務類型無關，不新增任何任務類型分支。
- **Data Fairness（NON-NEGOTIABLE）**：訊號只描述計算是否結束，不含任何答案資料，不改變可見範圍。
- **Simplicity First / YAGNI**：不新增狀態值、不新增欄位，直接重用既有 `iaa_computation_status`。
