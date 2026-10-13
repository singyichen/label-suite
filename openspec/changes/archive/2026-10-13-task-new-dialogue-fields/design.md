## Context

#1340 為 #1337 的子單 C，只做建立者端的偵測、確認與 Step 2 預覽。013 Step 1 與 014 設定›基本資料編輯模式共用 `task-config.engine.js`；本單只在 task-new 宿主啟用（見 proposal 已知範圍界線）。

## Decisions

### D1 設定鍵 `dialogue_fields`

沿用 issue 暫名。型別 `{ text: string, speaker: string | null, utt_id: string | null } | null`；`null` ＝ 不以對話串呈現（預設）。三個值皆為「Input 物件陣列欄位內部子欄位的原始 key」。`text` 必填（物件存在即必有）；`speaker`、`utt_id` 為 `null` 表示未選（`utt_id` 未選時呈現與工作區用陣列序號，從 1 起算）。載體欄位（哪一個 Input 欄位）不另存：FR-002c-2 規定 `single_item` 恰好 1 個 Input，載體即 `field_role_map` 中唯一的 Input 欄位，避免兩處真相。引擎狀態名 `state.dialogueFields`，另有 `state.dialogueDeclined`（boolean，建立者取消提議後不再自動預填）。payload 一律帶 `dialogue_fields`（無則 `null`）。

### D2 偵測

偵測對象為角色為 Input 的欄位（不看 Evidence／Output），且僅限 `single_item` 輸入類型（`item_pair` 不提議）。欄位符合條件：在 `datasetPreviewRawRows`（資料列來源前 3 筆紀錄）中，該欄值為非空陣列、每個元素皆為物件，且存在至少一個「在所有元素中皆為字串」的子欄位（文字候選）。

預填（僅為預設，一律可改）：
- `text`：文字候選中，名稱（不分大小寫）包含 `text`／`utterance`／`content`／`message`／`sentence` 之一者（依子欄位出現順序第一個）；無命中取第一個文字候選。
- `speaker`：其餘「所有元素皆為字串」的子欄位中，名稱包含 `speaker`／`role`／`author`／`user`／`name` 之一者；無命中為 `null`（不猜）。
- `utt_id`：子欄位值皆為字串或數字且名稱為 `utt_id`／`utterance_id`／`turn_id`／`id`／`idx`／`index` 之一者；無命中為 `null`。

名稱線索表為常數 `DIALOGUE_FIELD_NAME_HINTS`，只決定預填，不決定是否提議，故不違反 FR-002c-8 的「不以欄名決定角色」精神；它們只在已是 Input 的欄位內作用。

### D3 確認、取消與失效

確認區（`inlineDialogueBlock`）位於清單標題區塊之後，包含：提議勾選（預設勾選＝採用預填）、文字欄位 `<select>`（選項＝文字候選）、發言者 `<select>`（選項＝其餘字串子欄位，另有「不使用」）、發言編號 `<select>`（選項＝字串或數字子欄位，另有「使用陣列序號」）。取消勾選 → `dialogueFields = null` 且 `dialogueDeclined = true`；再勾選 → 重新預填並清除 `dialogueDeclined`。

每次 `renderInlineDatasetPreview()` 重繪時重新檢查：無符合條件欄位 → `dialogueFields = null`、`dialogueDeclined = false`、不顯示確認區（偵測不到就不提議）；已確認的 `text`／`speaker`／`utt_id` 任一不再合法（角色改走、換資料列來源、換檔）→ 若未取消則重新預填，已取消則維持 `null`。重新預填不觸發 `markDirty()`，僅使用者操作觸發。

### D4 Step 2 預覽與文字來源

- `getDatasetPreviewText()`：Input 欄位值為字串時行為與現狀逐位元組相同（標記工作區 span 偏移依賴此值）；數字、布林維持原 `String(v)`。值為物件陣列且已確認 `dialogueFields.text` 時，取各元素的 `text` 子欄位字串以 `'\n'` 串接；其他物件／陣列物件一律略過（不呈現 `[object Object]`）。無 Input 欄位時的「最長字串欄位」退回保留（標記工作區將物件 Input 角色移除後仰賴此退回），但候選排除角色為 Output 或 Evidence 的欄位。
- 通用輸入文字區塊（FR-003g-3 的 `single_item`）：值為物件陣列且已確認 `dialogue_fields` 時，改渲染對話串；值為其他物件／物件陣列時顯示 `JSON.stringify`（截斷 300 字，與 Evidence 卡既有作法一致）。
- 對話串每則一列：發言編號（未選用 `index + 1`）、發言者（未選則略）、文字；最多顯示前 20 則並提示其餘數量。共用渲染函式放引擎，子單 D 的工作區重用同一函式。

### D5 UI 與 selector

字串進 `TASK_CONFIG_I18N`（zh／en）。`data-testid`：`dialogue-fields-block`、`dialogue-fields-toggle`、`dialogue-field-text`、`dialogue-field-speaker`、`dialogue-field-utt-id`、`dialogue-thread-preview`、`dialogue-thread-row`、`dialogue-utt-id`、`dialogue-speaker`、`dialogue-text`。

### D6 持久化與宿主界線

task-new：`dialogueFields`、`dialogueDeclined` 加入 `PERSISTABLE_KEYS`（精靈草稿），建立任務 payload 帶 `dialogue_fields`；檔案移除／重設時清為 `null`／`false`。引擎僅在 `state.dialogueFields !== undefined` 時啟用本功能，task-detail 尚未初始化該鍵，故不顯示確認區、不受影響。

### D7 錯誤情境

唯一錯誤情境為已確認子欄位失效（D3）；不阻擋進入 Step 2，也不新增驗證。
