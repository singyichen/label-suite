# 任務清單：fix-1003-demo-reviewer-entry

> **Apply 前硬閘**：先執行 `npx -p @fission-ai/openspec openspec validate --changes --no-interactive` 與 `scripts/check-sdd.sh`，分別回報 OpenSpec schema validation 與 Project SDD lint。兩者都通過才可進入 apply。team lead（本 per-issue lead）是唯一可以驗證 Red／Green evidence 並更新 checkbox 的角色。

> **單一群組**：本變更只有 1 個 prototype 產品檔（`design/prototype/pages/dashboard/dashboard.assignments.js`），遠低於單一 PR 5 檔上限，不拆群組。propose、apply、archive 放在同一個 PR。受影響測試檔不計入門檻。

---

## 1. PR-1003 — 審核流程示範任務入口身分分流（T014→li／T015→wang／T016 維持 chen）

> **相依與平行性**：嚴格依序 1.1 → 1.2 → … → 1.8，不使用 parallel markers。1.1 的 Red 契約必須先於 1.2 的 Green。本群組不改 `reviewAssignmentRoster()`（#868）、`filterUnitsToAssigned()`（#956）、`isArbitrationSubmitted()`（#1000）等既有判定函式本身，不改 T016 入口身分。

**故事目標**：對應 **SC-024**（Prototype 的 Annotator 與 Reviewer 場景各有 16 個快速操作，須能以 `role=reviewer` 成功載入審核介面）——示範任務存在的唯一目的是把審核流程走一遍給人看；issue #956 收斂左欄後，T014／T015 的 `reviewer_chen` 入口除爭議單位外全部不可達，`快速審核` 已不再穩定落在可操作介面。本次改為每個任務各自指向一個實際持有 `specs/annotation/015-annotation-workspace/spec.md` FR-093 指派單位、且涵蓋『待審』與『已定稿』狀態的身分（T014→`reviewer_li`、T015→`reviewer_wang`），T016 維持 `reviewer_chen` 不變。

- [x] 1.1 撰寫 Red 契約 `design/prototype/tests/dashboard/issue-1003-demo-reviewer-entry.spec.ts`，涵蓋三件事，直接沿用 issue #1003 checkpoint 留言已現場量測過的候選身分數字（T014 `reviewer_li`：待審 3／爭議 2／定稿 1，`快速審核` 落 `dry-02-one-divergent`×`tony0950127`；T015 `reviewer_wang`：待審 1／定稿 1，`快速審核` 落 `ofs-04-pending-review`×`kioleemg12`）。先提交此單檔再跑測試，保存 command、exit 與失敗訊息。 [@senior-qa]
  - **(a) T014 示範可走性**：以 `reviewer_li` 身分開啟工作區，左欄同時可見待審／爭議中／已定稿狀態的單位；`快速審核` 導向一個 `pending` 單位（不得為空狀態）。
  - **(b) T015 示範可走性**：以 `reviewer_wang` 身分開啟工作區，左欄同時可見待審／已定稿狀態的單位；`快速審核` 導向一個 `pending` 單位（不得為空狀態）。
  - **(c) T016 不變量**：`reviewer_chen` 身分之 T016 行為（列點擊、`快速審核`）維持現行既有測試斷言不變（不在本次 Red 範圍內新增，由既有 `dashboard-review-flow-demo.spec.ts`／`dashboard-quick-review-next-actionable.spec.ts` 之 T016 案例覆蓋，Green 階段須保持全綠）。
  - **(d) 不變量 — FR-060 未被推翻**：`reviewer_chen` 對 T014／T015 的 `specs/annotation/015-annotation-workspace/spec.md` FR-093 指派單位數（`getAssignedReviewUnits()`）仍為 0。
  - **(e) 不變量 — FR-093/#956 左欄過濾未被推翻**：一般審核員（如未受派 T014 任一單位的身分）之左欄仍不出現未受派單位（`specs/annotation/015-annotation-workspace/spec.md` FR-093）。
  - Red 證據：commit `be93d5ed`（senior-qa，僅 1 個新測試檔，193 行）。team lead 獨立複驗：`git status --short` 空輸出；獨立重跑 `PW_PORT=8986 pnpm playwright test tests/dashboard/issue-1003-demo-reviewer-entry.spec.ts --workers=1` → exit 1，2 failed（T014/T015，均卡在 `reviewer_id` 斷言，`reviewer_chen` 而非預期的 `reviewer_li`/`reviewer_wang`）、2 passed（(d)(e) 不變量），與 senior-qa 回報一致。
