# 任務清單：task-detail-trial-round-from-waiting（issue #791）

> **Apply 前硬閘（兩道，互不替代）**：先執行 `openspec validate --changes --no-interactive` 取得 **OpenSpec schema validation** 結果，再執行 `scripts/check-sdd.sh` 取得 **Project SDD lint** 結果。兩者皆通過後必須停止，取得維護者明確確認才可進入 `/opsx:apply`。design.md「未決事項」Q1–Q5、`:10092` 違規與正典取回皆已於 2026-09-18 由維護者裁定；任一項被推翻時，先改 delta 與本清單再 apply。**主 session／team lead 是唯一可驗證 Red／實作 evidence 與更新 checkbox 的角色**。
>
> **群組 0 的當前狀態**：propose 階段已在本分支第一個 commit 實際執行群組 0 的五項操作（否則 `scripts/check-sdd.sh` 的 `ACTIVE_CHANGE_SPEC` 與 `ACTIVE_CHANGE_STAGE` 必然報錯，無法取得 propose 驗證輸出）。checkbox 一律留空，待主 session 核實後才由主 session 勾選。
>
> **TDD 硬規則**：每一項可觀察行為為一組 Red（`[@senior-qa]`）與實作任務（`[@senior-frontend]`）配對。Red 任務必須先 commit 並執行、留下預期失敗證據，實作任務才能開始；實作任務不得為了讓測試通過而改寫或弱化 Red 契約。
>
> **拆分總則（憲法原則 X）**：本變更只觸及 1 個手寫產品檔 `design/prototype/pages/task-management/task-detail.html` 與 1 份 ADR，預估 prototype 60–120 行，單一 PR 交付，該 PR 同時承載群組 3 的 archive 與正典回寫（ADR-033 Rule 1）。測試檔、`specs/**`、`openspec/**` 與 `design/system/screen-inventory.md` 不計入門檻。
>
> **群組間相依**：0 → 1 → 2 → 3 嚴格序列。群組內一律序列執行。
>
> **套用順序（跨 change）**：本 change 須先於 issue #783 的 014 change apply 與合併；#783 的 014 change 於本 change 合併後 rebase。兩者都會改 ADR-022 Transition Table、`specs/STATUS.md` 的 014 列與正典 014 Changelog，平行 apply 必然衝突。
>
> **範圍界線（貫穿全清單）**：不得修改 `annotation/015-annotation-workspace` 正典與其 prototype；不得為測試新增示範捷徑鈕或全域 hook（design.md D1、D3）；不得讓任何按鈕因 IAA 未達標而停用或隱藏（FR-010o-3）。

## 0. 前置

**故事目標**（SC-047）：`specs/STATUS.md`、正典檔案位置、正典 frontmatter 與畫面盤點清單四者一致地反映 `task-management-014` 有一個開啟中的 OpenSpec change，使後續的試標回合規則修訂有正確的流程狀態基準。

> **產品檔案（0）**：本組不動任何產品程式。
> **相依與平行性**：0.1 至 0.5 **必須同批提交**（本分支第一個 commit）。程序與 issue #772 之先例（`113d9e20`）相同。

- [x] 0.1 執行 `git mv specs/_archive/014-task-detail specs/task-management/014-task-detail` 把正典自封存區取回；本任務只移動檔案、不改動任何條文。驗證：`test -f specs/task-management/014-task-detail/spec.md` 為真、`test -d specs/_archive/014-task-detail` 為偽，且 `scripts/check-spec-artifacts.sh` exit 0 [@main]
- [x] 0.2 修改 `specs/STATUS.md` 之 task-management-014 列：狀態由 archived 改為 change-open、分支欄改為 docs/791-trial-round-from-waiting、描述欄補記本 change 名稱與 issue #791，另於變更紀錄區新增一列說明取回原因。驗證：`grep -n 'task-management-014' specs/STATUS.md` 之狀態欄為 change-open [@main]
- [x] 0.3 修改正典 `specs/task-management/014-task-detail/spec.md` 之 frontmatter 功能分支欄為 docs/791-trial-round-from-waiting，使其與 STATUS 分支欄逐字相同；本任務只改 frontmatter、不動任何條文，版本號留待群組 3 一併處理。驗證：`scripts/check-sdd.sh` 之 ACTIVE_CHANGE_SPEC 與 ACTIVE_CHANGE_STAGE 皆為 0 筆 [@main]
- [x] 0.4 修改 `design/system/inventory-manifest.json` 中 task-detail 條目的 specs 欄位，把封存路徑改為取回後的模組路徑。驗證：`scripts/inventory-tests.sh` exit 0 [@main]
- [x] 0.5 執行 `node scripts/gen-screen-inventory.mjs` 重生畫面盤點清單，使其連結與 0.4 的來源一致；產物為生成檔，不手改。驗證：`scripts/check-sdd.sh` 之 INVENTORY_FRESHNESS 為 0 筆 [@main]

