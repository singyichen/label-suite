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

## 指標性範例（ Representative Examples ）

### 範例 1：句對多標籤文本分類

候選標籤：

```json
["same_intent", "same_topic", "requires_follow_up", "contains_complaint"]
```

輸入：

```json
{
  "text_a": "我想取消昨天訂的機票，請問要付手續費嗎？",
  "text_b": "如果我要退掉已付款的航班，會被收取消費嗎？"
}
```

輸出：

```json
{
  "labels": ["same_intent", "same_topic"]
}
```

### 範例 2：多面向相似度或關係標記

候選標籤：

```json
["same_entity", "same_event", "same_location", "same_timeframe", "different_claim"]
```

輸入：

```json
{
  "text_a": "台北市政府宣布週末將在大安森林公園舉辦音樂活動。",
  "text_b": "本週六大安森林公園會有由台北市政府主辦的戶外演唱會。"
}
```

輸出：

```json
{
  "labels": ["same_entity", "same_event", "same_location", "same_timeframe"]
}
```

### 範例 3：語意、情感、語氣等多屬性一致性判斷

候選標籤：

```json
["same_meaning", "same_sentiment", "same_tone", "same_formality"]
```

輸入：

```json
{
  "text_a": "這次更新讓操作流程更順暢，我很滿意。",
  "text_b": "新版介面用起來更方便，整體感受很好。"
}
```

輸出：

```json
{
  "labels": ["same_meaning", "same_sentiment", "same_tone"]
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

### 與其他任務的關鍵差異

此任務結合了兩個複雜度來源：

| 來源 | 繼承自 | 影響 |
|------|--------|------|
| 多標籤集合比較 | 單一項目 + 多標籤 | 需使用 Jaccard、Krippendorff's Alpha |
| 跨文本推理 | 項目對 + 單一標籤 | 認知負擔高、標籤具方向性、各維度定義獨立 |
| **維度間語意關聯** | 本任務特有 | 部分標籤邏輯上相依（如 same_meaning 通常蘊含 same_sentiment），標記者可能有不同推斷策略 |

---

### 標記者間一致性（ Inter-Annotator Agreement, IAA ）

#### 主要指標

| 指標 | 適用情境 | 說明 |
|------|----------|------|
| **Krippendorff's Alpha** | 多位標記者、允許缺漏 | 支援名目尺度的多標籤情境，為此任務首選 |
| **Mean Jaccard Similarity** | 直觀集合比較 | 每筆樣本計算兩標記者選出標籤集合的交集 / 聯集後取平均 |
| **Per-label Cohen's Kappa** | 各維度獨立評估 | 將每個標籤視為獨立二元變數，逐標籤計算 κ 後取 Macro-Kappa |
| **Exact Match Rate** | 嚴格一致性 | 兩標記者完全選相同標籤集合的樣本比例 |

#### Jaccard Similarity 計算方式

```
Jaccard(A, B) = |A ∩ B| / |A ∪ B|

範例（語意屬性任務）：
  標記者 A 選：{same_meaning, same_sentiment, same_tone}
  標記者 B 選：{same_meaning, same_sentiment, same_formality}
  Jaccard = |{same_meaning, same_sentiment}| /
|{same_meaning, same_sentiment, same_tone, same_formality}|
= 2 / 4 = 0.50
```

#### 為何需要 Per-label Kappa？

Jaccard 反映整體集合相似度，但無法區分：

- 哪個維度是分歧來源
- 哪個維度標記者高度一致

範例：
  same_meaning κ = 0.82（高）→ 定義清楚
  same_tone    κ = 0.38（低）→ 定義模糊，需修訂 Guideline
  
建議同時報告 Jaccard（樣本層級）與 Per-label κ（標籤層級）

#### 建議門檻

| 指標 | 建議門檻 |
|------|---------|
| Mean Jaccard | ≥ 0.60 |
| Macro-Kappa（所有標籤平均） | ≥ 0.65（跨文本推理難度高，門檻略高於單一項目多標籤）|
| Per-label Kappa | 各標籤 ≥ 0.60；低於 0.40 的標籤需優先修訂 |
| Exact Match Rate | ≥ 0.35（雙重複雜度，標準較寬鬆）|

---

### 標籤品質指標（ Label Quality Metrics ）

#### 類別層級指標

| 指標 | 說明 |
|------|------|
| **Per-label Kappa** | 各維度標籤的個別 κ 值，定位定義模糊的維度 |
| **維度間共現矩陣** | 哪些標籤經常被同時選取，偵測維度間語意重疊 |
| **維度間矛盾率** | 邏輯上不相容的標籤被同時選取的比例（如 same_meaning + different_claim）|
| **Per-label 使用率差異** | 各標記者在同一標籤的選取頻率差異，偵測個人標準不一致 |

#### 資料集層級指標

| 指標 | 說明 |
|------|------|
| **Avg Labels per Sample** | 每筆樣本平均選幾個標籤，反映任務難度與標籤粒度 |
| **Exact Match Rate** | 標記者完全選相同標籤集合的樣本比例 |
| **Partial Match Rate** | 至少有一個標籤重疊的樣本比例 |
| **Empty Label Rate** | 標記者選擇零標籤的比例，監控是否濫用 allow_none |
| **Hard Sample Rate** | Jaccard < 0.40 的樣本比例，標記為待審樣本 |

---

### 視覺化建議（ Visualization ）

- **維度間共現矩陣（Label Co-occurrence Matrix）**：
  呈現標籤對同時被選取的頻率，對角線為各標籤單獨出現次數，
  輔助判斷維度定義是否有重疊或矛盾
- **Per-label Kappa 長條圖**：
  橫軸為標籤名稱，縱軸為 κ 值，快速定位問題維度
- **Jaccard 分佈直方圖**：
  呈現所有樣本的 Jaccard 分佈，找出大量低一致性樣本的集中區間
- **Per-annotator Label Distribution 熱力圖**：
  標記者 × 標籤的選取頻率矩陣，偵測系統性個人偏差

---

### 計算時機（ When to Compute ）

| 時間點 | 動作 |
|--------|------|
| 標記開始前 | Pilot round → 確認每個維度定義獨立清楚、方向性標籤理解一致；檢視維度間共現矩陣是否有邏輯矛盾 |
| 標記進行中 | 監控 Hard Sample Rate 與 Empty Label Rate，偵測標記者疲乏或跳過行為 |
| 標記完成後 | Per-label Kappa 全面檢視；κ < 0.40 的維度優先修訂 Guideline 或考慮合併 / 拆分 |

## 品質控管（ Quality Control ）

待補。

## Label Suite 實作影響（ Label Suite Implementation Impact ）

待補。

## 參考資料（ References ）

- [分類任務總覽](../classification.md)
