# Issue #180 W7 — NLP 研究方法審查：IAA／試標抽樣／審核一致性／Gold／仲裁

> 產出者：`nlp-research-advisor`（階段三 W7 工作流）
> 範圍：以研究方法論檢查驗收規劃中的 IAA gate、試標抽樣策略、審核一致性構造、gold/ground truth 產生規則、仲裁規則五個主題；**只碰 IAA 最小 gate contract**，資料集分析模組完整體驗（`016`／`017` 圖表、UI）不在審查範圍。
> 邊界聲明：本文件**不建議新增產品功能**；發現的 spec 缺漏一律標注為「建議事項」交由主 agent 於階段四 triage，不自行裁決正典優先序。
> 正典依據：依 D4 決議，以 `013`／`014`／`015`／`reviewer-model-redesign.md` 為準；PRD/IA/story-map/impact-map 對應段落視為已知過期，不在本文件重複引用。

---

## 1. 試標抽樣設計（Dry Run Sampling）

**結論：設計合理，但需標注統計限制——建議 W3/traceability-matrix 提出的「2 筆共同樣本 × 3 標記員」測資明文只作為 gate 機制驗證，不得暗示 IAA 統計有效性。**

### 1.1 現況與方法論限制

- `docs/product/e2e/issue-180/w3-playwright-qa.md:177` 建議的最小合成資料集為「試標 2 筆共同樣本 × 3 標記員；正式標記剩餘固定資料；R01/R02 至少一筆刻意分歧、R03 仲裁」；`docs/product/e2e/issue-180/traceability-matrix.md:25` 同樣寫「E2E：3 標記員 × 2 共同樣本試標」。
- 逐 output type 檢視 `OUTPUT_TYPE_IAA_REGISTRY`（`specs/dataset/017-dataset-analysis-detail/spec.md:73-95`），n=2 對每一種指標都有結構性問題：
  - `single_label`／`multi_label`（Krippendorff's Alpha, nominal，`spec.md:77-78`）：n=2 時可觀察分歧值域極窄，只要 2 筆中有 1 筆不一致，Alpha 值會劇烈跳動（甚至可能落在負值），無法反映任務真實的一致性分布，屬 sampling-theoretic 上典型的「小樣本 kappa/alpha 不穩定」問題。
  - `single_dim`／`multi_dim`（ICC(2,1)，`spec.md:79-80`）：ICC 估計需要足夠的受評對象（item）變異度支撐分母，n=2 時 ICC 估計方差極大，實務上不具參考性。
  - `entity_recognition`／`relation_identification`（pairwise span/triple F1，`spec.md:81-82`）：F1 本身在 n=2 時對單一邊界差異極度敏感，1 個 span 誤差可讓分數在 0/0.5/1 之間跳動。
  - `sequence_tagging`（token-level Alpha，`spec.md:83`）：雖然 token 數量遠大於樣本數（分母是 token 而非樣本），但 2 個樣本能覆蓋的 token 型態有限，仍不足以代表任務全域的一致性。
- 已內建的統計穩健性保護機制（供對照，證明 spec 本身**有**小樣本意識，只是保護對象是「標記員完成樣本數」而非「試標樣本總數」）：
  - `IAA_SMALL_SAMPLE_THRESHOLD = 5`（`specs/dataset/017-dataset-analysis-detail/spec.md:95`）：完成標記員數 `n < 5` 時顯示「小樣本估計」中性警示，**不阻擋閘門**。
  - `ANNOTATOR_MIN_SAMPLE_THRESHOLD`（`specs/dataset/017-dataset-analysis-detail/spec.md:413,525`）：標記員完成樣本數低於此閾值時顯示「資料不足，暫不評估」並略過風險等級計算。
  - 這兩個門檻警示的是「標記員個人的樣本量」，**不是**「一輪試標的樣本總數」——換言之，spec 對試標輪次本身要不要抽多少筆才具統計意義**沒有明文最低建議值**（僅有 `014` FR-010d 的合法性下限 `sampling_value >= 1`，`specs/task-management/014-task-detail/spec.md:520`，這是「表單合法值」而非「統計有效值」）。

### 1.2 Spec 是否有最低抽樣建議

- 逐一檢索 `013`／`014`／`015`／`017` 全文，**未發現任何「建議最低試標抽樣筆數」的常數或條文**（僅有 `sampling_value >= 1 且 < dataset_total` 的表單驗證下限，`specs/task-management/014-task-detail/spec.md:520,534`）。此為 spec 現況的方法論缺口，但**不建議在本輪新增產品功能**（依邊界約束）——標注為建議事項供階段四 triage：是否需要在 `014` FR-010o 唯讀摘要區加一則「樣本數過小時 IAA 為描述性估計、非統計顯著」的提示文案（UI 措辭層級，非新功能）。

