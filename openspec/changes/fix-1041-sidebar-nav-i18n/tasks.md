# Tasks

> Stacked PR groups（`docs/sdd-workflow.md` §intermediate／final PR group）。第 1 組修復兩處真實使用者可見缺陷；第 2–4 組移除已成死碼的消費頁冗餘覆寫，純屬 FR-020 合規與 DRY。Issue #1041 於第 1 組 PR 使用 `Refs #1041`（不 `Closes`），保持 open 至第 4 組（final）完成 archive／回寫並 `Closes #1041`。

## 1. 第一組（PR group 1）— 核心語言感知解析（生產檔 2 個）

**故事目標**：SC-014（AC-021.1、AC-021.2、AC-021.3、AC-021.4） — 修復 `annotation-list.html` 之 `annotator` 角色英文缺失，與 `annotation-workspace.html` deep-link 情境下五中一英混雜；六個 L0 標籤全面語言感知並隨語言切換重新解析。

- [x] 1.1 建立 `design/prototype/tests/shared/issue-1041-sidebar-nav-i18n.spec.ts`：涵蓋 AC-021.1（annotation-list.html，`role=annotator`／無 `role`，`lang=en`，`#navAnnotation` 應為 `Annotation`）、AC-021.2（`annotation-workspace.html`，`localStorage.labelsuite.lang='en'` 透過 `addInitScript` 於 `page.goto` 前預設、無任何頁面語言切換操作，六個標籤全部斷言為對應英文值）、AC-021.3（任一頁面掛載後點擊語言切換，六個標籤斷言隨即更新，無需重新整理）、AC-021.4（三個 `taskRole` × 兩種語言 `#navAnnotation` 六種組合）。全部斷言使用 `expect(...).toHaveText(...)`；若需讀 computed 值，比照 `tests/task-management/issue-1019-page-btn-active-on-cta-contrast.spec.ts` 修正後的原子化寫法（單一 `page.evaluate()` 內完成，中間無 `await`），不得先 `toBeVisible()` 再 `.textContent()`/`.evaluate()`（issue #1040 detached-element 競態）。commit 並記錄執行結果為預期失敗。[@senior-qa]
- [x] 1.2 驗證預期失敗證據前先跑 `git status --short` 確認工作樹乾淨；四類案例（AC-021.1–1.4）之 Playwright 執行輸出（含失敗訊息）貼進 issue #1041 檢查點留言。[@senior-qa]
- [x] 1.3 修改 `design/prototype/pages/shared/sidebar.js`：新增六個 L0 標籤之語言感知對照表（五個既有硬編碼中文標籤 + 既有 `taskRoleI18n` 之 `annotator`/else 分支新增英文 `Annotation`），`navItems` 之 `defaultLabel` 改由此對照表解析；`mountSidebar()` 持久化最近一次傳入之 `opts.taskRole`（模組層變數）；`applyGlobalLanguage()` 新增六個節點之重新解析與更新（比照既有 `updateShortcutHelpLanguage()`／`updateAdminSubmenuLanguage()` 前例，新增函式並於 `applyGlobalLanguage()` 內呼叫）。僅新增所需的最小程式碼，不重構 `taskRoleI18n`／`navItems`／`applyGlobalLanguage()` 其餘既有結構與鄰近程式碼。[@senior-frontend]
- [x] 1.4 修改 `design/prototype/pages/annotation/annotation-list.html`：移除 `applyNavLabels()` 對 `navDashboard`／`navTaskManagement`／`navDataset`／`navAdmin`／`navProfile` 五個節點的覆寫（呼叫端與函式本身，若移除後 `applyNavLabels()` 整個函式無其他用途則一併移除呼叫點），與隨之孤兒化之 `I18N.zh`／`I18N.en` 對應五個 key（比照 #1023 手法）。[@senior-frontend]
- [x] 1.5 使 1.1 全部案例轉綠。[@senior-frontend]
- [x] 1.6 改寫 `design/prototype/tests/shared/language-switch-consistency.spec.ts:77`「keeps admin sidebar navigation labels translatable in both admin pages」：admin 兩頁之覆寫移除為第二組範圍，本組尚未移除，故本測試不得再要求（也不得禁止）任何頁面自行定義/更新這六個 key——移除舊斷言（強制 admin 兩頁必須自行定義並更新六個 nav key，即強制 FR-020 違規），改為載入 admin 兩頁並斷言語言切換後六個 `#navXxx` 節點之**渲染 DOM 文字**與 FR-021 對照表逐字一致（呼應 AC-014.1：不論頁面覆寫是否已移除，渲染結果皆須正確），測試名稱同步更新以反映斷言渲染行為而非原始碼存在與否。[@senior-frontend]
- [x] 1.7 更新 `design/prototype/tests/shared/issue-1023-list-sidebar-taskrole.spec.ts`：將「DELIBERATELY ACCEPTED REGRESSION」案例（`annotator: #navAnnotation regresses to untranslated 標記作業...`）之斷言由 `'標記作業'` 改為 `'Annotation'`，測試名稱與檔頭／行內註解同步移除「等待 #1041」之刻意接受迴歸說明，改記錄為已由本 issue 修正、迴歸已消失。[@senior-frontend]
- [x] 1.8 執行閘門（本組要求跑完整套件，因改動全站共用語言路徑）：`cd design/prototype && pnpm typecheck`；`cd design/prototype && PW_PORT=8981 pnpm playwright test`（完整套件）；`scripts/check-sdd.sh`；`openspec validate --changes --no-interactive`；`node scripts/gen-screen-inventory.mjs`。全部通過方可繼續，由 lead 親自重跑並獨立覆核，不採信代理自報。[@main]
- [x] 1.9 派全新 `senior-code-reviewer` 獨立審查：(1) 解析是否確實全在元件內部、無任何消費頁面殘留 DOM 覆寫；(2) 六個標籤 × 兩語言 × 三角色組合是否都正確；(3) 英文字串是否沿用既有而非自創；(4) 兩支測試改寫是否真的斷言新行為而非只是改名；(5) #1023 迴歸是否確實消失且其測試註解已同步；(6) 是否推翻了任何既有 FR/AC（若有回報，MAJOR）。結論貼進 issue #1041 檢查點留言。[@senior-code-reviewer]
- [x] 1.10 派 `senior-security` 安全審查（每個 PR 群組必做）：確認新增之語言對照表與 DOM textContent 更新無 XSS 風險（沿用既有 `setTextById`／`textContent` 寫入路徑，不引入 `innerHTML`）。結論貼進 issue #1041 檢查點留言。[@senior-security]
- [ ] 1.11 開 PR 前回報主 session 讀 diff；`--base main`，`Refs #1041`（不 `Closes`，因非 final PR group），逐項 Test Plan 證據。PR 由主 session 掛 CI watch 並合併。[@main]

