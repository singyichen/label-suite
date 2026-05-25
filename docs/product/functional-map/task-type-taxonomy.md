# 任務類型分類法（Task Type Taxonomy）

## 三層結構

```
層 1 任務類別（task_category）   分類 / 回歸 / 序列 / 生成 / 混合
層 2 輸入類型（input_type）      單一項目 / 項目對
層 3 輸出類型（output_type）     單一標籤 / 多標籤 / 單維度 / 多維度 / span / …
                                      ↓
                        組合決定對應的 config 設定欄位
```

> 「整篇文章」與「句子／段落」視為相同輸入類型（`single_item`），差異只在資料長度，不影響 task config 結構。

---

## 1. 分類（Classification）

### 單一項目（`single_item`）

| 輸出類型（output_type） | 說明 | 典型任務 | 範例輸入 | 範例輸出 | Config 設定 |
|------------------------|------|----------|----------|----------|-------------|
| 單一標籤（`single_label`） | 從選項中選一個，含二元 | 文本分類、情感分析、主題分類 | 「蘋果發表了新款 iPhone。」 | 科技 | `label_options[]: { name, color? }` |
| 多標籤（`multi_label`） | 可同時選多個 | 多標籤文本分類、內容標記 | 「這部電影有暴力和恐怖情節。」 | [暴力, 恐怖] | `label_options[]: { name, color? }` |
| 實體關係標籤（`entity_relation`） | 對預標記實體對分類關係；輸入為含實體標記的單一文本，非兩段獨立文本（與 `item_pair` 的區別） | 實體關係分類（Relation Classification） | 「[台積電] 創辦人是 [張忠謀]。」 | 創辦關係 | `label_options[]: { name, color? }`, `entity_markers: { start, end }` |

### 項目對（`item_pair`）

| 輸出類型（output_type） | 說明 | 典型任務 | 範例輸入 | 範例輸出 | Config 設定 |
|------------------------|------|----------|----------|----------|-------------|
| 單一標籤（`single_label`） | 從選項中選一個 | NLI（自然語言推斷）、文本蘊含識別 | S1:「小明養了一隻貓。」 S2:「小明有寵物。」 | entailment（蘊含） | `label_options[]: { name, color? }` |
| 多標籤（`multi_label`） | 可同時選多個 | MLTC（多標籤文本分類） | S1:「這家餐廳環境很好，服務親切。」 S2:「這間咖啡廳氣氛舒適，店員熱情。」 | [主題相似, 情感相同, 語氣相同] | `label_options[]: { name, color? }` |

> `entity_markers` 定義預標記實體的起訖標記，例如 `{ start: "[", end: "]" }`；也可用 XML tag、括號或其他明確成對標記格式。

---

## 2. 回歸（Regression）

> 可設定 1 至 N 個維度，每個維度獨立指定名稱、最小值／最大值／間距（min / max / step）。

### 單一項目（`single_item`）

| 輸出類型（output_type） | 說明 | 典型任務 | 範例輸入 | 範例輸出 | Config 設定 |
|------------------------|------|----------|----------|----------|-------------|
| 單維度（`single_dim`） | 單一連續分數 | 情感強度評估、可讀性評分 | 「這部電影讓我感動落淚。」 | 強度: 0.85 | `dimension: { name, min, max, step }` |
| 多維度（`multi_dim`） | 多個獨立分數軸 | 情感維度評估（Valence-Arousal）、多維度品質評估 | 「這部電影讓我感動落淚。」 | V: 0.8, A: 0.6 | `dimensions[]: { name, min, max, step }` |

### 項目對（`item_pair`）

| 輸出類型（output_type） | 說明 | 典型任務 | 範例輸入 | 範例輸出 | Config 設定 |
|------------------------|------|----------|----------|----------|-------------|
| 單維度（`single_dim`） | 相似度分數 | 語義相似度（STS）、文本相關性評分 | S1:「央行宣布升息」 S2:「銀行調高利率」 | 相似度: 0.92 | `dimension: { name, min, max, step }` |
| 多維度（`multi_dim`） | 多個獨立句對評分軸 | 多維度句對相似度評估 | S1:「央行宣布升息」 S2:「銀行調高利率」 | 語義: 0.92, 句法: 0.65, 主題: 0.88 | `dimensions[]: { name, min, max, step }` |

---

## 3. 序列（Sequence）

### 單一項目（`single_item`）

| 輸出類型（output_type） | 說明 | 典型任務 | 範例輸入 | 範例輸出 | Config 設定 |
|------------------------|------|----------|----------|----------|-------------|
| Token 分類（`token_class`） | Token 級標籤 | POS tagging、Chunking（BIO 格式）、NER（token-level, IOB2 標記格式） | 「台積電創辦人張忠謀退休。」 | 台積電/NNP 創辦人/NN 張忠謀/NNP 退休/VV | `tag_options[]: { name, color? }`, `scheme: IOB2\|BIOES` |
| 邊界偵測（`boundary`） | 切分邊界 | Segmentation（斷詞／斷句）、Chunking（邊界切分）、段落切分 | 「台積電創辦人退休。」 | 台積電｜創辦人｜退休｜。 | `boundary_type: sentence\|word\|phrase\|paragraph` |
| 多類型標記區間（`multi_type_span`） | Span + 多類型標籤 | NER（span-level, 直接標記起訖位置）、Trigger Detection | 「台積電創辦人張忠謀宣布退休。」 | [台積電→ORG, 張忠謀→PER] | `entity_types[]: { name, color }`, `scheme: IOB2\|BIOES`（用於資料匯出格式，非介面操作格式） |
| 單類型標記區間（`single_type_span`） | 只標 span 位置 | Aspect Term Extraction、Keyword Extraction、Claim Span | 「這家餐廳服務很差，但環境不錯。」 | [服務, 環境] | `span_label_field`, `allow_span_add/delete` |
| 區間加極性（`span_with_polarity`） | Span + 情感標籤 | ABSA（Aspect-Based Sentiment Analysis） | 「這家餐廳服務很差，但環境不錯。」 | [(服務, 負面), (環境, 正面)] | `span_label_field`, `allow_span_add/delete`, `polarity_options[]: { name, color? }` |
| 關係三元組（`relation_triple`） | 實體 + 關係 + Triple | OpenIE、Relation Extraction（NER+RE） | 「台積電供應晶片給輝達。」 | (台積電, 供應, 輝達) | `entity_types[]: { name, color }`, `relation_types[]: { name, color }` |

