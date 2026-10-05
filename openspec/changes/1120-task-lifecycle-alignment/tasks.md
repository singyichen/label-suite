# 任務清單：1120-task-lifecycle-alignment（issue #1120）

> **Apply 前硬閘**：先 `openspec validate --changes --no-interactive`（OpenSpec schema validation），再 `scripts/check-sdd.sh`（Project SDD lint）。兩者皆通過才進入實作。
>
> **TDD 硬規則**：每一項可觀察行為為一組 Red（senior-qa）與實作任務（senior-frontend）配對；Red 任務必須先 commit 並執行、留下預期失敗證據，實作任務才能開始；實作任務不得為了讓測試通過而改寫或弱化 Red 契約。lead／main session 是唯一可驗證 Red／Green evidence 與更新 checkbox 的角色。
>
> **拆分總則（憲法原則 X）**：`task-detail.html` 禁止平行修改（issue §5），**五個**群組嚴格序列。群組 1～4 為 intermediate PR（OpenSpec change 維持開啟）；群組 5 為最終 PR，承載正典回寫（v5.0.0）與 `/opsx:archive`（ADR-033 Rule 1）。**群組數自 4 增為 5 的理由**：維護者裁示後新增的 MAJOR 範圍（試標完成條件、FR-023、FR-018(5)、FR-010t、ADR-022）是一個獨立目的，不能併入群組 3（正式結案閘門）——兩者是不同的閘門、不同的 FR。測試檔、`design/prototype/tests/inventory.csv`、`design/system/screen-inventory.md`、`specs/**`、`openspec/**` 不計入 5 檔／300 行門檻。
>
> **群組間相依**：1 → 2 → 3 → 4 → 5 嚴格序列；每個群組動工前須 `git merge origin/main` 取得已合併的前一群組。
>
> **MAJOR 授權**：維護者已於 2026-10-02 裁示接受 014 → **5.0.0（BREAKING）**，issue §4 驗收 01／02／03 由群組 4 承載，見 `design.md` D1。
>
> **本清單不含的範圍**：issue §4 驗收 13／16 與正式階段 KPI／決策欄配置待 issue §7 附件補齊與維護者設計定稿；`annotation/015-annotation-workspace` 的「仲裁輸出項目」計數單位 delta 為 G5 後的獨立 PR；ADR-022 的既有技術債另案。見下方「待裁示與待附件」節。

## 1. 跨任務資料來源對齊（intermediate PR）

**故事目標**（SC-019、SC-036）：讓 Overview 執行控制與工時明細所呈現的數字出自同一組 `task_id × run_type × round` 查詢上下文，T013 與 T018 不再 fallback 到其他任務的通用示範資料、T014 三個頁籤的分配彼此一致，無紀錄時呈現真實空狀態。

> **產品檔案（2）**：`design/prototype/pages/task-management/task-detail.html`、`design/prototype/pages/task-management/task-detail.data.js`
> **相依**：無。

