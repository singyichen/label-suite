# Tasks

## 1. 測試先行（預期失敗）

**故事目標**：SC-006 — Annotator 與 Reviewer 主要流程（標記/審查/提交/返回）端到端可完成：當事審核員重入已提交之爭議中單位，其審核歷程須可正確回放而非被誤當未審（issue #1053）。

- [x] 1.1 於 `design/prototype/tests/annotation/issue-1053-reviewer-submitted-disputed.spec.ts` 新增涵蓋 AC-4.81 全部斷言（唯讀摘要預設呈現、內容與 getSubmission 一致、送出審核不可見不可觸發、修改我的審核切換為可編輯且修正面板以審核員自己提交值播種、取消退回唯讀不寫入、ARBITRATION 與 FINALIZED 對照組逐字不變）的測試案例，commit 後執行並記錄預期失敗原因 [@senior-qa]

> 以下為維護者裁示採方案 A、範圍擴大為 MAJOR 後追加之測試工作（2026-09-29）。呈現層 FR-103（1.1）已於 `79d5ed5c` 完成、不需重做；本組只補寫入側守衛與規格推翻後之契約測試重寫，皆由 senior-qa 擁有，實作方不得自行改測試。

- [x] 1.2 重寫 `design/prototype/tests/annotation/annotation-workspace-arbitration.spec.ts:119`（describe 區塊 `arbitration layout: negative paths keep the normal review card`）之測試名稱與斷言，使其斷言 FR-103 行為（當事審核員 PARTICIPANT 見 `ws-review-submitted-card`、`ws-review-row-approve` 為 0 節點）。此案例斷言的是已於 `79d5ed5c` 落地之呈現層行為，改寫後即為綠燈（非預期失敗），已記錄於檢查點說明理由。[@senior-qa]
- [x] 1.3 於 `issue-1053-reviewer-submitted-disputed.spec.ts` 新增 AC-4.82 守衛測試（唯讀摘要模式下經殘留路徑——直接呼叫 `#wsReviewSubmitBtn` 原生 `click()`（繞過隱藏樣式）——觸發 `handleReviewSubmit()`，斷言不得出現阻擋 toast 且 `getSubmission()`／歷程前後逐位元組相同；另加一案例確認「修改我的審核」編輯態下正常送出不受阻擋），commit 後執行並記錄預期失敗原因（阻擋 toast 目前仍會出現） [@senior-qa]
- [x] 1.4 換 fixture（不改斷言）修好 `issue-525-review-flow-drawer.spec.ts` 兩案例與 issue-550 一案例共 3 支附帶損害。T016 種子已無尚未提交之 pending 單位，改用 T015 官方標記任務之 ofs-04-pending-review 樣本（其 FR-093 指派審核員 reviewer_wang 尚未提交，仍為可裁決之互動卡），逐一驗證 banner children／drawer 位置／tooltip 位置斷言與原意一致；T016 之爭議中狀態相依測試（flow track 節點）未受影響、未改動。commit 後執行並記錄三支皆轉綠 [@senior-qa]

## 2. 實作

> 本組全數依序在同一檔案上進行，不可並行。

**故事目標**：SC-006 — 當事審核員重入爭議中單位之審核流程端到端可正確呈現既有審核內容並可選擇改判，任一新增之測試片段皆須轉為綠燈（issue #1053）。

- [x] 2.1 於 `annotation-workspace.config.js` 之 reviewUnitBlockReason 新增一個攔截分支（新值命名比照既有 REVIEW_UNIT_BLOCK 慣例），執行對應測試片段轉綠驗證既有 ARBITRATION／FINALIZED 分支不受影響 [@senior-frontend]
- [x] 2.2 於同檔新增唯讀摘要渲染函式（testid ws-review-submitted-card，比照 renderFinalizedCard 語彙）並掛上呼叫入口，執行對應測試片段驗證唯讀摘要內容與送出審核隱藏行為轉綠 [@senior-frontend]
- [x] 2.3 於同檔為 seedReviewRow 新增可選播種來源參數並新增「修改我的審核」／「取消，維持原決策」按鈕與切換邏輯，執行對應測試片段驗證修正面板以審核員自己提交值播種、取消不寫入行為轉綠 [@senior-frontend]
- [x] 2.4 於同檔新增本次 i18n 鍵（zh／en 成對），執行對應測試片段驗證文字呈現轉綠 [@senior-frontend]
- [ ] 2.5 於同檔 handleReviewSubmit 新增第三道進入時守衛（比照既有 issue #307／#308 兩道守衛寫法與註解語彙）：DISPUTED AND 當前審核員已有自己的提交 AND 不在修改我的審核編輯態 → 直接 return，不寫入不追加歷程事件；不得阻擋編輯態下之正常送出。執行 1.3 與 1.2 對應測試片段轉綠 [@senior-frontend]

## 3. 驗證與獨立審查

**故事目標**：SC-006 — 確認新增分支與新守衛未影響既有審核流程與其他既有測試覆蓋，且專案 SDD 閘門皆通過（issue #1053）。

- [ ] 3.1 執行 `cd design/prototype && pnpm typecheck` 與 `cd design/prototype && PW_PORT=8980 pnpm playwright test tests/annotation/ --workers=2` 並記錄結果 [@main]
- [ ] 3.2 執行 `scripts/check-sdd.sh` 與 `openspec validate --changes --no-interactive` 並記錄結果 [@main]
- [ ] 3.3 派獨立 senior-code-reviewer（非撰寫本次實作者）審查三分支互斥性（須自行實測 ARBITRATION／FINALIZED 對照組）、寫入側守衛不阻擋改判入口、播種來源正確性、送出鈕不可觸發、i18n 成對、既有測試斷言未被弱化，記錄裁決 [@main]

## 4. Source-Verify 與封存

**故事目標**：SC-006 — 正典回寫完成雙寫且每個引用皆可逐一定位，確保責任鏈可追溯性不因本次新增分支與版面推翻而退化（issue #1053）。

- [ ] 4.1 對 FR-103／AC-4.81／AC-4.82 與修訂之 FR-061／AC-4.22 之全部引用（FR/AC ID、正典行號、檔案路徑、函式名、issue 編號）逐一以 grep 核對可定位，記錄結果 [@main]
- [ ] 4.2 執行 opsx:archive 完成雙寫（openspec/specs 衍生檢視與正典 spec.md 版本回寫至 9.0.0 並新增 Changelog 條目，MAJOR），並更新 specs/STATUS.md 對應列 [@main]
