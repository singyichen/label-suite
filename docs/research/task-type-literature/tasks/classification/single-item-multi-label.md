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

## 指標性範例（ Representative Examples ）

### 範例 1：多標籤文本分類

候選標籤：

```json
["billing", "shipping", "account", "refund", "technical_support"]
```

輸入：

```json
{
  "text": "我已經付款了，但系統還是顯示未付款，而且包裹也查不到物流狀態。"
}
```

輸出：

```json
{
  "labels": ["billing", "shipping"]
}
```

### 範例 2：內容標記

候選標籤：

```json
["product_review", "price_feedback", "feature_request", "bug_report"]
```

輸入：

```json
{
  "text": "這個功能很好用，但如果可以匯出 CSV 報表會更方便。"
}
```

輸出：

```json
{
  "labels": ["product_review", "feature_request"]
}
```

### 範例 3：安全風險標記

候選標籤：

```json
["hate_speech", "harassment", "self_harm", "sexual_content", "violence"]
```

輸入：

```json
{
  "text": "你再出現我就找人打你，讓你不敢出門。"
}
```

輸出：

```json
{
  "labels": ["harassment", "violence"]
}
```

### 範例 4：醫療症狀或主題標記

候選標籤：

```json
["fever", "cough", "headache", "fatigue", "shortness_of_breath"]
```

輸入：

```json
{
  "text": "病人表示昨晚開始發燒，今天伴隨咳嗽與明顯疲倦。"
}
```

輸出：

```json
{
  "labels": ["fever", "cough", "fatigue"]
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

### 與單標籤任務的關鍵差異

多標籤任務的標記輸出是一個標籤集合（set），
標記者間的比較必須從「是否選同一個」升級為「集合的重疊程度」。

---

### 標記者間一致性（ Inter-Annotator Agreement, IAA ）

#### 主要指標

| 指標 | 適用情境 | 說明 |
|------|----------|------|
| **Krippendorff's Alpha** | 多位標記者、允許缺漏 | 支援名目尺度的多標籤情境，為此任務首選 |
| **Multi-label Kappa** | 兩位標記者 | 將每個標籤視為獨立二元變數，逐標籤計算 κ 後取平均（Macro-Kappa）|
| **Jaccard Similarity（每筆樣本）** | 直觀集合比較 | 兩位標記者在同一筆樣本上選出標籤集合的交集 / 聯集 |
| **Hamming Agreement** | 集合完全一致率 | 標籤向量完全相同才算同意，標準較嚴格 |

#### Jaccard Similarity 計算方式

```
Jaccard(A, B) = |A ∩ B| / |A ∪ B|

範例：
  標記者 A 選：{科技, 財經}
  標記者 B 選：{科技, 政治}
  Jaccard = |{科技}| / |{科技, 財經, 政治}| = 1 / 3 ≈ 0.33
```

#### 建議門檻

| 指標 | 建議門檻 |
|------|---------|
| Mean Jaccard（所有樣本平均） | ≥ 0.60 |
| Macro-Kappa（所有標籤平均） | ≥ 0.60 |
| Exact Match Rate | ≥ 0.40（多標籤任務本質上較嚴格）|

---

### 標籤品質指標（ Label Quality Metrics ）

#### 類別層級指標

| 指標 | 說明 |
|------|------|
| **Per-label Agreement Rate** | 各標籤單獨的標記者同意率（視為二元分類） |
| **Per-label Cohen's Kappa** | 各標籤的 κ 值，找出定義模糊的標籤 |
| **Co-occurrence Matrix** | 哪些標籤經常被同時選取，輔助判斷標籤邊界是否清楚 |
| **Label Frequency Distribution** | 各標籤被選取的頻率，偵測標籤過於籠統或過於細緻 |

#### 資料集層級指標

| 指標 | 說明 |
|------|------|
| **Avg Labels per Sample** | 每筆樣本平均選幾個標籤，反映任務難度與標籤粒度 |
| **Exact Match Rate** | 標記者完全選相同標籤集合的樣本比例 |
| **Partial Match Rate** | 至少有一個標籤重疊的樣本比例 |
| **Empty Label Rate** | 標記者選擇零標籤的比例，監控是否濫用 allow_none |

---

### 視覺化建議（ Visualization ）

- **共現矩陣（Co-occurrence Matrix）**：
  呈現標籤對同時被選取的頻率，對角線為各標籤單獨出現次數
- **Per-label Kappa 長條圖**：
  橫軸為標籤名稱，縱軸為 κ 值，快速定位問題標籤
- **Jaccard 分佈直方圖**：
  呈現所有樣本的 Jaccard Similarity 分佈，判斷整體一致性
- **標籤選取數量分佈**：
  呈現每筆樣本被選幾個標籤，監控是否符合任務預期

---

### 計算時機（ When to Compute ）

| 時間點 | 動作 |
|--------|------|
| 標記開始前 | Pilot round → 確認 Mean Jaccard ≥ 0.60、檢視共現矩陣是否合理 |
| 標記進行中 | 監控 Empty Label Rate 異常（可能標記者疲乏或跳過）|
| 標記完成後 | 計算 Per-label Kappa，對 κ < 0.40 的標籤進行定義修訂或合併 |

## 品質控管（ Quality Control ）

待補。

## Label Suite 實作影響（ Label Suite Implementation Impact ）

待補。

## 參考資料（ References ）

- [分類任務總覽](../classification.md)
