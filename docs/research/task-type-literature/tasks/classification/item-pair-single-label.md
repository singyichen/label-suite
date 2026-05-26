# 項目對 + 單一標籤（ Item Pair + Single Label ）

## 任務定義（ Task Definition ）

標記者針對兩個文本項目之間的關係，從一組候選標籤中選出一個最適合的標籤。

## 典型任務（ Typical Tasks ）

- NLI（自然語言推斷）
- 文本蘊含識別
- 句對關係分類

## 輸入結構（ Input Schema ）

```json
{
  "text_a": "",
  "text_b": ""
}
```

## 輸出結構（ Output Schema ）

```json
{
  "label": ""
}
```

## 標記操作（ Annotation Operation ）

比較兩個文本項目，從 `label_options[]` 中選擇一個關係標籤。

## Config 設計（ Config Design ）

- `label_options[]: { name, color? }`
- 待評估是否需對應 `sentence_1_field`、`sentence_2_field`、`sentence_1_label`、`sentence_2_label`。

## UI 設計（ UI Design ）

需並列或上下呈現兩個文本項目，並清楚標示項目 A / B。

## IAA 與品質指標（ IAA and Quality Metrics ）

待補。

## 品質控管（ Quality Control ）

待補。

## Label Suite 實作影響（ Label Suite Implementation Impact ）

待補。

## 參考資料（ References ）

- [分類任務總覽](../classification.md)
