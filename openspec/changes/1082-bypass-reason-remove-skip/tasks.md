# Tasks

## 1. Red 測試

**故事目標**：SC-006 — Annotator 與 Reviewer 主要流程（標記/審查/提交/返回）端到端可完成，且關鍵操作皆有歷程可追溯；本次之 Bypass 理由輸入、驗證時機、審核卡理由可見性與跳過功能完整移除，皆須有可信的失敗-先行證據。

- [ ] 1.1 新增 `design/prototype/tests/annotation/annotation-workspace-bypass-reason.spec.ts`（feature-named，依 README Test Policy 不用 issue 編號命名）：覆蓋 AC-2.29（勾選展開理由欄位、不顯示錯誤、取消勾選收起並清空、填寫後顯示說明文字、多 outKey 獨立展開）、Bypass 理由必填送出驗證（未填阻擋＋行內錯誤＋toast 指名 outKey、填寫後送出成功且 `submitted` 事件之 `reason` 含該理由、多輸出類型各自獨立判定必填）、AC-3.66（審核卡 Bypass chip 旁顯示標記員理由；舊資料缺理由時不渲染空字串或報錯）、AC-2.27 鎖定控件改為兩個（驗證 `wsSkipBtn` 不存在於 DOM）、FR-086 既有 `skipped` 事件以中性徽章＋英文原值呈現。commit 並記錄預期失敗。[@senior-qa]
- [ ] 1.2 移除 `design/prototype/tests/annotation/issue-578-reason-required.spec.ts`：若整檔案僅涉及跳過理由必填流程，整檔退場；若含與跳過無關之其他斷言，僅移除涉及跳過之案例，其餘逐字保留。commit。[@senior-qa]
- [ ] 1.3 移除 `design/prototype/tests/annotation/issue-578-history-actions.spec.ts` 中涉及 `wsSkipBtn`／`skipped`／`markSampleSkipped` 之案例或斷言，其餘不涉及跳過之既有斷言逐字保留。commit。[@senior-qa]
- [ ] 1.4 移除 `design/prototype/tests/annotation/issue-596-history-chain.spec.ts` 中涉及 `wsSkipBtn`／`skipped`／`markSampleSkipped` 之案例或斷言，其餘不涉及跳過之既有斷言逐字保留。commit。[@senior-qa]
- [ ] 1.5 移除 `design/prototype/tests/annotation/issue-754-dry-run-arbitration-feedback.spec.ts` 中涉及 `wsSkipBtn`／`skipped`／`markSampleSkipped` 之案例或斷言，其餘不涉及跳過之既有斷言逐字保留。commit。[@senior-qa]
- [ ] 1.6 移除 `design/prototype/tests/annotation/issue-908-annotator-finalized-lock.spec.ts` 中對 `wsSkipBtn` 之斷言（鎖定控件改為兩個：`wsSaveBtn`、`wsSubmitBtn`），其餘既有斷言（示範列 seed 豁免、dry_run 不受影響）逐字保留。commit。[@senior-qa]
- [ ] 1.7 執行 `inventory.csv` 兩向比對：依 README Test Policy 為 1.2–1.6 移除之案例列 `decision=retire`（保留列，標記退場理由），為 1.1 新增之案例列新列（`decision=keep`，追溯標註 AC-2.20／AC-2.27／AC-2.29／AC-3.66／FR-086／FR-089／FR-092）。commit。[@senior-qa]
- [ ] 1.8 執行驗證：預期失敗證據前先跑 `git status --short` 確認工作樹乾淨，輸出貼進 issue #1082 檢查點留言；`PW_PORT=8985 pnpm playwright test annotation-workspace-bypass-reason.spec.ts` 之執行輸出（含失敗訊息）一併貼上。[@senior-qa]

## 2. Green 實作

**故事目標**：SC-006 — Annotator 與 Reviewer 主要流程端到端可完成；移除跳過功能、Bypass 理由欄位可用且驗證時機正確、理由進入歷程與審核卡，且既有流程（審核、仲裁、定稿鎖定、示範列豁免、dry_run）不回歸。