### 1.3 對驗收文件的建議措辭

給主 agent 整合進驗收文件的具體建議文字（可直接引用或改寫）：

> 本驗收情境使用的合成資料集（試標 2 筆共同樣本 × 3 標記員）**僅用於驗證 IAA gate 機制本身能否正確運作**（指標可計算、可讀取、可依門檻自動轉換狀態、可被 PL 判讀並決定退回或進入正式回合），**不構成、也不得被引用為對任一 IAA 指標統計有效性（statistical validity）的驗證**。n=2 樣本下，`OUTPUT_TYPE_IAA_REGISTRY`（`specs/dataset/017-dataset-analysis-detail/spec.md:73-95`）中的 Krippendorff's Alpha／ICC(2,1)／pairwise F1 等指標估計值方差過大，不具備小樣本統計推論意義；本驗收文件對這些指標的斷言範圍僅限於「數值存在、範圍合法、gate 判定邏輯正確」，不斷言「該數值代表任務真實一致性水準」。若未來需要以 Demo Paper 形式呈現 IAA 結果，須使用具統計意義的樣本數（一般建議 ≥ 20–30 筆，依指標類型與信賴區間需求而定），此非本輪驗收範圍。

---

## 2. IAA 指標與 8-key output types

**結論：`OUTPUT_TYPE_IAA_REGISTRY` 作為單一權威來源的設計合理、涵蓋 8 型完整；驗收層級的「指標可用、負責人可判讀」斷言應鎖定在最小 gate contract，不涉入分析頁面內部呈現。**

### 2.1 現況：逐 output type 指標定義（`specs/dataset/017-dataset-analysis-detail/spec.md:73-95`）

| Output Type | 主指標（gate 用） | 門檻常數 | 出處 |
|---|---|---|---|
| `single_label` | Krippendorff's Alpha (nominal) ⭐️；輔助 Cohen's Kappa（2 人）/ Fleiss' Kappa | `IAA_THRESHOLD_SINGLE_LABEL = 0.80` | `spec.md:77` |
| `multi_label` | 逐標籤 Alpha (nominal) → 巨集平均 ⭐️ | `IAA_THRESHOLD_MULTI_LABEL = 0.80` | `spec.md:78` |
| `single_dim` | ICC(2,1) two-way random absolute ⭐️ | `IAA_THRESHOLD_SINGLE_DIM_RECOMMENDED = 0.75`（gate 用） | `spec.md:79` |
| `multi_dim` | 逐維度 ICC(2,1) → 巨集平均 ⭐️ | `IAA_THRESHOLD_MULTI_DIM_STRICT = 0.80`（gate 用） | `spec.md:80` |
| `entity_recognition` | Pairwise Span F1 strict ⭐️ | `IAA_THRESHOLD_ENTITY_RECOGNITION_STRICT = 0.80` | `spec.md:81` |
| `relation_identification` | Pairwise Triple-level F1 ⭐️ | `IAA_THRESHOLD_RELATION_IDENTIFICATION = 0.75` | `spec.md:82` |
| `sequence_tagging` | Token-level Alpha (nominal) ⭐️ | `IAA_THRESHOLD_TOKEN = 0.75` | `spec.md:83` |
| `free_text` | 不計自動 IAA，排除於分母 | — | `spec.md:84` |

- 複合達標判定：`IAA_COMPOSITE_GATE_RULE = pass ⟺ x == y AND y > 0`（全部達標，非多數決）、`IAA_COMPOSITE_BADGE_FORMAT = "{x}/{y} 達標 · {N} 型排除"`、`IAA_GATE_EXCLUDED_TYPES = free_text`（`spec.md:91-93`）。
- 這是方法論上正確的設計：每一型都採用該資料型態學界慣用的一致性統計量（nominal 分類用 Alpha/Kappa、interval/ratio 量表用 ICC、span/triple 抽取任務用 F1、序列標記用 token-level Alpha），且 `free_text` 明確排除自動 IAA（改由審核員質性評估），符合「不能對開放式生成文本套用集合式一致性指標」的方法論常識。
- `task-management/014` 對 `OUTPUT_TYPE_IAA_REGISTRY` 採唯讀引用（`specs/task-management/014-task-detail/spec.md:530` FR-010o），未另建第二份定義，符合單一事實來源原則，避免 014/017 兩處指標定義漂移。

### 2.2 驗收時「指標可用、負責人可判讀」的最小斷言應檢查什麼

依 issue 邊界（第 38 條）「只驗指標可用、可判讀、可退回或進正式」與 W3 的 `task-detail-stage-flow.spec.ts` 既有覆蓋（`docs/product/e2e/issue-180/w3-playwright-qa.md:58,62-64`），建議最小斷言集合三層：

