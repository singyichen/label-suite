# 任務清單：task-detail-seq-tagging-export-dialog（issue #742）

> **Apply 前硬閘（兩道，互不替代）**：先執行 `openspec validate task-detail-seq-tagging-export-dialog --type change`（或等價之 non-strict all-changes command）取得 **OpenSpec schema validation** 結果，再執行 `scripts/check-sdd.sh` 取得 **Project SDD lint** 結果。兩者皆通過後必須停止，取得使用者明確確認才可進入 `/opsx:apply`。**主 session／team lead 是唯一可驗證 Red／Green evidence 與更新 checkbox 的角色**。
>
> **群組 0 的當前狀態**：propose 階段已在本 worktree 實際執行群組 0 的五項操作（否則 `scripts/check-sdd.sh` 的 `ACTIVE_CHANGE_SPEC` 與 `ACTIVE_CHANGE_STAGE` 必然報錯，無法取得 propose 驗證輸出）。checkbox 一律留空，待主 session 核實後才由主 session 勾選——本清單不由產出者自行勾選。
>
> **TDD 硬規則**：每一項可觀察行為為一組 Red（`[@senior-qa]`）＋ Green（`[@senior-frontend]`）配對。Red 任務必須先 commit 並執行、留下預期失敗證據，Green 任務才能開始；Green 任務不得為了讓測試通過而改寫或弱化 Red 契約。
>
> **拆分總則（憲法原則 X）**：本變更觸及 3 個手寫產品檔案——`design/prototype/pages/task-management/task-detail.data.js`、`design/prototype/pages/task-management/task-detail.panels/annotation-results.html`、`design/prototype/pages/task-management/task-detail.html`——檔案數低於 5 檔上限，但 diff 跨越 300 行門檻，故拆為堆疊 PR 群組：群組 1 交付對話框與字元級路徑，群組 2 交付詞級路徑。群組 1 合併後 OpenSpec change 維持開啟，群組 3 為最終群組並執行 archive。測試檔、`specs/**`、`openspec/**` 與 `design/system/screen-inventory.md` 不計入門檻。
>
> **群組 1 再拆為三個堆疊 PR（2026-09-16 使用者裁定，覆寫原「群組 1 ＝單一 PR-A」之敘述）**：群組 1 完工後實測產品檔 diff 為 **412 行**（以 `origin/main` 為基準；先前回報的 613 行係誤用過期本機 `main`、把已合併的 issue #726 變更一併計入所致），超出門檻 112 行。裁定為**重排順序**而非申請豁免：把純重構與種子資料移到 Red commit **之前**，使前兩個 PR 天然全綠、各自獨立可合——
> **PR-1 `refactor/742-extract-ar-export`**（77 行）：兩顆匯出按鈕的 handler 原為除 format 字串／歷程標籤／toast 鍵外逐字相同的兩份，抽出 `performArExport(format)`。純重構、行為不變，**刻意不帶 `seqOptions` 參數**（那屬 PR-3）。
> **PR-2 `feat/742-t006-span-seed`**（86 行）：任務 1.4 的 T006 種子資料，為既有形狀的超集，既有斷言全數維持成立。
> **PR-3 `feat/742-seq-export-dialog`**（270 行）：Red（1.1–1.3）＋ 對話框骨架（1.5）＋ 字元路徑串接（1.6）。
> 三者皆在 300 行門檻內、皆為單一目的。代價是 rebase 重寫 SHA，本清單內既有的證據引用已逐條更新為新 SHA。
>
> **群組間相依**：0 → 1 → 2 → 3 嚴格序列。群組 0 未落地前，第二道硬閘必然報錯（正典尚在 `specs/_archive/`、STATUS 仍為 `archived`）。群組 2 依賴群組 1 已建立的對話框骨架與選項渲染。群組內一律序列執行。
>
> **範圍界線（貫穿全清單，不重複於各群組）**：序列推導的唯一入口是 `LabelSuiteSpanTaggingExport.deriveSequence()`；任一群組都不得在 task-detail 頁內自行拼接 `B-` / `I-` / `E-` / `S-` / `O` 前綴、不得自行判斷 span 與 token 邊界、不得複製第二份方案轉換表、不得另立第二份選項清單、不得自行檢查切詞引擎欄位是否齊全（阻擋與否一律以模組回傳值為準）。此界線同時由 delta 的 SC-045 情境與群組 1 的靜態掃描 Red 案例把關，不只寫在說明文字。另：不得把匯出選項寫回任務 config、不得修改任何已儲存的 `spans[]` 起訖值、不得改動 `entity_recognition` 任務（T010）既有的匯出欄位與種子資料。

## 0. 前置

**故事目標**（SC-045）：`specs/STATUS.md`、正典檔案位置、正典 frontmatter 與畫面盤點清單四者一致地反映 `task-management-014` 有一個開啟中的 OpenSpec change，使後續的序列匯出實作有正確的流程狀態基準。

