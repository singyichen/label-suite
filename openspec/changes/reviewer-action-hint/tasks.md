# Tasks: reviewer-action-hint

## 1. PR-526-FINAL — Red／Green、驗證與 archive 回寫（唯一且 final PR 群組）

> **相依與平行性**：本群組嚴格序列執行，不使用 parallel markers；前置任務：issue #525（已合併）、#550（已合併）；本群組順序：1.1 → 1.2 → 1.3 → 1.4 → 1.5 → 1.6 → 1.7；後續任務：無。1.2 與 1.4 之 committed Red evidence 必須先於 1.5／1.6 Green；本群組手寫生產變更僅 `annotation-workspace.config.js` 與 `annotation-workspace.html` 兩檔，遵守 ≤ 5 檔／≤ 300 行。

**故事目標**：延伸 SC-004W（每個審核單位恰一個 `ws-review-unit-context` 橫幅）與 SC-004T（仲裁資格判定），落實正典 FR-084 與 AC-4.47 ~ AC-4.50——依「審核單位狀態 × 目前 Reviewer 提交／仲裁資格」渲染行動提示，只有需要行動的兩分支帶 `data-needs-action="true"`，DOM 順序 run type → 狀態 → 門檻 → 提示。

- [x] 1.1 新增 `design/prototype/tests/annotation/issue-526-reviewer-action-hint.spec.ts`，逐格覆蓋 AC-4.47 ~ AC-4.50 之提示矩陣（`pending` 無提示；`approved`／`modified` × 已提交／未提交；`disputed` × 可仲裁／已參與不可仲裁／無資格；`finalized`；`null`）、`data-needs-action` 只在兩分支、無 `需要行動` pill、提示為橫幅下一個兄弟元素且橫幅子元素序列不變、`dry_run` 與 `official_run` 同矩陣、`dry_run` 不含 `回到待標記`／`重標待辦`、375px 無水平溢出、中英文同步；以獨立 Red commit 提交。 [@senior-qa]
- [x] 1.2 執行 Red 證據：自 design/prototype 執行 pnpm playwright test --config playwright.local.config.ts tests/annotation/issue-526-reviewer-action-hint.spec.ts，預期因 `ws-review-action-hint` 尚不存在而失敗，記錄 expected failure 之測試數。 [@senior-qa]
- [x] 1.3 修改 `design/prototype/tests/annotation/issue-517-post-submit-cta-removed.spec.ts`，於既有 `expectNoExitCard()` 加入反向斷言：`ws-review-action-hint` 若存在，不得為 button／anchor、已定稿單位不得帶 `data-needs-action="true"`、不得含 `下一個可處理單位`／`返回審核清單`／`返回 Dashboard`；以獨立 commit 提交。 [@senior-qa]
- [x] 1.4 執行 Red 證據：自 design/prototype 執行 pnpm playwright test --config playwright.local.config.ts tests/annotation/issue-517-post-submit-cta-removed.spec.ts，記錄結果（此檔既有斷言於 Red 階段預期維持綠，反向斷言在提示不存在時亦為綠）。 [@senior-qa]
- [x] 1.5 修改 `design/prototype/pages/annotation/annotation-workspace.config.js`：新增 `buildReviewActionHint(unitStatus)`（由 `renderReviewer()` 於 `buildReviewUnitContext()` 之後掛於橫幅下一個兄弟位置），推導只讀 `readReviewerSubmissions()`（同一次讀取同時決定「已提交」與 `remaining`）、任務生效之 `minReviewers`、`isArbiterCandidate()`；新增 zh／en `actionHint*` i18n 鍵；不得修改 Red contract；以獨立 Green commit 提交。 [@senior-frontend]
- [x] 1.6 修改 `design/prototype/pages/annotation/annotation-workspace.html`：新增 rv-action-hint 一般文字層級樣式與 `[data-needs-action="true"]` 強調樣式（不使用 CSS order、不呈現按鈕外觀）；以獨立 Green commit 提交。 [@senior-frontend]
- [ ] 1.7 執行 command-only 完整驗證：自 design/prototype 執行 pnpm typecheck 與 pnpm playwright test --config playwright.local.config.ts（全套）；自專案根執行 scripts/check-sdd.sh 與 git diff --check；逐一記錄 exit code 與 Playwright 總數。 [@main]

## Pre-merge finalization (outside /opsx:apply) — NON-CHECKBOX

本段不屬於 `/opsx:apply`。全部 checkbox 完成後，main session 於同一 branch 執行 `/opsx:archive reviewer-action-hint`（CLI 不可用時手動回寫）：`specs/annotation/015-annotation-workspace/spec.md` 版本升至 `4.57.0`（`4.56.0` 由 issue #557 之輕量變更佔用，若 rebase 後編號衝突由 main session 重編），新增 FR-084、AC-4.47 ~ AC-4.50，修訂 FR-064 第 7 點第 6 項，並於 `## Changelog` 表首新增一列；產生 `openspec/specs/annotation/015-annotation-workspace/spec.md` derived view；將 proposal／tasks／delta 移至 `openspec/changes/archive/2026-08-29-reviewer-action-hint/`。接著依 `docs/sdd-workflow.md` §6.2 逐條 `grep -i` 驗證 FR/AC ID、testid、檔案路徑與 issue 編號皆可於正典定位。Final PR merge 後由 main session 更新 `specs/STATUS.md`。
