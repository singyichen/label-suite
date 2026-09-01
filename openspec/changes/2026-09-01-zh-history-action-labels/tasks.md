## 0. PR 規模判定

> 生產檔（不計測試檔）共 3 個：`annotation-history.js`、`annotation-workspace.config.js`、`annotation-list.html`。超過 Lightweight Path 的 ≤2 檔門檻，故走完整 OpenSpec change flow；但遠低於 Principle X 的 5 檔／300 行上限（不計測試檔、lockfile、`specs/**`、`openspec/**`），且屬單一目的（顯示層動作標籤中文化），故**單一 PR 即可交付，不需要拆成 stacked PR 群組**。以下任務不分 PR 群組，依 Red → Green → 驗證序列排列，全數落在同一個 PR。

## 1. Red — 既有測試契約更新與新斷言（[@senior-qa]）

> 以下三個測試檔各自獨立、可平行進行（互不修改同一檔案），但每個任務內部的「修改 → commit → 執行並記錄預期失敗」步驟需序列完成。這些不是新寫的 Red 測試，而是既有測試斷言基準的契約更新：斷言目標由「畫面可見文字（英文 action 值）」改為「`data-action` 屬性（英文 action 值，穩定不變）」，覆蓋強度不降低——`data-action` 屬性作為斷言依據比 `textContent`/`hasText` 更穩定（不受顯示語言影響），且部分任務同時新增可見文字（中文標籤）斷言以鎖住新契約，覆蓋範圍等同或更強，不構成「弱化 Red 契約」。

<!-- parallel:start -->
- [ ] 1.1 修改 `design/prototype/tests/annotation/issue-578-history-actions.spec.ts`：第 83–94 行 `evaluateAll()` 內讀取徽章資訊的 mapping，把 `action` 欄位來源由 `(node.textContent || '').trim()` 改為 `node.getAttribute('data-action')`，並新增 `label` 欄位讀取 `(node.textContent || '').trim()`；第 98、102 行沿用既有邏輯（`action` 欄位語意由英文文字改為英文屬性值，無需再改動比對邏輯本身）；第 134 行 `await expect(card.locator('.history-action-badge')).toHaveText('submitted')` 改為兩則斷言：`await expect(card.locator('.history-action-badge')).toHaveAttribute('data-action', 'submitted')` 與 `await expect(card.locator('.history-action-badge')).toHaveText('已提交')`。commit 後執行 `corepack pnpm playwright test issue-578-history-actions.spec.ts`（於 `design/prototype/`），記錄預期失敗原因：徽章尚無 `data-action` 屬性（`getAttribute` 回傳 `null`，第 97–98 行 `rendered.filter(...)` 比對不到任何項目）、且可見文字仍為英文（第 134 行新增的中文斷言落空）。 [@senior-qa]
- [ ] 1.2 修改 `design/prototype/tests/annotation/issue-578-history-snapshot-masking.spec.ts`：第 159 行 `page.locator('.history-action-badge', { hasText: 'modified' })` 改為 `page.locator('.history-action-badge[data-action="modified"]')`；第 168 行 `page.locator('.history-action-badge', { hasText: 'submitted' })` 改為 `page.locator('.history-action-badge[data-action="submitted"]')`。commit 後執行 `corepack pnpm playwright test issue-578-history-snapshot-masking.spec.ts`（於 `design/prototype/`），記錄預期失敗原因：工作區歷程徽章尚無 `data-action` 屬性，改寫後的 selector 比對不到任何元素，locator 解析為 0 個節點，後續依賴該 locator 的斷言（如 `.toHaveCount(1)`／差異區塊檢查）失敗。 [@senior-qa]
- [ ] 1.3 修改 `design/prototype/tests/annotation/issue-578-list-summary.spec.ts`：於既有 AC-1.25 reviewer 檢視測試（約第 80–81 行 `data-action` 屬性斷言與 `not.toBeEmpty()` 斷言之後）新增一則可見文字斷言 `await expect(action).toHaveText('審核退回')`，鎖住「最後動作」欄位之新顯示契約。commit 後執行 `corepack pnpm playwright test issue-578-list-summary.spec.ts`（於 `design/prototype/`），記錄預期失敗原因：`annotation-list.html` 之 `line()` 目前仍以 `s.action`（英文原值）作為可見文字，新增斷言比對「審核退回」會落空；既有 `data-action` 屬性斷言（第 80、100–101 行附近）不受影響，繼續通過。 [@senior-qa]
<!-- parallel:end -->

- [ ] 1.4 確認 `design/prototype/tests/annotation/issue-552-reject-reason-required.spec.ts` 第 234 行 `await expect(page.locator('.history-action-badge.rejected')).toHaveCount(1)` 不受本次變動影響——執行 `grep -n "history-action-badge" design/prototype/tests/annotation/issue-552-reject-reason-required.spec.ts` 確認該行為 CSS class selector（`.rejected`），不涉及 `textContent`／`hasText`，故不需修改；於 PR 說明中記錄此項確認結果，回應 issue #600 「須確認是否連帶斷言文字」之項目。 [@senior-qa]