> **產品檔案（0）**：本組不動任何產品程式。
> **相依與平行性**：0.1 至 0.5 **必須同批提交**。任一項單獨落地都會使 `scripts/check-sdd.sh` 報錯——只做 0.1 則 STATUS 仍為 `archived`，觸發 `ACTIVE_CHANGE_STAGE` 的 `incompatible with STATUS` 分支；只做 0.2 則正典 frontmatter 之 `功能分支` 與 STATUS 分支欄不一致，觸發同一檢查的 `contradicts canonical frontmatter` 分支；漏掉 0.4／0.5 則畫面盤點清單指向已不存在的封存路徑。
> **為何要把正典移出 `_archive`**：`scripts/check-sdd.sh` 之 `ACTIVE_CHANGE_SPEC` 只接受 `specs/<module>/NNN-feature/spec.md` 形狀的路徑（模組段為 `[[:alnum:]-]+`，不含底線），`specs/_archive/014-task-detail/spec.md` 不符；同時 CLAUDE.md「Modify Existing Feature」第 1 步本就要求需直接編輯正典時先自 `specs/_archive/` 取回。本 change 於群組 3 要回寫正典版本與 Changelog，屬「需直接編輯」。此程序與 `docs/sdd-workflow.md` 所述一致，亦與 2026-09-15 同正典之先例（issue #726）相同。

- [x] 0.1 執行 `git mv specs/_archive/014-task-detail specs/task-management/014-task-detail` 把正典自封存區取回；本任務只移動檔案、不改動任何條文。驗證：`test -f specs/task-management/014-task-detail/spec.md` 為真、`test -d specs/_archive/014-task-detail` 為偽，且 `scripts/check-spec-artifacts.sh` exit 0 [@main]
- [x] 0.2 修改 `specs/STATUS.md` 之 task-management-014 列：狀態由 archived 改為 change-open、分支欄改為 feat/742-seq-tagging-export-dialog、描述欄補記本 change 名稱與 issue #742，並改寫「正典已封存」之敘述（該敘述於 0.1 後即為不實），另於變更紀錄區新增一列說明取回原因。驗證：`grep -n 'task-management-014' specs/STATUS.md` 之狀態欄為 change-open、分支欄為 feat/742-seq-tagging-export-dialog [@main]
- [x] 0.3 修改正典 `specs/task-management/014-task-detail/spec.md` 之 frontmatter 功能分支欄為 feat/742-seq-tagging-export-dialog，使其與 STATUS 分支欄逐字相同；本任務只改 frontmatter、不動任何條文，版本號留待群組 3 一併處理。驗證：`scripts/check-sdd.sh` 之 ACTIVE_CHANGE_SPEC 與 ACTIVE_CHANGE_STAGE 皆為 0 筆 [@main]
- [x] 0.4 修改 `design/system/inventory-manifest.json` 中 task-detail 條目的 specs 欄位，把封存路徑改為取回後的模組路徑，使畫面盤點產生器不再指向已不存在的目錄。驗證：`scripts/inventory-tests.sh` exit 0 [@main]
- [x] 0.5 執行 `node scripts/gen-screen-inventory.mjs` 重生畫面盤點清單，使其連結與 0.4 的來源一致；產物為生成檔，不手改。驗證：`scripts/check-sdd.sh` 之 INVENTORY_FRESHNESS 為 0 筆 [@main]

> **主 session 核實紀錄（2026-09-16，群組 0）**：五項於 `ae0b7d34` 同批落地（`483d4296` 為 propose 產物）。逐項複驗：正典已在 `specs/task-management/014-task-detail/spec.md`、封存路徑已不存在；STATUS 之 task-management-014 列狀態為 `change-open`、分支欄為 `feat/742-seq-tagging-export-dialog`；正典 frontmatter 第 2 行與該分支欄逐字相同；畫面盤點來源已指向取回後的模組路徑。`scripts/check-sdd.sh` 之 ACTIVE_CHANGE_SPEC、ACTIVE_CHANGE_STAGE 與 INVENTORY_FRESHNESS 皆 0 筆，`scripts/check-spec-artifacts.sh` 與 `scripts/inventory-tests.sh` 皆 exit 0。

## 1. 匯出對話框、選項來源與字元級序列匯出（PR-A）

**故事目標**（SC-045）：`project_leader` 在 `sequence_tagging` 任務的 annotation-results 按下匯出時，先看到一個能選標註方案與詞元單位的對話框；以預設值匯出得到的檔案自帶方案與單位、不帶任何切詞資訊；同一份標記結果換個方案再匯一次即可，任務設定不因此改變。序列本身由共用模組產生，頁面內沒有第二份轉換邏輯。

