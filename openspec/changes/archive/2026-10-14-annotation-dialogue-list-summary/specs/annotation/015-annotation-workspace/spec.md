# Annotation List + Workspace — 左欄清單對話串摘要（issue #1378，PR-B2）

## Purpose

本 delta 把草圖 artifact 左欄清單的發言者前綴與筆數小標籤補進 FR-106，並移除「本條不規範發言者前綴」的排除句。新增 AC-1.39 ~ AC-1.41，修訂 AC-1.35。

## MODIFIED Requirements

### Requirement: FR-106 標記清單樣本摘要

工作區左欄標記清單（標記員項目、reviewer 分組表頭、例外池分組表頭，見 FR-013A、FR-071 第 2 點）與 `annotation-list` 資料表文本摘要（FR-007、FR-007I）MUST 共用同一個摘要 helper，不得各自實作。每筆樣本產出單一字串，規則依序如下：

1. 任務設定 `list_title_field` 非 `null`，且該欄位角色為 Input 或 Evidence、或欄位名稱為 `id` 且角色不是 Output（specs/task-management/013-task-new/spec.md FR-002c-9 的選項集合）時，取該欄位的值產生摘要；該欄位不在此集合（例如已改為 Output 或不使用）時，視同 `null`，不得讀取。
2. `list_title_field` 為 `null`（自動）時，依 `fieldRoleMap` 宣告順序取第一個角色為 Input、且能產生摘要文字的欄位。
3. 取得欄位值後依值的形狀產生文字：字串、數字或布林值為其字串值；每一筆皆為物件且任務設定 `dialogue_fields.text` 指向的子欄位皆為字串的陣列，取第 1 筆該子欄位的文字（`dialogue_fields` 為 `null` 時不硬取 `text` 或任何欄位名稱，視為無文字欄位）；其他非空陣列為「`{n} 筆資料`」（英文 `{n} items`）；非空的純物件為「`{k} 個欄位`」（英文 `{k} fields`）。
4. 欄位值為空（`null`、未定義、空字串、空陣列、空物件）或第 1 筆文字為空時視為無法產生文字；指定欄位無法產生文字時，改以第 2 點的自動規則補位；仍無任何文字時退回該筆的 `id`；無 `id`（或 `id` 角色為 Output）時為空字串，呼叫端自行顯示占位符。
5. 摘要 MUST NOT 含 `[object Object]`；MUST NOT 讀取角色為 Output 的欄位值（Data Fairness，對應 FR-023、FR-024M-1）；摘要的截斷與展開沿用 FR-007I 與 CSS 截斷，helper 不另行截斷文字。
6. **對話串發言者前綴與筆數標籤**：摘要取自第 3 點的對話串形態（物件陣列、`dialogue_fields.text` 指向的子欄位皆為字串），且 `dialogue_fields.speaker` 非 `null`、第 1 筆該子欄位值為非空字串時，摘要為「`{speaker}：{text}`」（英文介面 `{speaker}: {text}`）；其餘情況不加前綴。同一份 helper 另提供摘要標籤：`dialogue_fields` 非 `null` 且摘要取自對話串形態時為「`{n} 則發言`」（英文 `{n} turns`，n 為陣列長度）；`dialogue_fields.speaker` 非 `null` 且不重複的非空發言者數 m 至少為 1 時，再加「`{m} 位發言者`」（英文 `{m} speakers`）。標籤由工作區左欄三處顯示於摘要旁，`annotation-list` 摘要沿用前綴但不顯示標籤。前綴與標籤 MUST NOT 依任務編號或欄位名稱硬編，MUST NOT 讀取 Output 欄位，MUST NOT 由實體、關係或 `@名字` 推測；搜尋字串不含前綴與標籤。

`annotation-list` 文本摘要自本條起為單一欄位摘要，不再串接多個 Input 欄位。`annotation-list` 搜尋框 MUST 另外比對該筆所有角色為 Input 的欄位文字（物件陣列串接每筆文字，規則同第 3 點，以 `dialogue_fields.text` 為準，不得輸出 `[object Object]`），不得比對 Output 與 Evidence 欄位，顯示的摘要不變（AC-1.38）；比對字串與摘要共用同一份資料層實作，`annotation-list` 不另行字串化。

#### Scenario: AC-1.35 自動摘要不出現 [object Object]

- **GIVEN** 任務 T013，Input 欄位 `utterances` 為物件陣列（每筆含 `speaker` 與 `text`），`list_title_field` 為 `null`
- **WHEN** 開啟 `annotation-workspace` 左欄標記員清單與 `annotation-list`
- **THEN** 每筆樣本的摘要為 `utterances` 第 1 筆的 `text`，並依第 6 點加上發言者前綴（AC-1.39）
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

#### Scenario: AC-1.39 對話串摘要加發言者前綴並顯示筆數標籤

- **GIVEN** 任務 T013，`dialogue_fields` 非 `null` 且指定 `speaker` 子欄位，樣本 `absa-001` 的 `utterances` 共 5 則、3 位不同發言者
- **WHEN** 開啟 `annotation-workspace` 左欄
- **THEN** 摘要為「第 1 則的發言者：第 1 則的文字」，旁邊顯示「5 則發言」與「3 位發言者」兩個小標籤（英文介面 `5 turns`、`3 speakers`）
- **AND** `annotation-list` 的摘要帶同樣前綴、不顯示標籤

#### Scenario: AC-1.40 不適用時不加前綴與標籤

- **GIVEN** 某任務的 `dialogue_fields` 為 `null`，Input 為物件陣列
- **WHEN** 渲染該樣本摘要
- **THEN** 摘要維持「`{n} 筆資料`」，不加前綴、不顯示任何標籤
- **AND** 當 `dialogue_fields.speaker` 為 `null` 時，摘要不加前綴、只顯示發言數標籤，不顯示發言者數標籤

#### Scenario: AC-1.41 前綴與標籤不讀 Output 且搜尋字串不變

- **GIVEN** 任務 T013 的 Output 欄位含不同於 Input 的文字
- **WHEN** 渲染摘要與標籤，並於 `annotation-list` 以發言者名稱搜尋
- **THEN** 前綴、標籤皆不含 Output 欄位的值
- **AND** 搜尋比對的字串不含前綴與標籤，與 AC-1.38 的規則一致

#### Scenario: SC-028 工作區與清單共用同一個摘要實作

- **GIVEN** 同一任務、同一筆樣本、相同的 `list_title_field`
- **WHEN** 分別於 `annotation-list` 文本摘要與工作區左欄取得該筆摘要
- **THEN** 兩處文字完全相同
- **AND** 兩頁的摘要皆經由 `LabelSuiteAnnotationWorkspaceData` 的同一個 helper 產生
