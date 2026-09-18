# 任務清單：task-detail-iaa-precondition-and-override-scope（issue #783 第 1、2 點）

> **Apply 前硬閘（兩道，互不替代）**：先執行 `openspec validate --changes --no-interactive` 取得 **OpenSpec schema validation** 結果，再執行 `scripts/check-sdd.sh` 取得 **Project SDD lint** 結果。兩者皆通過後必須停止，取得維護者明確確認才可進入 `/opsx:apply`。**design.md「未決事項」Q1–Q5 須先由維護者定案**；Q1 若選 (a)，本清單與 delta 須先補一組 Red／Green 與新 FR 再 apply。**主 session／team lead 是唯一可驗證證據與更新 checkbox 的角色**。
>
> **為何沒有 Red／Green 配對**：第 2 點的畫面行為 prototype 已符合，且 `design/prototype/tests/task-management/task-detail-sampling-edit.spec.ts` 已鎖定（design.md D4）；「儲存時拒絕」與資料庫 CHECK 屬後端行為，本 repo 尚無對應後端模組，於後端實作時依 design.md D3 撰寫測試。第 1 點依裁定只改 ADR。
>
> **拆分總則（憲法原則 X）**：0 個 prototype 產品檔案＋1 份 ADR，單一 PR 交付，該 PR 同時承載群組 2 的 archive 與正典回寫（ADR-033 Rule 1）。
>
> **群組間相依**：0 → 1 → 2 嚴格序列。
>
> **套用順序（跨 change）**：issue #791 的 change `task-detail-trial-round-from-waiting` 須先合併；本 change 於其合併後 rebase 再 apply。姊妹 change `dataset-quality-entity-value-alignment`（017）與本 change 無檔案重疊，可獨立 apply。

## 0. 前置

**故事目標**（SC-018）：`specs/STATUS.md`、正典檔案位置與正典 frontmatter 一致地反映 `task-management-014` 有一個開啟中的 OpenSpec change，使 Overview「抽樣設定」覆寫範圍的修訂有正確的流程狀態基準。

> **產品檔案（0）**：本組不動任何產品程式。
> **相依**：issue #791 change 已合併。

- [ ] 0.1 確認正典 014 位置：若 issue #791 合併後已將正典移回 `specs/_archive/014-task-detail/`，依 `113d9e20` 先例以 `git mv` 取回 `specs/task-management/014-task-detail/`，並同步 `design/system/inventory-manifest.json` 路徑與重生畫面盤點清單；若仍在模組目錄則不動。驗證：`test -f specs/task-management/014-task-detail/spec.md` 為真且 `scripts/check-spec-artifacts.sh` exit 0 [@main]
- [ ] 0.2 修改 `specs/STATUS.md` 之 task-management-014 列與正典 014 frontmatter 功能分支欄，使兩者皆為本 change 的 apply 分支名且逐字相同，狀態為 change-open。驗證：`scripts/check-sdd.sh` 之 ACTIVE_CHANGE_SPEC 與 ACTIVE_CHANGE_STAGE 皆為 0 筆 [@main]

## 1. ADR-022 轉換前置條件搬移

**故事目標**（SC-018）：IAA 的非同步計算失敗不再讓任務卡在試標進行中；「IAA 已計算完成」改為進入正式標記前才檢查，使 Overview 顯示的試標完成時點只取決於全員完成。

> **產品檔案（1）**：`docs/adr/022-task-state-machine-location.md`
> **相依**：群組 0；design.md Q1、Q2 已定案。

- [ ] 1.1 修改 `docs/adr/022-task-state-machine-location.md`：依 design.md D1 刪除 dry_run_in_progress 至 waiting_iaa_confirmation 一列中的 IAA calculated，於 waiting_iaa_confirmation 至 official_run_in_progress 一列補上最新試標回合 IAA 計算已結束，依 D2 新增 Amendment 段落說明「計算已結束」之定義與失敗時以重試恢復，並於標頭新增 Amended 日期列註明 issue #783。驗證：`grep -n 'IAA calculated' docs/adr/022-task-state-machine-location.md` 無輸出，且 `grep -n 'issue #783' docs/adr/022-task-state-machine-location.md` 至少命中標頭與 Amendment 段落各一處 [@senior-architect]

## 2. archive 與正典回寫（最終群組）

**故事目標**（SC-018）：正典 014 自 v3.4.0 回寫為 v3.5.0 後，「未校準輸出類型不可覆寫目標門檻」在常數說明、使用者故事、FR、驗證規則與關鍵實體五處一致，且與 `dataset/017-dataset-analysis-detail` FR-043 不再衝突。

> **產品檔案（0）**：本組不動任何產品程式。
> **最終群組**：是。本組執行 `/opsx:archive` 與正典回寫，並收集 Source-Verify 證據。
> **版本判定**：**MINOR v3.5.0**（若維護者依 design.md Q4 改判 PATCH，則為 v3.4.1；若 issue #791 改判 MAJOR v4.0.0，則為 v4.1.0）。回寫前須先 `git fetch` 並確認 `origin/main` 上正典 014 的實際版本，版本號須依合併目標重算，不得倒退。
> **原地改寫，不得追加**：FR-010o-1 以既有 ID 置於 delta 的 `## ADDED Requirements`；回寫正典時必須改寫原條文，正典中該 ID 仍只能出現一次定義。

- [ ] 2.1 執行 `/opsx:archive task-detail-iaa-precondition-and-override-scope`，使衍生檢視收錄 FR-010o-1。驗證：`openspec/changes/archive/` 下出現本 change 之日期前綴目錄，且 `grep -n 'FR-010o-1' openspec/specs/task-management/014-task-detail/spec.md` 命中 [@main]
- [ ] 2.2 修改正典 `specs/task-management/014-task-detail/spec.md`：原地改寫 FR-010o-1；同步改寫常數區 target_agreement_overrides 說明、使用者故事 1 抽樣設定編輯狀態描述與進階輸入驗證兩處、FR-010q 驗證規則與 TaskDetail 實體之覆寫範圍敘述；於 FR-010o-1 對應使用者故事之驗收情境末尾新增 delta 內三條情境並依序配發新 AC 編號；版本改為 v3.5.0 並新增 Changelog 列。驗證：`grep -c 'FR-010o-1' specs/task-management/014-task-detail/spec.md` 中定義行恰一筆，且 `grep -n '任一 `outputs\[\].type` 覆寫' specs/task-management/014-task-detail/spec.md` 無輸出 [@main]
- [ ] 2.3 執行 Source-Verify：衍生檢視與正典中本 change 引入的每一個 FR／AC ID、`dataset/017-dataset-analysis-detail` FR-043 引用、ADR-022 路徑與 issue 編號皆可逐項 `grep` 定位。驗證：`scripts/check-sdd.sh` exit 0 且 `openspec validate --changes --no-interactive` exit 0 [@main]

## 合併前注意

- PR 描述附 `Closes #783` 的條件：姊妹 change `dataset-quality-entity-value-alignment` 亦已合併；否則只寫 `Refs #783`。
- 合併後依 #742／#772 先例另開 PR 將正典 014 歸位 `specs/_archive/`，並將 STATUS 列改回 archived。