> **產品檔案（2）**：`design/prototype/pages/task-management/task-detail.panels/annotation-results.html`、`design/prototype/pages/task-management/task-detail.html`
> **最終群組**：否。本組不執行 archive。
> **相依**：群組 0。1.1／1.2／1.3 的 committed Red 必須全部先於 1.4；1.4 → 1.5 → 1.6 序列執行。
> **為何字元級與詞級要拆兩個 PR**：兩者共用對話框骨架，但詞級另外帶進切詞引擎種子、擴張摘要渲染與阻擋分支，合併後 diff 預估 280–330 行、跨過 300 行門檻。字元級單獨交付即已是完整可驗收的行為（delta AC-1.10 全子句），不依賴任何詞級程式碼，符合「一 PR 一目的」。issue #742 的巡檢留言亦獨立建議相同切法。
> **資料前置**：T006 的 annotation-results 種子目前與 T010 共用 `AR_SAMPLES_NER`，其值為 `{ entities: [{ type, text }] }`、不帶字元 offset，模組無從消費；1.4 依 design.md 裁決 D4 新增 `spans[]` 形狀種子並改指 T006，T010 不動。
>
> **主 session 裁決（2026-09-16，Red 核實後補訂，覆寫本項原敘述）**：本項原寫「文字與起訖值沿用該任務 datasetRecords 既有的權威標記」，經複驗**不可行且會破壞既有回歸**，理由與更正如下。
> **(a) 檔案位置更正**：種子常數與任務對應表都在 `design/prototype/pages/task-management/task-detail.html`（:4225 與 :4305），不在原先標示的資料檔內。群組 1 的手寫產品檔因此是 2 個而非 3 個。
> **(b) 不可沿用 datasetRecords 的文字**：該處 T006 的權威標記是**英文**句子，而既有回歸斷言的是 NER 種子的**中文**句子；換文本會讓多處中文斷言失效。新種子一律沿用既有 NER 種子的中文文本，起訖值由既有實體字串在該文本中的位置推導（逐筆皆為真子字串，已複驗）。
> **(c) 必須保留既有實體欄位**：既有回歸有 **4 處**驅動 T006 並斷言實體形狀的產物——標記分布統計、英文模式的摘要與展開列、JSON-MIN 的實體摘要欄位、以及唯讀結果列的六筆樣本案例。若新種子只有起訖值而拿掉實體欄位，這 4 處全數轉紅，而任務 1.8 要求既有回歸維持通過。故新種子為**既有形狀的超集**：每筆標記保留原實體欄位，另補上字元起訖。匯出的既有分支依標記值形狀分流，超集不改變其走向，既有斷言逐字維持成立。
> **(d) 為何不改把那 4 處斷言改指 T010**：T010 的產出型別不只一種，其舊制型別鍵由第一個命中者決定、並非穩定等同於 T006 的值，改指後多項斷言會漂移；且本清單範圍界線明令不得改動 T010。保留實體欄位是唯一不動 T010、也不改既有測試檔的作法。

- [x] 1.1 撰寫 `design/prototype/tests/task-management/issue-742-seq-tagging-export-dialog.spec.ts` 之 Red 契約（對話框與選擇器）：於 T006 按下匯出後出現對話框且含標註方案與詞元單位兩組選擇器；方案選項恰為 BIO／BIOES／IOB2 且預設選中 BIO、單位選項恰為 character／word 且預設選中 character；單位切到 word 時出現切詞引擎選擇、切回 character 時該選擇消失；於非 `sequence_tagging` 任務（T010）按下匯出時不出現此對話框且既有兩顆匯出按鈕行為不變。驗證：`PW_PORT=8971 corepack pnpm playwright test tests/task-management/issue-742-seq-tagging-export-dialog.spec.ts` 出現失敗，失敗原因為頁面不存在該對話框 [@senior-qa]
- [x] 1.2 於 `design/prototype/tests/task-management/issue-742-seq-tagging-export-dialog.spec.ts` 補上 AC-1.10 的 Red 契約：以預設值匯出後，檔案 metadata 之 `tagging_scheme` 為 BIO、`token_unit` 為 character；檔案不含切詞引擎、引擎版本、`alignment_mode` 與 `expanded_span_count` 任一鍵；畫面無擴張摘要；改選 BIOES 再匯一次可成功且兩份檔案的方案各自為 BIO 與 BIOES；兩次匯出後任務設定物件不含任何方案或單位欄位。斷言必須同時覆蓋 JSON 與 JSON-MIN 兩種格式——JSON-MIN 無 manifest，是最容易漏掉 metadata 的一側。驗證：`PW_PORT=8972 corepack pnpm playwright test tests/task-management/issue-742-seq-tagging-export-dialog.spec.ts` 仍為紅 [@senior-qa]
- [x] 1.3 於 `design/prototype/tests/task-management/issue-742-seq-tagging-export-dialog.spec.ts` 補上鎖住 SC-045 的原始碼掃描 Red 案例，使「行為斷言過得了、但頁面自己寫了一份轉換邏輯」這種失效模式被擋下：頁面內 `deriveSequence` 的呼叫點必須存在且收斂為單一入口；頁面內不得出現 B-／I-／E-／S-／O 前綴的字面量拼接、不得出現第二份方案或單位的硬編陣列（以模組常數識別字之引用計數斷言）；`entity_recognition` 的匯出路徑不得出現該呼叫。驗證：`PW_PORT=8973 corepack pnpm playwright test tests/task-management/issue-742-seq-tagging-export-dialog.spec.ts` 仍為紅，且掃描案例的失敗原因為模組呼叫點出現次數須為 1、現為 0 [@senior-qa]
- [x] 1.4 （Green）修改 `design/prototype/pages/task-management/task-detail.html`：依 design.md 裁決 D4 與上方主 session 裁決，於既有 NER 種子之後新增一組序列標記種子供 T006 使用，文本沿用既有 NER 種子的中文句子、每筆標記保留原有實體欄位並另補字元起訖，再把 T006 的結果來源改指這組新種子；T010 維持原來源不動。驗證：`cd design/prototype && corepack pnpm typecheck` exit 0 [@senior-frontend]
- [x] 1.5 （Green）修改 `design/prototype/pages/task-management/task-detail.panels/annotation-results.html`：在既有匯出區塊之後加入匯出對話框骨架，含標註方案與詞元單位兩組選擇器容器、切詞引擎選擇容器、擴張摘要容器與阻擋提示容器，全部為空殼並預設隱藏，焦點鎖定與 Esc 關閉沿用共用的 modal-focus 機制（design.md 裁決 D6）；本任務只加標記結構，不含任何行為程式碼。驗證：`PW_PORT=8974 corepack pnpm playwright test tests/task-management/issue-742-seq-tagging-export-dialog.spec.ts` 之對話框存在性案例轉綠 [@senior-frontend]
- [x] 1.6 （Green）修改 `design/prototype/pages/task-management/task-detail.html`：於既有共用 script 區塊追加載入序列推導模組（design.md 裁決 D7）；以模組匯出的方案與單位常數渲染兩組選擇器（不得硬編選項）；匯出入口依任務 outputs 是否含 `sequence_tagging` 決定是否先開對話框；字元級路徑呼叫 `deriveSequence` 取得序列，並把 `tagging_scheme` 與 `token_unit` 依 design.md 裁決 D1 寫入 JSON 的 manifest 與 JSON-MIN 的每一列；一併補上對話框與選項標籤的雙語 i18n 鍵。驗證：`PW_PORT=8971 corepack pnpm playwright test tests/task-management/issue-742-seq-tagging-export-dialog.spec.ts` 全綠，且 `cd design/prototype && corepack pnpm typecheck` exit 0 [@senior-frontend]
- [x] 1.7 執行 `node scripts/gen-screen-inventory.mjs` 重生畫面盤點清單並單獨提交（產品原型檔已變更）。驗證：`scripts/check-sdd.sh` 之 INVENTORY_FRESHNESS 為 0 筆、`scripts/inventory-tests.sh` exit 0 [@main]
- [x] 1.8 執行群組 1 回歸並保存證據，須逐一確認既有 task-detail 匯出契約全數維持通過（匯出記錄、階段指定、被排除標記作業之結果列規則、reviewer 唯讀邊界）。驗證：`PW_PORT=8975 corepack pnpm playwright test tests/task-management` exit 0；`PW_PORT=8976 corepack pnpm playwright test tests/cross-role` exit 0 [@main]

