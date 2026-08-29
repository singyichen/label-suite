# annotation/015-annotation-workspace Specification

## Purpose
Annotation List + Workspace（標記清單與標記作業，Annotator／Reviewer）的 derived view。正典為 `specs/annotation/015-annotation-workspace/spec.md`（v4.57.0）；本文件僅收錄經 OpenSpec change 落地之需求，每條皆引用正典 FR/AC ID，不改動其正典措辭。目前收錄：change `reviewer-action-hint`（issue #526）之 FR-084、AC-4.47 ~ AC-4.50，以及 FR-064 第 7 點第 6 項之範圍註記。

## Requirements

### Requirement: FR-084 角色相依行動提示

本需求對應正典 FR-084（對應 AC-4.47 ~ AC-4.50，issue #526）。workspace reviewer 視圖 MUST 於 FR-064 審核單位脈絡橫幅（`ws-review-unit-context`）之後、審核卡（FR-053）／仲裁版面（FR-061）／唯讀已定稿卡／空狀態卡之前，渲染至多一個行動提示（testid `ws-review-action-hint`，class `.rv-action-hint`），其內容依「該單位 `REVIEW_UNIT_STATUS` × 目前 Reviewer 是否已提交本單位審核 × `isArbiterCandidate()`」推導：

1. `pending`：不渲染提示（操作控件就在下方，不重複說明）。
2. `approved`／`modified` × 尚未提交：`需要你的審核`／`Your review is needed`，帶 `data-needs-action="true"`。
3. `approved`／`modified` × 已提交：`你的審核已記錄，等待另外 {remaining} 位審核員`／`Your review is recorded; waiting for {remaining} more reviewer(s)`。`remaining = minReviewers - readReviewerSubmissions(...).length`，且「是否已提交」與 `remaining` MUST 取自與定稿門檻 chip（FR-064 第（2）項）**同一次** `readReviewerSubmissions()` 讀取與同一個 `minReviewers` 值，不得另行維護第二份計算。
4. `disputed` × `isArbiterCandidate() = true`：`需要你的仲裁`／`Your arbitration is needed`，帶 `data-needs-action="true"`。
5. `disputed` × 已提交本單位（已參與）、不可仲裁：`你已參與此單位，等待其他具資格審核員處理`／`You have reviewed this unit; waiting for an eligible reviewer to resolve it`。
6. `disputed` × 未參與且無仲裁資格：`等待具仲裁資格的審核員處理`／`Waiting for a reviewer with arbitration rights`。
7. `finalized`：`已定稿，此單位為唯讀`／`Finalized; this unit is read-only`。
8. `getReviewUnitStatus` 為 `null`（標記員尚未提交）：`等待標記員提交`／`Waiting for the annotator to submit`。

呈現與無障礙約束：（a）只有第 2、4 點帶 `data-needs-action="true"`，其餘分支不得帶該屬性，且任何分支皆不得額外渲染重複的 `需要行動` pill；（b）`需要你的審核`／`需要你的仲裁` 文字本身完整表意，不只依賴顏色；（c）等待／唯讀說明使用一般文字層級，不得渲染為 `<button>`／`<a>` 或帶 CTA 樣式，`finalized` 與 `null` 亦不使用「下一步」標籤；（d）提示 MUST 為橫幅的下一個兄弟元素而非橫幅子元素，使 DOM 閱讀順序為 run type → 狀態 → 門檻 → 提示，橫幅子元素序列（AC-4.37）逐字不變，且 RWD 不得以 CSS `order` 改變語意順序；（e）`disputed` 之提示不得重複票數、未收斂原因或仲裁卡既有內容。

`run_type` 約束：兩種 `run_type` MUST 使用完全相同的推導與文案矩陣；提示不得描述任何退回或送出後果（送出後果由 FR-070 第 6 點之 `ws-review-note` Tooltip 承載）；`dry_run` 之提示不得出現 `回到待標記` 或 `重標待辦`。本條不改變 FR-051 狀態機、FR-053／FR-061 版面、FR-064 橫幅與抽屜契約，亦不改變任何審核資料模型、提交、收斂、爭議、仲裁與定稿邏輯。

#### Scenario: AC-4.47 approved／modified 依目前 Reviewer 是否已提交分流
- **GIVEN** `min_reviewers = 3` 之 T016 `ofm-02-approved-interim`（僅 `reviewer_wang` 已提交，狀態 `approved`）與 `min_reviewers = 2` 之 T017 `oft-03-modified-interim`（僅 `reviewer_wang` 已提交，狀態 `modified`）
- **WHEN** 分別以 `reviewer_id=reviewer_chen`（尚未提交）與 `reviewer_id=reviewer_wang`（已提交）開啟
- **THEN** 前者之 `ws-review-action-hint` 文字恰為 `需要你的審核` 且帶 `data-needs-action="true"`；後者文字恰為 `你的審核已記錄，等待另外 2 位審核員`（T016）／`你的審核已記錄，等待另外 1 位審核員`（T017）且不帶 `data-needs-action`
- **AND** 已提交者所見之 `{remaining}` 必須等於同一橫幅定稿門檻 chip `定稿門檻 {x} / {n} 位審核員` 之 `n - x`
- **AND** 切換語言後分別為 `Your review is needed` 與 `Your review is recorded; waiting for 2 more reviewer(s)`

