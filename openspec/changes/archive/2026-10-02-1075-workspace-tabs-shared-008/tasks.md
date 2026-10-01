# Tasks

## 1. Red 測試

**故事目標**：SC-009D — 快捷鍵總覽新增之「頁籤」section 兩列各自獨立呈現，不合併列，與既有「審核」section 同規則。

- [ ] 1.1 以 `design/prototype/tests/shared/workspace-tabs-shortcut-overview.spec.ts` 建立測試：開啟快捷鍵總覽，驗證存在「頁籤」section（標題文字）及其下恰兩列（「切換至對應位置頁籤」「關閉作用中頁籤」），各自以獨立 keycap 呈現（`ALT`／代表 1-8 之鍵位／`W` 為各自獨立 DOM 元素，不得合併為單一文字字串）。commit 並記錄預期失敗。[@senior-qa]
- [ ] 1.2 同一測試檔追加：切換 zh/en，驗證「頁籤」section 標題與兩列動作文字同步翻譯。commit 並記錄預期失敗。[@senior-qa]
- [ ] 1.3 驗證預期失敗證據前先跑 `git status --short` 確認工作樹乾淨，將兩案例之 Playwright 執行輸出（含失敗訊息）貼進 issue #1075 檢查點留言。[@senior-qa]
- [ ] 1.4 於 `design/prototype/tests/inventory.csv` 以同一 commit 追加對應列（`decision=keep`，`traceability` 引用本 delta 之 FR-016H、AC-016H.1、AC-016H.2），並以 `playwright --list` 核對標題與列數一致。[@senior-qa]

## 2. Green 實作

**故事目標**：SC-009D — 快捷鍵總覽新增之頁籤 section 轉綠，不影響既有三個 section，也不異動由 `specs/shared/019-workspace-tabs/spec.md` 之 FR-013 擁有的既有快捷鍵觸發/抑制邏輯。

- [ ] 2.1 修改 `design/prototype/pages/shared/sidebar.js` 之 `renderSidebar()` 樣板：於 `shortcutHelpModal` 既有「標記作業」與「審核」section 之間或之後，新增「頁籤」section markup，含兩個 `shortcut-help-row`，`Alt+1…8` 以 `keyGroup(['ALT', '1-8'])`（或等效呈現 1 至 8 範圍之獨立 keycap 寫法）、`Alt+W` 以 `keyGroup(['ALT', 'W'])`。[@senior-frontend]
- [ ] 2.2 於既有 zh/en `I18N`／字串對照表新增「頁籤」section 標題與兩列動作文字之雙語字串，比照既有 `shortcutWorkspace*`／`shortcutReview*` 命名慣例；接入既有 `updateShortcutHelpLanguage()` 語言切換路徑，使語言切換即時反映。[@senior-frontend]
- [ ] 2.3 使 1.1／1.2 測試轉綠；確認不異動 `closeWorkspaceTab()`（FR-022 為既有行為之書面補述，本群組不碰生產邏輯）、不異動 `Alt+1…8`／`Alt+W` 本身之觸發/抑制邏輯（`specs/shared/019-workspace-tabs/spec.md` 之 FR-013 既有範圍）。[@senior-frontend]
- [ ] 2.4 執行：若 2.1/2.2 異動觸及 `design/prototype/pages/**`，於同一 commit 內以 `node scripts/gen-screen-inventory.mjs` 重新產生 `design/system/screen-inventory.md`。[@senior-frontend]

## 3. 規格收尾（spec 019 + STATUS.md）

**故事目標**：SC-001 — `specs/shared/019-workspace-tabs/spec.md` 狀態正式收尾，原型僅能模擬之 AC 清單正式記錄供 `frontend/**` 階段參考；`specs/STATUS.md` 兩列同步更新。