> **主 session 核實紀錄（2026-09-16，Red 1.1／1.2／1.3）**：三項的 Red 於 `16b4185d` 單一提交落地，`git show --name-only` 僅一個測試檔 295 行、零產品檔、工作區乾淨、`tasks.md` 未被產出者更動。主 session 獨立重跑 `PW_PORT=8973` 確認 **7 failed／3 passed**，失敗皆為契約性失敗而非載入或選擇器問題：五項因對話框節點不存在而 `toBeVisible()` 逾時，一項為模組呼叫點次數 `Expected: 1 / Received: 0`，一項為模組常數引用計數 `Expected: >= 1 / Received: 0`。三項先天為綠者皆為**前瞻性護欄**而非 Red 斷言：T010 不出現對話框、頁面無標籤前綴字面量、實體匯出分支不呼叫推導函式——三者今日成立且必須在 Green 後仍成立，任一轉紅即代表 Green 越界。

> **主 session 核實紀錄（2026-09-16，Green 1.4／1.5／1.6／1.7）**：四項分屬四個提交——1.4 為 `de53b2b8`（T006`spans[]` 種子，85 ins／1 del）、1.5 為 `c6638c9a`（對話框骨架，annotation-results.html 30 ins／0 del）、1.6 為 `5bf0699e`（串接，task-detail.html 199 ins／41 del）、1.7 為 `da6abdb9`（畫面盤點重生，單檔一行）。主 session 獨立重跑 `PW_PORT=8991` 取得 **10 passed（6.0s）exit 0**，其中三項為 SC-045 原始碼掃描護欄：`deriveSequence` 呼叫點恰為 1、頁面無 `B-`／`I-`／`E-`／`S-` 前綴字面量拼接、選項域由模組常數渲染而非第二份硬編清單；另有一項確認 `entity_recognition` 匯出分支不呼叫推導函式。`corepack pnpm typecheck` exit 0、`scripts/check-sdd.sh` **0 error／20 warning**（INVENTORY_FRESHNESS 0 筆）。

