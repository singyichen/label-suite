# 任務清單：task-new-step1-type-preset（issue #724）

> **Apply 前硬閘（兩道，互不替代）**：先執行 `openspec validate task-new-step1-type-preset --type change`（或等價 non-strict all-changes command）取得 **OpenSpec schema validation**，再執行 `scripts/check-sdd.sh` 取得 **Project SDD lint**。兩者皆通過後才進入下方 Stage 1。
>
> **TDD 硬規則**：每個可觀察行為皆為一組 Red（`[@senior-qa]`）＋ Green（`[@senior-frontend]`）配對。Red 任務必須先 commit 並執行、留下預期失敗證據，Green 任務才能開始；Green 任務不得為了讓測試通過而改寫或弱化 Red 契約。
>
> **拆分總則（憲法原則 X）**：本變更僅 3 個手寫產品檔案、預估 diff 遠低於 300 行，單一 PR 群組即可完成，propose／apply／archive 同 PR（ADR-033 Rule 1）。本 change 不設 stacked PR；下方 1～3 群組僅為 Red／Green 一對一配對之需要而依檔案分層，最終仍合併為單一 PR 提交。
>
> **執行方式註記**：本 change 由單一 team-lead session 直接執行（無可用 Agent 工具分派子代理），下方 `[@senior-qa]`／`[@senior-frontend]`／`[@main]` 標籤標明「該任務所扮演的角色與其應遵守的職責邊界」，而非實際分派對象；主 session 對 Red／Green 證據的自我驗證仍以「先 commit Red、確認預期失敗、再開始 Green、Green 後獨立重跑測試」的順序執行，未省略任何一道查核。

## 0. 前置

**故事目標**（SC-002g）：`specs/STATUS.md` 與正典 frontmatter 之分支欄需一致並反映本 change 對 `task-management-013` 的 in-flight 狀態，作為本次一鍵預設變更的流程狀態基準。

> **相依與平行性**：0.1 與 0.2 為同一致性修正，同批提交。本群組不動任何產品程式。

- [ ] 0.1 修改 `specs/STATUS.md`，將 task-management-013 之狀態由 in-progress 更新為 change-open、分支欄改為本 change 的分支（原分支欄為 issue #659 合併後未同步之舊值）。驗證：執行 scripts/check-sdd.sh 不再回報 ACTIVE_CHANGE_STAGE（待與 0.2 同批提交後由主 session 核實）。 [@main]
- [ ] 0.2 修改 `specs/task-management/013-task-new/spec.md` 之 frontmatter 功能分支欄，使其與 specs/STATUS.md 分支欄一致；本任務只改 frontmatter 該欄，不動任何 FR／AC／SC 條文。驗證：執行 scripts/check-sdd.sh 之 ACTIVE_CHANGE_STAGE 為 0 筆（待與 0.1 同批提交後由主 session 核實）。 [@main]

## 1. PR-724-TYPE-PRESET-DATA — 常用組合預設資料表（FR-002f 第 1 段）

**故事目標**（SC-002g）：新增 config-driven 的 `TASK_TYPE_PRESETS` 常數，作為一鍵預設按鈕的唯一資料來源，不新增任何任務類型專屬程式邏輯。

> **產品檔案（1）**：`design/prototype/pages/task-management/task-config.data.js`
> **最終群組**：否。
> **相依**：群組 0。1.1 的 committed Red 必須先於 1.2。

- [ ] 1.1 新增 `design/prototype/tests/task-management/issue-724-task-new-step1-preset.spec.ts` 之 Red 契約：斷言瀏覽器全域變數 `TASK_TYPE_PRESETS` 為陣列且至少含 1 筆、其 `key` 為 `classification_single_label`、`category` 為 `classification`、`inputType` 為 `single_item`、`outputTypes` 深比對等於 `['single_label']`、`zh`／`en` 皆為非空字串。驗證：`PW_PORT=8899 corepack pnpm playwright test tests/task-management/issue-724-task-new-step1-preset.spec.ts` 全數失敗，失敗原因須為全域變數 `TASK_TYPE_PRESETS` 未定義。 [@senior-qa]
- [ ] 1.2 （Green）修改 `design/prototype/pages/task-management/task-config.data.js`：新增 `TASK_TYPE_PRESETS` 常數（config-driven 陣列，每筆含 `key`／`category`／`inputType`／`outputTypes`／`zh`／`en`），本版僅 1 筆——`classification_single_label`（`classification` + `single_item` + `['single_label']`）。不得修改 `TASK_TAXONOMY` 或任何既有常數。驗證：`PW_PORT=8899 corepack pnpm playwright test tests/task-management/issue-724-task-new-step1-preset.spec.ts` 之 1.1 斷言轉綠（其餘尚未實作之斷言仍可能失敗）。 [@senior-frontend]

