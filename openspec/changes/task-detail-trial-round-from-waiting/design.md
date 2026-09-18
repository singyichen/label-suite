# 設計決策：task-detail-trial-round-from-waiting（issue #791）

> 本文件存在的理由：issue #791 的規則本身只有一句（新增試標回合只能自 `waiting_iaa_confirmation` 發起），但 prototype 目前用「發布即完成」模擬整個回合，並以回合 IAA 結果決定發布後停在哪個狀態。規則一改，這個模擬方式就不成立，必須在 apply 前定案新的模擬形狀，否則 Red 契約無從撰寫。

## 背景：prototype 現況中與新規則衝突的四個事實

以下行號皆指 `design/prototype/pages/task-management/task-detail.html`（`origin/main` `b9b27498`）。

1. **`dry_run_in_progress` 顯示新增回合按鈕**。`renderPublishActions()`（:5985）於 `dry_run_in_progress` 渲染 `#publishDryRunBtn`「新增試標回合 R{nextRound}」（:6001–6003）；`waiting_iaa_confirmation` 只渲染 `#publishOfficialRunBtn`（:6006–6008）。這正是正典 014 `:376`／`:377` 與 FR-013 的字面規則，與 issue #791 的裁定相反。
2. **發布後的狀態取決於 IAA**。`publishDryRun()`（:10068）以 `getTrialRoundScenario()`（:5494）的腳本結果寫入回合紀錄，並以 `TASK_DATA.status = scenario.result === 'passed' ? 'waiting_iaa_confirmation' : 'dry_run_in_progress'`（:10092）決定狀態。這一行**同時違反** FR-010o-3（`dry_run_in_progress → waiting_iaa_confirmation` 與 IAA 達標與否無關）與 FR-008a（轉換條件是全員完成，不是 IAA）；T001 的 R1 腳本為未通過，所以現行 prototype 裡 R1 永遠停在 `dry_run_in_progress`，PL 只能從那裡按 R2——issue #791 描述的「未完成就開下一回合」就是這條路徑。
3. **回合結果在發布當下就寫入**。同一函式在發布時即寫入 `agreement`、`std`、`result`，判定 banner 立即顯示「R1 未達標，建議新增下一個試標回合」（i18n 鍵 `roundDecisionTitleFailedTpl`，:2564）。新規則下 `dry_run_in_progress` 已不提供新增回合，這句「建議新增下一個試標回合」在該狀態會指向一個停用中的按鈕。
4. **已有依完成度轉換的機制**。`syncStatusFromDryRunProgress()`（:4999，於 :10872 呼叫）在 `dry_run_in_progress` 且標記端寫入的試標進度已全數提交時，把狀態轉為 `waiting_iaa_confirmation`；`design/prototype/tests/cross-role/xrole-canonical-journey.spec.ts` 已用這條路徑驗證跨角色旅程。這是 FR-008a 在 prototype 中唯一忠實的實作。

## 決策

### D1 發布回合只進入進行中，完成改走既有的進度同步

`publishDryRun()` 不再依回合結果決定狀態：自 `draft` 或 `waiting_iaa_confirmation` 發布任一回合後，狀態一律為 `dry_run_in_progress`。進入 `waiting_iaa_confirmation` 只經由 `syncStatusFromDryRunProgress()`（背景第 4 點）。這同時修正背景第 2 點對 FR-010o-3 的違反（維護者 2026-09-18 裁定：`:10092` 的既有違規在本 change 的 apply 內修正，不另開 issue）：發布後的狀態不再讀取回合 IAA 結果；回合全員完成後一律進入 `waiting_iaa_confirmation`，不論該回合 IAA 是否達標。

**不採用的替代方案**：
- **保留「發布即完成」、直接落在 `waiting_iaa_confirmation`**：Red 最好寫，但等於讓 prototype 永遠不經過 `dry_run_in_progress`，FR-013 對照表中「試標進行中不顯示新增回合」這一列將沒有任何可觀察畫面，且與 FR-008a 相悖。
- **加一顆「模擬本回合完成」的示範按鈕**：issue #510 已移除 task-detail 的示範捷徑鈕，不重新引入。

### D2 回合結果於回合完成時才寫入

回合紀錄於發布時只寫入回合編號、抽樣筆數與日期，`agreement`／`std`／`result` 留空；`syncStatusFromDryRunProgress()` 轉入 `waiting_iaa_confirmation` 時才以 `getTrialRoundScenario()` 的腳本值補上。`dry_run_in_progress` 狀態的判定 banner 改為說明「R{n} 進行中，全員完成後進入待確認」，`waiting_iaa_confirmation` 狀態未達標時的下一步說明改為同時指向兩個按鈕（實際文案於 Green 任務定稿，不在本 change 規格內凍結）。

