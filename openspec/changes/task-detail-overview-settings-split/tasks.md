# 任務清單：task-detail-overview-settings-split

> 本 change 追蹤 issue #1199，一個 OpenSpec change、依序四組 PR（維護者 2026-10-08 裁定 4）：G1 標頭與分頁列 → G2 設定分頁搬移 → G3 概覽重排 → G4 Code 套用按鈕與回寫。**只有 G4 執行 Source-Verify 與 `/opsx:archive`**；G1～G3 為 intermediate PR，完成 Red／Green、任務驗證與群組審查後合併，OpenSpec change 維持開啟。四組都改動共用熱點檔 `task-detail.html`，必須嚴格依序，後一組先 `git merge origin/main` 再動工。每組產品檔案預期 ≤ 3 個、≤ 300 行（測試、`specs/**`、`openspec/**`、產生檔不計入）。只有主 session 依證據更新勾選。

## 1. G1 任務標頭與分頁列

**故事目標**：SC-019 — 標頭狀態文字成為唯一的階段文字標示，六個分頁共用同一標頭且標頭無 CTA（FR-028）；分頁列為六個分頁、順序與名稱正確（FR-003）。

> 預期產品檔案：`task-detail.html`（標頭、分頁列、路由）、`task-detail.panels/settings.html`（空殼）。

- [x] 1.1 以 `design/prototype/tests/task-management/task-detail-header-tabs.spec.ts` 建立 Red 測試：標頭顯示麵包屑、任務名稱 H1 與文字狀態且六個分頁皆可見、標頭內無按鈕；分頁列順序為 概覽／設定／成員管理／標記進度／標記結果／工時紀錄且不再有「任務概覽」；`reviewer` 可見「設定」、不可見「成員管理」；方向鍵移動分頁。commit 並記錄預期失敗輸出。[@senior-qa]
- [x] 1.2 於 `design/prototype/tests/inventory.csv` 以同一 commit 新增 1.1 對應列（LF only），並以 npx playwright test --list task-detail-header-tabs.spec.ts 核對案例數與新增列數一致。[@senior-qa]
- [x] 1.3 建立 `design/prototype/pages/task-management/task-detail.panels/settings.html` 空殼，讓設定分頁可被選取。[@senior-frontend]
- [x] 1.4 修改 `design/prototype/pages/task-management/task-detail.html`：新增任務標頭（麵包屑、H1、文字狀態，狀態推導與概覽判定共用）、分頁列改為六個與新名稱順序、方向鍵支援，使 1.1 的案例轉為 Green 並維持既有分頁測試家族不回歸。[@senior-frontend]
- [x] 1.5 執行：同一 commit 內以 `node scripts/gen-screen-inventory.mjs` 重新產生 `design/system/screen-inventory.md`（若有內容異動）。[@senior-frontend]
- [x] 1.6 執行：`npx -p @fission-ai/openspec openspec validate --changes --no-interactive`、`bash scripts/check-sdd.sh`，以及於 `design/prototype/` 內 `pnpm typecheck`、`pnpm test:node`、`PW_PORT=8983 pnpm playwright test`（全量，含既有 task-detail 家族）；預期全數 exit 0。[@main]
- [x] 1.7 派未參與實作之 `senior-code-reviewer` 獨立審查 `git diff origin/main...HEAD`，對照 FR-003、FR-025（後改名 FR-028）與 issue #1199 的 A、B 兩節逐項核對，結論原文貼進檢查點留言；PR 以 `Part of #1199` 開啟。[@senior-code-reviewer]

## 2. G2 設定分頁搬移

**故事目標**：SC-044 — 設定分頁五個區塊可切換、`section` 參數可還原與分享、未儲存切換需確認、reviewer 唯讀，且基本資料、標記說明、審核設定的欄位與編輯行為與現況一致（FR-026、FR-019）。

> 預期產品檔案：`task-detail.panels/settings.html`（接收五個區塊）、`task-detail.panels/overview.html`（移出五個區塊）、`task-detail.html`（導覽、`section` 同步、未儲存確認）。

