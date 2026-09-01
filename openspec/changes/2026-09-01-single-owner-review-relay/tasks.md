# 任務清單：三層單人接力審核模型（issue #596）

> **拆分總則（憲法原則 X）**：本變更觸及 10 個產品檔案，遠超單一 PR 之 5 檔上限，故拆為 **7 組實作 stacked PR ＋ 1 組最終 archive PR**。每組宣告其涵蓋的 FR、觸及的產品檔案、Red 任務與 Green 任務。**只有最終群組執行 `/opsx:archive` 與正典回寫**；群組 1–7 於 OpenSpec change 保持開啟的狀態下先行合併。
>
> **TDD 硬規則**：每個可觀察行為皆為一組 Red（`[@senior-qa]`）＋ Green（實作 agent）配對。Red 任務必須先 commit 並執行、留下預期失敗證據，Green 任務才能開始；Green 任務不得為了讓測試通過而改寫 Red 契約。任務 checkbox 僅由主 session 勾選。
>
> **產品檔案計數**：測試檔、`specs/**`、`openspec/**`、工具設定檔不計入 5 檔上限。
>
> **群組間相依**：群組 1 → 2 → 3 → 4 → 5 → 6 → 7 嚴格序列（群組 1 的推導函式為其餘群組的基礎；群組 6 的例外池同時依賴群組 3 的仲裁 Reject 出口與群組 5 的名冊設定）。群組內未以 `<!-- parallel:start -->` 標註者一律序列執行。

## 1. PR 群組 1 — 015 資料層與常數（FR-051／FR-092 資料面／FR-093）

**故事目標**：同一樣本多位標記員可解析為狀態互不影響的審核單位，三態推導於兩種 `run_type` 完全同源，為其餘群組的介面層提供已綠的資料層基礎（SC-004K）。

> **產品檔案（2）**：`design/prototype/pages/annotation/annotation-workspace.config.js`、`design/prototype/pages/annotation/annotation-workspace.data.js`
> **最終群組**：否。本組不執行 archive。
> **相依**：無前置群組。

- [x] 1.1 撰寫 Red 測試覆蓋 `REVIEW_UNIT_STATUS` 三態推導（`design/prototype/tests/annotation/issue-596-review-unit-status.spec.ts`）：標記員未提交 → `null`；審核員未送出 → `pending`；全部 `approve` → `finalized`；任一 `modify`／`bypass` → `disputed`；爭議全數裁定後 → `finalized`；`exclude_from_dataset` → 非 `finalized`。驗證：執行 `pnpm playwright test tests/annotation/issue-596-review-unit-status.spec.ts` 全數失敗且失敗原因為推導函式尚未支援三態 [@senior-qa]
- [x] 1.2 **（動工後修正檔案位置）** 於 `design/prototype/pages/annotation/annotation-workspace.data.js` 將 `REVIEW_UNIT_STATUS` 改為 `pending | disputed | finalized`，新增 `REVIEW_DECISIONS`、`ARBITRATION_OUTCOMES`、`EXCEPTION_POOL_ACTIONS`、`REVIEW_ASSIGNMENT_GRANULARITY` 四組封閉常數，並於 `window.LabelSuiteAnnotationWorkspaceData` 一併匯出。 [@senior-frontend]
  - **原任務文字寫 `config.js`，與實際架構不符**：`config.js` 是 page-script IIFE，沒有任何出口面（`REVIEW_UNIT_BLOCK` 之類常數為檔內私有），跨檔共用常數一律住在 `data.js` 並經 `window.LabelSuiteAnnotationWorkspaceData` 匯出；`REVIEW_UNIT_STATUS` 本身也定義在 `data.js`，`config.js` 只是呼叫端。放在 `config.js` 的常數是宣告了沒人讀得到的死碼，而 Red 1.1／1.4 打的正是 `window.LabelSuiteAnnotationWorkspaceData.*`。
  - **`MIN_REVIEWERS_DEFAULT` 與 `DISPUTE_CONVERGENCE_RULE` 並不存在具名常數**（全樹只在 `data.js` 註解中以英文字面出現）。真正要移除的是其**行為**——`resolveDisputeConvergence()` 與 `min_reviewers` 種子，兩者都在 `data.js`，屬任務 1.3 範圍。
  - **因檔案位置修正，本任務與 1.3 落在同一檔同一匯出區塊，故合併為一次實作**（分開派工等於兩個 agent 同時改 `data.js`）。
  - 驗證：`node --check` 語法正確，且 `window.LabelSuiteAnnotationWorkspaceData.REVIEW_UNIT_STATUS` 不再含 `approved`／`modified` 兩個狀態值。註：`design/prototype/tsconfig.json` 的 `include` 只涵蓋 `playwright.config.ts` 與 `tests/**/*.ts`，不編譯 prototype 的 `.js` 頁面檔，故 `pnpm typecheck` 對本任務恆為 no-op，不可當作證據。
  - `config.js` 內 `REVIEW_STATE_I18N_KEYS`／`REVIEW_TRACK_ROUTES`／`buildReviewStatusTrack()` 殘留的 `approved`／`modified` 屬 FR-064 五節點狀態軌渲染，由任務 3.6 處理，不在本組。
