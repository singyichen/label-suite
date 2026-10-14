# Annotation List + Workspace — 對話串收尾項目（issue #1358）

## Purpose

本 delta 收斂 #1341 延後的對話串收尾：物件陣列 Input 不從 Output 預填關係三元組（FR-107 第 8 點）、無座標時只在唯一位置定位（第 9 點）、重疊實體顯示未標示數量（第 10 點），並讓標記清單摘要依 `dialogue_fields.text` 取文字而不硬編欄位名稱（FR-106 第 3 點）。新增 AC-2.36 ~ AC-2.38。

## MODIFIED Requirements

### Requirement: FR-106 標記清單樣本摘要

工作區左欄標記清單（標記員項目、reviewer 分組表頭、例外池分組表頭，見 FR-013A、FR-071 第 2 點）與 `annotation-list` 資料表文本摘要（FR-007、FR-007I）MUST 共用同一個摘要 helper，不得各自實作。每筆樣本產出單一字串，規則依序如下：

1. 任務設定 `list_title_field` 非 `null`，且該欄位角色為 Input 或 Evidence、或欄位名稱為 `id` 且角色不是 Output（specs/task-management/013-task-new/spec.md FR-002c-9 的選項集合）時，取該欄位的值產生摘要；該欄位不在此集合（例如已改為 Output 或不使用）時，視同 `null`，不得讀取。
2. `list_title_field` 為 `null`（自動）時，依 `fieldRoleMap` 宣告順序取第一個角色為 Input、且能產生摘要文字的欄位。
3. 取得欄位值後依值的形狀產生文字：字串、數字或布林值為其字串值；每一筆皆為物件且任務設定 `dialogue_fields.text` 指向的子欄位皆為字串的陣列，取第 1 筆該子欄位的文字（`dialogue_fields` 為 `null` 時不硬取 `text` 或任何欄位名稱，視為無文字欄位）；其他非空陣列為「`{n} 筆資料`」（英文 `{n} items`）；非空的純物件為「`{k} 個欄位`」（英文 `{k} fields`）。
4. 欄位值為空（`null`、未定義、空字串、空陣列、空物件）或第 1 筆文字為空時視為無法產生文字；指定欄位無法產生文字時，改以第 2 點的自動規則補位；仍無任何文字時退回該筆的 `id`；無 `id`（或 `id` 角色為 Output）時為空字串，呼叫端自行顯示占位符。
5. 摘要 MUST NOT 含 `[object Object]`；MUST NOT 讀取角色為 Output 的欄位值（Data Fairness，對應 FR-023、FR-024M-1）；摘要的截斷與展開沿用 FR-007I 與 CSS 截斷，helper 不另行截斷文字。

`annotation-list` 文本摘要自本條起為單一欄位摘要，不再串接多個 Input 欄位。`annotation-list` 搜尋框 MUST 另外比對該筆所有角色為 Input 的欄位文字（物件陣列串接每筆文字，規則同第 3 點，以 `dialogue_fields.text` 為準，不得輸出 `[object Object]`），不得比對 Output 與 Evidence 欄位，顯示的摘要不變（AC-1.38）；比對字串與摘要共用同一份資料層實作，`annotation-list` 不另行字串化。本條不規範發言者前綴、對話串渲染與中央整合預覽（另案）。

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

### Requirement: FR-107 整合預覽對話串與發言內座標

工作區中央「整合預覽」（FR-013E、FR-024I）對 Input 欄位為物件陣列的樣本，MUST 依下列規則呈現與記錄，且 MUST NOT 依任務編號或欄位名稱硬編：

1. **對話串（2-A）**：任務設定 `dialogue_fields`（`{text, speaker, utt_id}`，specs/task-management/013-task-new/spec.md FR-002c-10）非 `null` 時，整合預覽每則發言一列，顯示發言者、`#` 加發言編號與發言文字；所有發言皆可標記，不得截斷。發言編號取 `dialogue_fields.utt_id` 指向的子欄位值，未設定時為該則的位置編號（自 1 起）。
2. **座標資料契約**：在對話串內標記的實體 MUST 記為 `{text, type, utt_id, start, end}`，`start`／`end` 為**該則發言文字內**的半開區間 `[start, end)`（`end = start + text.length`），與 FR-098、FR-024A-3 同一座標語意。關係識別的三元組 MUST 於 `subjStart`／`subjEnd`／`objStart`／`objEnd` 之外攜帶 `subjUttId`、`objUttId`。
3. **跨發言**：反白起訖落在不同則發言 MUST 被拒絕，顯示提示且不新增實體或關係選取；跨發言的關聯 MUST 以關係識別表達。
4. **原始 JSON 後備（2-C）**：Input 為物件陣列但 `dialogue_fields` 為 `null` 時，整合預覽 MUST 以可摺疊、等寬字的原始 JSON 呈現該 Input 欄位，不得出現 `[object Object]`。
5. **Data Fairness**：對話串與原始 JSON MUST 只渲染角色為 Input 的欄位；Output（如 `gold_triplets`）與 Evidence 不得因此路徑外露（FR-023、FR-024M-1）。
6. **不含端點範圍**：既有非對話路徑的 offset 寫法不在本條範圍；本條新增的 `utt_id` 座標一律半開區間。
7. **種子合規**：任務 T013 的 `text` 欄位角色 MUST 為「不使用」、`utterances` 為唯一 Input，並設定 `dialogue_fields`（specs/task-management/013-task-new/spec.md FR-002c-2）。
8. **不從 Output 預填**：Input 為物件陣列時，整合預覽 MUST NOT 以 Output 欄位內容（含 `entity1` 形狀與 `subj`／`rel`／`obj` 形狀的三元組）預填關係三元組；與 ABSA 三元組同一處理（AC-2.35、Data Fairness）。
9. **定位規則**：實體已帶 `utt_id`、`start`、`end` 時 MUST 照座標定位；未帶座標時，其文字在整份對話的發言中恰出現一次才定位到該位置；出現多次或找不到時 MUST NOT 猜測（不得取第一次出現的位置），該實體不標示，並顯示「無法定位」提示與數量。
10. **重疊實體**：同一則發言內區間重疊的實體，後者 MUST NOT 默默略過；儲存格式不變，畫面 MUST 顯示因重疊而未標示的實體數。