## 1. 執行控制按鈕依任務狀態顯示

**故事目標**（SC-047）：`project_leader` 在 Overview「任務狀態與執行控制」看到的執行控制按鈕與任務狀態一一對應——試標進行中沒有「新增試標回合」可按，待 IAA 確認時「開始正式標記」與「新增試標回合 R{n+1}」並列，由他在看過本回合結果後二選一。

> **產品檔案（1）**：`design/prototype/pages/task-management/task-detail.html`
> **相依**：群組 0。1.1 的 committed Red 必須先於 1.2。
> **既有契約改寫**：`RUN_CONTROL_CASES` 的 `dry_run_in_progress` 與 `waiting_iaa_confirmation` 兩列斷言的是舊規則，屬本 Red 的一部分；其餘三列不得改動。

- [x] 1.1 修改 `design/prototype/tests/task-management/task-detail-task-profiles.spec.ts` 為 Red 回歸契約（FR-013 對照表、SC-047 第一段）：`RUN_CONTROL_CASES` 之 `dry_run_in_progress` 列改為斷言 `#publishDryRunBtn` 存在且為停用狀態、文字為「新增試標回合 R2」、按鈕旁可見原因文字「本回合全部提交並完成 IAA 後才能新增下一回合」，且操作列只有這一顆執行控制按鈕；`waiting_iaa_confirmation` 列改為斷言 `#publishOfficialRunBtn` 文字為「開始正式標記」且 `#publishDryRunBtn` 文字為「新增試標回合 R2」、兩者皆可點擊。驗證：`node $HOME/.cache/node/corepack/v1/pnpm/12.3.4/bin/pnpm.mjs playwright test tests/task-management/task-detail-task-profiles.spec.ts` 出現失敗，失敗原因為上述兩列 [@senior-qa]
- [x] 1.2 （Green）修改 `design/prototype/pages/task-management/task-detail.html` 之 `renderPublishActions()`：依 design.md D4，`dry_run_in_progress` 只渲染停用狀態的新增試標回合 R{trial_round+1} 與可見原因文字（含雙語 i18n 鍵），`waiting_iaa_confirmation` 同時渲染開始正式標記與新增試標回合 R{trial_round+1} 兩顆按鈕，兩者皆不依 IAA 結果停用。驗證：`node $HOME/.cache/node/corepack/v1/pnpm/12.3.4/bin/pnpm.mjs playwright test tests/task-management/task-detail-task-profiles.spec.ts` exit 0，且 `cd design/prototype && node $HOME/.cache/node/corepack/v1/pnpm/12.3.4/bin/pnpm.mjs typecheck` exit 0 [@senior-frontend]

## 2. 自待確認發起新回合

**故事目標**（SC-047、SC-042）：每一個 R{n}（`n >= 2`）都只能在前一回合全員完成、任務進入待 IAA 確認之後建立；建立時仍須通過修訂紀錄必填檢查，成功後任務回到試標進行中，且不會在任何人提交之前就跳回待確認。發布回合後停在哪個狀態不再取決於 IAA 結果。

> **產品檔案（1）**：`design/prototype/pages/task-management/task-detail.html`
> **相依**：群組 1。2.1 與 2.2 的 committed Red 必須全部先於 2.3；2.3 → 2.4 序列執行。
> **回合完成的製造方式**：依 design.md D3，以頁面載入前寫入標記端試標進度（全數提交）觸發 `syncStatusFromDryRunProgress()`，或以 `?status=waiting_iaa_confirmation` 直接載入；實作端不得為測試新增任何開關。

