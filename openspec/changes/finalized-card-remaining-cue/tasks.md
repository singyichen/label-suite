# 任務清單：finalized-card-remaining-cue（issue #766）

> **Apply 前硬閘（兩道，互不替代）**：先執行 `openspec validate finalized-card-remaining-cue --type change`（或等價 non-strict all-changes command）取得 **OpenSpec schema validation** 結果，再執行 `scripts/check-sdd.sh` 取得 **Project SDD lint** 結果。兩者皆通過後必須停止，取得使用者明確確認才可進入 `/opsx:apply`。**主 session／team lead 是唯一可驗證 Red／Green evidence 與更新 checkbox 的角色**。
>
> **TDD 硬規則**：三個可觀察行為各為一組 Red（`[@senior-qa]`）＋ Green（`[@senior-frontend]`）配對。Red 任務必須先 commit 並執行、留下預期失敗證據，配對之實作任務才能開始；實作任務不得為了讓測試通過而改寫或弱化 Red 契約。
>
> **拆分總則（憲法原則 X）**：本變更觸及 3 個手寫產品檔案（`annotation-workspace.data.js`、`annotation-list.html`、`annotation-workspace.config.js`，皆位於 `design/prototype/pages/annotation/`），預估 diff 遠低於 300 行，故**不拆實作群組**：propose、apply 與 archive 於同一 PR 完成（ADR-033 Rule 1 之預設形態）。測試檔、`specs/**`、`openspec/**` 與 `design/system/screen-inventory.md` 不計入 5 檔上限。
>
> **群組間相依**：群組 0 → 1 → 2 嚴格序列。群組 1 內之三組配對亦嚴格序列：資料層之單一判定與措辭定義是清單頁與工作區兩個消費端的輸入。群組 2 的正典回寫需群組 1 的行為全部落地後才具備 Source-Verify 依據。
>
> **範圍界線**：FR-073、FR-094、FR-099 條文一字不動；`findNextActionableReviewUnit()` 之簽章與回傳值、`advanceToNextActionableReviewUnit()` 之導覽行為、`list-no-actionable-notice` 之 testid 與觸發條件皆不得改變；dashboard `快速審核` 不得因本變更改變任何行為；定稿卡內不得新增任何 `button`；FR-082 之已撤銷 testid 與樣式類別不得重用。
>
> **排程**：本 change 為 2026-09-16 盤點 W2 第一棒，先於 issue #583；兩者同搶正典 015 之 Changelog 與版號，須堆疊不並行。

## 0. 前置

**故事目標**（SC-004Y）：`specs/STATUS.md` 與正典 frontmatter 如實反映 `annotation-015` 有一個開啟中的 OpenSpec change，使定稿卡去向文案之補齊有正確的流程狀態基準。

> **相依與平行性**：0.1 與 0.2 必須同批提交，兩者分開則 `scripts/check-sdd.sh` 的 `ACTIVE_CHANGE_STAGE` 會因分支欄與正典 frontmatter 不一致而報錯。本群組不動任何產品程式。

- [x] 0.1 修改 `specs/STATUS.md`，將 `annotation-015` 之狀態由 in-progress 更新為 change-open、分支欄改為本 change 的分支並填入 change 名稱。驗證：Project SDD lint 之 `ACTIVE_CHANGE_STAGE` 為 0 筆（已隨 propose commit `e3cb13e1` 提交，主 session 於 apply 前以 Project SDD lint 0 error 核實） [@main]
- [x] 0.2 修改 `specs/annotation/015-annotation-workspace/spec.md` 之 frontmatter 功能分支欄，使其與 `specs/STATUS.md` 分支欄一致；本任務只改 frontmatter，不動任何 FR／AC／SC 條文。驗證：Project SDD lint 之 `ACTIVE_CHANGE_STAGE` 為 0 筆（已隨 propose commit `e3cb13e1` 提交，主 session 於 apply 前以 Project SDD lint 0 error 核實） [@main]

## 1. 定稿卡之剩餘可處理量與歸零去向（FR-100 全條）

**故事目標**（SC-004Y）：審核員或仲裁者停在唯讀定稿卡上時，能直接看出自己在本任務上還剩多少可處理單位；歸零時看到與清單空狀態逐字相同的說明，並有一個回到保留篩選清單的連結。

> **產品檔案（3）**：`design/prototype/pages/annotation/annotation-workspace.data.js`、`design/prototype/pages/annotation/annotation-list.html`、`design/prototype/pages/annotation/annotation-workspace.config.js`
> **最終群組**：否。本組不執行 archive。
> **相依**：群組 0。1.1 的 committed Red 必須先於 1.2；1.3 的 committed Red 必須先於 1.4；1.5 的 committed Red 必須先於 1.6。1.2 必須先於 1.3（清單頁之單一來源契約以資料層已匯出之定義為對照對象）。
> **為何三組配對合為一組交付**：三者分屬三個產品檔案但共同構成 FR-100 單一可觀察行為鏈，任一組單獨合併皆無使用者可見效果；合計仍在原則 X 上限內。

