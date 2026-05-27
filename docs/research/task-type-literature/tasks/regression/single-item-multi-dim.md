# 單一項目 + 多維度（ Single Item + Multiple Dimensions ）

## 任務定義（ Task Definition ）

標記者針對單一文本、句子、段落或文件，在多個彼此獨立的數值維度上給分。每個維度代表不同屬性，不能假設彼此共用相同量表或相同語意方向。

## 典型任務（ Typical Tasks ）

- 情感維度評估（ Valence-Arousal ）
- 多維度品質評估
- 多面向可讀性或內容品質評分
- 摘要或生成文字的人類評分

## 輸入結構（ Input Schema ）

```json
{
  "text": ""
}
```

## 輸出結構（ Output Schema ）

```json
{
  "scores": {
    "valence": 0.0,
    "arousal": 0.0
  }
}
```

## 指標性範例（ Representative Examples ）

### 範例 1：Valence-Arousal 情感維度

分數維度：

```json
[
  { "name": "valence", "min": -1, "max": 1, "step": 0.01 },
  { "name": "arousal", "min": 0, "max": 1, "step": 0.01 }
]
```

輸入：

```json
{
  "text": "這部電影讓我感動落淚。"
}
```

輸出：

```json
{
  "scores": {
    "valence": 0.8,
    "arousal": 0.6
  }
}
```

### 範例 2：多維度品質評估

分數維度：

```json
[
  { "name": "clarity", "min": 1, "max": 5, "step": 1 },
  { "name": "relevance", "min": 1, "max": 5, "step": 1 },
  { "name": "completeness", "min": 1, "max": 5, "step": 1 }
]
```

輸入：

```json
{
  "text": "這份回覆說明了退貨流程，但沒有提到退款時間。"
}
```

輸出：

```json
{
  "scores": {
    "clarity": 4,
    "relevance": 4,
    "completeness": 3
  }
}
```

## 標記操作（ Annotation Operation ）

標記者針對每個維度分別給分。標記介面需避免讓標記者誤以為多個維度互斥，或只需填其中一個。

## Config 設計（ Config Design ）

- `va_dimensions[]: { name, min, max, step }`
- 建議後續評估 `description`、`anchor_labels`、`display_order`，以支援多維度 guideline 與穩定排序。

## UI 設計（ UI Design ）

每個維度應有獨立控制項與清楚標籤。若維度數量較多，需支援緊湊排列、逐項驗證與未完成狀態提示。

## IAA 與品質指標（ IAA and Quality Metrics ）

### 與單維度任務的關鍵差異

多維度任務在單維度基礎上增加兩個複雜度：

| 新增複雜度 | 說明 |
|-----------|------|
| **維度獨立性假設** | 每個維度應衡量不同屬性，但標記者可能受其他維度分數影響（光環效應）|
| **維度間相關性檢驗** | 若兩維度高度相關，代表標記者無法有效區分，需重新定義或合併 |
| **整體分歧 vs 維度分歧** | 需同時監控「哪個樣本分歧大」與「哪個維度分歧大」|

---

### 標記者間一致性（ Inter-Annotator Agreement, IAA ）

#### 策略：逐維評估 + 整體整合

Step 1：逐維計算 ICC / Pearson / Spearman
→ 找出哪個維度一致性低（定義問題）
Step 2：計算整體向量距離（Vector Distance）
→ 找出哪個樣本整體分歧最大（難樣本）
Step 3：計算維度間相關矩陣
→ 找出哪兩個維度被標記者視為相同屬性（設計問題）

#### 主要指標

| 指標 | 層級 | 說明 |
|------|------|------|
| **Per-dimension ICC（2,1）絕對一致** | 維度層級 | 各維度獨立計算 ICC，為此任務首選，找出哪個維度定義不清 |
| **Per-dimension Pearson Correlation** | 維度層級 | 衡量各維度的線性同向變動 |
| **Per-dimension Spearman Correlation** | 維度層級 | 適合離散量表（如 1–5 分）的維度 |
| **Per-dimension MAD** | 維度層級 | 各維度的平均絕對分歧，快速監控用 |
| **Euclidean Distance（整體向量）** | 樣本層級 | 整合所有維度，衡量樣本整體分歧幅度 |
| **Manhattan Distance（整體向量）** | 樣本層級 | 對離群維度較不敏感，適合維度數量多的情境 |

#### 向量距離計算方式

