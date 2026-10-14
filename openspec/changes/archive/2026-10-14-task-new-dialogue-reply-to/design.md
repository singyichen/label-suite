## Context

#1378 第一個 change，只做建立者端宣告 `reply_to`。顯示端（回覆縮排、回應標記）屬 015 的第二個 change。

## Decisions

### D1 設定鍵形狀

`dialogue_fields: { text: string, speaker: string | null, utt_id: string | null, reply_to: string | null } | null`。`reply_to` 為 Input 物件陣列元素內部、存放「被回覆發言的發言編號」的子欄位原始 key；`null` ＝ 未指定（不縮排、不標記）。引擎狀態沿用 `state.dialogueFields`，payload 沿用 `dialogue_fields: state.dialogueFields ?? null`。讀取端遇到舊資料缺少 `reply_to` 時視同 `null`。

### D2 候選與預設

候選＝物件陣列所有元素中，值皆為字串、數字、`null` 或缺漏，且至少一個元素非空的子欄位，並排除目前選為文字欄位者。預設一律 `null`，不使用名稱線索（`DIALOGUE_FIELD_NAME_HINTS` 不新增 `reply_to` 項目）。重新預填（切換勾選、整組失效）時 `reply_to` 為 `null`。

### D3 失效

每次 `renderDialogueBlock()` 重繪時，若 `reply_to` 非 `null` 且不在目前候選中（角色改走、換資料列來源、換檔，或與文字欄位相同），則只將 `reply_to` 清為 `null`，其餘三個對應仍合法時保留。候選為空時不顯示該下拉。

### D4 UI 與 selector

字串進 `TASK_CONFIG_I18N`（zh／en）：`dialogueReplyToLabel`、`dialogueReplyToNoneOption`。`data-testid`：`dialogue-field-reply-to`（`<select>`，第一個選項為「不使用」，值為空字串）。

### D5 錯誤情境

唯一錯誤情境為已確認 `reply_to` 失效（D3）；不阻擋進入 Step 2，也不新增驗證。
