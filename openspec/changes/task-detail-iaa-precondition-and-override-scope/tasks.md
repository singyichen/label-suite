# 任務清單：task-detail-iaa-precondition-and-override-scope（issue #783 第 1、2 點）

> **Apply 前硬閘（兩道，互不替代）**：先執行 `openspec validate --changes --no-interactive` 取得 **OpenSpec schema validation** 結果，再執行 `scripts/check-sdd.sh` 取得 **Project SDD lint** 結果。兩者皆通過後必須停止，取得維護者明確確認才可進入 `/opsx:apply`。**design.md「未決事項」Q3、Q6–Q9 須先由維護者定案**（Q1、Q2、Q4、Q5 已於 2026-09-18 裁定）；**Q8 未定案前群組 2 的 Red 無從撰寫**。任一項被推翻時，先改 delta 與本清單再 apply。**主 session／team lead 是唯一可驗證 Red／實作 evidence 與更新 checkbox 的角色**。
>
> **TDD 硬規則**：群組 2 的每一項可觀察行為為一組 Red（`[@senior-qa]`）與實作任務（`[@senior-frontend]`）配對。Red 任務必須先 commit 並執行、留下預期失敗證據，實作任務才能開始；實作任務不得為了讓測試通過而改寫或弱化 Red 契約。
>
> **第 2 點為何沒有 Red／Green 配對**：畫面行為 prototype 已符合，且 `design/prototype/tests/task-management/task-detail-sampling-edit.spec.ts` 已鎖定（design.md D4）；「儲存時拒絕」與資料庫 CHECK 屬後端行為，本 repo 尚無對應後端模組，於後端實作時依 design.md D3 撰寫測試。
>
> **拆分總則（憲法原則 X）**：1 個 prototype 產品檔案（`design/prototype/pages/task-management/task-detail.html`；若 Q8 定案為新增示範種子，另加 `task-detail.data.js`）＋1 份 ADR，單一 PR 交付，該 PR 同時承載群組 3 的 archive 與正典回寫（ADR-033 Rule 1）。測試檔、`specs/**`、`openspec/**` 與 `design/system/screen-inventory.md` 不計入門檻。
>
> **群組間相依**：0 → 1 → 2 → 3 嚴格序列。群組內一律序列執行。
>
> **套用順序（跨 change）**：issue #791 的 change `task-detail-trial-round-from-waiting` 須先合併；本 change 於其合併後 rebase 再 apply。兩者都改 `task-detail.html` 的執行控制區、ADR-022 Transition Table、`specs/STATUS.md` 014 列與正典 014 Changelog。姊妹 change `dataset-quality-entity-value-alignment`（017）與本 change 無檔案重疊，可獨立 apply。

## 0. 前置

**故事目標**（SC-018）：`specs/STATUS.md`、正典檔案位置與正典 frontmatter 一致地反映 `task-management-014` 有一個開啟中的 OpenSpec change，使 Overview「抽樣設定」覆寫範圍與待確認頁計算狀態的修訂有正確的流程狀態基準。

> **產品檔案（0）**：本組不動任何產品程式。
> **相依**：issue #791 change 已合併。

- [ ] 0.1 確認正典 014 位置：若 issue #791 合併後已將正典移回 `specs/_archive/014-task-detail/`，依 `113d9e20` 先例以 `git mv` 取回 `specs/task-management/014-task-detail/`，並同步 `design/system/inventory-manifest.json` 路徑與重生畫面盤點清單；若仍在模組目錄則不動。驗證：`test -f specs/task-management/014-task-detail/spec.md` 為真且 `scripts/check-spec-artifacts.sh` exit 0 [@main]
- [ ] 0.2 修改 `specs/STATUS.md` 之 task-management-014 列與正典 014 frontmatter 功能分支欄，使兩者皆為本 change 的 apply 分支名且逐字相同，狀態為 change-open。驗證：`scripts/check-sdd.sh` 之 ACTIVE_CHANGE_SPEC 與 ACTIVE_CHANGE_STAGE 皆為 0 筆 [@main]

## 1. ADR-022 轉換前置條件搬移

**故事目標**（SC-018）：IAA 的非同步計算失敗不再讓任務卡在試標進行中；「最新試標回合 IAA 計算已結束」改為進入正式標記前才檢查，使 Overview 顯示的試標完成時點只取決於全員完成。

