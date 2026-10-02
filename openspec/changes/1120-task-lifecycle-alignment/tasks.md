# 任務清單：1120-task-lifecycle-alignment（issue #1120）

> **Apply 前硬閘**：先 `openspec validate --changes --no-interactive`（OpenSpec schema validation），再 `scripts/check-sdd.sh`（Project SDD lint）。兩者皆通過才進入實作。
>
> **TDD 硬規則**：每一項可觀察行為為一組 Red（senior-qa）與實作任務（senior-frontend）配對；Red 任務必須先 commit 並執行、留下預期失敗證據，實作任務才能開始；實作任務不得為了讓測試通過而改寫或弱化 Red 契約。lead／main session 是唯一可驗證 Red／Green evidence 與更新 checkbox 的角色。
>
> **拆分總則（憲法原則 X）**：`task-detail.html` 禁止平行修改（issue §5），四個群組嚴格序列。群組 1～3 為 intermediate PR（OpenSpec change 維持開啟）；群組 4 為最終 PR，承載正典回寫與 `/opsx:archive`（ADR-033 Rule 1）。測試檔、`design/prototype/tests/inventory.csv`、`design/system/screen-inventory.md`、`specs/**`、`openspec/**` 不計入 5 檔／300 行門檻。
>
> **群組間相依**：1 → 2 → 3 → 4 嚴格序列；每個群組動工前須 `git merge origin/main` 取得已合併的前一群組。
>
> **本清單不含的範圍**：issue §4 驗收 01／02／03（試標完成條件）屬 MAJOR，待維護者裁示後另開 change，見 `design.md` D1。issue §4 驗收 13／16 與正式階段 KPI／決策欄配置待 issue §7 附件補齊與維護者設計定稿，見下方「待裁示與待附件」節。

## 1. 跨任務資料來源對齊（intermediate PR）

**故事目標**（SC-019、SC-036）：讓 Overview 執行控制與工時明細所呈現的數字出自同一組 `task_id × run_type × round` 查詢上下文，T013 與 T018 不再 fallback 到其他任務的通用示範資料，無紀錄時呈現真實空狀態。

> **產品檔案（2）**：`design/prototype/pages/task-management/task-detail.html`、`design/prototype/pages/task-management/task-detail.data.js`
> **相依**：無。

- [ ] 1.1 撰寫 `design/prototype/tests/task-management/task-detail-cross-tab-source.spec.ts` 之 Red。涵蓋 delta FR-010u 第 (1)(5)(6)(7) 點與 issue §4 驗收 09：T013／T018 五個頁籤不出現其他任務的回合與樣本數、不出現字面 124、工時與匯出歷史依任務篩選且無紀錄時為真實空狀態、提交進度與定案進度分別命名、三種單位不相加、資料分配色條附「資料分配」語意。每案例加入 inventory.csv。驗證：`PW_PORT=8981 pnpm playwright test tests/task-management/task-detail-cross-tab-source.spec.ts` 出現失敗 [@senior-qa]
- [ ] 1.2 Green：修改 `design/prototype/pages/task-management/task-detail.data.js`。為 T013 與 T018 補上各自的 progress／work-log／unassigned 來源，使三張既有查表不再 fallback 到通用舊資料，並依 design.md D2 之分子分母推導 `已提交` 與 `已完成輪次`。驗證：`PW_PORT=8981 pnpm playwright test tests/task-management/task-detail-cross-tab-source.spec.ts` 出現部分通過 [@senior-frontend]
- [ ] 1.3 修改 `design/prototype/pages/task-management/task-detail.html`（與 1.2 同一實作任務之頁面整合）。移除字面 124 之硬編來源、使 `exportHistory` 依任務篩選、空狀態據實呈現、提交與定案進度分列命名、資料分配色條補語意說明。驗證：`PW_PORT=8981 pnpm playwright test tests/task-management/task-detail-cross-tab-source.spec.ts` exit 0 [@senior-frontend]
- [ ] 1.4 執行 `node scripts/gen-screen-inventory.mjs` 重生畫面盤點清單並與 1.3 同一提交。驗證：`node scripts/gen-screen-inventory.mjs --check` exit 0 [@senior-frontend]
- [ ] 1.5 執行群組 1 回歸候選集與 inventory 一致性核對。驗證：`cd design/prototype && pnpm typecheck && pnpm test:node && PW_PORT=8981 pnpm playwright test tests/task-management/task-detail-cross-tab-source.spec.ts tests/task-management/task-detail-task-profiles.spec.ts tests/task-management/task-detail-config-parity.spec.ts` exit 0 [@main]

