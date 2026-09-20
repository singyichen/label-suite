# 任務清單：align-iaa-rater-enumeration

> **Apply 前硬閘**：先執行 `openspec validate align-iaa-rater-enumeration --type change` 與 `scripts/check-sdd.sh`，分別回報 OpenSpec schema validation 與 Project SDD lint。兩者都通過才可進入 `/opsx:apply`。主 session／team lead 是唯一可以驗證 Red／Green evidence 並更新 checkbox 的角色。

> **單一群組**：本變更只動 1 個 prototype 產品檔（`annotation-workspace.data.js`）與 1 個測試檔，遠低於單一 PR 5 檔上限，不拆群組。propose、apply、archive 放在同一個 PR。
>
> **序列前提**：本變更寫正典 015 的 Changelog，接續 issue #824（v6.11.0）之後。動到 `design/prototype/pages/` 後，必須在 rebase 之後、推送之前重生 `design/system/screen-inventory.md`。本 worktree 專屬 `PW_PORT=8982`。

---

## 1. PR-866 — IAA 評分者列舉改走審核單位同源

> **相依與平行性**：嚴格依序 1.1 → 1.2 → … → 1.6，不使用 parallel markers。1.1 的 committed Red 必須先於 1.3。本群組不改 α 計算公式、不改 IAA 可計算性門檻與閘門語意（正典在 `dataset-017` FR-079）、不改示範資料的標記員組成、不改 `getReviewUnitRows()` 本身。

**故事目標**：SC-004O — 同一份資料在審核清單上是 N 位標記員、在 IAA 報表上只有 N−1 位；標記員只要沒有示範列就不計入評分者，α 因而被系統性高估，且不會報錯。

- [ ] 1.1 撰寫 `design/prototype/tests/annotation/issue-866-iaa-rater-enumeration.spec.ts` 作為 Red 契約。型別宣告必須使用 local cast，不得新增第二份 `declare global`（重複宣告會撞 TS2717）。先提交此單檔再跑測試，expected failure 必須是「有已儲存提交但無示範列之標記員未計入評分者」，並保存 command、exit 與失敗訊息。 [@senior-qa]
  - **假綠防線（本單最重要的一點）**：T014 的 `REVIEWER_MOCK_ROWS` 恰好就是種子寫入提交的同三位標記員（`113450022`／`kioleemg12`／`tony0950127`，五個樣本各三列），所以改讀聯集後**現成種子一列都不會多**。只跑既有種子的測試必定假綠——Red **MUST** 自行為一位不在任何示範列中的第四位標記員寫入已提交的答案，再斷言差值。
  - 斷言以「寫入前後的差值」表達，不得寫死評分者總數或 α 的絕對值（種子日後異動會讓寫死值成為偽紅）。
  - 覆蓋 `computeIaaAlpha()`：寫入第四位標記員對若干樣本的提交後，`raters` 增加 1、`values` 增加該標記員的提交筆數、`units` 不變（樣本集合不變）、`alpha` 與寫入前不同。
  - 覆蓋 `countDistinctRaters()`：同一情境下回傳值增加 1。
  - 覆蓋未提交草稿不計入：只存草稿的第五位標記員 MUST NOT 使 `raters` 變動（與 FR-055 既有之草稿排除規則一致）。
  - Red 證據：<待填>
- [ ] 1.2 以 probe（暫時套用 1.3 的修改跑全量，跑完即還原）找出既有測試中寫死 IAA 評分者數、值數或 α 的斷言，確認是否位移。既有種子下不應有任何位移（見 1.1 的假綠防線）；若出現位移，先判定是「期望值位移」還是「前提消失」，後者改寫為斷言新前提、不刪測試。無位移則在此項記錄「probe 無位移」。 [@senior-qa]
  - 證據：<待填>
- [ ] 1.3 Green：修改 `design/prototype/pages/annotation/annotation-workspace.data.js`，將 `computeIaaAlpha()` 與 `countDistinctRaters()` 的評分者列舉由 `getReviewerMockRows(taskId, sampleId)` 改為 `getReviewUnitRows(taskId, runType, sampleId, [outKey])`，僅取每列的 `annotator`；答案仍由既有的 `getSubmission()` 取得，α 計算與門檻判定不變。不得放寬或改寫 Red 契約。 [@senior-frontend]
  - Green 證據：<待填>
- [ ] 1.4 執行 code/test gate：在 `design/prototype/` 下帶本 worktree 專屬 `PW_PORT=8982` 執行 `node ~/.cache/node/corepack/v1/pnpm/12.3.4/bin/pnpm.mjs typecheck` 與 `node ~/.cache/node/corepack/v1/pnpm/12.3.4/bin/pnpm.mjs playwright test`（全量，不得只跑子目錄）。兩者預期 exit `0`，且分開記錄。另執行 `scripts/check-demo-data-parity.sh` 與 `node scripts/check-user-path-map-freshness.mjs`。rebase 後再執行 `node scripts/gen-screen-inventory.mjs` 重生盤點並提交。 [@main]
  - gate 證據：<待填>
- [ ] 1.5 更新 `specs/annotation/015-annotation-workspace/spec.md`，完成 gate 4 回寫，內容如下。 [@main]
  - 版號 MINOR bump（以當下最新版號接續），Changelog 補一列。
  - FR-055 補本版修訂段：消費端清單新增「供應給 IAA 的評分者列舉（FR-079 之輸入）」，並載明本條僅規範輸入、α 語意正典仍在 `dataset-017`。
  - 新情境於回寫時取得正式 AC 編號（`## MODIFIED` 區塊不得含新 AC ID，故 delta 內該情境只有標題）。
  - 回寫證據：<待填>
- [ ] 1.6 執行 Source-Verify 後 `/opsx:archive`，並確認衍生檢視中每一處正典引用皆可 `grep` 定位（FR-055、FR-056、FR-072、FR-073、FR-079、FR-093、FR-100、FR-044a、issue #792／#866、`dataset-017`）。 [@main]
  - 證據：<待填>
