# 任務清單：task-detail-url-view-state（issue #726）

> **Apply 前硬閘（兩道，互不替代）**：先執行 `openspec validate task-detail-url-view-state --type change`（或等價之 non-strict all-changes command）取得 **OpenSpec schema validation** 結果，再執行 `scripts/check-sdd.sh` 取得 **Project SDD lint** 結果。兩者皆通過後必須停止，取得使用者明確確認才可進入 `/opsx:apply`。**主 session／team lead 是唯一可驗證 Red／Green evidence 與更新 checkbox 的角色**。
>
> **TDD 硬規則**：可觀察行為為一組 Red（`[@senior-qa]`）＋ Green（`[@senior-frontend]`）配對。Red 任務必須先 commit 並執行、留下預期失敗證據，Green 任務才能開始；Green 任務不得為了讓測試通過而改寫或弱化 Red 契約。
>
> **拆分總則（憲法原則 X）**：本變更僅觸及 1 個手寫產品檔案（`design/prototype/pages/task-management/task-detail.html`），預估 diff 120–150 行，低於 300 行上限，故**不拆實作群組**：propose、apply 與 archive 於同一 PR 完成（ADR-033 Rule 1 之預設形態）。測試檔、`specs/**`、`openspec/**` 與 `design/system/screen-inventory.md` 不計入 5 檔上限。
>
> **群組間相依**：群組 0 → 1 → 2 嚴格序列。群組 0 未完成前，`scripts/check-sdd.sh` 的 `ACTIVE_CHANGE_SPEC` 與 `ACTIVE_CHANGE_STAGE` 必然報錯（正典尚在 `specs/_archive/`、STATUS 仍為 `archived`），故 apply 前硬閘的第二道須在群組 0 落地後才會全綠。群組內一律序列執行。
>
> **範圍界線**：`state.activeRunControlTab`（`design/prototype/pages/task-management/task-detail.html:3684`）、匯出對話框分頁 `state.arExportPage`（`:3721`）與成員鑽取分頁 `state.mdPage`（`:3723`，列於 `:7873-7885` 建置）三者**不納入**網址同步（delta FR-019 第 1 點末句）。既有路由參數 `task_id`／`role`／`run_type`／`status` 之語意與讀取邏輯一字不動；`getTrackingContext()`（`:10308`）不得改動；四個 renderer 的輸出（DOM 結構、i18n 鍵、既有 testid）不得改變。

## 0. 前置

**故事目標**（SC-044）：`specs/STATUS.md`、正典檔案位置與正典 frontmatter 三者一致地反映 `task-management-014` 有一個開啟中的 OpenSpec change，使網址檢視狀態的補齊有正確的流程狀態基準。

> **產品檔案（0）**：本組不動任何產品程式。
> **相依與平行性**：0.1、0.2 與 0.3 **必須同批提交**。三者任一單獨落地都會使 `scripts/check-sdd.sh` 報錯——只做 0.1 則 `ACTIVE_CHANGE_SPEC` 仍找不到 proposal frontmatter 指向的 `specs/task-management/014-task-detail/spec.md`；只做 0.2 則 STATUS 仍為 `archived`，觸發 `ACTIVE_CHANGE_STAGE` 的 `incompatible with STATUS` 分支；只做 0.3 則正典 frontmatter 之 `功能分支` 與 STATUS 分支欄不一致，觸發同一檢查的 `contradicts canonical frontmatter` 分支。
> **為何要把正典移出 `_archive`**：`scripts/check-sdd.sh` 之 `ACTIVE_CHANGE_SPEC` 只接受 `specs/<module>/NNN-feature/spec.md` 形狀的路徑（模組段為 `[[:alnum:]-]+`，不含底線，且第三段必須是 `NNN-` 前綴的功能目錄），`specs/_archive/014-task-detail/spec.md` 兩項皆不符；同時 CLAUDE.md「Modify Existing Feature」第 1 步本就要求需直接編輯正典時先自 `specs/_archive/` 取回。本 change 於群組 2 要回寫正典版本與 Changelog，屬「需直接編輯」。

