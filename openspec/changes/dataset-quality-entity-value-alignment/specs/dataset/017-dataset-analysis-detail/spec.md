> 正典：`specs/dataset/017-dataset-analysis-detail/spec.md`（v3.0.0 → v3.0.1，**PATCH**，版本判定理由見 proposal.md Impact 節）。issue #783 第 3 點。
>
> **為何既有 ID 放在 `## ADDED Requirements` 底下**：FR-008 與 FR-025 皆已存在於正典，但**不在** `openspec/specs/dataset/017-dataset-analysis-detail/spec.md` 衍生檢視內。對它們下 `## MODIFIED` 會在 archive 階段以 header not found 硬中止，而 `openspec validate` 對此零訊號。gate 4 回寫正典時 MUST **原地改寫** FR-008 與 FR-025，不得新增第二條同 ID 條文。兩條情境沿用正典既有 SC-003、SC-014，**不配發任何新 AC 編號**。

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
