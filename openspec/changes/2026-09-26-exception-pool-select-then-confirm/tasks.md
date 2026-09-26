# 任務清單：exception-pool-select-then-confirm

> **範圍硬閘**：只得修改 `design/prototype/**`、本 change 與正典／治理檔；不得修改 `backend/**`、`frontend/**` 或 root `e2e/**`。Apply 前執行 OpenSpec schema validation 與 Project SDD lint。

## 1. PR-920A — 最終例外處置改為先選取、後確認，理由必填擴及四種處置

> **相依與平行性**：1.1 → 1.2 → 1.3 → 1.4 → 1.5 嚴格依序。本 change 只修改 `annotation-workspace.config.js` 的 `buildExceptionPoolItemRow()`／`expandExceptionPoolAction()` 與其內嵌 i18n 區塊，與同波並行的 #956（`buildUnits()` 約 :1625）、#992（`handleReviewSubmit()` 約 :5483）不同區域，可並行 apply；本 issue 排在群組最後合併。

**故事目標**：延續 issue #907 已落地的例外池外殼（AC-4.69、SC-011）與 2026-09-24／2026-09-26 兩則維護者裁定，把最終例外處置的四個動作由「一鍵即定案」改為「先選取、後確認」的單一寫入點，理由必填擴及全部四種處置，並修正 `adopt_annotator`／`adopt_reviewer` 現行 `reason: ''` 的缺陷（issue #913）。新增可量測成功標準 **SC-012**（理由必填未通過次數與確認按鈕誤啟用次數皆為 0），於 1.4/1.5 archive 回寫時寫入正典「成功標準」清單。

- [ ] 1.1 以既有主要契約檔 `design/prototype/tests/annotation/issue-596-exception-pool.spec.ts` 為主，將「一鍵即處置」之斷言改判為前提消失並改寫為兩段式正向斷言（點選處置按鈕 → 斷言僅標記選取、未寫入、`aria-pressed` 為 `true` → 填理由 → 點統一確認按鈕 → 斷言寫入完成且 `reason` 非空）；新增彙整列（`ws-exception-pool-summary`）四種狀態與確認按鈕（`ws-exception-pool-confirm`）disabled/enabled 狀態的斷言；`custom_answer`／`exclude_from_dataset` 之空理由阻擋斷言改為檢查按鈕 `disabled` 屬性而非點擊後跳 toast。同步改寫三個間接依賴一鍵寫入或舊確認 testid 的既有測試（`tests/task-management/issue-891-live-review-pools.spec.ts`、`tests/annotation/issue-913-exception-pool-sticky-owner.spec.ts`、`tests/annotation/issue-914-finalized-value-validation.spec.ts`）之驅動序列，其最終寫入結果斷言本身不變。建立 committed Red，跑出預期失敗並記錄。[@senior-qa]
- [ ] 1.2 Green：於 `design/prototype/pages/annotation/annotation-workspace.config.js` 改寫 `buildExceptionPoolItemRow()`／`expandExceptionPoolAction()`：四個處置按鈕點擊只切換本地 `selectedAction`（`aria-pressed`），不再呼叫 `resolveFn`；恆常渲染理由欄、新增彙整列、統一確認按鈕（原生 `disabled`，見 design.md D3）；`custom_answer` 之 `expandHost` 加 delegated click listener 供彙整列即時更新（design.md D4）；新增 i18n 鍵 `exceptionPoolNoSelectionLabel`／`exceptionPoolSummaryTpl`／`exceptionPoolSummaryWithValueTpl`，移除孤兒鍵 `exceptionPoolReasonRequired`（zh／en）。不得弱化 1.1 之 Red 契約。[@main]
- [ ] 1.3 執行驗證閘門：`pnpm typecheck`；以 `grep -rl` 推導之候選集分批執行 Playwright（PW_PORT=8986）；`node scripts/gen-screen-inventory.mjs` 重生一次後 `--check`；`scripts/inventory-tests.sh`；`scripts/check-sdd.sh`（0 error）；`scripts/check-spec-artifacts.sh`；`node scripts/check-user-path-map-freshness.mjs`。全部通過後才開 PR。[@main]
- [ ] 1.4 正典 015 MAJOR bump（v6.26.0 起 → v7.0.0，BREAKING）：FR-095 新增「先選取、後確認的處置互動模型」段落並修正末句「AC-4.56、AC-4.57 維持原狀」之矛盾措辭；廢止 AC-4.56、AC-4.57（前提消失，ID 保留不重用）；新增 AC-4.72 ~ AC-4.75；「成功標準」清單新增 **SC-012**；補 Changelog。衍生檢視 `openspec/specs/annotation/015-annotation-workspace/spec.md` 之 FR-095 requirement 段落同步修正「一鍵完成」與正典矛盾之措辭。[@main]
- [ ] 1.5 Source-Verify：逐條 grep 衍生檢視引用（FR/AC ID、檔案路徑、issue 編號、程式碼識別字、被改寫條文子句）並記錄命中結果；`openspec archive exception-pool-select-then-confirm --yes`；`specs/STATUS.md` 之 `annotation-015` 列同步版本與狀態。[@main]

## 非本 change 範圍

`arbitrationFinalizedSnapshot()` 之 `readReviewerSubmissions(...)[0]`（issue #975）與 `annotation-workspace.config.js` 另四處同構寬鬆判準（v6.21.0 Changelog 已記錄）不在本 change 處理範圍，另案追蹤。FR-095「最終例外處置畫面的外殼」（AC-4.69、SC-011）不受本 change 影響。
