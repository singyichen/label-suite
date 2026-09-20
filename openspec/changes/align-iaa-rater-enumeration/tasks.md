# 任務清單：align-iaa-rater-enumeration

> **Apply 前硬閘**：先執行 `openspec validate align-iaa-rater-enumeration --type change` 與 `scripts/check-sdd.sh`，分別回報 OpenSpec schema validation 與 Project SDD lint。兩者都通過才可進入 `/opsx:apply`。主 session／team lead 是唯一可以驗證 Red／Green evidence 並更新 checkbox 的角色。

> **單一群組**：本變更只動 1 個 prototype 產品檔（`annotation-workspace.data.js`）與 1 個測試檔，遠低於單一 PR 5 檔上限，不拆群組。propose、apply、archive 放在同一個 PR。
>
> **序列前提**：本變更寫正典 015 的 Changelog，接續 issue #824（v6.11.0）之後。動到 `design/prototype/pages/` 後，必須在 rebase 之後、推送之前重生 `design/system/screen-inventory.md`。本 worktree 專屬 `PW_PORT=8982`。

---

## 1. PR-866 — IAA 評分者列舉改走審核單位同源

> **相依與平行性**：嚴格依序 1.1 → 1.2 → … → 1.6，不使用 parallel markers。1.1 的 committed Red 必須先於 1.3。本群組不改 α 計算公式、不改 IAA 可計算性門檻與閘門語意（正典在 `dataset-017` FR-039）、不改示範資料的標記員組成、不改 `getReviewUnitRows()` 本身。

**故事目標**：SC-004O — 同一份資料在審核清單上是 N 位標記員、在 IAA 報表上只有 N−1 位；標記員只要沒有示範列就不計入評分者，α 因而被系統性高估，且不會報錯。

- [x] 1.1 撰寫 `design/prototype/tests/annotation/issue-866-iaa-rater-enumeration.spec.ts` 作為 Red 契約。型別宣告必須使用 local cast，不得新增第二份 `declare global`（重複宣告會撞 TS2717）。先提交此單檔再跑測試，expected failure 必須是「有已儲存提交但無示範列之標記員未計入評分者」，並保存 command、exit 與失敗訊息。 [@senior-qa]
  - **假綠防線（本單最重要的一點）**：T014 的 `REVIEWER_MOCK_ROWS` 恰好就是種子寫入提交的同三位標記員（`113450022`／`kioleemg12`／`tony0950127`，五個樣本各三列），所以改讀聯集後**現成種子一列都不會多**。只跑既有種子的測試必定假綠——Red **MUST** 自行為一位不在任何示範列中的第四位標記員寫入已提交的答案，再斷言差值。
  - 斷言以「寫入前後的差值」表達，不得寫死評分者總數或 α 的絕對值（種子日後異動會讓寫死值成為偽紅）。
  - 覆蓋 `computeIaaAlpha()`：寫入第四位標記員對若干樣本的提交後，`raters` 增加 1、`values` 增加該標記員的提交筆數、`units` 不變（樣本集合不變）、`alpha` 與寫入前不同。
  - 覆蓋 `countDistinctRaters()`：同一情境下回傳值增加 1。
  - 覆蓋未提交草稿不計入：只存草稿的第五位標記員 MUST NOT 使 `raters` 變動（與 FR-055 既有之草稿排除規則一致）。
  - Red 證據：`a74f3310`（單一測試檔，179 行，未動任何產品碼）；`PW_PORT=8982 pnpm exec playwright test tests/annotation/issue-866-iaa-rater-enumeration.spec.ts` → exit 1，2 failed／1 passed。兩則紅皆為 `expect(after.raters).toBe(baseline.raters + 1)` → Expected 4, Received 3。綠的一則是「草稿不計入」，舊實作下本就成立、Green 後必須維持綠，非假綠。
  - 假綠防線已落實：測試以 `markSampleSubmitted()`（`annotation-workspace.data.js:3650`，即種子自身所用入口）為第四位標記員 `qa866-rater-d` 寫入 2 筆、第五位 `qa866-rater-e` 寫入 1 筆已提交答案，payload 形狀 `{ previewState: { single_label: { selected } } }` 對齊 `labelPayload()`（`:3467`）。
  - 範圍註記：`countDistinctRaters()` 未匯出，全 repo 僅 `computeIaaAlpha()`（`:3605`）一個呼叫者，故 1.1 第 2 項只能經 `computeIaaAlpha().raters` 間接驗證。不為測試方便而新增匯出。