- [x] 2.1 以 `design/prototype/tests/task-management/task-detail-settings-tab.spec.ts` 建立 Red 測試：五個區塊導覽可切換且一次顯示一個；`tab=settings&section=sampling` 重新整理後還原；無效 `section` 回退為 `basic`；離開設定分頁時移除 `section`；有未儲存變更切換區塊需確認且取消後網址不變；`reviewer` 各區塊無「編輯」連結；375px 導覽為水平捲動列且無水平溢出；搬移後既有 element id 仍存在。commit 並記錄預期失敗輸出。[@senior-qa]
- [x] 2.2 於 `design/prototype/tests/inventory.csv` 以同一 commit 新增 2.1 對應列（LF only），並核對 npx playwright test --list task-detail-settings-tab.spec.ts 的案例數。[@senior-qa]
- [x] 2.3 修改 `design/prototype/pages/task-management/task-detail.panels/overview.html`：移出前五個設定 panel（保留所有 element id 與行為，內容原樣搬至設定分頁）。[@senior-frontend]
- [x] 2.4 修改 `design/prototype/pages/task-management/task-detail.panels/settings.html`：承接五個區塊，加入左側導覽、標題列與定義清單版面、`reviewer` 唯讀不渲染「編輯」連結、< 768px 水平捲動導覽。[@senior-frontend]
- [x] 2.5 修改 `design/prototype/pages/task-management/task-detail.html`：`settings` 頁籤值與 `section` 同步（寫回、還原、無效值回退、離開時移除）、未儲存確認接 modal-focus 既有行為，使 2.1 的案例轉為 Green。[@senior-frontend]
- [x] 2.6 更新既有 `design/prototype/tests/task-management/task-detail-settings-edit.spec.ts` 等因區塊搬家而失效的導覽步驟（先切到設定分頁與對應區塊），不弱化斷言，並於 commit message 說明對應關係。[@senior-qa]
- [x] 2.7 執行：同一 commit 內以 `node scripts/gen-screen-inventory.mjs` 重新產生 `design/system/screen-inventory.md`（若有內容異動）。[@senior-frontend]
- [x] 2.8 執行：Gate 1／Gate 2（`openspec validate --changes --no-interactive`、`bash scripts/check-sdd.sh`）與 Gate 3（`pnpm typecheck`、`pnpm test:node`、`PW_PORT=8983 pnpm playwright test` 全量，時序敏感案例加 `--workers=1 --repeat-each=5`）；預期全數 exit 0。[@main]
- [x] 2.9 派未參與實作之 `senior-code-reviewer` 獨立審查，對照 FR-026 (1)(2)(5)(6)、FR-019 與 issue #1199 的 D、F 兩節逐項核對，結論原文貼進檢查點留言；PR 以 `Part of #1199` 開啟。[@senior-code-reviewer]
- [x] 2.10 以 `design/prototype/tests/task-management/task-detail-settings-visual.spec.ts` 建立 Red 測試（2026-10-08 維護者裁定方案 B）：設定區塊於檢視狀態呈白色卡片（背景 `--color-white`、1px `--color-border` 外框、`--radius-lg` 圓角、無陰影）且與編輯狀態外觀一致；導覽項目文字 14px、水平置中；active 導覽項目底色為 `--color-white`；深色模式同樣取 token 值。commit 並記錄預期失敗輸出。[@senior-qa]
- [x] 2.11 於 `design/prototype/tests/inventory.csv` 以同一 commit 新增 2.10 對應列（LF only），並核對 npx playwright test --list task-detail-settings-visual.spec.ts 的案例數。[@senior-qa]
- [x] 2.12 修改 `design/prototype/pages/task-management/task-detail.html` 設定分頁 CSS：區塊改用既有 panel 白色卡片外觀、導覽 14px 置中、active 底色 `--color-white`，使 2.10 的案例轉為 Green；完成後重跑 2.8 全部閘門。[@senior-frontend]
- [x] 2.13 執行：同一 commit 內以 `node scripts/gen-screen-inventory.mjs` 重新產生 `design/system/screen-inventory.md`（若有內容異動）。[@senior-frontend]

## 3. G3 概覽重排

**故事目標**：SC-019 — 概覽分頁沿用原區塊樣式，達標條件列右側為唯一 `btn-primary`（`--color-cta`）CTA、四張數字卡不含「已完成試標回合」、七欄試標回合表，且抽樣設定檢視不再重複概覽資訊（FR-027、FR-026 (4)）。

> 預期產品檔案：`task-detail.panels/overview.html`（判定框、數字卡、樣本分配、達標條件與 CTA、回合表，沿用原樣式）、`task-detail.html`（render 與 i18n 鍵）。