1. **數值存在性**：試標全部提交後，`waiting_iaa_confirmation` 狀態下 PL 可讀取到每個 `outputs[]` 型別對應的一個非空指標值（不要求驗證其計算是否數學正確——那是 `017` 模組職責，本輪排除）。
2. **範圍合法性**：讀到的達標徽章格式符合 `IAA_COMPOSITE_BADGE_FORMAT`（`x/y 達標`，`y` 不得為 0 且不得因 `free_text` 誤算入分母，`spec.md:92-93`）；尚無資料時顯示 `IAA_PENDING_BADGE_FORMAT`（`—/{y} 待完成 Dry Run`，`spec.md:94`），不得誤顯示 `0/{y}`。
3. **達標徽章邏輯**：PL 依徽章可做出「確認進正式」或「拒絕回 draft」兩種操作，且系統依 ADR-022 transition table 正確轉換狀態（`docs/adr/022-task-state-machine-location.md:83-91`）。

### 2.3 建議給主 agent 的具體文字

> IAA gate 驗收情境的斷言範圍鎖定在「狀態機層級的最小 contract」：驗證 PL 在 `waiting_iaa_confirmation` 狀態下能看到非空的逐型指標與 `x/y` 達標徽號、能據此確認進入正式回合或退回 `draft`。**不驗證** `OUTPUT_TYPE_IAA_REGISTRY` 各指標公式本身的計算正確性——此為 `dataset/017` 模組職責，依 issue #180 第 0 節邊界排除於本輪之外，僅信任 `017` spec 定義的 registry 作為 contract（`specs/dataset/017-dataset-analysis-detail/spec.md:73-95`）。

---

## 3. 審核一致性與 dispute 衍生規則

**結論：規則設計嚴謹、可預測性高（推導式而非儲存式，避免與 ReviewUnit 狀態機漂移），但「如何穩定構造 dispute」對不同 output type 有明確且各異的操作方式，驗收資料設計若未對齊會導致測資不觸發預期狀態——建議在驗收文件中明文列出逐型「觸發 dispute 的最小條件」。**

### 3.1 核心規則來源

- **ReviewUnit 五態機**（`REVIEW_UNIT_STATUS = pending | approved | modified | disputed | finalized`，`specs/annotation/015-annotation-workspace/spec.md:56`）：狀態推導依 FR-051（`spec.md:641`）——比對的是「審核員答案 vs 標記員（annotator）原答案」，不是審核員彼此比對：
  - 所有已提交審核員答案皆與標記員答案相同 → `n < min_reviewers` 為 `approved`、`n ≥ min_reviewers` 為 `finalized`。
  - **任一**已提交審核員答案與標記員答案存在差異 → `n < min_reviewers` 為 `modified`、`n ≥ min_reviewers` 為 `disputed`。
  - `min_reviewers` 預設 `MIN_REVIEWERS_DEFAULT = 1`（`spec.md:57`，015 資料模型層固定值），可設定值規則見 `MIN_REVIEWERS_RULE = 整數且 >= 1`（`specs/task-management/014-task-detail/spec.md:51`）。
- **差異比對規則**（FR-052，`specs/annotation/015-annotation-workspace/spec.md:642`）：
  - `multi_label` / `entity_recognition` / `relation_identification`：以合併鍵做順序無關**集合**比對。
  - `sequence_tagging`：逐 token 位置比對。
  - `multi_dim`：逐維度比對。
  - `single_label` / `single_dim` / `free_text`：單值比對。
  - **關鍵條款**：「`single_dim` 與 `multi_dim` 一律採**嚴格相等**，不得套用 `DIM_CONSENSUS_TOLERANCE`——容差回答的是『兩位標記員是否算有共識』，審核單位問的是『審核員是否更動了此答案』，任何幅度的更動皆為差異」（`spec.md:642`）。
  - **已知落差**（spec 自述，非本文件新發現）：「`CONSENSUS_MERGE_KEYS` 定義 `entity_recognition` 合併鍵為 `start + end + type`，但 CompactAnswer 不攜帶位置資訊，原型實作以 `text + type` 為鍵」（`spec.md:642`）——這代表在 prototype 層，若只改變 span 邊界（`start`/`end`）而不改變 `text` 或 `type`，**不會**被判定為差異，測資設計必須改變擷取文字或型別才能穩定觸發 dispute。
- **DisputeItem 推導**（FR-059，`spec.md:664-670`）：逐次讀取推導、不實體化儲存（`DISPUTE_ITEM_SOURCE = derived-from-review-diffs`，`spec.md:59`）；`reviewer_values` 以 `reviewer_id` 為鍵僅保存**與標記員不同**的審核員值——與標記員一致的審核員不出現於其中。
- **多數決收斂**（FR-061.4，`spec.md:680`；常數 `DISPUTE_CONVERGENCE_RULE = per-item-strict-majority`，`spec.md:60`）：N 位已提交審核員對單一爭議項的嚴格多數（`> N/2`）自動收斂，未出現於 `reviewer_values` 的審核員視為對 `annotator_value` 的隱含同意票；`N=1`（不成多數）、偶數平手、全數分歧三種情境**不收斂**，維持待仲裁。

