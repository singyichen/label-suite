# 任務清單：work-log-date-range-picker（issue #1101）

> **Apply 前硬閘**：先 `openspec validate --changes --no-interactive`（OpenSpec schema validation），再 `scripts/check-sdd.sh`（Project SDD lint）。兩者皆通過才進入實作。
>
> **TDD 硬規則**：每一項可觀察行為為一組 Red（`[@senior-qa]`）與實作任務（`[@senior-frontend]`）配對；Red 任務必須先 commit 並執行、留下預期失敗證據，實作任務才能開始；實作任務不得為了讓測試通過而改寫或弱化 Red 契約。lead／main session 是唯一可驗證 Red／Green evidence 與更新 checkbox 的角色。
>
> **拆分總則（憲法原則 X）**：Group A（3 產品檔案）與 Group B（2 產品檔案）各自低於 5 檔／300 行門檻，拆為兩個 PR。Group A 為 intermediate PR（OpenSpec change 維持開啟）；Group B 為最終 PR，承載正典回寫與 `/opsx:archive`（ADR-033 Rule 1）。測試檔、`design/system/screen-inventory.md`、`specs/**`、`openspec/**` 不計入門檻。
>
> **群組間相依**：A → B 嚴格序列；B 動工前須 `git merge origin/main` 取得已合併的 Group A。

## A. 共用日期區間選擇器（intermediate PR）

**故事目標**：`components-showcase.html` 提供一個可重用、符合鍵盤與 ARIA 規範的日期區間選擇器元件，作為 Group B 整合進 `work-log` 的基礎。

> **產品檔案（3）**：`design/prototype/pages/shared/date-range-picker.js`、`date-range-picker.css`、`design/prototype/components-showcase.html`
> **相依**：無。

- [ ] A.1 撰寫 `design/prototype/tests/shared/date-range-picker.spec.ts` 之 Red（design.md D2／D3 契約）：開啟／關閉、跨日區間選取、同日區間選取、選取範圍高亮（`is-range-start`／`is-range-end`／`is-in-range`）、反向點選正規化、不完整選取不觸發變更、清除操作、鍵盤操作流程（方向鍵移動焦點、Enter 選取、Esc 關閉並還原、焦點回到 trigger）、375px viewport 不溢出。每個案例皆須加入 `design/prototype/tests/inventory.csv`（`decision=keep`，traceability 引用本 change 之 delta 情境）。驗證：`PW_PORT=8980 pnpm playwright test tests/shared/date-range-picker.spec.ts` 出現失敗 [@senior-qa]
- [ ] A.2 （Green）新增 `design/prototype/pages/shared/date-range-picker.js` 與 `date-range-picker.css`：依 design.md D1–D3 實作 `window.DateRangePicker.mount/setValue/setLang/destroy`，CSS 沿用 `assets/tokens.css`。驗證：`PW_PORT=8980 pnpm playwright test tests/shared/date-range-picker.spec.ts` exit 0 [@senior-frontend]
- [ ] A.3 修改 `design/prototype/components-showcase.html`：新增示範區塊（`<div class="component-card" id="comp-date-range-picker">`），掛載元件並於底部 `<script>` 區塊初始化，納入 Living Styleguide。驗證：`cd design/prototype && pnpm typecheck` exit 0；`PW_PORT=8980 pnpm playwright test tests/shared/date-range-picker.spec.ts tests/shared/components-showcase.spec.ts` exit 0 [@senior-frontend]
- [ ] A.4 執行 Group A 回歸候選集（shared 既有測試 + 新測試）並保存證據。驗證：`cd design/prototype && pnpm typecheck && pnpm test:node && PW_PORT=8980 pnpm playwright test tests/shared/` exit 0 [@main]
- [ ] A.5 Inventory 一致性核對：新案例皆 `decision=keep`。驗證：`npx playwright test --list tests/shared/date-range-picker.spec.ts` 案例數 == `grep -c "date-range-picker.spec.ts" design/prototype/tests/inventory.csv` [@main]

## B. 整合 work-log 與正典回寫（最終 PR，`Closes #1101`）

**故事目標**：`work-log` 篩選列改用 Group A 的共用元件，`wl_from`／`wl_to` 契約與既有篩選/分頁行為不變，正典 014 回寫 FR-007c 與六條驗收情境。

> **產品檔案（2）**：`design/prototype/pages/task-management/task-detail.panels/work-log.html`、`design/prototype/pages/task-management/task-detail.html`
> **相依**：Group A 已合併；B 動工前 `git merge origin/main`。