## 2. PR-724-TYPE-PRESET-ENGINE — 套用邏輯（FR-002f 第 2、4 段）

**故事目標**（SC-002g）：新增 `applyTaskTypePreset()` 與 `renderTaskTypePresets()`，套用效果須與逐一點選三組 chip 完全等價，且套用邏輯只讀 preset 物件欄位、不新增依 category／output key 的硬編分支。

> **產品檔案（1）**：`design/prototype/pages/task-management/task-config.engine.js`
> **最終群組**：否。
> **相依**：群組 1。2.1 的 committed Red 必須先於 2.2。

- [ ] 2.1 修改 `design/prototype/tests/task-management/issue-724-task-new-step1-preset.spec.ts`，補上 Red 契約：於瀏覽器內直接呼叫全域函式 `applyTaskTypePreset`（傳入 `TASK_TYPE_PRESETS` 第 1 筆，不經按鈕點擊），斷言呼叫後 `state` 物件的 `taskCategories` 深比對等於 `['classification']`、`taskInputTypes` 等於 `['single_item']`、`taskOutputTypes` 等於 `['single_label']`、`taskType` 等於 `single_sentence_classification`、`selectedOutputTypes` 等於 `['single_label']`。驗證：`PW_PORT=8899 corepack pnpm playwright test tests/task-management/issue-724-task-new-step1-preset.spec.ts` 新增斷言失敗，失敗原因須為全域函式 `applyTaskTypePreset` 未定義；1.1 斷言維持綠燈。 [@senior-qa]
- [ ] 2.2 （Green）修改 `design/prototype/pages/task-management/task-config.engine.js`：新增 `renderTaskTypePresets`（讀取 `TASK_TYPE_PRESETS` 渲染按鈕，容器不存在時安全跳過；`data-testid` 為 `task-type-preset-<key>`）與 `applyTaskTypePreset`（依 preset 的 `category`／`inputType`／`outputTypes` 欄位寫入 `state` 物件的 `taskCategories`／`taskInputTypes`／`taskOutputTypes`，呼叫既有 `syncChipsFromState` 與 `onChipSelectionChange`），並在既有 `initTaskTypeChips` 內呼叫 `renderTaskTypePresets`。不得新增依 `category`／`outputType` key 的硬編分支。驗證：`PW_PORT=8899 corepack pnpm playwright test tests/task-management/issue-724-task-new-step1-preset.spec.ts` 之 1.1、2.1 斷言皆轉綠。 [@senior-frontend]

## 3. PR-724-TYPE-PRESET-UI — Step 1 按鈕與可調整性（FR-002f 第 3 段、AC-1.4、AC-1.5）

**故事目標**（SC-002g）：Step 1 新增可見的常用組合預設按鈕，1 次點擊完成原本 3 次點擊才能湊齊的合法組合，且套用後三段式選擇器維持可個別再調整。

> **產品檔案（1）**：`design/prototype/pages/task-management/task-new.html`
> **最終群組**：否。
> **相依**：群組 2。3.1 的 committed Red 必須先於 3.2。

