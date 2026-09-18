# 任務清單：retire-stale-review-demo-fixtures

> **Apply 前硬閘（兩道）**
>
> 1. 先執行 `openspec validate retire-stale-review-demo-fixtures --type change` 與 `scripts/check-sdd.sh`，分別回報 OpenSpec schema validation 與 Project SDD lint。兩者通過後必須停止，取得使用者明確確認才可進入 Stage 1 `/opsx:apply`。
> 2. **PR #828（issue #627 第 3 項）必須先合併進 `main`**。該單把 `ofm-02-approved-interim`／`ofm-03-modified-interim` 改名，與本單同動 workspace 種子檔的相鄰行；本單的種子改寫必須建立在改名後的內容上。propose 階段兩單零檔案重疊，此約束只作用於 apply。
>
> 主 session／team lead 是唯一可驗證 Red／Green evidence 與更新 checkbox 的角色。

> **群組間序列**：1 → 2 → 3 → 4，不並行。群組 2 移除整個示範任務，會動到群組 1 已改過的同一批消費端；群組 3 的一致性檢查必須在兩份副本都已收斂之後才會綠。

---

## 1. PR-815-A — T016 兩列失效種子改為 bypass 與例外池示範

**故事目標**（SC-004W）：`ofm-04-majority-converged` 與 `ofm-05-all-divergent` 各登錄三位審核員同審一個 `official_run` 單位，違反 FR-093「每個審核單位恰有一位指派審核員」，使該示範任務的橫幅無法區辨任何現行審核情境。兩個槽位改為承接整組零覆蓋的決策值 `bypass`，以及自 T017 遷入的仲裁「兩者皆非」→ 最終例外池路徑。

- [ ] 1.1 撰寫 `design/prototype/tests/annotation/issue-815-review-demo-seed-model-fit.spec.ts` 作為 Red 契約，釘住四件事：T016 的每一個 `official_run` 審核單位恰有一位審核員、整組示範種子對三個決策值皆有至少一列見證、存在一列其仲裁裁定為兩者皆非且該單位維持爭議中並列入最終例外池、以及整組種子中不存在任何審核員層級的退回決策；型別宣告必須使用 local cast 而非第二份 `declare global`（重複宣告會撞 TS2717）。先提交此單檔再跑測試，expected failure 必須是前三項同時紅，並保存 command、exit 與失敗訊息。 [@senior-qa]
- [ ] 1.2 Green：於 `design/prototype/pages/annotation/annotation-workspace.data.js` 改寫 T016 的第四、第五列種子——前者改名並改為單一審核員之 bypass 決策（帶非空理由、刻意不帶答案值），後者改名並改為單一審核員 modify 後仲裁裁定兩者皆非（沿用既有的仲裁退回欄位形狀）；兩列原本的多審核員結構整個移除，不留任何欄位殘留。 [@senior-frontend]
- [ ] 1.3 同步 docs 副本：於 `docs/product/example-data/review-flow-official-multi.json` 改寫兩筆樣本的 id 與文字使其與 prototype 種子逐列一致，並一併修正既有漂移的第一筆 id（docs 側目前寫的是與 prototype 不符的舊名）。 [@senior-frontend]
- [ ] 1.4 執行 code/test gate：於 `design/prototype/` 帶本 worktree 專屬 `PW_PORT` 跑 typecheck 與 Playwright，兩者預期 exit `0`，且必須分開記錄——它們是兩道獨立閘門。 [@main]

---

## 2. PR-815-B — 移除示範任務 T017 與其 fixture

**故事目標**（SC-004W）：T017 的立意是「`min_reviewers = 2` 的偶數平手」，單人接力下一個單位只有一位審核員，平手在結構上不存在，此情境無法被翻譯成現行模型的任何形狀，留著只會讓四個示範任務中的一個恆久展示一個模型產不出的審核情境。其唯一具獨立價值的一列（仲裁兩者皆非）已於群組 1 遷入 T016。

**規模例外聲明 `[Principle: X]`**：本群組會動到 6 份 prototype 種子登錄檔，超過單一 PR 5 檔上限。移除一個 fixture 在字串相等耦合下是原子操作——任一登錄檔留下 T017 而其他已移除，prototype 即進入不一致狀態並使既有回歸轉紅，因此拆分會讓中間態變紅。此例外須於 Apply 前硬閘一併取得使用者確認。

