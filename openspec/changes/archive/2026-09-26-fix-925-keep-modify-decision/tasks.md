# Tasks

## 1. Red 測試

**故事目標**：SC-006 — Reviewer 主要流程（審查/決策/提交）端到端可完成，決策不應被審核員自身的修正操作靜默清空（issue #925）。

- [x] 1.1 以 `design/prototype/tests/annotation/issue-925-keep-modify-decision.spec.ts` 建立測試：對某 outKey 點選「修正」（`modify`）並填妥必填理由，接著在同一 outKey 的直接修正控件上把答案改成另一個值；驗證「修正」決策按鈕維持 `aria-pressed="true"`、理由欄維持可見且內容不被清空、不顯示 `toastReviewDecisionResetOnEdit` toast。commit 並記錄執行結果為預期失敗。[@senior-qa]
- [x] 1.2 同一測試檔追加〔迴歸不變量，最容易做錯之處〕：對另一 outKey 點選「通過」（`approve`），改答案後驗證該決策被清空（`aria-pressed` 回到 `false`）且顯示 `toastReviewDecisionResetOnEdit` toast；對第三個 outKey 點選「無法裁決」（`bypass`）並填妥理由，改答案後驗證決策與理由欄一併清空且同樣顯示該 toast。commit 並記錄預期失敗。[@senior-qa]
- [x] 1.3 驗證預期失敗證據前先跑 `git status --short` 確認工作樹乾淨，輸出貼進 issue #925 檢查點留言；兩個案例之 Playwright 執行輸出（含失敗訊息）一併貼上。[@senior-qa]

## 2. Green 實作

**故事目標**：SC-006 — 收窄 `syncDecisionsWithCorrections()` 的重置條件，同時不影響既有 `approve`／`bypass` 重置行為。

- [x] 2.1 修改 `design/prototype/pages/annotation/annotation-workspace.config.js` 之 `syncDecisionsWithCorrections()`（約 :3755）：快照與當前答案不同時，決策為 `modify` 者只更新快照 `reviewDecisionAnswers[key]`、不清空決策、不計入本輪 `reset` 旗標；`approve`／`bypass` 維持既有清空決策、刪快照、標記 `reset = true` 之行為，不改動。使 1.1 測試轉綠，1.2 維持綠燈。[@senior-frontend]

## 3. 驗證與正典回寫

**故事目標**：SC-006 — 確認新增排除分支未使既有重置行為全面失效，且 OpenSpec 四道閘門與正典回寫皆完成。

- [x] 3.1 執行閘門：`cd design/prototype && pnpm install --frozen-lockfile`；`pnpm typecheck`；以 `grep -rl` 推導候選集後 `PW_PORT=8983 pnpm playwright test <候選集>`；`node scripts/gen-screen-inventory.mjs`（僅於最後一次改生產碼後跑一次）；`node scripts/gen-screen-inventory.mjs --check`；`scripts/inventory-tests.sh`；`scripts/check-sdd.sh`（須 0 error）；`scripts/check-spec-artifacts.sh`；`node scripts/check-user-path-map-freshness.mjs`。全部通過方可繼續，主責（main／team-lead）親自重跑並獨立覆核，不採信代理自報。[@main]
- [x] 3.2 Source-Verify：確認 AC-3.42、FR-092 之引用行號與 syncDecisionsWithCorrections 所在位置皆可逐一 grep -n 定位；執行 openspec archive 回寫正典（版本 6.25.0 → 6.26.0，補 Changelog 條目）並同步更新 openspec/specs/ derived view。[@main]

## 4. 獨立審查與 PR

**故事目標**：SC-006 — 合併前須經未參與實作者複核，確保收窄未變成全面取消重置。

- [x] 4.1 派未寫過本改動的 senior-code-reviewer 獨立審查：收窄是否僅限 `modify` 分支、`approve`／`bypass` 側是否仍會重置並顯示 toast、理由欄清空邏輯是否連動正確、有無破壞 `persistReviewDraft()` 草稿契約或 `reviewDecisionRequiresReason()` 理由必填判定、Source-Verify 引用可否逐條 grep 定位、紅燈契約有無被弱化。結論原文貼進 issue #925 檢查點留言。[@senior-code-reviewer]
- [ ] 4.2 開 PR（base main，Closes #925，逐項 Test Plan 證據，紅燈／綠燈證據皆貼），push 前 `git fetch origin main && git merge origin/main`（禁止 rebase 已推送 commit）。[@main]
