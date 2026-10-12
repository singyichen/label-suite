# 任務清單：annotation-history-mask-before-reveal

> 主 session／per-issue lead 是唯一可驗證 Red／Green evidence 與更新 checkbox 的角色。Apply 前先執行 `openspec validate --changes --no-interactive` 與 `scripts/check-sdd.sh`。

## 1. PR-1268-HISTORY-MASK — 歷程供給層之揭露前遮蔽

> **相依與平行性**：本群組嚴格序列 1.1 → 1.2 → 1.3 → 1.4；不使用 parallel markers。1.1 的 committed Red 必須先於 1.2。

**故事目標**：SC-004J — 歷程依時序可追溯之同時，依 FR-090、FR-096 於試標回合揭露前使標記員經任何歷程路徑都取不到審核判斷。

- [x] 1.1 建立 `design/prototype/tests/annotation/issue-1268-history-mask-before-reveal.spec.ts` 作為 Red 契約，自 `../fixtures` 匯入 `test`／`expect`，以資料層 `getSampleHistory()`（帶標記員 viewer）與 `歷程` 頁籤 DOM 釘住：回合揭露前標記員之歷程不含審核員、仲裁、例外池事件及其 `result_snapshot`、本人事件仍在；回合揭露後審核事件照原規則可見；先提交此單檔，再執行測試，expected failure 必須只落在揭露前仍回傳審核類事件 [@senior-qa]
  - Evidence：Red commit `ccc4e0ab`；`PW_PORT=8982 pnpm playwright test tests/annotation/issue-1268-history-mask-before-reveal.spec.ts` exit `1`，5 failed／4 passed；5 項失敗皆為目標行為（揭露前標記員仍取得 `reviewer:modified`／`adjudicated`／`project_leader:exception_resolved`、DOM 仍渲染 2 張 `adjudicated` 卡、清單摘要為 `exception_resolved`、無 `trialRound` 條目未 fail closed、R2 樣本未遮蔽），4 項 guard（本人事件、審核員 viewer、揭露後可見）通過；lead 獨立複跑同數，`git status --short` 乾淨。
- [x] 1.2 Green：修改 `design/prototype/pages/annotation/annotation-workspace.data.js`，`maskHistoryForViewer()` 於 `dry_run` 且該樣本所屬回合未揭露時只保留標記員本人事件，揭露判定與 `getDryRunFeedback()` 共用單一來源；不得放寬或改寫 Red 契約 [@senior-frontend]
  - Evidence：Green commit `391362ff`（僅 `annotation-workspace.data.js` +30/−8；抽出 `disclosedTrialRound()` 為 `getDryRunFeedback()` 與 `getSampleHistory()` 共用之 FR-096 揭露判定）；Red 規格 9 passed／0 failed、exit `0`；`git diff ccc4e0ab..HEAD -- design/prototype/tests` 為空（Red 未被改寫）；senior-code-reviewer 獨立審查 PASS-with-nits（無 Critical／High）。
- [x] 1.3 執行 code/test gate：於 `design/prototype/` 執行 `node ~/.cache/node/corepack/v1/pnpm/12.3.4/bin/pnpm.mjs typecheck`、`node ~/.cache/node/corepack/v1/pnpm/12.3.4/bin/pnpm.mjs test:node`，以及帶本 worktree 專屬 `PW_PORT` 之受影響 Playwright 規格，皆預期 exit `0` [@main]
  - Evidence：`pnpm typecheck` exit `0`；`pnpm test:node` 56 pass／0 fail、exit `0`；`PW_PORT=8982 pnpm playwright test` Red 規格＋20 個既有歷程／遮蔽／試標回饋／跨角色規格共 240 passed／0 failed、exit `0`（XROLE-04 為 `test.fail()` 已知缺口，計為通過）。
- [ ] 1.4 更新 `specs/annotation/015-annotation-workspace/spec.md` 完成 gate 4 回寫：FR-090 補本版修訂段（原文逐字保留）、新增一則 AC（編號接續第 4 章現行最大者）、版號 bump 與 Changelog 補一列；Changelog 既有列不得改寫 [@main]

## Pre-merge finalization（在 /opsx:apply 外，NON-CHECKBOX）

所有 apply checkbox 完成、code review 通過後，本 PR 才執行 Source-Verify 與 `/opsx:archive annotation-history-mask-before-reveal`。Archive 後依 `docs/sdd-workflow.md` §6.2 逐條 grep 本 change 寫入之 canonical citation（FR-090、FR-096、FR-062、FR-016B、AC-4.51、issue #1268、#578），確認皆可個別定位。final merge 後才更新 `specs/STATUS.md`。
