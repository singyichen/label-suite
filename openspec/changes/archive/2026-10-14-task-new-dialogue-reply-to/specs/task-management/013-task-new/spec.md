# Task New — 對話串 reply_to 設定（issue #1378）

## Purpose

本 delta 為 `dialogue_fields` 新增選填的 `reply_to` 子欄位：Step 1 對話串確認區讓建立者選擇「回覆對象欄位」或留空，供工作區（015）判斷回覆縮排與回應標記。**只修訂 FR-002c-10 與 SC-002j，新增 AC-1.13、AC-1.14**。

## MODIFIED Requirements

### Requirement: FR-002c-10 Step 1 對話串欄位偵測與確認，Step 2 預覽以對話串呈現

Input 角色欄位在資料列來源的前幾筆紀錄中為非空的物件陣列，且存在至少一個在所有元素中皆為字串的子欄位時，系統 MUST 於欄位預覽下方提議以「對話串」呈現並顯示確認區：**文字欄位**（必選）、**發言者欄位**（可選）、**發言編號欄位**（可選，未選時用陣列序號，自 1 起算）、**回覆對象欄位**（可選，預設留空）。候選由偵測結果預填，建立者 MUST 能更改任一對應，或取消提議；偵測不到時系統 MUST NOT 提議，Step 2 預覽退回原始 JSON 呈現。子欄位名稱線索只決定預填值，不決定是否提議，且僅作用於角色已是 Input 的欄位。任一已確認的子欄位於欄位角色變更、資料列來源切換或重新上傳後不再合法時，系統 MUST 重新偵測；建立者取消提議後不得自動再預填。確認結果存為任務設定鍵 `dialogue_fields`（`{ text, speaker, utt_id, reply_to }`，後三者可為 `null`；未採用對話串時整體為 `null`），建立任務 payload MUST 帶此鍵。本條僅適用 `single_item` 輸入類型。

**回覆對象欄位（`reply_to`）**：指向物件陣列元素內、存放「被回覆發言的發言編號」的子欄位。候選為所有元素中值皆為字串、數字、`null` 或缺漏，且至少一個元素非空的子欄位，不含已選為文字欄位者；沒有候選時系統 MUST NOT 顯示該下拉。系統 MUST NOT 預填 `reply_to`（不依欄位名稱、不從內文 `@名字` 或實體推測），建立者未選擇時為 `null`。已確認的 `reply_to` 不再合法時，系統 MUST 只將 `reply_to` 清為 `null`，其餘仍合法的對應保留。既有任務或種子的 `dialogue_fields` 缺少 `reply_to` 時 MUST 視同 `null`。`reply_to` 為 `null` 時，下游顯示不得縮排也不得標示回應關係（顯示規則見 annotation/015-annotation-workspace）。

Step 2 標記預覽 MUST 在 Input 為物件陣列且已確認 `dialogue_fields` 時，以對話串呈現，每則一列，含發言編號、發言者（若有）與文字。Input 文字來源 MUST NOT 對物件取字串（不得出現 `[object Object]`）；字串 Input 的文字內容 MUST 與既有行為逐字相同；無 Input 欄位時 MUST NOT 退回任何非 Input 欄位作為文字來源（預覽文字來源為空，沿用既有占位文字）。

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
- **AND** 預覽文字來源不含 Output 欄位內容，且無 Input 欄位時不退回任何非 Input 欄位；未確認對話串時 Input 物件以 JSON 呈現

#### Scenario: AC-1.13 回覆對象欄位可選擇、可清除，預設留空

- **GIVEN** 已上傳資料集，`utterances` 每則含字串 `speaker`、字串 `text`、`utt_id`，以及 `reply_to`（根發言為 `null`、其餘為被回覆發言的 `utt_id`），且該欄角色為 Input
- **WHEN** 嵌入式資料預覽完成初始化
- **THEN** 確認區出現「回覆對象欄位」下拉，預設為「不使用」，候選含 `reply_to`、不含文字欄位
- **AND** 建立者選擇 `reply_to` 後 `dialogue_fields.reply_to` 為該子欄位名稱，再選回「不使用」則為 `null`
- **AND** 沒有任何符合候選條件的子欄位時，不顯示該下拉，`dialogue_fields.reply_to` 為 `null`

#### Scenario: AC-1.14 reply_to 失效時只清除該對應

- **GIVEN** 建立者已確認 `dialogue_fields` 且 `reply_to` 指向某子欄位
- **WHEN** 資料列來源切換或重新上傳後，該子欄位不再是合法候選，而文字、發言者、發言編號對應仍合法
- **THEN** `dialogue_fields.reply_to` 變為 `null`，文字、發言者、發言編號對應保持不變
- **AND** 缺少 `reply_to` 的既有 `dialogue_fields` 讀入後視同 `null`

#### Scenario: SC-002j 對話串設定隨建立任務 payload 帶出

- **GIVEN** Step 1 已確認對話串的文字、發言者、發言編號與回覆對象欄位對應
- **WHEN** 使用者完成精靈並建立任務
- **THEN** 建立任務 payload 的 `dialogue_fields` 為該對應（含 `reply_to`，未選為 `null`），未採用對話串時為 `null`
- **AND** 重新載入精靈草稿後確認區仍為該對應