**理由**：背景第 3 點。若結果仍在發布時寫入，`dry_run_in_progress` 會顯示一個尚未發生的 IAA 結果，且下一步說明與 FR-013 第 1 點矛盾。

### D3 測試如何製造「回合完成」

Red 契約以 `design/prototype/tests/cross-role/xrole-canonical-journey.spec.ts` 已使用的方式，於頁面載入前寫入標記端的試標進度（全數提交），觸發 `syncStatusFromDryRunProgress()`；或以 `?status=waiting_iaa_confirmation` 直接載入待確認狀態。實作端不得為測試新增任何開關或全域 hook。

### D4 試標進行中的新增回合按鈕停用並顯示原因（維護者 2026-09-18 裁定，原 Q4）

`dry_run_in_progress` 狀態下，`#publishDryRunBtn` 仍渲染、文字為「新增試標回合 R{trial_round+1}」，但為停用狀態（原生 `disabled`，點擊不觸發 `publishDryRun()`）；按鈕旁以可見文字顯示原因「本回合全部提交並完成 IAA 後才能新增下一回合」，不只放在 tooltip。原因文字須有中英雙語 i18n 鍵（英文文案於 Green 任務定稿）。

**理由**：完全不顯示會讓專案負責人找不到「再試一輪」的入口在哪；停用加原因同時說明「目前不能」與「何時可以」。此停用依據是回合未結束，不是 IAA 未達標，因此與 FR-010o-3「不得停用開始正式標記按鈕」不衝突。

### D5 狀態轉換白名單不在 prototype 另建

prototype 目前以 `STATUS_ORDER`（:4568）排序 stepper，沒有轉換白名單；本 change 不新增。轉換白名單的權威是 ADR-022 `ALLOWED_TRANSITIONS`，於後端實作時落地。

## 範圍界線

- **不修改** `annotation/015-annotation-workspace` 與其 prototype。FR-096 的揭露閘門 `getDryRunFeedback()`（`design/prototype/pages/annotation/annotation-workspace.data.js:1930`）以**任務狀態**而非回合判斷，R2 進行中時會連同已結束的 R1 回饋一併隱藏——這是過度隱藏、不是洩漏，Data Fairness 不受影響；但與 FR-096「看到自己在歷次試標中的表現回饋」有落差。此落差在舊流程中同樣存在（舊流程的未達標回合從未進入待確認，回饋從未揭露），不是本 change 引入；維護者 2026-09-18 裁定另以 issue #834 追蹤，本 change 不修改 FR-096（Q3）。
- **不修改** FR-008、FR-008a 的條文。正典 `:455`「不允許跳階」與 SC-004 依 Q2 裁定只補一句釐清（delta FR-013 第 (7) 點），不新增編號。
- **不修改** `task-config.data.js`、`task-detail.data.js`。
- **不實作** FR-017 修訂紀錄必填阻擋的 prototype。apply 期間複驗發現此阻擋在 prototype 從未落地（`#publishActionRow` 點擊後只經隔離風險確認即呼叫 `publishDryRun()`）；維護者 2026-09-18 裁定另以 issue #838 追蹤。本 change 的測試一律以「於待確認直接成功建立 R{n}」驗證轉換，不斷言修訂紀錄阻擋；AC-3.12 條文仍依 delta 原地改寫，因需求本身不變、缺的只是 prototype 落地。

## 未決事項（維護者 2026-09-18 已全數裁定）

- ~~**Q1**~~（**已裁定**）：正典 `:377` 與 FR-013（`:601`）納入本 change 同步改寫，與 issue #791 點名的 `:375-376`、AC-3.12 一起處理。
- ~~**Q2**~~（**已裁定**）：delta FR-013 第 (7) 點補上釐清句「合法轉換以 ADR-022 轉換表為準；表列的回溯轉換不視為跳階」，gate 4 原地寫入正典 `:455` 行為規則與 SC-004；屬措辭釐清，不新增 AC。
- ~~**Q3**~~（**已裁定**）：`annotation/015-annotation-workspace` FR-096 揭露閘門造成的 R{n+1} 進行中隱藏 R{n} 回饋，另以 issue #834 追蹤；本 change 不修改 FR-096。
- ~~**Q4**~~（**已裁定**）：`dry_run_in_progress` 顯示停用的新增回合按鈕並附原因文字，見 D4。
- ~~**Q5**~~（**已裁定**）：移除既有行為屬 MAJOR，014 v3.3.1 → v4.0.0；issue #783 的 014 change 相應為 v4.1.0。
- ~~**`:10092` 既有違規**~~（**已裁定**）：於本 change apply 內修正，見 D1；tasks.md 2.1 Red 斷言、2.3 Green 修正。
- ~~**正典取回**~~（**已裁定**）：自 `specs/_archive/014-task-detail/` 搬回 `specs/task-management/014-task-detail/` 可接受，依 CLAUDE.md「Modify Existing Feature」第 1、5 步；合併後再歸位。
