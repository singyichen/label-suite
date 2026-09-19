# 任務清單：annotation-dry-run-feedback-by-round

> **Apply 前硬閘**：先執行 `openspec validate annotation-dry-run-feedback-by-round --type change` 與 `scripts/check-sdd.sh`，分別回報 OpenSpec schema validation 與 Project SDD lint。兩者通過後必須停止，取得使用者對 design.md 待裁定問題 Q1–Q6 之明確裁定與確認，才可進入 `/opsx:apply`。主 session／team lead 是唯一可驗證 Red／Green evidence 與更新 checkbox 的角色。

## 1. PR-834-FEEDBACK-ROUND-DATA — 資料層改以回合判定揭露

> **相依與平行性**：本群組嚴格序列 1.1 → 1.2；不使用 parallel markers。1.1 的 committed Red 必須先於 1.2。本群組只動資料層，不動呈現層（屬群組 2）。

**故事目標**：SC-004V、SC-004K — 試標之品質產出（被修改率）由逐標記員審核單位之定案推導而得；本群組使其揭露以回合為單位，已結束回合之回饋在下一回合進行中仍可取得，進行中回合之資料一律不回傳。

- [x] 1.1 建立 `design/prototype/tests/annotation/issue-834-dry-run-feedback-round-data.spec.ts` 作為 Red 契約，以資料層 API 釘住四件事：R{n} 已結束而 R{n+1} 進行中時 `getDryRunFeedback()` 回傳 R{n} 之列且每列帶 `round`、R{n+1} 之提交不出現、R1 進行中時回傳空陣列、無回合標記之提交於 `dry_run_in_progress` 時不回傳；以修補任務之 `materializedRuns` 回合數與任務清單狀態模擬多回合情境；型別宣告使用 local cast，不得新增第二份 `declare global`；先提交此單檔，再執行測試，expected failure 必須是 R{n+1} 進行中時回傳空陣列，並保存 command、exit 與失敗訊息 [@senior-qa]
  - 證據：Red commit `dd903340`；`PW_PORT=8964 node ~/.cache/node/corepack/v1/pnpm/12.3.4/bin/pnpm.mjs playwright test tests/annotation/issue-834-dry-run-feedback-round-data.spec.ts` → exit 1，6 failed／1 passed（通過者為 R1 進行中回傳空陣列之護欄）；失敗訊息為 R2 進行中 `Expected ["emo-001"] Received []` 與 waiting 時 `round Expected 2 Received undefined`，即 R{n+1} 進行中時回傳空陣列，符合預期原因
- [x] 1.2 Green：修改 `design/prototype/pages/annotation/annotation-workspace.data.js`，dry_run 標記員提交時於 entry 記錄 `trialRound`，`getDryRunFeedback()` 依 design.md D2 之可揭露回合集合篩選並於回傳列加上 `round`，無回合標記者依 D4 處理；可揭露回合集合只在資料層推導一次，不得放寬或改寫 Red 契約 [@senior-frontend]
  - 證據：Green commit `c32ea610`；`PW_PORT=8964 node ~/.cache/node/corepack/v1/pnpm/12.3.4/bin/pnpm.mjs playwright test` 本群組 Red 檔＋`issue-596-dry-run-feedback.spec.ts`＋`issue-754-dry-run-arbitration-feedback.spec.ts` → exit 0，14 passed；Red 檔未修改

## 2. PR-834-FEEDBACK-ROUND-LIST — 呈現層逐回合分組

> **相依與平行性**：本群組依賴群組 1 之 Green；嚴格序列 2.1 → 2.2 → 2.3 → 2.4。本群組只動呈現層，不另設任務狀態閘門。

**故事目標**：SC-004V — 標記員於試標歷史回饋逐回合看到自己的被修改筆數與占比，進行中回合僅見待結束說明。

