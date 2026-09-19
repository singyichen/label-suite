# 設計：drop-reviewer-submit-wrapper-event（issue #583）

## Context

審核員送出的寫入路徑都在 `design/prototype/pages/annotation/annotation-workspace.data.js`：

- `markSampleSubmitted(taskId, role, runType, sampleId, payload, historySummary, identity)` 不分角色，一律呼叫 `appendHistoryEvent(entry, 'submitted', …)`。當 `role === 'reviewer'` 且 payload 帶 `decisions` 時，接著呼叫 `appendReviewDecisionEvents()`。
- `appendReviewDecisionEvents()` 對每個 `outKey` 依 `REVIEW_DECISION_EVENT_ACTION`（`approve → accepted`、`modify → modified`、`bypass → bypassed`）各寫一筆事件，每筆都附上 `timingFields(payload.timing)`。
- 包裝事件同樣附上 `timingFields(payload.timing)`，所以同一份 timing 會寫 N+1 次。

`payload.timing` 來自工作區頁面的 `leadTimer`（`annotation-workspace.config.js`）：它是**單次開啟的累計器**，`startedAt` 是這次開啟的時間，`leadTime` 是到目前為止的可見時間。同一次開啟中先存草稿、後送出，兩筆事件會共用同一個 `startedAt`，而 `leadTime` 遞增。

消費端：

- `shared/annotation-history.js` 的 `collapseHistory()`（v4.63.0，issue #601）：在呈現層折疊 reviewer 的包裝 `submitted`。
- 同檔的 `totalLeadTime()`（issue #606）：以 `(actorId, started_at)` 分組、組內取最大值再加總，擋掉 N+1 重複與同一次開啟的草稿／送出重複。
- `annotation-list.html` 的處理狀況彙總（FR-091）：讀 `getSampleHistory()` 的結果，取最新一筆作為「最後動作」。

## Goals / Non-Goals

**Goals**：審核員送出不再產生 `submitted`；一次作業只寫一份 timing；FR-091 同時戳的 tie-break 有明文規定。

**Non-Goals**：見 proposal.md「非目標」。

## Decisions

### D1：在寫入點移除包裝事件，而非在讀取端過濾

`markSampleSubmitted()` 只在沒有 `decisions` 時（也就是標記員提交時）寫 `submitted`。

**否決的替代方案**：保留寫入、在讀取端統一過濾。這樣資料層仍然違反 FR-086，每個新的消費端也都得記得要過濾；v4.63.0 的折疊規則正是這條路的成本。

**連點防護**：`appendHistoryEvent()` 的防護只在「本筆與上一筆都是同一 actor 的 `submitted`」時丟棄。審核員送出後，最後一筆一定是決策事件，所以這個防護對審核員**原本就無效**，現行註解「Reviewer submit hits this same function, so the guard covers that path too」與事實不符。審核員送出的防重實際由 UI busy flag 負責，DUP-02（`annotation-review-unit.spec.ts`）在現況下綠燈就是證據。本單只修正註解，不動邏輯；Red 改寫 DUP-02 時，必須改成斷言「每個 `outKey` 恰一筆決策事件」，繼續守住雙擊不重複。

### D2：timing 只掛第一筆決策事件（維護者裁定 R2）

`appendReviewDecisionEvents()` 內以一個旗標記錄是否已寫過 timing；第一筆有 `action` 的決策事件附上 `timingFields()`，其餘不附。「第一筆」依 `Object.keys(decisions)` 的迭代順序決定，也就是 append 順序；被 `REVIEW_DECISION_EVENT_ACTION` 略過的鍵不算。

**否決的替代方案**：

- 每筆決策事件平分 `lead_time`：會捏造出沒有量測過的逐項耗時，FR-088 禁止推估值。
- 另寫一筆只帶 timing 的事件：等於換個名字把包裝事件加回來。

**與 FR-088「缺欄位不渲染」的關係**：沒有 timing 的決策事件在 reviewer 視角就不顯示耗時區塊，這沿用 FR-016B 既有的「缺哪個欄位就不渲染對應區塊」，不需要新的呈現規則。

### D3：舊資料相容——兩個讀取端函式都保留

事件是 append-only，本版以前寫入 `localStorage` 的包裝事件與重複 timing 不會消失，所以：

- `collapseHistory()` 保留。對新資料它沒有東西可折，對舊資料照常折疊。FR-016B 的條文改為「只適用本版以前寫入的舊事件」。
- `totalLeadTime()` 保留，理由有兩個：舊資料仍有 N+1 重複；新資料在同一次開啟中先存草稿、後送出，兩筆事件仍共用 `started_at`。

### D4：FR-091 tie-break（維護者裁定 R3）

一次送出的多筆決策事件是在同一個同步迴圈內 append 的，`at` 可能落在同一毫秒。`getSampleHistory()` 用穩定排序（`localeCompare`），同時戳的事件保持 append 順序，所以「取最新一筆」在同一紀錄內等於取最後寫入的一筆。本單把這個行為寫進條文，讓它成為契約，而不是實作上的巧合。

跨紀錄（跨 bucket）同時戳時，會依 `getSampleHistory()` 串接 bucket 的順序排列。這在單人單分頁操作下不會發生，條文只保證同一紀錄內的順序。

### D5：不受影響的消費端

- `task-management/014-task-detail` FR-015d-4：task-detail 的仲裁歷程讀靜態種子 `annotation.reviews`，不讀工作區提交歷程。
- `HISTORY_ACTIONS`／`ACTION_LABEL`／徽章語意色：集合不變，只是 `submitted` 的產生點少了一個。

## Risks / Trade-offs

- **既有測試以包裝事件計數**：probe（暫時套用 D1＋D2 後跑全量）列出的耦合測試，由 senior-qa 在 Red 階段一次同步，Green 不得改測試。
- **示範種子**：審核種子（`annotation-workspace.data.js` 種子區塊）同樣經由 `markSampleSubmitted()` 寫入，D1 生效後新種出的審核單位自然不帶包裝事件，不需另改種子資料。issue #856 的 T014–T016 基線（61 筆歷程）含包裝事件，Red 階段要同步這個數字。瀏覽器裡已經種好的舊種子會保留包裝事件，由 D3 的相容路徑承接；本單**不**為此升級種子標記版本，因為舊事件本來就要能正確呈現，強制重種反而會蓋掉使用者的操作紀錄。

## 維護者裁定（2026-09-19）

- **R1**：採 issue #583 方向 (1)，移除審核員包裝 `submitted`。
- **R2**：timing 只掛在第一筆決策事件。
- **R3**：FR-091 同時戳以最後寫入者為準。
