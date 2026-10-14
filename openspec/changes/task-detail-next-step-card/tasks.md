# 任務清單：task-detail-next-step-card（issue #1403）

> **Apply 前硬閘（兩道，互不替代）**：先執行 `openspec validate --changes --no-interactive` 取得 OpenSpec schema validation，再執行 `scripts/check-sdd.sh` 取得 Project SDD lint，兩者皆通過後才進入下方群組。
>
> **TDD 硬規則**：每個可觀察行為皆為 Red（`[@senior-qa]`）＋ Green（`[@senior-frontend]`）配對；Red 先 commit 並留下預期失敗證據，Green 才能開始，且不得弱化 Red 契約。只有主 session／lead 勾選 checkbox。
>
> **範圍**：產品檔案 2 個（`task-detail.html`、`task-detail.panels/overview.html`）；文件 `design/system/pages/task-detail.md`、`design/system/screen-inventory.md`（產生檔）。產品 diff 超過 300 行時拆堆疊 PR。
>
> **Selector 契約（Red 與 Green 共用，不得各自改名）**：
> - 卡片：`#nextStepCard`（`data-testid="next-step-card"`），取代 `#execStopRow`；DOM 中不得再有 `#execStopPills`、`#stopConditionTitle`、`#stopAgreementPill`、`#stopStdPill`、`#stopAnnotatorPill`、`.stop-pill`。
> - 卡頭：`#nextStepTitle`（zh 以「下一步：」開頭、en 以「Next step: 」開頭；`completed` 為「任務已完成，無待執行動作」）、`#nextStepDesc`、`#publishActionRow`（沿用，位於卡頭右側）。
> - 卡身：`#nextStepConditions`；分組 `.next-step-group`（`data-group` 為 `required`、`both`、`official-only`、`reminder`），分組標題 `.next-step-group-title`；條件列 `li.next-step-cond`，屬性 `data-cond`（見下）與 `data-status`（`met`／`unmet`／`info`），子元素 `.next-step-cond-icon`（文字 ✓／○／ⓘ）、`.next-step-cond-label`、`.next-step-cond-value`。
> - `data-cond` 鍵：`draft` → `pool`、`annotators`、`reviewers`、`iaa-later`（info）；`dry_run_in_progress` → `submission`、`review`、`dispute`、`exception-pool`；`waiting_iaa_confirmation` → `iaa-computed`（僅 pending／failed，分組 `both`）、`pool`（分組 `official-only`）、`iaa-advisory`（info，僅 done 且未達標）、`iaa-undetermined`（info，僅 done 且無法判定）；`official_run_in_progress` → `submission`、`review`、`dispute`、`exception-pool`、`quality-metrics`。
> - 沿用的 id：`#publishDryRunBtn`、`#publishOfficialRunBtn`、`#publishCompleteBtn`、`#retryIaaComputationBtn`（在 `iaa-computed` 列內右側）、`#publishPoolReason`（`pool` 列）、`#publishIaaReason`（`iaa-computed` 列）、`#publishUndeterminedNote`（`iaa-undetermined` 列）；其他未滿足列的 id 為 `nextStepCond-<data-cond>`。停用按鈕的 `aria-describedby` 指向每一個未滿足列的 id。
> - `reviewer` 與 `completed`：不渲染 `#nextStepConditions` 的任何列；`reviewer` 沿用 `.exec-action-readonly-note`。

## 0. 前置

**故事目標**（SC-019，AC-3.69）：流程狀態檔反映本 change 對 task-management-014 的 in-flight 狀態。

- [x] 0.1 修改 `specs/STATUS.md` 的 task-management-014 列備註，於最前面加上本 change in-flight 的一句紀錄（issue #1403）；不動其他列。 [@main]

## 1. 卡片骨架與待 IAA 確認（AC-3.69、AC-3.15、AC-3.17、AC-3.18、AC-3.20）

**故事目標**（SC-019，AC-3.69、AC-3.15、AC-3.17、AC-3.18、AC-3.20）：`waiting_iaa_confirmation` 以單一張下一步卡片呈現，唯一主要 CTA 為「開始正式標記」，IAA 未達標只是提醒。