- [x] 2.1 建立 `design/prototype/tests/annotation/issue-834-dry-run-feedback-round-list.spec.ts` 作為 Red 契約，於 `annotation-list` 釘住三件事：R{n+1} 進行中時 R{n} 回饋之分組、摘要與逐筆列可見且同時顯示 `ws-dry-run-feedback-pending`、兩回合各自之被修改筆數與占比分列、任務轉入 `official_run_in_progress` 後已結束回合之回饋仍可見；先提交此單檔，再執行測試，expected failure 必須是 R{n+1} 進行中時僅渲染待結束說明，並保存 command、exit 與失敗訊息 [@senior-qa]
  - 證據：Red commit `aca461eb`；`PW_PORT=8964 node ~/.cache/node/corepack/v1/pnpm/12.3.4/bin/pnpm.mjs playwright test tests/annotation/issue-834-dry-run-feedback-round-list.spec.ts` → exit 1，3 failed；失敗訊息為分組容器數 0（預期 1／2）與 `official_run_in_progress` 時待結束說明數 1（預期 0），即僅渲染待結束說明，符合預期原因
- [x] 2.2 Green：修改 `design/prototype/pages/annotation/annotation-list.html`，`renderDryRunFeedback()` 移除以任務狀態短路之判定，改依資料層回傳列之 `round` 逐回合分組渲染摘要與逐筆列，有進行中回合時另顯示既有待結束說明；不得放寬或改寫 Red 契約 [@senior-frontend]
  - 證據：Green commit `e393f853`；`PW_PORT=8964 node ~/.cache/node/corepack/v1/pnpm/12.3.4/bin/pnpm.mjs playwright test` 兩支 issue-834 檔＋596＋754 → exit 0，17 passed；Red 檔未修改
- [x] 2.3 執行 code/test gate：`node ~/.cache/node/corepack/v1/pnpm/12.3.4/bin/pnpm.mjs typecheck` 與 `node ~/.cache/node/corepack/v1/pnpm/12.3.4/bin/pnpm.mjs playwright test`（於 `design/prototype/`，並帶本 worktree 專屬 `PW_PORT`），兩者預期 exit `0`；typecheck 必須與 Playwright 分開記錄，兩者是獨立閘門 [@main]
  - 證據（2026-09-19，tip `e393f853`）：typecheck → exit 0；`PW_PORT=8964 node ~/.cache/node/corepack/v1/pnpm/12.3.4/bin/pnpm.mjs playwright test tests/annotation/` → exit 0，851 passed。依協調者指示本輪只跑 `tests/annotation/` 整個目錄，全量 Playwright 待 CI 閘門
- [x] 2.4 更新 `specs/annotation/015-annotation-workspace/spec.md` 完成 gate 4 回寫：FR-096 揭露時機改為逐回合並補本版修訂段、新增一則 AC（編號接續第 1 章現行最大者）、版號 bump 與 Changelog 補一列；Changelog 既有列不得改寫，被取代的條文逐字保留為沿革 [@main]
  - 證據：canonical write-back commit `d84432a0`：`specs/annotation/015-annotation-workspace/spec.md` 版本 6.6.0 → 6.7.0、FR-096 補 v6.7.0 修訂段（原文逐字保留）、新增 AC-1.28（第 1 章現行最大為 AC-1.27）、Changelog 新增 6.7.0 列，既有列未改

## Pre-merge finalization（在 /opsx:apply 外，NON-CHECKBOX）

所有 apply checkbox 完成、code review 與使用者確認均通過後，本 PR 才執行 Source-Verify 與 `/opsx:archive annotation-dry-run-feedback-by-round`。Archive 產生衍生檢視後，必須依 `docs/sdd-workflow.md` §6.2 逐條 grep 本 change 寫入的 canonical citation（FR-096、AC-1.27、新 AC、SC-004V、SC-004K、`task-management/014-task-detail` FR-013、FR-010f-2、FR-010f-3、issue #834／#791、PR #830），確認每一條都可被個別定位。final merge 後才更新 `specs/STATUS.md`。
