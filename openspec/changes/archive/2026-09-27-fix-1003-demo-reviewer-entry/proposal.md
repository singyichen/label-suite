---
對應 Spec: specs/dashboard/012-dashboard/spec.md
---

## Why

Issue #1003。三個「審核流程示範」任務（T014／T015／T016）的儀表板 Reviewer 任務列，依現行 **FR-011D** 一律攜帶 `reviewerId = reviewer_chen`（015 名冊中唯一具 `can_arbitrate` 旗標者）。issue #868（`specs/annotation/015-annotation-workspace/spec.md` FR-060，OpenSpec change 已回寫至 annotation-015）把仲裁者排除於同檔 FR-093 新指派池之外，因此 chen 在這三個任務的 FR-093 指派單位數恆為 0；在 issue #956（PR #999）之前這沒有副作用——工作區左欄未依指派過濾，仲裁者仍看得到任務的全部審核單位。#956 把左欄收斂為「被指派單位 ∪ 可仲裁之爭議單位」後，FR-011D 這個入口身分選擇反過來把示範任務除了爭議單位以外的所有流程（待審、已定稿）全部隱藏——三個任務都只剩仲裁這一段可走，違反 FR-011D 自身理由句「示範任務的目的為讓審核流程的各示範情境自儀表板一鍵可視」。

**issue 開立後、本次 propose 前的新事實**：issue #1000（PR #1011，已合併）把仲裁者的左欄可見性從「僅目前開啟中的單位」放寬為「曾送出仲裁票即永久黏著」（annotation-015 v7.5.0）。這使 chen 在三個任務的可見數各 +1（歷史仲裁單位回到可見）。**propose 前以現場量測（非沿用 issue 內文舊表格）重新確認**：

| 任務 | 審核單位總數 | chen 現在可見（#1000 後） | 仍隱藏 |
| --- | --- | --- | --- |
| T014 | 15 | 4（爭議中 3 ＋ 永久黏著 1） | 11（待審 5、已定稿 6） |
| T015 | 4 | 2（爭議中 1 ＋ 永久黏著 1） | 2（待審 1、已定稿 1） |
| T016 | 5 | 4（爭議中 2 ＋ 永久黏著 2） | 1（已定稿 1，無爭議過的單純核可） |

結論：#1000 緩解了症狀但沒有解決問題——T014／T015 仍完全走不到「待審→審核→定稿」主線，只剩爭議與仲裁；T016 因為 +1 已相當完整（4/5），支持「T016 維持 chen」的既有判斷。**本 issue 只調整示範入口身分，不改動、不放寬、不推翻 `specs/annotation/015-annotation-workspace/spec.md` 之 FR-060（仲裁者保留於新指派池外）與 FR-093 之工作區左欄過濾（issue #956/#1000 收斂邏輯）**。

**候選身分之實測依據**（`getAssignedReviewUnits()` + `findNextActionableReviewUnit()` 現場量測，見任務清單 1.1 前置偵察）：T014 若改用 issue 文字建議之 `reviewer_wang`，其被指派之 6 個單位**全部已定稿**、待審數為 0，`findNextActionableReviewUnit()` 回傳 `null`，快速審核會直接落到空狀態，無法示範「待審→審核」，故 T014 改採 `reviewer_li`（被指派 6 個單位：待審 3／爭議 2／定稿 1，三態齊全，`快速審核` 落在待審單位）。T015 採 `reviewer_wang`（被指派 2 個單位：待審 1／定稿 1，乾淨主線，`快速審核` 落在待審單位），與 issue 建議一致。T016 維持 `reviewer_chen`。

## What Changes