- [ ] 3.1 執行：更新 `specs/shared/019-workspace-tabs/spec.md`（下稱「本規格」，狀態欄位由 `Draft` 更新為本專案對「原型已交付規格」採用之對應值，比照鄰近規格如 018 之既有填寫規則；版本 bump 至 1.1.0）：Changelog 新增一列，記錄（a）關閉焦點移動規則已由本次 `shared-008` delta 正式承接確認（對應本規格自身之 AC-1.5）、（b）快捷鍵總覽新增項已由本次 `shared-008` delta 正式承接確認（對應本規格自身之 FR-013 與 AC-5.1 至 AC-5.4）、（c）原型僅能模擬之 AC 清單（本規格自身之 AC-2.2、issue #1084 已知落差、AC-4.1 淘汰判定時機、AC-5.3、AC-6.1、AC-7.1 至 AC-7.3 之 `sim_403`、AC-8.2，共 8 項）標註為「原型層模擬，frontend 階段驗證」。[@main]
- [ ] 3.2 更新 `specs/STATUS.md`：`shared-019` 列狀態更新（`spec-ready` → 本次對應值）、分支欄更新為本次分支、摘要欄附加本次摘要（不覆蓋既有文字）；`shared-008` 列同步更新版本／狀態／摘要（附加，不覆蓋）；異動歷程區塊新增對應紀錄列。[@main]

## 4. 驗證與正典回寫

**故事目標**：SC-001 — 確認新增 FR-022、FR-016H，`specs/shared/019-workspace-tabs/spec.md` 收尾，既有行為皆無回歸，Source-Verify 引用可逐一 grep 定位，正典回寫完成。

- [ ] 4.1 執行 Gate 1／Gate 2：`npx -p @fission-ai/openspec openspec validate --changes --no-interactive`；`bash scripts/check-sdd.sh`。[@main]
- [ ] 4.2 一次完整本機 Playwright 全量回歸（背景執行，`PW_PORT=8984`，輸出導向 scratchpad 檔案並以短指令輪詢），記錄總案例數與耗時，確認 ≥ 2034 案例（既有基準）＋ G2 全部新增案例皆綠燈。[@main]
- [ ] 4.3 執行其餘閘門：`pnpm typecheck`、`pnpm test:node`（皆於 `design/prototype/` 內）、`scripts/speckit-tests.sh`、`scripts/check-spec-artifacts.sh`、`scripts/check-demo-data-parity.sh`、`node scripts/check-user-path-map-freshness.mjs`、`scripts/inventory-tests.sh`、`scripts/pre-commit-tests.sh`、`scripts/pre-tool-use-tests.sh`，全數通過。[@main]
- [ ] 4.4 執行 Source-Verify 預掃（`LC_ALL=C grep`）：確認本 delta（FR-022、FR-016H、AC-022.1、AC-022.2、AC-016H.1、AC-016H.2）與 `specs/shared/019-workspace-tabs/spec.md` Changelog 內所有引用（FR/AC id、檔案路徑、PR 編號、issue 編號）皆可於正典或程式碼逐一 grep 定位。[@main]
- [ ] 4.5 執行 `/opsx:archive`：衍生檢視合併本次新增條文；正典 `specs/shared/008-sidebar-navbar-shared/spec.md` 回寫 2.1.0 → 2.2.0（Changelog 新增一列）；`grep -rn` 確認 `FR-022`、`FR-016H` 等新 id 全倉庫無重複宣告。[@main]

## 5. 獨立審查與 PR

**故事目標**：SC-001 — 合併前經未參與實作者複核 Source-Verify checklist，確認本次為 MINOR（未推翻任何既有 FR/AC），STATUS 列為附加寫法。

- [ ] 5.1 派未寫過本改動的 `senior-code-reviewer` 獨立審查 `git diff origin/main...HEAD`：Source-Verify 引用是否皆可定位；是否確實未新增或移除任何既有 FR/AC（MINOR 邊界）；`specs/shared/019-workspace-tabs/spec.md` Changelog 記述是否準確；`specs/STATUS.md` 兩列是否為附加寫法（未覆蓋既有欄位歷史）。結論原文貼進 issue #1075 檢查點留言。[@senior-code-reviewer]
- [ ] 5.2 執行：撰寫 `pr-1075-g3.md`（Refs #1075，Closes #1075，base main），貼 `git diff --stat` 與最終 SHA，不開 PR，交由主／協調 session 開啟並合併。[@main]
