# Tasks: reject-reason-required

## 1. PR-A — 審核員側：退回必填理由、送出驗證、Tooltip 文案

> **相依與平行性**：嚴格序列；前置任務：無；順序 1.1 → 1.2 → 1.3 → 1.4。1.1 之 committed Red 必須先於 1.2–1.4。

- [ ] 1.1 新增 `design/prototype/tests/annotation/issue-552-reject-reason-required.spec.ts`（AC-3.48、AC-3.47、AC-3.40 修訂、AC-2.14 與 dry_run 不渲染情境）；獨立 Red commit 後執行 `pnpm playwright test --config playwright.local.config.ts tests/annotation/issue-552-reject-reason-required.spec.ts`，預期因 `ws-review-reject-reason`／`ws-rework-reasons` 不存在而失敗。 [@senior-qa]
- [ ] 1.2 修改 `design/prototype/pages/annotation/annotation-workspace.config.js`：`buildRejectReasonField()`、`reviewRowBlocker()`、`pendingReviewOutputKeys()` 改由其推導、`toastRejectReasonRequired` i18n、submit `aria-disabled`、`submitPayload.reasons`、草稿 `reason`、`reviewNoteOfficial` zh／en 加句。 [@senior-frontend]
- [ ] 1.3 修改 `design/prototype/pages/annotation/annotation-workspace.html`：`.rv-reject-reason` 樣式。 [@senior-frontend]
- [ ] 1.4 更新既有測試中「退回→直接送出」流程補填理由（`issue-192`、`issue-451`、`issue-453`、`issue-470`、`annotation-workspace-reviewer`、`annotation-workspace-review-card`、`issue-550` 文案常數、`cross-role/xrole-canonical-journey`）；執行 `pnpm typecheck` 與 PR-A 相關 spec，exit 0。 [@senior-qa]

## 2. PR-B — 標記員重標理由橫幅與流程圖

> **相依與平行性**：嚴格序列；前置任務：1.4；順序 2.1 → 2.2 → 2.3。

- [ ] 2.1 修改 `design/prototype/pages/annotation/annotation-workspace.data.js`：`readReviewerSubmissions()` 附 `submittedAt`、新增 `getReworkReasons()` 並匯出、`seedReviewFlowDemo` 之 `oft-05-pending-review` 補示範理由。 [@senior-frontend]
- [ ] 2.2 修改 `design/prototype/pages/annotation/annotation-workspace.config.js`：`renderReworkReasonsBanner()`（於 `patchedUpdateAnnotationPreview()` annotator 分支呼叫）與 `annotation-workspace.html` 的 `.rv-rework-reasons`／`.rv-rework-rejected` 樣式。Exception: scaffold; Files: `design/prototype/pages/annotation/annotation-workspace.config.js`, `design/prototype/pages/annotation/annotation-workspace.html`; Reason: 橫幅 DOM 與其樣式須同一 commit 落地才能通過 1.1 之視覺可見斷言。 [@senior-frontend]
- [ ] 2.3 更新 `specs/annotation/015-annotation-workspace/diagrams/review-flow-official-run.html`（退回節點：理由必填）並於三張 `review-flow-*.html` 審核員泳道補「送出審核」節點。Exception: governance-propagation; Files: `review-flow-official-run.html`, `review-flow-dry-run.html`, `review-flow-overview.html`; Reason: 三張圖共享同一審核節點語意，須同步。 [@main]

## 3. Final — archive / write-back 與驗證

> **相依與平行性**：嚴格序列；前置任務：2.3。

- [ ] 3.1 回寫正典 `specs/annotation/015-annotation-workspace/spec.md`：版本 4.55.0 → 4.58.0、修訂 FR-016A／FR-014I／FR-070／FR-083／AC-3.40／AC-3.47、新增 FR-084／AC-2.14／AC-3.48、testid 表新增 `ws-review-reject-reason`／`ws-rework-reasons`、Changelog 首列。 [@main]
- [ ] 3.2 Source-Verify：以 `grep -i` 逐一確認 proposal／design／delta 引用之 FR/AC ID、testid、路徑、issue 編號皆可於正典定位；執行 `pnpm typecheck` 與 `pnpm playwright test --config playwright.local.config.ts` 全套，記錄總數與 exit 0。 [@main]
