# 項目對 + 多維度（ Item Pair + Multiple Dimensions ）

## 任務定義（ Task Definition ）

標記者針對兩個文本項目之間的關係，在多個獨立維度上給分。此任務適合拆解「相似」或「相關」的不同面向，例如語義、句法、主題、語氣或事實一致性。

## 典型任務（ Typical Tasks ）

- 多維度句對相似度評估
- 語義相似度 + 句法相似度 + 主題一致性評估
- 改寫品質多面向評分
- 問答或檢索結果的多面向相關性評分

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
  "scores": {
    "semantic_similarity": 0.0,
    "syntactic_similarity": 0.0,
    "topic_consistency": 0.0
  }
}
```

## 指標性範例（ Representative Examples ）

### 範例 1：多維度句對相似度

分數維度：

```json
[
  { "name": "semantic_similarity", "min": 0, "max": 1, "step": 0.01 },
  { "name": "syntactic_similarity", "min": 0, "max": 1, "step": 0.01 },
  { "name": "topic_consistency", "min": 0, "max": 1, "step": 0.01 }
]
```

輸入：

```json
{
  "text_a": "央行宣布升息。",
  "text_b": "銀行調高利率。"
}
```

輸出：

```json
{
  "scores": {
    "semantic_similarity": 0.92,
    "syntactic_similarity": 0.65,
    "topic_consistency": 0.88
  }
}
```

### 範例 2：改寫品質多面向評分

分數維度：

```json
[
  { "name": "meaning_preservation", "min": 1, "max": 5, "step": 1 },
  { "name": "fluency", "min": 1, "max": 5, "step": 1 },
  { "name": "style_match", "min": 1, "max": 5, "step": 1 }
]
```

輸入：

```json
{
  "text_a": "請在今天下午五點前完成報告。",
  "text_b": "麻煩你今天傍晚五點以前把報告做完。"
}
```

輸出：

```json
{
  "scores": {
    "meaning_preservation": 5,
    "fluency": 5,
    "style_match": 4
  }
}
```

## 標記操作（ Annotation Operation ）

標記者比較兩個文本項目，並針對每個維度分別給分。每個維度需有明確判準，避免標記者把整體印象套用到所有維度。

## Config 設計（ Config Design ）

- `va_dimensions[]: { name, min, max, step }`
- 待評估是否需支援 `dimension_groups`，用於將語義、形式、任務成效等維度分組顯示。
- 待評估是否需支援 `directional`，用於標示 A→B 與 B→A 是否等價。

## UI 設計（ UI Design ）

需清楚呈現項目 A / B，並以穩定順序顯示多個評分維度。維度數量較多時，建議使用緊湊表格式布局，讓標記者能同時比較各維度分數。

## IAA 與品質指標（ IAA and Quality Metrics ）

### 複雜度來源整合

此任務同時繼承四個方向的挑戰：

| 來源 | 繼承自 | 核心影響 |
|------|--------|---------|
| 數值評分基礎 | 單一項目 + 單維度 | ICC、Pearson、MAD |
| 多維度管理 | 單一項目 + 多維度 | Per-dimension ICC、維度相關矩陣、光環效應 |
| 跨文本比較 | 項目對 + 單維度 | 對稱性假設、中間區段模糊帶、概念混用 |
| **維度 × 句對交叉分歧** | 本任務特有 | 不同維度在不同類型句對上的分歧模式各異，需交叉分析 |

---

### 標註者間一致性（ Inter-Annotator Agreement, IAA ）

#### 三層指標策略

Layer 1：維度層級（哪個維度定義不清）
→ Per-dimension ICC、Per-dimension Pearson / Spearman、Per-dimension MAD
Layer 2：樣本層級（哪個句對整體分歧大）
→ Normalized Euclidean Distance、Manhattan Distance
Layer 3：維度 × 句對交叉（哪個維度在哪類句對上最容易分歧）
→ Per-dimension MAD × Pair Type 交叉分析
→ 中間相似度句對的 Per-dimension 分歧熱力圖

#### 主要指標

| 指標 | 層級 | 說明 |
|------|------|------|
| **Per-dimension ICC（2,1）絕對一致** | 維度 | 各維度獨立計算 ICC，為首選指標；找出定義不清的維度 |
| **Per-dimension Pearson Correlation** | 維度 | 各維度線性同向一致性；Benchmark 評估的標準指標 |
| **Per-dimension Spearman Correlation** | 維度 | 各維度排序一致性，適合離散量表 |
| **Per-dimension MAD** | 維度 | 各維度平均絕對分歧，快速監控用 |
| **Normalized Euclidean Distance** | 樣本 | 整合所有維度的整體分歧幅度；計算前需正規化各維度量表 |
| **Manhattan Distance** | 樣本 | 對離群維度較不敏感，適合維度數量多時的整體監控 |

#### 向量距離正規化方式

各維度量表範圍可能不同，計算前需統一正規化：
正規化公式：score_norm = (score - min) / (max - min)
範例（混合量表）：
  semantic_similarity：min=0, max=1  → 直接使用
  meaning_preservation：min=1, max=5 → (score - 1) / 4
  標注者 A：{semantic: 0.92, syntactic: 0.65, topic: 0.88}
  標注者 B：{semantic: 0.88, syntactic: 0.70, topic: 0.75}
  Euclidean = √((0.92-0.88)² + (0.65-0.70)² + (0.88-0.75)²)
  = √(0.0016 + 0.0025 + 0.0169) ≈ 0.147
  → topic_consistency 是主要分歧來源，應優先修訂其定義

#### 對稱性與方向性檢驗（逐維度）

不同維度對順序的敏感度可能不同：
  semantic_similarity：通常對稱（A↔B 應給相同分數）
  style_match（改寫任務）：可能不對稱（以 text_a 為目標）
  meaning_preservation：方向性強（text_b 是否保留 text_a 的語義）
建議做法：
  Pilot round 中，對每個維度分別計算 |score(A→B) - score(B→A)|，
  差距 > 5% 量表範圍的維度需在 guideline 明確標示方向性

#### 建議門檻

| 指標 | 建議門檻 |
|------|---------|
| Per-dimension ICC（2,1）絕對一致 | 各維度 ≥ 0.75；< 0.60 的維度優先修訂 |
| Per-dimension Pearson | 各維度 ≥ 0.80（句對任務標準較高）|
| Per-dimension MAD（相對量表範圍）| 各維度 ≤ 10% |
| Normalized Euclidean Distance（樣本平均）| ≤ 0.20 |
| 中間區段 Per-dimension MAD | 應單獨監控，預期高於整體 MAD |

---

### 標籤品質指標（ Label Quality Metrics ）

#### 維度層級指標

| 指標 | 說明 |
|------|------|
| **Per-dimension ICC** | 各維度一致性，定位定義不清的維度 |
| **維度間相關矩陣（Dimension Correlation Matrix）** | 所有維度兩兩 Pearson 相關；r > 0.80 代表標注者無法有效區分兩維度 |
| **光環效應指標（Halo Effect Index）** | 某維度分數是否系統性影響其他維度；在句對任務中尤需警惕整體印象壓過個別維度判斷 |
| **Per-dimension 中間區段 MAD** | 各維度在中間分數句對上的 MAD，定位模糊帶問題 |
| **Per-dimension 方向性敏感度** | 各維度正反順序句對的分數差異，識別隱性方向性 |

#### 標注者層級指標

| 指標 | 說明 |
|------|------|
| **Per-annotator Per-dimension Mean** | 各標注者在各維度的平均分數，偵測維度特定的個人偏差 |
| **Per-annotator Per-dimension SD** | 各標注者在各維度的分數標準差，偵測壓縮效應 |
| **Dimension Drift（逐維）** | 長期追蹤各維度的標注者平均分變化，偵測定義理解漂移 |
| **維度間評分相關性（個人）** | 同一標注者不同維度分數的相關性；過高代表光環效應 |

#### 資料集層級指標

| 指標 | 說明 |
|------|------|
| **High-Disagreement Sample Rate** | Normalized Euclidean Distance 超過門檻的句對比例 |
| **Per-dimension Hard Sample Rate** | 各維度 MAD 超過門檻的句對比例，分維度追蹤 |
| **Middle-range Per-dimension Disagreement** | 中間區段句對的各維度分歧分佈 |
| **整體分數覆蓋率（逐維）** | 各維度是否充分覆蓋量表全範圍 |

---

### 視覺化建議（ Visualization ）

- **Per-dimension ICC 長條圖**：
  橫軸為維度名稱，縱軸為 ICC 值，快速定位一致性低的維度
- **維度間相關矩陣熱力圖（Dimension Correlation Heatmap）**：
  所有維度兩兩相關係數，高相關格子深色標示，作為維度設計檢查工具
- **維度 × 句對類型分歧熱力圖**：
  橫軸為維度，縱軸為句對類型（高 / 中 / 低相似度），
  格子內為各組合的平均 MAD，找出哪個維度在哪類句對上最容易分歧
- **Per-annotator Per-dimension 散佈矩陣**：
  每對維度一張散佈圖，觀察標注者間一致程度與光環效應
- **Dimension Drift 折線圖**：
  橫軸為標注批次，縱軸為各維度平均分，
  監控長期標注過程中的定義理解漂移

---

### 計算時機（ When to Compute ）

| 時間點 | 動作 |
|--------|------|
| 標注開始前 | Pilot round → 逐維計算方向性敏感度；計算維度間相關矩陣，確認維度可被有效區分；在中間區段加強錨點驗證 |
| 標注進行中 | 監控 Per-dimension Dimension Drift；偵測光環效應指標是否上升；追蹤中間區段的 Per-dimension MAD |
| 標注完成後 | 完整計算三層指標；r > 0.80 的維度對評估是否合併；ICC < 0.60 的維度優先修訂 guideline；確認 gold score 計算方式 |

## 品質控管（ Quality Control ）

- Guideline 需提供每個維度的正反例與邊界案例。
- Pilot round 應找出高度相關或難以區分的維度。
- 高分歧樣本應保留逐維分歧資訊，而不是只記錄總分歧。

## Label Suite 實作影響（ Label Suite Implementation Impact ）

- 前端需同時支援 item-pair layout 與任意數量分數維度。
- 後端需保留每個維度的原始分數，不能只存平均分。
- 品質報表需支援逐維統計、標記者偏差、向量距離與高分歧樣本列表。

## 參考資料（ References ）

- [回歸任務總覽](../regression.md)
- SemEval-2017 Task 1: Semantic Textual Similarity
- SICK: Sentences Involving Compositional Knowledge
