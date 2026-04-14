# Label Suite — Config Schema Reference

> **用途：** 作為 SDD 開發的 config 基準。撰寫 task-management、annotation 模組的 spec.md 前，應先對照本文件確認欄位名稱、型別與約束。後端 Pydantic schema 與前端 `WidgetProps.config` 型別皆以本文件為準。
>
> **關聯文件：** [ADR-010 Config-Driven Architecture](../adr/010-config-driven-architecture.md) · [Information Architecture](../product/ia/information-architecture.md)
>
> **版本：** v1（2026-04-04）

---

## 1. 用途與使用方式

本文件定義 Label Suite 五種 task_type 的完整 config JSON 結構。

**誰會用到這份文件：**

| 使用者 | 使用方式 |
|--------|---------|
| spec 作者 | 撰寫 task-management / annotation spec 時，確認 Config Builder UI 需要渲染哪些欄位 |
| 後端工程師 | 實作 Pydantic `TaskConfig` validator，欄位名稱與約束以 § 6 為準 |
| 前端工程師 | 定義 `WidgetProps.config` TypeScript 型別，對應 § 4 共用子結構 |
| AI agent | 生成 spec、prototype、wireframe 時，確認 config 欄位正確性 |

---

## 2. 頂層結構

每份 task config 均為 JSON 物件，包含四個頂層欄位：

```json
{
  "task": {
    "name": "Chinese Sentiment Classification",
    "type": "classification",
    "description": "中文情感極性分類任務（正面 / 負面 / 中立）"
  },
  "annotation": { },
  "evaluation": {
    "metric": "f1_macro",
    "primary_metric": "f1_macro",
    "higher_is_better": true,
    "decimal_places": 4
  },
  "leaderboard": {
    "visible": false,
    "submission_limit_per_day": null,
    "show_scores_after_deadline": true
  }
}
```

### 欄位說明

| 欄位 | 型別 | 必填 | 預設值 | 說明 |
|------|------|:----:|--------|------|
| `task.name` | string | ✅ | — | 任務顯示名稱 |
| `task.type` | enum | ✅ | — | `classification \| scoring \| sentence_pair \| ner \| relation` |
| `task.description` | string | ❌ | `""` | 任務說明，可為空 |
| `evaluation.metric` | string | ✅ | — | 需存在於 § 5 Registry |
| `evaluation.primary_metric` | string | ✅ | — | 通常與 `metric` 相同；多指標時指定主要比較基準 |
| `evaluation.higher_is_better` | boolean | ✅ | — | 決定排行榜排序方向 |
| `evaluation.decimal_places` | integer | ❌ | `4` | 分數顯示小數位數，範圍 1–6 |
| `leaderboard.visible` | boolean | ❌ | `false` | 是否對標記員公開排行榜 |
| `leaderboard.submission_limit_per_day` | integer \| null | ❌ | `null` | `null` = 不限次數 |
| `leaderboard.show_scores_after_deadline` | boolean | ❌ | `true` | 截止後是否顯示分數 |

> `annotation` 欄位依 `task.type` 而異，見 § 3。

---

## 3. 五種 task_type 完整範例

### 3.1 classification — 單句分類

```json
{
  "task": {
    "name": "Chinese Sentiment Classification",
    "type": "classification",
    "description": "中文情感極性三分類"
  },
  "annotation": {
    "labels": [
      { "id": "positive", "display": "正面", "color": "#10B981" },
      { "id": "negative", "display": "負面", "color": "#EF4444" },
      { "id": "neutral",  "display": "中立", "color": "#6B7280" }
    ],
    "allow_multiple": false,
    "require_reason": false
  },
  "evaluation": {
    "metric": "f1_macro",
    "primary_metric": "f1_macro",
    "higher_is_better": true,
    "decimal_places": 4
  },
  "leaderboard": {
    "visible": false,
    "submission_limit_per_day": null,
    "show_scores_after_deadline": true
  }
}
```

**annotation 欄位規則：**

| 欄位 | 型別 | 必填 | 約束 |
|------|------|:----:|------|
| `labels` | LabelItem[] | ✅ | 至少 2 個；`id` 唯一、kebab-case |
| `labels[].id` | string | ✅ | kebab-case，英數字與 `-` |
| `labels[].display` | string | ✅ | UI 顯示文字 |
| `labels[].color` | string | ❌ | HEX 色碼；未填時前端從預設色盤自動指派 |
| `allow_multiple` | boolean | ✅ | `false` = 單選，`true` = 多標籤 |
| `require_reason` | boolean | ❌ | 預設 `false`；是否要求標記員填寫理由 |

**建議 metric：** `f1_macro`、`accuracy`

---

### 3.2 scoring — 單句評分

```json
{
  "task": {
    "name": "Text Quality Scoring",
    "type": "scoring",
    "description": "文本品質評分，1–5 分"
  },
  "annotation": {
    "min": 1,
    "max": 5,
    "step": 1,
    "widget_type": "slider"
  },
  "evaluation": {
    "metric": "krippendorff_alpha",
    "primary_metric": "krippendorff_alpha",
    "higher_is_better": true,
    "decimal_places": 4
  },
  "leaderboard": {
    "visible": false,
    "submission_limit_per_day": null,
    "show_scores_after_deadline": true
  }
}
```

