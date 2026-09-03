# 014 側任務(自 tasks.md 移出,逐字保留)

> 移出緣由見 [README.md](README.md)。原編號保留,便於與 `tasks.md` 的相依描述對照;companion change 提案時重新編號。
> **注意:原群組 5(5.1–5.6)已於 PR #609(波次 1)實作完成並勾選**,companion change 的容器需以「實作先行、容器後補」如實記錄,不得重派工。

## 5. PR 群組 5 — 014 審核設定與審核指派區塊（FR-005j／FR-005k／FR-010s／FR-010s-1／FR-010s-2／FR-010t）

> **產品檔案（4）**：`design/prototype/pages/task-management/task-detail.data.js`、`design/prototype/pages/task-management/task-detail.panels/overview.html`、`design/prototype/pages/task-management/task-detail.panels/member-management.html`、`design/prototype/pages/task-management/task-detail.html`
> **（動工後修正檔案範圍，理由同任務 1.2）**：`overview.html` 與 `member-management.html` 為純 HTML 片段、不含任何 `<script>`；`TaskDetail` 實體（`TASK_DATA`）、審核設定讀寫（`validateReviewSettings()`／`renderReviewSummary()`／`populateReviewEditForm()` task-detail.html:6070-6143）、編輯表單事件綁定（task-detail.html:9342-9512）與 i18n label 字典全數硬編於 `task-detail.html` 的單一 script。任務 5.3／5.5 的 Green 必須連動 `task-detail.html`，否則 Red 契約無從轉綠。加入後本組 4 檔，仍在原則 X 之 5 檔上限內；與群組 6 同檔改動以群組序列（5 → 6）保證不衝突。
> **最終群組**：否。
> **相依**：群組 1（常數改版；`AR_REVIEW_STATUS` 需與 `REVIEW_UNIT_STATUS` 同步）。

- [x] 5.1 撰寫 Red 測試覆蓋審核設定名冊化（`design/prototype/tests/task-management/issue-596-review-settings.spec.ts`）：檢視模式恰兩欄位（`審核員`／`仲裁者`）；編輯模式恰兩份勾選清單、無數值輸入框與 toggle；仲裁者候選為已勾選審核員之子集；取消勾選審核員時同步取消其仲裁者勾選；`reviewer_ids` 為空時阻擋儲存；`仲裁者` 摘要值不含 `啟用`／`停用` 前綴。驗證：執行該檔全數失敗且失敗原因為區塊仍為四欄位 [@senior-qa]
- [x] 5.2 於 `design/prototype/pages/task-management/task-detail.data.js` 改版規格常數與 `TaskDetail` 實體欄位：`AR_REVIEW_STATUS` 改三態、移除 `REVIEW_ASSIGNMENT_MODES`／`MIN_REVIEWERS_RULE`／`min_reviewers`／`review_assignment_mode`／`agreement_auto_finalize`／`arbitration_enabled`、`ARBITER_CANDIDATE_RULE` 加入 `can_arbitrate = true`、`OVERVIEW_EDITABLE_FIELDS` 改列 `reviewer_ids`／`arbiter_ids`、新增 `EXCEPTION_POOL_ACTIONS`。驗證：`pnpm typecheck` 通過且檔內不再出現 `min_reviewers` [@senior-frontend]
- [x] 5.3 於 `design/prototype/pages/task-management/task-detail.panels/overview.html` 實作 FR-010s／FR-010s-1／FR-010s-2 之兩份名冊勾選設定與摘要值規則。驗證：`pnpm playwright test tests/task-management/issue-596-review-settings.spec.ts` 全綠 [@senior-frontend]
- [x] 5.4 撰寫 Red 測試覆蓋審核指派區塊唯讀化與發布閘門（`design/prototype/tests/task-management/issue-596-assignment-readonly.spec.ts`）：區塊內無任何指派／補齊按鈕；爭議池列與最終例外池列皆為唯讀且無分派按鈕；`reviewer_ids` 為空時發布被阻擋並顯示「還差 1 位」；`arbiter_ids` 為空時不阻擋但顯示無仲裁者警示。驗證：執行該檔全數失敗且失敗原因為區塊仍依 `review_assignment_mode` 渲染操作按鈕 [@senior-qa]
- [x] 5.5 於 `design/prototype/pages/task-management/task-detail.panels/member-management.html` 實作 FR-005j 唯讀化、FR-005k 雙列（待仲裁／待處置）與 FR-010t 發布閘門改版。驗證：`pnpm playwright test tests/task-management/issue-596-assignment-readonly.spec.ts` 全綠 [@senior-frontend]
- [x] 5.6 **（動工後新增收尾任務）** 修正/刪除因群組 5 廢除 `min_reviewers`／指派模式／舊四欄位而失效的既有測試。依據：任務 1.6 基準線（`annotation-review-min-reviewers.spec.ts` 明定整檔刪除）與 design.md Risks 第 1 點「每組結束跑完整測試、不允許帶紅進下一組」；群組 2／4／7 各有收尾任務（2.5／4.5／7.5），群組 5 原漏列。範圍：`annotation-review-min-reviewers.spec.ts` 整檔刪除（含 testid，勿修斷言）；`task-detail-review-settings.spec.ts`／`task-detail-review-assignment.spec.ts`（舊契約，分別被 `issue-596-review-settings`／`issue-596-assignment-readonly` 取代）刪除或改寫；`issue-394-review-settings-min-reviewers`／`issue-505-publish-member-gate`／`task-detail-mobile-layout` 依名冊模型改寫、廢除行為的 case 刪除。驗證：`pnpm playwright test tests/task-management` 全綠 [@senior-qa]

