# Tasks

## 1. G1 視覺對齊 — Red 測試

**故事目標**：SC-015 — `task-detail` 頁籤之階段標示（試標 R{n} 警示色／正式主色）在同任務多頁籤情境下可一眼分辨（FR-010），本群組額外驗證固定寬度截斷後徽章與圖示仍可辨識，並確認作用中頁籤改用低彩度中性色底。

- [ ] 1.1 以 `design/prototype/tests/shared/workspace-tabs-visual.spec.ts` 建立測試：開啟多個長短標題不一的頁籤，驗證所有頁籤元素 computed width 相等，長標題頁籤之標籤文字元素 computed text-overflow 為 ellipsis。commit 並記錄預期失敗。[@senior-qa]
- [ ] 1.2 同一測試檔追加案例：長標題頁籤之 `title` 屬性等於完整標題文字。commit 並記錄預期失敗。[@senior-qa]
- [ ] 1.3 同一測試檔追加案例：每個頁籤內存在依頁面種類對應的圖示子元素，且 dashboard／task-management／annotation 三種 pageKind 之圖示彼此不同。commit 並記錄預期失敗。[@senior-qa]
- [ ] 1.4 同一測試檔追加案例：作用中頁籤 computed `border` 與 inactive 頁籤一致（無整圈外框差異），computed `background-color` 可與 inactive 區分，且不等於目前 `--color-surface` 之已知 RGB 值。commit 並記錄預期失敗。[@senior-qa]
- [ ] 1.5 同一測試檔追加案例：`data-stage-badge` 頁籤截斷標題情境下，徽章文字色仍可與 inactive 頁籤文字色區分，且頁籤標籤文字非 `display:none`／`visibility:hidden`。commit 並記錄預期失敗。[@senior-qa]
- [ ] 1.6 同一測試檔追加案例：light／dark 兩種 `data-theme` 下，hover 與鍵盤 focus 之 computed 樣式皆與 inactive 預設態不同、彼此可分辨。commit 並記錄預期失敗。[@senior-qa]
- [ ] 1.7 同一測試檔追加案例：375px viewport、zh-TW／en 兩語系下，固定寬度頁籤與圖示不造成頁籤列既有橫向捲動容器邊界外溢。commit 並記錄預期失敗。[@senior-qa]
- [ ] 1.8 執行：驗證預期失敗前先跑 `git status --short` 確認工作樹乾淨；於 `PW_PORT=8982` 執行新測試；記錄完整失敗輸出，貼進 issue #1099 檢查點留言。[@senior-qa]
- [ ] 1.9 於 `design/prototype/tests/inventory.csv` 以同一 commit 新增對應列（`decision=keep`，LF only），並以 `npx playwright test --list workspace-tabs-visual.spec.ts` 核對案例數與新增列數一致。[@senior-qa]

## 2. G1 視覺對齊 — Green 實作

**故事目標**：SC-015 — 上述 Red 案例轉綠，階段徽章與圖示在截斷後仍可辨識，作用中頁籤改用低彩度中性色。

- [ ] 2.1 修改 `design/system/MASTER.md`：頁籤小節新增寬度 token（建議 180px）與中性色語意 token 說明，依本 change 之 design.md G1 決策記錄 light／dark 最終色號與判斷依據。[@senior-frontend]
- [ ] 2.2 `design/prototype/assets/tokens.css` 的 light／dark 兩個 `:root` 區塊同步新增 2.1 新增之語意 token。[@senior-frontend]
- [ ] 2.3 修改 `design/prototype/pages/shared/sidebar.css`：頁籤元素新增固定寬度、標籤文字元素新增截斷規則、作用中頁籤改用中性色底並移除整圈外框、新增 hover／focus-visible 規則。[@senior-frontend]
- [ ] 2.4 修改 `design/prototype/pages/shared/sidebar.js`：renderWorkspaceTabBar() 為每個頁籤元素加入完整標題屬性，新增 workspaceTabIconFor(pageKind) 並插入圖示子元素，抽出共用 SVG 常數供 navItems 與此函式共用；移除既有 ponytail 寬度註解。[@senior-frontend]
- [ ] 2.5 執行：使 1.1–1.7 全數轉綠；確認既有 `design/prototype/tests/shared/` 頁籤與側欄相關測試家族不回歸。[@senior-frontend]
- [ ] 2.6 執行：同一 commit 內以 `node scripts/gen-screen-inventory.mjs` 重新產生 `design/system/screen-inventory.md`（若有內容異動）。[@senior-frontend]

