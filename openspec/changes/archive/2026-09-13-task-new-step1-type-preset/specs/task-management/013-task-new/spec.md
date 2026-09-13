# New Task — Step 1 任務類型一鍵預設（issue #724）

## Purpose

本 delta 為 task-new Step 1 的任務類型選擇新增「常用組合一鍵預設」子能力：三段式選擇器（大分類／輸入類型／輸出類型）維持完整可用，同時提供一組 registry/taxonomy 驅動的預設按鈕，讓最常見的任務型態組合可在 1 次點擊內完成，降低 issue #645 使用者路徑圖標記為 F1（點擊數超標）的 Step 1 摩擦。

## ADDED Requirements

### Requirement: FR-002f Step 1 任務類型常用組合一鍵預設

Step 1 的三組 chip（大分類、輸入類型、輸出類型）上方 MUST 提供依 `OUTPUT_TYPE_REGISTRY` 與 `TASK_TAXONOMY` 衍生的「常用組合」一鍵預設按鈕，每個預設對應一組合法的（大分類、輸入類型、輸出類型）組合。

點擊任一預設按鈕，系統 MUST 在單一使用者互動內同時寫入 `selected_categories[]`、`input_type` 與 `selectedOutputTypes[]`，其結果 MUST 與逐一點選三組 chip 後的最終狀態完全等價，包含 `outputs[].type` 推導結果與 Step 2 schema 初始化。

套用預設後，大分類、輸入類型、輸出類型三組 chip MUST 維持可見且可個別再調整（新增、取消或替換任一已選項），系統 MUST NOT 停用、隱藏或移除三段式自訂入口；使用者調整任一組時，MUST 只異動該組，其餘兩組維持預設帶入的選取狀態不被重置。

預設清單與其內容 MUST 由 registry／taxonomy 資料驅動，系統 MUST NOT 為單一預設情境於選擇核心流程（`rebuildOutputChips()`、`deriveTaskType()`、chip 點擊處理）新增依大分類或輸出類型 key 的硬編分支。

#### Scenario: AC-1.4 一鍵套用常用組合後三段式選擇器維持可調整

- **GIVEN** 使用者尚未選擇任何任務類型
- **WHEN** 點擊常用組合的一鍵預設按鈕
- **THEN** 大分類、輸入類型與輸出類型三組 chip 同時反映該預設的選取狀態，且與逐一點選三組 chip 湊出同一組合的最終狀態相同
- **AND** 使用者可再逐一調整任一組 chip（新增、取消或替換），調整不影響其餘兩組已選狀態

#### Scenario: AC-1.5 一鍵預設降低完成任務類型選擇所需的最少點擊次數

- **GIVEN** 「文字分類（單一標籤）」為 `classification` + `single_item` + `single_label` 之常用組合，其三段式選擇器路徑需要 3 次點擊（大分類、輸入類型、輸出類型各一次）才能湊齊
- **WHEN** 改為點擊該組合的一鍵預設按鈕
- **THEN** 僅需 1 次點擊即可達成與 3 次點擊路徑相同的 `state.taskCategories`／`state.taskInputTypes`／`state.taskOutputTypes`／`state.taskType` 結果

#### Scenario: SC-002g Step 1 提供常用組合一鍵預設且不減損三段式選擇器

- **GIVEN** Step 1 已提供至少一個常用組合一鍵預設按鈕
- **WHEN** 使用者點擊該預設按鈕
- **THEN** 系統於 1 次點擊內完成原本需要至少 3 次點擊（大分類、輸入類型、輸出類型各一次）才能湊齊的合法任務類型組合
- **AND** 套用後三段式選擇器（大分類、輸入類型、輸出類型三組 chip）維持可操作，不被停用或隱藏
