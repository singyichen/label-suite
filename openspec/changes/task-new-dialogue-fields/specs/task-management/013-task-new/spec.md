# Task New — Step 1 對話串欄位偵測與確認（issue #1340）

## Purpose

本 delta 為 task-new 新增「對話串欄位」：Input 欄位為物件陣列（如 `utterances[]`）時，系統自動偵測並提議以對話串呈現，建立者確認發言者、發言編號與文字子欄位的對應，Step 2 預覽據此呈現，並修正預覽對物件取字串造成的 `[object Object]` 與 Input 文字來源退回非 Input 欄位的問題。**只新增 FR-002c-10 與 AC-1.10～AC-1.12／SC-002j，不修訂任何既有條文**。

## ADDED Requirements

### Requirement: FR-002c-10 Step 1 對話串欄位偵測與確認，Step 2 預覽以對話串呈現

Input 角色欄位在資料列來源的前幾筆紀錄中為非空的物件陣列，且存在至少一個在所有元素中皆為字串的子欄位時，系統 MUST 於欄位預覽下方提議以「對話串」呈現並顯示確認區：**文字欄位**（必選）、**發言者欄位**（可選）、**發言編號欄位**（可選，未選時用陣列序號，自 1 起算）。候選由偵測結果預填，建立者 MUST 能更改任一對應，或取消提議；偵測不到時系統 MUST NOT 提議，Step 2 預覽退回原始 JSON 呈現。子欄位名稱線索只決定預填值，不決定是否提議，且僅作用於角色已是 Input 的欄位。任一已確認的子欄位於欄位角色變更、資料列來源切換或重新上傳後不再合法時，系統 MUST 重新偵測；建立者取消提議後不得自動再預填。確認結果存為任務設定鍵 `dialogue_fields`（`{ text, speaker, utt_id }`，後兩者可為 `null`；未採用對話串時整體為 `null`），建立任務 payload MUST 帶此鍵。本條僅適用 `single_item` 輸入類型。

Step 2 標記預覽 MUST 在 Input 為物件陣列且已確認 `dialogue_fields` 時，以對話串呈現，每則一列，含發言編號、發言者（若有）與文字。Input 文字來源 MUST NOT 對物件取字串（不得出現 `[object Object]`）；字串 Input 的文字內容 MUST 與既有行為逐字相同；無 Input 欄位時的退回來源 MUST NOT 選用角色為 Output 或 Evidence 的欄位。

#### Scenario: AC-1.10 偵測到物件陣列 Input 時提議對話串並預填

- **GIVEN** 已上傳資料集，其中 `utterances` 欄為每則含字串 `speaker`、字串 `text` 與編號 `utt_id` 的物件陣列，且該欄角色為 Input
- **WHEN** 嵌入式資料預覽完成初始化
- **THEN** 欄位預覽下方出現對話串確認區，文字欄位預填 `text`、發言者欄位預填 `speaker`、發言編號欄位預填 `utt_id`
- **AND** 建立者可更改任一對應或取消提議

#### Scenario: AC-1.11 偵測不到時不提議

- **GIVEN** 已上傳資料集，Input 欄位為字串，或為元素非物件、元素缺少字串子欄位的陣列
- **WHEN** 嵌入式資料預覽完成初始化
- **THEN** 不顯示對話串確認區，且 `dialogue_fields` 為 `null`

#### Scenario: AC-1.12 Step 2 預覽以對話串呈現且文字來源不外洩

- **GIVEN** Input 為已確認對話串對應的物件陣列欄位，另有一個角色為 Output 的字串欄位
- **WHEN** 使用者進入 Step 2
- **THEN** 標記預覽以每則一列呈現發言編號、發言者與文字，不出現 `[object Object]`
- **AND** 預覽文字來源不含 Output 欄位內容；未確認對話串時 Input 物件以 JSON 呈現

#### Scenario: SC-002j 對話串設定隨建立任務 payload 帶出

- **GIVEN** Step 1 已確認對話串的文字、發言者與發言編號對應
- **WHEN** 使用者完成精靈並建立任務
- **THEN** 建立任務 payload 的 `dialogue_fields` 為該對應，未採用對話串時為 `null`
- **AND** 重新載入精靈草稿後確認區仍為該對應