- [x] 0.1 執行 `git mv specs/_archive/014-task-detail specs/task-management/014-task-detail`，將正典自封存區取回；本任務只移動檔案，不改動任何條文。驗證：`test -f specs/task-management/014-task-detail/spec.md` 為真、`test -d specs/_archive/014-task-detail` 為偽，且 `scripts/check-spec-artifacts.sh` exit 0（該腳本不認 `specs/_archive/`，取回後其相對連結必須全數可解析） [@main]
- [x] 0.2 修改 `specs/STATUS.md` 之 `task-management-014` 列：狀態由 `archived` 改為 `change-open`、分支欄改為 feat/726-task-detail-url-view-state、描述欄補記本 change 名稱與 issue #726，並同步改寫「正典已封存」之敘述（該敘述於 0.1 後即為不實；本任務只動這一個檔案）。驗證：`grep -n 'task-management-014' specs/STATUS.md` 之狀態欄為 `change-open`、分支欄為 `feat/726-task-detail-url-view-state` [@main]
- [x] 0.3 修改 `specs/task-management/014-task-detail/spec.md` 之 frontmatter `功能分支` 欄，由 `docs/issue-688-archive-014-review-model` 改為 `feat/726-task-detail-url-view-state`，使其與 `specs/STATUS.md` 分支欄逐字相同；本任務只改 frontmatter，不動任何 FR／AC／SC 條文，版本號留待群組 2 一併處理。驗證：`scripts/check-sdd.sh` 之 `ACTIVE_CHANGE_SPEC` 與 `ACTIVE_CHANGE_STAGE` 皆為 0 筆 [@main]

## 1. 頁籤與清單檢視狀態的網址同步（FR-019 全條）

**故事目標**（SC-044）：使用者在 task-detail 切頁籤、套篩選、排序或翻頁後，網址列即反映當下畫面座標；把該網址貼給同事或自己重開，落地畫面與離開時逐項相同；網址被人為改壞時畫面安靜回退為預設值而非空白或報錯。

> **產品檔案（1）**：`design/prototype/pages/task-management/task-detail.html`
> **最終群組**：否。本組不執行 archive。
> **相依**：群組 0。1.1 的 committed Red 必須先於 1.2；1.2 必須先於 1.3；1.3 必須先於 1.4。
> **為何四個頁籤合為一組**：design.md 的 D1 將 15 個參數收斂為單一 `URL_VIEW_STATE` 對照表、D2 將寫回點收斂為四個 renderer 出口加 `setTabByRole()`，讀寫兩側各只有一個進入點。若依頁籤拆組，第二組起的實作任務只是往同一張表加列，拆組不產生可獨立審查的單位，反而使「讀寫兩側一致」這件事跨 PR 才成立——issue #726 的缺陷本身（`parseRole()` 讀得到 `?tab=` 但沒有任何地方寫回）正是單側修改留下的產物。
> **範圍界線**：不得使用 `history.pushState()`（FR-019 第 2 點）、不得重建 `URLSearchParams` 而須就地增刪既有參數（同點，否則 `task_id` 會被抹掉——`design/prototype/pages/admin/user-management.html:1132-1166` 的既有作法即為重建，不可照抄）、不得為合法值集合另立第二份硬編清單（FR-019 第 4 點末句）、不得在網址放入任何答案內容或跨角色資料（FR-019 第 5 點）、不得複製第二份分頁上界夾制（三處既有夾制位於 `:6999`／`:8436`／`:9372`，design.md D5）。

