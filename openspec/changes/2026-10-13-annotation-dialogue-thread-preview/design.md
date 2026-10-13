## Context

#1340 把 `dialogue_fields`（`{text, speaker, utt_id}`）存進 task-new 建立的任務，並提供 `renderDialogueThread`。工作區整合預覽（`renderAbsaUnifiedPreview`，T013 為 entity_recognition + relation_identification）仍只吃單一字串，反白座標為整串文字的含端點 offset。本設計定義工作區對話串呈現與座標資料契約。

## Decisions

### D1 設定來源

任務 profile 鍵 `dialogue_fields`（`{text, speaker|null, utt_id|null}` 或 `null`）。`resolveTaskProfile` 帶出為 `dialogueFields`，`seedEngineState` 寫入 `state.dialogueFields`，與 task-new 同一個引擎狀態鍵，`renderDialogueThread` 與 `dialogueJoinedText` 因而共用。

### D2 何時顯示對話串

第一個角色為 Input、且當筆值為物件陣列的欄位，`state.dialogueFields.text` 為非空字串時顯示 2-A 對話串；否則該 Input 為物件陣列時顯示 2-C 原始 JSON（`<details>`，預設展開，內容為該 Input 欄位的 `JSON.stringify(value, null, 2)`，等寬字）。只讀 Input 欄位，永不讀其他欄位。

### D3 座標資料契約

對話串內標記的實體（`state.previewEntities`）：

```
{ text, type, utt_id, start, end }
```

- `utt_id`：`dialogue_fields.utt_id` 指向的子欄位值（保留原型別）；未設定時為該則顯示編號（陣列位置 + 1，與 `renderDialogueThread` 顯示一致）。比對時以 `String()` 正規化。
- `start`／`end`：**該則發言文字內**的半開區間 `[start, end)`，`end = start + text.length`；`text === turn[text欄位].slice(start, end)`。
- 帶 `utt_id` 的實體一律為半開區間；不帶 `utt_id` 的既有路徑維持含端點寫法（不在本單範圍）。兩者以「是否有 `utt_id`」區分，不加旗標。

### D4 跨發言

選取起點與終點落在不同則發言 → 拒絕：不新增實體、不設定關係選取，顯示提示（`data-testid="dialogue-cross-utt-hint"`，role="alert"）。同一次互動選到列上非文字區（發言者、編號）時，以選取範圍是否完整落在單一則的文字節點判定，不落在文字節點者視同拒絕。

### D5 關係識別傳遞

關係建構器的選取（`state.relSel`）、E1／E2 槽位、關係觸發詞、三元組皆在有 `utt_id` 時攜帶之：三元組新增 `subjUttId`、`objUttId`（無 `utt_id` 時不寫入鍵）；顯示字串為 `text (#<utt_id>:<start>,<end>)`；`findEntitySlot` 以 `text`＋`utt_id`＋`start` 比對。工作區 `fmtEntityForTriple` 改為呼叫引擎的 `fmtRelSpan`，確保兩處標籤格式一致。

### D6 Input 角色保留規則

原 `seedEngineState` 刪除所有首列值為物件／陣列的 Input 角色，目的是避免 `getDatasetPreviewText` 對純值陣列（例如 sequence_tagging 的 `tokens`）做 `String()` 逗號串接而污染預覽與 token 計數。新規則（通用，不依欄位名稱）：**只保留「物件陣列」形狀的 Input 角色**（陣列且至少一筆、每筆皆為非 `null`、非陣列的物件）；純值陣列與純物件仍剔除。物件陣列的文字由 `dialogueJoinedText` 以已確認的設定產生，未設定時產出 `null`，不會落入 `String()` 路徑。

### D7 示範答案定位（CompactAnswer）

`placeCompactEntities`（reviewer 示範列只有 `{text, type}`）在對話串模式下改為逐則發言內找第一個尚未被取用的出現位置，寫入 `utt_id` 與半開 `[start,end)`；找不到者維持無位置、不反白，與既有行為相同。

### D8 reviewer 原文

`buildReviewerInputText` 對物件陣列 Input 改用 `dialogueJoinedText`（已確認設定時）；其餘形狀維持原行為。

### D9 T013 種子

`fieldRoleMap` 的 `text` 改為 `unused`（「不使用」）、`utterances` 為唯一 `input`，新增 `dialogue_fields: { text: 'text', speaker: 'speaker', utt_id: 'utt_id' }`。種子與渲染路徑同一 PR 群組完成（母單坑 1）。

## Risks

- 既有測試假設 T013 的 `text` 為 Input（`dashboard-output-types.spec.ts` 等），逐條更新並在 PR 說明交代，不放寬斷言本意。
- `renderDialogueThread` 原有 20 則上限；工作區需可標記全部發言，因此以選項取消上限，task-new 預覽維持原行為。
