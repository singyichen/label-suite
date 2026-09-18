---
對應 Spec: specs/dataset/017-dataset-analysis-detail/spec.md
對應 Issue: #783
基準版本: 017 v3.0.0
目標版本: 017 v3.0.1
---

## Why

issue #783 第 3 點：正典 017 的規格常數段與關鍵實體段對同一組資料給出兩種形狀，後端依哪一段建 schema 都會默默違反另一段。

- **`SharedMetrics` 欄位集**：`:42` `SHARED_METRICS` 有 5 個值（`sentence_count`、`token_count`、`completion_rate`、`submitted_sample_count`、`avg_annotation_time_per_sentence`），FR-008（`:419`）與 SC-003（`:606`）也都要求五項；但 `:541` 的 `SharedMetrics` 實體只列 3 個欄位，且完成率欄名是 `overall_completion_rate`。
- **`risk_level` 值域**：`:57` `ANNOTATOR_RISK_LEVELS = normal | watch | high_risk`（3 值），FR-025（`:458`）與 SC-014（`:619`）也是 3 值；但 `:557` 的 `AnnotatorRiskAssessment.risk_level` 列了 4 值（多了 `insufficient_data`），同一實體又另有布林欄位 `insufficient_data`——同一件事被表示兩次。

維護者已於 2026-09-18 裁定：以 017 的常數段為準。`:541` 改成 5 個欄位並採用 `completion_rate`；`risk_level` 維持 3 值（配合 `:79` `DIMENSION_RISK_AGGREGATION = max(...)` 的有序聚合），資料不足時為 null，另以布林 `insufficient_data` 表示；`:557` 的 4 值寫法要修正。

本 change 只動正典 017；issue #783 第 1、2 點由姊妹 change `task-detail-iaa-precondition-and-override-scope`（正典 014）承接，依「一 change 一正典」拆開。

**是否需要存在（YAGNI 檢查）**：需要。兩處不一致會直接變成 schema 的欄位名與 enum/CHECK 值域，後端開工前必須只剩一個答案。

## What Changes

- **FR-008 重述並補一句**：`SharedMetrics` 實體 MUST 恰好承載 `SHARED_METRICS` 的五個 key、欄名逐字相同；MUST NOT 使用 `overall_completion_rate`。
- **FR-025 重述並補兩句**：`risk_level` 的值域 MUST 恰為 `ANNOTATOR_RISK_LEVELS` 三值；FR-026 資料不足時 `risk_level` MUST 為 null 且 `insufficient_data` 為 true，資料足夠時 `insufficient_data` 為 false 且 `risk_level` 非 null。
- **關鍵實體段改寫**（gate 4）：`:541` `SharedMetrics` 改列五個欄位；`:557` `AnnotatorRiskAssessment.risk_level` 改為三值且註明可為 null。
- **不新增、不移除任何 FR／AC／SC**；兩條情境沿用既有 SC-003、SC-014 編號，只把實體層的形狀寫成可驗證的敘述。
- **prototype**：不需要改動。`dataset-analysis-detail.html:1501` 的 `data-risk-level` 顯示鍵 `insufficient` 是畫面徽章狀態（由資料不足推導），不是實體欄位值，與本裁定相容。

**BREAKING 判定**：非 BREAKING。常數段、FR-008、FR-025、FR-026、SC-003、SC-014 原本就是 5 欄位／3 值；錯的是關鍵實體段。

**delta 形式說明**：FR-008 與 FR-025 不在 `openspec/specs/` 衍生檢視內（衍生檢視目前只收錄 FR-009L、FR-012L、FR-013、FR-024A、FR-035、FR-036、FR-039、FR-041、FR-042、FR-043），無法使用 `## MODIFIED`，因此以既有 ID 置於 `## ADDED Requirements`；gate 4 回寫正典時必須**原地改寫**，不得新增第二條同 ID 條文。

## Capabilities

### New Capabilities

（無——本變更不引入新的 capability 路徑。）

### Modified Capabilities

- `dataset/017-dataset-analysis-detail`：FR-008、FR-025 補述實體形狀；關鍵實體 `SharedMetrics`、`AnnotatorRiskAssessment` 改寫。規格常數、FR-026、SC-003、SC-014 維持原文。

## Impact

**規格**

- 正典：`specs/dataset/017-dataset-analysis-detail/spec.md`（v3.0.0 → v3.0.1，**PATCH**）。判為 PATCH 的理由：修正同一規格內部的不一致，以既有常數段與 FR 為準，不新增、不移除任何 FR／AC／SC，任何既有畫面行為都不變。
- 正典待改寫錨點（gate 4）：`:419` FR-008、`:458` FR-025、`:541` `SharedMetrics`、`:557` `AnnotatorRiskAssessment`、Changelog 新增 v3.0.1 列（現最新列在 `:646`）。
- 正典 017 目前位於 `specs/dataset/017-dataset-analysis-detail/`（依 issue #578／#596 先例留在模組目錄），不需自封存區取回；`specs/STATUS.md` 之 dataset-017 列於本 propose 改為 change-open，分支欄維持與正典 frontmatter 相同的 `feat/dataset/017-dataset-analysis-detail`（先例 `3da42891`）。
- 衍生檢視：`openspec/specs/dataset/017-dataset-analysis-detail/spec.md`（archive 時自動合併）。
- 上游／下游：無。`dataset/016-dataset-analysis-list` 只消費任務層級 IAA 摘要，不讀這兩個實體。

**原型程式（Principle X 之產品檔案盤點）**

無產品檔案變更。

## Constitution Check

- **Generalization-First（NON-NEGOTIABLE）**：欄位集直接等於 `SHARED_METRICS` 常數，值域直接等於 `ANNOTATOR_RISK_LEVELS` 常數，不另寫第二份清單。
- **Data Fairness（NON-NEGOTIABLE）**：兩個實體皆為 `project_leader`／`reviewer` 可見的品質分析資料，本變更不改變可見範圍，也不接觸任何答案資料。
- **Simplicity First / YAGNI**：不新增欄位、不新增狀態值；把重複表示「資料不足」的第四個 enum 值刪掉，只留布林。
