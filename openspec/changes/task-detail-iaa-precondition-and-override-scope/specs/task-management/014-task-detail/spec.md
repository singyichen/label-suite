> 正典：`specs/task-management/014-task-detail/spec.md`（v3.4.0 → v3.5.0，**MINOR**，版本判定理由見 proposal.md Impact 節）。issue #783 第 2 點。第 1 點（ADR-022 轉換前置條件）依維護者裁定不改正典 014，不出現在本 delta。
>
> **為何既有 ID 放在 `## ADDED Requirements` 底下**：FR-010o-1 已存在於正典，但**不在** `openspec/specs/task-management/014-task-detail/spec.md` 衍生檢視內。對它下 `## MODIFIED` 會在 archive 階段以 header not found 硬中止，而 `openspec validate` 對此零訊號。gate 4 回寫正典時 MUST **原地改寫** FR-010o-1，不得新增第二條同 ID 條文。本 delta 內未帶 AC ID 的情境為新增驗收情境，AC 編號於 gate 4 回寫時依正典既有順序配發。

## ADDED Requirements

### Requirement: FR-010o-1 IAA 計算方式唯讀，目標門檻僅限已校準輸出類型覆寫

Overview「抽樣設定」MUST NOT 提供 IAA 計算方式的可選下拉選單；每個 `outputs[].type` 的計算方式 MUST 由 `OUTPUT_TYPE_IAA_REGISTRY` 自動選定並唯讀顯示。

**(1) 可覆寫範圍**。使用者 MUST 只能對同時符合下列兩個條件的輸出類型於 `target_agreement_overrides` 輸入覆寫門檻：該型別在本任務的 `outputs[]` 中，且 `OUTPUT_TYPE_IAA_REGISTRY` 為其登錄了 `default_threshold`。未覆寫時 MUST 顯示 registry 的 `default_threshold` 作為 placeholder 建議值。

**(2) 未校準型別不提供覆寫**。屬 `IAA_UNCALIBRATED_TYPES`（定義與成員以 `dataset/017-dataset-analysis-detail` FR-043 為唯一來源）或 `IAA_GATE_EXCLUDED_TYPES` 的輸出類型，「抽樣設定」編輯狀態 MUST NOT 渲染覆寫輸入框，唯讀摘要 MUST NOT 顯示任何門檻數值。

**(3) 儲存時拒絕**。儲存 `target_agreement_overrides` 時，若含有屬 `IAA_UNCALIBRATED_TYPES` 的 key、或含有不在本任務 `outputs[]` 中的 key，系統 MUST 拒絕整筆儲存並逐項指出不允許的 key，MUST NOT 靜默丟棄該 key 後儲存其餘欄位。持久化後的 `target_agreement_overrides` MUST NOT 含有屬 `IAA_UNCALIBRATED_TYPES` 的 key。

**(4) 校準後自動開放**。某型別自 `IAA_UNCALIBRATED_TYPES` 移出、且 `OUTPUT_TYPE_IAA_REGISTRY` 為其登錄 `default_threshold` 後，該型別的覆寫輸入框 MUST 依第 (1) 點自動出現，MUST NOT 需要修改本頁面依型別分流的程式（憲法：Generalization-First）。

#### Scenario: 未校準型別不顯示門檻覆寫欄位

- **GIVEN** 任務 `outputs[]` 含一個屬 `IAA_UNCALIBRATED_TYPES` 的輸出類型與一個已登錄 `default_threshold` 的輸出類型，且任務處於可編輯抽樣設定的狀態
- **WHEN** `project_leader` 進入 Overview「抽樣設定」編輯狀態
- **THEN** 已登錄門檻的輸出類型列顯示覆寫輸入框，其 placeholder 為 registry 預設門檻
- **AND** 未校準輸出類型列只顯示指標名稱，不渲染覆寫輸入框，且該列不出現任何門檻數值

#### Scenario: 儲存含未校準型別 key 的覆寫被拒絕

- **GIVEN** 任務 `outputs[]` 含一個屬 `IAA_UNCALIBRATED_TYPES` 的輸出類型
- **WHEN** 一筆儲存請求的 `target_agreement_overrides` 含有該輸出類型的 key（無論值是否落在 `0..1`）
- **THEN** 系統拒絕整筆儲存並指出該 key 不允許覆寫
- **AND** 任務既有的 `target_agreement_overrides` 維持儲存前的內容，不含該 key

#### Scenario: 輸出類型完成校準後覆寫欄位自動出現

- **GIVEN** 某輸出類型原屬 `IAA_UNCALIBRATED_TYPES`，其後自該集合移出並於 `OUTPUT_TYPE_IAA_REGISTRY` 登錄 `default_threshold`
- **WHEN** `project_leader` 進入含該輸出類型之任務的 Overview「抽樣設定」編輯狀態
- **THEN** 該輸出類型列顯示覆寫輸入框，placeholder 為新登錄的預設門檻，且可依 FR-010q 驗證後儲存
