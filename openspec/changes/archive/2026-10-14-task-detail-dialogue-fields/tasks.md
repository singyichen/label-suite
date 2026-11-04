# 任務清單：task-detail-dialogue-fields（issue #1386）

> **Apply 前硬閘（兩道，互不替代）**：先執行 `openspec validate --changes --no-interactive` 取得 OpenSpec schema validation，再執行 `scripts/check-sdd.sh` 取得 Project SDD lint，兩者皆通過後才進入下方群組。
>
> **TDD 硬規則**：每個可觀察行為皆為 Red（`[@senior-qa]`）＋ Green（`[@senior-frontend]`）配對；Red 先 commit 並留下預期失敗證據，Green 才能開始，且不得弱化 Red 契約。只有主 session／lead 勾選 checkbox。
>
> **範圍**：單一 PR，產品檔案 3 個（`task-detail.config.js`、`task-detail.html`、`task-config.engine.js` 僅註解）。`task-detail.html` 的儲存寫入 MUST 在 `renderSettingsEditState()` 之外。
>
> **既有 commit（保留，同一分支接續）**：Red `2f60f225`（auto 標題 spec `issue-1386-task-detail-dialogue-auto-title.spec.ts`）、Green `5e612314`（seed 載入 `dialogue_fields`；引擎註解）、`ff54c878`（重生 screen inventory）。

## 0. 前置

**故事目標**（SC-020，AC-3.80～AC-3.84）：流程狀態檔反映本 change 對 task-management-014 的 in-flight 狀態。

- [x] 0.1 修改 `specs/STATUS.md` 的 task-management-014 列備註，加上本 change in-flight 的一句紀錄（issue #1386）；不動其他列。 [@main]

## 1. 已完成：auto 標題載入（AC-3.83）

**故事目標**（SC-020，AC-3.83）：「自動」清單標題用第 1 則對話文字。

> **產品檔案（2）**：`task-detail.config.js`、`task-config.engine.js`（僅註解）
> **狀態**：已於既有 commit 完成，此處僅記錄，不重做。

- [x] 1.1 （Red，已完成於 `2f60f225`）新增 `design/prototype/tests/task-management/issue-1386-task-detail-dialogue-auto-title.spec.ts` 斷言 auto 標題等於 FR-106 摘要，非對話任務護欄通過。 [@senior-qa]
- [x] 1.2 （Green，已完成於 `5e612314`）`task-detail.config.js` 的 `ensureTaskConfigSeeded()` 載入 `dialogue_fields` 到 state.dialogueFields；引擎註解同批更新。 [@senior-frontend]

## 2. 載入、declined 重設與取消還原（AC-3.80、AC-3.82）

**故事目標**（SC-020、SC-024，AC-3.80、AC-3.82）：編輯模式以已儲存值初始化；取消後重新進入編輯模式，開關與標題回到已儲存狀態。

> **產品檔案（1）**：`design/prototype/pages/task-management/task-detail.config.js`
> **相依**：群組 1。

- [x] 2.1 新增 Red `design/prototype/tests/task-management/issue-1386-task-detail-dialogue-fields-cancel.spec.ts`：(a) 對話串任務進入編輯模式時 `#inlineDialogueBlock` 對應等於已儲存值；(b) 關閉開關並修改對應後取消，重新進入編輯模式時開關開啟、對應為已儲存值、自動標題為第 1 則文字；(c) 經由放棄變更的頁內確認取消，結果相同；(d) 非對話任務不顯示確認區。 [@senior-qa]
- [x] 2.2 （Green）修改 `task-detail.config.js`：`ensureTaskConfigSeeded()` 於重新 seed 時重設 `state.dialogueDeclined = false`（design.md D2）。 [@senior-frontend]

## 3. 儲存寫回（AC-3.81）

**故事目標**（SC-020，AC-3.81）：儲存基本資料時，`dialogue_fields` 寫回任務資料，重新進入編輯模式顯示已儲存值。

> **產品檔案（1）**：`design/prototype/pages/task-management/task-detail.html`
> **相依**：群組 2。

