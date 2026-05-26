# 單一項目 + 多標籤（ Single Item + Multi Label ）

## 任務定義（ Task Definition ）

標記者針對單一文本、句子、段落或文件，從一組候選標籤中選出零個、一個或多個適用標籤。

## 典型任務（ Typical Tasks ）

- 多標籤文本分類
- 內容標記
- 安全風險標記
- 醫療症狀或主題標記

## 輸入結構（ Input Schema ）

```json
{
  "text": ""
}
```

## 輸出結構（ Output Schema ）

```json
{
  "labels": []
}
```

## 標記操作（ Annotation Operation ）

從 `label_options[]` 中選擇所有適用標籤。

## Config 設計（ Config Design ）

- `label_options[]: { name, color? }`
- 待評估是否需要 `min_selected`、`max_selected`、`allow_none`。

## UI 設計（ UI Design ）

使用 checkbox group 或可多選標籤列。

## IAA 與品質指標（ IAA and Quality Metrics ）

待補。

## 品質控管（ Quality Control ）

待補。

## Label Suite 實作影響（ Label Suite Implementation Impact ）

待補。

## 參考資料（ References ）

- [分類任務總覽](../classification.md)
