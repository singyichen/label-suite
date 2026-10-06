> 正典：`specs/task-management/014-task-detail/spec.md`（v5.0.0 → v5.1.0，**MINOR**）。issue #1141。
>
> **為何 FR-008b 放在 `## MODIFIED Requirements` 底下**：FR-008b 已收錄於衍生檢視，因此以 `## MODIFIED` 帶入全文；除第 5 項改寫外，其餘條文與既有情境逐字沿用衍生檢視現行內容。

## MODIFIED Requirements

### Requirement: FR-008b 任務結案前置條件

任務狀態由 `official_run_in_progress` 轉為 `completed` 前，系統 MUST 驗證下列全部前置條件（issue #180 完整條件；ADR-022 2026-08-19 修訂版轉換表）：

1. 正式標記作業全數提交（已排除作業不計入）；
2. 全部審核單位（`annotation/015-annotation-workspace` FR-051）皆推導為 `已定稿`，或經最終例外池「自資料集排除」處置；
3. 不存在狀態為 `爭議中` 的審核單位；
4. **最終例外池已清空**——不存在待處置的 `official_run` 例外項目（FR-018）；
5. **品質指標就緒**——依 `dataset/017-dataset-analysis-detail` 之 `QUALITY_METRICS_READY_RULE` 推導的 `quality_metrics_ready` 為就緒。最新一輪 IAA 計算尚在進行（`pending`）或失敗（`failed`）時為未就緒；`done` 為就緒，含因 `De = 0` 而「無法計算」者；缺少訊號時視為就緒。

任一條件不符時，系統 MUST 阻擋轉換並逐項列出未滿足的具體原因，MUST NOT 僅以「全部標記已提交」作為完成依據。第 5 項未就緒時，原因 MUST 為可見的繁體中文文字（說明品質指標尚在計算或計算失敗），MUST NOT 僅以 hover 或顏色呈現。

**v3.0.0 修訂**：原第 (2) 項之「依生效審核設定（`min_reviewers`）應完成的 review unit 全數定案」改為上列第 2 項——`min_reviewers` 已移除，審核單位恆有一位審核員；原第 (4) 項「應仲裁項目全數完成仲裁」由上列第 3、4 項取代——仲裁完成不再等於結案就緒，仲裁裁定為「兩者皆非」者仍須經例外池收尾。

#### Scenario: 例外池未清空時阻擋結案
- **GIVEN** 某 `official_run_in_progress` 任務全部標記已提交、無 `爭議中` 單位，但最終例外池尚有 2 項待處置
- **WHEN** 專案負責人點擊 `標記完成`
- **THEN** 轉換被阻擋，並逐項列出「最終例外池尚有 2 項待處置」作為未滿足原因
- **AND** 例外池清空後再次點擊即可轉為 `completed`

#### Scenario: 品質指標未就緒時阻擋結案並顯示原因
- **GIVEN** 某 `official_run_in_progress` 任務第 1 至 4 項皆已滿足，但最新一輪試標回合的 `iaa_computation_status` 為 `pending` 或 `failed`
- **WHEN** 專案負責人檢視 `標記完成`
- **THEN** `標記完成` 為停用狀態，並顯示可見的品質指標未就緒原因，任務狀態維持 `official_run_in_progress`
- **AND** 直接呼叫完成 handler 同樣失敗，狀態不變

#### Scenario: 品質指標就緒時不被第 5 項阻擋
- **GIVEN** 某 `official_run_in_progress` 任務第 1 至 4 項皆已滿足，且最新一輪 `iaa_computation_status` 為 `done`（含某輸出類型「無法計算」），或該任務沒有品質指標訊號
- **WHEN** 專案負責人點擊 `標記完成`
- **THEN** 轉換不因第 5 項被阻擋，任務轉為 `completed`