## 3. G1 視覺對齊 — 驗證、審查與 PR

**故事目標**：SC-015 — 確認 G1 不回歸既有任何頁籤家族行為，獨立審查通過，交付群組 PR。

- [ ] 3.1 執行：`npx -p @fission-ai/openspec openspec validate --changes --no-interactive`；`bash scripts/check-sdd.sh`（背景執行＋輪詢）。[@main]
- [ ] 3.2 執行：於 `design/prototype/` 內 `pnpm typecheck`、`pnpm test:node`、`PW_PORT=8982 pnpm playwright test workspace-tabs-visual.spec.ts tests/shared/`（新測試＋既有 019／008 頁籤與側欄回歸家族），時序敏感案例加 `--workers=1 --repeat-each=5`。[@main]
- [ ] 3.3 執行：`scripts/speckit-tests.sh`、`scripts/check-spec-artifacts.sh`、`scripts/check-demo-data-parity.sh`、`node scripts/check-user-path-map-freshness.mjs`、`scripts/inventory-tests.sh`、`scripts/pre-commit-tests.sh`、`scripts/pre-tool-use-tests.sh`、`node scripts/gen-screen-inventory.mjs --check`。[@main]
- [ ] 3.4 派未參與實作之 `senior-code-reviewer` 獨立審查 `git diff origin/main...HEAD`：對照本群組 checklist 與 issue #1099 新增視覺驗收條件逐項核對（低彩度中性色、hover/focus/selected 可辨識、無孤立白帶或突兀框線、light/dark/zh-TW/en/窄螢幕/鍵盤focus/長標題/關閉入口/階段badge複驗齊全、未重設品牌或改動 dashboard 卡片配色、`#1098` 掛載位置未被觸碰）。結論原文貼進檢查點留言。[@senior-code-reviewer]
- [ ] 3.5 執行：撰寫 `pr-1099-g1.md`（`Part of #1099`，不開 PR），貼 `git diff --stat origin/main...HEAD` 與最終 SHA，交由主 session 開啟。[@main]

## 4. G2 總覽選單 — Red

**故事目標**：SC-001 — 所有具 Sidebar 殼層的頁面載入後，主內容區上方皆可觀察到工作頁籤列或總覽選單二擇一可見（本群組之總覽選單取代原行動版下拉）。維護者裁定已採納（篩選演算法、鍵盤操作模型皆已定案，見 `design.md` G2 小節與 spec delta `FR-023` 第 3／4 點、`AC-023.3`～`AC-023.7`）；本群組於 G1 PR 合併後開始。

- [ ] 4.1 以 `design/prototype/tests/shared/workspace-tabs-overview-menu.spec.ts` 建立測試：覆蓋 AC-023.1、AC-023.2、AC-023A.1、AC-023.3（篩選比對範圍／大小寫）、AC-023.4～AC-023.7（鍵盤操作模型），含桌面與行動兩種 viewport。commit 並記錄預期失敗。[@senior-qa]
- [ ] 4.2 同一測試檔追加：既有行動版下拉選單相關斷言（AC-6.1～AC-6.3）改為針對新共用元件之對應斷言，於 commit message 說明取代關係，不得默默刪除既有斷言。commit 並記錄預期失敗。[@senior-qa]
- [ ] 4.3 執行：`PW_PORT=8982` 執行新測試並記錄完整失敗輸出，貼進 issue #1099 檢查點留言；於 `design/prototype/tests/inventory.csv` 同一 commit 新增對應列（LF only）。[@senior-qa]