- [ ] 3.1 修改 `design/prototype/tests/task-management/issue-724-task-new-step1-preset.spec.ts`，補上 Red 契約：(a) 斷言 `[data-testid="task-type-preset-classification_single_label"]` 可見，點擊 1 次後 `#taskCategoryChips [data-key="classification"]`／`#taskInputTypeChips [data-key="single_item"]`／`#taskOutputTypeChips [data-key="single_label"]` 之 `aria-checked` 皆為 `true`；(b) 以獨立點擊計數器記錄並斷言三段式選擇器逐一點選同一組合需要 3 次點擊，與 (a) 之 1 次點擊對照；(c) 套用預設後再點擊 `#taskCategoryChips [data-key="sequence"]` 新增大分類，斷言 `classification`／`single_item`／`single_label` 三者之 `aria-checked` 不受影響仍為 `true`。驗證：`PW_PORT=8899 corepack pnpm playwright test tests/task-management/issue-724-task-new-step1-preset.spec.ts` 新增斷言失敗，失敗原因須為預設按鈕之 `data-testid` 選擇器逾時找不到元素；1.1、2.1 斷言維持綠燈。 [@senior-qa]
- [ ] 3.2 （Green）修改 `design/prototype/pages/task-management/task-new.html`：於 `#taskTypeSelector` 上方新增常用組合預設按鈕容器與其 zh/en 標籤文字，登錄進既有語言切換 `ids` 陣列並在 `applyLang()` 內呼叫 `renderTaskTypePresets()` 重繪。驗證：`PW_PORT=8899 corepack pnpm playwright test tests/task-management/issue-724-task-new-step1-preset.spec.ts` 全綠。 [@senior-frontend]

## 4. 回歸、審查與最終 archive

> **產品檔案（0）**：本組只執行驗證命令與 `specs/**`／`openspec/**` 寫回，不修改任何應用程式產品檔案。
> **最終群組**：是。本組執行 Source-Verify、正典回寫與 `/opsx:archive`。
> **相依**：群組 1～3 全數完成。

**故事目標**（SC-002g）：以完整回歸、自我審查與 Source-Verify 證據，確認一鍵預設落地且未影響既有三段式選擇器行為，並完成正典回寫。

- [ ] 4.1 執行本 change 全部回歸並保存證據。驗證：`cd design/prototype && corepack pnpm typecheck` 與 `PW_PORT=8899 corepack pnpm playwright test tests/task-management` 皆 exit 0；`git diff <commit 1.1> HEAD -- design/prototype/tests/issue-724-task-new-step1-preset.spec.ts` 除 2.1／3.1 明訂之新增斷言外，既有已轉綠斷言不得被弱化或刪除。 [@main]
- [ ] 4.2 Code Review（自我審查，無其他可用 Agent）：檢查 `TASK_TYPE_PRESETS` 未硬編任務邏輯（Generalization-First）、`applyTaskTypePreset()` 只讀 preset 物件欄位、未新增或修改任何提交 payload 欄位或 ground-truth 可見性（Data Fairness）、diff 規模於 Principle X 門檻內（3 個手寫產品檔案、預估遠低於 300 行）。 [@main]
- [ ] 4.3 QA Scenario 驗收：逐條核對 AC-1.4／AC-1.5／SC-002g 與 issue-724-task-new-step1-preset 測試斷言一致，確認既有三段式選擇器測試（task-new-taxonomy-cascade 等）全數仍綠、未被本次改動影響。 [@main]
- [ ] 4.4 Security Review（自我審查）：確認本次改動不引入使用者輸入注入面、不擴大 CORS、不新增任何後端呼叫或秘密處理；純前端 DOM 操作與既有 state 寫入。 [@main]
- [ ] 4.5 Source-Verify：`grep` 確認正典 `specs/task-management/013-task-new/spec.md` 內已逐字可定位 FR-002f、AC-1.4、AC-1.5、SC-002g 與新增之邊界情況、介面定義段落；確認版本號 7.0.2 → 7.1.0 與 Changelog 新增列已寫入。 [@main]
- [ ] 4.6 執行 `/opsx:archive` 等價流程：將本 change 的 delta 併入 `openspec/specs/task-management/013-task-new/spec.md`（derived view）、移動本 change 至 `openspec/changes/archive/`。PR 合併後另行更新 `specs/STATUS.md` 之 `task-management-013` 列為 `done`（依 CLAUDE.md，`in-progress`／`change-open` → `done` 發生於合併後，`archived` 發生於封存正典時）。 [@main]