- [x] 3.1 修改 `design/prototype/tests/task-management/issue-1386-task-detail-dialogue-fields-cancel.spec.ts`，補 Red：修改對應後儲存，TASK_DATA.dialogue_fields 為更新後的值，重新進入編輯模式確認區顯示該對應；取消提議後儲存為 `null`；取消編輯不改變已儲存值。 [@senior-qa]
- [x] 3.2 （Green）修改 `task-detail.html`：載入 profile.dialogue_fields 到 `TASK_DATA`（鄰近 `TASK_DATA.list_title_field = profile.list_title_field` 那行），並於基本資料儲存路徑寫回 `TASK_DATA.dialogue_fields = state.dialogueFields ?? null`；寫入 MUST 在 `renderSettingsEditState()` 之外（design.md D3）。 [@senior-frontend]

## 4. 標記設定預覽（AC-3.84）

**故事目標**（SC-021，AC-3.84）：對話串任務的標記設定預覽以對話串呈現。

> **產品檔案（0 新增）**：沿用共用引擎，預期不需新增修改。
> **相依**：群組 3。

- [x] 4.1 修改 `design/prototype/tests/task-management/issue-1386-task-detail-dialogue-fields-cancel.spec.ts`，補 Red：對話串任務進入「標記設定」編輯模式，預覽為每則一列、含發言編號／發言者／文字、無 `[object Object]` 且不含 Output 文字；非對話任務預覽不變。 [@senior-qa]
- [x] 4.2 （Green）確認群組 1～3 的實作使 4.1 通過；若仍紅，只允許修改 `task-detail.config.js` 一個檔案，不得超過產品檔案 3 個。 [@senior-frontend]

## 5. 回歸與審查

**故事目標**（SC-020，AC-3.80～AC-3.84）：以外部工具與獨立審查確認 task-new 與 task-detail 既有行為不變。

> **產品檔案（0）**：只執行驗證與審查。

- [x] 5.1 執行 typecheck、test:node 與範圍限定的 Playwright（本 change 新 spec、`issue-1386-*`、所有引用 `dialogue_fields`／`dialogue-field-`／`inlineDialogueBlock` 的規格，以及 task-detail-config-parity），皆 exit 0；並執行 `scripts/inventory-tests.sh`、`node scripts/check-css-tokens.mjs`。 [@main]
- [x] 5.2 senior-code-reviewer 獨立審查 Generalization-First、Data Fairness、Principle X，以及 `renderSettingsEditState()` 未被修改。 [@senior-code-reviewer]

## 6. Source-Verify 與 archive

**故事目標**（SC-020，AC-3.80～AC-3.84）：正典引用可定位，並完成 archive 寫回。

> **產品檔案（0）**：只執行 specs／openspec 寫回。**最終群組**：是（本單單一 PR，archive 與正典寫回於同一 PR）。

- [x] 6.1 Source-Verify 預掃（archive 前）：FR-014k、FR-014k-1、FR-014l-1、FR-014l-4、AC-3.80～AC-3.84、task-management/013-task-new FR-002c-10、013 v8.5.0、015 FR-106、`getRecordSummaryText` 等引用，逐一以 `/usr/bin/grep` 在正典定位。 [@main]
- [x] 6.2 執行 openspec archive 寫回正典 014（12.2.4 至 12.3.0，MINOR），新增 Changelog 列：指名 #1386，說明承接 013 v8.5.0「task-detail 載入與儲存另案」，不改寫 013 歷史列。Exception: governance-propagation; Files: `specs/task-management/014-task-detail/spec.md`, `openspec/specs/task-management/014-task-detail/spec.md`, `specs/STATUS.md`; Reason: archive 寫回正典、同步衍生檢視 Purpose 版號與 STATUS.md 的 task-management-014 列必須同批原子完成。 [@main]

## Traceability

| AC | 需求 | Red | Green |
|---|---|---|---|
| AC-3.80 | FR-014k-1 (1) | 2.1 | 2.2 |
| AC-3.81 | FR-014k-1 (2) | 3.1 | 3.2 |
| AC-3.82 | FR-014k-1 (3) | 2.1 | 2.2 |
| AC-3.83 | FR-014k-1 (4) | 1.1 | 1.2 |
| AC-3.84 | FR-014l-4 | 4.1 | 4.2 |
