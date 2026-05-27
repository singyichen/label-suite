# 單一項目 + 實體關係標籤（ Single Item + Entity Relation ）

## 任務定義（ Task Definition ）

輸入為已預先標記實體的單一文本，標記者判斷指定實體對之間的關係類型。

## 典型任務（ Typical Tasks ）

- 實體關係分類
- 醫療藥物與症狀關係分類
- 組織與人物關係分類

## 輸入結構（ Input Schema ）

```json
{
  "text": "",
  "entity_markers": {
    "start": "[",
    "end": "]"
  }
}
```

## 輸出結構（ Output Schema ）

```json
{
  "relation": ""
}
```

## 指標性範例（ Representative Examples ）

### 範例 1：一般實體關係分類

候選標籤：

```json
["located_in", "works_for", "founded_by", "no_relation"]
```

輸入：

```json
{
  "text": "[台積電] 的總部位於 [新竹]。",
  "entity_markers": {
    "start": "[",
    "end": "]"
  }
}
```

輸出：

```json
{
  "relation": "located_in"
}
```

### 範例 2：醫療藥物與症狀關係分類

候選標籤：

```json
["treats", "causes", "worsens", "no_relation"]
```

輸入：

```json
{
  "text": "醫師開立 [布洛芬] 以緩解病人的 [頭痛]。",
  "entity_markers": {
    "start": "[",
    "end": "]"
  }
}
```

輸出：

```json
{
  "relation": "treats"
}
```

### 範例 3：組織與人物關係分類

候選標籤：

```json
["employed_by", "founded_by", "led_by", "no_relation"]
```

輸入：

```json
{
  "text": "[王小明] 目前擔任 [宏遠科技] 的產品經理。",
  "entity_markers": {
    "start": "[",
    "end": "]"
  }
}
```

輸出：

```json
{
  "relation": "employed_by"
}
```

## 標記操作（ Annotation Operation ）

閱讀包含預標記實體的文本，從 `label_options[]` 中選擇實體對關係。

## Config 設計（ Config Design ）

- `label_options[]: { name, color? }`
- `entity_markers: { start, end }`

## UI 設計（ UI Design ）

需清楚高亮預標記實體，並避免讓標記者誤以為需要新增或修改 span。

## IAA 與品質指標（ IAA and Quality Metrics ）

### 與其他分類任務的關鍵差異

實體已預先標記，標記者只需判斷關係類型，
因此輸出結構與單標籤分類相同，IAA 主指標亦相同。
但有三個領域特有的額外考量：

1. **關係方向性**：`A→B` 與 `B→A` 可能是不同關係
   （如 `employed_by` vs `employer_of`），需在 label_options 中明確定義
2. **no_relation 類別膨脹**：多數實體對無關係，
   導致 no_relation 樣本數遠多於其他類別，會虛抬整體一致率
3. **語境依賴性**：同一實體對在不同句子中可能有不同關係，
   標記者需完整閱讀上下文

---

### 標記者間一致性（ Inter-Annotator Agreement, IAA ）

#### 主要指標

| 指標 | 適用情境 | 說明 |
|------|----------|------|
| **Cohen's Kappa（κ）** | 兩位標記者 | 排除隨機一致性，為此任務主指標 |
| **Fleiss' Kappa** | 三位以上標記者 | 多人版本 |
| **Macro-F1（排除 no_relation）** | 評估有意義關係的品質 | 排除 no_relation 後計算，避免多數類別掩蓋問題 |
| **Percent Agreement** | 快速初步檢查 | 輔助參考，不排除隨機因素 |

#### 為何需要排除 no_relation？

假設資料集中 80% 為 no_relation：
兩位標記者即使隨機標記，no_relation 的同意率仍很高
→ Percent Agreement 會虛高，但有意義的關係品質可能很差
建議同時報告：
(1) 含 no_relation 的整體 κ
(2) 排除 no_relation 的 Macro-F1

#### 建議門檻

| 指標 | 建議門檻 |
|------|---------|
| Cohen's Kappa（整體） | ≥ 0.70（關係分類語境依賴性高，門檻宜略高）|
| Macro-F1（排除 no_relation） | ≥ 0.65 |
| Per-relation Agreement Rate | 各關係類別 ≥ 0.60 |

---

### 標籤品質指標（ Label Quality Metrics ）

#### 類別層級指標

| 指標 | 說明 |
|------|------|
| **Per-relation Kappa** | 各關係類別的單獨 κ 值，找出定義模糊的關係 |
| **Confusion Pair Analysis** | 最常互換的關係對（如 `treats` vs `worsens`），反映標籤邊界不清 |
| **no_relation 誤判率** | 標記者將有意義關係誤判為 no_relation 的比例 |
| **方向性錯誤率** | 若標籤具方向性，標記者選反方向的比例 |

#### 資料集層級指標

| 指標 | 說明 |
|------|------|
| **Relation Distribution** | 各關係類別的樣本比例，監控類別不平衡程度 |
| **no_relation 比例** | 應與任務設計預期一致，過高可能代表任務設計問題 |
| **Hard Sample Rate** | 標記者不一致的樣本比例，標記為待審樣本 |

---

### 視覺化建議（ Visualization ）

- **Annotator × Annotator 混淆矩陣**：
  呈現兩位標記者在各關係類別上的交叉分佈，找出高頻混淆對
- **Per-relation Kappa 長條圖**：
  快速定位 κ 偏低的關係類別，優先修訂標記指引
- **no_relation 排除前後 Kappa 對比**：
  呈現排除 no_relation 後 κ 的變化幅度，量化其影響

---

### 計算時機（ When to Compute ）

| 時間點 | 動作 |
|--------|------|
| 標記開始前 | Pilot round → 重點確認方向性關係定義一致、no_relation 判斷標準一致 |
| 標記進行中 | 監控 no_relation 誤判率，及早發現標記者對模糊關係的處理策略不同 |
| 標記完成後 | 計算 Macro-F1（排除 no_relation），對混淆對高的關係修訂 Guideline |

## 品質控管（ Quality Control ）

待補。

## Label Suite 實作影響（ Label Suite Implementation Impact ）

待補。

## 參考資料（ References ）

- [分類任務總覽](../classification.md)