- [ ] 2.1 修改 `design/prototype/pages/annotation/annotation-workspace.html`：移除 `#wsSkipGroup`（`#wsSkipReason`／`#wsSkipBtn`）及其專屬 CSS。[@senior-frontend]
- [ ] 2.2 修改 `design/prototype/pages/annotation/annotation-workspace.config.js`：移除 `skipReasonText()`／`refreshSkipBlocker()`／`renderSkipControl()`／`handleSkip()` 及其事件綁定與呼叫點（含 `setControlLocked` 對 `wsSkipBtn` 之呼叫、`renderSkipControl()` 於既有 render 流程中的呼叫）。[@senior-frontend]
- [ ] 2.3 修改 `design/prototype/pages/annotation/annotation-workspace.data.js`：整段移除 `markSampleSkipped()`。[@senior-frontend]
- [ ] 2.4 修改 `design/prototype/pages/shared/annotation-history.js`：`HISTORY_ACTIONS` 移除 `skipped`；`ACTION_LABEL` 移除「已跳過」鍵；確認集合外值既有中性徽章＋英文原值 fallback 路徑仍覆蓋移除後的 `skipped`。使 1.1 之 FR-086 相關案例轉綠。[@senior-frontend]
- [ ] 2.5 修改 `design/prototype/pages/annotation/annotation-workspace.config.js`：`patchBypassChip()` 新增逐 outKey 理由輸入框之掛載（於 preview-bypass-row 列內，比照既有「消費端掛自己的尾端控件」慣例，不修改共用引擎 task-config.engine.js）；勾選展開／取消收起並清空／輸入即清錯／已填顯示說明文字；多 outKey 互不干擾。使 1.1 之 AC-2.29 案例轉綠。[@senior-frontend]
- [ ] 2.6 修改 `design/prototype/pages/annotation/annotation-workspace.config.js`：`collectAnswerPayload()` 新增 `bypassReasons`（逐 outKey）欄位；`handleSubmit()` 新增送出前驗證——已勾選 Bypass 但理由空白之 outKey，阻擋送出、對應面板顯示行內錯誤、toast 指名缺理由之 outKey（比照既有 `pendingOutputLabels` 顯示名稱慣例）；全部補齊後正常送出。[@senior-frontend]
- [ ] 2.7 修改 `design/prototype/pages/annotation/annotation-workspace.data.js`：`markSampleSubmitted()` 之 `submitted` 事件新增 `reason`（來源為 payload 之 `bypassReasons`，逐 outKey 組字串，格式比照既有 `buildHistorySummary()` 慣例；無任何 outKey 勾選 Bypass 時 `reason` 維持既有行為，不新增空欄位）。使 1.1 之 Bypass 理由必填送出驗證案例轉綠。[@senior-frontend]
- [ ] 2.8 修改 `design/prototype/pages/annotation/annotation-workspace.config.js`：`appendCorrectionControl()` 之 `ws-review-original-answer` 區塊，`originalIsBypass` 分支旁新增理由顯示，讀取 FR-089 新持久化路徑；缺理由之舊資料不渲染理由文字、不報錯。使 1.1 之 AC-3.66 案例轉綠。[@senior-frontend]
- [ ] 2.9 修改 `design/prototype/pages/annotation/annotation-workspace.config.js`：新增／調整中英文 i18n 字串（理由欄位 placeholder、說明文字、行內錯誤、toast）；移除 `skipNeedsReason`／`skipSuccess` 等跳過專用字串（逐一確認移除後不再被任何呼叫消費）。[@senior-frontend]
- [ ] 2.10 修改 `design/prototype/pages/annotation/annotation-workspace.config.js`：確認 FR-101 相關之鎖定渲染僅鎖定 `wsSaveBtn`、`wsSubmitBtn` 兩者，不再引用 `wsSkipBtn`。使 1.1 之 AC-2.27 案例轉綠。[@senior-frontend]
- [ ] 2.11 執行 `node scripts/gen-screen-inventory.mjs` 重新產生 screen-inventory 一次（本次變更觸及 `design/prototype/pages/**`，於最後一次來源編輯後執行）。[@senior-frontend]

## 3. 驗證與正典回寫

**故事目標**：SC-006 — 確認新增之 Bypass 理由欄位與既有審核、仲裁、定稿鎖定、示範列豁免、dry_run 流程皆未回歸，且 015 正典與 STATUS.md 於最終組同步更新。

- [ ] 3.1 執行閘門（每組）：`scripts/check-sdd.sh`、`scripts/speckit-tests.sh`、`scripts/check-spec-artifacts.sh`、`scripts/check-demo-data-parity.sh`、`node scripts/check-user-path-map-freshness.mjs`、`scripts/inventory-tests.sh`、`scripts/pre-commit-tests.sh`、`scripts/pre-tool-use-tests.sh`；`npx -p @fission-ai/openspec openspec validate --changes --no-interactive`（G1／G3）；`cd design/prototype && pnpm typecheck && pnpm test:node && PW_PORT=8985 pnpm playwright test <本次新增規格 + 迴歸集合> --workers=1`；`node scripts/gen-screen-inventory.mjs --check`。全部通過方可繼續，主責（lead）親自重跑並獨立覆核，不採信代理自報。[@main]
- [ ] 3.2 執行 Source-Verify 與正典回寫（最終組）：確認 FR-089、FR-086、FR-101、AC-2.20、AC-2.27、AC-2.29、FR-092、AC-3.66 皆可於正典逐一 grep 定位；`openspec archive` 回寫正典（版本 9.1.1 → 10.0.0，補 Changelog 條目）並同步更新 `openspec/specs/` derived view；更新 `specs/STATUS.md`。[@main]

## 4. 獨立審查與 PR

**故事目標**：SC-006 — 合併前須經未參與實作者複核，確保跳過功能確實移除乾淨、理由欄位驗證時機正確、理由確實進入歷程與審核卡、既有斷言未被弱化。

- [ ] 4.1 派未寫過本改動的 `senior-code-reviewer` 獨立審查（每組）：每條 issue 本文項目是否皆對應到 delta 之 FR/AC 與測試；跳過是否完全移除（無死碼 `wsSkip*`、`handleSkip`、`skipped` 產生點、`markSampleSkipped`）而既有 `skipped` 歷程事件仍以中性徽章呈現；UXC-04／UXC-05 驗證時機；`reason` 是否確實進入 `submitted` 事件與審核卡；Red 是否在 detached `origin/main` worktree 上以正確原因失敗（獨立埠）；delta 是否為 MAJOR 且每條引用可 grep 定位、無重複 id；inventory 是否已兩向比對。結論原文貼進 issue #1082 檢查點留言。[@senior-code-reviewer]
- [ ] 4.2 開 PR（每組；intermediate 組 Refs #1082；最終組 Closes #1082），逐項 Test Plan 證據、紅燈／綠燈證據皆貼上，push 前 `git fetch origin main` 並 `git merge origin/main`（stacked PR 依波次需求，不得 rebase）。[@main]
