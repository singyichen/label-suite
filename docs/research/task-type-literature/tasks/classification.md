# 分類任務（ Classification ）

本文件整理分類任務的共用概念與細項索引。每個細項任務的輸入、輸出、標記操作、Config 設計與 UI 影響，請記錄在 `classification/` 底下的獨立檔案。

## Taxonomy 對應（ Taxonomy Mapping ）

| 任務類別（ task_category ） | 輸入類型（ input_type ） | 輸出類型（ output_type ） | 細項筆記 |
|----------------------------|--------------------------|---------------------------|----------|
| 分類（ classification ） | 單一項目（ single_item ） | 單一標籤（ single_label ） | [single-item-single-label.md](classification/single-item-single-label.md) |
| 分類（ classification ） | 單一項目（ single_item ） | 多標籤（ multi_label ） | [single-item-multi-label.md](classification/single-item-multi-label.md) |
| 分類（ classification ） | 單一項目（ single_item ） | 實體關係標籤（ entity_relation ） | [single-item-entity-relation.md](classification/single-item-entity-relation.md) |
| 分類（ classification ） | 項目對（ item_pair ） | 單一標籤（ single_label ） | [item-pair-single-label.md](classification/item-pair-single-label.md) |
| 分類（ classification ） | 項目對（ item_pair ） | 多標籤（ multi_label ） | [item-pair-multi-label.md](classification/item-pair-multi-label.md) |

## 共用實作概念（ Shared Implementation Concepts ）

- 共用 config 欄位：`label_options[]: { name, color? }`。
- 單選與多選的差異應由 config 控制，不應硬編碼在核心流程。
- 項目對任務需清楚定義兩個輸入欄位與顯示標籤。
- 實體關係分類需記錄實體標記格式，避免與從零開始標實體與關係的 `relation_triple` 混淆。

## 待補研究問題（ Open Research Questions ）

- 不同分類任務適用哪些 IAA 指標？
- 多標籤分類應使用哪些 agreement 與品質監控方式？
- `entity_relation` 是否需要支援多組預標記實體對？
- 分類任務是否需要 `allow_unsure`、`skip_reasons`、`confidence_required` 等通用欄位？

## 參考資料（ References ）

- [Task Type Taxonomy](../../../product/functional-map/task-type-taxonomy.md)