- [x] 1.2 Green：修改 `design/prototype/pages/dashboard/dashboard.assignments.js`。 [@senior-frontend]
  - T014 的 `reviewWorkItem(...)` 呼叫之 `reviewerId` 引數 `'reviewer_chen'` → `'reviewer_li'`。
  - T015 的 `reviewWorkItem(...)` 呼叫之 `reviewerId` 引數 `'reviewer_chen'` → `'reviewer_wang'`。
  - T016 不變。
  - 同步更新該區塊上方註解（原引言「every demo reviewer entry enters as reviewer_chen」對 T014／T015 不再成立，需改寫；T016 維持原理由）。
  - 不得放寬或改寫 1.1 的 Red 契約，並以 1.1 的 Red 測試重跑轉綠驗證之。
  - Green 證據：commit `b1885c78`（senior-frontend，只改 `dashboard.assignments.js` 1 檔，11+/7-）。team lead 獨立複驗：`git show --stat b1885c78` 確認僅 1 檔；重跑 `tests/dashboard/issue-1003-demo-reviewer-entry.spec.ts` ＋ `issue-956-workspace-left-column-filter.spec.ts` ＋ `issue-1000-arbiter-permanent-sticky.spec.ts` → exit 0，14 passed。
- [x] 1.3 執行受影響既有測試並依「位移／前提消失」分類處理，逐一不得刪除既有斷言： [@senior-frontend]
  - `tests/dashboard/dashboard-review-flow-demo.spec.ts`（T014／T015 之 `reviewer_id=reviewer_chen` 斷言、快速審核導頁期望值 — 位移）
  - `tests/dashboard/dashboard-quick-review-next-actionable.spec.ts`（T014 案例之 `reviewer_id`／`sample_id`／`annotator_id` 期望值 — 位移）
  - `tests/dashboard/dashboard-card-a11y.spec.ts:127`
  - 候選集以 `grep -rl` 從測試內容推導（不用目錄猜）：`grep -rl "reviewer_chen\|T014\|T015\|T016" tests/`、`grep -rl "dashboard.assignments\|快速審核\|reviewWorkItem" tests/`、`grep -rl "annotation-workspace.html\|annotation-list.html" tests/`（跨全部子目錄）三組聯集，逐一檢查是否斷言 T014／T015 的 `reviewer_id=reviewer_chen` 或衍生的 sample/annotator 期望值。
  - 結果：`grep -rl` 三組聯集（163 檔）逐一收斂至「同時出現 reviewer_chen 與 T014/T015」（32 檔）再收斂至「經由 dashboard.html 導覽」（3 檔候選：`issue-452-review-progress-subjects.spec.ts`／`issue-811-bypass-answer-decision-wording.spec.ts`／`issue-891-live-review-pools.spec.ts`），逐一核對後確認這 3 檔的 dashboard.html 使用與 T014/T015 之 reviewerId 種子無關（各自用獨立 URL 建構或僅涉及 T016），實測全過、未修改。確認受影響僅 issue 內文列出的 3 檔：`dashboard-card-a11y.spec.ts`（1 案，位移）、`dashboard-quick-review-next-actionable.spec.ts`（2 案：1 位移＋1 前提消失，改寫為正向斷言並保留 T016 案例覆蓋一般性規則）、`dashboard-review-flow-demo.spec.ts`（2 案，位移）。commit `ae914f5b`（senior-frontend，只改這 3 個測試檔，20+/15-）。team lead 獨立複驗：合併重跑 6 個檔案（3 個受影響＋Red 契約＋2 支必跑契約）→ exit 0，36 passed。