- [x] 1.1 撰寫 `design/prototype/tests/task-management/task-detail-cross-tab-source.spec.ts` 之 Red。涵蓋 delta FR-010u 第 (1)(2)(5)(6)(7) 點與 issue §4 驗收 09／10：T013／T018 五個頁籤不出現其他任務的回合與樣本數、不出現字面 124、工時與匯出歷史依任務篩選且無紀錄時為真實空狀態；**T014 概覽／進度／結果三個頁籤的 total／trial／official 分配彼此一致**（issue §4 驗收 10，須修來源而非僅對齊顯示文字）；`已提交` 之分子分母依第 (2) 點推導，且**依 FR-005h 被明確排除的標記作業不計入分子與分母**；第 (6) 點之時間語意——匯出與畫面上的審核／仲裁完成時間 MUST 取自各自的事件來源，不得沿用標記員的已提交時間；提交進度與定案進度分別命名、三種單位不相加、資料分配色條附「資料分配」語意。每案例加入 inventory.csv。驗證：`PW_PORT=8981 pnpm playwright test tests/task-management/task-detail-cross-tab-source.spec.ts` 出現失敗 [@senior-qa]
- [x] 1.2 Green：修改 `design/prototype/pages/task-management/task-detail.data.js`。為 T013 與 T018 補上各自的 progress／work-log／unassigned 來源，使三張既有查表不再 fallback 到通用舊資料，並依 design.md D2 之分子分母推導 `已提交` 與 `已完成輪次`。驗證：`PW_PORT=8981 pnpm playwright test tests/task-management/task-detail-cross-tab-source.spec.ts` 出現部分通過 [@senior-frontend]
- [x] 1.3 修改 `design/prototype/pages/task-management/task-detail.html`（與 1.2 同一實作任務之頁面整合）。移除字面 124 之硬編來源、使 `exportHistory` 依任務篩選、空狀態據實呈現、提交與定案進度分列命名、資料分配色條補語意說明。驗證：`PW_PORT=8981 pnpm playwright test tests/task-management/task-detail-cross-tab-source.spec.ts` exit 0 [@senior-frontend]
- [x] 1.4 執行 `node scripts/gen-screen-inventory.mjs` 重生畫面盤點清單並與 1.3 同一提交。驗證：`node scripts/gen-screen-inventory.mjs --check` exit 0 [@senior-frontend]
- [x] 1.5 執行群組 1 回歸候選集與 inventory 一致性核對。驗證：`cd design/prototype && pnpm typecheck && pnpm test:node && PW_PORT=8981 pnpm playwright test tests/task-management/task-detail-cross-tab-source.spec.ts tests/task-management/task-detail-task-profiles.spec.ts tests/task-management/task-detail-config-parity.spec.ts` exit 0 [@main]

## 2. 正式標記池歸零之發布阻擋（intermediate PR）

**故事目標**（SC-038、SC-049）：讓剩餘正式標記池為 `0` 的任務在發布前即顯示可閱讀原因並停用 CTA，且該原因與 IAA 相關狀態分列呈現，handler 直呼同樣失敗。

> **產品檔案（1）**：`design/prototype/pages/task-management/task-detail.html`
> **相依**：群組 1 已合併；本群組動工前 `git merge origin/main`。

- [x] 2.1 撰寫 `design/prototype/tests/task-management/task-detail-official-pool-guard.spec.ts` 之 Red。涵蓋 delta FR-022 全部五點與其四條情境、issue §4 驗收 06：T013 於 `draft` 提前顯示原因並停用 CTA、計算狀態為 `done` 且 IAA 已達標仍因池為 0 阻擋、阻擋原因不含任何 IAA 表述且不改變 `iaa_computation_status`、直接呼叫發布 handler 同樣失敗、原因為可見文字且可由鍵盤與螢幕閱讀器取得。每案例加入 inventory.csv。驗證：`PW_PORT=8981 pnpm playwright test tests/task-management/task-detail-official-pool-guard.spec.ts` 出現失敗 [@senior-qa]
- [x] 2.2 Green：修改 `design/prototype/pages/task-management/task-detail.html`。依 delta FR-022 於發布 handler 內驗證依 FR-010f-3 推導之剩餘池筆數，阻擋時逐項列出原因並與 IAA 狀態分列，`draft` 階段提前揭露並停用 CTA，原因文字不得僅依賴 hover 或顏色。驗證：`PW_PORT=8981 pnpm playwright test tests/task-management/task-detail-official-pool-guard.spec.ts` exit 0 [@senior-frontend]
- [x] 2.3 執行 `node scripts/gen-screen-inventory.mjs` 重生畫面盤點清單並與 2.2 同一提交。驗證：`node scripts/gen-screen-inventory.mjs --check` exit 0 [@senior-frontend]
- [x] 2.4 執行群組 2 回歸候選集與 inventory 一致性核對。驗證：`cd design/prototype && pnpm typecheck && pnpm test:node && PW_PORT=8981 pnpm playwright test tests/task-management/task-detail-official-pool-guard.spec.ts tests/task-management/issue-783-iaa-computation-status.spec.ts tests/task-management/task-detail-run-control-i18n.spec.ts` exit 0 [@main]