- [x] 1.3 （Green）於 `design/prototype/pages/annotation/annotation-workspace.data.js` 依 design.md D1 改寫 `getReviewUnitStatus()` 與 `getReviewUnitLane()` 為單一同源推導，並依 D2 落地 `reviewSubmission` / `arbitration` / `exceptionPool` 三組持久化形狀（`bypass` 不寫 `values[outKey]`）。驗證：`pnpm playwright test tests/annotation/issue-596-review-unit-status.spec.ts` 全綠 [@senior-frontend]
- [x] 1.4 撰寫 Red 測試覆蓋 FR-093 審核指派粒度（`design/prototype/tests/annotation/issue-596-review-assignment.spec.ts`）：試標同一樣本的 N 個審核單位指派給同一位審核員；正式標記平均分派且任兩位審核員筆數差 ≤ 1；審核員為該筆標記員時不被排除。驗證：執行該檔全數失敗且失敗原因為指派邏輯尚未實作 [@senior-qa]
- [x] 1.5 （Green）於 `design/prototype/pages/annotation/annotation-workspace.data.js` 實作 FR-093 之指派推導（依 `REVIEW_ASSIGNMENT_GRANULARITY` 分流），並依 design.md D6 讓舊五態值與多筆 `votes[]` 以「重新推導／取最新一筆」相容。**另需一併輸出 `getAssignedReviewUnits(runType, reviewerId, units)`**：`reviewer_ids` 名冊要到群組 5 才進資料層，而接線的群組 4 先行合併，故名冊此刻只能由本資料層的示範種子提供；把名冊查找收在資料層內、只對外露出「這位審核員該審哪些單位」，可讓清單層不必知道名冊，群組 5 落地真實名冊後也只改本檔一處。驗證：`pnpm playwright test tests/annotation/issue-596-review-assignment.spec.ts` 全綠 [@senior-frontend]
- [x] 1.6 執行群組 1 完整回歸：`cd design/prototype && pnpm typecheck && pnpm playwright test`，記錄既有測試中因五態移除而失效的斷言清單，於群組 2 起逐組修正。驗證：typecheck 退出碼 0，playwright 失敗項目全部可歸因於尚未改版的介面層 [@main]
  - **`pnpm typecheck` 對本組為 no-op**（理由同任務 1.2），故僅以 playwright 為證據。
  - **實測結果（PW_PORT=8981、`--workers=2`、11.5m）：`tests/annotation` 666 passed / 52 failed**。52 筆中 7 筆為尚未 Green 的 Red 2.1（`issue-596-review-three-way.spec.ts`），其餘 **45 筆為五態移除造成的既有斷言失效**，全部落在審核／仲裁／狀態軌／示範種子相關檔，無一筆屬資料層自身錯誤。
  - **失效清單（檔案 → 筆數 → 修正歸屬群組）**：

    | 檔案（`design/prototype/tests/annotation/`） | 筆數 | 歸屬 |
    |---|---|---|
    | `issue-452-review-progress-subjects.spec.ts` | 6 | 群組 2 |
    | `annotation-review-flow-demo-seed.spec.ts` | 6 | 群組 7（示範任務改寫） |
    | `issue-450-reviewer-summary-derived.spec.ts` | 4 | 群組 2 |
    | `annotation-review-unit.spec.ts` | 4 | 群組 2 |
    | `annotation-review-status-track.spec.ts` | 4 | 群組 3（FR-064 三節點狀態軌） |
    | `annotation-review-min-reviewers.spec.ts` | 3 | 群組 5（`min_reviewers` 整體移除後應整檔刪除） |
    | `issue-551-reject-vote.spec.ts` | 2 | 群組 2（`退回` 控件移除後應整檔刪除） |
    | `issue-525-review-flow-drawer.spec.ts` | 2 | 群組 3 |
    | `issue-403-finalized-vote-breakdown.spec.ts` | 2 | 群組 3（FR-069 投票表移除後應整檔刪除） |
    | `annotation-list-reviewer.spec.ts` | 2 | 群組 4 |
    | `issue-562-review-action-hint-removed.spec.ts` | 1 | 群組 3 |
    | `issue-550-review-note-tooltip.spec.ts` | 1 | 群組 3（FR-070 文案改寫） |
    | `issue-525-reachable-track.spec.ts` | 1 | 群組 3 |
    | `issue-525-banner-simplify.spec.ts` | 1 | 群組 3 |
    | `issue-457-note-field-removed.spec.ts` | 1 | 群組 2 |
    | `issue-454-arbitration-vote-context.spec.ts` | 1 | 群組 3 |
    | `issue-400-list-finalized-overwrite.spec.ts` | 1 | 群組 4 |
    | `issue-308-finalized-unit-lock.spec.ts` | 1 | 群組 3 |
    | `annotation-workspace-arbitration.spec.ts` | 1 | 群組 3 |
    | `annotation-review-flow-demo-rows.spec.ts` | 1 | 群組 7 |

  - **因此群組 1 的 PR 在 `tests/annotation` 是紅的**，這是本變更拆組的必然結果（資料層先落地、介面層分七組跟上），非缺陷；群組 2／3／4／5／7 各自的收尾任務（2.5／4.5／7.5）負責歸零。合併群組 1 前需向維護者說明此點。
  - **注意四個「應整檔刪除」的檔案**：`issue-551-reject-vote`、`issue-403-finalized-vote-breakdown`、`annotation-review-min-reviewers` 三檔測的是本變更明確廢除的行為（退回、逐位投票表、`min_reviewers`），不應「修好斷言」而應連同其 testid 一併刪除；若只改斷言會把已廢除的模型重新釘回契約。