- [ ] 2.1 撰寫 `design/prototype/tests/annotation/issue-815-t017-fixture-removed.spec.ts` 作為 Red 契約，釘住三件事：示範任務集合恰為三個且不含 T017、任一消費端列舉示範任務時皆不再出現該 id、以及移除後 T014 至 T016 的既有清單與儀表板筆數仍各自正確。先提交此單檔再跑測試並保存 expected failure 證據。 [@senior-qa]
- [ ] 2.2 Green：自 `design/prototype/pages/annotation/annotation-workspace.data.js` 刪除 T017 的五列種子與其對應的樣本答案登錄。 [@senior-frontend]
- [ ] 2.3 接續移除任務清單側的登錄：`design/prototype/pages/task-management/task-list.data.js` 的 T017 任務列。 [@senior-frontend]
- [ ] 2.4 接續移除任務詳情側的兩處登錄：`design/prototype/pages/task-management/task-detail.data.js` 的設定側寫與其樣本清單，以及同目錄頁面檔內嵌的同一筆示範任務登錄。 [@senior-frontend]
- [ ] 2.5 接續移除儀表板與資料集側的三處登錄：`design/prototype/pages/dashboard/dashboard.data.js` 的任務列、同目錄指派摘要種子的示範任務欄位，以及 dataset-analysis-detail 頁面內嵌的任務登錄。 [@senior-frontend]
- [ ] 2.6 刪除 `docs/product/example-data/review-flow-official-tie.json` 與其同名任務設定檔，並逐一檢視測試層對該 id 的引用——命名含 `t014-t017` 的兩支測試檔其檔名為 issue 標記而非斷言內容，檔名維持不動，只調整其內部斷言。 [@senior-frontend]
- [ ] 2.7 改寫 `docs/product/task-configs/review-flow-dry-run.json` 及其餘兩份存活任務設定檔的 `typical_tasks` 字串，去除定稿門檻數值、多數決與偶數平手等已廢止語彙，改以指派粒度與仲裁路徑描述該示範任務的實際情境。 [@senior-frontend]
- [ ] 2.8 執行 code/test gate：於 `design/prototype/` 帶專屬 `PW_PORT` 跑 typecheck 與 Playwright 全量，兩者預期 exit `0`；本群組刪除整個 fixture，全量回歸是唯一能證明無殘留引用的證據，分段跑不算數。 [@main]

---

## 3. PR-815-C — 示範資料雙份副本的一致性閘門

**故事目標**（SC-004W）：兩份手寫副本目前沒有任何閘門比對，20 列中已有 2 列 id 漂移且無聲存在；示範任務要能被信賴為區辨審核情境的基準，前提是讀者手上那一份與原型跑的那一份是同一份。

- [ ] 3.1 撰寫 `design/prototype/tests/annotation/issue-815-demo-data-parity.spec.ts` 作為 Red 契約，釘住檢查本身的行為：兩份副本相同時通過、人為在其一注入一筆差異時必須以非零 exit 失敗並指名該筆差異所在。先提交此單檔再跑測試並保存 expected failure 證據。 [@senior-qa]
- [ ] 3.2 Green：建立 `scripts/check-demo-data-parity.sh` 比對兩份副本的任務集合、樣本 id 序列與樣本文字，以 prototype 種子為基準，差異時逐筆輸出並回非零 exit。 [@senior-devops]
- [ ] 3.3 依 CLAUDE.md 的兩向契約補上登錄：於 `scripts/ci-jobs.tsv` 為新腳本登錄其 CI job 與本機指令，並於 CLAUDE.md 的驗證指令清單列入同一支腳本；缺任一側時 `CI_JOB_PARITY` 會回報缺口。 [@senior-devops]
- [ ] 3.4 於 `.github/workflows/ci.yml` 接上對應 job，使該檢查在 CI 實際執行而非僅登錄於表。 [@senior-devops]
- [ ] 3.5 執行 code/test gate：跑 Project SDD lint 確認 `CI_JOB_PARITY` 無缺口，並跑新腳本本身確認在當前樹上為 exit `0`。 [@main]

---

## 4. PR-815-D — 正典回寫與 archive

**故事目標**（SC-004W）：該成功指標本身逐字寫著「四個審核流程示範任務（T014–T017）」，示範任務收斂為三個之後，三份正典裡所有把 T016／T017 寫進 Given 前提或示例基線筆數的條文都必須同步，否則本變更一落地該指標即永遠不成立。

- [ ] 4.1 更新 `specs/annotation/015-annotation-workspace/spec.md`：FR-044 與 FR-093 依本 delta 改寫、新增兩則 AC（編號接續各章現行最大者）、示例基線筆數與種子來源註中的示範任務範圍收斂為三個、SC-004W 的示範任務數同步，並改寫 AC-1.22／AC-1.23／AC-1.24／AC-4.39／AC-4.40 的 Given 前提使其改引仍存在的示範單位；版號 bump 並補 Changelog 一列。Changelog 既有列不得改寫，被取代的條文逐字保留為沿革。 [@main]
- [ ] 4.2 下游同步 `specs/task-management/010-task-list/spec.md`：示例基線表移除該筆 fixture 列、基線筆數自 17 改為 16，版號 bump 並補 Changelog 一列。 [@main]
- [ ] 4.3 下游同步 `specs/dashboard/012-dashboard/spec.md`：FR-011D、FR-011E 與 SC-024 三處的示範任務範圍與快速操作筆數同步收斂，版號 bump 並補 Changelog 一列。 [@main]
- [ ] 4.4 更新 `design/system/screen-inventory.md`：本 change 動到原型頁面，須於分支尾端、rebase 之後重新產生，避免內嵌的來源 commit 過期。 [@main]
- [ ] 4.5 執行四道閘門的完整記錄：OpenSpec schema validation、Project SDD lint、prototype 的 typecheck 與 Playwright 全量，逐項回報 command 與 exit。 [@main]

---

## Pre-merge finalization（在 /opsx:apply 外，NON-CHECKBOX）

所有 apply checkbox 完成、code review 與使用者確認均通過後，最終 PR 才執行 Source-Verify 與 `/opsx:archive retire-stale-review-demo-fixtures`。Archive 產生衍生檢視後，必須依 `docs/sdd-workflow.md` §6.2 逐條 grep 本 change 寫入的 canonical citation（FR-044、FR-093、FR-092、FR-095、FR-061、FR-051、兩則新 AC、SC-004W、issue／PR 編號），確認每一條都可被個別定位。final merge 後才更新 `specs/STATUS.md`。
