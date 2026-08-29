# Design: reject-reason-required

## Context（脈絡）

正典 `specs/annotation/015-annotation-workspace/spec.md` v4.55.0。審核卡（FR-053）每個 outKey 一組通過／退回按鈕（`buildRowDecisionButtons()`），決策存於 `reviewRowDecisions[decisionKey(outKey, annotatorId)]`，草稿由 `persistReviewDraft()` 走 FR-014S 路徑，送出由 `handleReviewSubmit()` 以 `pendingReviewOutputKeys()` 驗證（FR-083）並把 `decisions` map 寫入 reviewer submission（issue #551）。`official_run` 退回時 `markSampleRejected()` 把標記員 bucket 回退為 `pending` 並附 `rejected` 歷程事件（FR-014I）。本設計在此骨架上加「理由」這一個欄位並讓它在標記員側可讀，不引入新的儲存桶。

## Goals / Non-Goals

**Goals：**
- 退回必填理由（兩種 `run_type`），理由隨決策草稿與 reviewer submission 持久化。
- 送出驗證與阻擋 toast 共用單一逐 outKey 判定。
- `official_run` 標記員在重標待辦樣本上看到逐 outKey 理由。

**Non-Goals：**
- 不重建送出前確認區（FR-077 已撤銷）。
- 不改變收斂／爭議／仲裁／定稿邏輯，不改 API／DB。
- 不提供理由的 resolved／unresolved 閉環（留待後端階段）。

## Decisions（決策）

1. **理由欄掛載位置**：以 `row`（`ws-review-row` 內容卡）的直接子元素掛在直接修正控件之後，而非 Bypass 列內——共用引擎會整體重繪作答面板（FR-014P 第 3 點），Bypass 列內的元素需靠 MutationObserver 重新掛回；理由欄放在面板外即不受重繪影響。span 合併列（FR-014N）每個 outKey 各一欄，依 `outKeys` 順序接在同一張卡之後。
2. **單一阻擋判定**：新增 `reviewRowBlocker(outKey, rowName)` 回傳 `null | 'undecided' | 'reason'`；`pendingReviewOutputKeys()` 改由它推導（仍回傳 outKey 陣列）。toast 文案：只要有任一 `undecided` 即用既有 `toastSelectDecision`；全部為 `reason` 時用新鍵 `toastRejectReasonRequired`（`請填寫以下輸出類型的退回理由：{list}`）。這樣 FR-083「與送出驗證共用來源」的契約自然延伸到理由。
3. **停用呈現**：「送出審核」以 `data-submit-blocked="reason"` 屬性＋CSS 呈現停用外觀，不用 `disabled` 也不用 `aria-disabled`——FR-083／AC-3.47 要求點擊時 toast 指名 outKey，原生 `disabled` 會吞掉 click 事件，而 `aria-disabled` 亦會被 Playwright actionability（及輔助技術）視為不可操作（Red 階段實測）。
4. **持久化**：
   - 草稿：`persistReviewDraft()` 的每筆 `{decision, corrected}` 增加 `reason`；`restoreReviewDraft()` 還原。
   - 送出：`submitPayload.reasons = { [outKey]: reason }`（僅退回者）；`decisionLines` 附理由（`outKey · annotator: reject — 理由`），因此 `markSampleRejected()` 的歷程摘要自然帶理由（FR-016B 歷程面板不另改）。
5. **標記員側資料來源**：`data.js` 新增 `getReworkReasons(taskId, runType, sampleId, identity)`：`runType !== 'official_run'` 回傳 `[]`；標記員 entry 狀態須為 `pending` 且最後一筆歷程為 `rejected`（＝重標待辦的判定，與 `entryStatus()`／`appendHistoryEvent()` 同源）；再掃描 `readReviewerSubmissions()`（本變更使其附帶 `submittedAt`）中 `decisions[outKey] === 'reject'` 者，輸出 `{ outKey, reason, reviewerId, at }`。
6. **橫幅渲染**：`patchedUpdateAnnotationPreview()`（僅 annotator 分支）於 `wrapAnnotatorCards()` 後呼叫 `renderReworkReasonsBanner()`，以 `insertBefore(preview.firstChild)` 置頂；被退回 outKey 之 `ws-output-panel-{outKey}` 加 `data-rework-rejected="true"` 與 `.rv-rework-rejected` 外框。引擎每次重繪都會清空 `#annotationPreview`，故不需去重。

## Risks / Trade-offs

- 既有 Playwright 測試多處「退回→直接送出」需補填理由（一律以 `page.getByTestId('ws-review-reject-reason').fill(...)`），改動列於 tasks.md 並逐檔列舉。
- `readReviewerSubmissions()` 回傳物件多一個欄位，所有既有呼叫端只讀 `reviewerId`／`answers`，向後相容。
