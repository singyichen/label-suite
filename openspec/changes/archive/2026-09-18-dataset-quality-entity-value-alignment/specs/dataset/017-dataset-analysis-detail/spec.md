> 正典：`specs/dataset/017-dataset-analysis-detail/spec.md`（v3.0.0 → v3.0.1，**PATCH**，版本判定理由見 proposal.md Impact 節）。issue #783 第 3 點。
>
> **為何既有 ID 放在 `## ADDED Requirements` 底下**：FR-008 與 FR-025 皆已存在於正典，但**不在** `openspec/specs/dataset/017-dataset-analysis-detail/spec.md` 衍生檢視內。對它們下 `## MODIFIED` 會在 archive 階段以 header not found 硬中止，而 `openspec validate` 對此零訊號。gate 4 回寫正典時 MUST **原地改寫** FR-008 與 FR-025，不得新增第二條同 ID 條文。兩條情境沿用正典既有 SC-003、SC-014，**不配發任何新 AC 編號**。
>
> **為何 FR-039 放在 `## MODIFIED Requirements` 底下**：FR-039 已收錄於衍生檢視，因此以 `## MODIFIED` 帶入全文；除第 1 點末尾新增的一句釐清外，條文與情境 AC-3.16 逐字沿用衍生檢視現行內容（維護者 2026-09-18 裁定，issue #783 Q9）。

## ADDED Requirements

### Requirement: FR-008 統計總覽固定顯示共用指標，實體欄位與 SHARED_METRICS 逐字一致

統計總覽 tab MUST 固定顯示 `SHARED_METRICS`（Sentence 數量、Token 數量、完成率、已提交樣本、平均標記時間）。

承載這些數值的 `SharedMetrics` 實體 MUST 恰好包含 `SHARED_METRICS` 的五個 key 作為欄位，欄名與常數逐字相同：`sentence_count`、`token_count`、`completion_rate`、`submitted_sample_count`、`avg_annotation_time_per_sentence`。MUST NOT 以 `overall_completion_rate` 或其他別名表示完成率，MUST NOT 增減欄位。

#### Scenario: SC-003 共用指標五項在任何輸出類型組合下皆可見

- **GIVEN** 任一 `outputs[]` 組合的任務，且已有提交的標記
- **WHEN** 使用者進入統計總覽 tab
- **THEN** 畫面固定顯示 `SHARED_METRICS` 五項指標
- **AND** 其資料來源 `SharedMetrics` 恰含 `sentence_count`、`token_count`、`completion_rate`、`submitted_sample_count`、`avg_annotation_time_per_sentence` 五個欄位，不含 `overall_completion_rate`

### Requirement: FR-025 標記員風險等級恰為三值，資料不足以 null 與布林旗標表示

系統 MUST 依 `ANNOTATOR_RISK_LEVELS` 規則為每位標記員計算並顯示風險等級（`normal | watch | high_risk`）。

`AnnotatorRiskAssessment.risk_level` 的值域 MUST 恰為 `ANNOTATOR_RISK_LEVELS` 三值，MUST NOT 以第四個值表示資料不足。依 FR-026 略過風險評估的標記員，其 `risk_level` MUST 為 null 且 `insufficient_data` MUST 為 true；其餘標記員的 `insufficient_data` MUST 為 false 且 `risk_level` MUST 為三值之一。兩欄 MUST NOT 出現互相矛盾的組合。

#### Scenario: SC-014 資料足夠顯示三值之一，資料不足以 null 表示

- **GIVEN** 一位標記員已完成樣本數大於等於 `ANNOTATOR_MIN_SAMPLE_THRESHOLD`，另一位低於該門檻
- **WHEN** 系統產生兩人的風險評估
- **THEN** 前者 `insufficient_data` 為 false，`risk_level` 為 `normal`、`watch`、`high_risk` 其中之一，畫面顯示對應風險等級
- **AND** 後者 `insufficient_data` 為 true、`risk_level` 為 null，畫面顯示「資料不足，暫不評估」且不顯示任何風險等級