- [x] 1.1 新增 `design/prototype/tests/task-management/issue-726-url-view-state.spec.ts` 之 Red 契約，覆蓋 delta 四個 `#### Scenario:` 的全部子句：(a) 切換頁籤後網址 `tab` 同步、套用 annotation-results 的階段／狀態／標記員／審核員／審核狀態任一篩選與翻頁後對應 `ar_*` 參數出現、annotation-progress 的 `ap_stage`／`ap_sort`、member-management 的 `mm_page`、work-log 的 `wl_from`／`wl_to`／`wl_stage`／`wl_member`／`wl_page` 各自同步，且回到預設值時該參數自網址消失；(b) 直接以帶完整參數的網址載入，落地後頁籤、四個清單的篩選控制項選取值與分頁位置與手動操作結果逐項相同；(c) 以非法列舉值、非數字頁碼與超出總頁數之頁碼載入，畫面安靜回退為預設值、不空白、不拋錯、不阻擋操作；(d) 以 reviewer 角色直連 `?tab=member-management`，畫面落在 FR-006 允許的頁籤且網址之 `tab` 被改寫為實際渲染的頁籤。另須包含一條跨切面斷言：任一次篩選或翻頁之後 `task_id`／`role`／`run_type` 三個既有路由參數仍在網址上（防「重建 `URLSearchParams`」的失效模式）。導頁類斷言之對象必須為實際請求之網址；同頁寫回類斷言讀 `page.url()`。驗證：`PW_PORT=8961 corepack pnpm playwright test tests/task-management/issue-726-url-view-state.spec.ts` 出現失敗，失敗原因為頁面除 `parseRole()` 既有的 `?tab=` 讀取外無任何網址寫回 [@senior-qa]
- [x] 1.2 （Red 補強）新增原始碼掃描案例，鎖住 design.md D1／D2／D3 之結構性契約，使「用 20 個 handler 各寫一次」或「改用 `pushState`」這類形式上能通過行為斷言的實作被擋下：`history.pushState(` 於 `task-detail.html` 出現次數必須為 0；`history.replaceState(` 之呼叫點必須收斂於單一寫回函式內（該識別字出現次數為 1）；合法值集合不得出現第二份硬編字面量陣列（以既有選項來源識別字之引用計數斷言）。驗證：`PW_PORT=8962 corepack pnpm playwright test tests/task-management/issue-726-url-view-state.spec.ts` 仍為紅，且掃描案例的失敗原因為「`history.replaceState(` 出現次數須為 1、現為 0」 [@senior-qa]
- [x] 1.3 （Green）修改 `design/prototype/pages/task-management/task-detail.html`：依 design.md D1 建立單一 `URL_VIEW_STATE` 對照表（參數名、`state` 欄位、型別、合法值來源、預設值），並據此實作一組 `applyViewStateFromUrl()`／`syncUrlToViewState()`；讀取側掛於 `parseRole()` 尾段（`:4836-4880`）且必須排在 `setTabByRole()`（`:6928-6948`）之後，使 FR-006 的角色守衛先決定實際頁籤；寫回側掛於四個 renderer 出口（`:7414`／`:8207`／`:8497`／`:9433`）與 `setTabByRole()`，不逐一掛在約 20 個篩選 handler 上（每個 handler 既有形態皆為 `state.X = …; render()`，renderer 出口即共同下游）。寫回只用 `history.replaceState()`、就地增刪參數、預設值省略；分頁上界不另行夾制，沿用三處既有 renderer 夾制。驗證：`PW_PORT=8961 corepack pnpm playwright test tests/task-management/issue-726-url-view-state.spec.ts` 全綠，且 `cd design/prototype && corepack pnpm typecheck` exit 0 [@senior-frontend]
- [x] 1.4 依 INVENTORY_FRESHNESS 以 `node scripts/gen-screen-inventory.mjs` 重生 `design/system/screen-inventory.md` 並**單獨提交**（產品原型檔已變更）。驗證：`scripts/check-sdd.sh` 之 `INVENTORY_FRESHNESS` 為 0 筆、`scripts/inventory-tests.sh` exit 0 [@main]
- [x] 1.5 執行群組 1 回歸並保存證據，須逐一確認既有的 task-detail 契約全數維持通過，特別是會被網址改寫波及的四支：`issue-200-task-detail-not-found.spec.ts`（未知 `task_id` 導頁）、`task-detail-annotation-results.spec.ts`（篩選與分頁行為）、`issue-688-reviewer-identity.spec.ts` 與 `issue-596-assignment-readonly.spec.ts`（reviewer 角色邊界）。驗證：`cd design/prototype && corepack pnpm typecheck` exit 0；`PW_PORT=8963 corepack pnpm playwright test tests/task-management` exit 0；`PW_PORT=8964 corepack pnpm playwright test tests/cross-role` exit 0（xrole 正典旅程含 task-detail 導頁，須確認未受網址改寫影響） [@main]

