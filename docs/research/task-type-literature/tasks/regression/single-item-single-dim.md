# 單一項目 + 單維度（ Single Item + Single Dimension ）

## 任務定義（ Task Definition ）

標記者針對單一文本、句子、段落或文件，給出一個連續或準連續的數值分數。分數代表單一目標屬性的強度、品質、難度或程度。

## 典型任務（ Typical Tasks ）

- 情感強度評估
- 可讀性評分
- 毒性或風險強度評分
- 單一面向品質評分

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
    "intensity": 0.0
  }
}
```

## 指標性範例（ Representative Examples ）

### 範例 1：情感強度評估

分數維度：

```json
[
  { "name": "sentiment_intensity", "min": 0, "max": 1, "step": 0.01 }
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
    "sentiment_intensity": 0.85
  }
}
```

### 範例 2：可讀性評分

分數維度：

```json
[
  { "name": "readability", "min": 1, "max": 5, "step": 1 }
]
```

輸入：

```json
{
  "text": "本公司因應市場需求變化，將逐步調整產品組合並優化供應鏈。"
}
```

輸出：

```json
{
  "scores": {
    "readability": 4
  }
}
```

## 標記操作（ Annotation Operation ）

標記者閱讀單一項目後，針對唯一維度輸入或選擇一個分數。

## Config 設計（ Config Design ）

- `va_dimensions[]: { name, min, max, step }`，且陣列只有一個元素。
- 建議後續評估 `anchor_labels`，用來記錄最低分與最高分的文字定義。

## UI 設計（ UI Design ）

可使用 slider、number input 或 stepper。若 `step` 較大且值域較小，可使用 segmented control；若 `step` 較細，slider 應搭配可直接輸入的數字欄位。

## IAA 與品質指標（ IAA and Quality Metrics ）

### 與分類任務的關鍵差異

數值評分任務的輸出是連續或準連續的數值，
不能用 Kappa 或 Jaccard 等類別指標，
需改用衡量**數值一致性**與**分數分佈偏差**的指標。

主要挑戰：
1. **尺度錨定（Scale Anchoring）**：不同標注者對「4 分」的直覺可能不同
2. **分佈偏移（Distribution Shift）**：某些標注者習慣性偏高或偏低
3. **量表壓縮（Range Restriction）**：標注者只使用量表中段，導致分數變異過小

---

### 標註者間一致性（ Inter-Annotator Agreement, IAA ）

#### 主要指標

| 指標 | 適用情境 | 說明 |
|------|----------|------|
| **ICC（2,1）絕對一致** | 多位標注者、關注分數是否相同 | 要求標注者不只趨勢一致，絕對數值也需接近；為此任務首選 |
| **ICC（2,1）一致性** | 允許系統性偏移 | 只要求相對趨勢一致，允許標注者有固定偏高或偏低傾向 |
| **Pearson Correlation** | 兩位標注者、連續分數 | 衡量線性同向變動，但不捕捉絕對數值差異 |
| **Spearman Correlation** | 序位比絕對值重要 | 衡量分數排序是否一致，適合離散量表（如 1–5 分）|
| **Mean Absolute Difference（MAD）** | 快速監控 | 直觀反映平均分歧幅度，適合即時品質監控 |

#### ICC 類型選擇指引

ICC(1,1)：標注者視為隨機抽樣，無法泛化到新標注者 → 較少使用
ICC(2,1)：標注者視為固定對象，分析個別差異      → 建議使用
ICC(3,1)：只關心相對排序，忽略系統性偏移        → 適合序位任務
絕對一致（Absolute Agreement）vs 一致性（Consistency）：
絕對一致：標注者 A 給 3.0、B 給 4.0 → 視為不一致
一致性：  標注者 A 給 3.0、B 給 4.0 → 若趨勢相同則視為一致
→ 建議優先報告絕對一致，再輔以一致性作為對比

#### ICC 判讀標準（Koo & Mae, 2016）

| ICC 值 | 一致性程度 |
|--------|-----------|
| < 0.50 | 差（Poor） |
| 0.50 – 0.75 | 中等（Moderate） |
| 0.75 – 0.90 | 良好（Good） |
| > 0.90 | 優異（Excellent） |

#### 建議門檻

| 指標 | 建議門檻 |
|------|---------|
| ICC（2,1）絕對一致 | ≥ 0.75 |
| Pearson / Spearman | ≥ 0.70 |
| MAD（相對量表範圍）| ≤ 10%（如量表為 1–5，MAD ≤ 0.4）|

---

### 標籤品質指標（ Label Quality Metrics ）

#### 標注者層級指標

| 指標 | 說明 |
|------|------|
| **Per-annotator Mean Score** | 各標注者的平均分數，偵測系統性偏高或偏低 |
| **Per-annotator Score SD** | 各標注者的分數標準差，偵測是否只使用量表中段（壓縮效應）|
| **Per-annotator Score Distribution** | 分數的直方圖，識別雙峰分佈或異常集中現象 |
| **Annotator Bias（偏移量）** | 個別標注者與所有標注者平均的系統性差距 |

#### 資料集層級指標

| 指標 | 說明 |
|------|------|
| **Overall Score Distribution** | 全體分數的分佈，確認是否覆蓋量表全範圍 |
| **High-Disagreement Sample Rate** | MAD 超過門檻的樣本比例，標記為待審樣本 |
| **Anchor Consistency Rate** | 若有錨定範例（Anchor Examples），標注者在這些樣本的一致率 |

---

### 視覺化建議（ Visualization ）

- **標注者分數散佈圖（Scatter Plot）**：
  X 軸為標注者 A 的分數，Y 軸為標注者 B 的分數，
  對角線為完美一致，偏離程度反映分歧大小
- **Per-annotator 分數分佈直方圖**：
  並排呈現各標注者的分數分佈，偵測系統性偏移與壓縮效應
- **Bland-Altman Plot**：
  X 軸為兩標注者平均分數，Y 軸為差值，
  識別特定分數區間的系統性分歧
- **高分歧樣本列表**：
  按 MAD 排序，輔助人工複審最有爭議的樣本

---

### 計算時機（ When to Compute ）

| 時間點 | 動作 |
|--------|------|
| 標注開始前 | Pilot round → 確認錨點定義一致；檢查各標注者分佈是否已出現偏移 |
| 標注進行中 | 監控 Per-annotator Mean Score 與 MAD，即時偵測分佈漂移 |
| 標注完成後 | 計算 ICC（絕對一致）；對 Annotator Bias 過大者進行校正或重新標注 |

## 品質控管（ Quality Control ）

- 在 guideline 中明確定義分數端點與中間錨點。
- Pilot round 後檢查標記者間的平均差距與分佈差異。
- 對高分歧樣本進行複審或仲裁。

## Label Suite 實作影響（ Label Suite Implementation Impact ）

- UI 需依 `min`、`max`、`step` 動態產生數值控制項。
- 匯出需保留數值型態與小數精度。
- 品質報表需支援相關係數、ICC、分數分佈與標記者偏差檢查。

## 參考資料（ References ）

- [回歸任務總覽](../regression.md)
- SemEval-2007 Task 14: Affective Text
- ASAP Automated Essay Scoring