> **主 session 核實紀錄（2026-09-16，任務 1.8）**：本項回歸**抓到一處規格違反並已修掉**。既有回歸 `task-detail-annotation-results.spec.ts` 的 JSON-MIN 案例轉紅，追下去發現 `buildTaskSpecificExportFields()` 把匯出結果欄位的分流鍵寫成任務設定（`taskHasSequenceTaggingOutput()`），但 FR-020 第 6 點明文要求「結果欄位分流仍依 FR-015i 所定『依標記結果實際結構決定』」。修法為改讀標記值本身的結構（`0b885332`）：值帶 `spans[]` 走 FR-020、值帶 `entities[]` 仍走 FR-015i-3；三元式的 fallback 是**承重的**而非防禦性補丁——種子列 NER-004／`tony0950127` 的 `value` 實際為 `null`，而 Red 規格的 JSON-MIN 案例不指定階段卻斷言每一列都帶 BIO／character，無 fallback 會讓該列取不到宣告的輸出型別而轉紅。**對話框開關**仍依任務設定分流（FR-020 開頭語句），只有結果欄位分流改依值結構。
>
> 使用者裁定 T006 的 JSON-MIN 列改帶序列欄位：`spans[]` 存在即由 FR-020 承接，既有測試的欄位斷言連同入口路徑一併改寫（`entities_summary` 契約改由 AC-1.13 的 `entity_recognition`／T010 承接）。
>
> **閘門盲點**：`openspec validate` 與 `scripts/check-sdd.sh` 都不可能抓到分流鍵用錯——兩者只讀文件。抓到它的是既有回歸，而且只因為 1.4 的 T006 種子被刻意做成既有形狀的**超集**（同時帶 `entities[]` 與 `spans[]`），兩條路徑才都還有資料可跑。若照最初計畫「T006 只種 `spans[]`」，這個規格違反會靜默通過所有閘門。
>
> **修後證據**（本機並行負載高，改用未被占用的埠，非清單所列的 8975／8976）：`cd design/prototype && corepack pnpm typecheck` exit 0；`PW_PORT=8982 corepack pnpm playwright test tests/task-management` **353 passed（2.8m）exit 0**、零失敗；`PW_PORT=8983 corepack pnpm playwright test tests/cross-role` **34 passed（45.8s）exit 0**，其中 3 個 `✘` 為 `xrole-canonical-journey.spec.ts` 第 391／991／1014 行以 `test.fail()` 標註的已知缺口文件（XROLE-04／20／21），列表報告器印 `✘` 但計入 passed、不影響 exit code，與本次改動無關。清單點名的四項既有匯出契約（匯出記錄、階段指定、被排除標記作業之結果列規則、reviewer 唯讀邊界）皆含在這 353 項之中且全綠。
>
> **並行負載造成的偽紅**：修改前後共跑三輪，失敗集合每輪都不同（第一輪 3 紅含 `task-detail-task-profiles`、第二輪 1 紅為 `issue-395`、第三輪全綠），此為負載型 flake 的指紋。單獨重跑 `PW_PORT=8993 ... issue-395-force-guideline-per-task.spec.ts` 得 **2 passed／exit 0／1.8s**，對照全量並行下的 30s `page.goto` 逾時，確認非回歸。
>
> **連帶的盤點重生**：`0b885332` 動到 `design/prototype/pages` 之後，INVENTORY_FRESHNESS 轉紅（該檢查比對的是 pages 的最後一次提交），故於 `6ff8abe4` 重跑產生器單獨提交；diff 僅為來源 commit 戳記一行，無任何畫面、元件或路由變動。重生後 `scripts/check-sdd.sh` **0 error／20 warning**、`bash scripts/inventory-tests.sh` exit 0。

> **主 session 規模複驗（2026-09-16）**：三個堆疊 PR 各自對**自己的 base**量測（非對 `origin/main` 的累計值）——PR-1 `origin/main...refactor/742-extract-ar-export` 為 1 檔 77 行；PR-2 `refactor/742-extract-ar-export...feat/742-t006-span-seed` 為 1 檔 86 行；PR-3 `feat/742-t006-span-seed...feat/742-seq-export-dialog` 為 2 檔 270 行（task-detail.html 199/41、annotation-results.html 30/0）。三者皆在憲法原則 X 的 5 檔／300 行雙門檻內。整疊對 `origin/main` 的累計值為 415 行，該數字**不對應任何一個 PR 的 diff**，不得用於門檻判定。任務 1.8 的修正提交 `0b885332` 之後重新量測 PR-3，為 2 檔 **275 行**（task-detail.html 204/41、annotation-results.html 30/0），仍在門檻內。

## 2. 詞級序列匯出、對齊擴張摘要與缺版本阻擋（PR-B）

**故事目標**（SC-045）：`project_leader` 把詞元單位切到 word 並指定切詞引擎後，匯出檔自帶引擎與版本、對齊模式與擴張筆數，畫面同時顯示「N 段標記因對齊被擴張」並可展開逐筆比對；選到沒有版本資訊的引擎時匯出被擋下並說明原因、不產檔也不留紀錄；切回 character 一切照舊。擴張只發生在匯出產物，已儲存的標記起訖值一個字元都沒動。

> **產品檔案（2）**：`design/prototype/pages/task-management/task-detail.data.js`、`design/prototype/pages/task-management/task-detail.html`
> **最終群組**：否。本組不執行 archive。
> **相依**：群組 1 全部完成且證據已由主 session 核實。2.1 與 2.2 的 committed Red 必須先於 2.3；2.3 必須先於 2.4。
> **為何切詞引擎用種資料而非實作演算法**：模組本身不切詞，詞級路徑要求呼叫端提供 token 邊界與引擎識別。若在 task-detail 頁實作一套中文斷詞，014 就成了第二個切詞權威，與本清單的範圍界線相違，而斷詞品質並非 issue #742 要示範的東西。詳見 design.md 裁決 D3。
> **阻擋路徑的資料設計**：種入的引擎中必須有一個**刻意缺少版本資訊**，使阻擋成為資料驅動的結果而非程式碼裡的特例分支；阻擋與否一律由模組回傳值決定。