- [ ] 1.5 **（Green 階段回頭補列）** 修改 `design/prototype/tests/annotation/annotation-workspace-chrome.spec.ts`：第 171 行 `await expect(panel).toContainText('submitted')` 改為兩則斷言——`await expect(panel.locator('.history-action-badge')).toHaveAttribute('data-action', 'submitted')` 與 `await expect(panel).toContainText('已提交')`。**列入原因**：§1.1～1.3 盤點時只掃了 `issue-578-*` 三檔，漏掉這個 2026-08-28 既有測試（commit `2b070747`）——它是全 `design/prototype/tests/` 中最後一處以可見文字比對動作值的斷言，於 §2 實作完成後才由全套回歸跑出來。**Red 證據取得方式**：本任務的斷言在 Green 之前的樹（commit `a79bd5f3`）上必然失敗、在 Green 之後（§2 完成）通過，須以 `git stash` 於兩個樹各跑一次並記錄兩份輸出，作為契約確實鎖住新行為（而非被實作牽著走）的證明。 [@senior-qa]

## 2. Green — 顯示標籤層與兩個顯示點實作（[@senior-frontend]）

> 依賴 §1 全部 Red 任務先完成並有預期失敗證據。以下三個任務各自只動一個生產檔，依既有程式的呼叫關係序列進行：先在共用模組新增顯示標籤層，再改動兩個消費它的顯示點。不得為讓測試通過而弱化或改寫 §1 已提交的斷言。

- [ ] 2.1 修改 `design/prototype/pages/shared/annotation-history.js`：於既有 `BADGE_CLASS` 對照表旁新增顯示標籤對照表 `ACTION_LABEL`（同一模式、同一資料來源，鍵值為 `HISTORY_ACTIONS` 七值，對應中文：`draft_saved`→已存草稿、`submitted`→已提交、`skipped`→已跳過、`modified`→審核修正、`accepted`→審核通過、`rejected`→審核退回、`adjudicated`→仲裁定案）與查表函式 `actionLabelFor(action)`（集合外值原樣回傳英文 `action` 原值，比照既有 `badgeClassFor()` 對集合外值的處理方式）；於檔案結尾 `global.LabelSuiteAnnotationHistory` 匯出物件新增 `ACTION_LABEL: ACTION_LABEL, actionLabelFor: actionLabelFor` 兩個欄位。驗證：於 `design/prototype/` 執行 `corepack pnpm typecheck` 通過（exit 0）。 [@senior-frontend]
- [ ] 2.2 修改 `design/prototype/pages/annotation/annotation-workspace.config.js`：把既有 `badge.textContent = event.action;` 改為 `badge.textContent = window.LabelSuiteAnnotationHistory.actionLabelFor(event.action);`，並新增 `badge.setAttribute('data-action', event.action);`（新屬性，緊接於既有 `badge.className = ...` 之後）。驗證：於 `design/prototype/` 執行 `corepack pnpm playwright test issue-578-history-actions.spec.ts issue-578-history-snapshot-masking.spec.ts`，§1.1、§1.2 之 Red 斷言全數轉綠。 [@senior-frontend]
- [ ] 2.3 修改 `design/prototype/pages/annotation/annotation-list.html`：把 `buildSummaryCell()` 內 `line('list-summary-last-action', 'data-action', function (s) { return [s.action, s.action]; });` 的回傳值改為 `[window.LabelSuiteAnnotationHistory.actionLabelFor(s.action), s.action]`（可見文字改用顯示標籤，`data-action` 屬性維持原始英文值不變）。驗證：於 `design/prototype/` 執行 `corepack pnpm playwright test issue-578-list-summary.spec.ts`，§1.3 之 Red 斷言轉綠。 [@senior-frontend]

## 3. 整合驗證與正典比對（[@main]）

- [ ] 3.1 於 `design/prototype/` 執行 `corepack pnpm typecheck && corepack pnpm playwright test`，確認全套測試（含 §1 四個測試檔與其餘既有測試）exit 0，無因本次改動產生之新回歸。 [@main]
- [ ] 3.2 執行 `openspec validate --changes --no-interactive` 確認本 change 通過 schema 驗證；逐一以 `grep` 核對 `proposal.md` 與 spec delta中引用的 FR-016B、FR-086、FR-091、AC-1.25、AC-2.15、AC-2.16、AC-2.21 於正典 `specs/annotation/015-annotation-workspace/spec.md` 皆可定位（Source-Verify gate 前置檢查）。 [@main]
- [ ] 3.3 核對 §1 每個 Red 任務之 commit 與「執行並記錄預期失敗」證據、§2 每個 Green 任務之 commit 與測試轉綠證據皆存在，逐一勾選本檔案對應 checkbox（僅本角色可勾選）。 [@main]

## 4.（後續階段，非本次 propose 範圍）

> 以下項目屬 `/opsx:apply` 與最終 PR 群組的 `/opsx:archive` 階段，本次 propose 僅記錄依賴關係，不在本次執行：實作完成後於同一 PR 內完成 Source-Verify 完整覆核（含本 change 引用之全部 FR/AC 逐一 grep 比對）、`openspec archive` 回寫正典 `specs/annotation/015-annotation-workspace/spec.md`（版本 4.61.0 → 4.62.0，新增 Changelog 條目）、合併衍生檢視 `openspec/specs/annotation/015-annotation-workspace/spec.md`、更新 `specs/STATUS.md`。