- [ ] 1.1 新增 `design/prototype/tests/annotation/issue-766-actionable-units-single-source.spec.ts` 之 Red 契約（FR-100 第 1、3 點、SC-004Z）：對 T014–T017 兩種 run_type 與名冊中每位審核員，資料層須匯出一個回傳本任務可處理審核單位清單之函式，其長度為 0 恰當 `findNextActionableReviewUnit()` 回傳空值，且後者之回傳恆為該清單中順位最小、列舉最前之單位；資料層另須匯出 zh／en 之歸零標題與說明定義，其文字與清單頁目前以 `notice=no_actionable_review` 渲染之 `list-no-actionable-notice` 標題與說明逐字相同。驗證：`PW_PORT=8961 corepack pnpm playwright test tests/annotation/issue-766-actionable-units-single-source.spec.ts` 出現失敗，失敗原因為資料層尚無可處理單位清單函式與歸零措辭定義 [@senior-qa]
- [ ] 1.2 （Green）修改 `design/prototype/pages/annotation/annotation-workspace.data.js`：將 `findNextActionableReviewUnit()` 現有之指派集合建構與逐單位順位判定抽為回傳可處理單位清單之函式並匯出，改由其推導取下一個之結果（簽章與回傳值不變）；另依 `REVIEW_SUMMARY_LABELS` 之形態加入歸零標題與說明之 zh／en 定義並匯出，文字自清單頁逐字搬入。驗證：`PW_PORT=8961 corepack pnpm playwright test tests/annotation/issue-766-actionable-units-single-source.spec.ts` 全綠，且 `PW_PORT=8962 corepack pnpm playwright test tests/dashboard` exit 0 [@senior-frontend]
- [ ] 1.3 新增 `design/prototype/tests/annotation/issue-766-no-actionable-wording-single-source.spec.ts` 之 Red 契約（FR-100 第 3 點、SC-004Z）：歸零標題與說明之 zh 與 en 字面值於原型頁面目錄之全部原始碼中各恰出現 1 次；清單頁以 `role=reviewer` 與 `notice=no_actionable_review` 載入時 `list-no-actionable-notice` 之標題與說明仍與資料層匯出之定義逐字相同，切換 en 後亦然；非 reviewer 或無 notice 時該元素仍為隱藏。驗證：`PW_PORT=8963 corepack pnpm playwright test tests/annotation/issue-766-no-actionable-wording-single-source.spec.ts` 出現失敗，失敗原因為字面值於清單頁與資料層各出現一次而總數為 2 [@senior-qa]
- [ ] 1.4 （Green）修改 `design/prototype/pages/annotation/annotation-list.html`：`renderNoActionableNotice()` 改讀資料層匯出之歸零措辭定義，並移除本頁字典中 zh／en 各兩個重複之歸零鍵；觸發條件、testid 與顯示文字維持原狀。驗證：`PW_PORT=8963 corepack pnpm playwright test tests/annotation/issue-766-no-actionable-wording-single-source.spec.ts` 全綠 [@senior-frontend]
- [ ] 1.5 新增 `design/prototype/tests/annotation/issue-766-finalized-card-remaining-cue.spec.ts` 之 Red 契約，覆蓋 AC-3.57 與 AC-3.58 之全部子句：剩餘量大於 0 時敘述含正確數字且無連結、位置在唯讀說明之後與第一個定稿值之前、不同審核員身分各依其可處理量推導、歸零時標題與說明與清單空狀態逐字相同（zh 與 en）且連結恰 1 個、仲裁者送出使最後一個可處理爭議單位定稿後就地重渲染即為歸零敘述、點擊連結所請求之網址同時帶 FR-081 檢視狀態鍵與身分參數與 `notice=no_actionable_review` 且不帶 `sample_id`、落地頁渲染 `list-no-actionable-notice`、連結為錨點元素且卡內 `button` 數量不增加、定稿送出後未點擊前停留原單位且無任何導頁、FR-082 之已撤銷 testid 與樣式類別為 0 個。導頁類斷言之對象必須為該次導頁所請求之網址而非落地後之 `page.url()`（沿用 AC-4.43 與 AC-3.55 之驗證方式）。每個情境之前提（剩餘量 N 之值、該身分是否具仲裁資格）須於測試內以 `findNextActionableReviewUnit()` 實際讀回確認，不得僅依種子推定。驗證：`PW_PORT=8964 corepack pnpm playwright test tests/annotation/issue-766-finalized-card-remaining-cue.spec.ts` 出現失敗，失敗原因為定稿卡尚無剩餘量敘述；停留原單位與已撤銷出口兩條回歸底線案例於現況即通過 [@senior-qa]
- [ ] 1.6 （Green）修改 `design/prototype/pages/annotation/annotation-workspace.config.js`：`renderFinalizedCard()` 於唯讀說明之後渲染剩餘量敘述，剩餘量取自資料層之可處理單位清單長度；大於 0 時以本檔 zh／en 字典中新增之含數字敘述呈現，歸零時讀資料層匯出之歸零標題與說明並附回清單錨點連結；將無可處理出口之網址組合抽為一處，由該連結與 `advanceToNextActionableReviewUnit()` 共用。驗證：`PW_PORT=8964 corepack pnpm playwright test tests/annotation/issue-766-finalized-card-remaining-cue.spec.ts` 全綠 [@senior-frontend]
- [ ] 1.7 依 INVENTORY_FRESHNESS 以 `node scripts/gen-screen-inventory.mjs` 重生 `design/system/screen-inventory.md` 並**單獨提交**（產品原型檔已變更）。驗證：`scripts/check-sdd.sh` 之 `INVENTORY_FRESHNESS` 為 0 筆 [@main]
- [ ] 1.8 執行群組 1 回歸並保存證據，須逐一確認定稿卡與無可處理出口之既有契約全數維持通過（`issue-596-finalized-card.spec.ts`、`issue-517-post-submit-cta-removed.spec.ts`、`issue-308-finalized-unit-lock.spec.ts`、`issue-719-review-submit-auto-advance.spec.ts`、`issue-750` 系列、`dashboard-quick-review-next-actionable.spec.ts`）。驗證：`cd design/prototype && corepack pnpm typecheck` 與 `PW_PORT=8965 corepack pnpm playwright test tests/annotation tests/dashboard` 皆 exit 0 [@main]