### 3.2 逐 output type「如何穩定觸發 dispute」的構造方式（供驗收測資設計）

以追溯矩陣既定的 `min_reviewers = 2`、R01/R02 兩位審核員為前提（`traceability-matrix.md:29`「R01/R02 刻意分歧 → dispute 自動生成」）：

- **通用原則**：`min_reviewers = 2` 時，只要 R01、R02 兩人**其中至少一人**的答案與標記員原答案不同、且兩人答案彼此不同，就會形成 1 票 vs 1 票的平手（`N=2` 時嚴格多數需要 `> 1`，1:1 無法收斂）——保證停留在 `disputed`，不需要仲裁前就被自動收斂掉。若只有一人偏離而另一人與標記員相同，仍會判定為 `disputed`（FR-051 判斷式看的是「任一審核員存在差異」），但爭議項只會有一個 `reviewer_id` 的偏離值，收斂上仍是 1 票（隱含票）vs 1 票，同樣不收斂，一樣需要仲裁。**兩種構造方式皆可用**，但若要驗收 UI 上明確呈現「R01/R02 各自不同意見」，建議採用「兩人皆與標記員原答案不同、且彼此也不同」的版本，較貼近教授回饋原文「不一致時把不一致項過濾聯集」的語意（`docs/product/reviewer-model-redesign.md:14-15`）。
- **`single_label` / `multi_label`**：R01、R02 任一方勾選與標記員原答案不同的標籤即可（集合比對，`FR-052`）。
- **`single_dim` / `multi_dim`**：因嚴格相等、無容差，R01、R02 給出**任何不同的數值**（哪怕只差 1 個量表刻度）即觸發差異——不需要刻意拉大差距，但仍建議給出有意義的差距（例如相差 ≥ 2 個刻度）以便驗收畫面上可視化辨識，避免與 UI 呈現的四捨五入巧合造成人工判讀混淆。
- **`entity_recognition`**：**必須改變擷取文字（`text`）或型別（`type`）**才能在目前 prototype 實作下觸發差異；僅调整 span 邊界（`start`/`end`）不會被判定為差異（3.1 節「已知落差」）。驗收測資若想測試邊界分歧情境，需另外參照 `dataset/017` 的 `BOUNDARY_ERROR_TYPES`（`spec.md:117`），但那屬於 dataset 分析模組排除範圍，不在本輪 IAA 最小 gate 驗收內。
- **`relation_identification`**：合併鍵為 `subject + relation + object`，R01/R02 任一方變更三元組中任一欄位即觸發差異。
- **`sequence_tagging`**：逐 token 位置比對，R01/R02 任一方對至少 1 個 token 給出不同標籤即觸發差異。
- **`free_text`**：`free_text` 不計自動 IAA（`spec.md:84`）；但審核層級的差異比對仍是「單值比對」（FR-052 涵蓋 `free_text`），R01/R02 修正文字內容不同即可觸發差異——但要注意 `free_text` 的**IAA gate 分母排除**與**審核單位差異比對**是兩件事，前者排除、後者不排除，驗收文件應避免混淆二者。

### 3.3 建議給主 agent 的具體文字

> 構造 R01/R02「刻意不同的審核結果」時，依 `specs/annotation/015-annotation-workspace/spec.md:641-642`（FR-051、FR-052）：(1) 判定基準是「審核員答案 vs 標記員原答案」而非審核員互相比對；(2) `single_dim`/`multi_dim` 採嚴格相等、無容差，任何數值差異即觸發，但建議測資取有明顯視覺差距的值；(3) `entity_recognition` 在目前 prototype 實作下**僅改變 span 邊界不會觸發差異**，須改變擷取文字或型別（spec 自述的已知落差，`spec.md:642`）；(4) `min_reviewers = 2` 情境下，只要兩位審核員意見不完全一致（含一人與標記員相同、另一人不同的情況），依 `DISPUTE_CONVERGENCE_RULE`（`spec.md:60`，`> N/2` 嚴格多數）會形成 1:1 平手、不會被自動收斂，可穩定停留在 `disputed` 供 R03 仲裁驗收使用。

---

## 4. Gold/ground truth 與 Data Fairness

**結論：「official_run 才產 gold」為現行正典且已在 015 v4.0.0 落地，對驗收情境的影響是「dry_run 情境不得斷言任何 gold 產出」；標記員防洩漏驗收在 prototype 層有明確可驗（DOM 不渲染）與不可驗（真正的後端隔離）邊界，且既有測試檔案自述已知的測試強度缺口。**

