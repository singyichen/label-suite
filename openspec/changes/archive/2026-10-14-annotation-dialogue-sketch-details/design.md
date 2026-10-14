## Context

#1378 第二個 change，只做 015 工作區整合預覽的顯示。`reply_to` 設定來源見 013 v8.6.0（FR-002c-10、AC-1.13、AC-1.14）。左欄清單摘要（FR-106）延後至 #1378 PR-B2。

## Decisions

### D1 回覆有效性

`reply_to` 有效 ⇔ `dialogue_fields.reply_to` 非 `null`，且該則 `turn[reply_to]` 為非空字串或數字，且以字串比較後等於**另一則**（索引不同）發言的發言編號。其餘一律無效：不縮排、不標記。比較沿用 `dialogueUttIdOf`（同一份發言編號邏輯）；標記上的 `n` 為被回覆發言顯示的發言編號。缺少 `reply_to` 鍵視同 `null`。

### D2 啟用方式

`renderDialogueThread(container, turns, cfg, opts)` 新增選項 `opts.rich`。只有工作區整合預覽（`renderDialogueInput`）傳入；task-new Step 1 預覽維持原本單列版面，不受影響。`rich` 時每列為「頭像＋內容」，內容含標頭行（發言者、`#n`）、回應標記（有效時）、文字。

### D3 selector

保留 `dialogue-thread-row`、`dialogue-utt-id`、`dialogue-speaker`、`dialogue-text`。新增 `dialogue-avatar`（頭像，內容為發言者第一個字元）、`dialogue-reply-tag`（回應標記）、`dialogue-view-entities`、`dialogue-view-plain`（切換按鈕，`aria-pressed`）。有效回覆的列另帶 `data-reply-to="<被回覆的發言編號>"`。

### D4 頭像顏色

發言者字串雜湊後取色相，寫入 CSS 變數 `--avatar-hue`，底色與文字色由 CSS 以該變數組成；同一發言者恆同色，不依名稱硬編。

### D5 切換

`state.dialogueShowEntities`（預設 `true`）。「純文字」時 `fillText` 只寫 `textContent`，不呼叫 `fillDialogueUtterance`；按鈕按下後呼叫既有 `refresh()` 重繪。切換元素為 `<span role="button" tabindex="0">`（含 Enter／Space 鍵盤處理），因工作區預覽區會改寫區內原生 `<button>` 的 testid。反白標記的位置計算依 DOM 文字，與模式無關。

### D6 字串

`TASK_CONFIG_I18N`（zh／en）：`dialogueShowEntities`、`dialoguePlainText`、`dialogueReplyTag`（含 `{n}` 佔位）。

### D7 錯誤情境

無新增錯誤情境；無效 `reply_to` 即不縮排、不標記。
