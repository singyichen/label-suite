## Context

#1338 為 #1337 的第一張子單，只做建立者端的指定與預覽。013 Step 1 與 014 設定›基本資料編輯模式共用 `task-config.engine.js`（FR-014k（specs/task-management/014-task-detail/spec.md） 同構），因此引擎一處實作即兩邊顯示；差別只在狀態與持久化：task-new 以精靈草稿與建立 payload 承載，task-detail 以 `TASK_DATA` 承載（第二組）。

## Decisions

### D1 設定鍵 `list_title_field`

型別 `string | null`；`null` ＝ 自動（預設）；字串為欄位原始 JSON key。引擎狀態名 `state.listTitleField`。payload 一律帶此鍵（自動時為 `null`），不以「缺鍵」表示自動，避免 task-detail 載入時需區分缺鍵與 `null`。

### D2 選項集合

候選欄位 ＝ 目前資料列來源所有紀錄欄位聯集中，角色為 Input 或 Evidence 者，加上名稱為 `id` 且角色不是 Output 者。Output 永不列入（Data Fairness）。型別剖析結果為物件陣列的欄位以 `<欄位名>（取第 1 則的文字）` 標示；其標題取第 1 個元素的 `text` 字串，無則取該元素第一個字串值。選項順序：自動、依欄位原始出現順序。

### D3 預覽與回退

預覽取所選資料列來源前 3 筆紀錄；每筆標題超過 40 字截斷並加省略號；值為空顯示「（空白）」。「自動」的標題規則不在本變更：自動時預覽沿用 `id`、無 `id` 則列號，僅作占位，#1339 會取代。每次 `renderInlineDatasetPreview()` 重繪時重新計算選項集合；若 `state.listTitleField` 非 `null` 且不在集合內，設為 `null` 並設定一次性提示（`role="status"`）。此單一規則同時涵蓋角色改為不使用、改為 Output 與切換資料列來源三種情境。`ponytail:` 不依來源記憶標題欄位，需要時再比照 `_roleMapBySource`。

### D4 UI 與 selector

下拉與預覽於引擎內動態建立並掛在既有預覽容器，不修改 `task-new.html` 與 `task-detail.panels/settings.html` 兩份重複的容器標記。`data-testid`：`list-title-field-select`、`list-title-preview`、`list-title-preview-item`、`list-title-revert-notice`。字串進 `TASK_CONFIG_I18N`（zh／en）。

### D5 持久化

task-new：`listTitleField` 加入 `PERSISTABLE_KEYS`（精靈草稿），並隨 `persistCreatedTask` 寫入 `list_title_field`。task-detail（第二組）：`resetTaskData`、`ensureTaskConfigSeeded`、`seedDatasetFromProfile`、`OVERVIEW_EDITABLE_FIELDS` 與儲存流程讀寫同一鍵。第一組合併後 task-detail 顯示下拉但不持久化，為已知過渡缺口。

### D6 錯誤情境

唯一錯誤情境為所選欄位失效（D3）；不阻擋進入 Step 2，也不新增驗證。