### 4.1 Gold 產生規則現況

- `specs/annotation/015-annotation-workspace/spec.md:64`（`GOLD_STATUS` 常數定義）：「**v4.0.0 廢止**：dry_run 不再產出樣本層級 gold，本常數與 `GoldRecord` 一併失效」。
- `docs/product/reviewer-model-redesign.md:27`（決策②「gold 來源」）：「**dry_run 不產 gold**：試標的產出是 IAA 與每位標記員的被修改率；gold 只在正式標記產生」。
- `docs/product/reviewer-model-redesign.md:256`（資料模型變更表）：「`GoldRecord`：**縮限**。只在 `official_run` 產生。`dry_run` 改以『每位標記員的被修改率』衡量品質」。
- 三處引文一致，確認「official_run 才產 gold」是**現行、已落地**的正典規則，非未來計畫。

### 4.2 對驗收情境的影響

- 驗收文件涉及 dry_run 的情境（試標啟動、IAA gate、dry_run 審核）**不得**出現任何「gold 已產生」「gold 值已確認」之類的斷言或文案期待；`dry_run` reviewer 工作區已於 v4.0.0 整段移除共識/gold 仲裁介面（`ws-review-stats`／`ws-review-consensus-badge`／`ws-review-apply-majority`／`ws-review-annotator-list`／`ws-review-set-draft`／`ws-review-source-text` 六個元件於兩種 `run_type` 下皆須為 0 個 DOM 節點，`spec.md:839` SC-004L）。
- 涉及 official_run 審核的情境，`ReviewUnit` 達到 `finalized` 狀態時即隱含產出 gold（`docs/product/reviewer-model-redesign.md:75`「正式標記時即成為 gold」），但 015 spec 本身**未見**一條 FR 明確定義「`finalized` ReviewUnit 的最終值即寫入 `GoldRecord`」的資料層契約細節（僅存在於 reviewer-model-redesign 決策文件的敘述層級，`spec.md` 全文檢索 `GoldRecord` 只出現於已廢止常數的說明文字，`spec.md:64`）——這是一個**建議事項**，標注給主 agent：驗收文件若要斷言「official_run 定案後產生 gold」，目前可引用的最直接正典依據是 `reviewer-model-redesign.md:75,256`（產品決策文件），而非 015 spec 本身的獨立 FR 編號；若需要更嚴謹的 spec 級別依據，建議列入階段四 triage（`[Task]` 或 spec 補完事項），不阻擋本輪驗收文件撰寫。

### 4.3 防洩漏驗收：可驗與不可驗的邊界

- 既有測試 `design/prototype/tests/annotation/annotation-workspace-data-fairness.spec.ts` 的做法：
  - 驗證未指定角色（`field_role_map` 未映射）的 metadata 欄位（如 `Title`／`Source ID`／`Source URL`／`ID`／`article_id`／`angle`）永不進入 annotator-facing DOM（`annotation-workspace-data-fairness.spec.ts:25-49`）。
  - 驗證 `output` 角色的預填值（如 `gold_label`）只出現在其對應的答案控制元件內，不作為獨立的「答案欄位」外洩到內容區（`annotation-workspace-data-fairness.spec.ts:52-63`）。
  - reviewer 模式下同一組欄位重測一次（`annotation-workspace-data-fairness.spec.ts:66-79`）。
  - **測試檔案自述的已知強度缺口**（`annotation-workspace-data-fairness.spec.ts:10-19`，程式碼註解）：「none of the 13 seed TaskProfiles map a field containing actual gold/ground-truth CONTENT as unassigned...The closest available leak-prevention proxy in the current fixtures is unassigned record METADATA...This is flagged in the QA report as a fixture gap for a stronger negative control (a profile with an unmapped field that holds real answer content) if one is desired later.」——即現行測試驗證的是「metadata 不外洩」，尚未有一個測資情境是「真正的隱藏正解內容被故意設為 unassigned field」，因此無法驗證「若有人真的把 ground-truth 答案放進未映射欄位，系統是否會洩漏」這個更強的負向情境。
- **可驗（prototype 層）**：DOM 層級的欄位可見性——`field_role_map` 驅動的渲染規則使未映射欄位不出現在 annotator-facing DOM，這是可用 Playwright 直接斷言的靜態渲染邏輯。
- **不可驗（prototype 層，需正式全端 E2E）**：
  1. 後端 API 回應本身是否夾帶隱藏欄位（prototype 無網路層，無法驗證 API payload 層級的洩漏，僅能驗證前端渲染層）。
  2. 標記員之間的資料隔離是否為真正的存取控制（現行機制是 localStorage bucket key 命名空間隔離，`w3-playwright-qa.md:133-137` 已確認；這是**資料模型層的鍵值隔離**，不是**存取權限層**的隔離——同一瀏覽器 context 內任何一個 Page 理論上都能讀到其他 bucket key 的內容，只是 UI 目前沒有提供讀取路徑）。
  3. 若真的存在 4.2 節提到的「未映射欄位承載真實正解內容」情境，目前 13 組種子 TaskProfile 都沒有涵蓋（同上已知缺口）。

