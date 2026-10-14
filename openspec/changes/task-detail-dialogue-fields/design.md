## Context

issue #1386 的第二階段。task-detail 載入 `dialogue_fields` 後，共用引擎的對話串確認區在基本資料編輯模式出現；本 change 讓 task-detail 負責該設定鍵的載入、儲存與取消還原。沒有 API 或 DB schema 變動（prototype 階段），設定鍵形狀沿用 013 task-management/013-task-new FR-002c-10。

## Decisions

### D1 設定鍵與資料流

`dialogue_fields: { text, speaker, utt_id, reply_to } | null`，形狀與失效規則完全沿用 013。資料流：profile（`task-detail.data.js`）→ `TASK_DATA.dialogue_fields`（`task-detail.html` 載入，位置鄰近 `TASK_DATA.list_title_field = profile.list_title_field` 那行）→ `state.dialogueFields`（`task-detail.config.js` 的 `ensureTaskConfigSeeded()`）→ 儲存時 `TASK_DATA.dialogue_fields = state.dialogueFields ?? null`。缺少 `reply_to` 的舊資料視同 `null`。

### D2 載入與 declined 重設

`ensureTaskConfigSeeded()` 每次 seed 都以 `TASK_DATA.dialogue_fields` 重新設定 `state.dialogueFields`（任務無此鍵時為 `null`），並將 `state.dialogueDeclined = false`。理由：取消編輯後重新 seed，必須回到已儲存的開關狀態；若沿用上次的 declined 旗標，開關會被關掉、標題回到「N 筆資料」。已儲存為 `null` 且資料形狀可偵測時，依 013 偵測與預填規則顯示確認區，與 Step 1 一致。

### D3 儲存與取消

- 儲存：基本資料儲存路徑（`task-detail.html` 寫入 `TASK_DATA.list_title_field` 附近）新增一行寫回 `TASK_DATA.dialogue_fields`；使用者取消提議或不是對話串時寫 `null`。此寫入 MUST 放在 `renderSettingsEditState()` 之外（另一分支正在編輯該函式）。
- 取消：取消編輯與放棄變更的頁內確認皆走既有的重新 seed 路徑，不新增獨立還原函式；重新進入編輯模式時開關、對應與自動標題回到已儲存值。

### D4 預覽與標題

「自動」清單標題預覽由共用引擎以 `state.dialogueFields` 產生，結果須等於 015 FR-106 `getRecordSummaryText` 對同一筆資料的輸出（第 1 則的 `text`，依 FR-106 加發言者前綴）。標記設定預覽沿用 013 的對話串預覽元件，task-detail 不另寫第二份。

### D5 selector 與引擎

不新增 `data-testid`；Red 沿用 `#inlineDialogueBlock` 與 013 既有 `dialogue-field-*`。`task-config.engine.js` 僅更新「只有 task-new 宿主頁啟用」那段註解（已於 5e612314 完成），不改行為。

### D6 錯誤與邊界

已儲存的 `dialogue_fields` 在目前資料形狀下不再合法時，沿用 013 的失效處理（重新偵測；使用者取消提議後不得自動再預填）。非對話任務 `state.dialogueFields` 恆為 `null`，行為與修正前相同。

## Constitution Check

- Generalization-First：不新增任務類型分支，沿用共用引擎。
- Data Fairness：文字來源限 Input；預覽與標題不含 Output／Evidence。
- 檔案上限：產品檔案 3 個（`task-detail.config.js`、`task-detail.html`、`task-config.engine.js` 僅註解），低於 5 個。