## 2. 第二組（PR group 2）— 移除 admin／dashboard 冗餘覆寫（生產檔 4 個）

**故事目標**：SC-014（AC-014.1） — 移除 `admin/user-management.html`、`admin/role-settings.html`、`dashboard/dashboard.js`、`dashboard/dashboard.i18n.js` 四頁已成死碼之六個 nav key 覆寫與孤兒 i18n key。

- [ ] 2.1 移除 `admin/user-management.html` 之 `applyLang` 對六個 nav key 的覆寫與 i18n 表對應 key。[@senior-frontend]
- [ ] 2.2 移除 `admin/role-settings.html` 之 `applyLang` 對六個 nav key 的覆寫與 i18n 表對應 key。[@senior-frontend]
- [ ] 2.3 移除 `dashboard/dashboard.js` 之對應覆寫，與其讀取之 `dashboard.i18n.js` 六個孤兒 key。[@senior-frontend]
- [ ] 2.4 依 1.8–1.10 同等驗證與審查流程（本組僅需跑受影響模組，非完整套件）。[@main]
- [ ] 2.5 開 PR，base 為 PR group 1 之分支（stacked），`Refs #1041`。[@main]

## 3. 第三組（PR group 3）— 移除 dataset／account 冗餘覆寫（生產檔 4 個）

**故事目標**：SC-014（AC-014.1） — 移除 `dataset/dataset-analysis-detail.html`、`dataset/dataset-analysis-list.js`、`dataset-analysis-list.i18n.js`、`account/profile.html` 四頁已成死碼之覆寫與孤兒 i18n key。

- [ ] 3.1 移除 `dataset/dataset-analysis-detail.html` 之覆寫與孤兒 key。[@senior-frontend]
- [ ] 3.2 移除 `dataset/dataset-analysis-list.js` 之對應覆寫，與其讀取之 `dataset-analysis-list.i18n.js` 六個孤兒 key。[@senior-frontend]
- [ ] 3.3 移除 `account/profile.html` 之覆寫與孤兒 key。[@senior-frontend]
- [ ] 3.4 驗證與審查（比照第二組，受影響模組範圍）。[@main]
- [ ] 3.5 開 PR，base 為 PR group 2 之分支，`Refs #1041`。[@main]

## 4. 第四組（PR group 4，final）— 移除 task-management 冗餘覆寫 + archive／回寫（生產檔 3 個）

**故事目標**：SC-014（AC-014.1） — 移除 `task-management/task-detail.html`／`task-list.html`／`task-new.html` 三頁已成死碼之覆寫與孤兒 i18n key；完成 Source-Verify 預掃與 `/opsx:archive` 雙寫，`Closes #1041`。

- [ ] 4.1 移除 `task-management/task-detail.html` 之覆寫與孤兒 key。[@senior-frontend]
- [ ] 4.2 移除 `task-management/task-list.html` 之覆寫與孤兒 key。[@senior-frontend]
- [ ] 4.3 移除 `task-management/task-new.html` 之覆寫與孤兒 key。[@senior-frontend]
- [ ] 4.4 驗證與審查（比照第二組，受影響模組範圍）。[@main]
- [ ] 4.5 Source-Verify 預掃：確認 FR-021、SC-014、AC-021.1–1.4、AC-014.1 之引用皆可於正典或程式碼逐一 `grep` 定位。[@main]
- [ ] 4.6 `openspec archive`：雙寫——合併進 openspec/specs/ derived view，並回寫正典 `spec.md` 新增 FR-021、SC-014；版本號 MINOR bump，欄位先留佔位符 `TBD`，由主 session 於合併時依實際順序指派；Changelog 新增一列，記錄本 issue 前提更正之三點與四組 PR 拆分歷程。[@main]
- [ ] 4.7 開 PR，base 為 PR group 3 之分支，`Closes #1041`。合併後更新 `specs/STATUS.md` 為 `archived` 並 `mv specs/shared/008-sidebar-navbar-shared specs/_archive/`。[@main]