## 2. 正式標記池歸零之發布阻擋（intermediate PR）

**故事目標**（SC-038、SC-049）：讓剩餘正式標記池為 `0` 的任務在發布前即顯示可閱讀原因並停用 CTA，且該原因與 IAA 相關狀態分列呈現，handler 直呼同樣失敗。

> **產品檔案（1）**：`design/prototype/pages/task-management/task-detail.html`
> **相依**：群組 1 已合併；本群組動工前 `git merge origin/main`。

- [ ] 2.1 撰寫 `design/prototype/tests/task-management/task-detail-official-pool-guard.spec.ts` 之 Red。涵蓋 delta FR-022 全部五點與其四條情境、issue §4 驗收 06：T013 於 `draft` 提前顯示原因並停用 CTA、計算狀態為 `done` 且 IAA 已達標仍因池為 0 阻擋、阻擋原因不含任何 IAA 表述且不改變 `iaa_computation_status`、直接呼叫發布 handler 同樣失敗、原因為可見文字且可由鍵盤與螢幕閱讀器取得。每案例加入 inventory.csv。驗證：`PW_PORT=8981 pnpm playwright test tests/task-management/task-detail-official-pool-guard.spec.ts` 出現失敗 [@senior-qa]
- [ ] 2.2 Green：修改 `design/prototype/pages/task-management/task-detail.html`。依 delta FR-022 於發布 handler 內驗證依 FR-010f-3 推導之剩餘池筆數，阻擋時逐項列出原因並與 IAA 狀態分列，`draft` 階段提前揭露並停用 CTA，原因文字不得僅依賴 hover 或顏色。驗證：`PW_PORT=8981 pnpm playwright test tests/task-management/task-detail-official-pool-guard.spec.ts` exit 0 [@senior-frontend]
- [ ] 2.3 執行 `node scripts/gen-screen-inventory.mjs` 重生畫面盤點清單並與 2.2 同一提交。驗證：`node scripts/gen-screen-inventory.mjs --check` exit 0 [@senior-frontend]
- [ ] 2.4 執行群組 2 回歸候選集與 inventory 一致性核對。驗證：`cd design/prototype && pnpm typecheck && pnpm test:node && PW_PORT=8981 pnpm playwright test tests/task-management/task-detail-official-pool-guard.spec.ts tests/task-management/issue-783-iaa-computation-status.spec.ts tests/task-management/task-detail-run-control-i18n.spec.ts` exit 0 [@main]

## 3. 正式結案閘門真實化（intermediate PR）

**故事目標**（SC-037、SC-043）：移除原型中寫死的結案條件，使「標記完成」依既有 FR-008b 五項前置條件逐項判斷，缺資料不得預設為已完成，未滿足時逐項顯示可閱讀原因且 handler 直呼亦失敗。

> **產品檔案（2）**：`design/prototype/pages/task-management/task-detail.html`、`design/prototype/pages/task-management/task-detail.data.js`
> **相依**：群組 2 已合併；本群組動工前 `git merge origin/main`。本群組不新增 FR——所依規則為既有 FR-008b 與 AC-3.9。

