# Tasks

## 1. Red 測試

**故事目標**：SC-006 — Reviewer 主要審核流程須端到端可完成，決策與送出皆為關鍵操作。

- [ ] 1.1 新增 `design/prototype/tests/annotation/issue-926-review-decision-prominence.spec.ts` 建立測試：量測決策按鈕高度與群組面積不小於同卡答案值 chip 面積。commit 並記錄執行結果為預期失敗。[@senior-qa]
- [ ] 1.2 新增 `design/prototype/tests/annotation/issue-927-decision-answer-separation.spec.ts` 建立測試：斷言答案 Bypass 列與決策按鈕分屬不同容器。commit 並記錄執行結果為預期失敗。[@senior-qa]
- [ ] 1.3 新增 `design/prototype/tests/annotation/issue-928-submit-near-decision.spec.ts` 建立測試：決策全數完成後決策列附近須出現可點擊送出控制，且與決策列距離顯著縮短；決策未完成時該控制不存在。commit 並記錄執行結果為預期失敗。[@senior-qa]
- [ ] 1.4 於 `issue-928-submit-near-decision.spec.ts` 追加行動裝置迴歸守護：390×844 視窗下既有送出按鈕不得與底部抽屜把手重疊（issue #933 既有修正不得回歸）。commit 並記錄執行結果。[@senior-qa]
- [ ] 1.5 執行 `git status --short` 確認工作樹於測試建立前後皆乾淨（僅新測試檔變動），將輸出貼入 issue #926 檢查點留言。[@senior-qa]

## 2. 實作

**故事目標**：SC-006 — 在不弱化第 1 節測試契約、不破壞既有 testid 與答案/決策語彙來源的前提下使其轉為通過。

- [ ] 2.1 修改 `design/prototype/pages/annotation/annotation-workspace.config.js`：決策按鈕群組改為附加到新的獨立決策列容器，不再掛入答案 Bypass 列；移除舊有的重掛機制。[@senior-frontend]
- [ ] 2.2 修改 `design/prototype/pages/annotation/annotation-workspace.html`：決策列容器樣式升級為一律使用的全寬分段控制、觸控目標達 44px；移除已失效的舊選擇器。全程沿用既有間距／圓角 token，不寫死色值、不發明新 token。[@senior-frontend]
- [ ] 2.3 修改 `design/prototype/pages/annotation/annotation-workspace.config.js`：新增決策完成後於決策列附近顯示的送出控制，文案與點擊行為沿用既有送出邏輯，可見性沿用既有「尚有未決策 outKey」判準。[@senior-frontend]
- [ ] 2.4 修改 `design/prototype/tests/annotation/annotation-workspace-reviewer.spec.ts`：四處斷言決策按鈕掛載位置的選擇器隨容器位移同步更新，實際 Bypass 答案切換按鈕之斷言不動。[@senior-frontend]
- [ ] 2.5 確認第 1 節新增測試全數轉為通過，且既有審核工作區相關 Playwright 套件（decision a11y、submit 按鈕對齊、行動裝置版面、例外池按鈕樣式等既有套件）不受影響、全數通過。[@senior-frontend]

## 3. 驗證與正典回寫

**故事目標**：SC-006 — 驗證修正未回歸既有版面契約與 a11y 保證。

- [ ] 3.1 執行閘門：prototype typecheck、上述新增與受影響既有 Playwright 套件（`--workers=1`，逐檔執行、不得跑全套）、`scripts/check-sdd.sh`、`scripts/check-spec-artifacts.sh`。全部通過方可繼續，團隊主責（main）親自重跑並獨立覆核，不採信代理自報。[@main]
- [ ] 3.2 於最後一次來源編輯之後，重新產生 screen-inventory 一次（`design/prototype/pages/**` 已變動）。[@main]
- [ ] 3.3 Source-Verify：確認 FR-014P、FR-053、FR-014B 與 issue #926/#927/#928 之引用皆可於正典逐一 grep 定位；`/opsx:archive` 回寫正典（版本依協調結果 bump，新增驗收情境並指派正式編號，補 Changelog 條目）並同步更新 `openspec/specs/` derived view。[@main]

## 4. 獨立審查與 PR

**故事目標**：SC-006 — 合併前須經未參與實作者複核，確保三張議題皆真正解決且無回歸。

- [ ] 4.1 派未寫過本改動的 `senior-code-reviewer` 獨立審查（自行量測，不採信回報）：三張議題是否都真的解決、有無改到任何文案字串、答案/決策語彙來源是否完好、桌機與手機兩寬度是否都正確、觸控目標是否達標、有無寫死色值或發明新 token、既有 testid 是否保留、issue #933 的手機版修正是否未被破壞；結論原文貼入 #926 檢查點留言。[@senior-code-reviewer]
- [ ] 4.2 開 PR（base main，body 含三行獨立成行、不包在反引號內的 Closes 關鍵字），push 前 `git fetch origin main && git rebase origin/main`。PR 編號回貼 #926。[@main]