- [x] 1.2 以 probe（暫時套用 1.3 的修改跑全量，跑完即還原）找出既有測試中寫死 IAA 評分者數、值數或 α 的斷言，確認是否位移。既有種子下不應有任何位移（見 1.1 的假綠防線）；若出現位移，先判定是「期望值位移」還是「前提消失」，後者改寫為斷言新前提、不刪測試。無位移則在此項記錄「probe 無位移」。 [@senior-qa]
  - 證據：Green 階段直接以既有回歸 `issue-489-iaa-single-derivation.spec.ts` 驗證代替 probe——T014 的示範列恰為種子提交的同三位標記員，改讀聯集後 `raters=3`／`values=15`／`units=5`／`alpha≈0.588235` 皆不應位移，該檔轉綠後即為「無位移」之證據。全量位移另由 1.4 的全量跑覆蓋。
- [x] 1.3 Green：修改 `design/prototype/pages/annotation/annotation-workspace.data.js`，將 `computeIaaAlpha()` 與 `countDistinctRaters()` 的評分者列舉由 `getReviewerMockRows(taskId, sampleId)` 改為 `getReviewUnitRows(taskId, runType, sampleId, [outKey])`，僅取每列的 `annotator`；答案仍由既有的 `getSubmission()` 取得，α 計算與門檻判定不變。不得放寬或改寫 Red 契約。 [@senior-frontend]
  - Green 證據：`8d66102c`，單一檔案 `design/prototype/pages/annotation/annotation-workspace.data.js`（+5/−5），未動任何測試檔——Red 契約未被放寬或改寫。`computeIaaAlpha()`（:3605 附近）與 `countDistinctRaters()`（:3624）兩處列舉皆改為 `getReviewUnitRows(taskId, runType, sampleId, [outKey])`，僅取 `row.annotator`；答案仍由既有 `getSubmission()` 取得。
  - 目標測試轉綠：`PW_PORT=8982 pnpm exec playwright test tests/annotation/issue-866-iaa-rater-enumeration.spec.ts` → exit 0，3 passed（含 1.1 原本就綠的「草稿不計入」一則，維持綠）。
  - 既有 IAA 回歸零位移：`PW_PORT=8982 pnpm exec playwright test tests/annotation/issue-489-iaa-single-derivation.spec.ts` → exit 0，5 passed，`raters=3`／`values=15`／`units=5`／`alpha≈0.588235` 皆未位移（即 1.2 之證據）。
