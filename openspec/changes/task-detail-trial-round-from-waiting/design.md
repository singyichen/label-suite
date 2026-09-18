# 設計決策：task-detail-trial-round-from-waiting（issue #791）

> 本文件存在的理由：issue #791 的規則本身只有一句（新增試標回合只能自 `waiting_iaa_confirmation` 發起），但 prototype 目前用「發布即完成」模擬整個回合，並以回合 IAA 結果決定發布後停在哪個狀態。規則一改，這個模擬方式就不成立，必須在 apply 前定案新的模擬形狀，否則 Red 契約無從撰寫。

## 背景：prototype 現況中與新規則衝突的四個事實

以下行號皆指 `design/prototype/pages/task-management/task-detail.html`（`origin/main` `b9b27498`）。

1. **`dry_run_in_progress` 顯示新增回合按鈕**。`renderPublishActions()`（:5985）於 `dry_run_in_progress` 渲染 `#publishDryRunBtn`「新增試標回合 R{nextRound}」（:6001–6003）；`waiting_iaa_confirmation` 只渲染 `#publishOfficialRunBtn`（:6006–6008）。這正是正典 014 `:376`／`:377` 與 FR-013 的字面規則，與 issue #791 的裁定相反。
2. **發布後的狀態取決於 IAA**。`publishDryRun()`（:10068）以 `getTrialRoundScenario()`（:5494）的腳本結果寫入回合紀錄，並以 `TASK_DATA.status = scenario.result === 'passed' ? 'waiting_iaa_confirmation' : 'dry_run_in_progress'`（:10092）決定狀態。這一行**同時違反** FR-010o-3（`dry_run_in_progress → waiting_iaa_confirmation` 與 IAA 達標與否無關）與 FR-008a（轉換條件是全員完成，不是 IAA）；T001 的 R1 腳本為未通過，所以現行 prototype 裡 R1 永遠停在 `dry_run_in_progress`，PL 只能從那裡按 R2——issue #791 描述的「未完成就開下一回合」就是這條路徑。
3. **回合結果在發布當下就寫入**。同一函式在發布時即寫入 `agreement`、`std`、`result`，判定 banner 立即顯示「R1 未達標，建議新增下一個試標回合」（i18n 鍵 `roundDecisionTitleFailedTpl`，:2564）。新規則下 `dry_run_in_progress` 已不提供新增回合，這句「建議新增下一個試標回合」在該狀態會指向一個不存在的按鈕。
4. **已有依完成度轉換的機制**。`syncStatusFromDryRunProgress()`（:4999，於 :10872 呼叫）在 `dry_run_in_progress` 且標記端寫入的試標進度已全數提交時，把狀態轉為 `waiting_iaa_confirmation`；`design/prototype/tests/cross-role/xrole-canonical-journey.spec.ts` 已用這條路徑驗證跨角色旅程。這是 FR-008a 在 prototype 中唯一忠實的實作。

## 決策

### D1 發布回合只進入進行中，完成改走既有的進度同步

`publishDryRun()` 不再依回合結果決定狀態：自 `draft` 或 `waiting_iaa_confirmation` 發布任一回合後，狀態一律為 `dry_run_in_progress`。進入 `waiting_iaa_confirmation` 只經由 `syncStatusFromDryRunProgress()`（背景第 4 點）。這同時修正背景第 2 點對 FR-010o-3 的違反。

**不採用的替代方案**：
- **保留「發布即完成」、直接落在 `waiting_iaa_confirmation`**：Red 最好寫，但等於讓 prototype 永遠不經過 `dry_run_in_progress`，FR-013 對照表中「試標進行中不顯示新增回合」這一列將沒有任何可觀察畫面，且與 FR-008a 相悖。
- **加一顆「模擬本回合完成」的示範按鈕**：issue #510 已移除 task-detail 的示範捷徑鈕，不重新引入。

### D2 回合結果於回合完成時才寫入

