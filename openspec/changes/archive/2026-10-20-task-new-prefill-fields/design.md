## Context

#1430 第一個 change，只做設定鍵的定義與帶出。讀取端（預覽改讀宣告欄位）屬 015 的第二個 change。維護者裁定不新增任何 UI，故精靈（task-new）不能設定此鍵，只有種子與既有任務資料可攜帶。

## Decisions

### D1 設定鍵形狀

`prefill_fields: { entities: string | null, triples: string | null } | null`。值為資料列紀錄中存放預填實體／預填三元組陣列的欄位原始 key；`null` ＝ 不預填。引擎狀態命名 `state.prefillFields`，payload 與任務資料命名 `prefill_fields`，與 `dialogueFields`／`dialogue_fields` 同構。

### D2 預設與向前相容

整個鍵預設 `null`；缺少子鍵視同 `null`；既有任務與種子缺少此鍵一律視同 `null`。讀取端（015）在取用前才做此正規化，本 change 的載入端只原樣帶出（`profile.prefill_fields ?? null`，淺拷貝）。

### D3 帶出面

- task-new：state 預設 `prefillFields: null`，`persistCreatedTask` 寫入 `prefill_fields: state.prefillFields ?? null`；因無 UI 可改，不加入草稿 `PERSISTABLE_KEYS`。
- task-detail：任務資料載入時由 profile 帶入 `TASK_DATA.prefill_fields`；設定狀態種子 `state.prefillFields`；儲存設定時寫回，避免儲存丟失宣告。

### D4 種子

僅 T008 宣告 `{ entities: 'entities', triples: null }`（`entities` 欄位角色為 Evidence）。T010、T013 對應欄位角色為 Output，宣告了也會被讀取端 fail-closed 擋下，且宣告 Output 欄位違反 Data Fairness 意圖，故不宣告。

### D5 錯誤情境

無新增驗證；宣告的欄位名稱不存在於紀錄或角色不合法時，讀取端視為無預填（015 負責）。
