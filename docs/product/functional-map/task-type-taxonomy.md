# 任務類型分類法（ Task Type Taxonomy ）

## 三層結構

```
層 1 任務類別（ task_category ）   分類 / 回歸 / 序列 / 生成 / 混合
層 2 輸入類型（ input_type ）      單一項目 / 項目對
層 3 輸出類型（ output_type ）     單一標籤 / 多標籤 / 單維度 / 多維度 / entity_recognition / …
                                      ↓
                        組合決定對應的 config 設定欄位
```

> 本節是 **task type taxonomy**（任務 category／input／output 的組合），不是 `multi_label` 的 **label taxonomy**。標籤樹可遞迴建立多層，但受平台資源上限約束。
>
> 「整篇文章」與「句子／段落」視為相同輸入類型（ `single_item` ），差異只在資料長度，不影響 task config 結構。

> 本次同步遷移顯示名稱與技術識別碼：`span` → `entity_recognition`、`relation_triple` → `relation_identification`、`token_class` → `sequence_tagging`。舊 key 與 `entity_relation`、`boundary` 均已自合法任務類型移除，不提供相容別名。

---

## 1. 分類（ Classification ）

### 單一項目（ `single_item` ）

| 輸出類型（ output_type ） | 說明 | 典型任務 | 範例輸入 | 範例輸出 | Config 設定 |
|------------------------|------|----------|----------|----------|-------------|
| 單一標籤（ `single_label` ） | 從選項中選一個，含二元 | 文本分類、情感分析、主題分類 | 「蘋果發表了新款 iPhone。」 | 科技 | `label_options[]: { name, color? }` |
| 多標籤（ `multi_label` ） | 從階層標籤樹的葉節點同時選取多個 | 多標籤文本分類、內容標記 | 「這部電影有暴力和恐怖情節。」 | `content / safety / violence`、`content / safety / horror` | `label_options[]: LabelOptionNode` |

### 項目對（ `item_pair` ）

| 輸出類型（ output_type ） | 說明 | 典型任務 | 範例輸入 | 範例輸出 | Config 設定 |
|------------------------|------|----------|----------|----------|-------------|
| 單一標籤（ `single_label` ） | 從選項中選一個 | NLI（自然語言推斷）、文本蘊含識別 | S1:「小明養了一隻貓。」 S2:「小明有寵物。」 | entailment（蘊含） | `label_options[]: { name, color? }` |
| 多標籤（ `multi_label` ） | 從階層標籤樹的葉節點同時選取多個 | MLTC（多標籤文本分類） | S1:「這家餐廳環境很好，服務親切。」 S2:「這間咖啡廳氣氛舒適，店員熱情。」 | `comparison / topic / similar`、`comparison / sentiment / same` | `label_options[]: LabelOptionNode` |

> `entity_markers` 定義預標記實體的起訖標記，例如 `{ start: "[", end: "]" }`；也可用 XML tag、括號或其他明確成對標記格式。
> `entities` 的 `color` 為必填，因 span 標記需視覺區分；`relation_types` 為語意類型標籤的純字串陣列（ tag-list ），不支援 `color`——關係觸發詞由標記者從文本中反白選取，不在 config 中預定義；`label_options`、`tag_options`、`polarity_options` 的 `color` 為選填。

#### Multi-label Label Taxonomy

`multi_label.label_options` 使用相同節點型別遞迴組成樹：

```yaml
label_options:
  - id: content
    name: 內容
    children:
      - id: safety
        name: 安全
        children:
          - id: violence
            name: 暴力
            color: "#6366F1"
          - id: horror
            name: 恐怖
            color: "#14B8A6"
max_selections: 0
```

