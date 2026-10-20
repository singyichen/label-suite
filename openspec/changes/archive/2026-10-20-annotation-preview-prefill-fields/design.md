## Context

#1430 第二個 change，讀取端。第一個 change（specs/task-management/013-task-new/spec.md FR-002c-11）已定義 `prefill_fields` 並帶出到任務資料；本 change 讓整合預覽只認這個宣告。

## Decisions

### D1 單一讀取點

新增 `getPrefillColumnValue(kind)`（`kind` 為 `entities` 或 `triples`）：取 `state.prefillFields[kind]` 的欄位名；非字串或空字串、角色（`state.fieldRoleMap[欄位]`）非字串／空字串／`output` 時回傳 `undefined`，否則回傳 `state.datasetRawFirstRow` 該欄位的值。實體與三元組共用同一守門，避免兩套判斷（DRY）。

### D2 取代的硬編讀取

- `initPreviewState` 的實體：原讀 `datasetRawFirstRow.entities`，改取 `getPrefillColumnValue('entities')`，非陣列視同空。
- `initPreviewState` 的三元組候選：原為固定鍵 `triples`／`gold_triplets`／`gold_triples`，改為 `[getPrefillColumnValue('triples'), outputParsed]`；Output 欄位解析路徑（`outputParsed`）不動。
- 關係類型自動帶入候選：原為同一組固定鍵，改為宣告且通過守門的三元組欄位；既有的輸出欄位候選保留。

### D3 工作區帶出

`resolveTaskProfile` 以 `detail.prefill_fields ?? null` 帶出 `prefillFields`；設定狀態 `state.prefillFields` 接收，與 `dialogueFields` 同構。task-new 的 `state.prefillFields` 恆為 `null`（無 UI），故精靈預覽不依欄位名稱預填。

### D4 不動的部分

審核員端 `scaffoldingEntities` 與 Output 欄位解析預填路徑不動（範圍外，已於 proposal 列出）。

### D5 需同步的既有規格

釘住舊硬編鍵名行為、必須在 Red 階段先更新的既有規格，由探測執行（完整跑一次含 `entities`／`triples`／`T008`／`T010`／`T013` 字樣的規格）得出七項：T010 整合模式刪除實體連動三元組、T008 純關係模式預填三元組徽章與刪除、issue-1371 對話 Input 自帶實體、issue-1413 角色守門的已知角色載入（兩個角色）、issue-590 T008 三元組帶偏移、task-new 預覽 medical-ner-re 複合檔案。更新原則：測試目的是其他行為（徽章、刪除、偏移、連動）者，補宣告 `prefill_fields` 並把欄位角色改為 Evidence；測試目的是預填來源者，改斷言新契約。

### D6 錯誤情境

宣告的欄位不存在於紀錄：`undefined`，視同空。宣告值非字串：視同未宣告。