### 4.4 Constitution 對應

- `specs/_governance/constitution.md:76-83`（Principle III, Data Fairness, NON-NEGOTIABLE）明文：「Test-set answers must never be exposed to annotators」「Gold/test items must be indistinguishable from regular items in annotator-facing UI and metadata」。
- 現行 `annotation-workspace-data-fairness.spec.ts` 驗證的正是這條原則的 DOM 渲染層落地；但 4.3 節的已知缺口意味著**目前的測試覆蓋只能佐證「已知的洩漏路徑被封住」，不能佐證「Constitution III 已被完整驗證」**——這個差距本身不構成違憲（憲章未要求測試覆蓋率），但驗收文件若聲稱「Data Fairness 已通過驗收」，措辭上需要精確到「DOM 渲染層防洩漏機制已驗證，後端存取控制與強負向情境測資屬正式全端 E2E 範圍」。

### 4.5 建議給主 agent 的具體文字

> Gold 產生規則：驗收文件中任何 dry_run 情境**不得**斷言 gold 產出（`specs/annotation/015-annotation-workspace/spec.md:64`）；official_run 定案（`finalized`）情境可依 `docs/product/reviewer-model-redesign.md:75,256` 斷言「等同產出 gold」，但此依據來自產品決策文件而非 015 spec 獨立 FR，如需更嚴謹依據建議列入階段四 spec 補完 triage。
>
> 防洩漏驗收：延續 `annotation-workspace-data-fairness.spec.ts` 既有做法（斷言未映射 metadata 欄位不進 DOM、output-role 預填值不外洩為獨立答案欄位），並在驗收文件中明確標示分層邊界——prototype 層驗證的是「DOM 渲染層」防洩漏，不驗證「後端 API 層」或「存取控制層」；後者待正式全端 E2E。若時間允許，建議在階段四 triage 中提出（供決定是否納入）：補一組「未映射欄位承載真實正解內容」的負向控制測資，是既有測試檔案自身已記錄的強度缺口（`annotation-workspace-data-fairness.spec.ts:10-19`），非本輪新發現。

---

## 5. 仲裁規則

**結論：仲裁票決規則（逐項 A/B、嚴格多數收斂、非當事人資格）設計嚴謹且方法論上合理（避免仲裁者對自己參與的爭議進行仲裁，符合避免利益衝突的一般研究倫理原則）；`min_reviewers` 可設定性直接影響驗收情境能否穩定觸發「需要仲裁」而非「自動收斂」，已於第 3 節說明構造方式，此節聚焦仲裁後的同步檢查點。**

### 5.1 仲裁規則來源（FR-059~061）

- **FR-059**（`specs/annotation/015-annotation-workspace/spec.md:664-670`）：`DisputeItem` 逐項推導契約——輸入為「該審核單位之標記員已提交答案與**所有**審核員已提交決策」；項目識別為 `outKey × 合併鍵`；`annotator_value` 取標記員側值，`reviewer_values` 以 `reviewer_id` 為鍵僅保存差異側值；拆解粒度沿用 FR-052（集合型逐鍵一項、`sequence_tagging` 逐 token、`multi_dim` 逐維度、單值型至多一項）。
- **FR-060**（`spec.md:671-675`）：仲裁資格 = 「該審核員於名冊具 `can_arbitrate` 旗標」**AND**「該審核員於該審核單位沒有自己的審核提交（非當事人）」，兩條件同時成立；`annotation-list` reviewer 視圖對符合資格者將列動作由 `編輯` 換為 `仲裁`。
- **FR-061**（`spec.md:676-681`）：工作區逐項仲裁版面——
  1. 仲裁者只能「選邊」（A=標記員原值／B=審核員差異值，相同差異值的審核員合併為同一 B 選項），不渲染修正控件與 ✕/✓ 決策按鈕（避免仲裁者變成「第三份新答案」的來源，破壞 FR-053 已收斂的「一卡一標記員」語意）。
  2. 送出時逐項寫入 `votes[]`（`arbiter_id`、`choice`、`voted_at`）與 `finalized_value` / `finalized_by`，未解決爭議項全部裁定前不得送出。
  3. 仲裁狀態以**審核單位**定址（`task_id × run_type × annotator_id × sample_id`），不寫入任何單一 reviewer bucket——「爭議屬於單位本身，任何仲裁者的定案必須對該單位的所有檢視者可見」（`spec.md:679`）。
  4. 逐項多數決收斂先於仲裁介入：`DISPUTE_CONVERGENCE_RULE`（`> N/2` 嚴格多數，`spec.md:60,680`），已收斂項不進爭議池、不渲染 A/B 列。
  5. 狀態機延伸（修訂 FR-051）：`disputed` 非終態，所有爭議項解決（收斂或仲裁定案）後推導為 `finalized`。