## MODIFIED Requirements

### Requirement: FR-039 IAA 閘門語意跨模組唯一權威來源

本規格為 IAA（Inter-Annotator Agreement）閘門語意的唯一權威來源（SSoT）；`task-management-014`、`annotation-015` 及其他模組對 IAA 閘門行為的呈現須以本條為準，不得另行定義或推導出不同語意。核心語意如下：

1. **顧問性、非阻擋**：IAA 為顧問性指標，`waiting_iaa_confirmation`（或等義）狀態語意為「軟性警告 + 需人工確認」，非硬性閘門；α 未達 `OUTPUT_TYPE_IAA_REGISTRY` 門檻時系統必須顯示明顯警示，但不得阻擋使用者進入正式標記（承接並升格 FR-034 之既有語意為跨模組正典）。**本點僅適用於 `OUTPUT_TYPE_IAA_REGISTRY` 中實際登錄門檻的輸出類型**；屬 `IAA_UNCALIBRATED_TYPES` 者沒有門檻可比較，MUST NOT 顯示任何「未達門檻」警示，亦 MUST NOT 因此被視為未通過（其呈現規則見 FR-043）。此例外 MUST NOT 被解讀為放寬阻擋語意——未校準型別同樣不阻擋流程。**IAA 計算尚未結束不屬本點（v3.0.1 釐清）**：最新試標回合的 IAA 仍在計算中或計算失敗時尚無任何 IAA 結果，不是本點所稱的「α 未達門檻」；此時能否進入正式標記，依 `task-management/014-task-detail` 待 IAA 確認頁的 IAA 計算狀態需求（`TrialRound.iaa_computation_status`）處理。本句不改變本點對 IAA 結果的非阻擋語意；第 4 點的「無法計算」屬已得到結果，仍不得阻擋流程。
2. **輸入僅限標記員原始標記**：α 計算的輸入僅為標記員（`annotator`）於 `outputs[]` 各輸出類型的原始作答；審核員（`reviewer`）並非一位 rater，其審核修正值（`annotation/015-annotation-workspace` FR-051／FR-052 定義之審核單位差異）不得併入 α 計算。
3. **逐回合計算**：α 以單一試標回合（`trial_round`）為計算單位，不得跨回合累積計算。
4. **樣本或標記員數不足時必須顯示「無法計算」**：Krippendorff α 於 `De = 0`（有效樣本 `< 2` 或有效標記員 `< 2`）時數學上未定義；此情境系統必須顯示明確的「無法計算」狀態並說明原因，不得回退顯示 `0.00` 等任何數值，亦不得阻擋流程。本點對 nominal α 與單位化 α（u-α）同等適用。
5. **排除與停用成員**：被 `task-management-014` FR-005h 明確排除之標記作業（`ExcludedAnnotationAssignment`）不計入 α；已停用成員之既有標記仍計入 α（沿用 `task-management-014` FR-005l 既有語意）；本規格不重新定義前述兩條排除規則，僅引用其結果。
6. **Bypass 視為缺值**：標記員於某輸出類型 bypass 時，該筆作答於該 outKey 上視為缺值（missing value），不計入 α 之分母，不得視為一個與其他標記員實際答案比對的「空白答案」。

#### Scenario: AC-3.16 De = 0 顯示無法計算且未校準型別不顯示未達門檻警示
- **GIVEN** 任一輸出類型的有效樣本數 `< 2` 或有效標記員數 `< 2`（`De = 0`）
- **WHEN** 檢視該型別的主要 IAA 指標
- **THEN** 顯示明確的「無法計算」狀態並附說明原因，未顯示 `0.00` 或任何回退數值，且未阻擋使用者進入正式標記
- **WHEN** `outputs[]` 含 `sequence_tagging` 且其 u-α 可計算
- **THEN** 該型別未顯示任何「未達門檻」警示，也未被計入未通過
- **AND** 使用者仍可進入正式標記
