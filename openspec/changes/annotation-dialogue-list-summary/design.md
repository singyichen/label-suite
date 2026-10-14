## Context

#1378 第三個 change（PR-B2），只做 FR-106 摘要的發言者前綴與左欄小標籤。堆疊於 PR-B1（015 v12.9.0）之上。

## Decisions

### D1 前綴條件

摘要取自「對話串形態」（物件陣列、每筆 `dialogue_fields.text` 皆為字串）且 `dialogue_fields.speaker` 非 `null`，且第 1 筆該子欄位值為非空字串時，摘要為 `{speaker}：{text}`（英文介面 `{speaker}: {text}`）。其餘一律維持原摘要，不加前綴。

### D2 標籤

資料層新增 `getRecordSummaryTags(record, fieldRoleMap, listTitleField, lang, dialogueFields)`，回傳字串陣列，欄位選取規則與 `getRecordSummaryText` 相同（同一份選欄邏輯，不重複實作）：`dialogue_fields` 非 `null` 且摘要取自對話串形態時，回「`{n} 則發言`」（英文 `{n} turns`），n 為陣列長度；`dialogue_fields.speaker` 非 `null` 且不重複的非空發言者數 m ≥ 1 時，再回「`{m} 位發言者`」（英文 `{m} speakers`）。否則回空陣列。

### D3 selector

左欄三處（標記員項目、reviewer 分組表頭、例外池分組表頭）於摘要旁渲染 `<span data-testid="ws-summary-tag">`，每個標籤一個。`annotation-list` 不顯示標籤，但摘要經共用 helper 自然帶前綴。

### D4 搜尋不變

`getRecordSearchText` 不加前綴、不含標籤字串（AC-1.38）。

### D5 錯誤情境

無新增錯誤情境。
