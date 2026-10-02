# 任務清單：work-log-date-range-picker（issue #1101）

> **Apply 前硬閘**：先 `openspec validate --changes --no-interactive`（OpenSpec schema validation），再 `scripts/check-sdd.sh`（Project SDD lint）。兩者皆通過才進入實作。
>
> **TDD 硬規則**：每一項可觀察行為為一組 Red（senior-qa）與實作任務（senior-frontend）配對；Red 任務必須先 commit 並執行、留下預期失敗證據，實作任務才能開始；實作任務不得為了讓測試通過而改寫或弱化 Red 契約。lead／main session 是唯一可驗證 Red／Green evidence 與更新 checkbox 的角色。
>
> **拆分總則（憲法原則 X）**：群組 1（3 產品檔案）與群組 2（2 產品檔案）各自低於 5 檔／300 行門檻，拆為兩個 PR。群組 1 為 intermediate PR（OpenSpec change 維持開啟）；群組 2 為最終 PR，承載正典回寫與 `/opsx:archive`（ADR-033 Rule 1）。測試檔、`design/system/screen-inventory.md`、`specs/**`、`openspec/**` 不計入門檻。
>
> **群組間相依**：1 → 2 嚴格序列；群組 2 動工前須 `git merge origin/main` 取得已合併的群組 1。

## 1. 共用日期區間選擇器（intermediate PR）

**故事目標**（SC-036）：先建立一個可重用、符合鍵盤與 ARIA 規範的日期區間選擇器元件，供群組 2 整合進 `work-log` 篩選列（SC-036 之匯總與明細呈現所在頁面）使用。

> **產品檔案（3）**：`design/prototype/pages/shared/date-range-picker.js`、`design/prototype/pages/shared/date-range-picker.css`、`design/prototype/components-showcase.html`
> **相依**：無。

- [ ] 1.1 撰寫 `design/prototype/tests/shared/date-range-picker.spec.ts` 之 Red。涵蓋 design.md D2／D3 契約：開啟關閉、跨日區間選取、同日區間選取、選取範圍高亮、反向點選正規化、不完整選取不觸發變更、清除操作、鍵盤操作流程、375px viewport 不溢出。每案例加入 inventory.csv。驗證：`PW_PORT=8980 pnpm playwright test tests/shared/date-range-picker.spec.ts` 出現失敗 [@senior-qa]
- [ ] 1.2 Green：新增 `design/prototype/pages/shared/date-range-picker.js`。依 design.md D1 至 D3 實作 mount／setValue／setLang／destroy 介面與全部互動規則。驗證：`PW_PORT=8980 pnpm playwright test tests/shared/date-range-picker.spec.ts` exit 0 [@senior-frontend]
- [ ] 1.3 新增 `design/prototype/pages/shared/date-range-picker.css`（與 1.2 同一實作任務之配套樣式）。沿用 `assets/tokens.css` 之色彩、間距、圓角與 z-index token，不得硬編色票。驗證：`PW_PORT=8980 pnpm playwright test tests/shared/date-range-picker.spec.ts` exit 0 [@senior-frontend]
- [ ] 1.4 修改 `design/prototype/components-showcase.html`（與 1.2 同一實作任務之展示收錄）。新增示範區塊並於既有 script 區塊內掛載元件，納入 Living Styleguide。驗證：`cd design/prototype && pnpm typecheck` exit 0 [@senior-frontend]
- [ ] 1.5 執行群組 1 回歸候選集與 inventory 一致性核對。驗證：`cd design/prototype && pnpm typecheck && pnpm test:node && PW_PORT=8980 pnpm playwright test tests/shared/` exit 0，且 `npx playwright test --list tests/shared/date-range-picker.spec.ts` 案例數等於 `grep -c date-range-picker.spec.ts design/prototype/tests/inventory.csv` [@main]

## 2. 整合 work-log 與正典回寫（最終 PR，`Closes #1101`）

**故事目標**（SC-036）：`work-log` 篩選列改用群組 1 的共用元件取代兩個日期欄位，匯總與明細表依組合篩選結果計算之既有行為（SC-036）不變，`wl_from`／`wl_to` 契約（FR-019）文字不變，正典 014 回寫 FR-007c 與六條驗收情境。

> **產品檔案（2）**：`design/prototype/pages/task-management/task-detail.panels/work-log.html`、`design/prototype/pages/task-management/task-detail.html`
> **相依**：群組 1 已合併；本群組動工前 `git merge origin/main`。