## 2. PR 群組 2 — 015 審核卡三向決策（FR-014B／FR-016A／FR-044／FR-053 決策面／FR-054／FR-092）

**故事目標**：審核員以三向決策一次完成整個審核單位的判斷，快捷鍵與送出驗證維持全 outKey 覆蓋且不誤觸（SC-004M）。

> **產品檔案（2）**：`design/prototype/pages/annotation/annotation-workspace.html`、`design/prototype/pages/annotation/annotation-workspace.config.js`
> **（動工後修正檔案範圍，理由同任務 1.2）**：審核列決策控件、理由欄與送出阻擋的實作全數位於 page-script `annotation-workspace.config.js`（`buildRowDecisionButtons` config.js:2897、`buildRejectReasonField` config.js:3341、`persistReviewDraft` config.js:2877 一帶）；`annotation-workspace.html` 只有 `#annotationPreview`／`#wsReviewHistory` 兩個靜態掛載點，審核列於執行期動態掛入。Red 契約 `issue-596-review-three-way.spec.ts` 的註解本身即指向 config.js 行號。原宣告漏列 config.js，Green 實作面為 config.js，html 僅於掛載點需要調整時才動。
> **最終群組**：否。
> **相依**：群組 1（三態推導與決策常數）。

- [x] 2.1 撰寫 Red 測試覆蓋三向決策控件（`design/prototype/tests/annotation/issue-596-review-three-way.spec.ts`）：AC-3.51（通過／修正／無法判定三選一、無任何 `退回` 控件、再次點擊取消）、AC-3.53（`修正` 與 `無法判定` 理由必填，`通過` 不出理由欄，缺理由時送出被阻擋）。驗證：執行該檔全數失敗且失敗原因為介面仍為兩向決策 [@senior-qa]
- [x] 2.2 （Green）於 `design/prototype/pages/annotation/annotation-workspace.html` 將審核列決策控件改為 `REVIEW_DECISIONS` 三向渲染（由常數推導，不硬編選項），移除全部 `退回` 控件與 FR-014I 之重標路徑，並依 FR-016A 於 `修正`／`無法判定` 展開必填理由欄。驗證：`pnpm playwright test tests/annotation/issue-596-review-three-way.spec.ts` 全綠 [@senior-frontend]
- [x] 2.3 撰寫 Red 測試覆蓋 AC-3.54 快捷鍵（`design/prototype/tests/annotation/issue-596-review-shortcuts.spec.ts`）：`A` 將全部 outKey 標為通過、`B` 標為無法判定、`R` 無任何作用；焦點在輸入控件或帶修飾鍵時不觸發；`role = annotator` 不觸發。驗證：執行該檔全數失敗且失敗原因為 `B` 未綁定、`R` 仍生效 [@senior-qa]
- [x] 2.4 （Green）於 `design/prototype/pages/annotation/annotation-workspace.html` 實作 FR-054 快捷鍵改版（`A` = 通過、`B` = 無法判定、移除 `R`；`修正` 不綁快捷鍵）。驗證：`pnpm playwright test tests/annotation/issue-596-review-shortcuts.spec.ts` 全綠 [@senior-frontend]
- [x] 2.5 修正群組 1.6 清單中因兩向決策移除而失效的既有測試斷言，並執行 `cd design/prototype && pnpm playwright test tests/annotation`。驗證：`tests/annotation` 全綠 [@senior-qa]
  - **表列範圍已歸零**：`issue-452`（6）／`issue-450`（4）／`annotation-review-unit`（4）／`issue-457`（1）修正完成（四檔合跑 38 passed），`issue-551-reject-vote.spec.ts` 依 1.6 原則整檔刪除。「全綠」驗證條件在拆組設計下於本組不可達（1.6 已言明群組 3／4／7 各自收尾），本組以表列歸零為完成標準。
  - **波次 1 後全套實測（PW_PORT=8981、`--workers=2`、18.8m）：`tests/annotation` 585 passed / 126 failed**。126 筆超出 1.6 基準線的 52 筆——基準線量測於群組 2／5 Green **之前**，Green 落地後（三向決策控件、快捷鍵改版、名冊模型）審核卡／審核員互動的既有測試大量連帶失效，1.6 表未能預見。逐檔失敗數與歸屬：
    - 歸屬群組 3（版面改版對象，3.1–3.6 改完後由 3.7 收尾）：`annotation-review-status-track` 7、`issue-550-review-note-tooltip` 7、`issue-525-review-flow-drawer` 3、`issue-454-arbitration-vote-context` 3、`issue-525-reachable-track` 2、`issue-525-banner-simplify` 2、`issue-403-finalized-vote-breakdown` 2（1.6 明定整檔刪除）、`issue-562-review-action-hint-removed` 1、`issue-308-finalized-unit-lock` 1、`annotation-workspace-arbitration` 1
    - 歸屬群組 4：`annotation-list-reviewer` 2、`issue-400-list-finalized-overwrite` 1
    - 歸屬群組 7：`annotation-review-flow-demo-seed` 6、`annotation-review-flow-demo-workspace` 2、`annotation-review-flow-demo-rows` 1
    - **1.6 未列、由群組 2 轉綠後直接造成**（審核卡／決策控件面，與群組 3 改版對象重疊，故一併掛 3.7 收尾避免重工）：`annotation-workspace-review-card` 29、`annotation-workspace-reviewer` 22、`issue-552-reject-reason-required` 12（整檔測已廢除的退回流程；FR-085 已自需求移除，建議比照 issue-551 整檔刪除）、`issue-520-review-note-once` 7、`annotation-workspace-review-shortcuts` 3、`issue-451-reject-copy-run-type` 3（退回文案，建議整檔刪除）、`issue-453-pre-submit-review-summary` 2、`issue-307-empty-review-unit-gate` 2、`issue-192-dry-run-reject-guard` 2（dry-run 退回 guard，建議整檔刪除）、`issue-470-autosave-indicator-honesty` 1

