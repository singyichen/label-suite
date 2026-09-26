# Tasks

## 1. Red 測試

**故事目標**：SC-006 — Annotator 與 Reviewer 主要流程（標記/審查/提交/返回）端到端可完成：送出入口收斂為單一入口後，審核提交流程仍須端到端可完成（issue #1004）。

- [x] 1.1 改寫 `design/prototype/tests/annotation/issue-928-submit-near-decision.spec.ts`：整支前提（決策列旁存在 quick-submit）消失，改為正向斷言：決策完成前後決策列旁皆不存在 ws-review-quick-submit-btn（元素計數為零，非僅隱藏）；決策完成後畫面上恰有一個可點擊送出控制，即 ws-review-submit-btn；點擊該送出控制仍可成功送出審核。第 4 個既有測試（issue #933 行動裝置底部工具列迴歸守衛，與 quick-submit 無關）不得刪除，原樣保留。commit 並記錄執行結果為預期失敗，因目前生產碼仍渲染 ws-review-quick-submit-btn。[@senior-qa]
- [x] 1.2 改寫 `design/prototype/tests/annotation/issue-925-keep-modify-decision.spec.ts`：第 88-89 行點擊目標由 ws-review-quick-submit-btn 改為 ws-review-submit-btn；本案例主旨（issue #925 的「先選修正再改答案不清決策」）不變，僅送出入口改變。其餘既有斷言（modify 決策存活、approve/bypass 仍重置）逐字保留不動。commit 並如實記錄執行結果——此案例可能仍為既有綠燈（因兩顆按鈕現況皆呼叫同一個送出處理函式），若如此如實記錄，不得為求形式上的失敗而扭曲斷言。[@senior-qa]
- [x] 1.3 改寫 `design/prototype/tests/annotation/issue-930-submit-consequence-hint.spec.ts`：「quick-submit hint parity」該組案例之「兩入口 parity」前提消失，改寫為決策完成後決策列旁不存在 ws-review-quick-submit-btn 與 ws-review-quick-submit-consequence、footer 側之 ws-review-submit-consequence 仍正確顯示對應文字（finalized、disputed、答案已改動三個情境各一案例）的正向斷言；不得刪除整個描述區塊，改寫後保留為 footer 側在原三個情境下的行為契約覆蓋。原案例中對 quick-submit 按鈕與提示為「隱藏」的斷言，改為「元素計數為零」（整段不存在，非僅隱藏）。footer 側既有五個案例逐字保留不動。commit 並記錄執行結果為預期失敗。[@senior-qa]
- [x] 1.4 驗證上述三支預期失敗前，先跑工作樹狀態檢查確認乾淨，輸出貼進 issue #1004 檢查點留言；Playwright 執行輸出（含失敗訊息）一併貼上。只寫測試，不得碰生產碼；若使用探測補丁，用畢須還原。[@senior-qa]

## 2. Green 實作

**故事目標**：SC-006 — 移除決策列旁重複的送出入口，底部 action bar 唯一入口之送出流程端到端維持可完成，任一被改寫的測試皆須轉為綠燈（issue #1004）。

- [x] 2.1 `design/prototype/pages/annotation/annotation-workspace.config.js`：移除決策列送出控制建構函式整段（含其重繪清單註冊），並移除其唯一呼叫點。[@senior-frontend]
- [x] 2.2 同一檔案：移除 i18n key reviewQuickSubmitAriaLabel（zh／en 各一），連同其上方描述 A11Y-05 雙同名按鈕問題的整段註解——該問題隨本次移除消失。[@senior-frontend]
- [x] 2.3 `design/prototype/pages/annotation/annotation-workspace.html`：移除決策列送出控制之 CSS 規則。[@senior-frontend]
- [x] 2.4 全域檢查確認決策列送出控制相關識別名稱（含其建構函式、testid、i18n key、CSS 規則）於 `design/prototype/pages/` 下歸零；底部 action bar 既有共用函式與程式碼不得更動一行。[@senior-frontend]
- [x] 2.5 使 1.1～1.3 三支改寫後的測試全數轉為綠燈；不得為求轉綠而弱化 1.1～1.3 的斷言內容。[@senior-frontend]

## 3. 驗證閘門

**故事目標**：SC-006 — 確認移除未影響既有送出驗證、可及名稱區辨與行動裝置底部工具列等既有大量測試覆蓋，且專案生成檔與 SDD 閘門皆通過（issue #1004）。

- [x] 3.1 執行前端型別檢查與依賴安裝：`cd design/prototype && pnpm install --frozen-lockfile && pnpm typecheck`。[@main]
- [x] 3.2 執行 Playwright 候選測試集（以 `grep -rl` 推導候選集，含 issue-928、issue-925、issue-930、issue-596-review-three-way、issue-719-review-submit-auto-advance、annotation-workspace-action-shortcuts、annotation-workspace-review-shortcuts 等），先以唯讀探測樹取得同條件基準，差集須為分支失敗集之子集。[@main]
- [x] 3.3 執行 worktree 根之生成檔與 SDD 閘門：畫面清冊生成與其一致性檢查、清冊測試、SDD lint（須 0 error）、規格產物檢查、使用者路徑地圖新鮮度檢查。[@main]

## 4. 獨立審查（與第 3 節並行啟動）

**故事目標**：SC-006 — 合併前須經未參與實作者複核，確保死碼未殘留、底部入口功能完好、正典既有修訂段落未被靜默刪除、被改寫測試無誤判前提位移（issue #1004）。

- [x] 4.1 派全新 `senior-code-reviewer`（非撰寫本次實作者）審查：決策列送出提示是否一併移除、有無死碼殘留；底部 action bar 送出入口與其提示功能完好；spec delta 之修訂內容是否逐字保留現行既有修訂與釐清段落；被改寫既有測試有無「前提消失」被誤當「位移」、或底部入口有效契約被順手弱化；Source-Verify 每個引用可否逐一定位。裁決記進 issue #1004 檢查點留言。[@senior-code-reviewer]

## 5. Source-Verify 與正典回寫

**故事目標**：SC-006 — 確認每個引用可逐一定位，既有修訂段落逐字保留，正典回寫完成雙寫（issue #1004）。

- [x] 5.1 執行 Source-Verify 預掃：確認正典現行版本之既有修訂與釐清段落逐字存在，確認廢止段落之用語與既有先例一致。[@main]
- [x] 5.2 執行正典回寫：衍生檢視合併本次變更；正典版本 7.4.0 → 8.0.0，Changelog 新增一列（含分級理由）。[@main]
- [x] 5.3 執行 `specs/STATUS.md` 更新：只更新對應規格列的本次新增摘要片段，歷史段落一字不動。[@main]

## 6. PR

**故事目標**：SC-006 — 送出流程之單一入口收斂變更完成合併，供 Annotator 與 Reviewer 主要流程持續端到端可用（issue #1004）。

- [ ] 6.1 開 PR（base main，Closes #1004，逐項 Test Plan 證據，Source-Verify 佐證與命中結果，紅燈／綠燈證據皆貼）；push 前先合入 main 最新變更。[@main]
- [ ] 6.2 PR 合併後於 issue #928 留言說明本次撤銷其修復之原因與 issue #1004 連結。[@main]