- [x] 2.1 於 `design/prototype/tests/task-management/issue-742-seq-tagging-export-dialog.spec.ts` 補上 AC-1.11 的 Red 契約：單位選 word、指定具備版本資訊的引擎後匯出成功，檔案 metadata 含切詞引擎、引擎版本、`alignment_mode` 與 `expanded_span_count`；畫面出現「N 段標記因對齊被擴張」且 N 與 metadata 的擴張筆數一致；展開後逐筆顯示原始標記文字、擴張後文字與起訖差值；匯出前後該樣本已儲存的 `spans[]` 起訖值完全相同；同一任務改回 character 匯出時該摘要不出現。JSON 與 JSON-MIN 兩側都要斷言。驗證：`PW_PORT=8981 corepack pnpm playwright test tests/task-management/issue-742-seq-tagging-export-dialog.spec.ts` 出現失敗，失敗原因為單位選擇無詞級行為 [@senior-qa]
- [x] 2.2 於 `design/prototype/tests/task-management/issue-742-seq-tagging-export-dialog.spec.ts` 補上 AC-1.12 的 Red 契約：單位選 word 且選到沒有版本資訊的引擎時觸發匯出，畫面顯示可理解的中文原因（明確指出缺的是切詞引擎版本資訊，而非模組回傳的英文診斷字串）、沒有任何檔案被產生、匯出記錄表列數不變；隨後於同一對話框改回 character 匯出成功，該檔不含任何切詞相關欄位且畫面無擴張摘要。另須斷言阻擋狀態下頁面不會對模組回傳值中不存在的序列欄位取值（design.md 裁決 D5 之失效模式）。驗證：`PW_PORT=8982 corepack pnpm playwright test tests/task-management/issue-742-seq-tagging-export-dialog.spec.ts` 仍為紅 [@senior-qa]
- [x] 2.3 （Green）修改 `design/prototype/pages/task-management/task-detail.data.js`：依 design.md 裁決 D3 種入兩個切詞引擎的預先切好結果，其一具備完整引擎與版本識別且其 token 邊界須讓至少一筆標記落在 token 內部以產生擴張，其二刻意不帶版本資訊；不在本檔或任何地方實作斷詞演算法。驗證：`cd design/prototype && corepack pnpm typecheck` exit 0 [@senior-frontend]
- [ ] 2.4 （Green）修改 `design/prototype/pages/task-management/task-detail.html`：單位為 word 時把所選引擎的 token 邊界與引擎識別交給 `deriveSequence`，先判斷回傳是否為阻擋結果再取其餘欄位；成功時把切詞引擎、引擎版本、`alignment_mode` 與 `expanded_span_count` 一併寫入兩種格式，並以模組回傳的擴張清單渲染可展開摘要（擴張筆數為 0 時不渲染、字元級一律不渲染）；阻擋時顯示對應的中文 i18n 訊息、不產檔也不寫入匯出記錄；匯出記錄的條件快照一併保存方案、單位與引擎識別，使重新下載重建的檔案與原檔逐字元相同。驗證：`PW_PORT=8981 corepack pnpm playwright test tests/task-management/issue-742-seq-tagging-export-dialog.spec.ts` 全綠，且 `cd design/prototype && corepack pnpm typecheck` exit 0 [@senior-frontend]
- [ ] 2.5 執行 `node scripts/gen-screen-inventory.mjs` 重生畫面盤點清單並單獨提交。驗證：`scripts/check-sdd.sh` 之 INVENTORY_FRESHNESS 為 0 筆、`scripts/inventory-tests.sh` exit 0 [@main]
- [ ] 2.6 執行群組 2 回歸並保存證據。驗證：`cd design/prototype && corepack pnpm typecheck` exit 0；`PW_PORT=8983 corepack pnpm playwright test tests/task-management` exit 0；`PW_PORT=8984 corepack pnpm playwright test tests/cross-role` exit 0 [@main]