- [x] 3.1 以 `design/prototype/tests/task-management/task-detail-overview-layout.spec.ts` 建立 Red 測試：1440×900 首屏可見判定列與 CTA 且 CTA 背景為 `--color-primary`；數字列僅四欄、無「已完成試標回合」；試標回合表七欄、結果欄文字色；`draft` 無回合列；抽樣設定檢視無「試標回合」「目前判定」「已用試標 / 可進正式」三列；`reviewer` 的執行按鈕 disabled 並附 tooltip；深色模式 CTA 與文字對比可讀。commit 並記錄預期失敗輸出。[@senior-qa]
- [x] 3.2 於 `design/prototype/tests/inventory.csv` 以同一 commit 新增 3.1 對應列（LF only），並核對 npx playwright test --list task-detail-overview-layout.spec.ts 的案例數。[@senior-qa]
- [x] 3.3 修改 `design/prototype/pages/task-management/task-detail.panels/overview.html`：重排為判定列、四欄數字列、樣本分配、試標回合表與去裝飾 stepper，移除彩色框與 pill。[@senior-frontend]
- [x] 3.4 修改 `design/prototype/pages/task-management/task-detail.html`：回合表渲染、移除抽樣設定檢視的三列、補 i18n 鍵與 `btn-primary` CTA 接線，使 3.1 的案例轉為 Green 並保持 FR-010p 配色與 issue #198 防連點行為不回歸。[@senior-frontend]
- [x] 3.4a 依 2026-10-08 外觀還原裁定，改寫 `task-detail-overview-layout.spec.ts` 中與新版視覺綁定的斷言（CTA 改斷言 `--color-cta` 且與達標條件同列、移除首屏與 1px／無 pill 斷言），並 commit 其預期失敗。[@senior-qa]
- [x] 3.4b 將 `task-detail.panels/overview.html` 的版面與其所用樣式還原為原區塊樣式（白卡片、圓點 stepper、判定框、數字卡、圖例 chip、達標條件 pill＋右側 CTA），維持 FR-027 內容，使 3.4a 轉綠。[@senior-frontend]
- [x] 3.5 更新既有 `design/prototype/tests/task-management/task-detail-stage-flow.spec.ts` 等因版面重排而失效的斷言，不弱化斷言，並於 commit message 說明取代關係。[@senior-qa]
- [x] 3.6 執行：同一 commit 內以 `node scripts/gen-screen-inventory.mjs` 重新產生 `design/system/screen-inventory.md`（若有內容異動）。[@senior-frontend]
- [x] 3.7 執行：Gate 1／Gate 2 與 Gate 3 同 2.8 之命令；預期全數 exit 0。[@main]
- [x] 3.8 派未參與實作之 `senior-code-reviewer` 獨立審查，對照 FR-027、SC-019 與 issue #1199 的 C、E 兩節（含 2026-10-08 外觀還原裁定）逐項核對（沿用原區塊樣式、單一主要 CTA、只用 token），結論原文貼進檢查點留言；PR 以 `Part of #1199` 開啟。[@senior-code-reviewer]

## 4. G4 Code 套用按鈕、Source-Verify 與回寫

**故事目標**：SC-019 — Code 模式以「套用」只做 Code→Visual、唯一送出為區塊標題列「儲存」（FR-026 (3)），並於最終 PR 完成 Source-Verify、archive 與正典回寫。

> 預期產品檔案：`task-detail.panels/settings.html`（Code 按鈕）、`task-detail.html`（套用與錯誤停用邏輯）；回寫另含 `design/system/pages/task-detail.md`、`specs/**`、`openspec/**`。**只有本組執行 archive。**

