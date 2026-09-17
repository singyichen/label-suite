# 任務清單：task-detail-export-history-redownload（issue #772）

> **Apply 前硬閘（兩道，互不替代）**：先執行 `openspec validate --changes --no-interactive` 取得 **OpenSpec schema validation** 結果，再執行 `scripts/check-sdd.sh` 取得 **Project SDD lint** 結果。兩者皆通過後必須停止，取得使用者明確確認才可進入 `/opsx:apply`。**design.md「未決事項」Q1–Q7 須先由維護者定案**；任一項被推翻時，先改 delta 與本清單再 apply。**主 session／team lead 是唯一可驗證 Red／實作 evidence 與更新 checkbox 的角色**。
>
> **群組 0 的當前狀態**：propose 階段已在本 worktree 實際執行群組 0 的五項操作（否則 `scripts/check-sdd.sh` 的 `ACTIVE_CHANGE_SPEC` 與 `ACTIVE_CHANGE_STAGE` 必然報錯，無法取得 propose 驗證輸出）。checkbox 一律留空，待主 session 核實後才由主 session 勾選。
>
> **TDD 硬規則**：每一項可觀察行為為一組 Red（`[@senior-qa]`）與實作任務（`[@senior-frontend]`）配對。Red 任務必須先 commit 並執行、留下預期失敗證據，實作任務才能開始；實作任務不得為了讓測試通過而改寫或弱化 Red 契約。
>
> **拆分總則（憲法原則 X）**：本變更只觸及 1 個手寫產品檔 `design/prototype/pages/task-management/task-detail.html`，預估 150–220 行，單一 PR 交付，該 PR 同時承載群組 2 的 archive 與正典回寫（ADR-033 Rule 1）。若 1.6 完成後以 `origin/main` 為基準實測產品檔 diff 超過 300 行，比照 issue #742 先例把 1.4 的純重構移到 Red 提交之前、另成一個先行 PR，不申請豁免。測試檔、`specs/**`、`openspec/**` 與 `design/system/screen-inventory.md` 不計入門檻。
>
> **群組間相依**：0 → 1 → 2 嚴格序列。群組內一律序列執行。
>
> **範圍界線（貫穿全清單）**：重新下載只能經由匯出按鈕所用的同一組組裝函式產生內容；頁面內 `deriveSequence(` 呼叫點維持恰好一次（issue #742 SC-045 原始碼掃描護欄）；不得修改 `task-detail.data.js`、`annotation-results.html` 與共用推導模組；不得修改 issue #742 既有測試檔的任何斷言。

## 0. 前置

**故事目標**（SC-046）：`specs/STATUS.md`、正典檔案位置、正典 frontmatter 與畫面盤點清單四者一致地反映 `task-management-014` 有一個開啟中的 OpenSpec change，使後續的重新下載實作有正確的流程狀態基準。

> **產品檔案（0）**：本組不動任何產品程式。
> **相依與平行性**：0.1 至 0.5 **必須同批提交**。只做 0.1 則 STATUS 仍為 `archived`，觸發 `ACTIVE_CHANGE_STAGE`；只做 0.2 則正典 frontmatter 之 `功能分支` 與 STATUS 分支欄不一致；漏掉 0.4／0.5 則畫面盤點清單指向已不存在的封存路徑。
> **為何要把正典移出 `_archive`**：`scripts/check-sdd.sh` 之 `ACTIVE_CHANGE_SPEC` 只接受 `specs/<module>/NNN-feature/spec.md` 形狀的路徑；且群組 2 須直接回寫正典版本與 Changelog。程序與 issue #742（`ae0b7d34`）、issue #726 之先例相同。

