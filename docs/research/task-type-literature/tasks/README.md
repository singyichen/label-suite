# 任務學習筆記（ Task Learning Notes ）

本資料夾用來整理每一類 NLP 標記任務的學習筆記。重點不是完整文獻回顧，而是把任務知識轉成 Label Suite 後續可實作的產品與工程決策。

## 建議檔案（ Suggested Files ）

- `classification.md` - 分類任務總覽、共用概念與細項索引。
- `classification/` - 分類任務細項筆記。
  - `single-item-single-label.md` - 單一項目 + 單一標籤。
  - `single-item-multi-label.md` - 單一項目 + 多標籤。
  - `single-item-entity-relation.md` - 單一項目 + 實體關係標籤。
  - `item-pair-single-label.md` - 項目對 + 單一標籤。
  - `item-pair-multi-label.md` - 項目對 + 多標籤。
- `regression.md` - 回歸、評分與連續量表總覽、共用概念與細項索引。
- `regression/` - 回歸任務細項筆記。
  - `single-item-single-dim.md` - 單一項目 + 單維度。
  - `single-item-multi-dim.md` - 單一項目 + 多維度。
  - `item-pair-single-dim.md` - 項目對 + 單維度。
  - `item-pair-multi-dim.md` - 項目對 + 多維度。
- `sequence-labeling.md` - Token、span、NER、斷詞與邊界偵測。
- `relation-extraction.md` - 關係分類、關係三元組與 OpenIE。
- `generation.md` - 摘要、問答、翻譯與改寫。
- `ranking-preference.md` - 排序、偏好選擇與人類評估。
- `mixed-tasks.md` - 混合型任務，例如 ABSA、NER + RE、QA + rationale。

## 任務筆記模板（ Task Note Template ）

```md
# 任務名稱（ Task Name ）

## 任務定義（ Task Definition ）

## 常見輸入（ Common Input Schema ）

## 常見輸出（ Common Output Schema ）

## 標記操作（ Annotation Operation ）

## 標籤 / 分數設計（ Label / Score Design ）

## IAA 與品質指標（ IAA and Quality Metrics ）

## 品質控管（ Quality Control ）

## Label Suite 實作影響（ Label Suite Implementation Impact ）

## 缺少的 Config 欄位（ Missing Config Fields ）

## 參考資料（ References ）
```