## 3. 正式結案閘門真實化（intermediate PR）

**故事目標**（SC-037、SC-043）：移除原型中寫死的結案條件，使「標記完成」依既有 FR-008b 五項前置條件逐項判斷，缺資料不得預設為已完成，未滿足時逐項顯示可閱讀原因且 handler 直呼亦失敗。

> **產品檔案（2）**：`design/prototype/pages/task-management/task-detail.html`、`design/prototype/pages/task-management/task-detail.data.js`
> **相依**：群組 2 已合併；本群組動工前 `git merge origin/main`。本群組不新增 FR——所依規則為既有 FR-008b 與 AC-3.9。

- [ ] 3.1 撰寫 `design/prototype/tests/task-management/task-detail-completion-gate.spec.ts` 之 Red。涵蓋既有 FR-008b 五項條件與 AC-3.9、issue §4 驗收 07／08：T015 與 T016 在審核未定案／有爭議中單位／例外池未清空／品質指標未就緒各情境下「標記完成」停用並逐項顯示原因、handler 直呼失敗、全部條件成立後直接轉 completed 且無額外確認階段、缺資料情境不得判為已完成。每案例加入 inventory.csv。驗證：`PW_PORT=8981 pnpm playwright test tests/task-management/task-detail-completion-gate.spec.ts` 出現失敗 [@senior-qa]
- [ ] 3.2 Green：修改 `design/prototype/pages/task-management/task-detail.data.js`。改寫 `getTaskCompletionBlockers()` 使五個訊號缺值時一律推導為未滿足而非放行，並依 design.md D2 讀取既有審核單位與例外池來源，不另建第二份判定式。驗證：`PW_PORT=8981 pnpm playwright test tests/task-management/task-detail-completion-gate.spec.ts` 出現部分通過 [@senior-frontend]
- [x] 3.3 修改 `design/prototype/pages/task-management/task-detail.html`（與 3.2 同一實作任務之頁面整合）。移除寫死的 `submissionComplete` 值，改為依實際提交狀態推導並補齊其餘四個訊號，阻擋原因逐項呈現且可由鍵盤與螢幕閱讀器取得。驗證：`PW_PORT=8981 pnpm playwright test tests/task-management/task-detail-completion-gate.spec.ts` exit 0 [@senior-frontend]
- [x] 3.4 執行 `node scripts/gen-screen-inventory.mjs` 重生畫面盤點清單並與 3.3 同一提交。驗證：`node scripts/gen-screen-inventory.mjs --check` exit 0 [@senior-frontend]
- [x] 3.5 執行群組 3 回歸候選集與 inventory 一致性核對。驗證：`cd design/prototype && pnpm typecheck && pnpm test:node && PW_PORT=8981 pnpm playwright test tests/task-management/task-detail-completion-gate.spec.ts tests/task-management/task-detail-stage-flow.spec.ts tests/task-management/issue-688-exception-pool-entry.spec.ts tests/task-management/issue-891-live-review-pools.spec.ts` exit 0 [@main]

## 4. 試標完成條件對齊（intermediate PR，MAJOR 行為變更）

**故事目標**（SC-004、SC-047）：讓試標完成改為「該輪標註、必要審核與必要仲裁全部完成且 `dry_run` 例外池已清空」才自動轉入 `waiting_iaa_confirmation`，並為未指定仲裁者的任務提供負責人裁定出口，使新閘門不會讓任何合法處置變成永遠無法完成。

> **產品檔案（3）**：`design/prototype/pages/task-management/task-detail.html`、`design/prototype/pages/task-management/task-detail.data.js`、`docs/adr/022-task-state-machine-location.md`
> **相依**：群組 3 已合併；本群組動工前 `git merge origin/main`。本群組承載 delta 的 `## MODIFIED Requirements` 全部條目與新增 FR-023。