- [x] 0.1 執行 `git mv specs/_archive/014-task-detail specs/task-management/014-task-detail` 把正典自封存區取回；本任務只移動檔案、不改動任何條文。驗證：`test -f specs/task-management/014-task-detail/spec.md` 為真、`test -d specs/_archive/014-task-detail` 為偽，且 `scripts/check-spec-artifacts.sh` exit 0 [@main]
- [x] 0.2 修改 `specs/STATUS.md` 之 task-management-014 列：狀態由 archived 改為 change-open、分支欄改為 feat/772-export-history-redownload、描述欄補記本 change 名稱與 issue #772 並改寫「正典已封存」之敘述，另於變更紀錄區新增一列說明取回原因。驗證：`grep -n 'task-management-014' specs/STATUS.md` 之狀態欄為 change-open [@main]
- [x] 0.3 修改正典 `specs/task-management/014-task-detail/spec.md` 之 frontmatter 功能分支欄為 feat/772-export-history-redownload，使其與 STATUS 分支欄逐字相同；本任務只改 frontmatter、不動任何條文，版本號留待群組 2 一併處理。驗證：`scripts/check-sdd.sh` 之 ACTIVE_CHANGE_SPEC 與 ACTIVE_CHANGE_STAGE 皆為 0 筆 [@main]
- [x] 0.4 修改 `design/system/inventory-manifest.json` 中 task-detail 條目的 specs 欄位，把封存路徑改為取回後的模組路徑。驗證：`scripts/inventory-tests.sh` exit 0 [@main]
- [x] 0.5 執行 `node scripts/gen-screen-inventory.mjs` 重生畫面盤點清單，使其連結與 0.4 的來源一致；產物為生成檔，不手改。驗證：`scripts/check-sdd.sh` 之 INVENTORY_FRESHNESS 為 0 筆 [@main]

## 1. 匯出記錄重新下載（單一 PR）

**故事目標**（SC-046）：`project_leader` 在 annotation-results 的匯出記錄表對任一筆紀錄按下「下載」，拿到的就是當初那份檔案——內容與檔名逐字元相同，不管此刻畫面篩選、匯出對話框選項或介面語言怎麼變；記錄表不會因此多一列。無法保證拿回原檔的紀錄（缺快照、切詞引擎已不可用）明確告知原因、不產檔，而不是默默給一份不一樣的檔案。

> **產品檔案（1）**：`design/prototype/pages/task-management/task-detail.html`
> **最終群組**：否（archive 在群組 2，但群組 1 與群組 2 同屬一個 PR）。
> **相依**：群組 0。1.1／1.2／1.3 的 committed Red 必須全部先於 1.4；1.4 → 1.5 → 1.6 序列執行；1.7 與 1.8 在 1.6 之後。
> **既有種子的限制**：`TASK_DATA.exportHistory` 的三筆種子不帶條件快照，天然就是 AC-1.16「缺快照」的測試對象；AC-1.14／AC-1.15 的原始匯出必須由測試在同一頁面 session 內先實際匯出一次產生，不能拿種子列重新下載。
> **切詞引擎不可用的製造方式**：由 Red 測試在首次匯出之後、重新下載之前，於頁面內移除該引擎的種子資料或其版本欄位，使阻擋成為資料驅動的結果；實作端不得為測試新增任何開關。
> **檔案比對方式**：以 Playwright 的下載事件取得兩次下載的檔名與完整文字內容，逐字串相等比對，不先解析 JSON 再比物件——解析後比對會放過鍵順序與空白差異，而 AC 要求的是逐字元相同。