- [ ] 2.1 撰寫 `design/prototype/tests/task-management/task-detail-work-log-date-range.spec.ts` 之 Red。涵蓋 issue #1101 全部驗收條件與 delta 六條情境：移除兩個獨立欄位、跨日與同日區間選取、不完整選取不套用、反向正規化、含邊界套用、清除恢復、與任務階段或成員篩選組合、分頁重置、`wl_from`／`wl_to` 寫回與單邊直連還原、reviewer 邊界不受影響、zh／en 文案、桌面與 375px 不溢出。每案例加入 inventory.csv。驗證：`PW_PORT=8980 pnpm playwright test tests/task-management/task-detail-work-log-date-range.spec.ts` 出現失敗 [@senior-qa]
- [ ] 2.2 修改 `design/prototype/tests/task-management/task-detail-work-log-i18n.spec.ts`（與 2.1 同批次之既有測試更新）。斷言改為單一觸發元件之文案（zh／en），不得僅刪除舊斷言。驗證：`PW_PORT=8980 pnpm playwright test tests/task-management/task-detail-work-log-i18n.spec.ts` 出現失敗 [@senior-qa]
- [ ] 2.3 修改 `design/prototype/tests/task-management/issue-726-url-view-state.spec.ts`（與 2.1 同批次之既有測試更新）。以日曆互動取代既有單一日期輸入框寫入方式，斷言內容不變。驗證：`PW_PORT=8980 pnpm playwright test tests/task-management/issue-726-url-view-state.spec.ts` 出現失敗 [@senior-qa]
- [ ] 2.4 Green：修改 `design/prototype/pages/task-management/task-detail.panels/work-log.html`。以單一觸發元件取代兩個日期欄位 markup，依 design.md D4。驗證：`PW_PORT=8980 pnpm playwright test tests/task-management/task-detail-work-log-date-range.spec.ts` exit 0 [@senior-frontend]
- [ ] 2.5 修改 `design/prototype/pages/task-management/task-detail.html`（與 2.4 同一實作任務之頁面整合）。依 design.md D4 掛載共用元件、state 與 URL mapping 維持不變、語言切換流程同步呼叫元件語言介面，新增 i18n 鍵。驗證：`PW_PORT=8980 pnpm playwright test tests/task-management/task-detail-work-log-date-range.spec.ts tests/task-management/task-detail-work-log-i18n.spec.ts tests/task-management/issue-726-url-view-state.spec.ts` exit 0，且 `cd design/prototype && pnpm typecheck` exit 0 [@senior-frontend]
- [ ] 2.6 執行 `node scripts/gen-screen-inventory.mjs` 重生畫面盤點清單並與 2.5 同一提交，因 `task-detail.html` 為頂層頁面檔。驗證：`node scripts/gen-screen-inventory.mjs --check` exit 0 [@senior-frontend]
- [ ] 2.7 執行群組 2 回歸候選集並保存桌面與 375px 前後截圖。驗證：`cd design/prototype && pnpm typecheck && pnpm test:node && PW_PORT=8980 pnpm playwright test tests/task-management/task-detail-work-log-date-range.spec.ts tests/task-management/task-detail-work-log-i18n.spec.ts tests/task-management/issue-726-url-view-state.spec.ts` exit 0 [@main]
- [ ] 2.8 執行 inventory 一致性核對。驗證：`npx playwright test --list tests/task-management/task-detail-work-log-date-range.spec.ts` 案例數等於 `grep -c task-detail-work-log-date-range.spec.ts design/prototype/tests/inventory.csv` [@main]
- [ ] 2.9 執行 `/opsx:archive 1101-work-log-date-range-picker`。使衍生檢視收錄 FR-007c。驗證：`grep -n FR-007c openspec/specs/task-management/014-task-detail/spec.md` 命中 [@main]
- [ ] 2.10 修改正典 `specs/task-management/014-task-detail/spec.md`。Tab E 工時篩選列介面描述補一句呈現方式說明；於 FR-007b 之後新增 FR-007c；於使用者故事 1 驗收情境末尾新增六條情境並依序配發新 AC 編號；版本改為 4.3.0 並新增 Changelog 列。驗證：`grep -n FR-007c specs/task-management/014-task-detail/spec.md` 命中 [@main]
- [ ] 2.11 修改 `specs/STATUS.md`。`task-management-014` 列狀態改為 archived。驗證：`grep -n task-management-014 specs/STATUS.md` 顯示 archived [@main]
- [ ] 2.12 執行 Source-Verify（gate 4）。衍生檢視與正典中本 change 引入的每一個 FR／AC ID、issue #1101 參照皆可逐項 grep 定位。驗證：`scripts/check-sdd.sh` exit 0 且 `openspec validate --changes --no-interactive` exit 0 [@main]

## 合併前注意

- 群組 1 PR 標題／內文使用 `Part of #1101`；群組 2 PR 第一行 `Closes #1101`。
- 群組 2 動工前確認 `origin/main` 已含群組 1 的合併結果，必要時 `git merge origin/main`（不得 rebase），若 screen-inventory 衝突則重新執行 `node scripts/gen-screen-inventory.mjs`。
- 合併後依既有先例另開 PR 將正典 014 歸位 `specs/_archive/`（依 `specs/STATUS.md` 當下紀錄處理）。