#### Scenario: AC-2.31 對話串一則一列

- **GIVEN** 任務 T013，Input `utterances` 為物件陣列（共 5 則），`dialogue_fields` 為 `{text: 'text', speaker: 'speaker', utt_id: 'utt_id'}`
- **WHEN** 開啟 `annotation-workspace` 的整合預覽
- **THEN** 顯示 5 列，每列各有發言者、`utt_id` 與該則文字
- **AND** 不出現 `[object Object]`，且各則文字不被串成同一段

#### Scenario: AC-2.32 反白座標記為發言編號加該則內半開區間

- **GIVEN** 已選取實體類型，T013 第 `utt_id` 為 0 的發言文字內含「過熱問題」
- **WHEN** 在該則發言內反白「過熱問題」
- **THEN** 新增的實體為 `{text: '過熱問題', type, utt_id: 0, start, end}`，且 `end - start` 等於 4，`start` 為該則文字內的位置
- **AND** 該則文字 `slice(start, end)` 等於「過熱問題」

#### Scenario: AC-2.33 跨發言反白被拒絕

- **GIVEN** 已選取實體類型
- **WHEN** 反白範圍起點在一則發言、終點在另一則發言
- **THEN** 不新增任何實體
- **AND** 顯示跨發言提示

#### Scenario: AC-2.34 無對話設定時退回原始 JSON

- **GIVEN** 任務 Input 為物件陣列且 `dialogue_fields` 為 `null`
- **WHEN** 開啟整合預覽
- **THEN** 顯示可摺疊、等寬字的原始 JSON，內容含該 Input 欄位的值
- **AND** 不出現 `[object Object]`

#### Scenario: AC-2.35 只渲染 Input 且 T013 種子合規

- **GIVEN** T013 資料含角色為 Output 的 `gold_triplets`
- **WHEN** 開啟整合預覽（對話串與原始 JSON 兩種呈現）
- **THEN** 頁面文字不含任何 `gold_triplets` 的內容
- **AND** T013 的 `text` 角色為「不使用」、`utterances` 為唯一 Input

#### Scenario: AC-2.36 物件陣列 Input 不從 Output 預填關係三元組

- **GIVEN** 任務 Input 為物件陣列（對話），資料另有角色為 Output 的欄位含 `entity1` 形狀或 `subj`／`rel`／`obj` 形狀的三元組
- **WHEN** 開啟整合預覽
- **THEN** 不預填任何關係三元組
- **AND** 頁面文字不含該 Output 欄位的內容

#### Scenario: AC-2.37 無座標時只在唯一位置定位

- **GIVEN** 某實體無 `utt_id`、`start`、`end`，其文字在整份對話的發言中恰出現一次
- **WHEN** 開啟整合預覽
- **THEN** 該實體標示在該唯一位置，且座標為該則發言內的半開區間
- **AND** 若該文字出現多次，則不標示該實體，顯示「無法定位」提示與數量，不取第一次出現的位置；已帶座標者照座標定位

#### Scenario: AC-2.38 重疊實體顯示未標示數量

- **GIVEN** 同一則發言內有兩個區間重疊的實體
- **WHEN** 開啟整合預覽
- **THEN** 儲存的實體資料不變
- **AND** 畫面顯示因重疊而未標示的實體數

#### Scenario: SC-029 座標以發言編號為單位且與 FR-098 同語意

- **GIVEN** 對話串內標記的任一實體
- **WHEN** 讀取其 `utt_id`、`start`、`end`
- **THEN** 發言文字 `slice(start, end)` 等於該實體 `text`
- **AND** `start`、`end` 皆不超出該則發言文字長度
