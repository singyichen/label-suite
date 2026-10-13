# Task New — Step 1 清單標題欄位與標記清單預覽（issue #1338）

## Purpose

本 delta 為 task-new Step 1 欄位預覽新增「清單標題」下拉與「標記清單預覽」：建立者可指定哪一個欄位作為標記清單的樣本標題（預設「自動」，由 #1339 另行定義摘要規則），並在建立任務前即時預覽前幾筆標題。選項範圍受 Data Fairness 約束，Output 欄位永不列入。本 delta **只新增 FR-002c-9 與 AC-1.8／AC-1.9／SC-002i，不修訂任何既有條文**。

## ADDED Requirements

### Requirement: FR-002c-9 Step 1 清單標題欄位與標記清單預覽

嵌入式資料預覽於資料列來源列下方，系統 MUST 提供「清單標題」下拉（任務設定鍵 `list_title_field`，型別 `string | null`，`null` 代表「自動」，預設為「自動」）。選項 MUST 由下列規則推導，且 MUST NOT 列出角色為 Output 的欄位：「自動（依資料形狀）」；目前所選資料列來源中角色為 Input 或 Evidence 的欄位；欄位名稱為 `id` 且角色不是 Output 的欄位。型別為物件陣列的欄位 MUST 以 `<欄位名>（取第 1 則的文字）` 標示。

表格下方 MUST 顯示「標記清單預覽」，列出所選資料列來源前 3 筆紀錄的標題；所選為「自動」時的標題摘要規則不在本條範圍。預覽 MUST 於下拉選擇、欄位角色指定與資料列來源切換後即時更新，不需使用者點擊其他按鈕。

非 `id` 欄位於角色改為「不使用」或 Output 時，或任何所選欄位不在新資料列來源的欄位中時，視為不再屬於選項集合；`id` 欄位例外，僅在角色改為 Output 或不在新資料列來源時才視為不再屬於選項集合（角色為「不使用」時仍可選）。所選欄位不再屬於選項集合時，系統 MUST 將 `list_title_field` 回退為 `null`（自動），並顯示說明原因的提示。建立任務 payload MUST 帶 `list_title_field`（自動時為 `null`）。task-detail 設定›基本資料編輯模式依 FR-014k（specs/task-management/014-task-detail/spec.md） 與本條同構。

#### Scenario: AC-1.8 下拉選項不含 Output 欄位且預覽即時更新

- **GIVEN** 已上傳資料集，其中一欄指定為 Input、一欄指定為 Output
- **WHEN** 使用者開啟「清單標題」下拉並選擇 Input 欄位
- **THEN** 選項只含「自動（依資料形狀）」、Input／Evidence 欄位與 `id`，不含 Output 欄位
- **AND** 「標記清單預覽」立即顯示前 3 筆該欄位的值

#### Scenario: AC-1.9 所選欄位失效時回退自動並提示

- **GIVEN** 「清單標題」已選擇某 Input 欄位
- **WHEN** 使用者將該欄位角色改為「不使用」或 Output（若所選為 `id`，僅改為 Output 才適用；`id` 改為「不使用」時維持原選擇）
- **THEN** 「清單標題」回到「自動（依資料形狀）」並顯示說明原因的提示
- **AND** 預覽改以「自動」呈現

#### Scenario: SC-002i 清單標題隨建立任務 payload 帶出

- **GIVEN** Step 1 已選定某 Input 欄位為「清單標題」
- **WHEN** 使用者完成精靈並建立任務
- **THEN** 建立任務 payload 的 `list_title_field` 為該欄位名稱
- **AND** 重新載入精靈草稿後下拉仍為該選項
