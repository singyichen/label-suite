> 正典：`specs/dataset/017-dataset-analysis-detail/spec.md`（v3.0.1 → v3.1.0，**MINOR**）。issue #1141。
>
> **為何 FR-044 放在 `## ADDED Requirements` 底下**：FR-044 為全新 ID，正典與衍生檢視皆不存在。gate 4 回寫正典時於功能需求段新增，不得改寫其他條文。

## ADDED Requirements

### Requirement: FR-044 品質指標就緒訊號

系統 MUST 為每個任務推導布林訊號 `quality_metrics_ready`，供 `task-management/014-task-detail` FR-008b 第 5 項「品質指標計算完成可用」判定結案前置條件。推導規則以常數 `QUALITY_METRICS_READY_RULE` 為唯一定義：

1. 訊號 MUST 由該任務**最新一輪**試標回合的 `iaa_computation_status`（`task-management/014-task-detail` FR-010o-4 第 1 點）推導：`done` 為就緒（`true`）；`pending` 與 `failed` 為未就緒（`false`）。
2. 「無法計算」（`De = 0`，FR-039 第 4 點）依 FR-010o-4 已記為 `done`，因此 MUST 為就緒；MUST NOT 因任一輸出類型無法計算而判為未就緒。
3. 缺少試標回合紀錄、或紀錄缺少 `iaa_computation_status` 時，MUST 視為就緒（`true`），MUST NOT 阻擋。
4. 本訊號只描述「IAA 計算是否已結束」，MUST NOT 描述 IAA 是否達門檻；達標與否不影響本訊號，與 FR-039 第 1 點的非阻擋語意一致。
5. 被修改率（FR-040）由審核差異即時推導、沒有非同步計算狀態，MUST NOT 作為本訊號的輸入。
6. 本訊號的唯一消費者為 `task-management/014-task-detail` FR-008b 第 5 項；MUST NOT 被用於阻擋 `dry_run` 試標完成或 `開始正式標記`（兩者各有其前置條件）。

#### Scenario: 品質指標就緒訊號依最新回合的計算狀態推導

- **GIVEN** 一個 `official_run_in_progress` 任務，最新試標回合的 `iaa_computation_status` 為 `pending` 或 `failed`
- **WHEN** 系統推導 `quality_metrics_ready`
- **THEN** 訊號為 `false`
- **AND** 最新回合的 `iaa_computation_status` 為 `done` 時訊號為 `true`，即使其中某輸出類型因 `De = 0` 為「無法計算」
- **AND** 該任務沒有試標回合紀錄或紀錄缺 `iaa_computation_status` 時訊號為 `true`