**annotation 欄位規則：**

| 欄位 | 型別 | 必填 | 約束 |
|------|------|:----:|------|
| `min` | number | ✅ | 須小於 `max` |
| `max` | number | ✅ | 須大於 `min` |
| `step` | number | ✅ | 須整除 `(max - min)`；最小值 `0.1` |
| `widget_type` | enum | ✅ | `slider \| radio \| number_input` |

**widget_type 選擇建議：**
- `slider`：連續評分（分數範圍大、step 為小數）
- `radio`：離散評分（分數範圍小、≤ 7 個選項）
- `number_input`：自由輸入（分數範圍大或需精確小數）

**建議 metric：** `krippendorff_alpha`、`pearson`、`spearman`

---

### 3.3 sentence_pair — 句對任務

句對任務支援兩種子模式，由 `annotation.mode` 決定。Config Builder UI 依 `mode` 渲染不同欄位。

#### 分類子模式（相似度 / 蘊含 / 自訂關係）

```json
{
  "task": {
    "name": "Natural Language Inference",
    "type": "sentence_pair",
    "description": "自然語言蘊含三分類"
  },
  "annotation": {
    "mode": "classification",
    "labels": [
      { "id": "entailment",    "display": "蘊含",   "color": "#10B981" },
      { "id": "neutral",       "display": "中立",   "color": "#6B7280" },
      { "id": "contradiction", "display": "矛盾",   "color": "#EF4444" }
    ],
    "allow_multiple": false
  },
  "evaluation": {
    "metric": "f1_macro",
    "primary_metric": "f1_macro",
    "higher_is_better": true,
    "decimal_places": 4
  },
  "leaderboard": {
    "visible": false,
    "submission_limit_per_day": null,
    "show_scores_after_deadline": true
  }
}
```

#### 評分子模式（語意相似度評分）

```json
{
  "task": {
    "name": "Semantic Textual Similarity",
    "type": "sentence_pair",
    "description": "句對語意相似度評分，0–5 分"
  },
  "annotation": {
    "mode": "scoring",
    "min": 0,
    "max": 5,
    "step": 0.5,
    "widget_type": "slider"
  },
  "evaluation": {
    "metric": "pearson",
    "primary_metric": "pearson",
    "higher_is_better": true,
    "decimal_places": 4
  },
  "leaderboard": {
    "visible": false,
    "submission_limit_per_day": null,
    "show_scores_after_deadline": true
  }
}
```

**annotation 欄位規則：**

| 欄位 | 型別 | 必填 | 說明 |
|------|------|:----:|------|
| `mode` | enum | ✅ | `classification \| scoring`；決定 UI 渲染哪組欄位 |
| 分類模式：`labels` | LabelItem[] | ✅ | 同 classification § 3.1 |
| 分類模式：`allow_multiple` | boolean | ✅ | 同 classification § 3.1 |
| 評分模式：`min / max / step / widget_type` | — | ✅ | 同 scoring § 3.2 |

---

### 3.4 ner — 序列標記（NER / 詞性標記）

```json
{
  "task": {
    "name": "Chinese Medical NER",
    "type": "ner",
    "description": "中文醫療文本命名實體識別"
  },
  "annotation": {
    "entity_types": [
      { "id": "disease",  "display": "疾病",   "color": "#EF4444" },
      { "id": "symptom",  "display": "症狀",   "color": "#F59E0B" },
      { "id": "drug",     "display": "藥物",   "color": "#3B82F6" },
      { "id": "anatomy",  "display": "解剖部位", "color": "#8B5CF6" }
    ],
    "allow_overlapping": false
  },
  "evaluation": {
    "metric": "entity_f1",
    "primary_metric": "entity_f1",
    "higher_is_better": true,
    "decimal_places": 4
  },
  "leaderboard": {
    "visible": false,
    "submission_limit_per_day": null,
    "show_scores_after_deadline": true
  }
}
```

**annotation 欄位規則：**

| 欄位 | 型別 | 必填 | 約束 |
|------|------|:----:|------|
| `entity_types` | EntityType[] | ✅ | 至少 1 個；`id` 唯一、UPPER_SNAKE 或 kebab-case |
| `entity_types[].id` | string | ✅ | 英數字，建議全大寫（如 `PER`、`ORG`） |
| `entity_types[].display` | string | ✅ | UI 顯示文字 |
| `entity_types[].color` | string | ✅ | HEX 色碼，**必填**（span highlight 需要顏色） |
| `allow_overlapping` | boolean | ✅ | `false` = 不允許 span 重疊，`true` = 允許 |

**建議 metric：** `entity_f1`

---

### 3.5 relation — 關係抽取