- [ ] 3.1 撰寫 `design/prototype/tests/task-management/task-detail-completion-gate.spec.ts` 之 Red。涵蓋既有 FR-008b 五項條件與 AC-3.9、issue §4 驗收 07／08：T015 與 T016 在審核未定案／有爭議中單位／例外池未清空／品質指標未就緒各情境下「標記完成」停用並逐項顯示原因、handler 直呼失敗、全部條件成立後直接轉 completed 且無額外確認階段、缺資料情境不得判為已完成。每案例加入 inventory.csv。驗證：`PW_PORT=8981 pnpm playwright test tests/task-management/task-detail-completion-gate.spec.ts` 出現失敗 [@senior-qa]
- [ ] 3.2 Green：修改 `design/prototype/pages/task-management/task-detail.data.js`。改寫 `getTaskCompletionBlockers()` 使五個訊號缺值時一律推導為未滿足而非放行，並依 design.md D2 讀取既有審核單位與例外池來源，不另建第二份判定式。驗證：`PW_PORT=8981 pnpm playwright test tests/task-management/task-detail-completion-gate.spec.ts` 出現部分通過 [@senior-frontend]
- [ ] 3.3 修改 `design/prototype/pages/task-management/task-detail.html`（與 3.2 同一實作任務之頁面整合）。移除寫死的 `submissionComplete` 值，改為依實際提交狀態推導並補齊其餘四個訊號，阻擋原因逐項呈現且可由鍵盤與螢幕閱讀器取得。驗證：`PW_PORT=8981 pnpm playwright test tests/task-management/task-detail-completion-gate.spec.ts` exit 0 [@senior-frontend]
- [ ] 3.4 執行 `node scripts/gen-screen-inventory.mjs` 重生畫面盤點清單並與 3.3 同一提交。驗證：`node scripts/gen-screen-inventory.mjs --check` exit 0 [@senior-frontend]
- [ ] 3.5 執行群組 3 回歸候選集與 inventory 一致性核對。驗證：`cd design/prototype && pnpm typecheck && pnpm test:node && PW_PORT=8981 pnpm playwright test tests/task-management/task-detail-completion-gate.spec.ts tests/task-management/task-detail-stage-flow.spec.ts tests/task-management/issue-688-exception-pool-entry.spec.ts tests/task-management/issue-891-live-review-pools.spec.ts` exit 0 [@main]

## 4. 正式案例試標前置歷史與正典回寫（最終 PR，`Closes #1120`）

**故事目標**（SC-041、SC-050）：讓 T015 與 T016 具備符合前置條件的試標歷史，其 `TrialRound.sampling_value` 與實際建立筆數一致、歷史回合與當前回合分列不交叉，並完成正典 014 回寫與 archive。

> **產品檔案（2）**：`design/prototype/pages/task-management/task-detail.html`、`design/prototype/pages/task-management/task-detail.data.js`
> **相依**：群組 3 已合併；本群組動工前 `git merge origin/main`。