## 5. G2 總覽選單 — Green 實作

**故事目標**：SC-001 — 總覽選單正確取代行動版下拉，桌面與行動共用同一元件，既有 AC-6.1～AC-6.3 行為不回歸。

- [ ] 5.1 修改 `design/prototype/pages/shared/sidebar.js`：新增 renderWorkspaceTabOverviewMenu()（依本 change 之 design.md G2 決策，取代 renderWorkspaceTabMobileDropdown()），mountWorkspaceTabBar() 改接線。[@senior-frontend]
- [ ] 5.2 修改 `design/prototype/pages/shared/sidebar.css`：新增總覽選單樣式（桌面固定於頁籤列右端、行動版取代頁籤列）。[@senior-frontend]
- [ ] 5.3 執行：使 4.1–4.2 全數轉綠；確認既有 019／008 家族不回歸。[@senior-frontend]
- [ ] 5.4 執行：同一 commit 內以 `node scripts/gen-screen-inventory.mjs` 重新產生 `design/system/screen-inventory.md`。[@senior-frontend]

## 6. G2 總覽選單 — 驗證、審查與 PR

**故事目標**：SC-001 — 確認 G2 不回歸既有任何頁籤家族行為，獨立審查通過，交付群組 PR。

- [ ] 6.1 執行：Gate 1／Gate 2（`openspec validate`、`scripts/check-sdd.sh`）＋ Gate 3（typecheck／test:node／Playwright 新測試與回歸家族，時序敏感案例加 `--workers=1 --repeat-each=5`）＋其餘閘門（`speckit-tests.sh`／`check-spec-artifacts.sh`／`check-demo-data-parity.sh`／`check-user-path-map-freshness.mjs`／`inventory-tests.sh`／`pre-commit-tests.sh`／`pre-tool-use-tests.sh`／`gen-screen-inventory.mjs --check`）。[@main]
- [ ] 6.2 派未參與實作之 `senior-code-reviewer` 獨立審查，結論原文貼進檢查點留言。[@senior-code-reviewer]
- [ ] 6.3 執行：撰寫 `pr-1099-g2.md`（`Part of #1099`，不開 PR），貼 `git diff --stat origin/main...HEAD` 與最終 SHA。[@main]

## 7. G3 重開堆疊＋全部關閉 — Red

**故事目標**：SC-009、SC-010 — 淘汰頁籤可依 FR-011 規則正確處理並可重開，未儲存變更頁籤於全部關閉時正確回報並保留。維護者裁定已採納（重開快捷鍵 `Alt+Shift+T`，`shared-008` 之 `FR-016H` MODIFIED delta 已隨本 change propose 附上）；本群組於 G2 PR 合併後開始。

- [ ] 7.1 以 `design/prototype/tests/shared/workspace-tabs-reopen-stack.spec.ts` 建立測試：覆蓋 AC-024.1～AC-024.5 與 AC-024A.1／AC-024A.2（重開快捷鍵）。commit 並記錄預期失敗。[@senior-qa]
- [ ] 7.2 以 `design/prototype/tests/shared/workspace-tabs-close-all.spec.ts` 建立測試：覆蓋 AC-025.1～AC-025.3。commit 並記錄預期失敗。[@senior-qa]
- [ ] 7.3 以 `design/prototype/tests/shared/sidebar-shortcut-help.spec.ts`（或既有快捷鍵總覽測試檔，依實際動手時找到的檔名為準）追加案例：覆蓋 `shared-008` `FR-016H` MODIFIED 之 AC-016H.3（section 恰三列，重開列三個獨立 keycap）。commit 並記錄預期失敗。[@senior-qa]
- [ ] 7.4 執行：`PW_PORT=8982` 執行新測試並記錄完整失敗輸出；時序敏感案例（連續重開、全部關閉後焦點、快捷鍵觸發）另跑 `--workers=1 --repeat-each=5` 證據，貼進 issue #1099 檢查點留言；於 `design/prototype/tests/inventory.csv` 同一 commit 新增對應列（LF only）。[@senior-qa]