- [ ] 4.1 撰寫 `design/prototype/tests/task-management/task-detail-dry-run-completion.spec.ts` 之 Red。涵蓋 delta `## MODIFIED Requirements` 之 `DRY_RUN_COMPLETION_RULE` 四條情境、FR-008a 一條情境、FR-013 第 (1) 點一條情境、FR-018 第 (5) 點一條情境，以及 issue §4 驗收 01／02／03：全員提交但有待審核單位時維持 `dry_run_in_progress`、審核完成但有爭議中單位時維持、`dry_run` 例外池有待處置項時維持、三者皆完成才自動轉入且不因 IAA 未達標或計算未結束被阻擋、未滿足時逐項列出帶單位的剩餘數且可由鍵盤與螢幕閱讀器取得、`新增試標回合` 停用原因涵蓋必要審核與必要仲裁、`dry_run` 例外項計入試標閘門但不計入結案閘門。每案例加入 inventory.csv。驗證：`PW_PORT=8981 pnpm playwright test tests/task-management/task-detail-dry-run-completion.spec.ts` 出現失敗 [@senior-qa]
- [ ] 4.2 撰寫 `design/prototype/tests/task-management/task-detail-leader-arbitration.spec.ts` 之 Red。涵蓋 delta FR-023 全部四點與其三條情境：`arbiter_ids` 為空時負責人可逐項裁定並解除卡死、裁定來源可與仲裁者裁定區分且理由必填、`arbiter_ids` 非空時不提供此入口且 handler 直呼失敗、裁定「兩者皆非」仍落入例外池且該任務在收尾前不具試標完成資格、`dry_run` 收尾介面不提供 `custom_answer`（`annotation/015-annotation-workspace` FR-095 第 (3) 點）。每案例加入 inventory.csv。驗證：`PW_PORT=8981 pnpm playwright test tests/task-management/task-detail-leader-arbitration.spec.ts` 出現失敗 [@senior-qa]
- [ ] 4.3 修改 `design/prototype/tests/task-management/issue-791-trial-round-from-waiting.spec.ts`（與 4.1 同批次之既有測試更新）。第 2 個案例原斷言「全員提交即轉入待 IAA 確認且兩個 publish 按鈕皆可用」已被本群組的行為變更推翻，須改寫為新契約下的期望值——該案例的 fixture 需補齊審核與仲裁皆完成的狀態才應轉換，不得刪除案例或改為寬鬆斷言。驗證：`PW_PORT=8981 pnpm playwright test tests/task-management/issue-791-trial-round-from-waiting.spec.ts` 出現失敗 [@senior-qa]
- [ ] 4.4 Green：修改 `design/prototype/pages/task-management/task-detail.data.js`。依 design.md D1 之判定式，使試標完成推導讀取 `annotation/015-annotation-workspace` FR-051 之審核單位狀態與 FR-018 之 `dry_run` 例外池計數，並提供 FR-023 之負責人裁定寫入路徑，不另建第二份判定式。驗證：`PW_PORT=8981 pnpm playwright test tests/task-management/task-detail-dry-run-completion.spec.ts` 出現部分通過 [@senior-frontend]
- [ ] 4.5 Green：修改 `design/prototype/pages/task-management/task-detail.html`（承接 4.4 之推導結果）。改寫狀態轉移閘門使其涵蓋審核、仲裁與 `dry_run` 例外池，逐項列出未滿足原因與單位，`新增試標回合` 停用原因文字同步，並渲染 FR-023 之負責人裁定入口與其來源標示。驗證：`PW_PORT=8981 pnpm playwright test tests/task-management/task-detail-dry-run-completion.spec.ts tests/task-management/task-detail-leader-arbitration.spec.ts tests/task-management/issue-791-trial-round-from-waiting.spec.ts` exit 0 [@senior-frontend]
- [ ] 4.6 修改 `docs/adr/022-task-state-machine-location.md`。Transition Table 之 `dry_run_in_progress → waiting_iaa_confirmation` 列前置條件改為涵蓋審核、仲裁與 `dry_run` 例外池，並新增一條 2026-10-02 Amendment 說明本次變更與其 issue 編號；**不得**順手修補該檔與 #1120 無關的既有技術債（`:104`／`:106` 之 `min_reviewers`、Amended 標頭缺 2026-09-07），該債另案。驗證：`grep -n "2026-10-02" docs/adr/022-task-state-machine-location.md` 命中 [@senior-architect]
- [ ] 4.7 執行 `node scripts/gen-screen-inventory.mjs` 重生畫面盤點清單並與 4.5 同一提交。驗證：`node scripts/gen-screen-inventory.mjs --check` exit 0 [@senior-frontend]
- [ ] 4.8 執行群組 4 回歸候選集與 inventory 一致性核對。驗證：`cd design/prototype && pnpm typecheck && pnpm test:node && PW_PORT=8981 pnpm playwright test tests/task-management/task-detail-dry-run-completion.spec.ts tests/task-management/task-detail-leader-arbitration.spec.ts tests/task-management/issue-791-trial-round-from-waiting.spec.ts tests/task-management/task-detail-stage-flow.spec.ts tests/task-management/issue-783-iaa-computation-status.spec.ts tests/cross-role/issue-850-trial-round-shared-source.spec.ts` exit 0 [@main]