- [x] 2.1 撰寫 `design/prototype/tests/task-management/issue-791-trial-round-from-waiting.spec.ts` 之 Red 回歸契約（AC-3.12 之狀態轉換部分、SC-047 第二段與 delta 內三條未編號情境；AC-3.12 的修訂紀錄阻擋依維護者 2026-09-18 裁定移至 issue #838，本任務不斷言，見 design.md「範圍界線」）：其一自 `draft` 發布 R1 後任務狀態為 `dry_run_in_progress` 且不論 R1 腳本 IAA 結果為何皆不直接進入待確認；其二寫入全數提交之試標進度後任務進入 `waiting_iaa_confirmation`，且 R1 腳本 IAA 結果為未達標時同樣進入 `waiting_iaa_confirmation`（FR-010o-3、FR-008a，對應 `:10092` 既有違規）；其三於待確認點擊新增試標回合 R2 成功建立 R2、狀態轉為 `dry_run_in_progress`、操作列的新增試標回合 R3 為停用並顯示原因文字，且在未寫入 R2 進度前重新整理頁面狀態仍為 `dry_run_in_progress`。驗證：`node $HOME/.cache/node/corepack/v1/pnpm/12.3.4/bin/pnpm.mjs playwright test tests/task-management/issue-791-trial-round-from-waiting.spec.ts` 出現失敗 [@senior-qa]
- [x] 2.2 修改 `design/prototype/tests/task-management/task-detail-stage-flow.spec.ts` 為 Red 契約；R1 發布後判定 banner 不得再出現「建議新增下一個試標回合」且操作列的新增回合按鈕為停用；改以寫入全數提交之試標進度使任務進入待確認後，才於同一操作列點擊新增試標回合 R2（不經修訂紀錄表單，理由同 2.1），其後斷言維持原有的樣本池分配與回合歷程內容。驗證：`node $HOME/.cache/node/corepack/v1/pnpm/12.3.4/bin/pnpm.mjs playwright test tests/task-management/task-detail-stage-flow.spec.ts` 出現失敗 [@senior-qa]
- [x] 2.3 （Green）修改 `design/prototype/pages/task-management/task-detail.html` 之 `publishDryRun()` 與 `syncStatusFromDryRunProgress()`：依 design.md D1 與 D2 移除 `:10092` 依 IAA 結果決定狀態的分支，發布任一回合後狀態一律為 `dry_run_in_progress`；回合全員完成後一律轉入 `waiting_iaa_confirmation`，與 IAA 是否達標無關（FR-010o-3）；回合紀錄於發布時不寫入一致性結果，改於進度同步轉入待確認時補寫。驗證：`node $HOME/.cache/node/corepack/v1/pnpm/12.3.4/bin/pnpm.mjs playwright test tests/task-management/issue-791-trial-round-from-waiting.spec.ts` exit 0 [@senior-frontend]
- [x] 2.4 （Green）修改 `design/prototype/pages/task-management/task-detail.html` 之判定 banner 與雙語 i18n 鍵：依 design.md D2，試標進行中說明本回合進行中、待確認且未達標時的下一步說明同時指向開始正式標記與新增試標回合。驗證：`node $HOME/.cache/node/corepack/v1/pnpm/12.3.4/bin/pnpm.mjs playwright test tests/task-management/task-detail-stage-flow.spec.ts` exit 0，且 `cd design/prototype && node $HOME/.cache/node/corepack/v1/pnpm/12.3.4/bin/pnpm.mjs typecheck` exit 0 [@senior-frontend]
- [x] 2.5 執行 `node scripts/gen-screen-inventory.mjs` 重生畫面盤點清單並單獨提交（產品原型檔已變更，須在最後一次 rebase 之後執行）。驗證：`scripts/check-sdd.sh` 之 INVENTORY_FRESHNESS 為 0 筆、`scripts/inventory-tests.sh` exit 0 [@main]
- [x] 2.6 執行 prototype 全量回歸並保存證據（`playwright test` 不帶路徑之全量，不得以子目錄代替），須確認 issue #198 雙擊護欄、issue #505 發布成員閘門、發布風險確認、modal 焦點與跨角色正典旅程全數維持通過。驗證：`cd design/prototype && node $HOME/.cache/node/corepack/v1/pnpm/12.3.4/bin/pnpm.mjs typecheck` exit 0 且 `node $HOME/.cache/node/corepack/v1/pnpm/12.3.4/bin/pnpm.mjs playwright test` exit 0 [@main]

## 3. ADR 修訂、archive 與正典回寫（最終群組）

**故事目標**（SC-047）：ADR-022 狀態機與正典 014 自 v3.3.1 回寫為 v4.0.0 後，「新增試標回合只能自待 IAA 確認發起」成為狀態機白名單、FR 條文、驗收情境與成功標準四處一致的契約。

