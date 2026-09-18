> 正典：`specs/task-management/014-task-detail/spec.md`（v4.0.0 → v4.1.0，**MINOR**，版本判定理由見 proposal.md Impact 節）。issue #783 第 1、2 點。第 1 點依維護者 2026-09-18 追加裁定，於 014 新增 FR-010o-4（待 IAA 確認頁的計算狀態）與 `TrialRound.iaa_computation_status` 欄位；轉換前置條件本身仍只寫在 ADR-022。
>
> **為何既有 ID 放在 `## ADDED Requirements` 底下**：FR-010o-1 已存在於正典，但**不在** `openspec/specs/task-management/014-task-detail/spec.md` 衍生檢視內。對它下 `## MODIFIED` 會在 archive 階段以 header not found 硬中止，而 `openspec validate` 對此零訊號。gate 4 回寫正典時 MUST **原地改寫** FR-010o-1，不得新增第二條同 ID 條文。FR-010o-4 為全新 ID。本 delta 內未帶 AC ID 的情境皆為新增驗收情境，AC 編號於 gate 4 回寫時依正典既有順序配發（新 AC ID 若寫在 `## MODIFIED` 底下會被 check-sdd 判紅，因此一律置於本節且不預先編號）。
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

### Requirement: FR-010o-4 待 IAA 確認頁顯示試標回合 IAA 計算狀態，計算未結束不得呈現為 IAA 未達標

IAA 為非同步計算。任務依 FR-008a 進入 `waiting_iaa_confirmation` 時，最新試標回合的 IAA 可能尚未算完或計算失敗；本需求規定這兩種情況在畫面上的呈現，以及它們與「IAA 未達標」的區別。

**(1) 計算狀態欄位**。`TrialRound` MUST 具備 `iaa_computation_status`，值域恰為 `pending | done | failed`：回合建立時為 `pending`；該回合每一個需計算 IAA 的輸出類型都得到確定結果時為 `done`；計算執行錯誤時為 `failed`。「確定結果」指一個數值，或 `dataset/017-dataset-analysis-detail` FR-039 第 4 點定義的「無法計算」（`De = 0`）；後者 MUST 記為 `done`（與該規格 AC-3.16「不阻擋使用者進入正式標記」一致）。`IAA_GATE_EXCLUDED_TYPES` 不需計算，不列入判斷。本欄位只描述計算是否結束，MUST NOT 承載達標與否。

**(2) 計算中**。最新回合為 `pending` 時，Overview「任務狀態與執行控制」MUST 顯示「IAA 計算中」狀態；達標條件 pills 的 IAA 項、判定 banner 與試標回合歷程 MUST NOT 顯示任何 IAA 數值或達標／未達標判定。

**(3) 計算失敗與重試**。最新回合為 `failed` 時，同一區塊 MUST 顯示計算失敗狀態並提供「重試計算」操作；該操作 MUST 只提供給 `project_leader`。重試後該回合 MUST 回到 `pending` 並重新排入計算；重試 MUST NOT 改變任務狀態、MUST NOT 建立新回合。

**(4) 計算未結束不是 IAA 未達標**。`pending` 與 `failed` MUST NOT 以 IAA 未達標的方式呈現（MUST NOT 使用未達標警示樣式、MUST NOT 顯示「R{n} 未通過」類判定標題），亦 MUST NOT 被任何邏輯當作未達標處理。FR-010o-3 的顧問性警示只適用於 `done` 且得到數值的結果。

**(5) 開始正式標記的前置條件**。最新回合不為 `done` 時，`開始正式標記` MUST 以停用狀態顯示，並於按鈕旁以可見文字說明原因（計算中或計算失敗），系統 MUST NOT 執行 `waiting_iaa_confirmation → official_run_in_progress`（`docs/adr/022-task-state-machine-location.md` Transition Table）。最新回合為 `done` 後，`開始正式標記` 依 FR-010o-3 不因 IAA 未達標而停用；此處的停用依據是「計算尚未結束」，不屬於 FR-010o-3 所禁止的「因 IAA 未達標停用」。

#### Scenario: IAA 計算中不呈現為未達標且暫不能開始正式標記

- **GIVEN** 任務處於 `waiting_iaa_confirmation`，最新試標回合 `iaa_computation_status = pending`
- **WHEN** `project_leader` 檢視 Overview「任務狀態與執行控制」
- **THEN** 畫面顯示「IAA 計算中」，IAA 項不顯示任何數值、不顯示未達標警示或「未通過」判定
- **AND** `開始正式標記` 為停用狀態，按鈕旁可見說明計算中的原因文字，點擊後任務狀態維持 `waiting_iaa_confirmation`

#### Scenario: IAA 計算失敗可由專案負責人重試

- **GIVEN** 任務處於 `waiting_iaa_confirmation`，最新試標回合 `iaa_computation_status = failed`
- **WHEN** `project_leader` 檢視 Overview「任務狀態與執行控制」並點擊「重試計算」
- **THEN** 點擊前畫面顯示計算失敗狀態與「重試計算」操作，且不以未達標樣式呈現
- **AND** 點擊後該回合回到 `pending`、畫面改為「IAA 計算中」，任務狀態維持 `waiting_iaa_confirmation`，試標回合數不變

#### Scenario: 無法計算視為計算已結束，不阻擋開始正式標記

- **GIVEN** 任務處於 `waiting_iaa_confirmation`，最新試標回合某輸出類型因有效標記員數 `< 2` 而為「無法計算」（`De = 0`），其餘需計算的輸出類型皆已得到數值
- **WHEN** `project_leader` 檢視 Overview「任務狀態與執行控制」
- **THEN** 該回合 `iaa_computation_status = done`，畫面不顯示「IAA 計算中」或計算失敗狀態
- **AND** `開始正式標記` 可點擊