- [ ] 1.1 撰寫 `design/prototype/tests/task-management/issue-772-export-history-redownload.spec.ts` 之 Red 回歸契約（AC-1.14 與 SC-046）：於 T006 選定頁面篩選後開啟匯出對話框、選 BIOES 與 word 與具版本資訊的切詞引擎完成一次 JSON 匯出並保存下載檔名與全文；接著改變頁面篩選的標記階段與標記員、開啟匯出對話框改選 IOB2 與 character 後取消；再按下匯出記錄表第一列的下載按鈕。斷言第二次下載的檔名與全文與第一次逐字元相同、檔案 metadata 的方案單位與切詞引擎仍為第一次的值、匯出記錄表列數與按下前相同、匯出對話框未開啟、擴張摘要未顯示、頁面篩選仍為改變後的值。驗證：`PW_PORT=8971 corepack pnpm playwright test tests/task-management/issue-772-export-history-redownload.spec.ts` 出現失敗，失敗原因為按下下載後沒有任何下載事件 [@senior-qa]
- [ ] 1.2 於 `design/prototype/tests/task-management/issue-772-export-history-redownload.spec.ts` 補上 AC-1.15 的 Red 契約：於 T010 套用審核員與審核狀態篩選後完成一次 JSON-MIN 匯出並保存檔名與全文；接著清除全部篩選並切換介面語言；再按下該列的下載按鈕。斷言兩次下載的檔名與全文逐字元相同且匯出記錄表列數不變；另以一個 JSON 格式案例斷言同一次匯出內 manifest 的匯出時間與檔名中的時間戳一致。驗證：`PW_PORT=8972 corepack pnpm playwright test tests/task-management/issue-772-export-history-redownload.spec.ts` 仍為紅 [@senior-qa]
- [ ] 1.3 於 `design/prototype/tests/task-management/issue-772-export-history-redownload.spec.ts` 補上 AC-1.16 的 Red 契約：其一為任務載入後既有的無快照種子列其下載按鈕為停用狀態且帶有中文說明、點擊不產生下載事件；其二為 T006 以 word 與具版本資訊的切詞引擎匯出一次後、於頁面內移除該引擎的種子資料，再按下該列下載，斷言畫面出現指明該切詞引擎不可用的中文原因、沒有下載事件、匯出記錄表列數不變。驗證：`PW_PORT=8973 corepack pnpm playwright test tests/task-management/issue-772-export-history-redownload.spec.ts` 仍為紅 [@senior-qa]
- [ ] 1.4 （Green）修改 `design/prototype/pages/task-management/task-detail.html`：依 design.md 裁決 D1 與 D2，把樣本篩選與兩種匯出內容組裝函式的條件來源改為由呼叫端傳入的條件物件，匯出按鈕路徑由畫面狀態建立該物件；同一次匯出只取一次匯出時間並供 metadata 與檔名共用；於條件快照補存審核員篩選、審核狀態篩選、完整精度匯出時間、匯出人與介面語言。本任務不綁定下載按鈕、匯出按鈕的可觀察行為不變。驗證：`PW_PORT=8974 corepack pnpm playwright test tests/task-management/issue-742-seq-tagging-export-dialog.spec.ts tests/task-management/task-detail-annotation-results.spec.ts` exit 0，且 `cd design/prototype && corepack pnpm typecheck` exit 0 [@senior-frontend]
- [ ] 1.5 （Green）修改 `design/prototype/pages/task-management/task-detail.html`：依 FR-021 第 1 至第 5 點與 design.md 裁決 D5，為匯出記錄列的下載按鈕綁定重新下載行為，以該列條件快照作為條件物件呼叫 1.4 的同一組組裝與下載函式；不開啟匯出對話框、不寫入匯出記錄、不回寫頁面篩選、不渲染擴張摘要，且頁面內推導函式呼叫點維持一處。驗證：`PW_PORT=8975 corepack pnpm playwright test tests/task-management/issue-772-export-history-redownload.spec.ts` 之 AC-1.14 與 AC-1.15 案例全綠 [@senior-frontend]
- [ ] 1.6 （Green）修改 `design/prototype/pages/task-management/task-detail.html`：依 FR-021 第 6 點與 design.md 裁決 D3、D4，快照缺失或缺少必要欄位的列其下載按鈕渲染為停用並附中文說明；word 單位紀錄重新下載時以模組回傳的阻擋結果決定是否中止，阻擋時以中文訊息指明切詞引擎不可用、不產檔也不寫入紀錄；一併補上停用說明與阻擋原因的雙語 i18n 鍵。驗證：`PW_PORT=8976 corepack pnpm playwright test tests/task-management/issue-772-export-history-redownload.spec.ts` 全綠，且 `cd design/prototype && corepack pnpm typecheck` exit 0 [@senior-frontend]
- [ ] 1.7 執行 `node scripts/gen-screen-inventory.mjs` 重生畫面盤點清單並單獨提交（產品原型檔已變更）。驗證：`scripts/check-sdd.sh` 之 INVENTORY_FRESHNESS 為 0 筆、`scripts/inventory-tests.sh` exit 0 [@main]
- [ ] 1.8 執行群組 1 回歸並保存證據，須逐一確認 issue #742 的序列匯出契約（含 SC-045 原始碼掃描護欄）、既有匯出記錄與階段指定契約、被排除標記作業之結果列規則與 reviewer 唯讀邊界全數維持通過，並以 `origin/main` 為基準量測產品檔 diff 行數。驗證：`PW_PORT=8977 corepack pnpm playwright test tests/task-management` exit 0；`PW_PORT=8978 corepack pnpm playwright test tests/cross-role` exit 0 [@main]