- [ ] 4.1 以 `design/prototype/tests/task-management/task-detail-code-apply.spec.ts` 建立 Red 測試：Code 面板按鈕標籤為「套用」且面板內無另一個儲存按鈕；套用只更新 Visual 而不寫入任務設定；只有標題列「儲存」才送出；解析錯誤時 `codeErrorBar` 顯示、「套用」停用且 Visual 保留最後有效設定；檢視標籤為「設定檔」而非「設定檔版本」。commit 並記錄預期失敗輸出。[@senior-qa]
- [ ] 4.2 於 `design/prototype/tests/inventory.csv` 以同一 commit 新增 4.1 對應列（LF only），並核對 npx playwright test --list task-detail-code-apply.spec.ts 的案例數。[@senior-qa]
- [ ] 4.3 修改 `design/prototype/pages/task-management/task-detail.panels/settings.html`：`saveCodeBtn` 的標籤改為「套用」、標籤「設定檔版本」改為「設定檔」。[@senior-frontend]
- [ ] 4.4 修改 `design/prototype/pages/task-management/task-detail.html`：套用僅執行 Code→Visual 回填（驗證規則對齊 013 的 Code 回填）、解析錯誤時停用套用並保留最後有效設定、移除 Code 面板的送出路徑，使 4.1 的案例轉為 Green。[@senior-frontend]
- [ ] 4.5 更新 `design/system/pages/task-detail.md`：標頭、設定分頁導覽、概覽版面、Code 套用按鈕與 `btn-primary` CTA 的頁面專屬規格。[@senior-visual-designer]
- [ ] 4.6 執行：同一 commit 內以 `node scripts/gen-screen-inventory.mjs` 重新產生 `design/system/screen-inventory.md`（若有內容異動）。[@senior-frontend]
- [ ] 4.7 執行：Source-Verify 預掃，對本 change 的 FR-003、FR-006、FR-019、FR-028、FR-026、FR-027、SC-019、FR-010p、FR-013 逐一以 `rg -n -F` 確認可在正典或 delta 定位，並確認 `specs/task-management/014-task-detail/spec.md` 的第 194 行與第 398 行仍是要改的原文；預期每個 ID 皆命中。[@main]
- [ ] 4.8 回寫 正典 014 spec.md：版本依 `origin/main` 實際版本重算（預期 11.0.0 → 12.0.0 MAJOR）、新增 Changelog 列、原地改寫 FR-003 與 SC-019、新增 FR-028／FR-026／FR-027、修訂 FR-019（15 個改 16 個）與 FR-006、新驗收情境依序續編 AC 編號，並同步標題「5 Tabs」、介面定義 Tab A 節、第 194 行「設定檔版本」、第 398 行抽樣設定重複資訊。[@senior-sa]
- [ ] 4.9 更新 `specs/STATUS.md` 的 014 版本與 change 狀態列。[@main]
- [ ] 4.10 執行：`openspec archive task-detail-overview-settings-split --yes`（需使用者明說授權），預期 archive 成功並在衍生檢視產生 FR-003、FR-028、FR-026、FR-027、SC-019 與修訂後的 FR-019、FR-006；再逐一以 `rg -n -F` 確認衍生檢視與正典中本 change 引用的每個 ID、章節與檔案路徑皆可定位。Exception: governance-propagation; Files: `openspec/changes/task-detail-overview-settings-split/proposal.md`, `openspec/changes/task-detail-overview-settings-split/design.md`, `openspec/changes/task-detail-overview-settings-split/tasks.md`, `openspec/changes/task-detail-overview-settings-split/specs/task-management/014-task-detail/spec.md`, `openspec/specs/task-management/014-task-detail/spec.md`; Reason: OpenSpec archive 必須原子搬移 change 四件套並回寫衍生檢視，無法以單檔任務完成。 [@main]
- [ ] 4.11 執行：全部驗證命令（`bash scripts/check-sdd.sh`、`scripts/speckit-tests.sh`、`scripts/check-spec-artifacts.sh`、`scripts/check-demo-data-parity.sh`、`node scripts/check-user-path-map-freshness.mjs`、`scripts/inventory-tests.sh`、`scripts/pre-commit-tests.sh`、`scripts/pre-tool-use-tests.sh`、`node scripts/gen-screen-inventory.mjs --check`，以及 `design/prototype/` 的 `pnpm typecheck`、`pnpm test:node`、`PW_PORT=8983 pnpm playwright test` 全量）；預期全數 exit 0。[@main]
- [ ] 4.12 派未參與實作之 `senior-code-reviewer` 獨立審查最終 PR，對照 FR-026 (3) 與 issue #1199 全部驗收條件逐項核對，結論原文貼進檢查點留言；PR 以 `Closes #1199` 開啟。並在合併後重新判定 #1125、#1127、#1128、#1129、#1130，更新 #1126 的 stepper 無障礙修法。[@senior-code-reviewer]

最終 PR 合併後，主 session 依專案流程更新 `specs/STATUS.md` 為 archived，並將正典移至 `specs/_archive/`（若流程要求）；014 是現行正典，是否移動以 STATUS 流程為準。