## 3. PR 群組 3 — 015 仲裁版面、定稿卡與脈絡橫幅（FR-053 定稿鎖定／FR-060／FR-061／FR-064／FR-070／FR-094）

**故事目標**：仲裁版面切換嚴格符合「爭議中 AND 仲裁資格」，仲裁者逐項裁定後單位可推導定稿，定稿後全面唯讀並以責任鏈呈現（SC-004T）。

> **產品檔案（2）**：`design/prototype/pages/annotation/annotation-workspace.html`、`design/prototype/pages/annotation/annotation-workspace.config.js`
> **（動工後修正檔案範圍）**：理由同群組 2——仲裁版面、定稿卡、脈絡橫幅與狀態軌（`REVIEW_STATE_I18N_KEYS`／`REVIEW_TRACK_ROUTES`／`buildReviewStatusTrack()`）皆實作於 `annotation-workspace.config.js`。
> **（任務 3.2 動工後再修，檔案數 2 → 3）**：仲裁 reject 出口需要資料層配合——`design/prototype/pages/annotation/annotation-workspace.data.js` 之 `submitArbitration()` 於 choice 為 reject 時記票並保留理由、不寫 `finalized_value` 與 `finalized_by`（design.md D2 之「欄位不存在」哨兵慣例），狀態推導因此自然維持 `爭議中`。群組 6 的例外池讀寫、處置分流與排除（任務 6.2）完全未被侵入；群組相依說明本就載明群組 6 依賴本組的仲裁 reject 出口。
> **最終群組**：否。
> **相依**：群組 2（三向決策已可產生爭議項）。