#### Scenario: AC-4.48 disputed 區分可仲裁、已參與不可仲裁、無仲裁資格
- **GIVEN** T017 `oft-01-even-tie`（`reviewer_wang`／`reviewer_li` 已提交，狀態 `disputed`）與 T016 `ofm-05-all-divergent`（`reviewer_wang`／`reviewer_li`／`reviewer_lin` 已提交，狀態 `disputed`）
- **WHEN** 分別以 `reviewer_chen`（`can_arbitrate`、未參與）、`reviewer_wang`（已參與、不可仲裁）、`reviewer_lin`（T017 未參與、不可仲裁）開啟
- **THEN** `reviewer_chen` 之提示恰為 `需要你的仲裁` 且帶 `data-needs-action="true"`；`reviewer_wang` 之提示恰為 `你已參與此單位，等待其他具資格審核員處理`；`reviewer_lin` 之提示恰為 `等待具仲裁資格的審核員處理`；後兩者皆不帶 `data-needs-action`
- **AND** 提示文字不得含票數、`data-reason` 之未收斂原因或仲裁卡既有文案

#### Scenario: AC-4.49 pending 無提示；finalized／null 為無 CTA 之狀態說明；需要行動只在兩分支
- **GIVEN** T015 `ofs-04-pending-review`（`pending`）、T016 `ofm-01-unanimous-gold`（`finalized`）、T015 `ofs-05-not-submitted` 與 T017 `oft-05-pending-review`（後者經 seed 退回而回到標記員 `pending`，reviewer 側 `getReviewUnitStatus` 為 `null`）
- **WHEN** 以 `reviewer_chen` 開啟
- **THEN** `pending` 單位之 `ws-review-action-hint` 為 0 個；`finalized` 單位之提示恰為 `已定稿，此單位為唯讀`；`null` 單位之提示恰為 `等待標記員提交`
- **AND** 兩者皆不帶 `data-needs-action`、不是 `<button>`／`<a>`、不含 `下一步`
- **AND** 於 AC-4.47／AC-4.48 全部單位中，帶 `data-needs-action="true"` 之元素恰為文字 `需要你的審核` 或 `需要你的仲裁` 者，且頁面不得出現文字為 `需要行動` 之 pill

#### Scenario: AC-4.50 DOM 順序、375px、run_type 一致與反向文案守衛
- **GIVEN** 任一渲染提示之審核單位（如 T016 `ofm-02-approved-interim` 以 `reviewer_chen` 開啟）
- **WHEN** 於 375px 視窗寬度下渲染
- **THEN** `ws-review-action-hint` 必須是 `ws-review-unit-context` 之下一個兄弟元素，橫幅子元素序列維持 AC-4.37（`.rv-unit-run`、`.rv-unit-state`、`.rv-unit-threshold`、…），提示之 `getBoundingClientRect().top` 不小於橫幅之 `bottom`，且 `documentElement.scrollWidth <= clientWidth`
- **AND** `run_type=dry_run` 之 T014 `dry-05-pending-review`（標記員 `kioleemg12`，`reviewer_wang` 純退回後 `disputed`）以 `reviewer_chen` 開啟時提示為 `需要你的仲裁`、以 `reviewer_wang` 開啟時為 `你已參與此單位，等待其他具資格審核員處理`——與 `official_run` 同一矩陣
- **AND** `dry_run` 之提示文字不得含 `回到待標記` 或 `重標待辦`

### Requirement: FR-064 審核單位脈絡橫幅——第 7 點第 6 項範圍註記

本需求對應正典 FR-064 第 7 點第 6 項（v4.57.0 修訂）。原文將「角色相依提示（issue #526）」與 `ws-review-note` 文案並列為不屬第 7 點之範圍；本版於該項補註：角色相依提示已由 FR-084 落地為橫幅之**下一個兄弟元素**（`ws-review-action-hint`），仍不屬第 7 點之橫幅組成契約，AC-4.37 之橫幅子元素序列逐字不變。FR-064 其餘文字、第 1–8 點之全部契約、AC-4.27／AC-4.32／AC-4.35 ~ AC-4.42 皆不變。

#### Scenario: AC-4.37 橫幅子元素序列不因提示改變
- **GIVEN** T016 `ofm-02-approved-interim` 以 `reviewer_chen` 開啟
- **WHEN** 脈絡橫幅與行動提示皆渲染
- **THEN** 橫幅子元素仍依序恰為 `.rv-unit-chip.rv-unit-run`、`.rv-unit-state`、`.rv-unit-chip.rv-unit-threshold`、`.rv-flow-trigger`、`.rv-review-note`，`.rv-action-hint` 不在橫幅之內
