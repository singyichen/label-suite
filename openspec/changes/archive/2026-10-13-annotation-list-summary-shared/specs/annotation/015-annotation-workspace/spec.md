# Annotation List + Workspace — 清單摘要（issue #1339）

## Purpose

本 delta 定義標記清單的「樣本摘要」規則：工作區左欄三處與 `annotation-list` 文本摘要共用單一 helper，讀取任務設定鍵 `list_title_field`（specs/task-management/013-task-new/spec.md FR-002c-9），自動模式依資料形狀產生文字，絕不輸出 `[object Object]`，且永不讀取 Output 欄位。本 delta **只新增 FR-106 與 AC-1.35／AC-1.36／AC-1.37／AC-1.38／SC-028，不修訂任何既有條文**。

## ADDED Requirements

### Requirement: FR-106 標記清單樣本摘要

工作區左欄標記清單（標記員項目、reviewer 分組表頭、例外池分組表頭，見 FR-013A、FR-071 第 2 點）與 `annotation-list` 資料表文本摘要（FR-007、FR-007I）MUST 共用同一個摘要 helper，不得各自實作。每筆樣本產出單一字串，規則依序如下：

1. 任務設定 `list_title_field` 非 `null`，且該欄位角色為 Input 或 Evidence、或欄位名稱為 `id` 且角色不是 Output（specs/task-management/013-task-new/spec.md FR-002c-9 的選項集合）時，取該欄位的值產生摘要；該欄位不在此集合（例如已改為 Output 或不使用）時，視同 `null`，不得讀取。
2. `list_title_field` 為 `null`（自動）時，依 `fieldRoleMap` 宣告順序取第一個角色為 Input、且能產生摘要文字的欄位。
3. 取得欄位值後依值的形狀產生文字：字串、數字或布林值為其字串值；每一筆皆為物件且皆有文字欄位（`text` 為字串時取 `text`，否則取該物件第一個字串值）的陣列，取第 1 筆的文字；其他非空陣列為「`{n} 筆資料`」（英文 `{n} items`）；非空的純物件為「`{k} 個欄位`」（英文 `{k} fields`）。
4. 欄位值為空（`null`、未定義、空字串、空陣列、空物件）或第 1 筆文字為空時視為無法產生文字；指定欄位無法產生文字時，改以第 2 點的自動規則補位；仍無任何文字時退回該筆的 `id`；無 `id`（或 `id` 角色為 Output）時為空字串，呼叫端自行顯示占位符。
5. 摘要 MUST NOT 含 `[object Object]`；MUST NOT 讀取角色為 Output 的欄位值（Data Fairness，對應 FR-023、FR-024M-1）；摘要的截斷與展開沿用 FR-007I 與 CSS 截斷，helper 不另行截斷文字。

`annotation-list` 文本摘要自本條起為單一欄位摘要，不再串接多個 Input 欄位。`annotation-list` 搜尋框 MUST 另外比對該筆所有角色為 Input 的欄位文字（物件陣列串接每筆文字，規則同第 3 點，不得輸出 `[object Object]`），不得比對 Output 與 Evidence 欄位，顯示的摘要不變（AC-1.38）；比對字串與摘要共用同一份資料層實作，`annotation-list` 不另行字串化。本條不規範發言者前綴、對話串渲染與中央整合預覽（另案）。

#### Scenario: AC-1.35 自動摘要不出現 [object Object]

- **GIVEN** 任務 T013，Input 欄位 `utterances` 為物件陣列（每筆含 `speaker` 與 `text`），`list_title_field` 為 `null`
- **WHEN** 開啟 `annotation-workspace` 左欄標記員清單與 `annotation-list`
- **THEN** 每筆樣本的摘要為 `utterances` 第 1 筆的 `text`
- **AND** 任何摘要皆不含 `[object Object]`

#### Scenario: AC-1.36 指定清單標題欄位後各處一致且永不讀取 Output

- **GIVEN** 任務設定 `list_title_field` 為某 Input 欄位，且資料中另有 Output 欄位含不同文字
- **WHEN** 開啟工作區左欄（標記員項目、reviewer 分組表頭、例外池分組表頭）與 `annotation-list`
- **THEN** 四處摘要皆為該指定欄位的值
- **AND** 當 `list_title_field` 指向角色為 Output 的欄位時，摘要改依自動規則產生，且任何摘要都不含該 Output 欄位的值

#### Scenario: AC-1.37 非文字結構的型別摘要與 id 退回

- **GIVEN** 某任務 Input 欄位的值為不含文字欄位的物件陣列（共 3 筆）
- **WHEN** 渲染該樣本摘要
- **THEN** 摘要為 `3 筆資料`（英文介面為 `3 items`）
- **AND** 所有 Input 欄位皆為空時，摘要為該筆的 `id`

#### Scenario: AC-1.38 搜尋比對所有 Input 欄位且不含 Output 與 Evidence

- **GIVEN** item_pair 任務（Input 欄位為 Premise 與 Hypothesis），摘要顯示第一個 Input（Premise）
- **WHEN** 在 `annotation-list` 搜尋框輸入只出現在 Hypothesis 的文字
- **THEN** 該筆樣本的列出現在結果中，且顯示的摘要不變
- **AND** 輸入只出現在 Output 或 Evidence 欄位的文字時，結果為 0 列

#### Scenario: SC-028 工作區與清單共用同一個摘要實作

- **GIVEN** 同一任務、同一筆樣本、相同的 `list_title_field`
- **WHEN** 分別於 `annotation-list` 文本摘要與工作區左欄取得該筆摘要
- **THEN** 兩處文字完全相同
- **AND** 兩頁的摘要皆經由 `LabelSuiteAnnotationWorkspaceData` 的同一個 helper 產生