範例（三維品質評估）：
  標記者 A：{clarity: 4, relevance: 3, completeness: 2}
  標記者 B：{clarity: 4, relevance: 4, completeness: 4}
  Euclidean Distance = √((4-4)² + (3-4)² + (2-4)²) = √(0+1+4) = √5 ≈ 2.24
  Manhattan Distance = |4-4| + |3-4| + |2-4| = 0+1+2 = 3
→ completeness 是主要分歧來源，應優先修訂其定義

> ⚠️ 注意：不同維度量表範圍可能不同（如 valence 為 -1~1，arousal 為 0~1），
> 計算向量距離前應先對各維度進行正規化（Min-Max Normalization）。

#### 建議門檻

| 指標 | 建議門檻 |
|------|---------|
| Per-dimension ICC（2,1）絕對一致 | 各維度 ≥ 0.75；低於 0.60 的維度需優先修訂 |
| Per-dimension Pearson / Spearman | 各維度 ≥ 0.70 |
| Per-dimension MAD（相對量表範圍）| 各維度 ≤ 10% |
| Normalized Euclidean Distance | 平均 ≤ 0.20（整體分歧監控）|

---

### 標籤品質指標（ Label Quality Metrics ）

#### 維度層級指標

| 指標 | 說明 |
|------|------|
| **Per-dimension ICC** | 各維度的 ICC 值，定位一致性低的維度 |
| **Per-dimension Score Distribution** | 各維度的分數分佈，偵測壓縮效應或兩極化 |
| **Per-dimension Annotator Bias** | 各維度的標記者系統性偏移，分維度追蹤 |
| **維度間相關矩陣（Dimension Correlation Matrix）** | 所有標記者分數的維度兩兩 Pearson 相關，高相關（r > 0.80）代表維度定義重疊 |
| **光環效應指標（Halo Effect Index）** | 某維度分數是否系統性影響其他維度的判斷 |

#### 標記者層級指標

| 指標 | 說明 |
|------|------|
| **Per-annotator Per-dimension Mean** | 各標記者在各維度的平均分數，偵測維度特定的個人偏差 |
| **Per-annotator Per-dimension SD** | 各標記者在各維度的分數標準差，偵測壓縮效應 |
| **維度間評分一致性** | 同一標記者在不同維度的給分是否過度相似（暗示光環效應）|

#### 資料集層級指標

| 指標 | 說明 |
|------|------|
| **High-Disagreement Sample Rate** | Normalized Euclidean Distance 超過門檻的樣本比例 |
| **Per-dimension Hard Sample Rate** | 各維度 MAD 超過門檻的樣本比例，分維度追蹤 |
| **整體分數分佈覆蓋率** | 各維度是否充分覆蓋量表全範圍 |

---

### 視覺化建議（ Visualization ）

- **Per-dimension ICC 長條圖**：
  橫軸為維度名稱，縱軸為 ICC 值，快速定位一致性低的維度
- **維度間相關矩陣熱力圖（Dimension Correlation Heatmap）**：
  所有維度兩兩相關係數，高相關格子以深色標示，作為維度設計檢查工具
- **Per-annotator Per-dimension 散佈圖矩陣**：
  每對維度一張散佈圖，觀察標記者間的一致程度與異常點
- **High-Disagreement 樣本向量圖**：
  視覺化分歧最大的樣本，呈現各標記者在每個維度上的分數差異
- **Bland-Altman Plot（逐維）**：
  各維度獨立呈現，識別特定分數區間的系統性分歧

---

### 計算時機（ When to Compute ）

| 時間點 | 動作 |
|--------|------|
| 標記開始前 | Pilot round → 逐維確認錨點定義一致；初步計算維度間相關矩陣，確認維度可被有效區分 |
| 標記進行中 | 監控 Per-dimension MAD 與 Per-annotator Bias，偵測特定維度的系統性漂移 |
| 標記完成後 | 完整計算維度間相關矩陣；ICC < 0.60 的維度優先修訂；相關係數 > 0.80 的維度評估是否合併 |

## 品質控管（ Quality Control ）

- 每個維度都需有獨立定義與端點錨點。
- Pilot round 應逐維檢查一致性，不只看總平均。
- 對特定維度低一致性的樣本進行 targeted review。

## Label Suite 實作影響（ Label Suite Implementation Impact ）

- 後端 schema 需接受任意數量的分數維度。
- 前端需依 `va_dimensions` 動態渲染多個數值控制項。
- 品質報表需支援逐維統計與多維整體分歧偵測。

## 參考資料（ References ）

- [回歸任務總覽](../regression.md)
- SemEval-2007 Task 14: Affective Text
- Multi-dimensional human evaluation for generation quality
