# 回歸任務（ Regression / Scoring ）

本文件整理回歸、連續評分與多維度量表任務的共用概念與細項索引。每個細項任務的輸入、輸出、標記操作、Config 設計與 UI 影響，請記錄在 `regression/` 底下的獨立檔案。

## Taxonomy 對應（ Taxonomy Mapping ）

| 任務類別（ task_category ） | 輸入類型（ input_type ） | 輸出類型（ output_type ） | 細項筆記 |
|----------------------------|--------------------------|---------------------------|----------|
| 回歸（ regression ） | 單一項目（ single_item ） | 單維度（ single_dim ） | [single-item-single-dim.md](regression/single-item-single-dim.md) |
| 回歸（ regression ） | 單一項目（ single_item ） | 多維度（ multi_dim ） | [single-item-multi-dim.md](regression/single-item-multi-dim.md) |
| 回歸（ regression ） | 項目對（ item_pair ） | 單維度（ single_dim ） | [item-pair-single-dim.md](regression/item-pair-single-dim.md) |
| 回歸（ regression ） | 項目對（ item_pair ） | 多維度（ multi_dim ） | [item-pair-multi-dim.md](regression/item-pair-multi-dim.md) |

## 共用實作概念（ Shared Implementation Concepts ）

- 共用 config 欄位：`va_dimensions[]: { name, min, max, step }`。
- 單維度與多維度的差異應由 `va_dimensions.length` 控制，不應硬編碼在核心流程。
- 每個維度都需要獨立定義名稱、最小值、最大值與間距，避免假設所有任務都使用 0-1 或 1-5。
- 回歸任務的標記結果通常是數值，不是類別；匯出格式與品質指標需保留小數精度。
- 若分數會被用作模型訓練標籤，需明確記錄量表方向，例如高分是否代表更相似、更正向或品質更高。

## 待補研究問題（ Open Research Questions ）

- `va_dimensions` 是否需要支援 `default_value`、`anchor_labels`、`required`、`description`？
- 是否需要支援每個維度不同的 UI 控制，例如 slider、number input、Likert-style stepper？
- 多標記者回歸任務應如何儲存平均分、標準差與仲裁後分數？
- 連續量表任務是否需要強制顯示量表端點定義，降低標記者尺度漂移？

## 參考資料（ References ）

- [Task Type Taxonomy](../../../product/functional-map/task-type-taxonomy.md)
- SemEval-2007 Task 14: Affective Text
- SemEval-2017 Task 1: Semantic Textual Similarity
- SICK: Sentences Involving Compositional Knowledge
- ASAP Automated Essay Scoring