## 2. Archive 與正典回寫（最終群組）

**故事目標**（SC-004Y）：正典 `specs/annotation/015-annotation-workspace/spec.md` 自 v6.2.0 回寫為 v6.3.0，新增 FR-100、AC-3.57、AC-3.58 與 SC-004Z，使定稿卡之剩餘量與歸零去向自本版起成為有條文、有驗收情境、有成功標準的契約。

> **產品檔案（0）**：本組不動任何產品程式。
> **最終群組**：是。本組執行 `/opsx:archive` 與正典回寫，並收集 Source-Verify 證據。
> **相依**：群組 1 全部完成且證據已由主 session 核實。回寫前必須 `git fetch` 並確認 `origin/main` 上正典 015 之版號仍為 v6.2.0；若 issue #583 或其他 change 已先行合併，版號與 Changelog 位置須依合併後之值重算。

- [ ] 2.1 執行 `openspec archive finalized-card-remaining-cue --yes`，並確認衍生視圖 `openspec/specs/annotation/015-annotation-workspace/spec.md` 已合併本次 delta。驗證：CLI 回報 `+ 1` 且 `openspec validate --changes --no-interactive` 通過 [@main]
- [ ] 2.2 回寫正典 `specs/annotation/015-annotation-workspace/spec.md`：版本 v6.2.0 → v6.3.0，於需求規格區 FR-099 之後加入 FR-100 全條、於使用者故事 3 之 AC-3.56 之後加入 AC-3.57 與 AC-3.58、於成功標準區 SC-004Y 之後加入 SC-004Z，並於 Changelog 表首列加入 v6.3.0 條目，條目須明載本版為純新增且未修訂 FR-073／FR-094／FR-099 任何文字。驗證：`scripts/check-sdd.sh` 與 `scripts/check-spec-artifacts.sh` 皆 exit 0 [@main]
- [ ] 2.3 執行 Source-Verify gate（gate 4）：衍生視圖中 FR-100 區塊之每一處正典引用（FR／AC／SC ID、帶點號之條文引用、檔案路徑、issue 編號、testid 與程式識別字）必須逐一以 `grep` 於正典或原型原始碼定位，帶點號之引用（FR-073 第 1、2、5 點，FR-099 第 5、7 點，FR-080 第 2 層，FR-081 檢視狀態鍵）須逐字比對條號內容而非僅確認 ID 存在；四個新增 ID 於正典與衍生視圖皆可定位。驗證：全部引用可定位、零 MISSING [@main]

## Pre-merge finalization（NON-CHECKBOX）

合併前必須完成、但不列為 checkbox 的收尾項：

1. 本 PR 的 issue 關聯使用 `Closes #766`（本 change 於本 PR 內完整交付）。
2. `specs/STATUS.md` 之 `annotation-015` 狀態回寫**排在本 PR merge 之後**，依 #719／PR #759 之先例獨立成一個 PR；狀態值為 `in-progress` 而非 `archived`。
3. 合併後通知 issue #583 之負責 session：正典 015 版號已前進，其 archive 須以合併後之版號重算。
