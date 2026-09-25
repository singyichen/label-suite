# Tasks

## 1. Red 測試

**故事目標**：SC-001 — 側欄依任務角色解析 `navAnnotation`／`roleIndicator`，來源在 `sidebar.js`，消費端不再覆寫。

- [x] 1.1 以 `design/prototype/tests/shared/issue-944-sidebar-role-aware-labels.spec.ts` 建立測試：`role=reviewer` 進入 `annotation-workspace`，驗證 `#navAnnotation` 為「審核作業」且與入口麵包屑第一層一致；`role=annotator` 進入時驗證 `#navAnnotation` 維持「標記作業」。commit 並記錄執行結果為預期失敗。[@senior-qa]
- [x] 1.2 同一測試檔追加：`role=reviewer` 驗證 `[data-testid="role-indicator"]` 為「審核員」；`role=annotator` 驗證維持「一般使用者」。commit 並記錄預期失敗。[@senior-qa]
- [x] 1.3 同一測試檔追加〔來源驗證，避免測到殘留覆寫而非真正來源〕：直接呼叫 `window.LabelSuiteSharedSidebar.renderSidebar({ taskRole: 'reviewer', ... })`（或等效之 `mountSidebar` 呼叫，於未載入 `annotation-workspace.config.js` 的獨立頁面／腳本注入情境下）驗證回傳 markup 或掛載結果已直接含「審核作業」「審核員」，不依賴任何消費端覆寫腳本執行。commit 並記錄預期失敗。[@senior-qa]
- [x] 1.4 同一測試檔追加〔issue #946 XSS 契約迴歸防護〕：以惡意 `userName`（含 `<script>` 或等價標記字元）呼叫 `mountSidebar`／`updateUserChip`，驗證使用者名稱與頭像縮寫節點僅以文字呈現、不被解析為標記，確認本次變更未破壞 `renderSidebar()` 回傳不含使用者名稱與頭像縮寫之既有契約。commit 並記錄預期失敗或標註為既有綠燈基準（若本項本就通過，記錄「新增但暫時通過，待 2. 綠燈階段確認不受影響」）。[@senior-qa]
- [x] 1.5 驗證預期失敗證據前先跑 `git status --short` 確認工作樹乾淨，輸出貼進 issue #944 檢查點留言；四個案例之 Playwright 執行輸出（含失敗訊息）一併貼上。[@senior-qa]

## 2. Green 實作

**故事目標**：SC-001 — 解析邏輯收斂至 `sidebar.js`，移除兩處消費端覆寫，不破壞既有正向行為與 #946 契約。

- [x] 2.1 修改 `design/prototype/pages/shared/sidebar.js`：renderSidebar() 新增 opts.taskRole 讀取與一個僅含本條所需雙語詞彙（審核員／Reviewer、專案負責人／Project leader、審核作業／Review）之內部對照表（比照既有 adminSubmenuI18n 前例，依 readStoredLang() 解析語言）；navItems 之 annotation 項目 defaultLabel 與 roleIndicator 預設值依 FR-020／FR-020A 規則解析，opts.roleIndicator 顯式覆寫優先序不變。使 1.1／1.2／1.3 測試轉綠。[@senior-frontend]
- [x] 2.2 修改 `design/prototype/pages/annotation/annotation-workspace.html`：`mountSidebar()` 呼叫新增 `taskRole`，自 `window.location.search` 之 `role` 參數同步解析（正規化規則與 `annotation-workspace.config.js` 之 `boot()` 一致：`reviewer`／`project_leader`／其餘一律 `annotator`）。[@senior-frontend]
- [x] 2.3 修改 `design/prototype/pages/annotation/annotation-workspace.config.js`：移除 `applyStaticI18nText()` 內 issue #309（`roleIndicatorEl.textContent = t('wsHistoryRoleReviewer')` 及 `project_leader` 分支）與 issue #931（`navAnnotationEl.textContent = t('crumbWorkAreaReviewer')`）兩處消費端覆寫區塊；移除因此產生之未使用區域變數。確認 1.4 之 #946 契約測試仍綠燈。[@senior-frontend]
- [x] 2.4 位移既有測試（不得刪除既有正向斷言）：`design/prototype/tests/annotation/issue-309-reviewer-workspace-vocab.spec.ts` 之 `role-indicator` 斷言、`design/prototype/tests/annotation/issue-931-sidebar-reviewer-label.spec.ts` 之 `#navAnnotation` 斷言所驗證之行為不變，僅需要時更新測試檔內註解使其描述新來源（`sidebar.js` 原生解析）而非消費端覆寫；確認兩檔既有斷言原樣全數轉綠，不刪除任何既有 case。[@senior-frontend]

## 3. 驗證與正典回寫

**故事目標**：SC-001 — 確認新增解析與既有 L0 導覽、語言切換、#946 XSS 契約、specs/annotation/015-annotation-workspace/spec.md 的 FR-080 麵包屑皆未回歸。

- [x] 3.1 執行閘門：`cd design/prototype && pnpm typecheck`；`cd design/prototype && PW_PORT=8996 pnpm playwright test issue-944-sidebar-role-aware-labels.spec.ts issue-309-reviewer-workspace-vocab.spec.ts issue-931-sidebar-reviewer-label.spec.ts issue-946-sidebar-escape-username.spec.ts --workers=1`；`bash scripts/check-sdd.sh`；`bash scripts/check-spec-artifacts.sh`；`npx -p @fission-ai/openspec openspec validate --changes --no-interactive`。全部通過方可繼續，主責（main）親自重跑並獨立覆核，不採信代理自報。[@main]
- [x] 3.2 若本次變更觸及 `design/prototype/pages/**`，於最後一次來源編輯後重新產生 screen-inventory 一次。[@main]
- [x] 3.3 Source-Verify：確認 FR-020、FR-020A、specs/annotation/015-annotation-workspace/spec.md 的 FR-080 引用皆可於正典逐一 grep 定位；`openspec archive` 回寫正典（版本 1.5.1 → 1.6.0，補 Changelog 條目）並同步更新 `openspec/specs/` derived view。[@main]

## 4. 獨立審查與 PR

**故事目標**：SC-001 — 合併前須經未參與實作者複核，確保兩處覆寫真正移除、解析邏輯在來源而非又一層包裝、#946 契約完好。

- [x] 4.1 派未寫過本改動的 senior-code-reviewer 獨立審查：#309、#931 兩處覆寫是否真的移除（有無殘留）、角色解析是否寫在 `sidebar.js` 來源而非又一層包裝、#946 之 XSS 契約是否完好、既有測試是否為位移改寫而非刪除、新增 FR-020／FR-020A 與 specs/annotation/015-annotation-workspace/spec.md 的 FR-080 是否一致、Source-Verify 引用可否逐條 grep 定位。結論原文貼進 issue #944 檢查點留言。[@senior-code-reviewer]
- [x] 4.2 開 PR（base main，Closes #944，逐項 Test Plan 證據，紅燈／綠燈證據皆貼），push 前 `git fetch origin main && git rebase origin/main`。PR #979。[@main]
