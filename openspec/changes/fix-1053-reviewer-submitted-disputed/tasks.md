# Tasks

## 1. 測試先行（預期失敗）

**故事目標**：SC-006 — Annotator 與 Reviewer 主要流程（標記/審查/提交/返回）端到端可完成：當事審核員重入已提交之爭議中單位，其審核歷程須可正確回放而非被誤當未審（issue #1053）。

- [x] 1.1 於 `design/prototype/tests/annotation/issue-1053-reviewer-submitted-disputed.spec.ts` 新增涵蓋 AC-4.81 全部斷言（唯讀摘要預設呈現、內容與 getSubmission 一致、送出審核不可見不可觸發、修改我的審核切換為可編輯且修正面板以審核員自己提交值播種、取消退回唯讀不寫入、ARBITRATION 與 FINALIZED 對照組逐字不變）的測試案例，commit 後執行並記錄預期失敗原因 [@senior-qa]

## 2. 實作

> 本組全數依序在同一檔案上進行，不可並行。

**故事目標**：SC-006 — 當事審核員重入爭議中單位之審核流程端到端可正確呈現既有審核內容並可選擇改判，任一新增之測試片段皆須轉為綠燈（issue #1053）。

- [ ] 2.1 於 `annotation-workspace.config.js` 之 reviewUnitBlockReason 新增一個攔截分支（新值命名比照既有 REVIEW_UNIT_BLOCK 慣例），執行對應測試片段轉綠驗證既有 ARBITRATION／FINALIZED 分支不受影響 [@senior-frontend]
- [ ] 2.2 於同檔新增唯讀摘要渲染函式（testid ws-review-submitted-card，比照 renderFinalizedCard 語彙）並掛上呼叫入口，執行對應測試片段驗證唯讀摘要內容與送出審核隱藏行為轉綠 [@senior-frontend]
- [ ] 2.3 於同檔為 seedReviewRow 新增可選播種來源參數並新增「修改我的審核」／「取消，維持原決策」按鈕與切換邏輯，執行對應測試片段驗證修正面板以審核員自己提交值播種、取消不寫入行為轉綠 [@senior-frontend]
- [ ] 2.4 於同檔新增本次 i18n 鍵（zh／en 成對），執行對應測試片段驗證文字呈現轉綠 [@senior-frontend]

## 3. 驗證與獨立審查

**故事目標**：SC-006 — 確認新增分支未影響既有審核流程與其他既有測試覆蓋，且專案 SDD 閘門皆通過（issue #1053）。

- [ ] 3.1 執行 `cd design/prototype && pnpm typecheck` 與 `cd design/prototype && PW_PORT=8982 pnpm playwright test tests/annotation/` 並記錄結果 [@main]
- [ ] 3.2 執行 `scripts/check-sdd.sh` 與 `openspec validate --changes --no-interactive` 並記錄結果 [@main]
- [ ] 3.3 派獨立 senior-code-reviewer 審查三分支互斥性、播種來源正確性、送出鈕不可觸發、i18n 成對、既有測試斷言未被弱化，記錄裁決 [@main]

## 4. Source-Verify 與封存

**故事目標**：SC-006 — 正典回寫完成雙寫且每個引用皆可逐一定位，確保責任鏈可追溯性不因本次新增分支而退化（issue #1053）。

- [ ] 4.1 對 FR-103／AC-4.81 之全部引用（FR/AC ID、檔案路徑、函式名、issue 編號）逐一以 grep 核對可定位，記錄結果 [@main]
- [ ] 4.2 執行 opsx:archive 完成雙寫（openspec/specs 衍生檢視與正典 spec.md 版本回寫至 8.2.0 並新增 Changelog 條目），並更新 specs/STATUS.md 對應列 [@main]