## 2. Archive 與正典回寫（最終群組）

**故事目標**（SC-046）：正典 `specs/task-management/014-task-detail/spec.md` 自 v3.2.0 回寫為 v3.3.0，新增 FR-021、AC-1.14、AC-1.15、AC-1.16 與 SC-046（不修訂任何既有條文），使「重新下載只看快照、不新增紀錄、拿回原檔」自本版起成為有條文、有驗收情境、有成功標準的契約。

> **產品檔案（0）**：本組不動任何產品程式。
> **最終群組**：是。本組執行 `/opsx:archive` 與正典回寫，並收集 Source-Verify 證據。
> **相依**：群組 1 全部完成且證據已由主 session 核實。
> **版本判定**：**MINOR v3.3.0**（新增 FR／AC／SC、無既有行為被推翻；理由見 proposal.md「規格」節）。回寫前須先 `git fetch` 並確認 `origin/main` 上正典 014 仍為 v3.2.0；若期間有其他 change 已把 014 推進，版本號須依合併目標重算，不得倒退。
> **propose 期乾跑**：已以 `openspec/` 暫存複本乾跑 archive，結果為 `+ 1 added` 與 `Specs updated successfully.`，證明本 delta 為純 ADDED、不會在 archive 階段硬中止。

- [ ] 2.1 執行 `openspec archive task-detail-export-history-redownload --yes`（`openspec` 不在 PATH 時以 `export PATH="$HOME/Library/pnpm:$PATH"` 前置），並確認衍生視圖已合併本次 delta。驗證：`openspec validate --changes --no-interactive` 通過，且本 change 目錄已移入 archive [@main]
- [ ] 2.2 回寫正典 `specs/task-management/014-task-detail/spec.md`：版本 v3.2.0 → v3.3.0，於功能需求區 FR-020 之後新增 FR-021 全條、於使用者故事 1 的 AC-1.13 之後新增 AC-1.14 至 AC-1.16、於成功標準區 SC-045 之後新增 SC-046，最後新增 v3.3.0 Changelog 條目；每處編輯須先斷言錨點恰 1 筆再替換。驗證：`scripts/check-spec-artifacts.sh` exit 0 [@main]
- [ ] 2.3 執行 `node scripts/gen-screen-inventory.mjs` 重生畫面盤點清單並單獨提交——產生器會計入正典的 FR 與 SC 數量，2.2 回寫後 INVENTORY_FRESHNESS 必然轉紅。驗證：`scripts/check-sdd.sh` 為 0 error、`scripts/inventory-tests.sh` exit 0 [@main]
- [ ] 2.4 執行 Source-Verify gate（gate 4）：衍生視圖中每一處正典引用（FR／AC／SC ID、點次、檔案路徑、issue 編號、被改寫的條文子句）必須逐一以 grep 於正典定位，特別是 FR-021 所引用的 FR-010i-1、FR-010i-2 與 FR-020 第 1、3、4 點；並逐項比對衍生視圖與正典兩份文件的 ID 集合，確認無任何 ID 只存在於衍生側。`#### Scenario:` 標題為 AC 與 SC ID 的權威來源，掃描時須同時掃需求標題與情境標題。驗證：全部引用可定位、零 MISSING [@main]

## Pre-merge finalization（NON-CHECKBOX）

合併前必須完成、但不列為 checkbox 的收尾項：

1. PR 描述使用 `Closes #772`（單一 PR 交付完整行為）。若依群組 1 拆分總則拆出先行重構 PR，該 PR 使用 `Refs #772`。
2. `specs/STATUS.md` 之 `task-management-014` 狀態回寫與正典重新封存**排在最終 PR merge 之後**，依 issue #742／PR #786 之先例獨立成一個 PR：狀態自 `change-open` 改回 `archived`、正典移回 `specs/_archive/014-task-detail/`、`design/system/inventory-manifest.json` 的 specs 欄位同步改回封存路徑並重生畫面盤點清單、衍生視圖開頭的正典路徑與版本註記同步改回（維持 Source-Verify 逐項可 grep）。
3. 本 change 與 issue #784 的 015 佇列平行進行；兩者不共用正典，但都會改 `specs/STATUS.md` 的變更紀錄區與 `design/system/screen-inventory.md`，後合併者須 rebase 後重生盤點。
