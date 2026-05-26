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

## 指標性範例（ Representative Examples ）

### 範例 1：文本分類

候選標籤：

```json
["question", "complaint", "request", "feedback"]
```

輸入：

```json
{
  "text": "請問這筆訂單可以改成超商取貨嗎？"
}
```

輸出：

```json
{
  "label": "question"
}
```

### 範例 2：情感分析

候選標籤：

```json
["positive", "neutral", "negative"]
```

輸入：

```json
{
  "text": "客服回覆很快，問題也在同一天解決。"
}
```

輸出：

```json
{
  "label": "positive"
}
```

### 範例 3：主題分類

候選標籤：

```json
["politics", "business", "technology", "sports", "entertainment"]
```

輸入：

```json
{
  "text": "半導體公司宣布新一代 AI 加速晶片將於下季量產。"
}
```

輸出：

```json
{
  "label": "technology"
}
```

### 範例 4：二元分類

候選標籤：

```json
["spam", "not_spam"]
```

輸入：

```json
{
  "text": "限時優惠！點擊連結立即領取免費禮品。"
}
```

輸出：

```json
{
  "label": "spam"
}
```

## 標記操作（ Annotation Operation ）

從 `label_options[]` 中選擇一個標籤。

## Config 設計（ Config Design ）

- `label_options[]: { name, color? }`

## UI 設計（ UI Design ）

使用單選控制項，例如 radio group、segmented control 或單選標籤列。

## IAA 與品質指標（ IAA and Quality Metrics ）

### 標註者間一致性（ Inter-Annotator Agreement, IAA ）

單一標籤分類任務適用以下指標：

#### 主要指標

| 指標 | 適用情境 | 說明 |
|------|----------|------|
| **Cohen's Kappa（κ）** | 兩位標註者 | 排除隨機一致性後的真實一致程度，為此任務的首選指標 |
| **Fleiss' Kappa** | 三位以上標註者 | 多人標註時的 Kappa 延伸版本 |
| **Percent Agreement** | 快速初步檢查 | 簡單計算同意比例，但不排除隨機因素，僅作輔助參考 |
| **Krippendorff's Alpha** | 標註者數量不固定 | 適合允許部分缺漏標註的情境 |

#### Kappa 判讀標準（Landis & Koch）

| κ 值 | 一致性程度 |
|------|-----------|
| < 0.20 | 極低（Poor） |
| 0.21 – 0.40 | 尚可（Fair） |
| 0.41 – 0.60 | 中等（Moderate） |
| 0.61 – 0.80 | 良好（Substantial） |
| > 0.80 | 幾乎完全一致（Almost Perfect） |

> 建議門檻：正式資料集發布前，κ ≥ 0.60。

---

### 標籤品質指標（ Label Quality Metrics ）

#### 類別層級指標

| 指標 | 說明 |
|------|------|
| **Per-class Agreement Rate** | 各標籤的個別一致率，找出哪些標籤定義模糊 |
| **Confusion Pair Analysis** | 最常互換的標籤對，對應混淆矩陣非對角線 |
| **Label Distribution** | 各標籤的樣本比例，偵測類別不平衡問題 |

#### 資料集層級指標

| 指標 | 說明 |
|------|------|
| **Overall Agreement Rate** | 所有樣本中標註者完全同意的比例 |
| **Majority Vote Coverage** | 多數決可決定標籤的樣本比例（適用 ≥ 3 位標註者）|
| **Ambiguous Sample Rate** | 無法由多數決決定的樣本比例，需人工複審 |

---

### 視覺化建議（ Visualization ）

- **混淆矩陣（Confusion Matrix）**：呈現標註者兩兩之間的標籤交叉分佈
- **Kappa 熱力圖**：以 Annotator × Annotator 矩陣呈現所有標註者配對的 κ 值
- **標籤分佈長條圖**：比較各標註者的標籤使用頻率是否一致

---

### 計算時機（ When to Compute ）

| 時間點 | 動作 |
|--------|------|
| 標註開始前 | Pilot round（小批量）→ 確認 κ ≥ 0.60 再全量標註 |
| 標註進行中 | 每 N 筆觸發一次計算，即時監控品質漂移 |
| 標註完成後 | 最終報告，決定是否需要重新標註模糊樣本 |

## 品質控管（ Quality Control ）

待補。

## Label Suite 實作影響（ Label Suite Implementation Impact ）

待補。

## 參考資料（ References ）

- [分類任務總覽](../classification.md)