> **產品檔案（0）**：本組不動任何產品程式。
> **最終群組**：是。本組執行 `/opsx:archive` 與正典回寫，並收集 Source-Verify 證據。
> **相依**：群組 2 全部完成且證據已由主 session 核實。
> **版本判定**：**MAJOR v4.0.0**（維護者 2026-09-18 裁定，理由見 proposal.md Impact 節）。回寫前須先 `git fetch` 並確認 `origin/main` 上正典 014 仍為 v3.3.1；若期間有其他 change 已把 014 推進，版本號須依合併目標重算，不得倒退。
> **原地改寫，不得追加**：FR-013 與 AC-3.12 以既有 ID 置於 delta 的 `## ADDED Requirements`（衍生檢視無此二條，無法 `## MODIFIED`）；回寫正典時必須改寫原條文，正典中每個 ID 仍只能出現一次定義。

- [x] 3.1 修改 `docs/adr/022-task-state-machine-location.md`：Transition Table 新增 waiting_iaa_confirmation 至 dry_run_in_progress 一列（前置條件為專案負責人新增試標回合且通過修訂紀錄必填檢查、新回合清單已建立），回溯轉換限制句補列此轉換，ALLOWED_TRANSITIONS 的 WAITING_IAA_CONFIRMATION 集合加入 DRY_RUN_IN_PROGRESS，並於標頭新增 Amended 日期列註明 issue #791。驗證：`grep -n 'DRY_RUN_IN_PROGRESS' docs/adr/022-task-state-machine-location.md` 於 ALLOWED_TRANSITIONS 區塊內出現兩次 [@senior-architect]
- [x] 3.2 執行 `openspec archive task-detail-trial-round-from-waiting --yes`，並確認衍生視圖已合併本次 delta。驗證：`openspec validate --changes --no-interactive` 通過，且本 change 目錄已移入 archive [@main]
- [x] 3.3 修改正典 `specs/task-management/014-task-detail/spec.md`：版本 v3.3.1 → v4.0.0；原地改寫 Prototype 互動規格按鈕列（dry_run_in_progress 與 waiting_iaa_confirmation 兩項）、AC-3.12 與 FR-013；於使用者故事 3 行為規則「不允許跳階」一句與 SC-004 原地補上 delta FR-013 第 (7) 點的釐清句；於 AC-3.13 之後新增 delta 內三條未編號情境並接續 AC-3.13 依序配發三個新 AC 編號；於 SC-046 之後新增 SC-047；最後新增 v4.0.0 Changelog 條目並標註 BREAKING。每處編輯須先斷言錨點恰 1 筆再替換。驗證：`scripts/check-spec-artifacts.sh` exit 0 [@main]
- [x] 3.4 執行 `node scripts/gen-screen-inventory.mjs` 重生畫面盤點清單並單獨提交——產生器會計入正典的 FR 與 SC 數量，3.3 回寫後 INVENTORY_FRESHNESS 必然轉紅。驗證：`scripts/check-sdd.sh` 為 0 error、`scripts/inventory-tests.sh` exit 0 [@main]
- [x] 3.5 執行 Source-Verify gate（gate 4）：衍生視圖中每一處正典引用（FR／AC／SC ID、點次、檔案路徑、issue 編號、被改寫的條文子句）必須逐一以 grep 於正典定位，特別是 FR-013 所引用的 FR-008a、FR-010f-2、FR-010o-3、FR-010t、FR-017 與 `annotation/015-annotation-workspace` FR-096；同步更新衍生視圖開頭的「目前收錄」清單與正典路徑版本註記。驗證：全部引用可定位、零 MISSING [@main]

## Pre-merge finalization（NON-CHECKBOX）

合併前必須完成、但不列為 checkbox 的收尾項：

1. PR 描述使用 `Closes #791`（單一 PR 交付完整行為）。
2. `specs/STATUS.md` 之 `task-management-014` 狀態回寫與正典重新封存**排在最終 PR merge 之後**，依 issue #742／#772 之先例獨立成一個 PR：狀態自 `change-open` 改回 `archived`、正典移回 `specs/_archive/014-task-detail/`、`design/system/inventory-manifest.json` 的 specs 欄位同步改回封存路徑並重生畫面盤點清單、衍生視圖開頭的正典路徑與版本註記同步改回。若 issue #783 的 014 change 已排隊，改為交棒給該 change、不重新封存。
3. 本 change 與 issue #783 的 014 change 共用正典 014、ADR-022 與 `specs/STATUS.md` 014 列，後合併者須 rebase 後重生盤點。
