# Tasks

## 1. Red 測試

**故事目標**：SC-013A — `project_leader` 任務角色下 `#navAnnotation` 讀作「例外處置」，與同頁麵包屑首層一致；`reviewer`／`annotator` 既有行為逐字不變。

- [ ] 1.1 建立 `design/prototype/tests/shared/issue-1018-sidebar-pl-exception-label.spec.ts`：以 `role=project_leader` 進入 `annotation-workspace`（`task_id=T016`、`sample_id=ofm-05-final-exception`、`run_type=official_run`、`annotator_id=kioleemg12`）驗證 `#navAnnotation` 文字為「例外處置」（en: `Exception Disposition`，經 `lang-toggle` 切換後驗證），且與同頁入口麵包屑第一層連結文字一致；URL 建構與斷言手法比照既有 issue-994 麵包屑測試之作法。同檔案追加 `reviewer`（讀作「審核作業」/`Review`）與 `annotator`（維持「標記作業」/`Annotate`）兩個回歸守門，逐字比照同一份既有測試之 regression guard 寫法，確保本次修訂不動到這兩個既有分支。commit 並記錄執行結果為預期失敗。[@senior-qa]
- [ ] 1.2 驗證預期失敗證據前先跑 `git status --short` 確認工作樹乾淨；四個案例（project_leader zh/en、reviewer 回歸、annotator 回歸）之 Playwright 執行輸出（含失敗訊息）一併貼進 issue #1018 檢查點留言。[@senior-qa]

## 2. Green 實作

**故事目標**：SC-013A — 解析邏輯收斂於 `sidebar.js` 元件內部，最小改動延伸既有 `taskRoleI18n`／`navItems` 結構，不引入消費端覆寫，不重構鄰近程式碼。

- [ ] 2.1 修改 `design/prototype/pages/shared/sidebar.js`：`taskRoleI18n` 兩個語言物件（zh/en）各新增一鍵（值同既有 `crumbWorkAreaProjectLeader` 常數：zh「例外處置」/en `Exception Disposition`）；`navItems` 之 `annotation` 項目 `defaultLabel` 解析（現行 `taskRole === 'reviewer' ? taskRoleLabels.annotationLabel : '標記作業'`）新增 `project_leader` 分支，改為依 `taskRole` 三分流（`reviewer` → 既有審核作業、`project_leader` → 新增例外處置、其餘 → 既有標記作業）。僅新增所需的最小程式碼，不重構 `taskRoleI18n`／`navItems` 其餘既有結構與鄰近程式碼。使 1.1 全部四個案例轉綠。[@senior-frontend]

## 3. 驗證與正典回寫

**故事目標**：SC-013A — 確認新增分支未影響 `reviewer`／`annotator` 既有輸出、其他 10 個未傳 `taskRole` 之消費頁面、既有 `sidebar.js` 相關測試（#309／#931／#944／#946）與 annotation 模組既有測試皆未回歸。

- [ ] 3.1 執行閘門：`cd design/prototype && pnpm typecheck`；`cd design/prototype && PW_PORT=8981 pnpm playwright test tests/annotation/ tests/shared/ issue-1018-sidebar-pl-exception-label.spec.ts`；`scripts/check-sdd.sh`；`openspec validate --changes --no-interactive`；若 `design/prototype/pages/**` 有變動則 `node scripts/gen-screen-inventory.mjs`。全部通過方可繼續，由 lead 親自重跑並獨立覆核，不採信代理自報。[@main]
- [ ] 3.2 Source-Verify 預掃：確認 FR-020、SC-013A、annotation-015 之 `crumbWorkAreaProjectLeader`／FR-080 引用、issue #994／#944／#931／#1018 之引用皆可於正典或程式碼逐一 `grep` 定位。[@main]
- [ ] 3.3 `openspec archive`：雙寫——合併進 `openspec/specs/` derived view，並回寫正典 spec.md 之 FR-020（MODIFIED）；版本號 MAJOR bump，欄位先留佔位符，由主 session 於合併時依實際順序指派；Changelog 新增一列。[@main]
- [ ] 3.4 回寫正典時同步修訂 SC-013A（不在 delta schema 內，純手動回寫——SC-013／SC-013A 從未是本 spec 於 OpenSpec 模型裡的 Requirement，issue #944 當時的 delta 亦從未提及，比照該先例做法）：`project_leader` 自「維持既有預設『標記作業』」移出，改為對應 FR-020 新分支之「例外處置」；`annotator` 兩項與 `role-indicator` 部分逐字不動。新文字須逐字取自 `proposal.md` 之 `MODIFIED SC-013A` 一節。[@main]

## 4. 獨立審查與 PR

**故事目標**：SC-013A — 合併前須經未參與實作者複核，確保 FR-020 之 MODIFIED 範圍精準（僅動 `project_leader` 分支）、SC-013A 同步、解析在元件內部完成、11 個消費頁面無回歸。

- [ ] 4.1 派未寫過本改動的 `senior-code-reviewer` 獨立審查：(1) FR-020 之 MODIFIED 是否確實只改 `project_leader` 分支、`reviewer`／`annotator` 判定逐字未動；(2) SC-013A 是否同步；(3) 是否真的在元件內部解析、沒有引入任何消費端覆寫；(4) 11 個消費頁面有無回歸；(5) 是否推翻了 #944／#931／#309 的其他既有條文。結論原文貼進 issue #1018 檢查點留言。[@senior-code-reviewer]
- [ ] 4.2 開 PR（base main，Closes #1018，逐項 Test Plan 證據，紅燈／綠燈證據皆貼），push 前 `git fetch origin main && git rebase origin/main`。[@main]