> **主 session 核實紀錄（2026-09-16，Red 2.1／2.2）**：兩項的 Red 於 `9d57245f` 單一提交落地（amend 前為 `8baaf1ec`）。`git show --stat` 確認僅 `design/prototype/tests/task-management/issue-742-seq-tagging-export-dialog.spec.ts` 一個測試檔 322 行、零產品檔、`tasks.md` 未被產出者更動、工作區乾淨。主 session 獨立重跑 `PW_PORT=8996 corepack pnpm playwright test tests/task-management/issue-742-seq-tagging-export-dialog.spec.ts` 取得 **EXIT=1、9 failed／10 passed（1.6m）**：9 個新案例（2.1 五項、2.2 四項）全數失敗，10 個群組 1 既有案例維持全綠。
>
> **失敗原因是契約性的**：全部停在 `#arSeqExportTokenizerSelect` 的 `selectOption` 逾時，call log 顯示該節點已解析為 `<select class="input-select" id="arSeqExportTokenizerSelect"></select>`——**節點存在但沒有任何 option**，即任務 2.3 尚未種入切詞引擎資料，而非選擇器寫錯或頁面載入失敗。這正是清單對 2.1／2.2 所要求的「失敗原因為單位選擇無詞級行為」。（本機並行負載高，改用未被占用的埠，非清單所列的 8981／8982。）
>
> **Green 的邊界已可確定**：`design/prototype/pages/shared/span-tagging-export.js` 既有的 `deriveWordSequence()`、`expandToTokens()`、`missingTokenizerField()` 與 `{ blocked, reason }` 回傳形狀已完整支援詞級與阻擋兩條路徑，故 2.3／2.4 限於種資料與串接，**不得也不需要改動該模組**。
>
> **主 session 退件一次**：產出者的 docblock 原把「詞級路徑確認後對話框不關閉」整條標為可被 senior-frontend 推翻的範圍決策，但 AC-1.12 第三條 AND 明文為「使用者於同一對話框改回單位 `character` 後匯出正常完成」——阻擋路徑不關閉是**規格強制**，照原文放行等同授權 Green 違反 AC-1.12。已要求拆成兩半後 amend：阻擋路徑引 AC-1.12 為不可推翻，成功路徑則標明是本檔依任務 1.5 已落地標記結構（摘要節點是 `#arSeqExportModal > .modal` 的子節點）所作的推論，要推翻須改那份已鎖定的標記而非 Green 單方決定。`git diff 8baaf1ec 9d57245f` 確認 amend **只動註解**，無任何 `expect(`／`await`／`const`／`test(` 行變動，Red 斷言集合逐字未變；產出者 amend 後於 `PW_PORT=8998` 重跑得到相同的 9 failed／10 passed。
>
> 另記：該次 amend 首次被 `scripts/git-hooks/commit-msg` 擋下，因 commit body 逐字引用了中文 AC 條文；改以英文轉述後通過。此為 CLAUDE.md「commit message 全英文」與「OpenSpec 產物繁中」兩條規則交界處的固定摩擦點。

> **切詞引擎識別的來源**：測試鎖定的 `ckip-transformers`／`0.3.4`（具版本，驅動 AC-1.11 成功路徑）與 `jieba`（刻意不帶 version，驅動 AC-1.12 阻擋路徑）出自 design.md 維護者裁決第 4 點，非產出者自擬；任務 2.3 種入的資料必須與此逐字相同，版本字串須以註解標明為原型佔位值。

> **主 session 核實紀錄（2026-09-16，Green 2.3）**：以 `7d82427f` 為準。此提交經兩次 amend（`f7666b1c` → `523c9f32` → `7d82427f`），產出者完成報告所列的 `523c9f32` 已不在分支上，**任何證據一律不得引用該 SHA**。`git show --stat 7d82427f` 確認僅 `design/prototype/pages/task-management/task-detail.data.js` 一檔、新增 75 行、零刪除。為隔離工作區內尚未提交的 2.4 半成品，另以 `git worktree add --detach` 在 `7d82427f` 建乾淨副本重跑：`corepack pnpm typecheck` **exit 0**；`PW_PORT=8991 corepack pnpm playwright test tests/task-management/issue-742-seq-tagging-export-dialog.spec.ts` 為 **9 failed／10 passed（1.6m）**，9 個失敗全部停在 `#arSeqExportTokenizerSelect` 的 `selectOption` 逾時——與 Red 核實紀錄的失敗集合相同，符合預期（2.3 只種資料，把資料渲染成 option 屬 2.4）。
>
> **退件一次（已由 amend 修正）**：`523c9f32` 版只替 NER-001 種 token，產出者以 YAGNI 為由略過 NER-002～006。但 `deriveWordSequence()` 在 `opts.tokens` 缺席時以空陣列處理，會讓該樣本每位標記員的 `tags` 靜默匯出為 `[]`——這是產品缺陷，不是範圍選擇。`7d82427f` 已為六筆樣本全數種入 token，並改以 `tokenRanges()` 將預先切好的 `|` 分隔字串換算成 offset（只加總長度，不決定邊界，未違反 D3「不實作斷詞演算法」）。
>
> **種子內容逐項核對**：六筆種子以 `|` 串接後皆與 `AR_SAMPLES_SEQ_TAGGING` 對應樣本的 `textZh` 逐字相同（長度 29／32／29／34／29／45）。刻意錯位的擴張案例：NER-001 kioleemg12 的 PER (6,9) `張忠謀` → (5,9) `人張忠謀`、LOC (10,12) `台北` → (9,12) `在台北`；ORG (0,3) 對齊不擴張；NER-002 tony0950127 的 ORG (0,2) `鴻海` → (0,4) `鴻海精密`。`jieba` 無 `version` 鍵，`missingTokenizerField()` 於讀取 tokens 前即回傳阻擋。

## 3. Archive 與正典回寫（最終群組）