- [x] 3.1 撰寫 Red 測試覆蓋 AC-4.54 仲裁版面（`design/prototype/tests/annotation/issue-596-arbitration.spec.ts`）：B 側依來源動態渲染（`modify` → 顯示修正值；`bypass` → 顯示「審核員 Bypass（無法判定）」）、`兩者皆非` 理由必填、送出後該項落入例外池且單位維持 `爭議中`、版面不渲染任何多數決票數元素。驗證：執行該檔全數失敗且失敗原因為仲裁版面仍為投票模型 [@senior-qa]
  - **（動工後修正持久化斷言）**：「落入例外池」的持久化證據修正為 design.md D2 一致形狀——仲裁送出時寫入的是 arbitration 記錄（choice 為 reject＋理由、無 `finalized_value`／`finalized_by`），例外池佇列由未收尾的 reject 記錄推導；D2 的 exceptionPool 記錄（resolver、action、resolved_at）是專案負責人收尾時才寫（任務 6.2），不在仲裁送出時。契約初版誤釘 wsExceptionPool 寫入，於對應實作落地前即修正並於檔頭記錄，修正後強度相同。
- [x] 3.2 （Green）於 `design/prototype/pages/annotation/annotation-workspace.html` 改寫仲裁版面為 FR-061 三出口（採 A／採 B／兩者皆非），移除 `ws-arbitration-quorum`／`ws-arbitration-vote-tally`／`ws-arbitration-vote-reason` 與多數決收斂，並依 FR-060 兩條件（名冊勾選 AND 非當事人）切換版面。驗證：`pnpm playwright test tests/annotation/issue-596-arbitration.spec.ts` 全綠 [@senior-frontend]
- [ ] 3.3 撰寫 Red 測試覆蓋 AC-3.52 純文字定稿卡與 FR-094 微型衝突歷程（`design/prototype/tests/annotation/issue-596-finalized-card.spec.ts`）：已定稿單位不存在任何作答控件（含 `disabled` 者）與送出按鈕；`ws-finalized-trace` 呈現責任鏈單行文字；hover／focus 展開完整帳號且不使用原生 `title`。驗證：執行該檔全數失敗且失敗原因為定稿卡仍渲染 disabled 控件與 `ws-finalized-vote` 投票表 [@senior-qa]
- [ ] 3.4 （Green）於 `design/prototype/pages/annotation/annotation-workspace.html` 實作 FR-094 純文字定稿卡與微型衝突歷程，移除 FR-069 之 `ws-finalized-vote` 逐位投票表（testid 保留不重用）。驗證：`pnpm playwright test tests/annotation/issue-596-finalized-card.spec.ts` 全綠 [@senior-frontend]
- [ ] 3.5 撰寫 Red 測試覆蓋 AC-4.55 脈絡橫幅與狀態軌（`design/prototype/tests/annotation/issue-596-unit-context.spec.ts`）：橫幅不含定稿門檻元素，`.rv-unit-threshold` 不存在，狀態 pill 為三態、抽屜內狀態軌恰 3 個 `role="listitem"`、分支標籤為 `審核通過`／`修正或無法判定`／`仲裁後`；FR-070 tooltip 文案不含「退回」「重新標記」「定稿門檻」「多數決」。驗證：執行該檔全數失敗且失敗原因為橫幅仍渲染門檻 chip 與五節點狀態軌 [@senior-qa]
- [ ] 3.6 （Green）於 `design/prototype/pages/annotation/annotation-workspace.html` 實作 FR-064 橫幅與三節點狀態軌改版，並依 FR-070 改寫審核說明 tooltip 文案。驗證：`pnpm playwright test tests/annotation/issue-596-unit-context.spec.ts` 全綠 [@senior-frontend]
- [ ] 3.7 **（波次 1 後新增收尾任務，依據同 5.6）** 修正/刪除任務 2.5 附錄清單中歸屬群組 3 與「群組 2 轉綠後直接造成」兩節的失效測試：測已廢除行為者（`issue-552`／`issue-451`／`issue-192`／`issue-403` 等退回流程與投票表）比照 issue-551 整檔刪除、勿修斷言；其餘依三向決策／三態／新版面改寫斷言。驗證：`cd design/prototype && pnpm playwright test tests/annotation` 失敗清單僅剩群組 4／7 歸屬檔案 [@senior-qa]

## 4. PR 群組 4 — 015 清單粒度與歷程加詳（FR-055／FR-062／FR-086／FR-093 接線／FR-097）

**故事目標**：審核員清單以審核單位為粒度、三態篩選與指派過濾生效，歷程逐卡呈現可究責的責任鏈（SC-004N）。

> **產品檔案（2）**：`design/prototype/pages/annotation/annotation-list.html`、`design/prototype/pages/shared/annotation-history.js`
> **最終群組**：否。
> **相依**：群組 1（三態推導；FR-093 接線另需其任務 1.5 之 `getAssignedReviewUnits()`）與群組 3（仲裁事件已可產生）。

