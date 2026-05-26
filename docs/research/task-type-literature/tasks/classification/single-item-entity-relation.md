# 單一項目 + 實體關係標籤（ Single Item + Entity Relation ）

## 任務定義（ Task Definition ）

輸入為已預先標記實體的單一文本，標記者判斷指定實體對之間的關係類型。

## 典型任務（ Typical Tasks ）

- 實體關係分類
- 醫療藥物與症狀關係分類
- 組織與人物關係分類

## 輸入結構（ Input Schema ）

```json
{
  "text": "",
  "entity_markers": {
    "start": "[",
    "end": "]"
  }
}
```

## 輸出結構（ Output Schema ）

```json
{
  "relation": ""
}
```

## 標記操作（ Annotation Operation ）

閱讀包含預標記實體的文本，從 `label_options[]` 中選擇實體對關係。

## Config 設計（ Config Design ）

- `label_options[]: { name, color? }`
- `entity_markers: { start, end }`

## UI 設計（ UI Design ）

需清楚高亮預標記實體，並避免讓標記者誤以為需要新增或修改 span。

## IAA 與品質指標（ IAA and Quality Metrics ）

待補。

## 品質控管（ Quality Control ）

待補。

## Label Suite 實作影響（ Label Suite Implementation Impact ）

待補。

## 參考資料（ References ）

- [分類任務總覽](../classification.md)