> **產品檔案（1）**：`docs/adr/022-task-state-machine-location.md`
> **相依**：群組 0。

- [ ] 1.1 修改 `docs/adr/022-task-state-machine-location.md`：依 design.md D1 刪除 dry_run_in_progress 至 waiting_iaa_confirmation 一列中的 IAA calculated，於 waiting_iaa_confirmation 至 official_run_in_progress 一列補上最新試標回合 `TrialRound.iaa_computation_status = done`，依 D2 新增 Amendment 段落說明 done 之定義（含無法計算）與失敗時以重試恢復，並於標頭新增 Amended 日期列註明 issue #783。驗證：`grep -n 'IAA calculated' docs/adr/022-task-state-machine-location.md` 無輸出、`grep -n 'iaa_computation_status' docs/adr/022-task-state-machine-location.md` 命中 Transition Table，且 `grep -n 'issue #783' docs/adr/022-task-state-machine-location.md` 至少命中標頭與 Amendment 段落各一處 [@senior-architect]

## 2. 待確認頁呈現 IAA 計算狀態

**故事目標**（SC-019）：`project_leader` 在待 IAA 確認頁能分辨「IAA 還在算／算失敗了」與「IAA 算完但未達標」——前者顯示計算中或計算失敗＋重試、暫時不能開始正式標記並看得到原因，後者照 FR-010o-3 不擋；「無法計算」視為算完。

> **產品檔案（1–2）**：`design/prototype/pages/task-management/task-detail.html`（若 Q8 定案為新增示範種子，另加 `design/prototype/pages/task-management/task-detail.data.js`）
> **相依**：群組 1；design.md Q7、Q8 已定案。2.1 的 committed Red 必須先於 2.2。
> **示範狀態的製造方式**：依 design.md Q8 定案結果；未定案前不得開始 2.1。

- [ ] 2.1 撰寫 `design/prototype/tests/task-management/issue-783-iaa-computation-status.spec.ts` 之 Red 回歸契約（FR-010o-4 與 delta 內三條未編號情境）：其一最新回合計算中時 Overview 顯示「IAA 計算中」、IAA pill 與判定 banner 皆無數值與判定、`#publishOfficialRunBtn` 為停用狀態且旁有可見原因文字；其二計算失敗時顯示失敗狀態與「重試計算」按鈕，點擊後顯示「IAA 計算中」、任務狀態維持 `waiting_iaa_confirmation` 且試標回合數不變；其三以 `reviewer` 角色載入計算失敗狀態時畫面上沒有「重試計算」按鈕；其四最新回合為無法計算時畫面上沒有計算中與計算失敗狀態，且 `#publishOfficialRunBtn` 可點擊。驗證：`node $HOME/.cache/node/corepack/v1/pnpm/12.3.4/bin/pnpm.mjs playwright test tests/task-management/issue-783-iaa-computation-status.spec.ts` 出現失敗 [@senior-qa]
- [ ] 2.2 （Green）修改 `design/prototype/pages/task-management/task-detail.html`：依 design.md D5、D6 讓回合紀錄帶計算狀態（缺值視為 done），於 Overview「任務狀態與執行控制」渲染計算中、計算失敗與重試計算（僅 `project_leader`），最新回合非 done 時停用開始正式標記並顯示可見原因文字，新增文案皆含雙語 i18n 鍵；示範狀態依 Q8 定案方式提供。驗證：`node $HOME/.cache/node/corepack/v1/pnpm/12.3.4/bin/pnpm.mjs playwright test tests/task-management/issue-783-iaa-computation-status.spec.ts` exit 0，且 `cd design/prototype && node $HOME/.cache/node/corepack/v1/pnpm/12.3.4/bin/pnpm.mjs typecheck` exit 0 [@senior-frontend]
- [ ] 2.3 執行 `node scripts/gen-screen-inventory.mjs` 重生畫面盤點清單並單獨提交（產品原型檔已變更，須在最後一次 rebase 之後執行）。驗證：`scripts/check-sdd.sh` 之 INVENTORY_FRESHNESS 為 0 筆、`scripts/inventory-tests.sh` exit 0 [@main]
- [ ] 2.4 執行 prototype 全量回歸並保存證據（`playwright test` 不帶路徑之全量，子目錄不算），須確認 issue #791 的執行控制對照表測試、FR-010o-3 未達標不停用開始正式標記的既有測試與跨角色正典旅程全數維持通過。驗證：`cd design/prototype && node $HOME/.cache/node/corepack/v1/pnpm/12.3.4/bin/pnpm.mjs typecheck` exit 0 且 `node $HOME/.cache/node/corepack/v1/pnpm/12.3.4/bin/pnpm.mjs playwright test` exit 0 [@main]