## 8. G3 重開堆疊＋全部關閉 — Green 實作

**故事目標**：SC-009、SC-010 — 上述 Red 案例轉綠，三個推入點共用同一堆疊 helper，不產生重複頁籤。

- [ ] 8.1 修改 `design/prototype/pages/shared/sidebar.js`：新增 `pushWorkspaceTabToReopenStack()` 共用 helper，接入手動關閉、全部關閉、`TAB_CAP` 淘汰三個既有路徑。[@senior-frontend]
- [ ] 8.2 修改 `design/prototype/pages/shared/sidebar.js`：新增重開（彈出堆疊並依 `FR-006` 去重判定）與全部關閉（跳過未儲存並提示、焦點規則）邏輯，接入總覽選單底部兩個操作項。[@senior-frontend]
- [ ] 8.3 修改 `design/prototype/pages/shared/sidebar.js`：新增 `Alt+Shift+T` 重開快捷鍵之按鍵位置（event code）判斷與輸入框抑制規則，呼叫既有重開處理函式。[@senior-frontend]
- [ ] 8.4 修改 `design/prototype/pages/shared/sidebar.js`：快捷鍵總覽 markup 新增重開快捷鍵列與 zh/en 字串（`shared-008` `FR-016H` MODIFIED 第三列）。[@senior-frontend]
- [ ] 8.5 執行：使 7.1–7.3 全數轉綠；確認既有 019／008 全家族（含 G1、G2 新增案例）不回歸。[@senior-frontend]
- [ ] 8.6 執行：同一 commit 內以 `node scripts/gen-screen-inventory.mjs` 重新產生 `design/system/screen-inventory.md`。[@senior-frontend]

## 9. G3 正典回寫與 archive

**故事目標**：SC-009、SC-010 — 正典規格完整反映本次全部新增與修訂條文，Source-Verify 引用可逐一定位，衍生檢視正確合併。

- [ ] 9.1 執行：更新 `specs/shared/019-workspace-tabs/spec.md`（版本 1.1.0 → 1.2.0，Changelog 新增一列記錄 G1–G3 全部內容，手寫新增「## 成功標準」對應本次四組 FR 之新驗收列，編號接續正典當下最大值，比照既有 SC-014 前例，不透過 delta 的 Requirement 宣告）。[@main]
- [ ] 9.2 執行：同 PR 回寫 `specs/shared/008-sidebar-navbar-shared/spec.md` 版本與 Changelog（`FR-016H` MODIFIED 第三列）。[@main]
- [ ] 9.3 執行：更新 `specs/STATUS.md`（`shared-019` 及視情況 `shared-008` 列附加更新，不覆蓋既有欄位歷史，狀態更新為 `done`，異動歷程新增一列）。[@main]
- [ ] 9.4 執行：`LC_ALL=C grep` Source-Verify 預掃，確認本次所有新引用（FR/AC/SC id、檔案路徑、issue/PR 編號）皆可於正典或程式碼逐一定位。[@main]
- [ ] 9.5 執行：`/opsx:archive`；`grep -rn` 確認新 FR/SC id 全倉庫無重複宣告。[@main]

## 10. G3 — 驗證、審查與 PR（最終群組，Closes #1099）

**故事目標**：SC-009、SC-010 — 全部群組之既有與新增行為皆無回歸，四個驗證閘門皆有證據，獨立審查通過。

