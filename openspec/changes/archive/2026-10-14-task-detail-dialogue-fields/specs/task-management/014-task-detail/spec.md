# Task Detail — 對話串 dialogue_fields 載入與儲存（issue #1386）

## Purpose

本 delta 讓 `task-detail` 承接 `dialogue_fields` 的載入與儲存（013 v8.5.0 Changelog 的「task-detail 載入與儲存另案」），使基本資料編輯模式與 `013-task-new` Step 1 的對話串確認區同構（FR-014k）。**只新增 FR-014k-1、FR-014l-4 與 AC-3.80～AC-3.84**，不修訂既有 FR-014k、FR-014l-1。

## ADDED Requirements

### Requirement: FR-014k-1 基本資料編輯模式的對話串確認區載入、儲存與取消還原

- **FR-014k-1**（**v12.3.0 新增**，對應 AC-3.80～AC-3.83，issue #1386）：設定分頁「基本資料」編輯模式的對話串確認區 MUST 與 `013-task-new` task-management/013-task-new FR-002c-10 同構。(1) 進入編輯模式時，確認區 MUST 以任務已儲存的 `dialogue_fields` 初始化；`dialogue_fields` 為 `null` 或缺漏時，MUST 依 013 task-management/013-task-new FR-002c-10 的偵測與預填規則決定是否提議，非對話任務 MUST NOT 顯示確認區且行為不變。(2) 儲存基本資料時，系統 MUST 將當下確認結果寫回任務設定鍵 `dialogue_fields`；使用者已取消提議或資料不是對話串時 MUST 寫入 `null`。(3) 取消編輯（含有未儲存變更時於頁內確認對話框選擇放棄）MUST 還原已儲存的 `dialogue_fields`，包含對話串開關與自動清單標題；重新進入編輯模式時 MUST 顯示已儲存狀態，不得沿用取消前的編輯或取消提議旗標。(4) 「自動」清單標題預覽 MUST 與 `annotation/015-annotation-workspace` FR-106 的 `getRecordSummaryText` 使用同一組對話串欄位得到相同摘要。確認區的文字來源 MUST 限於 Input 角色欄位（Data Fairness），且 MUST NOT 依欄位名稱硬編任務邏輯（Generalization-First）。

#### Scenario: AC-3.80 編輯模式的對話串確認區以已儲存值初始化

- **GIVEN** 對話串任務已儲存 `dialogue_fields = { text: "text", speaker: "speaker", utt_id: "utt_id", reply_to: null }`，`project_leader` 開啟設定分頁「基本資料」
- **WHEN** 點擊「編輯」進入編輯模式
- **THEN** 對話串確認區出現，文字、發言者、發言編號對應與已儲存值一致
- **AND** 任務的 `dialogue_fields` 為 `null` 且資料不含可偵測對話串時，不顯示確認區，且其行為與修正前相同

#### Scenario: AC-3.81 儲存時寫回 dialogue_fields

- **GIVEN** 對話串任務位於基本資料編輯模式，使用者將發言者欄位改選為另一子欄位
- **WHEN** 點擊「儲存」
- **THEN** 任務的 `dialogue_fields` 為更新後的對應，重新進入編輯模式時確認區顯示該對應
- **AND** 使用者取消提議後儲存，`dialogue_fields` 為 `null`

#### Scenario: AC-3.82 取消編輯還原已儲存的 dialogue_fields

- **GIVEN** 對話串任務已儲存 `dialogue_fields`，使用者進入編輯模式後修改對應並關閉對話串開關，使「自動」清單標題變成「N 筆資料」
- **WHEN** 點擊「取消」，或在有未儲存變更時於頁內確認對話框選擇放棄變更
- **THEN** 回到檢視狀態，任務的 `dialogue_fields` 仍為已儲存值
- **AND** 重新進入編輯模式時，開關為開啟、對應為已儲存值、「自動」清單標題為第 1 則對話文字

#### Scenario: AC-3.83 自動清單標題與 FR-106 一致

- **GIVEN** 對話串任務的 `list_title_field` 為「自動」，已儲存 `dialogue_fields`
- **WHEN** 基本資料編輯模式顯示「標記清單預覽」
- **THEN** 每筆預覽摘要等於 015 FR-106 `getRecordSummaryText` 對同一筆資料的輸出（第 1 則 `text` 並依 FR-106 加發言者前綴），不出現「N 筆資料」或 `[object Object]`
- **AND** 非對話任務的自動摘要與修正前相同

### Requirement: FR-014l-4 標記設定預覽以對話串呈現

- **FR-014l-4**（**v12.3.0 新增**，對應 AC-3.84，issue #1386）：對話串任務（已儲存或已確認 `dialogue_fields`，Input 為物件陣列）於設定分頁「標記設定」編輯模式的標記預覽，MUST 與 `013-task-new` Step 2 預覽同源，以對話串呈現，每則一列，含發言編號、發言者（若有）與文字，不得出現 `[object Object]`，文字來源 MUST NOT 含 Output 欄位。非對話任務的預覽 MUST 與修正前相同。

#### Scenario: AC-3.84 標記設定預覽以對話串呈現

- **GIVEN** 對話串任務已儲存 `dialogue_fields`，`project_leader` 開啟設定分頁
- **WHEN** 進入「標記設定」編輯模式並檢視標記預覽
- **THEN** 預覽以每則一列呈現發言編號、發言者與文字，且不出現 `[object Object]`
- **AND** 預覽文字不含 Output 欄位內容；非對話任務的預覽與修正前相同