- **修訂 FR-011D**：示範任務入口身分不再三個任務統一指向 `reviewer_chen`——**T014 改為 `reviewer_li`**、**T015 改為 `reviewer_wang`**，**T016 維持 `reviewer_chen`**（唯一具 `can_arbitrate` 旗標者，仲裁與最終例外示範本體）。新增理由句：T014／T015 的入口身分須實際持有 `specs/annotation/015-annotation-workspace/spec.md` FR-093 指派單位、且該指派單位涵蓋『待審』與『已定稿』（T014 另涵蓋『爭議中』）狀態，使示範者一鍵可走「待審 → 審核 → 定稿」主線；T016 之仲裁畫面可達性保證（FR-011D 原有理由句，仲裁版面僅對具仲裁資格者渲染）逐字保留。列點擊、`快速審核` 導頁網址攜帶 `reviewer_id` 參數之既有規則，以及 `sample_id` 依 FR-021 推導之既有規則，均不變。
- **原型實作**（1 個生產檔，`design/prototype/pages/dashboard/dashboard.assignments.js`）：T014／T015 的 `reviewWorkItem()` 呼叫之 `reviewerId` 引數由 `'reviewer_chen'` 改為 `'reviewer_li'`／`'reviewer_wang'`；T016 不變；同步更新該區塊上方註解（issue #302 引言「every demo reviewer entry enters as reviewer_chen」不再對 T014／T015 成立）。不改 `dashboard.js`／`annotation-workspace.data.js`／`annotation-workspace.config.js` 之任何判定函式（`nextActionableUnit()`、`findNextActionableReviewUnit()`、`reviewAssignmentRoster()`、`filterUnitsToAssigned()`）。
- **既有測試修正**：`dashboard-review-flow-demo.spec.ts`（T014／T015 之 `reviewer_id=reviewer_chen` 斷言與快速審核導頁期望值）、`dashboard-quick-review-next-actionable.spec.ts`（T014 案例之 `reviewer_id`／`sample_id`／`annotator_id` 期望值）、`dashboard-card-a11y.spec.ts:127`。逐一判定「位移」（期望值改變但斷言意圖不變）或「前提消失」，不得刪除既有斷言。
- **新增測試**：涵蓋（a）以新入口身分開啟後，工作區左欄可見待審／已定稿（T014 另涵蓋爭議中）狀態的單位；（b）不變量——`reviewer_chen` 之 `specs/annotation/015-annotation-workspace/spec.md` FR-093 指派單位數仍為 0（FR-060 未被推翻）；（c）不變量——一般審核員（未受派單位）之左欄仍不出現該單位（FR-093/#956 過濾未被推翻）。
- **正典回寫（gate 4）**：dashboard-012 版號 MINOR bump（修訂既有 FR 之具體指派值與理由句，未新增或移除任何 FR/AC/SC 編號），`specs/STATUS.md` 只動 `dashboard-012` 一列。

**非目標**：

- 不改 `specs/annotation/015-annotation-workspace/spec.md` 之 `reviewAssignmentRoster()`（#868／FR-060）、`filterUnitsToAssigned()`（#956）、`isArbitrationSubmitted()`（#1000）等既有判定函式本身。
- 不改 T016 的入口身分或其 `arbiterIds`/`reviewerIds` 名冊結構。
- 不新增後端權限控管。
- 已評估但不採用（issue 內文已記錄，避免實作時重新發散）：工作區示範身分切換器；把 T014／T015 的 `arbiterIds` 指向第四位不在 `reviewerIds` 內的成員。

## Capabilities

`dashboard` — 審核流程示範任務（T014／T015）的儀表板入口身分改為實際持有指派單位的一般審核員，恢復「待審 → 審核 → 定稿」主線的可達性；T016 維持仲裁者入口不變。

## Constitution Check

| 原則 | 符合方式 |
| --- | --- |
| **II. Generalization-First（NON-NEGOTIABLE）** | 只改示範資料常數（`reviewerId` 字面值），未新增任何任務 ID／樣本 ID 分支；既有 `findNextActionableReviewUnit()`／`filterUnitsToAssigned()` 邏輯完全不變，對任何審核員身分一體適用 |
| **III. Data Fairness（NON-NEGOTIABLE）** | 不改動任何存取範圍判定，只改示範入口指向哪個既有審核員身分 |
| **X. Change Scope Discipline** | 1 個生產檔（`dashboard.assignments.js`）；測試檔與 `openspec/**`／`specs/**` 不計入門檻 |
| **XX. Source of Truth & Contract Governance** | `specs/annotation/015-annotation-workspace/spec.md` 之 FR-093 指派、FR-060 仲裁資格、#956/#1000 左欄過濾單一來源不變，本次僅改消費端的示範身分常數 |