- [x] 1.4 執行 code/test gate（`design/prototype/` 目錄）：`pnpm install --frozen-lockfile`、`pnpm typecheck`、`PW_PORT=8986 pnpm playwright test`（1.1 新檔 + 1.3 受影響檔案 + 3 支必跑：`issue-956-workspace-left-column-filter.spec.ts`、`issue-1000-arbiter-permanent-sticky.spec.ts`、`annotation-review-flow-demo-workspace.spec.ts`）。 [@main]
  - 證據：`pnpm typecheck` → exit 0。合併重跑（Red 契約＋3 受影響檔＋2 支必跑契約＋`annotation-review-flow-demo-workspace.spec.ts`）→ exit 0，36 passed。
- [x] 1.5 生產碼變更完成後，於 worktree 根執行 `node scripts/gen-screen-inventory.mjs`（若有異動則提交），接著 `node scripts/gen-screen-inventory.mjs --check`、`scripts/inventory-tests.sh`、`scripts/check-sdd.sh`（0 error）、`scripts/check-spec-artifacts.sh`、`node scripts/check-user-path-map-freshness.mjs`、`scripts/check-demo-data-parity.sh`。 [@main]
  - 證據：`gen-screen-inventory.mjs` 重生（dashboard 測試檔數 12→13、內容雜湊變動），commit `d6967371`；`--check` → up to date；`inventory-tests.sh` → All inventory generator tests passed；`check-sdd.sh` → 0 error(s), 15 warning(s)；`check-spec-artifacts.sh` → passed；`check-user-path-map-freshness.mjs` → `PATH_MAP_FRESH`；`check-demo-data-parity.sh` → OK。
- [x] 1.6 獨立審查（`senior-code-reviewer`，與 1.4 gate 並行啟動）：確認 (1) 是否推翻 #868（`specs/annotation/015-annotation-workspace/spec.md` FR-060）或 #956（同檔 FR-093 左欄過濾）之既有正確行為；(2) T014／T015 是否真的能完整走一遍待審→審核→定稿；(3) 1.3 之既有測試修正有無「前提消失」被誤當「位移」、或斷言被弱化；(4) 示範資料形狀是否仍符合 `specs/annotation/015-annotation-workspace/spec.md` FR-093（issue #824/#815 沿革，每個審核單位恰一位審核員）等既有條文。裁決記入檢查點留言。 [@senior-code-reviewer]
  - 裁決：**四項全數 PASS**。(1) `git diff aa8d18af..ae914f5b -- design/prototype/pages/annotation/` 為空，`reviewAssignmentRoster()`／`filterUnitsToAssigned()` 零改動；獨立重跑 #956／#1000 → 10 passed。(2) 獨立寫 probe 重新量測 `getAssignedReviewUnits()`／`findNextActionableReviewUnit()`，T014/`reviewer_li`＝6 單位（待審3/爭議2/定稿1）、T015/`reviewer_wang`＝2 單位（待審1/定稿1），且獨立證實「T014 若選 `reviewer_wang` 會全數落空狀態」為真，與 proposal.md 論證一致。(3) 逐檔 diff＋`grep -c "expect("` before/after 比對（32/32、25/25、29/29）確認斷言數零淨減少，T016／chen 案例（一般性「保留仲裁者→落到爭議」規則）該檔案區段無 hunk、完全未動。(4) `task-detail.data.js` 之 `reviewerIds`／`arbiterIds` 名冊 diff 為空，一單位一審核員不變量不受影響；delta 與實際 diff 逐項對得上。非阻斷提示：`openspec/specs/dashboard/` 衍生視圖從未建立過，`archive` 時需處理（已知，見上方「待主 session 留意」）。
- [ ] 1.7 更新 `specs/dashboard/012-dashboard/spec.md`，完成 gate 4 回寫：版號 MINOR bump（修訂既有 FR-011D 之具體指派值與理由句，未新增或移除任何 FR/AC/SC 編號），Changelog 補一列，`specs/STATUS.md` 只動 `dashboard-012` 一列（歷史段落一字不動）。Source-Verify 逐條 grep 驗證版本號、issue 編號、函式名稱可定位。執行 `/opsx:archive`（`npx -p @fission-ai/openspec openspec archive fix-1003-demo-reviewer-entry --yes`），確認衍生檢視 `openspec/specs/dashboard/012-dashboard/spec.md` 同步合併。 [@main]
- [ ] 1.8 commit、push（worktree 內，不 rebase 已推送 commit），PR body 寫入 scratchpad，回報主 session。 [@main]
