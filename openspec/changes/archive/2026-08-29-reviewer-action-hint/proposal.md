---
對應 Spec: specs/annotation/015-annotation-workspace/spec.md
---

## Why

Reviewer 工作區的審核單位脈絡橫幅（FR-064，`ws-review-unit-context`）能說出單位「現在在哪裡」（`目前：已同意 · 未達定稿門檻 1 / 3`），卻回答不了「現在是否需要我處理」。同一個 `approved`／`modified`／`disputed` 狀態，對尚未提交、已提交、可仲裁、已參與而不可仲裁的審核員代表完全不同的待辦；只看狀態 pill 會讓審核員誤判自己是否仍需操作（issue #526）。目前線索散落：可否仲裁只由 `reviewUnitBlockReason()` 決定版面、已否提交只由頂部進度 `我的審核提交 x / n` 間接反映，畫面上沒有任何一句話把兩者與單位狀態合成為「你該做什麼」。

## What Changes

- 新增 **FR-084**（角色相依行動提示）與 **AC-4.47 ~ AC-4.50**：在 FR-064 橫幅之後、審核卡（FR-053）／仲裁版面（FR-061）／唯讀卡之前，渲染恰一個短句提示 `ws-review-action-hint`，內容依「`REVIEW_UNIT_STATUS` × 目前 Reviewer 是否已提交 × `isArbiterCandidate()`」的矩陣推導：
  - `pending`：不渲染（操作控件就在下方）。
  - `approved`／`modified` × 尚未提交：`需要你的審核`（需要行動）。
  - `approved`／`modified` × 已提交：`你的審核已記錄，等待另外 {remaining} 位審核員`；`remaining = minReviewers - readReviewerSubmissions(...).length`，與定稿門檻 chip 使用同一次讀取，不另建第二份計算。
  - `disputed` × `isArbiterCandidate() = true`：`需要你的仲裁`（需要行動）。
  - `disputed` × 已參與本單位、不可仲裁：`你已參與此單位，等待其他具資格審核員處理`。
  - `disputed` × 未參與且無仲裁資格：`等待具仲裁資格的審核員處理`。
  - `finalized`：`已定稿，此單位為唯讀`。
  - `null`（標記員尚未提交）：`等待標記員提交`。
- 只有兩個需要行動的分支帶 `data-needs-action="true"`，且不額外渲染重複的 `需要行動` pill；其餘為一般文字層級的狀態說明，不偽裝成 CTA。文字本身完整表意，不只依賴顏色。
- 兩種 `run_type` 使用完全相同的推導與文案矩陣；提示不描述任何退回或送出後果（送出後果自 issue #550 起由 `ws-review-note` Tooltip 承載，FR-070 第 6 點），`dry_run` 提示不得出現 `回到待標記`／`重標待辦`。
- DOM 閱讀順序維持 run type → 狀態 → 門檻 → 提示：提示為橫幅的**下一個兄弟元素**，橫幅既有子元素序列（AC-4.37）逐字不變；RWD 不以 CSS `order` 改變語意順序；375px 不產生水平溢出。
- **修訂 FR-064 第 7 點第 6 項**：原文將「角色相依提示（issue #526）」列為不屬本點範圍；本版補註該提示已由 FR-084 落地，仍不屬第 7 點之橫幅組成契約（提示不是橫幅子元素）。
- 本變更不改變審核資料模型、提交、收斂、爭議、仲裁與定稿邏輯；不改變 FR-064 建立的橫幅、抽屜與門檻動態流程；不觸碰 `ws-review-note`；不改變仲裁卡票數與未收斂原因。

## Capabilities

### New Capabilities

無（新需求併入既有 `annotation/015-annotation-workspace` capability）。

### Modified Capabilities

- `annotation/015-annotation-workspace`：新增 FR-084、AC-4.47 ~ AC-4.50；修訂 FR-064 第 7 點第 6 項之範圍註記。

## Impact

- `design/prototype/pages/annotation/annotation-workspace.config.js`：`renderReviewer()` 於 `buildReviewUnitContext()` 之後新增 `buildReviewActionHint(unitStatus)`；新增 `actionHint*` zh／en i18n 鍵。
- `design/prototype/pages/annotation/annotation-workspace.html`：新增 `.rv-action-hint` 與 `[data-needs-action="true"]` 樣式。
- `design/prototype/tests/annotation/issue-526-reviewer-action-hint.spec.ts`（新增）與 `issue-517-post-submit-cta-removed.spec.ts`（新增反向斷言：狀態說明不重新形成送出後 CTA）。
- 不影響 API、DB、`annotation-workspace.data.js`、frontend／backend 產品程式碼。

## Constitution Check

- **II. Generalization-First（NON-NEGOTIABLE）**：提示只讀 `REVIEW_UNIT_STATUS`、`readReviewerSubmissions()`、`isArbiterCandidate()` 與 `minReviewers`，不依 task_id／輸出類型分支；T014–T017 僅為驗證用 fixture。
- **III. Data Fairness（NON-NEGOTIABLE）**：提示不讀取、不呈現 gold answer 或任何標記答案值，僅呈現流程狀態。
- **IV. Test-First**：先提交 Red 測試（逐格覆蓋矩陣、`data-needs-action` 只在兩分支、`pending` 無提示、`finalized`／`null` 無 CTA、`dry_run` 反向文案守衛、375px 順序與無溢出），再由 Green 實作。
- **X. Change Scope Discipline**：手寫生產變更為 `annotation-workspace.config.js` 與 `annotation-workspace.html` 兩檔，單一目的、單一 PR 群組（final group）。
- **XX. Source of Truth**：正典為 `specs/annotation/015-annotation-workspace/spec.md` v4.55.0；本 proposal 引用之 FR-053、FR-061、FR-064、FR-070、FR-084、AC-4.37、AC-4.47 ~ AC-4.50 於 archive 回寫後皆可 grep 定位。