```json
{
  "task": {
    "name": "Biomedical Relation Extraction",
    "type": "relation",
    "description": "生物醫學實體關係抽取（Entity + Relation + Triple）"
  },
  "annotation": {
    "entity_types": [
      { "id": "GENE",     "display": "基因",   "color": "#3B82F6" },
      { "id": "DISEASE",  "display": "疾病",   "color": "#EF4444" },
      { "id": "DRUG",     "display": "藥物",   "color": "#10B981" }
    ],
    "relation_types": [
      { "id": "causes",        "display": "導致",     "description": "基因/藥物導致疾病" },
      { "id": "treats",        "display": "治療",     "description": "藥物治療疾病" },
      { "id": "associated-with", "display": "相關",   "description": "基因與疾病相關" }
    ]
  },
  "evaluation": {
    "metric": "triple_f1",
    "primary_metric": "triple_f1",
    "higher_is_better": true,
    "decimal_places": 4
  },
  "leaderboard": {
    "visible": false,
    "submission_limit_per_day": null,
    "show_scores_after_deadline": true
  }
}
```

**annotation 欄位規則：**

| 欄位 | 型別 | 必填 | 約束 |
|------|------|:----:|------|
| `entity_types` | EntityType[] | ✅ | 至少 1 個；同 NER § 3.4 |
| `relation_types` | RelationType[] | ✅ | 至少 1 個；`id` 唯一、kebab-case |
| `relation_types[].id` | string | ✅ | kebab-case |
| `relation_types[].display` | string | ✅ | UI 顯示文字 |
| `relation_types[].description` | string | ❌ | 選填說明，輔助標記員理解關係定義 |

**建議 metric：** `triple_f1`（Entity pair + Relation type 三者完全匹配才計分）

---

## 4. 共用子結構定義

### TypeScript Interface（前端 WidgetProps 對應）

```ts
// shared/types/task.ts

/** classification / sentence_pair(cls) 的標籤項目 */
interface LabelItem {
  id: string       // kebab-case，英數字與 -
  display: string  // UI 顯示文字
  color?: string   // HEX 色碼，選填
}

/** ner / relation 的實體類型 */
interface EntityType {
  id: string       // 建議全大寫（PER、ORG、LOC）
  display: string
  color: string    // HEX 色碼，必填
}

/** relation 的關係類型 */
interface RelationType {
  id: string       // kebab-case
  display: string
  description?: string
}
```

### Pydantic BaseModel（後端對應）

```python
# app/schemas/config.py

class LabelItem(BaseModel):
    id: str = Field(pattern=r'^[a-z0-9-]+$')
    display: str
    color: str | None = None  # HEX 色碼

class EntityType(BaseModel):
    id: str = Field(pattern=r'^[A-Z0-9_a-z-]+$')
    display: str
    color: str  # 必填

class RelationType(BaseModel):
    id: str = Field(pattern=r'^[a-z0-9-]+$')
    display: str
    description: str | None = None
```

---

## 5. Evaluation Metrics Registry

後端 `metrics/registry.py` 需註冊以下所有 metric id。config 中使用的 `evaluation.metric` 若不在此表中，Pydantic 驗證將拒絕建立任務。

| metric id | 適用 task_type | 描述 | IAA 用途 |
|-----------|--------------|------|---------|
| `f1_macro` | classification, sentence_pair(cls) | Macro-averaged F1 | ✅ |
| `accuracy` | classification, sentence_pair(cls) | 準確率 | — |
| `krippendorff_alpha` | scoring, sentence_pair(scoring) | 適用連續尺度的 IAA 係數 | ✅ |
| `pearson` | scoring, sentence_pair(scoring) | 皮爾森相關係數 | ✅ |
| `spearman` | scoring, sentence_pair(scoring) | 斯皮爾曼相關係數 | ✅ |
| `entity_f1` | ner | Entity span 完全匹配 F1 | ✅ |
| `triple_f1` | relation | (subject, relation, object) 三元完全匹配 F1 | ✅ |

> **IAA 達標標準（來自 IA）：** Kappa / Alpha / F1 ≥ 0.8 方可從 Dry Run 進入 Official Run。

---

## 6. 驗證規則摘要（Pydantic 約束）

| 規則 | 欄位 | 約束 |
|------|------|------|
| task type enum | `task.type` | 必須是五種之一 |
| labels 最小數量 | `annotation.labels`（classification / sentence_pair cls） | 長度 ≥ 2 |
| entity_types 最小數量 | `annotation.entity_types` | 長度 ≥ 1 |
| relation_types 最小數量 | `annotation.relation_types` | 長度 ≥ 1 |
| id 唯一性 | `labels[].id`、`entity_types[].id`、`relation_types[].id` | 同陣列內不得重複 |
| scoring step 整除 | `annotation.step` | `(max - min) % step == 0` |
| metric 存在性 | `evaluation.metric` | 必須在 § 5 Registry 中 |
| sentence_pair mode | `annotation.mode` | 必須為 `classification \| scoring` |
| color 格式 | 所有 `color` 欄位 | HEX 格式 `#RRGGBB` 或 `#RGB` |
| entity color 必填 | `entity_types[].color` | ner / relation 中不得為 null |