- [ ] 10.1 執行：Gate 1–3（同第 6 階段流程，範圍擴大為全部 019／008 家族含 G1–G3 新增案例）。[@main]
- [ ] 10.2 執行：Gate 4（Source-Verify 預掃結果 ＋ `/opsx:archive` 成功證據）。[@main]
- [ ] 10.3 派未參與實作之 `senior-code-reviewer` 獨立審查，結論原文貼進檢查點留言。[@senior-code-reviewer]
- [ ] 10.4 執行：撰寫 `pr-1099-g3.md`（`Closes #1099`，base main），貼 `git diff --stat origin/main...HEAD` 與最終 SHA。[@main]

## 11. G4a 頁籤貼齊頂端／直角 — Red

**故事目標**：SC-015 延伸（視覺對齊 NoteCraft）— 頁籤上緣貼齊頁籤列與視窗頂端、直角、高度填滿頁籤列。

- [ ] 11.1 以 `design/prototype/tests/shared/workspace-tabs-flush-top.spec.ts` 建立測試：側欄展開與收合兩種狀態下，頁籤列 `getBoundingClientRect().top` 為 0、作用中頁籤 top 等於頁籤列 top、頁籤底緣等於頁籤列內容底緣（填滿高度）、`border-radius` 為 0；375px 無水平捲動；總覽選單觸發鈕仍在頁籤列右端。commit 並記錄預期失敗。[@senior-qa]
- [ ] 11.2 執行：驗證前 `git status --short` 乾淨；`PW_PORT=8982` 執行新測試並貼完整失敗輸出；於 `design/prototype/tests/inventory.csv` 同一 commit 新增對應列（LF only）。[@senior-qa]

## 12. G4a 頁籤貼齊頂端／直角 — Green

- [ ] 12.1 修改 `design/prototype/pages/shared/sidebar.css`（`.workspace-tab-bar`／`.workspace-tab`），使 11.1 轉綠，不回歸 `tests/shared/` 家族。[@senior-frontend]
- [ ] 12.2 同一 commit 以 `node scripts/gen-screen-inventory.mjs` 重新產生 `design/system/screen-inventory.md`。[@senior-frontend]

## 13. G4a — 驗證、審查與 PR

- [ ] 13.1 執行 Gate 1–3、改前／改後截圖（側欄展開、收合各一，同 viewport）、獨立審查，撰寫 `pr-1099-g4a.md`（`Part of #1099`）。[@main]

## 14. G4b 總覽選單單行 — Red

**故事目標**：SC-001 延伸 — 總覽選單每列只留圖示＋標題＋關閉鈕，篩選仍可用頁面種類名稱命中。

- [ ] 14.1 以 `design/prototype/tests/shared/workspace-tabs-overview-single-line.spec.ts` 建立測試：桌面與行動 viewport、zh-TW／en，DOM 中無 `.workspace-tab-overview-item-secondary`、每列只有標題文字；以頁面種類名稱（如「任務詳情」）篩選仍命中對應列；長標題截斷且保留完整 `title`。commit 並記錄預期失敗。[@senior-qa]
- [ ] 14.2 執行：`git status --short` 乾淨後 `PW_PORT=8982` 執行並貼完整失敗輸出；`inventory.csv` 同 commit 新增列。[@senior-qa]

## 15. G4b 總覽選單單行 — Green

- [ ] 15.1 修改 `design/prototype/pages/shared/sidebar.js` 移除第二行 DOM 產生（篩選比對邏輯不動）與 `sidebar.css` 對應規則；delta `FR-023`(2) 同步刪「次要說明」（`proposal.md` 同步）。[@senior-frontend]
- [ ] 15.2 同一 commit 重新產生 `screen-inventory.md`；既有 `workspace-tabs-overview-*` 測試若斷言第二行須逐案說明、不得默默刪除。[@senior-frontend]

## 16. G4b — 驗證、審查與 PR

- [ ] 16.1 執行 Gate 1–3、獨立審查，撰寫 `pr-1099-g4b.md`（`Part of #1099`）。[@main]