### 5.2 仲裁後狀態/進度/紀錄同步的驗收檢查點

依 5.1 條款與既有測試覆蓋（`docs/product/e2e/issue-180/w3-playwright-qa.md:90-96`），建議驗收文件包含以下同步斷言：

1. **狀態同步**：R03 完成全部爭議項裁定後，`annotation-list` reviewer 視圖中該審核單位列的 `REVIEW_UNIT_STATUS` 需由 `disputed` 轉為 `finalized`，且 `編輯`/`仲裁` 動作按鈕需相應更新（FR-060 的仲裁資格判定基於「該列狀態」，`finalized` 後不應再顯示 `仲裁` 入口）。
2. **進度同步**：task-detail 概覽的完成度統計（`v2.7.2` 同源要求，`specs/STATUS.md` changelog）需反映該筆審核單位已定案，不得與 annotation-list 顯示的筆數落差（追溯矩陣節點 16「跨頁狀態一致性」，`traceability-matrix.md:33`）。
3. **紀錄同步**：`task-detail-review-history.spec.ts` 已示範「仲裁結果回到 task-detail 稽核紀錄」的跨頁同步驗證（`docs/product/e2e/issue-180/w3-playwright-qa.md:96`，`renders arbitration line after reviewer line for finalized entries`）——驗收文件應沿用此既有 pattern，斷言仲裁事件出現在歷程時序中「標記員 → 審核員 → 仲裁」的正確順序（FR-050，`spec.md:640`），而非只驗證最終值正確。
4. **仲裁者身分可追溯**：`finalized_by` 需為真實仲裁者 ID，比照 FR-050「不得使用字面值 `current`」的既有規則精神（雖 FR-050 條文本身談的是 `actor_id`，但同一份 spec 對「真實身分可追溯」的一致性要求應延伸適用於仲裁紀錄）。

### 5.3 `min_reviewers` 可設定性對情境的影響

- `min_reviewers` 為任務層級可設定值（`MIN_REVIEWERS_RULE = 整數且 >= 1`，`specs/task-management/014-task-detail/spec.md:51`），與 015 資料模型層的固定預設值 `MIN_REVIEWERS_DEFAULT = 1`（`specs/annotation/015-annotation-workspace/spec.md:57`）並存——014 是使用者可調整的設定欄位，015 是尚未串接該設定前的資料模型預設，驗收情境需明確採用 014 的 `min_reviewers` 設定值驅動 015 的判定式，而非誤用 015 常數表的字面預設值 1（若驗收環境仍是純 prototype、未真正讀取 014 設定值驅動 015 判定，需在文件中標注此串接現況，避免驗收斷言假設了尚未存在的串接）。
- **`min_reviewers = 1`**：沒有多數決空間（`N=1` 屬 FR-061.4 明文「不成多數」情境），標記員與審核員一旦不一致就直接進爭議池，等同單一終審員模式——此設定下 dispute 觸發最容易（審核員與標記員意見不同即必進爭議池），但無法測試「多審核員多數決收斂」路徑。
- **`min_reviewers` 為偶數（如 2）**：如第 3 節所述，容易產生平手不收斂，適合穩定觸發需要仲裁的情境，但也代表「偶數必平手」並非通用結論——需視實際差異票數分布而定（例如 4 位審核員中 3 位一致、1 位不同，仍會收斂）。
- **`min_reviewers` 為奇數 ≥ 3**：多數決收斂的機率提高，若驗收目的是「保證觸發仲裁」，測資需刻意構造「全數分歧」或「未過半」的票數分布（第 3.2 節已說明），不能只靠隨機分歧值。
- 建議驗收文件在 fixture 設計章節明確記錄本輪選用的 `min_reviewers` 數值與其對應的收斂/不收斂機率推導依據，避免日後改變 `min_reviewers` 設定值導致既有仲裁情境意外變成自動收斂而使測試失效卻無人發覺。

### 5.4 建議給主 agent 的具體文字

> 仲裁規則驗收依 `specs/annotation/015-annotation-workspace/spec.md:664-681`（FR-059~061）：斷言範圍應包含（1）仲裁者資格判定（`can_arbitrate` 旗標 AND 非當事人，FR-060）；（2）仲裁版面只提供 A/B 選邊、不提供修正控件（FR-061.1）；（3）送出後 `votes[]`／`finalized_value`／`finalized_by` 正確寫入且以審核單位定址、對所有檢視者可見（FR-061.3）；（4）仲裁完成後 `disputed → finalized` 的狀態轉換、`annotation-list` 動作按鈕更新、task-detail 進度統計同步、`task-detail-review-history` 歷程時序正確呈現「標記員 → 審核員 → 仲裁」四項同步檢查點。`min_reviewers` 設定值需與觸發仲裁所需的票數分布（第 3.2、5.3 節）對齊記錄在 fixture 設計章節，避免日後設定變動使既有仲裁情境意外被多數決自動收斂。