## 5. 正式案例試標前置歷史與正典回寫（最終 PR，`Closes #1120`）

**故事目標**（SC-041、SC-050）：讓 T015 與 T016 具備符合前置條件的試標歷史，其 `TrialRound.sampling_value` 與實際建立筆數一致、歷史回合與當前回合分列不交叉，並完成正典 014 回寫與 archive。

> **產品檔案（2）**：`design/prototype/pages/task-management/task-detail.html`、`design/prototype/pages/task-management/task-detail.data.js`
> **相依**：群組 4 已合併；本群組動工前 `git merge origin/main`。

- [ ] 5.1 撰寫 `design/prototype/tests/task-management/task-detail-official-trial-history.spec.ts` 之 Red。涵蓋 issue §4 驗收 11／12 與 delta FR-010u 第 (3) 點：T015／T016 具備可驗證的試標前置歷史、completed 與 IAA 計算未結束／IAA 已結束未達標三種情境各有可驗證 fixture、歷史回合與進行中回合可分別查看且完成數與決策不交叉、已完成輪次不計入進行中回合。**撰寫前置**：T014 待審單位數在倉庫內有兩個互相矛盾的來源（逐列核算為 `5`，而 `design/prototype/pages/dashboard/dashboard.assignments.js:268` 的註解寫 `T014=6 of 15`），須先開啟實際頁面確認真值再寫入斷言，不得沿用任一側的數字。見 design.md D5。每案例加入 inventory.csv。驗證：`PW_PORT=8981 pnpm playwright test tests/task-management/task-detail-official-trial-history.spec.ts` 出現失敗 [@senior-qa]
- [ ] 5.2 修改 `design/prototype/tests/task-management/issue-887-explicit-empty-trial-rounds.spec.ts`（與 4.1 同批次之既有測試更新）。因 T015／T016 改為具備試標歷史，三個案例鎖定的 `#officialPoolValue`、`#trialRoundsUsedValue`、`#roundHistorySummary` 與回合項目數期望值須同步改寫為新的真實值，不得刪除案例或改為寬鬆斷言。驗證：`PW_PORT=8981 pnpm playwright test tests/task-management/issue-887-explicit-empty-trial-rounds.spec.ts` 出現失敗 [@senior-qa]
- [ ] 5.3 Green：修改 `design/prototype/pages/task-management/task-detail.data.js`。為 T015 與 T016 補上符合前置條件的試標回合歷史，`sampling_value` 恆等於該回合實際建立筆數，歷史回合與當前回合各自獨立計數。驗證：`PW_PORT=8981 pnpm playwright test tests/task-management/task-detail-official-trial-history.spec.ts` 出現部分通過 [@senior-frontend]
- [ ] 5.4 修改 `design/prototype/pages/task-management/task-detail.html`（與 4.3 同一實作任務之頁面整合）。使回合歷程與樣本池分配依新的試標歷史呈現，歷史與當前回合分列且不交叉累計。驗證：`PW_PORT=8981 pnpm playwright test tests/task-management/task-detail-official-trial-history.spec.ts tests/task-management/issue-887-explicit-empty-trial-rounds.spec.ts` exit 0 [@senior-frontend]
- [ ] 5.5 執行 `node scripts/gen-screen-inventory.mjs` 重生畫面盤點清單並與 4.4 同一提交。驗證：`node scripts/gen-screen-inventory.mjs --check` exit 0 [@senior-frontend]
- [ ] 5.6 執行 `/opsx:archive 1120-task-lifecycle-alignment`。使衍生檢視收錄本 change 新增條文。驗證：`grep -n FR-023 openspec/specs/task-management/014-task-detail/spec.md` 命中 [@main]
- [ ] 5.7 修改正典 `specs/task-management/014-task-detail/spec.md`。於 FR-010t 之後新增 FR-010u、於 FR-021 之後新增 FR-022 與 FR-023、新增 SC-049／SC-050／SC-051、原地改寫 `DRY_RUN_COMPLETION_RULE`／FR-008a／FR-013 第 (1) 點／FR-018 第 (5) 點／FR-010t 之警示文案／AC-3.2／AC-3.16／SC-004、於使用者故事 1 與使用者故事 3 驗收情境末尾依序配發新 AC 編號（現有最大為 AC-1.25 與 AC-3.24），版本改為 5.0.0 並新增 Changelog 列。驗證：`grep -n FR-010u specs/task-management/014-task-detail/spec.md` 命中 [@main]
- [ ] 5.8 修改 `specs/STATUS.md`。`task-management-014` 列備註補本 change 摘要，分支欄與正典 frontmatter `功能分支` 同步為本次分支。驗證：`grep -n task-management-014 specs/STATUS.md` 顯示本次分支 [@main]
- [ ] 5.9 執行 Source-Verify（gate 4）。衍生檢視與正典中本 change 引入或修訂的每一個 FR／SC／AC ID 與 issue #1120 參照皆可逐項 grep 定位，且正典的 `DRY_RUN_COMPLETION_RULE` 已無「僅計標註提交」之殘留敘述。驗證：`scripts/check-sdd.sh` exit 0 且 `openspec validate --changes --no-interactive` exit 0 [@main]
- [ ] 5.10 執行最終回歸候選集與 inventory 一致性核對。驗證：`cd design/prototype && pnpm typecheck && pnpm test:node && PW_PORT=8981 pnpm playwright test tests/task-management/ tests/cross-role/issue-850-trial-round-shared-source.spec.ts` exit 0 [@main]

## 待裁示與待附件（不在本 change 的任務範圍內）

以下各項**不得**在本 change 內實作，列此僅為交接清單：

- **issue §4 驗收 13／14／15／16 之 UI 定稿部分**：正式階段四張 KPI 配置與結果頁決策欄屬候選 UI 方案，待 issue §7 四組附件補齊與維護者設計定稿後，由 senior-uiux 與 senior-visual-designer 依 issue §5 之 T06 另派。既有可由正典承載的部分（逐 output 指標與參考值來源為 `dataset/017-dataset-analysis-detail` FR-039 與 FR-043、審核狀態三態語彙、匯出重新下載不回歸）不需新 FR。
- **`annotation/015-annotation-workspace` 之 `仲裁輸出項目` 計數單位定義**：015 擁有；維護者已授權，由本單 lead 於群組 5 合併後提一份獨立單一目的 PR（一個小的 `## MODIFIED Requirements` delta），不併入本 change。
- **`docs/adr/022-task-state-machine-location.md` 補 2026-09-07 Amendment 並移除已失效的 `min_reviewers` 引用**：既有技術債，與 #1120 無關，另開單一目的 PR。