- [ ] 4.1 撰寫 Red 測試覆蓋 AC-1.26 清單三態篩選（`design/prototype/tests/annotation/issue-596-list-three-status.spec.ts`）：狀態篩選選項恰為 `待審`／`爭議中`／`已定稿`，且選單由常數推導而非硬編；具仲裁資格者於 `爭議中` 列看到 `仲裁`（`list-arbitrate-entry`），已對該單位提交審核者看到 `編輯`。驗證：執行該檔全數失敗且失敗原因為選單仍為五態 [@senior-qa]
- [ ] 4.2 （Green）於 `design/prototype/pages/annotation/annotation-list.html` 實作 FR-055 三態篩選與 FR-060 之 `仲裁` 入口判定。驗證：`pnpm playwright test tests/annotation/issue-596-list-three-status.spec.ts` 全綠 [@senior-frontend]
- [ ] 4.3 撰寫 Red 測試覆蓋 AC-2.16 歷程動作集合與 FR-097 責任鏈加詳（`design/prototype/tests/annotation/issue-596-history-chain.spec.ts`）：`HISTORY_ACTIONS` 九值各有兩兩不同的語意色徽章；舊 `rejected` 事件以中性徽章原樣呈現且不中斷渲染；卡片呈現逐 outKey 前值 → 後值、耗時、具名決策者；未提交草稿不出現（FR-062）。驗證：執行該檔全數失敗且失敗原因為集合仍含 `rejected`、缺 `bypassed`／`exception_resolved`／`excluded` [@senior-qa]
- [ ] 4.4 （Green）於 `design/prototype/pages/shared/annotation-history.js` 實作 FR-086 之九值集合（移除 `rejected`、新增 `bypassed`／`exception_resolved`／`excluded`）與 FR-097 之逐卡責任鏈加詳，並保留集合外值的中性徽章相容路徑。**⚠️ 跨案相依（issue #600）**：該檔於 #600 已新增第三張對照表 `ACTION_LABEL`（動作 → 中文顯示標籤）。新增／移除動作值時 `BADGE_CLASS` 與 `ACTION_LABEL` **必須同步增修**——`actionLabelFor()` 的守衛 `isKnownAction()` 查的是 `BADGE_CLASS`，只加 `BADGE_CLASS` 而漏 `ACTION_LABEL` 會讓查表回傳 `undefined`，徽章直接印出 `undefined` 且不會有任何錯誤。三個新值（`bypassed`／`exception_resolved`／`excluded`）的中文標籤須一併定案。另：`rejected` 自集合移除後，既有歷程事件仍會帶該值，屆時走的是集合外相容路徑（原樣回傳英文），若要讓舊事件仍顯示「審核退回」，`ACTION_LABEL` 需保留 `rejected` 鍵而只從 `ACTIONS`／`BADGE_CLASS` 移除——此取捨**維護者已於 2026-09-01 裁定**（見下）。驗證：`pnpm playwright test tests/annotation/issue-596-history-chain.spec.ts` 全綠 [@senior-frontend]
  - **維護者裁定（2026-09-01）——三個新動作值的中文標籤**：`bypassed` → `無法判定`、`exception_resolved` → `例外收尾`、`excluded` → `已排除`。`bypassed` 沿用審核卡上審核員實際按下的按鈕字樣，使用者在歷程看到的詞就是他按的詞；其餘兩值分別指向「專案負責人在最終例外池做的處置」與 `exclude_from_dataset`。
  - **維護者裁定（2026-09-01）——`rejected` 保留於 `ACTION_LABEL`**：只從 `ACTIONS` 與 `BADGE_CLASS` 移除，`ACTION_LABEL` 留著 `rejected: '審核退回'`。既有 localStorage 舊事件因此仍顯示中文，而 `isKnownAction()` 查的是 `BADGE_CLASS`，徽章自然落到中性樣式——這正好表達「這是舊模型留下的紀錄」。實作成本是多一個鍵、零額外邏輯，且務必不要把 `ACTION_LABEL` 的鍵集合「順手對齊」成與 `BADGE_CLASS` 一致，那會讓舊事件退回顯示英文。
