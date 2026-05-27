# 項目對 + 單維度（ Item Pair + Single Dimension ）

## 任務定義（ Task Definition ）

標記者針對兩個文本項目之間的關係給出單一數值分數。常見分數代表語義相似度、相關性、等價程度或距離。

## 典型任務（ Typical Tasks ）

- 語義相似度（ Semantic Textual Similarity, STS ）
- 文本相關性評分
- 問題重複程度評分
- 翻譯或改寫等價程度評分

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
    "similarity": 0.0
  }
}
```

## 指標性範例（ Representative Examples ）

### 範例 1：語義相似度

分數維度：

```json
[
  { "name": "similarity", "min": 0, "max": 1, "step": 0.01 }
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
    "similarity": 0.92
  }
}
```

### 範例 2：文本相關性

分數維度：

```json
[
  { "name": "relatedness", "min": 1, "max": 5, "step": 0.5 }
]
```

輸入：

```json
{
  "text_a": "這款手機的電池續航力很長。",
  "text_b": "使用者抱怨手機充電速度太慢。"
}
```

輸出：

```json
{
  "scores": {
    "relatedness": 3.5
  }
}
```

## 標記操作（ Annotation Operation ）

標記者比較兩個文本項目，依照任務定義給出單一分數。若任務具方向性，guideline 需說明 `text_a` 與 `text_b` 的角色。

## Config 設計（ Config Design ）

- `va_dimensions[]: { name, min, max, step }`，且陣列只有一個元素。
- 待評估是否需對應 `text_a_label`、`text_b_label`、`directional`。

## UI 設計（ UI Design ）

需並列或上下呈現兩個文本項目，並清楚標示項目 A / B。評分控制項應放在兩段文本之後，避免標記者未讀完就評分。

## IAA 與品質指標（ IAA and Quality Metrics ）

### 與其他任務的關鍵差異

此任務結合了兩個來源的複雜度：

| 來源 | 繼承自 | 影響 |
|------|--------|------|
| 數值評分 | 單一項目 + 單維度 | ICC、Pearson、MAD 仍為核心指標 |
| 跨文本比較 | 項目對系列 | 對稱性假設、中間區段分歧、概念混用風險 |
| **中間分數模糊帶** | 本任務特有 | 部分重疊的句對（如同主題不同事實）是最大分歧來源 |

---

### 標註者間一致性（ Inter-Annotator Agreement, IAA ）

#### 兩階段指標策略

Stage 1（標注階段）：衡量標注者之間的一致性
→ ICC（2,1）絕對一致、Pearson、Spearman、MADStage 2（Benchmark 評估階段）：衡量系統輸出與 gold score 的一致性
→ Pearson correlation（STS shared task 標準用法）
→ 兩個階段使用同名指標，但比較對象不同，需明確區分

#### 主要指標

| 指標 | 適用情境 | 說明 |
|------|----------|------|
| **ICC（2,1）絕對一致** | 多位標注者、人工標注階段 | 要求分數絕對接近，為標注品質的首選指標 |
| **Pearson Correlation** | STS 類連續分數 | 衡量線性同向變動；Benchmark 評估的標準指標 |
| **Spearman Correlation** | 排序一致性重要 | 衡量相對排序是否一致，適合離散量表（如 1–5）|
| **MAD（Mean Absolute Difference）** | 快速監控 | 直觀反映標注者間平均分歧幅度 |

#### 對稱性假設的影響

多數相似度任務假設 similarity(A, B) = similarity(B, A)
→ 標注者應不受文本順序影響若任務具方向性（如翻譯品質、問題答案匹配）：
→ 需在 guideline 明確定義 text_a 與 text_b 的角色
→ 可設計 order-swap 驗證題，偵測標注者是否受順序影響建議做法：Pilot round 中插入同一句對的正反順序版本，
計算 |score(A→B) - score(B→A)| 的分佈，
若平均差距 > 5% 量表範圍，需加強 guideline 說明。

#### 中間分數模糊帶（The Hard Middle Problem）

相似度任務的分歧通常集中在中間區段：
高相似（0.8–1.0）：標注者通常一致
低相似（0.0–0.2）：標注者通常一致
中間區段（0.3–0.7）：最容易發生概念混用
常見混用情形：

Topical Relatedness vs Semantic Equivalence
「手機電池」vs「充電速度」→ 主題相關但語義不等價
Lexical Overlap vs Meaning Similarity
字面相似但事實相反的句對

建議做法：在中間區段準備更多錨點範例，並在 guideline
明確說明「主題相關但事實不同」應對應的分數區間。

#### 建議門檻

| 指標 | 建議門檻 |
|------|---------|
| ICC（2,1）絕對一致 | ≥ 0.75 |
| Pearson Correlation（標注者間） | ≥ 0.80（STS 任務標準較高）|
| Spearman Correlation | ≥ 0.75 |
| MAD（相對量表範圍） | ≤ 10%（如量表 0–1，MAD ≤ 0.10）|
| Middle-range MAD（0.3–0.7 區段）| 應單獨計算，預期高於整體 MAD |

---

### 標籤品質指標（ Label Quality Metrics ）

#### 標注者層級指標

| 指標 | 說明 |
|------|------|
| **Per-annotator Mean Score** | 各標注者的平均分數，偵測系統性偏高或偏低 |
| **Per-annotator Score SD** | 各標注者的分數標準差，偵測量表壓縮效應 |
| **Per-annotator Score Distribution** | 分數直方圖，識別是否集中於特定區段 |
| **Annotator Bias** | 個別標注者與所有標注者平均的系統性差距 |
| **Order Sensitivity Score** | Pilot 階段正反順序句對的分數差異，偵測方向性理解問題 |

#### 資料集層級指標

| 指標 | 說明 |
|------|------|
| **Overall Score Distribution** | 全體分數分佈，確認覆蓋量表全範圍 |
| **Middle-range Disagreement Rate** | 0.3–0.7 區段的高分歧樣本比例，監控模糊帶品質 |
| **High-Disagreement Sample Rate** | MAD 超過門檻的句對比例，標記為待審樣本 |
| **Concept Conflation Rate** | 人工複審中發現概念混用的樣本比例（需人工標記）|

---

### 視覺化建議（ Visualization ）

- **標注者分數散佈圖（Scatter Plot）**：
  X 軸為標注者 A 的分數，Y 軸為標注者 B 的分數，
  對角線為完美一致；中間區段的點雲分散程度反映模糊帶問題
- **分數分佈直方圖（含中間區段標示）**：
  標示 0.3–0.7 區段，對比高低相似度區段的分佈密度
- **Bland-Altman Plot**：
  X 軸為兩標注者平均分數，Y 軸為差值，
  識別中間區段是否有系統性分歧擴大現象
- **High-Disagreement 句對列表**：
  按 MAD 排序，附上兩標注者分數與差值，輔助人工複審

---

### 計算時機（ When to Compute ）

| 時間點 | 動作 |
|--------|------|
| 標注開始前 | Pilot round → 計算 Order Sensitivity Score；在中間區段加強錨點驗證；確認標注者對 topical vs semantic 的區分一致 |
| 標注進行中 | 監控 Middle-range Disagreement Rate；偵測 Per-annotator Bias 漂移 |
| 標注完成後 | 計算完整 ICC 與 Pearson；對中間區段高分歧句對進行仲裁；確認 gold score 計算方式（平均 vs 多數決）|

## 品質控管（ Quality Control ）

- 使用帶有錨點範例的量表，例如完全不相關、中度相關、語義等價。
- 對高分歧句對進行仲裁，尤其是部分重疊或同主題但不同事實的樣本。
- 監控標記者是否把 topical relatedness 與 semantic equivalence 混用。

## Label Suite 實作影響（ Label Suite Implementation Impact ）

- 項目對回歸需支援兩個輸入欄位與單一分數維度。
- 品質報表需支援相關係數、MAD、分數分佈與高分歧樣本列表。
- 若後續支援 gold set，annotator API 不得暴露參考分數。

## 參考資料（ References ）

- [回歸任務總覽](../regression.md)
- SemEval-2017 Task 1: Semantic Textual Similarity
- SICK: Sentences Involving Compositional Knowledge