- `id` 是全樹唯一且不隨顯示名稱修改的穩定識別；`name` 可在不同分支重複。
- 每一層節點都可獨立選取；branch 的 checkbox 與展開／收合控制分離，選取 parent 不會自動選取 children。選取狀態以完整 root-to-selected-node ID path 區分，但預覽中的已選 chip 只顯示被選節點名稱。
- 資料模型不固定層數，但 MVP 限制深度最多 8 層（root 為第 1 層，完整 path 長度最多 8）、總節點最多 500 個，節點 `id`／`name` 各最多 100 字元。
- 階層式來源資料的 path segment 是全樹唯一 node ID；自動建樹時先以該 ID 作初始名稱。若不同分支需顯示同名 leaf，使用不同 ID 並在 Visual 將 `name` 設為相同文字。
- 一層樹仍是合法的 flat taxonomy；既有 flat config 與 `string[]` 範例資料只作匯入正規化相容。
- Task Detail、Annotation Workspace 與 Dataset Quality 的顯示、提交與統計契約留待 014、015、017 後續同步。

---

## 2. 回歸（ Regression ）

> 可設定 1 至 N 個維度，每個維度獨立指定名稱、最小值／最大值／間距（ min / max / step ）。

### 單一項目（ `single_item` ）

| 輸出類型（ output_type ） | 說明 | 典型任務 | 範例輸入 | 範例輸出 | Config 設定 |
|------------------------|------|----------|----------|----------|-------------|
| 單維度（ `single_dim` ） | 單一連續分數 | 情感強度評估、可讀性評分 | 「這部電影讓我感動落淚。」 | 強度: 0.85 | `va_dimensions[]: { name, min, max, step }`（單一元素） |
| 多維度（ `multi_dim` ） | 多個獨立分數軸 | 情感維度評估（ Valence-Arousal ）、多維度品質評估 | 「這部電影讓我感動落淚。」 | V: 0.8, A: 0.6 | `va_dimensions[]: { name, min, max, step }` |

### 項目對（ `item_pair` ）

| 輸出類型（ output_type ） | 說明 | 典型任務 | 範例輸入 | 範例輸出 | Config 設定 |
|------------------------|------|----------|----------|----------|-------------|
| 單維度（ `single_dim` ） | 相似度分數 | 語義相似度（ STS ）、文本相關性評分 | S1:「央行宣布升息」 S2:「銀行調高利率」 | 相似度: 0.92 | `va_dimensions[]: { name, min, max, step }`（單一元素） |
| 多維度（ `multi_dim` ） | 多個獨立句對評分軸 | 多維度句對相似度評估 | S1:「央行宣布升息」 S2:「銀行調高利率」 | 語義: 0.92, 句法: 0.65, 主題: 0.88 | `va_dimensions[]: { name, min, max, step }` |

---

## 3. 序列（ Sequence ）

### 單一項目（ `single_item` ）

| 輸出類型（ output_type ） | 說明 | 典型任務 | 範例輸入 | 範例輸出 | Config 設定 |
|------------------------|------|----------|----------|----------|-------------|
| Sequence Tagging 序列標註（ `sequence_tagging` ） | Token 級標籤 | POS tagging、Chunking（ BIO 格式 ）、NER（ token-level, IOB2 標記格式 ） | 「台積電創辦人張忠謀退休。」 | 台積電/NNP 創辦人/NN 張忠謀/NNP 退休/VV | `tag_options[]: { name, color? }`, `scheme: IOB2\|BIOES`（ 決定合法 tag 集合，為介面標記格式 ） |
| Entity Recognition 實體辨識（ `entity_recognition` ） | 選取文字起訖位置，可搭配類型標籤或極性標籤 | NER（ span-level ）、Aspect Term Extraction、Keyword Extraction、ABSA | 「這家餐廳服務很差，但環境不錯。」 | [服務, 環境] 或 [(服務, 負面), (環境, 正面)] | 見下方 `entity_recognition` Config 說明 |
| Relation Identification 關係識別（ `relation_identification` ） | 以既有實體建立關係觸發詞、語意類型與 Triple；與 `entity_recognition` 組合時可同時編輯實體 | OpenIE、Relation Extraction、NER+RE（組合模式） | 「台積電供應晶片給輝達。」 | (台積電, 供應, 輝達) type:supplier | `relation_types[]: string`（語意類型標籤） |