- [x] 1.4 執行 code/test gate：在 `design/prototype/` 下帶本 worktree 專屬 `PW_PORT=8982` 執行 `node ~/.cache/node/corepack/v1/pnpm/12.3.4/bin/pnpm.mjs typecheck` 與 `node ~/.cache/node/corepack/v1/pnpm/12.3.4/bin/pnpm.mjs playwright test`（全量，不得只跑子目錄）。兩者預期 exit `0`，且分開記錄。另執行 `scripts/check-demo-data-parity.sh` 與 `node scripts/check-user-path-map-freshness.mjs`。rebase 後再執行 `node scripts/gen-screen-inventory.mjs` 重生盤點並提交。 [@main]
  - gate 證據（皆於 `design/prototype/` 下、帶本 worktree 專屬 `PW_PORT=8982` 執行）：
    - `pnpm typecheck` → exit **0**（無 TS 錯誤；Red 以 local `type WorkspaceDataWindow` cast，未新增第二份 `declare global`，故無 TS2717）。
    - `pnpm playwright test`（**全量**，非子目錄） → exit **0**，**1843 passed (8.5m)**，0 failed、0 flaky。列表中 XROLE-04／XROLE-20／XROLE-21 三則的 `✘` 為 `test.fail()` 標註之「已知缺口存證」測試（`tests/cross-role/xrole-canonical-journey.spec.ts:391`、`:992`、`:1015`），預期失敗即計為通過，非回歸。
  - 其餘專案閘門（專案根目錄）：`scripts/check-demo-data-parity.sh` → exit 0；`node scripts/check-user-path-map-freshness.mjs` → exit 0（`PATH_MAP_FRESH`）。
  - 盤點重生：`design/system/screen-inventory.md` 的 prototype 來源 commit 由 `146ea246be3f` 更新為 `8d66102c3ae3`，單獨提交於 `35eddc3b`。動到 `design/prototype/pages/**` 即會觸發此戳記，即使未 rebase、未碰任何 `.html` 亦然。
  - rebase：`origin/main` 自本分支基底 `c1f2c6e7`（PR #869 合併點）起未前進，無須 rebase；已於重生盤點前確認。
- [x] 1.5 更新 `specs/annotation/015-annotation-workspace/spec.md`，完成 gate 4 回寫，內容如下。 [@main]
  - 版號 MINOR bump（以當下最新版號接續），Changelog 補一列。
  - FR-055 補本版修訂段：消費端清單新增「供應給 IAA 的評分者列舉（FR-079 之輸入）」，並載明本條僅規範輸入、α 語意正典仍在 `dataset-017`。
  - 新情境於回寫時取得正式 AC 編號（`## MODIFIED` 區塊不得含新 AC ID，故 delta 內該情境只有標題）。
  - 回寫證據：`43998be6`（正典 015 v6.11.0 → **v6.12.0**，MINOR）＋ `ff7c53bd`（引用更正）。內容：frontmatter 版號、FR-055 補 v6.12.0 修訂段、FR-079 第 1 點補 v6.12.0 註記、新增 **AC-1.32**、Changelog 補一列（含非目標與逐字保留清單）。
  - 逐字保留複驗：FR-055 之 v6.10.0 修訂段、FR-079 第 1 點原文、6.10.0 Changelog 列（含「IAA 評分者列舉……另由 issue #866 追蹤」）皆未改寫。
  - 引用更正（Source-Verify 前置掃描所得）：原文四處把 `FR-079` 歸給 `dataset-017`，但 `grep FR-079 specs/dataset/017-dataset-analysis-detail/spec.md` 為 0 命中——`dataset-017` 的 IAA 跨模組權威條文是 **FR-039**（v2.2.0）。已於正典、delta、proposal、本檔一併更正為「`dataset-017`（閘門語意見 FR-039）」；指向 015 自身 FR-079 的引用不變。
  - 閘門 1 `openspec validate align-iaa-rater-enumeration --type change` → exit 0（`Change 'align-iaa-rater-enumeration' is valid`）。
  - 閘門 2 `scripts/check-sdd.sh` → exit 0，0 error／15 warning（皆為既有 review 類：`STATUS_EXTERNAL_STATE`、`TASK_FILE_COUNT_REVIEW`、`TASK_RED_EVIDENCE_REVIEW` 等，非本變更引入）。
- [ ] 1.6 執行 Source-Verify 後 `/opsx:archive`，並確認衍生檢視中每一處正典引用皆可 `grep` 定位（FR-055、FR-056、FR-072、FR-073、FR-079、FR-093、FR-100、FR-044a、`dataset-017` FR-039、issue #792／#866）。 [@main]
  - 證據：<待填>