- [ ] 4.5 修正 `tests/annotation/issue-578-history-actions.spec.ts` 等既有歷程測試中因 `rejected` 移除而失效的斷言。驗證：`cd design/prototype && pnpm playwright test tests/annotation` 全綠 [@senior-qa]
- [ ] 4.6 撰寫 Red 測試覆蓋 FR-093 指派結果於清單生效（`design/prototype/tests/annotation/issue-596-list-assignment.spec.ts`）：以審核員身分開啟清單時，僅出現指派給自己的審核單位；未指派給自己的單位不出現在列中（非僅停用按鈕）；同一樣本於 `dry_run` 的多個單位同進同出；`official_run` 下兩位審核員各自開啟清單所見筆數差 ≤ 1 且無交集。驗證：執行該檔全數失敗且失敗原因為清單尚未取用指派結果 [@senior-qa]
- [ ] 4.7 （Green）於 `design/prototype/pages/annotation/annotation-list.html` 以 `data.getAssignedReviewUnits(runType, identity.reviewerId, units)` 過濾審核員檢視的列來源。**本任務存在的理由**：任務 1.5 的指派推導在群組 1–7 中原本沒有任何呼叫端，FR-093 會成為「有實作、沒生效」的需求；接線置於本組是因 `annotation-list.html` 已在本組檔案清單內，不增加觸及檔案數。標記員檢視不套用此過濾（其列來源是自己的標記，與審核指派無關）。驗證：`pnpm playwright test tests/annotation/issue-596-list-assignment.spec.ts` 全綠 [@senior-frontend]

### 原群組 5 — 014 審核設定與審核指派區塊（實作已完成，容器移交 companion change）

> **2026-09-01 範圍收斂（維護者裁示）**：Project SDD lint 限制一個 active change 恰對應一個 canonical spec，本 change 的 `對應 Spec` 收斂為 015。014 側任務移至 [deferred/014-tasks.md](deferred/014-tasks.md)。其中**原群組 5（5.1–5.6）已於 PR #609（波次 1）實作完成且 `tests/task-management` 全綠**——維護者裁定實作保留，其 change 容器與正典 014 回寫由後續 companion change 補齊（proposal 需說明此段實作先於容器的違序）。原群組間相依中的「群組 5」依此改讀。

## 6. PR 群組 6 — 最終例外池收尾畫面（FR-063／FR-095）

**故事目標**：`official_run` 的每一筆定案答案皆可回溯至來源審核單位與定案者，仲裁無法解決的爭議由專案負責人於例外池逐筆收尾，gold 產出邊界維持僅 `official_run` 定稿時產生（SC-004V）。

> **產品檔案（2）**：`design/prototype/pages/annotation/annotation-workspace.html`、`design/prototype/pages/annotation/annotation-workspace.data.js`
> **最終群組**：否。
> **相依**：群組 3（仲裁 `兩者皆非` 出口）與原群組 5 的名冊設定（已於 PR #609 實作完成）；014 側入口區塊（原 6.4–6.7）延後至 companion change，本組以 015 資料層之常數與示範種子先行。

- [ ] 6.1 撰寫 Red 測試覆蓋 AC-4.56／AC-4.57 例外池收尾（`design/prototype/tests/annotation/issue-596-exception-pool.spec.ts`）：`official_run` 提供採 A／採 B／自訂答案／自資料集排除四動作；自訂答案展開該輸出類型的原始作答控件且僅接受合法值；理由未填時阻擋定案；`dry_run` 僅三動作且不存在自訂答案入口與任何作答控件。驗證：執行該檔全數失敗且失敗原因為例外池收尾畫面尚未存在 [@senior-qa]
- [ ] 6.2 於 `design/prototype/pages/annotation/annotation-workspace.data.js` 實作 FR-095 之例外池資料層（`exceptionPool` 讀寫、`EXCEPTION_POOL_ACTIONS` 分流、`exclude_from_dataset` 不進定稿集合）與 FR-063 之定稿值來源記錄。驗證：`pnpm typecheck` 通過且排除項目不出現於定稿集合的單元斷言全綠 [@senior-frontend]
- [ ] 6.3 於 `design/prototype/pages/annotation/annotation-workspace.html` 實作 FR-095 之專案負責人逐筆收尾畫面，自訂答案重用 `OUTPUT_TYPE_REGISTRY` 驅動的作答控件（design.md D4）。驗證：`pnpm playwright test tests/annotation/issue-596-exception-pool.spec.ts` 全綠 [@senior-frontend]
> 原 6.4–6.7（014 側之例外池入口區塊、結案前置條件與權限守衛）已移至 [deferred/014-tasks.md](deferred/014-tasks.md)，隨 companion change 實作。

## 7. PR 群組 7 — 試標歷史回饋與示範任務改寫（FR-096／T016／T017）

**故事目標**：標記員在不退回重標的前提下取得自我對齊回饋，示範任務可端到端走完新模型的完整路徑且關鍵操作皆有歷程可追溯（SC-006）。