> **產品檔案（2）**：`task-detail.html`、`task-detail.panels/overview.html`
> **相依**：群組 0。

- [ ] 1.1 新增 Red `design/prototype/tests/task-management/issue-1403-next-step-card.spec.ts`：(a) 卡片存在、pill 相關元素不存在；(b) `waiting_iaa_confirmation` 且 `done`：卡頭兩顆按鈕、只有 `#publishOfficialRunBtn` 為 `--color-cta` 背景、`pool` 列在 `official-only` 分組；IAA 未達標時 `iaa-advisory` 為 info 列、文字含「不阻擋」、不在 `both`／`official-only`／`required` 分組，兩顆按鈕可點擊；(c) `pending`：`iaa-computed` 列在 `both` 分組且 unmet、卡片內無 IAA 數值、兩顆按鈕停用且 `aria-describedby` 含 `publishIaaReason`；(d) `failed`：`#retryIaaComputationBtn` 位於 `iaa-computed` 列內；(e) 正式池為 0：`pool` 列 unmet、`#publishOfficialRunBtn` 停用。 [@senior-qa]
- [ ] 1.2 （Green）以 `#nextStepCard` 取代 `#execStopRow` 與 pills，改寫 `renderPublishActions()` 的 `waiting_iaa_confirmation` 分支並移除 pill 渲染程式與 CSS。 [@senior-frontend]

## 2. 草稿條件清單（AC-3.10、FR-022(3)）

**故事目標**（SC-049，AC-3.10）：草稿卡片列出發布 R1 需要的池、標記者與審核員條件，IAA 只是提醒。

> **產品檔案（1）**：`task-detail.html`
> **相依**：群組 1。

- [ ] 2.1 修改 `design/prototype/tests/task-management/issue-1403-next-step-card.spec.ts` 補 Red：`draft` 卡片有 `pool`、`annotators`、`reviewers` 三個 `required` 列與 `iaa-later` info 列；標記者不足時 `annotators` 列 unmet、值含「還差 N 位」、`#publishDryRunBtn` 停用且 `aria-describedby` 含 `nextStepCond-annotators`；條件全滿足時按鈕可點擊、三列皆 met。 [@senior-qa]
- [ ] 2.2 （Green）改寫 `draft` 分支：三列由 FR-010f-3 剩餘池與 FR-010t 成員推導產生，任一 unmet 即停用按鈕。 [@senior-frontend]

## 3. 試標進行中與正式標記中（AC-3.14、AC-3.37、AC-3.9）

**故事目標**（SC-037、SC-047，AC-3.14、AC-3.37、AC-3.9）：兩個狀態的條件列沿用 FR-008a／FR-008b 的同一個判定來源。

> **產品檔案（1）**：`task-detail.html`
> **相依**：群組 2。

- [ ] 3.1 修改 `design/prototype/tests/task-management/issue-1403-next-step-card.spec.ts` 補 Red：`dry_run_in_progress` 的 `#nextStepDesc` 為 AC-3.14 原因句，列為 `submission`、`review`、`dispute`、`exception-pool`，不含 `pool`；`official_run_in_progress` 列為 FR-008b 五項，不含 `annotators`／`iaa-*` 列；未完成列 unmet、`#publishCompleteBtn` 停用。 [@senior-qa]
- [ ] 3.2 （Green）兩個分支改由同一個 reducer 的條件產生 met／unmet 列。 [@senior-frontend]

## 4. reviewer、completed 與停用樣式（AC-3.72、FR-027(6)）

**故事目標**（SC-019，AC-3.72）：reviewer 唯讀且無條件清單，completed 無動作，停用按鈕為中性灰底。

> **產品檔案（1）**：`task-detail.html`
> **相依**：群組 3。

