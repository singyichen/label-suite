---
對應 Spec: specs/annotation/015-annotation-workspace/spec.md
---

## Why

issue #552：`ReviewDecision.reason?` 為選填，FR-016A 的強制審計理由只綁「修正／刪除」，純退回可以不留任何理由。`official_run` 一旦退回，樣本依 FR-014I 回到「待標記」並產生重標待辦，但 FR-075／AC-3.41 已移除從未接上持久化的自由備註欄，標記員能看到的只剩歷程面板一顆 `rejected` 徽章——不知道為什麼被退回、該改哪裡。對照 Label Studio Enterprise 的「Reviewers must leave a comment on reject」機制，Label Suite 的審核卡粒度更細（逐 outKey），理由卻反而缺了持久化路徑。

**重新定錨（issue 撰寫時的正典為 v4.53.0）**：issue 第 3 點原要求「送出前確認區（FR-077）逐 outKey 回顯理由，並於 `ws-review-summary-effect` 的 `official_run` 文案加上『退回理由會顯示給標記員』」。v4.55.0（issue #550）已**整組撤銷 FR-077／AC-3.42／AC-3.44**——送出前確認區不再存在，其送出後果陳述改由 `ws-review-note` Tooltip 承載（FR-070 第 6 點、AC-3.46），尚未決策清單改由送出阻擋 toast 指名（FR-083／AC-3.47）。因此本變更把該點改為：(a) `official_run` 的 `ws-review-note` 泡泡文案（`reviewNoteOfficial`，zh／en 同步）加上「退回理由會顯示給標記員」；(b) FR-083 的送出阻擋 toast 同時指名「已退回但缺理由」的 outKey，且其清單推導與送出驗證共用同一份來源。不重建任何送出前確認區。

## What Changes

- **MODIFIED FR-016A**：審計理由的強制範圍由「修正／刪除」擴大為「所有 `decision = reject`」，兩種 `run_type` 皆強制（審核卡依 FR-053 不得分流）。審核卡上該 outKey 按下「退回」後，於同一列作答面板下方展開必填理由欄 `ws-review-reject-reason`（帶 `data-outkey`），「通過」或取消決策時隱藏；理由沿用既有審核提交持久化路徑（`markSampleSubmitted` 之 reviewer payload 新增 `reasons` map），並隨 FR-014S 決策草稿一併持久化。`ReviewDecision.reason` 於 `decision = reject` 時為必填。
- **MODIFIED FR-014I**：退回回退標記員狀態時，`markSampleRejected` 寫入的 `rejected` 歷程事件摘要含逐 outKey 理由；退回理由的標記員側呈現交由新增 FR-084。
- **MODIFIED FR-070 第 6 點／AC-3.40**：`official_run` 分支文案於「全部通過則標記員狀態不變」之後加上「退回理由會顯示給標記員」；`dry_run` 分支不加（試標不產生重標待辦，理由供仲裁者與專案主持人讀取）。zh／en 同步。
- **MODIFIED FR-083／AC-3.47**：送出驗證由「每個 outKey 一筆決策」擴為「每個 outKey 一筆決策，且退回者皆有理由」；阻擋 toast 指名的清單同時涵蓋「尚未決策」與「已退回但缺理由」兩類 outKey，兩者與送出驗證共用同一份逐 outKey 阻擋判定（`reviewRowBlocker()` → `pendingReviewOutputKeys()`），不另建第二份計算；缺理由時「送出審核」按鈕以 `data-submit-blocked="reason"` 呈現停用外觀（不得用 `disabled`／`aria-disabled`，否則點擊無法觸發 toast）。
- **ADDED FR-084／AC-2.14（標記員重標理由橫幅）**：`official_run` 標記員開啟帶有重標待辦的樣本（該樣本狀態為 `pending` 且最新歷程事件為 `rejected`）時，工作區 `#annotationPreview` 頂部渲染 `ws-rework-reasons` 橫幅，逐 outKey 列出理由、審核員與時間（`ws-rework-reason-row`，帶 `data-outkey`），並於被退回 outKey 的作答面板（`ws-output-panel-{outKey}`）加上 `data-rework-rejected="true"` 標記；`dry_run` 一律不渲染；歷程面板不變。
- **ADDED AC-3.48（審核員退回理由欄契約）**：理由欄的出現／隱藏、必填、草稿持久化、reload 後還原與送出後寫入 reviewer submission 之契約。
- **流程圖**：`diagrams/review-flow-official-run.html` 退回節點標明「理由必填」；三張 `review-flow-*.html` 的審核員泳道／審核節點補上「送出審核」節點，使「通過／退回只是草稿、送出才寫入」可從圖上看出。
- 不變更任何 API 契約、DB schema、收斂／爭議／仲裁／定稿邏輯；`dry_run` 不新增任何回退或待辦。

## Capabilities

### New Capabilities

無（全部落在既有 `annotation/015-annotation-workspace` capability）。

### Modified Capabilities

- `annotation/015-annotation-workspace`：FR-016A、FR-014I、FR-070（第 6 點）、FR-083、AC-3.40、AC-3.47 修訂；FR-084、AC-2.14、AC-3.48 新增。

## Impact

- `design/prototype/pages/annotation/annotation-workspace.config.js`：理由欄、阻擋判定、toast、tooltip 文案、submit payload `reasons`、重標橫幅。
- `design/prototype/pages/annotation/annotation-workspace.data.js`：`readReviewerSubmissions` 回傳 `submittedAt`；新增 `getReworkReasons()`；`seedReviewFlowDemo` 的 T017 `oft-05-pending-review` 退回列補上示範理由。
- `design/prototype/pages/annotation/annotation-workspace.html`：理由欄與橫幅樣式。
- `design/prototype/tests/annotation/issue-552-reject-reason-required.spec.ts`（新增）；既有「退回即送出」之測試補填理由。
- `specs/annotation/015-annotation-workspace/spec.md` 4.55.0 → 4.58.0（archive write-back）；三張 `diagrams/review-flow-*.html`。

## Constitution Check

- **II. Generalization-First（NON-NEGOTIABLE）**：理由欄依 `state.selectedOutputTypes` 逐 outKey 產生，橫幅依 reviewer submission 的 `decisions`／`reasons` map 泛用推導，不依任務類型或 task_id 分支。
- **III. Data Fairness（NON-NEGOTIABLE）**：橫幅只呈現審核員理由、審核員帳號與時間；不揭露 gold、其他標記員答案或評分資料。
- **IV. Test-First**：先提交 Red（`issue-552-reject-reason-required.spec.ts`）並確認預期失敗，再 Green；不弱化 Red 契約。
- **X. Change Scope Discipline**：手寫 production diff 以 PR-A（審核員側，item 1–3）／PR-B（標記員橫幅＋流程圖）分組提交，每組 ≤ 300 行；`specs/**`／`openspec/**`／tests 不計入。
- **XX. Source of Truth**：正典為 `specs/annotation/015-annotation-workspace/spec.md`；本 proposal 引用之 FR-016A、FR-014I、FR-070、FR-075、FR-077、FR-083、FR-053、FR-014S、AC-3.40、AC-3.41、AC-3.42、AC-3.44、AC-3.46、AC-3.47 皆可於正典 grep 定位；FR-084、AC-2.14、AC-3.48 為正典現行最大編號之後的下一個可用編號。