## 3. archive 與正典回寫（最終群組）

**故事目標**（SC-018）：正典 014 自 v4.0.0 回寫為 v4.1.0 後，「未校準輸出類型不可覆寫目標門檻」在常數說明、使用者故事、FR、驗證規則與關鍵實體五處一致、與 `dataset/017-dataset-analysis-detail` FR-043 不再衝突，且待確認頁的 IAA 計算狀態有 FR、實體欄位與驗收情境三處一致的契約。

> **產品檔案（0）**：本組不動任何產品程式。
> **最終群組**：是。本組執行 `/opsx:archive` 與正典回寫，並收集 Source-Verify 證據。
> **相依**：群組 2 全部完成且證據已由主 session 核實。
> **版本判定**：**MINOR v4.1.0**（維護者 2026-09-18 裁定；基準為 issue #791 回寫後的 v4.0.0）。回寫前須先 `git fetch` 並確認 `origin/main` 上正典 014 的實際版本，版本號須依合併目標重算，不得倒退。
> **原地改寫，不得追加**：FR-010o-1 以既有 ID 置於 delta 的 `## ADDED Requirements`；回寫正典時必須改寫原條文，正典中該 ID 仍只能出現一次定義。FR-010o-4 為新 ID，接在 FR-010o-3 之後新增。

- [ ] 3.1 執行 `/opsx:archive task-detail-iaa-precondition-and-override-scope`，使衍生檢視收錄 FR-010o-1 與 FR-010o-4。驗證：`openspec/changes/archive/` 下出現本 change 之日期前綴目錄，且 `grep -n 'FR-010o-4' openspec/specs/task-management/014-task-detail/spec.md` 命中 [@main]
- [ ] 3.2 修改正典 `specs/task-management/014-task-detail/spec.md`：原地改寫 FR-010o-1；同步改寫常數區 target_agreement_overrides 說明、使用者故事 1 抽樣設定編輯狀態描述與進階輸入驗證兩處、FR-010q 驗證規則與 TaskDetail 實體之覆寫範圍敘述；於 FR-010o-3 之後新增 FR-010o-4；於 TrialRound 實體新增 iaa_computation_status 欄位說明；於對應使用者故事之驗收情境末尾新增 delta 內六條情境並依序配發新 AC 編號（FR-010o-4 的三條接續 issue #791 回寫後的最後一個 AC 編號）；版本改為 v4.1.0 並新增 Changelog 列。每處編輯須先斷言錨點恰 1 筆再替換。驗證：`grep -c 'FR-010o-1' specs/task-management/014-task-detail/spec.md` 中定義行恰一筆、`grep -n 'iaa_computation_status' specs/task-management/014-task-detail/spec.md` 命中 TrialRound 實體，且 `grep -n '任一 `outputs\[\].type` 覆寫' specs/task-management/014-task-detail/spec.md` 無輸出 [@main]
- [ ] 3.3 執行 `node scripts/gen-screen-inventory.mjs` 重生畫面盤點清單並單獨提交——產生器會計入正典的 FR 數量，3.2 回寫後 INVENTORY_FRESHNESS 必然轉紅。驗證：`scripts/check-sdd.sh` 為 0 error、`scripts/inventory-tests.sh` exit 0 [@main]
- [ ] 3.4 執行 Source-Verify（gate 4）：衍生檢視與正典中本 change 引入的每一個 FR／AC ID、`dataset/017-dataset-analysis-detail` FR-039 第 4 點、AC-3.16 與 FR-043 引用、ADR-022 路徑與 issue 編號皆可逐項 `grep` 定位。驗證：`scripts/check-sdd.sh` exit 0 且 `openspec validate --changes --no-interactive` exit 0 [@main]

## 合併前注意

- PR 描述附 `Closes #783` 的條件：姊妹 change `dataset-quality-entity-value-alignment` 亦已合併；否則只寫 `Refs #783`。
- 合併後依 #742／#772 先例另開 PR 將正典 014 歸位 `specs/_archive/`，並將 STATUS 列改回 archived。