**故事目標**（SC-045）：正典 `specs/task-management/014-task-detail/spec.md` 自 v3.1.0 回寫為 v3.2.0，新增 FR-020、AC-1.10、AC-1.11、AC-1.12、AC-1.13 與 SC-045（不修訂任何既有條文），使 `sequence_tagging` 的匯出自本版起成為有條文、有驗收情境、有成功標準的契約，並把「推導只有一份」這件事寫進正典而不只寫在實作裡。

> **產品檔案（0）**：本組不動任何產品程式。
> **最終群組**：是。本組執行 `/opsx:archive` 與正典回寫，並收集 Source-Verify 證據。
> **相依**：群組 1 與群組 2 全部完成且證據已由主 session 核實。
> **版本判定（2026-09-16 已裁定）**：**MINOR v3.2.0**。本 delta 最終不修訂任何既有條文，`LEGACY_TASK_TYPE_EXPORT_ENUM`（正典 :44）不含 `sequence_tagging`——`spans[]` 從來不在 FR-015i-3 的承諾範圍內，本版是補空白而非收縮語意，故不構成 BREAKING。理由全文見 design.md 「維護者裁決」第 1 點。

- [ ] 3.1 執行 `openspec archive task-detail-seq-tagging-export-dialog --yes`（`openspec` 不在 PATH，需以 `export PATH="$HOME/Library/pnpm:$PATH"` 前置），並確認衍生視圖已合併本次 delta。驗證：`openspec validate --changes --no-interactive` 通過，且本 change 目錄已移入 archive [@main]
- [ ] 3.2 回寫正典 `specs/task-management/014-task-detail/spec.md`：版本 v3.1.0 → v3.2.0，於功能需求區新增 FR-020 全條、於使用者故事 1 新增 AC-1.10／AC-1.11／AC-1.12／AC-1.13、於成功標準區新增 SC-045、並在規格相依性表補上 dataset-017 匯出推導契約的上游依賴列（現行表只列了 IAA 內容），最後新增 v3.2.0 Changelog 條目。每處編輯須先斷言錨點恰 1 筆再替換。驗證：`scripts/check-sdd.sh` 與 `scripts/check-spec-artifacts.sh` 皆 exit 0 [@main]
- [ ] 3.3 執行 Source-Verify gate（gate 4）：衍生視圖中每一處正典引用（FR／AC／SC ID、章節、檔案路徑、issue 編號、被改寫的條文子句）必須逐一以 grep 於正典定位；跨模組引用另須於 `dataset/017` 正典逐項定位，確認 FR-041 與 FR-042 的條號與點次在本 delta 中被正確引用；並逐項比對衍生視圖與正典兩份文件的 ID 集合，確認無任何 ID 只存在於衍生側。`#### Scenario:` 標題為 AC 與 SC ID 的權威來源，掃描時須同時掃需求標題與情境標題。驗證：全部引用可定位、零 MISSING [@main]

## Pre-merge finalization（NON-CHECKBOX）

合併前必須完成、但不列為 checkbox 的收尾項：

1. 群組 1（PR-A）的 PR 描述使用 `Refs #742`，**不得**使用 `Closes #742`——issue 於群組 2 才完整交付，提前關單會使後續群組失去追蹤錨點。群組 2（PR-B）的 PR 使用 `Closes #742`。
2. `specs/STATUS.md` 之 `task-management-014` 狀態回寫與正典重新封存**排在最終 PR merge 之後**，依 issue #688／PR #706 與 issue #726 之先例獨立成一個 PR：狀態自 `change-open` 改回 `archived`、正典由 `specs/task-management/014-task-detail/` 移回 `specs/_archive/014-task-detail/`、`design/system/inventory-manifest.json` 的 specs 欄位同步改回封存路徑並重生畫面盤點清單、衍生視圖內之正典路徑同步改回 `specs/_archive/`（維持 Source-Verify 逐項可 grep）。
3. `dataset/017` 之 `specs/STATUS.md` 列不因本 change 改動——本 change 不修改 `dataset/017` 任何條文，只引用其 FR-041、FR-042 與四個規格常數。若 archive 時發現 `dataset/017` 的匯出條文與本 delta 出現矛盾，須停止並回報維護者，不得單方面修改任一側。
4. design.md 原「未決事項」第 2～4 點已於 **2026-09-16 問答式全數定案**（見 design.md 「維護者裁決」節），群組 2 不再受其阻擋。落地時須逐字遵守：**(a)** tokenizer metadata 在 JSON 與 JSON-MIN 兩種格式**皆採巢狀** `tokenizer.engine` / `tokenizer.version`，不扁平化——正典 `dataset/017` 的 FR-042 與 AC-5.3／5.4 逐字即巢狀寫法，扁平化會讓群組 3 的 Source-Verify 對不上（既有 `_summary` 扁平化慣例只適用「結果欄位」，tokenizer 屬 metadata，不同類）；**(b)** 匯出 `schema_version` 升 **1.1.0**（相容新增＝MINOR）；**(c)** 切詞引擎種子用真實套件名——`ckip-transformers` / `0.3.4` 驅動 AC-1.11 成功路徑，`jieba` **刻意不給 version 欄位**驅動 AC-1.12 阻擋路徑（jieba 現實中確實不暴露模型版本，語意成立而非人為製造）；版本字串為原型佔位值，資料層須以註解標明。