> 同一任務因標注介面設計不同，可對應不同 `output_type`。

---

## 4. 生成（Generation）

### 單一項目（`single_item`）

| 輸出類型（output_type） | 說明 | 典型任務 | 範例輸入 | 範例輸出 | Config 設定 |
|------------------------|------|----------|----------|----------|-------------|
| 自由文字（`free_text`） | 開放式文字輸出 | Summarization（摘要）、Question Answering（問答）、Translation（翻譯）、Paraphrase（改寫） | 「台積電今日宣布與輝達合作，共同開發下一代 AI 晶片，預計明年量產。」 | 台積電與輝達合作開發 AI 晶片，明年量產。 | `max_length`, `show_reference_to_annotator`, `evaluation_reference_required` |

> 生成任務的「評估」通常需搭配另一個標注任務（e.g. 人工評分回歸）或自動指標（ROUGE / BERTScore）。
> `show_reference_to_annotator` 控制標注者是否可見參考輸出；`evaluation_reference_required` 控制系統評估是否需要 reference。

---

## 5. 混合（Mixed）

> 尚未展開（e.g. 同一筆資料同時做分類 + 序列標記）

---

## 合法組合總表

| 任務類別（task_category） | 輸入類型（input_type） | 輸出類型（output_type） | 典型任務 | Config 設定 |
|--------------------------|----------------------|------------------------|----------|-------------|
| 分類（classification） | 單一項目（single_item） | 單一標籤（single_label） | 文本分類、情感分析、主題分類 | `label_options[]: { name, color? }` |
| 分類（classification） | 單一項目（single_item） | 多標籤（multi_label） | 多標籤文本分類、內容標記 | `label_options[]: { name, color? }` |
| 分類（classification） | 單一項目（single_item） | 實體關係標籤（entity_relation） | 實體關係分類（含實體標記的單一文本） | `label_options[]: { name, color? }`, `entity_markers: { start, end }` |
| 分類（classification） | 項目對（item_pair） | 單一標籤（single_label） | NLI、文本蘊含識別 | `label_options[]: { name, color? }` |
| 分類（classification） | 項目對（item_pair） | 多標籤（multi_label） | 句對 MLTC（多標籤分類） | `label_options[]: { name, color? }` |
| 回歸（regression） | 單一項目（single_item） | 單維度（single_dim） | 情感強度評估、可讀性評分 | `dimension: { name, min, max, step }` |
| 回歸（regression） | 單一項目（single_item） | 多維度（multi_dim） | 情感維度評估（Valence-Arousal）、多維度品質評估 | `dimensions[]: { name, min, max, step }` |
| 回歸（regression） | 項目對（item_pair） | 單維度（single_dim） | 語義相似度（STS）、文本相關性評分 | `dimension: { name, min, max, step }` |
| 回歸（regression） | 項目對（item_pair） | 多維度（multi_dim） | 語義相似度 + 句法相似度 + 主題一致性評估 | `dimensions[]: { name, min, max, step }` |
| 序列（sequence） | 單一項目（single_item） | Token 分類（token_class） | POS tagging、Chunking（BIO 格式）、NER（token-level, IOB2 標記格式） | `tag_options[]: { name, color? }`, `scheme: IOB2\|BIOES` |
| 序列（sequence） | 單一項目（single_item） | 邊界偵測（boundary） | Segmentation（斷詞／斷句）、Chunking（邊界切分）、段落切分 | `boundary_type: sentence\|word\|phrase\|paragraph` |
| 序列（sequence） | 單一項目（single_item） | 多類型標記區間（multi_type_span） | NER（span-level, 直接標記起訖位置）、Event Detection | `entity_types[]: { name, color }`, `scheme: IOB2\|BIOES`（用於資料匯出格式，非介面操作格式） |
| 序列（sequence） | 單一項目（single_item） | 單類型標記區間（single_type_span） | Aspect Term Extraction、Keyword Extraction、Claim Span | `span_label_field`, `allow_span_add/delete` |
| 序列（sequence） | 單一項目（single_item） | 區間加極性（span_with_polarity） | ABSA | `span_label_field`, `allow_span_add/delete`, `polarity_options[]: { name, color? }` |
| 序列（sequence） | 單一項目（single_item） | 關係三元組（relation_triple） | OpenIE、Relation Extraction | `entity_types[]: { name, color }`, `relation_types[]: { name, color }` |
| 生成（generation） | 單一項目（single_item） | 自由文字（free_text） | Summarization、Question Answering、Translation、Paraphrase | `max_length`, `show_reference_to_annotator`, `evaluation_reference_required` |