- [ ] 4.1 修改 `design/prototype/tests/task-management/issue-1403-next-step-card.spec.ts` 補 Red：`reviewer` 卡片按鈕停用、可見「僅 project leader 可操作」、無任何條件列；`completed` 的 `#nextStepTitle` 為「任務已完成，無待執行動作」、無按鈕與條件列；卡片內停用按鈕 opacity 為 1、文字色為 `--color-text-soft`、背景色不是 `--color-cta`、邊框不是 dashed；圖示顏色 met／unmet／info 分別等於 `--color-success`／`--color-ink-muted`／`--color-warning`；卡片文字不含 ✗。 [@senior-qa]
- [ ] 4.2 （Green）卡片範圍內的停用樣式與圖示配色，只用既有 token，不改全站 `.btn:disabled`。 [@senior-frontend]

## 5. 既有規格改目標

**故事目標**（SC-019，AC-3.69）：引用 pill 或直向動作欄結構的既有規格改為下一步卡片契約，不弱化其原本驗收的行為。

> **產品檔案（0）**：只改測試。
> **相依**：群組 1～4 的 Red。

- [ ] 5.1 改寫或改目標 proposal「Impact／測試」列出的既有 task-detail 規格，以及其他引用 `execStopRow`、`stop-pill`、`exec-action-reasons`、`publishMemberGapReason` 的規格；每個被刪除或改寫的斷言要在 commit body 說明由哪個新斷言承接。 [@senior-qa]

## 6. 回歸與審查

**故事目標**（SC-019，AC-3.69）：以外部工具與獨立審查確認既有行為不變。

> **產品檔案（0）**：只執行驗證與審查。

- [ ] 6.1 執行 `node scripts/check-css-tokens.mjs`、`node scripts/gen-screen-inventory.mjs` 與 `--check`、`node scripts/check-user-path-map-freshness.mjs`、prototype typecheck，以及範圍限定的 Playwright（本 change 新 spec 與所有引用 publish 動作或 pill 的 task-detail 規格，`PW_PORT=8983`），皆 exit 0。 [@main]
- [ ] 6.2 senior-code-reviewer 獨立審查 Generalization-First、Data Fairness、停用樣式範圍、Principle X 與 Red 契約未被弱化。 [@senior-code-reviewer]

## 7. Source-Verify 與 archive

**故事目標**（SC-019，AC-3.69）：正典引用可定位，並完成 archive 寫回。

> **產品檔案（0）**：只執行 specs／openspec 寫回。**最終群組**：是（單一 PR，archive 與正典寫回於同一 PR）。

- [ ] 7.1 Source-Verify 預掃（archive 前）：FR-027、FR-013、FR-010o-3、FR-010o-4、FR-010t、FR-022、FR-008a、FR-008b、FR-010d、FR-010e、FR-010f-3、AC-3.9、AC-3.10、AC-3.14、AC-3.15、AC-3.17、AC-3.18、AC-3.20、AC-3.37、AC-3.69、AC-3.72、issue #1403、#1429，逐一以 `/usr/bin/grep` 在正典定位。 [@main]
- [ ] 7.2 執行 openspec archive 寫回正典 014（12.3.0 至 13.0.0，MAJOR），Changelog 列指名 #1403 並寫明移除 FR-027(1) 的 pill 規定；同步改寫 spec:191–192 介面定義、FR-010o-3 的 pill 措辭、Prototype Traceability `overview.html` 列、AC-3.69。Exception: governance-propagation; Files: `specs/task-management/014-task-detail/spec.md`, `openspec/specs/task-management/014-task-detail/spec.md`, `specs/STATUS.md`; Reason: archive 寫回正典、同步衍生檢視 Purpose 版號與 STATUS.md 的 task-management-014 列必須同批原子完成。 [@main]

## Traceability

| AC | 需求 | Red | Green |
|---|---|---|---|
| AC-3.69 | FR-027 (4) | 1.1 | 1.2 |
| AC-3.15 | FR-027 (4)、FR-010o-3 | 1.1 | 1.2 |
| AC-3.17、AC-3.18、AC-3.20 | FR-010o-4 | 1.1 | 1.2 |
| AC-3.10 | FR-027 (4)、FR-010t | 2.1 | 2.2 |
| AC-3.14、AC-3.37 | FR-013、FR-008a | 3.1 | 3.2 |
| AC-3.9 | FR-008b | 3.1 | 3.2 |
| AC-3.72 | FR-027 (6) | 4.1 | 4.2 |