## 2. Archive 與正典回寫（最終群組）

**故事目標**（SC-044）：正典 `specs/task-management/014-task-detail/spec.md` 自 v3.0.1 回寫為 v3.1.0，新增 FR-019、AC-1.8、AC-1.9、AC-2.5 與 SC-044，使 task-detail 的網址檢視狀態自本版起成為有條文、有驗收情境、有成功標準的契約，並補上 UXC-11 在本頁的缺口。

> **產品檔案（0）**：本組不動任何產品程式。
> **最終群組**：是。本組執行 `/opsx:archive` 與正典回寫，並收集 Source-Verify 證據。
> **相依**：群組 1 全部完成且證據已由主 session 核實。

- [ ] 2.1 執行 `openspec archive task-detail-url-view-state --yes`（`openspec` 不在 PATH，需以 `export PATH="$HOME/Library/pnpm:$PATH"` 前置），並確認衍生視圖 `openspec/specs/task-management/014-task-detail/spec.md` 已合併本次 delta。驗證：`openspec validate --changes --no-interactive` 通過，且 `openspec/changes/task-detail-url-view-state/` 已移入 `openspec/changes/archive/` [@main]
- [ ] 2.2 回寫正典 `specs/task-management/014-task-detail/spec.md`：版本 v3.0.1 → v3.1.0（MINOR：只新增、無移除、無語意反轉），於需求規格區 FR-018 之後新增 FR-019 全條、於使用者故事 1 新增 AC-1.8 與 AC-1.9、於使用者故事 2 新增 AC-2.5、於成功標準區 SC-043 之後新增 SC-044，並新增 v3.1.0 Changelog 條目。每處編輯須先斷言錨點恰 1 筆再替換。驗證：`scripts/check-sdd.sh` 與 `scripts/check-spec-artifacts.sh` 皆 exit 0 [@main]
- [ ] 2.3 執行 Source-Verify gate（gate 4）：衍生視圖中每一處正典引用（FR／AC／SC ID、章節、檔案路徑、issue／PR 編號、被改寫的條文子句）必須逐一以 `grep` 於正典定位；並逐項比對衍生視圖與正典兩份文件的 FR／AC／SC ID 集合，確認無任何 ID 只存在於衍生側。`#### Scenario:` 標題為 AC ID 的權威來源，掃描時必須同時掃需求標題與情境標題。另須逐一複驗 delta 與 design.md 內所有 `task-detail.html:<行號>` 引用於**回寫後之當前檔案**仍指向所述內容（群組 1 的實作已改動該檔，行號可能位移）。驗證：全部引用可定位、零 MISSING、行號引用全數命中 [@main]

## Pre-merge finalization（NON-CHECKBOX）

合併前必須完成、但不列為 checkbox 的收尾項：

1. 本 PR 的 issue 關聯使用 `Closes #726`（本 change 於本 PR 內完整交付，無後續群組需要它存活）。
2. `specs/STATUS.md` 之 `task-management-014` 狀態回寫與正典重新封存**排在本 PR merge 之後**，依 #688／PR #706 之先例獨立成一個 PR：狀態自 `change-open` 改回 `archived`、正典由 `specs/task-management/014-task-detail/` 移回 `specs/_archive/014-task-detail/`、衍生視圖內之正典路徑同步改回 `specs/_archive/`（維持 Source-Verify 逐項可 grep）。
3. issue #742 承接的 dataset-017 匯出對話框 companion change **同樣以 014 為正典**，受「一 change 一正典」規則約束。本 change 必須在該 companion change 開立前完成 archive；若 #742 先行開立，本 change 須等待。此為排程約束，不得以併入同一 change 的方式規避。
