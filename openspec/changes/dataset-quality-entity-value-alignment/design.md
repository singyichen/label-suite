# 設計決策：dataset-quality-entity-value-alignment（issue #783 第 3 點）

> 本文件存在的理由：本 change 修正的兩個關鍵實體會直接成為資料庫欄位與 CHECK 值域（issue #783「這三點會阻擋 dataset 模組的 schema 定案」）。依專案規則，觸及 DB schema 的 change 需要 design.md。

## 決策

### D1 `SharedMetrics` 欄位

| 欄位 | 來源 |
|------|------|
| `sentence_count` | `SHARED_METRICS`（`:42`） |
| `token_count` | 同上 |
| `completion_rate` | 同上；取代實體段舊名 `overall_completion_rate` |
| `submitted_sample_count` | 同上 |
| `avg_annotation_time_per_sentence` | 同上 |

欄位的計算定義不在本 change 範圍；本 change 只統一名稱與數量。

### D2 `AnnotatorRiskAssessment` 的「資料不足」表示法

| 情境 | `insufficient_data` | `risk_level` |
|------|---------------------|--------------|
| 已完成樣本數 `< ANNOTATOR_MIN_SAMPLE_THRESHOLD`（FR-026） | `true` | `null` |
| 其餘 | `false` | `normal` / `watch` / `high_risk` 之一 |

資料庫層建議以一條 CHECK 綁住兩欄：`(insufficient_data AND risk_level IS NULL) OR (NOT insufficient_data AND risk_level IN ('normal','watch','high_risk'))`，使「兩欄說法不一致」在 schema 層就不可能存在。

**理由**：`DIMENSION_RISK_AGGREGATION = max(risk_level across dimensions)`（`:79`）需要一個有序的三值集合；若把「資料不足」塞成第四個 enum 值，`max()` 會在它與 `high_risk` 之間給出無意義的排序結果。null 則自然被排除在比較之外。

### D3 prototype 的顯示鍵不受影響

`design/prototype/pages/dataset/dataset-analysis-detail.html:1501` 的 `data-risk-level` 有 `insufficient` 一鍵，這是畫面徽章的顯示狀態，對應 `insufficient_data = true`，不是 `risk_level` 的第四個值。本 change 不改 prototype。

## 未決事項（apply 前由維護者確認）

- **Q1**：`multi_dim` 任務中，若將來改為逐維度判斷樣本數而出現「部分維度資料不足」，`max()` 聚合應忽略 null 維度還是整體視為資料不足？現行 FR-026 以標記員為單位判斷，各維度結果相同，本 change 不處理此情境，僅記錄。
- **Q2**：D2 的 CHECK 是本文件的建議，裁定原文未明言；是否採用由後端實作時定案。
