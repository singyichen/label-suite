# New Task — 移除 Step 1 任務類型常用組合一鍵預設（issue #724 方向①回退）

正典：`specs/task-management/013-task-new/spec.md`（v7.1.0 → v8.0.0）。本 delta 移除 v7.1.0 新增之 FR-002f 及其 Scenario AC-1.4、AC-1.5、SC-002g，不改動 FR-002 系列其餘條文。

## REMOVED Requirements

### Requirement: FR-002f Step 1 任務類型常用組合一鍵預設

**Reason**: 本版預設清單僅含 1 筆（`classification` + `single_item` + `single_label`），卻佔用 Step 1「任務類型」欄位最上方一整列版面，並額外引入「預設列與其下三組 chip 是什麼關係」的介面概念。只有恰好建立該一種任務型態的使用者省下 2 次點擊，其餘使用者只承擔閱讀成本，投報率不成立。issue #645 路徑圖之 F1（點擊數超標）門檻改由 issue #755 承接的方向②（資料集欄位角色批次動作或依欄名自動推測初值，點擊數隨欄位數線性成長）與方向③（`validateStep1()` 必填項可免點之合理預設值）處理。

**Migration**: 使用者一律改用既有三段式選擇器（大分類 → 輸入類型 → 輸出類型三組 chip）完成任務類型選擇，即 v7.0.2 之選擇模型。FR-002／FR-002a–FR-002e 的選擇語意、cascade 規則（`rebuildOutputChips()`）、`deriveTaskType()` 推導、`validateStep1()` 必填判斷與 `下一步` 啟用條件皆不變；`selected_categories[]`、`input_type`、`selectedOutputTypes[]` 與 `outputs[].type` 的提交形狀不變，僅改由三組 chip 逐一寫入。無已儲存資料需要遷移：預設按鈕從未持久化任何欄位，既有任務設定不含預設相關狀態。

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
