# 任務清單：rename-misleading-review-sample-ids

> **Apply 前硬閘（兩道）**：
> 1. 先執行 `openspec validate rename-misleading-review-sample-ids --type change` 與 `scripts/check-sdd.sh`，分別回報 OpenSpec schema validation 與 Project SDD lint；兩者通過後停止，取得使用者明確確認才進入 `/opsx:apply`。
> 2. **PR #823（issue #807）必須先合併進 `main`。** #807 改動 task-detail 同兩列的 `rs` 欄位（`approved` → `finalized`、`modified` → `disputed`），與本變更的改名落在同樣兩行；先合併 #823 再 rebase，可讓兩邊各自保持 PR 單一目的且不需解衝。
>
> 主 session／team lead 是唯一可驗證 Red 證據與更新 checkbox 的角色。

## 1. PR-RENAME-DEMO-SAMPLE-IDS — T016 兩個誤導性樣本 id 改名

> **相依與平行性**：本群組嚴格序列 1.1 → 1.2 → 1.3 → 1.4 → 1.5 → 1.6 → 1.7 → 1.8。1.1 的 committed Red 必須先於 1.2。1.2 至 1.6 五處改名屬同一個字串耦合群，落在同一個 commit，分批提交會使該筆種子查無對應答案而整列不渲染。

**故事目標**：SC-004W、SC-004K — 使示範審核單位的識別碼與現行三態語彙一致，讓 reviewer 視圖橫幅與審核單位狀態推導的示範資料停止教一套已廢止的中間狀態。

- [x] 1.1 新增 Red 測試檔 `design/prototype/tests/annotation/issue-627-demo-sample-id-vocabulary.spec.ts`，斷言 T016 五個審核單位的識別碼皆不含已廢止的中間狀態詞，且兩個新識別碼各自可解析出對應的審核單位與答案種子；先提交此單檔再執行，expected failure 必須只因舊識別碼仍在。（Red `821be240`：3 則皆因舊識別碼仍在而失敗） [@senior-qa]
- [x] 1.2 Green：於 `design/prototype/pages/annotation/annotation-workspace.data.js` 將 T016 答案種子的兩個 map key 與審核種子列的對應欄位同步改名，兩處在同一次編輯內一起改。（Green `1bd4f834`） [@senior-frontend]
- [x] 1.3 於 `design/prototype/pages/task-management/task-detail.data.js` 將兩個樣本清單識別碼與其上方散文敘述同步改名。（`1bd4f834`） [@senior-frontend]
- [x] 1.4 於 `design/prototype/pages/task-management/task-detail.html` 將標記結果種子的兩列識別碼改名，該列其餘欄位維持 PR #823 合併後的值。（`1bd4f834`） [@senior-frontend]
- [x] 1.5 於 `docs/product/example-data/review-flow-official-multi.json` 將對應識別碼改名，使示範資料檔與原型種子保持同一組識別碼。（`1bd4f834`） [@senior-frontend]
- [x] 1.6 於 design prototype 測試目錄下 9 個既有規格檔內將兩個識別碼逐處改名，斷言強度與夾具錨點維持原樣。（`1bd4f834`：9 檔、共 29 處連同產品檔一次改名） [@senior-qa]
- [x] 1.7 回寫正典 `specs/annotation/015-annotation-workspace/spec.md`：同步 AC-4.31 與 AC-4.36 兩條活條文的引文、版本號遞增與 Changelog 新增一列；沿革條文、已撤銷條文、Changelog 舊列與 STATUS 歷史敘事列維持逐字原樣。（`d2cf1313`：正典 v6.4.0，archive 為 `2026-09-18-rename-misleading-review-sample-ids`） [@main]
- [x] 1.8 執行 `pnpm typecheck` 與 `pnpm playwright test` 於 design prototype 目錄，並執行 `scripts/check-sdd.sh`；三者皆須 exit 0，並以全庫搜尋複驗舊識別碼僅殘留於沿革條文與歷史敘事列。（PR #828 CI run `35322781333`：Prototype Type Check 綠、Prototype Playwright `1704 passed`；本機 `scripts/check-sdd.sh` exit 0。全庫搜尋：正典 015 僅剩 AC-4.32／AC-4.37／AC-4.47 沿革條文與 Changelog 列，`specs/STATUS.md` 僅剩歷史敘事列，其餘為既有 archive 與本 change 的 proposal。例外：衍生檢視 `openspec/specs/annotation/015-annotation-workspace/spec.md` 第 26、46 行仍引舊 id，屬 v5.0.0 前即存在的衍生檢視漂移（同段仍保留正典已撤銷的 AC-4.47），不在本 change 範圍） [@main]