- [ ] 4.1 撰寫 `design/prototype/tests/task-management/task-detail-official-trial-history.spec.ts` 之 Red。涵蓋 issue §4 驗收 11／12 與 delta FR-010u 第 (3) 點：T015／T016 具備可驗證的試標前置歷史、completed 與 IAA 計算未結束／IAA 已結束未達標三種情境各有可驗證 fixture、歷史回合與進行中回合可分別查看且完成數與決策不交叉、已完成輪次不計入進行中回合。每案例加入 inventory.csv。驗證：`PW_PORT=8981 pnpm playwright test tests/task-management/task-detail-official-trial-history.spec.ts` 出現失敗 [@senior-qa]
- [ ] 4.2 修改 `design/prototype/tests/task-management/issue-887-explicit-empty-trial-rounds.spec.ts`（與 4.1 同批次之既有測試更新）。因 T015／T016 改為具備試標歷史，三個案例鎖定的 `#officialPoolValue`、`#trialRoundsUsedValue`、`#roundHistorySummary` 與回合項目數期望值須同步改寫為新的真實值，不得刪除案例或改為寬鬆斷言。驗證：`PW_PORT=8981 pnpm playwright test tests/task-management/issue-887-explicit-empty-trial-rounds.spec.ts` 出現失敗 [@senior-qa]
- [ ] 4.3 Green：修改 `design/prototype/pages/task-management/task-detail.data.js`。為 T015 與 T016 補上符合前置條件的試標回合歷史，`sampling_value` 恆等於該回合實際建立筆數，歷史回合與當前回合各自獨立計數。驗證：`PW_PORT=8981 pnpm playwright test tests/task-management/task-detail-official-trial-history.spec.ts` 出現部分通過 [@senior-frontend]
- [ ] 4.4 修改 `design/prototype/pages/task-management/task-detail.html`（與 4.3 同一實作任務之頁面整合）。使回合歷程與樣本池分配依新的試標歷史呈現，歷史與當前回合分列且不交叉累計。驗證：`PW_PORT=8981 pnpm playwright test tests/task-management/task-detail-official-trial-history.spec.ts tests/task-management/issue-887-explicit-empty-trial-rounds.spec.ts` exit 0 [@senior-frontend]
- [ ] 4.5 執行 `node scripts/gen-screen-inventory.mjs` 重生畫面盤點清單並與 4.4 同一提交。驗證：`node scripts/gen-screen-inventory.mjs --check` exit 0 [@senior-frontend]
- [ ] 4.6 執行 `/opsx:archive 1120-task-lifecycle-alignment`。使衍生檢視收錄本 change 新增條文。驗證：`grep -n FR-022 openspec/specs/task-management/014-task-detail/spec.md` 命中 [@main]
- [ ] 4.7 修改正典 `specs/task-management/014-task-detail/spec.md`。於 FR-010t 之後新增 FR-010u、於 FR-021 之後新增 FR-022、新增 SC-049 與 SC-050、於使用者故事 1 與使用者故事 3 驗收情境末尾依序配發新 AC 編號（現有最大為 AC-1.25 與 AC-3.24），版本改為 4.4.0 並新增 Changelog 列。驗證：`grep -n FR-010u specs/task-management/014-task-detail/spec.md` 命中 [@main]
- [ ] 4.8 修改 `specs/STATUS.md`。`task-management-014` 列備註補本 change 摘要，分支欄與正典 frontmatter `功能分支` 同步為本次分支。驗證：`grep -n task-management-014 specs/STATUS.md` 顯示本次分支 [@main]
- [ ] 4.9 執行 Source-Verify（gate 4）。衍生檢視與正典中本 change 引入的每一個 FR／SC／AC ID 與 issue #1120 參照皆可逐項 grep 定位。驗證：`scripts/check-sdd.sh` exit 0 且 `openspec validate --changes --no-interactive` exit 0 [@main]
- [ ] 4.10 執行最終回歸候選集與 inventory 一致性核對。驗證：`cd design/prototype && pnpm typecheck && pnpm test:node && PW_PORT=8981 pnpm playwright test tests/task-management/ tests/cross-role/issue-850-trial-round-shared-source.spec.ts` exit 0 [@main]

## 待裁示與待附件（不在本 change 的任務範圍內）

以下各項**不得**在本 change 內實作，列此僅為交接清單：

- **issue §4 驗收 01／02／03（試標完成條件）**：屬 MAJOR，推翻 AC-3.2 等既有條文，見 `design.md` D1 之三個待裁示問題。裁示後另開 change，並須同步改寫 `design/prototype/tests/task-management/issue-791-trial-round-from-waiting.spec.ts` 既有案例期望值。
- **issue §4 驗收 13／14／15／16 之 UI 定稿部分**：正式階段四張 KPI 配置與結果頁決策欄屬候選 UI 方案，待 issue §7 四組附件補齊與維護者設計定稿後，由 senior-uiux 與 senior-visual-designer 依 issue §5 之 T06 另派。既有可由正典承載的部分（逐 output 指標與參考值來源為 `dataset/017-dataset-analysis-detail` FR-039 與 FR-043、審核狀態三態語彙、匯出重新下載不回歸）不需新 FR。
- **`annotation/015-annotation-workspace` 之 `仲裁輸出項目` 計數單位定義**：015 擁有，另開 change。
- **`docs/adr/022-task-state-machine-location.md` 補 2026-09-07 Amendment 並移除已失效的 `min_reviewers` 引用**：既有技術債，與 #1120 無關，另開單一目的 PR。