#### Entity Recognition（`entity_recognition`）Config 說明

`entity_recognition` 統一了三種原本獨立的 output_type，透過 config 欄位組合決定標注行為：

| Config 欄位 | 型別 | 說明 |
|------------|------|------|
| `entities[]` | `{ name, color }[]` | 可標記的實體／區間類型清單。只有 1 項時為單類型標記，多項時為多類型標記。**與 `polarity_options` 互斥，不可同時設定。** |
| `polarity_options[]` | `{ name, color? }[]` | 極性標籤清單（ e.g. 正面／負面／中立 ）。設定後，每個 span 必須選擇一個極性。**與 `entities` 互斥，不可同時設定。** |
| `allow_overlapping` | `bool` | 是否允許 span 重疊（ 僅 `entities` 模式適用 ） |
| `scheme` | `IOB2 \| BIOES` | 資料匯出格式（ 非介面操作格式，僅 `entities` 模式適用 ） |

**Config 組合與對應場景：**

| 設定方式 | 等效舊 output_type | 典型任務 | 範例輸出 |
|---------|-------------------|----------|----------|
| `entities` 有 1 項 | `single_type_span` | Aspect Term Extraction、Keyword Extraction、Claim Span | [服務, 環境] |
| `entities` 有多項 | `multi_type_span` | NER（ span-level ）、Trigger Detection | [台積電→ORG, 張忠謀→PER] |
| `polarity_options` 存在 | `span_with_polarity` | ABSA（ Aspect-Based Sentiment Analysis ） | [(服務, 負面), (環境, 正面)] |

> 同一任務因標記介面設計不同，可對應不同 `output_type`（ e.g. NER 可選 Sequence Tagging `sequence_tagging` 或 Entity Recognition `entity_recognition` ）。

#### Relation Identification（`relation_identification`）Config 說明

`relation_identification` 的標記流程區分**關係觸發詞**與**語意類型**兩個概念：

| 概念 | 來源 | 說明 | 範例 |
|------|------|------|------|
| 關係觸發詞（relation） | 標記者從文本中反白選取的文字區間 | 表達關係的具體用字，不需預定義 | 「位於」「引發」「導致」「治療」 |
| 語意類型（relation_type） | 標記者從下拉選單選擇，選項來自 config `relation_types[]` | 關係的抽象語意分類 | `bodyLocation`、`causes`、`possibleTreatment` |

> 同一語意類型可對應多種觸發詞（e.g. `causes` ← 「引發」「導致」「造成」「誘發」），將觸發詞歸納至語意類型可支援跨同義詞的聚合分析與 IAA 計算。

| Config 欄位 | 型別 | 說明 |
|------------|------|------|
| `relation_types[]` | `string[]` | 語意類型標籤清單，作為標記介面中「類型」下拉選單的選項 |
| `source_output` | `string`（選填） | 僅在 `entity_recognition + relation_identification` 組合模式輸出為 `entity_recognition`；E1/E2 取自同一任務中可建立／修改的 span 實體。純 `relation_identification` 不輸出此欄位，E1/E2 取自資料集既有實體且僅供關係標記使用 |

**預覽模式：**

- 純 `relation_identification`：只顯示資料集既有實體的唯讀高亮、循序關係建構器與三元組列表；不得顯示實體類型選擇器、建立／刪除實體或其他 Span 編輯控制項。
- `entity_recognition + relation_identification`：顯示整合預覽，允許先建立／修改實體，再以該些實體建立關係三元組。

**標記資料結構：**

每筆三元組同時記錄觸發詞區間與語意類型：

```json
{
  "entity1": { "text": "糖尿病", "start": 0, "end": 2 },
  "relation": { "text": "引發", "start": 16, "end": 17 },
  "relation_type": "causes",
  "entity2": { "text": "視網膜病變", "start": 18, "end": 22 }
}
```

## 4. 生成（ Generation ）

### 單一項目（ `single_item` ）