## 原群組 6 之 014 側任務(FR-008b/FR-018,未實作)

> 原群組 6 的 015 側(6.1–6.3,例外池處置畫面)留在 `tasks.md`;以下 014 側入口/閘門任務隨 companion change 實作。

- [ ] 6.4 撰寫 Red 測試覆蓋驗收情境 43／44（`design/prototype/tests/task-management/issue-596-exception-pool-entry.spec.ts`）：`annotation-progress` 之「最終例外池」區塊顯示待處置數與逐列欄位、點列導頁攜帶完整審核單位身分、`0` 項時渲染空狀態而非隱藏區塊、`reviewer` 看不到該區塊、例外池未清空時 `標記完成` 被阻擋並列出具體原因。驗證：執行該檔全數失敗且失敗原因為區塊尚未存在 [@senior-qa]
- [ ] 6.5 於 `design/prototype/pages/task-management/task-detail.panels/annotation-progress.html` 實作 FR-018 之最終例外池區塊、清單欄位、`run_type` 篩選與逐筆導頁。驗證：`pnpm playwright test tests/task-management/issue-596-exception-pool-entry.spec.ts` 中屬區塊呈現的案例全綠 [@senior-frontend]
- [ ] 6.6 於 `design/prototype/pages/task-management/task-detail.data.js` 實作 FR-008b 五項結案前置條件（含例外池清空，僅計 `official_run`）。驗證：`pnpm playwright test tests/task-management/issue-596-exception-pool-entry.spec.ts` 全綠 [@senior-frontend]
- [ ] 6.7 於 `design/prototype/pages/task-management/task-detail.html` 接上例外池區塊之權限守衛（僅 `project_leader` 可見，直連比照 FR-006 導回）。驗證：`pnpm playwright test tests/task-management` 全綠 [@senior-frontend]

## 原群組 8 之 014 側任務(未實作)

- [ ] 8.3 執行 `/opsx:archive`，將 delta 併入衍生視圖 `openspec/specs/`，並回寫正典 `specs/task-management/014-task-detail/spec.md`（版本 v2.11.1 → v3.0.0，新增 Changelog 條目）。驗證：正典檔內 FR-018 可 grep 到，Changelog 首列為 3.0.0 [@main]