---

## 6. 摘要與待主 agent 裁決事項

### 6.1 各項結論摘要

| # | 主題 | 結論 |
|---|---|---|
| 1 | 試標抽樣設計 | 設計合理但需標注統計限制；驗收文件應明文聲明「n=2 僅驗 gate 機制、不驗統計有效性」 |
| 2 | IAA 指標與 8-key output types | Registry 涵蓋完整、方法論正確；驗收斷言應鎖定「數值存在／範圍合法／達標邏輯」三層最小 gate，不涉入 017 計算正確性 |
| 3 | 審核一致性與 dispute 衍生 | 規則嚴謹（推導式、避免狀態漂移）；逐 output type 觸發 dispute 的構造方式已明確列出，`entity_recognition` 有已知落差需注意 |
| 4 | Gold/ground truth 與 Data Fairness | 「official_run 才產 gold」為現行正典，三處引文一致；防洩漏驗收在 prototype 層可驗 DOM 渲染、不可驗後端與存取控制層，既有測試自述強度缺口 |
| 5 | 仲裁規則 | 票決與非當事人資格設計合理；`min_reviewers` 數值需與觸發仲裁的票數分布對齊記錄，避免日後設定漂移使情境失效 |

### 6.2 需主 agent 裁決或列入階段四 triage 的事項

1. **（建議事項，非阻擋）** `014`／`015`／`017` 全文未見「建議最低試標抽樣筆數」的統計有效性門檻常數，僅有表單合法值下限 `sampling_value >= 1`。是否要在 `014` FR-010o 唯讀摘要區加一則「樣本數過小時 IAA 為描述性估計」提示文案，屬 UI 措辭層級的小型建議，不阻擋本輪驗收文件撰寫，建議列入階段四 `[Enhancement]` 或 `[Docs]` 候選。
2. **（建議事項，非阻擋）** `official_run 定案即產生 gold` 目前僅見於 `reviewer-model-redesign.md`（產品決策文件），015 spec 本身未見獨立 FR 明確定義該資料層契約細節（`GoldRecord` 目前僅以「已縮限」描述存在於決策文件，spec 正文查無新 FR 編號）。若驗收文件或未來 Demo Paper 需要更嚴謹的 spec 級別依據，建議列入階段四 spec 補完 triage；本輪驗收文件可暫以決策文件（`reviewer-model-redesign.md:75,256`）作為引用依據。
3. **（建議事項，非阻擋）** `annotation-workspace-data-fairness.spec.ts` 自述的測資強度缺口（缺少「未映射欄位承載真實正解內容」的負向控制情境）是既有已知限制，非本輪新發現；是否要在正式全端 E2E 階段補上，留待階段四 triage 決定是否納入。
4. **（提醒事項）** `entity_recognition` 審核差異比對在 prototype 層僅比對 `text + type`、不含位置（`start`/`end`），這是 015 spec 自述的「已知落差」（`spec.md:642`），非本文件新發現的 bug；若驗收測資誤以「只改變 span 邊界」來構造 entity_recognition 的 dispute 情境，將無法觸發預期的 `disputed` 狀態——建議主 agent 在驗收文件的 fixture 設計章節明確採用「改變擷取文字或型別」的構造方式（已於本文件第 3.2 節提供）。
5. **（研究誠信提醒，非本文件新發現，供 Demo Paper 撰寫時參照）** `docs/product/reviewer-model-redesign.md:289` 已自我揭露「anchoring bias 必須在論文誠實揭露」——審核員是看過標記員答案後才判斷（FR-053 seed = 標記員本人答案），這個「一致」不是嚴格的獨立雙標一致率，不能拿來佐證資料品質。本文件在此重申此提醒的方法論重要性：驗收文件若涉及 IAA 相關措辭，應避免使用「reviewer 與 annotator 一致率」暗示雙盲獨立標記的一致性語意；`reviewer-model-redesign.md:310-316` 亦記錄了一項「抽樣盲審模式」的研究顧問建議（供未來校正 anchoring bias，目前**預設不做**），本輪驗收文件不需納入，僅供 Demo Paper 討論限制章節時參照。

---

**文件狀態**：`DONE_WITH_CONCERNS`——五項主題結論皆為「設計合理」，但攜帶 4 項建議事項（不阻擋）與 1 項提醒事項需主 agent 於整合驗收文件時明確採納對應措辭或轉交階段四 triage。
