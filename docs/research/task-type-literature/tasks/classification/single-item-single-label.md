# 單一項目 + 單一標籤（ Single Item + Single Label ）

## 任務定義（ Task Definition ）

標記者針對單一文本、句子、段落或文件，從一組候選標籤中選出一個最適合的標籤。

## 典型任務（ Typical Tasks ）

- 文本分類
- 情感分析
- 主題分類
- 二元分類

## 輸入結構（ Input Schema ）

```json
{
  "text": ""
}
```

## 輸出結構（ Output Schema ）

```json
{
  "label": ""
}
```

## 標記操作（ Annotation Operation ）

從 `label_options[]` 中選擇一個標籤。

## Config 設計（ Config Design ）

- `label_options[]: { name, color? }`

## UI 設計（ UI Design ）

使用單選控制項，例如 radio group、segmented control 或單選標籤列。

## IAA 與品質指標（ IAA and Quality Metrics ）

待補。

## 品質控管（ Quality Control ）

待補。

## Label Suite 實作影響（ Label Suite Implementation Impact ）

待補。

## 參考資料（ References ）

- [分類任務總覽](../classification.md)
