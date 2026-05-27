# 項目對 + 單一標籤（ Item Pair + Single Label ）

## 任務定義（ Task Definition ）

標記者針對兩個文本項目之間的關係，從一組候選標籤中選出一個最適合的標籤。

## 典型任務（ Typical Tasks ）

- NLI（自然語言推斷）
- 文本蘊含識別
- 句對關係分類

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
  "label": ""
}
```

## 指標性範例（ Representative Examples ）

### 範例 1：NLI（自然語言推斷）

候選標籤：

```json
["entailment", "contradiction", "neutral"]
```

輸入：

```json
{
  "text_a": "一名男子正在公園裡遛狗。",
  "text_b": "有人在戶外和狗一起活動。"
}
```

輸出：

```json
{
  "label": "entailment"
}
```

### 範例 2：文本蘊含識別

候選標籤：

```json
["entails", "does_not_entail"]
```

輸入：

```json
{
  "text_a": "公司宣布本季營收比去年同期成長 18%。",
  "text_b": "公司的營收較去年同期增加。"
}
```

輸出：

```json
{
  "label": "entails"
}
```

### 範例 3：句對關係分類

候選標籤：

```json
["duplicate", "related", "unrelated"]
```

輸入：

```json
{
  "text_a": "如何重設我的帳號密碼？",
  "text_b": "忘記密碼時要怎麼重新設定？"
}
```

輸出：

```json
{
  "label": "duplicate"
}
```

## 標記操作（ Annotation Operation ）

比較兩個文本項目，從 `label_options[]` 中選擇一個關係標籤。

## Config 設計（ Config Design ）

- `label_options[]: { name, color? }`
- 待評估是否需對應 `sentence_1_field`、`sentence_2_field`、`sentence_1_label`、`sentence_2_label`。

## UI 設計（ UI Design ）

需並列或上下呈現兩個文本項目，並清楚標示項目 A / B。

## IAA 與品質指標（ IAA and Quality Metrics ）

### 與其他分類任務的關鍵差異

輸出結構與單一項目 + 單一標籤相同，IAA 主指標亦相同。
但有三個項目對任務特有的額外考量：

1. **方向性（Directionality）**：
   `text_a → text_b` 與 `text_b → text_a` 是不同推斷方向
   （如 NLI 中 entailment 不具對稱性），標記者需清楚理解輸入順序的意義
2. **中性類別模糊性（Neutral Class Ambiguity）**：
   `neutral`（NLI）或 `related`（句對分類）等中間類別定義最模糊，
   是最常造成標記者分歧的來源
3. **認知負擔較高**：
   標記者須同時處理兩段文本並進行跨文本推理，疲勞效應比單文本任務更明顯

---

### 標記者間一致性（ Inter-Annotator Agreement, IAA ）

#### 主要指標

| 指標 | 適用情境 | 說明 |
|------|----------|------|
| **Cohen's Kappa（κ）** | 兩位標記者 | 排除隨機一致性，為此任務主指標 |
| **Fleiss' Kappa** | 三位以上標記者 | 多人版本 |
| **Percent Agreement** | 快速初步檢查 | 輔助參考，不排除隨機因素 |
| **Per-class Agreement Rate** | 定位問題類別 | 尤其用於找出 neutral / related 等中間類別的分歧程度 |

#### 為何中性類別需要特別監控？

NLI 三類別範例：
  entailment：定義清楚，標記者通常一致
  contradiction：定義清楚，標記者通常一致
  neutral：定義模糊（「沒有矛盾但也不蘊含」），是主要分歧來源

建議同時報告：
  (1) 整體 κ（含所有類別）
  (2) 排除 neutral 的二元 κ（entailment vs contradiction）
→ 兩者差距大，代表 neutral 定義需加強

#### 建議門檻

| 指標 | 建議門檻 |
|------|---------|
| Cohen's Kappa（整體） | ≥ 0.70（跨文本推理難度高，門檻宜略高）|
| Per-class Agreement Rate | 各類別 ≥ 0.65 |
| 排除中性類別後的 κ | ≥ 0.80（檢驗核心類別是否清楚）|

---

### 標籤品質指標（ Label Quality Metrics ）

#### 類別層級指標

| 指標 | 說明 |
|------|------|
| **Per-class Kappa** | 各關係標籤的單獨 κ 值，定位定義模糊的類別 |
| **Confusion Pair Analysis** | 最常互換的標籤對（如 `neutral` ↔ `entailment`）|
| **中性類別使用率差異** | 各標記者選用中間類別的頻率差異，偵測個人標準不一致 |
| **方向性錯誤率** | 若任務具方向性，標記者混淆 A→B 與 B→A 的比例 |

#### 資料集層級指標

| 指標 | 說明 |
|------|------|
| **Label Distribution** | 各類別樣本比例，監控類別不平衡 |
| **Hard Sample Rate** | 標記者不一致的樣本比例，標記為待審樣本 |
| **Per-annotator Label Distribution** | 各標記者的標籤使用頻率，偵測個人偏差（annotation bias）|

---

### 視覺化建議（ Visualization ）

- **Annotator × Annotator 混淆矩陣**：
  呈現標記者間的標籤交叉分佈，找出高頻混淆對
- **Per-class Kappa 長條圖**：
  橫軸為類別名稱，縱軸為 κ 值，快速定位問題類別
- **Per-annotator Label Distribution 長條圖**：
  比較各標記者的標籤使用頻率，偵測系統性偏差
- **含 / 排除中性類別的 κ 對比圖**：
  量化中性類別對整體 IAA 的影響幅度

---

### 計算時機（ When to Compute ）

| 時間點 | 動作 |
|--------|------|
| 標記開始前 | Pilot round → 重點確認中性類別定義一致、輸入順序（方向性）理解一致 |
| 標記進行中 | 監控 Per-annotator Label Distribution，偵測個別標記者的標準漂移 |
| 標記完成後 | 計算含 / 排除中性類別的 κ 對比，決定是否需修訂 Guideline 或合併類別 |

## 品質控管（ Quality Control ）

待補。

## Label Suite 實作影響（ Label Suite Implementation Impact ）

待補。

## 參考資料（ References ）

- [分類任務總覽](../classification.md)
