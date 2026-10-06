# 任務清單：1141-task-detail-quality-metrics-gate（issue #1141，正典 014 側）

> **Apply 前硬閘**：先 `openspec validate --changes --no-interactive`，再 `scripts/check-sdd.sh`。
>
> **TDD 硬規則**：Red（senior-qa）必須先 commit 並留下預期失敗證據，Green（senior-frontend）才能開始，不得改寫或弱化 Red 契約。lead 是唯一可驗證證據與更新 checkbox 的角色。
>
> **拆分總則（憲法原則 X）**：產品檔案 2 個（`task-detail.html`、`task-detail.data.js` 僅註解），單一 PR 交付，與姊妹 change `1141-dataset-quality-metrics-ready-signal` 同 PR，承載 archive 與正典回寫（ADR-033 Rule 1）。測試檔、`design/prototype/tests/inventory.csv`、`design/system/screen-inventory.md`、`specs/**`、`openspec/**` 不計入門檻。

## 1. 品質指標就緒閘門（原型）

**故事目標**（SC-037）：讓「標記完成」在最新一輪 IAA 計算為 `pending` 或 `failed` 時停用並顯示可閱讀原因，就緒、無法計算與缺資料皆不被阻擋，完成 #1120 驗收 07(5)。

> **產品檔案（2）**：`design/prototype/pages/task-management/task-detail.html`、`design/prototype/pages/task-management/task-detail.data.js`
> **相依**：無。

- [x] 1.1 撰寫 `design/prototype/tests/task-management/task-detail-quality-metrics-gate.spec.ts` 之 Red。涵蓋 delta FR-008b 第 5 項與兩條新情境：條件 1–4 皆滿足但最新回合為 `pending`／`failed` 時 `標記完成` 停用且顯示可見的品質指標原因、直接呼叫 handler 失敗；`done`（含無法計算）與缺資料不被阻擋。只種子最新回合狀態，避免干擾既有逐項原因計數。每案例加入 inventory.csv。驗證：`PW_PORT=8981 pnpm playwright test tests/task-management/task-detail-quality-metrics-gate.spec.ts` 出現失敗且只有目標行為紅 Red evidence：commit `005ff2b6`，7 案例 4 紅（pending/failed 之停用與 handler）3 綠（done、無法計算、缺訊號） [@senior-qa]
- [x] 1.2 Green：修改 `task-detail.html` 之 `getCompletionSignals()` 於 `official_run` 傳入 `qualityMetricsReady`（由最新試標回合 `getRoundComputationStatus` 推導，`done` 或缺資料為 `true`），新增 `quality_metrics_not_ready` 原因文案（zh／en），並更新 `task-detail.data.js` 的條件 5 註解。驗證：`PW_PORT=8981 pnpm playwright test tests/task-management/task-detail-quality-metrics-gate.spec.ts` exit 0 [@senior-frontend]
- [x] 1.3 執行 `node scripts/gen-screen-inventory.mjs` 重生畫面盤點清單並與 1.2 同一提交。驗證：`node scripts/gen-screen-inventory.mjs --check` exit 0 [@senior-frontend]
- [x] 1.4 執行回歸候選集。驗證：`cd design/prototype && pnpm typecheck && pnpm test:node && PW_PORT=8981 pnpm playwright test tests/task-management/task-detail-quality-metrics-gate.spec.ts tests/task-management/task-detail-completion-gate.spec.ts` 及所有 grep 到 `getCompletionSignals`、`quality_metrics` 的 spec exit 0 [@main]

## 2. archive 與正典回寫（最終群組）

**故事目標**（SC-037）：正典 014 自 v5.0.0 回寫為 v5.1.0，FR-008b 第 5 項引用 017 的 `QUALITY_METRICS_READY_RULE`。

> **產品檔案（0）**：本組不動任何產品程式。
> **版本判定**：**MINOR v5.1.0**。回寫前須先 `git fetch` 並確認 `origin/main` 上正典 014 仍為 v5.0.0。

- [x] 2.1 執行 `/opsx:archive 1141-task-detail-quality-metrics-gate`，以修訂後全文取代衍生檢視 FR-008b。驗證：`openspec/changes/archive/` 下出現本 change 之日期前綴目錄，且 `grep -n 'QUALITY_METRICS_READY_RULE' openspec/specs/task-management/014-task-detail/spec.md` 命中 [@main]
- [x] 2.2 修改正典 `specs/task-management/014-task-detail/spec.md`：原地改寫 FR-008b 第 5 項與新增兩條情境、版本改為 v5.1.0 並新增 Changelog 列。驗證：`grep -n 'QUALITY_METRICS_READY_RULE' specs/task-management/014-task-detail/spec.md` 命中 FR-008b 與 Changelog [@main]
- [x] 2.3 執行 Source-Verify：每個引用的 ID、常數名皆可逐項 `grep` 定位；`specs/STATUS.md` 之 task-management-014 列於合併後改回 in-progress。驗證：`scripts/check-sdd.sh` exit 0 且 `openspec validate --changes --no-interactive` exit 0 [@main]