> **產品檔案（3）**：`design/prototype/pages/annotation/annotation-list.html`、`design/prototype/pages/annotation/annotation-workspace.data.js`、`design/prototype/pages/task-management/task-detail.data.js`
> **最終群組**：否。
> **相依**：群組 6（例外池已可產生收尾結果，示範資料才能演到最後一關）。

- [ ] 7.1 撰寫 Red 測試覆蓋 AC-1.27 試標歷史回饋揭露閘門（`design/prototype/tests/annotation/issue-596-dry-run-feedback.spec.ts`）：任務為 `dry_run_in_progress` 時資料層回傳空集合且畫面說明需待回合結束；轉入 `waiting_iaa_confirmation` 後呈現被修改筆數與占比、逐筆「我的答案 → 定案結果」、定案來源與具名決策者、理由原文與可跳轉的指南段落引用；任何情況下皆不呈現其他標記員答案。驗證：執行該檔全數失敗且失敗原因為回饋列表尚未存在 [@senior-qa]
- [ ] 7.2 於 `design/prototype/pages/annotation/annotation-workspace.data.js` 實作 FR-096 之資料層揭露閘門（design.md D5：閘門在資料層，回合進行中回傳空集合，不得回傳資料後於 UI 遮蔽）。驗證：`pnpm playwright test tests/annotation/issue-596-dry-run-feedback.spec.ts` 中屬閘門的案例全綠 [@senior-frontend]
- [ ] 7.3 （Green）於 `design/prototype/pages/annotation/annotation-list.html` 實作 FR-096 之標記員試標歷史回饋列表與指南段落跳轉。驗證：`pnpm playwright test tests/annotation/issue-596-dry-run-feedback.spec.ts` 全綠 [@senior-frontend]
- [ ] 7.4 於 `design/prototype/pages/task-management/task-detail.data.js` 改寫 T016（原三人多數決）與 T017（原雙人平手）示範任務為新模型情境：T016 = 審核員修正 → 仲裁採 B → 定稿；T017 = 仲裁 `兩者皆非` → 最終例外池 → 專案負責人收尾。驗證：`cd design/prototype && pnpm playwright test` 全綠，且以 T016／T017 進入工作區可完整走完該條路徑 [@senior-frontend]
- [ ] 7.5 執行跨群組完整回歸：`cd design/prototype && pnpm typecheck && pnpm playwright test`。驗證：兩道指令皆退出碼 0，且既有測試中不再存在對 `已同意`／`已修改`／退回／票數表的任何斷言 [@senior-qa]

## 8. 最終 PR 群組 — Source-Verify 與 archive 回寫

**故事目標**：規格與實作收斂一致——衍生視圖與正典逐條可 `grep` 定位，主要流程的規格證據端到端完備（SC-006）。

> **產品檔案（0）**：本組僅動 `specs/**` 與 `openspec/**`，不計入原則 X 門檻。
> **最終群組**：**是**。本組執行 `/opsx:archive` 與正典回寫，完成第四道驗證閘門。
> **相依**：群組 1–7 全數合併。

- [ ] 8.1 逐條核對本 change 全部 delta 所引用的 FR/AC/SC ID 與檔案路徑，皆可於正典 `specs/annotation/015-annotation-workspace/spec.md` 以 `grep -i` 定位；找不到者修正或移除，不得近似。驗證：逐 ID 的 `grep` 輸出留存於 PR 說明 [@main]
- [ ] 8.2 執行 `openspec validate --changes --no-interactive` 並確認通過。驗證：指令退出碼 0，輸出貼於 PR 說明 [@main]
- [ ] 8.4 執行 `/opsx:archive`，將 delta 併入衍生視圖 `openspec/specs/`，並回寫正典 `specs/annotation/015-annotation-workspace/spec.md`（版本 → v5.0.0，新增 Changelog 條目），並確認 FR-014I／FR-069／FR-074／FR-085 已自需求清單移除、FR-092 ~ FR-097 之完整條文已取代 propose 期的預告條目（原 8.3 之 014 回寫移至 companion change，見 deferred/014-tasks.md）。驗證：正典檔內 `grep -c "FR-014I"` 為 0，`grep "FR-097"` 有結果，Changelog 首列為 5.0.0 [@main]
- [ ] 8.5 archive 後逐條 Source-Verify 衍生視圖中的正典引用（FR/AC ID、章節、檔案路徑、ADR/issue/PR 編號），確認每一項皆可個別 `grep` 定位。驗證：逐項 grep 結果留存 [@main]
- [ ] 8.6 最終 PR 合併後更新 `specs/STATUS.md`，將 015 標記為對應狀態。驗證：`specs/STATUS.md` 內該列狀態已更新 [@main]