| 輸出類型（ output_type ） | 說明 | 典型任務 | 範例輸入 | 範例輸出 | Config 設定 |
|------------------------|------|----------|----------|----------|-------------|
| 自由文字（ `free_text` ） | 開放式文字輸出 | Summarization（摘要）、Question Answering（問答）、Translation（翻譯）、Paraphrase（改寫） | 「台積電今日宣布與輝達合作，共同開發下一代 AI 晶片，預計明年量產。」 | 台積電與輝達合作開發 AI 晶片，明年量產。 | `max_length` |

> 生成任務的「評估」通常需搭配另一個標記任務（ e.g. 人工評分回歸 ）或自動指標（ ROUGE / BERTScore ）。
> Step 1 指定的 Evidence 會顯示於 Input 上方；指定 Output 即代表以該欄位資料預填回答框，未指定 Output 時回答框保持空白。系統評估層的 `evaluation_reference_required` 不屬於 `free_text` output config。

---

## 5. 混合（ Mixed ）

> 混合任務由 ADR-029 的 `outputs[]` composition 組成，不另建立固定的 `mixed` output type。

---

## 合法組合總表

| 任務類別（ task_category ） | 輸入類型（ input_type ） | 輸出類型（ output_type ） | 典型任務 | Config 設定 |
|--------------------------|----------------------|------------------------|----------|-------------|
| 分類（ classification ） | 單一項目（ single_item ） | 單一標籤（ single_label ） | 文本分類、情感分析、主題分類 | `label_options[]: { name, color? }` |
| 分類（ classification ） | 單一項目（ single_item ） | 多標籤（ multi_label ） | 多標籤文本分類、內容標記 | `label_options[]: LabelOptionNode` |
| 分類（ classification ） | 項目對（ item_pair ） | 單一標籤（ single_label ） | NLI、文本蘊含識別 | `label_options[]: { name, color? }` |
| 分類（ classification ） | 項目對（ item_pair ） | 多標籤（ multi_label ） | 句對 MLTC（多標籤分類） | `label_options[]: LabelOptionNode` |
| 回歸（ regression ） | 單一項目（ single_item ） | 單維度（ single_dim ） | 情感強度評估、可讀性評分 | `va_dimensions[]: { name, min, max, step }`（單一元素） |
| 回歸（ regression ） | 單一項目（ single_item ） | 多維度（ multi_dim ） | 情感維度評估（ Valence-Arousal ）、多維度品質評估 | `va_dimensions[]: { name, min, max, step }` |
| 回歸（ regression ） | 項目對（ item_pair ） | 單維度（ single_dim ） | 語義相似度（ STS ）、文本相關性評分 | `va_dimensions[]: { name, min, max, step }`（單一元素） |
| 回歸（ regression ） | 項目對（ item_pair ） | 多維度（ multi_dim ） | 語義相似度 + 句法相似度 + 主題一致性評估 | `va_dimensions[]: { name, min, max, step }` |
| 序列（ sequence ） | 單一項目（ single_item ） | Sequence Tagging 序列標註（ `sequence_tagging` ） | POS tagging、Chunking（ BIO 格式 ）、NER（ token-level, IOB2 標記格式 ） | `tag_options[]: { name, color? }`, `scheme: IOB2\|BIOES`（ 決定合法 tag 集合，為介面標記格式 ） |
| 序列（ sequence ） | 單一項目（ single_item ） | Entity Recognition 實體辨識（ `entity_recognition` ） | NER（ span-level ）、Aspect Term Extraction、Keyword Extraction、ABSA | `entities[]: { name, color }` 或 `polarity_options[]: { name, color? }`（ 見 `entity_recognition` Config 說明 ） |
| 序列（ sequence ） | 單一項目（ single_item ） | Relation Identification 關係識別（ `relation_identification` ） | OpenIE、Relation Extraction | `relation_types[]: string`（語意類型標籤） |
| 生成（ generation ） | 單一項目（ single_item ） | 自由文字（ free_text ） | Summarization、Question Answering、Translation、Paraphrase | `max_length` |
