# 項目對 + 多標籤（ Item Pair + Multi Label ）

## 任務定義（ Task Definition ）

標記者針對兩個文本項目之間的多種可能關係，從一組候選標籤中選出所有適用標籤。

## 典型任務（ Typical Tasks ）

- 句對多標籤文本分類
- 多面向相似度或關係標記
- 語意、情感、語氣等多屬性一致性判斷

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
  "labels": []
}
```

## 標記操作（ Annotation Operation ）

比較兩個文本項目，從 `label_options[]` 中選擇所有適用的關係或屬性標籤。

## Config 設計（ Config Design ）

- `label_options[]: { name, color? }`
- 待評估是否需要 `min_selected`、`max_selected`、`allow_none`。

## UI 設計（ UI Design ）

需並列或上下呈現兩個文本項目，並提供多選控制項。

## IAA 與品質指標（ IAA and Quality Metrics ）

待補。

## 品質控管（ Quality Control ）

待補。

## Label Suite 實作影響（ Label Suite Implementation Impact ）

待補。

## 參考資料（ References ）

- [分類任務總覽](../classification.md)
