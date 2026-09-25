# Tasks

## 1. Red 測試

**故事目標**：SC-006 — annotator 與 reviewer 主要流程之關鍵操作皆須有歷程可追溯，且審核工作區的狀態呈現須可信。

- [x] 1.1 以 `design/prototype/tests/annotation/issue-910-review-unit-status-consistency.spec.ts` 建立測試：T001／`sent-001`／`official_run`／`kioleemg12`（從未提交、有 FR-044a 示範列）為 reviewer 對同一 outKey 連續送出兩次相同決策，驗證 `歷程` 頁籤中該 outKey 事件恰為 1 筆。commit 並記錄執行結果為預期失敗。[@senior-qa]
- [x] 1.2 於同一測試檔追加測試：同一單位下，工作區左欄清單狀態標籤與頂部審核單位脈絡橫幅三態 pill 須同時顯示待審，不再出現左欄待審、橫幅尚無標記提交並存的不一致。commit 並記錄執行結果為預期失敗。[@senior-qa]
- [x] 1.3（第一輪獨立審查追加之迴歸）於同一測試檔追加測試：同一次送出橫跨兩個 outKey，排序在前者被去重、排序在後者為真正新事件時，後者仍須帶 `started_at`／`lead_time`（FR-088／AC-2.26），驗證目前會因 `timingWritten` 旗標於確認寫入前就被消耗而失敗。commit 並記錄預期失敗。[@senior-qa]

## 2. Green 實作

**故事目標**：SC-006 — 修正後仍須維持既有流程可完成、歷程可追溯之保證。

- [x] 2.1 修改 `design/prototype/pages/annotation/annotation-workspace.config.js`：新增左欄與頂部橫幅共用的狀態推導，使 1.2 測試轉綠；既有判定式與豁免邏輯不動。[@senior-frontend]
- [x] 2.2 修改 `design/prototype/pages/annotation/annotation-workspace.data.js`：泛化既有雙送出防護涵蓋審核決策事件，比對鍵改為同一 outKey 最近一筆事件，使 1.1 測試轉綠；決策或修正值有實質差異之送出仍需正常記錄。[@senior-frontend]
- [x] 2.3（對應 1.3 之修正）修改 `design/prototype/pages/annotation/annotation-workspace.data.js`：`appendHistoryEvent()` 回傳是否真的寫入，`appendReviewDecisionEvents()` 僅在確認寫入後才推進 `timingWritten`，使 1.3 測試轉綠。[@senior-frontend]

## 3. 驗證與正典回寫

**故事目標**：SC-006 — 驗證修正後主要流程與歷程呈現皆未回歸。

- [x] 3.1 執行閘門：prototype typecheck、本次新增與 issue-307／issue-583／annotation-review-unit（含 DUP-02）既有 Playwright 契約、`check-sdd.sh`、`check-spec-artifacts.sh`，全部通過方可繼續。團隊主責（main）於第一輪修正與第二輪迴歸修正後皆親自重跑並獨立覆核，不採信代理自報。[@main]
- [x] 3.2 若本次變更觸及 `design/prototype/pages/**`，於最後一次來源編輯後重新產生 screen-inventory 一次。[@main]
- [x] 3.3 Source-Verify：確認 FR-064、FR-016B、FR-053、FR-044a、FR-088、AC-2.26 皆可於正典逐一 grep 定位；`openspec archive` 回寫正典（版本 6.16.2 → 6.17.0，補 Changelog 條目）並同步更新 `openspec/specs/` derived view（archive as `2026-09-25-fix-910-review-unit-status-consistency`）。[@main]

## 4. 獨立審查與 PR

**故事目標**：SC-006 — 合併前須經未參與實作者複核，確保流程與歷程保證未被弱化。

- [x] 4.1 派未寫過本改動的 senior-code-reviewer 獨立審查：兩狀態函式是否真的共用同一推導、去重是否沿用既有機制、issue-307 既有正向斷言是否仍全綠、有無越界修改 FR-053 或 FR-044a、Red 契約有無被弱化；結論回報。第一輪審查抓到 FR-088 計時迴歸（見 1.3／2.3），已修正；第二輪獨立審查逐行覆核修正並重跑四套 Playwright 套件，結論 APPROVE。[@senior-code-reviewer]
- [ ] 4.2 開 PR（base main，Closes #910，逐項 Test Plan 證據），push 前 rebase origin/main。[@main]