- [ ] B.1 撰寫 `design/prototype/tests/task-management/task-detail-work-log-date-range.spec.ts` 之 Red，涵蓋 issue #1101 全部驗收條件（design.md D4／D5、delta 六條情境）：移除兩個獨立欄位、跨日與同日區間選取、不完整選取不套用、反向正規化、含邊界套用、清除恢復、與任務階段/成員篩選組合、分頁重置、`wl_from`/`wl_to` 寫回與單邊直連還原、reviewer 邊界不受影響、zh/en 文案、桌面與 375px 不溢出。新增 inventory.csv 列。驗證：`PW_PORT=8980 pnpm playwright test tests/task-management/task-detail-work-log-date-range.spec.ts` 出現失敗 [@senior-qa]
- [ ] B.2 修改 `design/prototype/tests/task-management/task-detail-work-log-i18n.spec.ts`：斷言改為單一 `#workLogDateRangeTrigger` 文案（zh/en），不得僅刪除舊斷言（design.md D5）。驗證：`PW_PORT=8980 pnpm playwright test tests/task-management/task-detail-work-log-i18n.spec.ts` 出現失敗（或與 B.1 合併觀察） [@senior-qa]
- [ ] B.3 修改 `design/prototype/tests/task-management/issue-726-url-view-state.spec.ts`：以日曆互動取代 `.fill()` 寫入 `wl_from`（design.md D5），斷言內容不變。驗證：`PW_PORT=8980 pnpm playwright test tests/task-management/issue-726-url-view-state.spec.ts` 出現失敗（因前端尚未改接） [@senior-qa]
- [ ] B.4 （Green）修改 `design/prototype/pages/task-management/task-detail.panels/work-log.html`：以 `date-range-field` + trigger 取代兩個日期欄位 markup（design.md D4）。[@senior-frontend]
- [ ] B.5 （Green）修改 `design/prototype/pages/task-management/task-detail.html`：依 design.md D4 掛載共用元件、state/URL mapping 不變、`switchLang()` 呼叫 `setLang()`、新增 i18n 鍵 `workLogDateRangeLabel`／`workLogDateRangePlaceholder`。驗證：`PW_PORT=8980 pnpm playwright test tests/task-management/task-detail-work-log-date-range.spec.ts tests/task-management/task-detail-work-log-i18n.spec.ts tests/task-management/issue-726-url-view-state.spec.ts` exit 0，`cd design/prototype && pnpm typecheck` exit 0 [@senior-frontend]
- [ ] B.6 執行 `node scripts/gen-screen-inventory.mjs` 重生畫面盤點清單（`task-detail.html` 為頂層頁面檔）並與 B.5 同一提交。驗證：`scripts/check-sdd.sh` 之 INVENTORY_FRESHNESS 為 0 筆、`node scripts/check-user-path-map-freshness.mjs` exit 0 [@senior-frontend]
- [ ] B.7 執行 Group B 回歸候選集（新測試 + `grep -rlE "work-log|worklog|wl_from|task-detail" design/prototype/tests/task-management` 清單）並保存桌面／375px 前後截圖。驗證：`cd design/prototype && pnpm typecheck && pnpm test:node && PW_PORT=8980 pnpm playwright test tests/task-management/task-detail-work-log-date-range.spec.ts tests/task-management/task-detail-work-log-i18n.spec.ts tests/task-management/issue-726-url-view-state.spec.ts` exit 0 [@main]
- [ ] B.8 Inventory 一致性核對。驗證：`npx playwright test --list tests/task-management/task-detail-work-log-date-range.spec.ts` 案例數 == `grep -c "task-detail-work-log-date-range.spec.ts" design/prototype/tests/inventory.csv` [@main]
- [ ] B.9 執行 `/opsx:archive 1101-work-log-date-range-picker`，使衍生檢視收錄 FR-007c。驗證：`grep -n 'FR-007c' openspec/specs/task-management/014-task-detail/spec.md` 命中 [@main]
- [ ] B.10 修改正典 `specs/task-management/014-task-detail/spec.md`：Tab E「工時篩選列」介面描述補一句呈現方式說明；於 FR-007b 之後新增 FR-007c；於使用者故事 1 驗收情境末尾新增六條情境並依序配發 `AC-1.20`～`AC-1.25`；版本改為 `4.3.0` 並新增 Changelog 列。驗證：`grep -n 'FR-007c' specs/task-management/014-task-detail/spec.md` 命中、`grep -n 'AC-1.20' specs/task-management/014-task-detail/spec.md` 命中、`grep -n '^| 4.3.0 ' specs/task-management/014-task-detail/spec.md` 命中 [@main]
- [ ] B.11 修改 `specs/STATUS.md` 之 `task-management-014` 列為 archived。[@main]
- [ ] B.12 Source-Verify（gate 4）：衍生檢視與正典中本 change 引入的每一個 FR／AC ID、issue #1101 參照皆可逐項 `grep` 定位。驗證：`scripts/check-sdd.sh` exit 0 且 `openspec validate --changes --no-interactive` exit 0 [@main]

## 合併前注意

- Group A PR 標題／內文使用 `Part of #1101`；Group B PR 第一行 `Closes #1101`。
- Group B 動工前確認 `origin/main` 已含 Group A 的合併結果，必要時 `git merge origin/main`（不得 rebase），若 screen-inventory 衝突則重新執行 `node scripts/gen-screen-inventory.mjs`。
- 合併後依既有先例另開 PR 將正典 014 歸位 `specs/_archive/`（若 014 在本 change 前已是 archived 狀態之外的位置，依 `specs/STATUS.md` 當下紀錄處理）。