回合紀錄於發布時只寫入回合編號、抽樣筆數與日期，`agreement`／`std`／`result` 留空；`syncStatusFromDryRunProgress()` 轉入 `waiting_iaa_confirmation` 時才以 `getTrialRoundScenario()` 的腳本值補上。`dry_run_in_progress` 狀態的判定 banner 改為說明「R{n} 進行中，全員完成後進入待確認」，`waiting_iaa_confirmation` 狀態未達標時的下一步說明改為同時指向兩個按鈕（實際文案於 Green 任務定稿，不在本 change 規格內凍結）。

**理由**：背景第 3 點。若結果仍在發布時寫入，`dry_run_in_progress` 會顯示一個尚未發生的 IAA 結果，且下一步說明與 FR-013 第 1 點矛盾。

### D3 測試如何製造「回合完成」

Red 契約以 `design/prototype/tests/cross-role/xrole-canonical-journey.spec.ts` 已使用的方式，於頁面載入前寫入標記端的試標進度（全數提交），觸發 `syncStatusFromDryRunProgress()`；或以 `?status=waiting_iaa_confirmation` 直接載入待確認狀態。實作端不得為測試新增任何開關或全域 hook。

### D4 狀態轉換白名單不在 prototype 另建

prototype 目前以 `STATUS_ORDER`（:4568）排序 stepper，沒有轉換白名單；本 change 不新增。轉換白名單的權威是 ADR-022 `ALLOWED_TRANSITIONS`，於後端實作時落地。

## 範圍界線

- **不修改** `annotation/015-annotation-workspace` 與其 prototype。FR-096 的揭露閘門 `getDryRunFeedback()`（`design/prototype/pages/annotation/annotation-workspace.data.js:1930`）以**任務狀態**而非回合判斷，R2 進行中時會連同已結束的 R1 回饋一併隱藏——這是過度隱藏、不是洩漏，Data Fairness 不受影響；但與 FR-096「看到自己在歷次試標中的表現回饋」有落差。此落差在舊流程中同樣存在（舊流程的未達標回合從未進入待確認，回饋從未揭露），不是本 change 引入，列為維護者待決事項 Q3。
- **不修改** FR-008、FR-008a、SC-004 與正典 `:455`「不允許跳階」的措辭（見未決事項 Q2）。
- **不修改** `task-config.data.js`、`task-detail.data.js`。

## 未決事項（apply 前由維護者確認）

- **Q1**：正典中除 issue #791 點名的 `:375-376` 與 AC-3.12 外，`:377`（`waiting_iaa_confirmation` 的按鈕列）與 FR-013（`:601`，與 `:376` 同一條規則的 FR 版本）若不同步改寫，正典會自相矛盾；本 change 已將兩者納入。請確認。
- **Q2**：正典 `:455`「狀態轉換必須符合 `TASK_STATUSES` 順序，不允許跳階」與 SC-004「任務狀態轉換遵循定義順序」在新增回溯轉換後是否需補一句說明（本 change 判定「回溯不等於跳階」而維持原文）。
- **Q3**：`annotation/015-annotation-workspace` FR-096 揭露閘門以任務狀態判斷所造成的 R{n+1} 進行中隱藏 R{n} 回饋，是否另開 issue 追蹤（見範圍界線）。
- **Q4**：`dry_run_in_progress` 狀態不顯示任何執行控制按鈕（FR-013 對照表）——是否需要一個停用狀態的按鈕加說明，而非完全不顯示。本 change 採完全不顯示，與現行 `completed` 列的處理一致。
- **Q5**：版本判定。本 change 判為 MINOR v3.4.0（新增一條轉換、一條 SC 與三條驗收情境；FR-013 與 AC-3.12 為改寫而非移除）。若維護者認為收回 `dry_run_in_progress` 的新增回合入口屬於對既有契約的破壞，改判 MAJOR v4.0.0，tasks.md 群組 3 與 proposal.md 目標版本須同步修改。
