# 任務清單：task-new-step1-field-role-hints（issue #755）

> **Apply 前硬閘（兩道，互不替代）**：先執行 `openspec validate task-new-step1-field-role-hints --type change`（或等價 non-strict all-changes command）取得 **OpenSpec schema validation**，再執行 `scripts/check-sdd.sh` 取得 **Project SDD lint**。兩者皆通過後才進入下方 Stage 1。
>
> **TDD 硬規則**：每個可觀察行為皆為一組 Red（`[@senior-qa]`）＋ Green（`[@senior-frontend]`）配對。Red 任務必須先 commit 並執行、留下預期失敗證據，Green 任務才能開始；Green 任務不得為了讓測試通過而改寫或弱化 Red 契約。
>
> **拆分總則（憲法原則 X）**：本變更僅 2 個手寫產品檔案、預估 diff 約 30–35 行，遠低於 300 行，單一 PR 群組即可完成，propose／apply／archive 同 PR（ADR-033 Rule 1）。本 change 不設 stacked PR；下方 1～2 群組僅為 Red／Green 一對一配對之需要而依檔案分層，最終仍合併為單一 PR 提交。
>
> **執行方式註記**：`[@senior-qa]`／`[@senior-frontend]`／`[@main]` 標籤標明「該任務所扮演的角色與其應遵守的職責邊界」；若由單一 session 直接執行（無可用 Agent 工具分派子代理），主 session 對 Red／Green 證據的自我驗證仍以「先 commit Red、確認預期失敗、再開始 Green、Green 後獨立重跑測試」的順序執行，未省略任何一道查核。

## 0. 前置

**故事目標**（SC-002h）：`specs/STATUS.md` 與正典 frontmatter 之分支欄需一致並反映本 change 對 `task-management-013` 的 in-flight 狀態，作為本次欄位角色自動推測變更的流程狀態基準。

> **相依與平行性**：0.1 與 0.2 為同一致性修正，同批提交。本群組不動任何產品程式。

- [x] 0.1 修改 `specs/STATUS.md`，將 task-management-013 之狀態由 in-progress 更新為 change-open、分支欄由已合併之舊分支 feat/task-new-step1-click-reduction 改為本 change 的分支 feat/task-new-step1-field-role-hints（該欄位為 issue #724 合併後未同步之舊值）。驗證：執行 `scripts/check-sdd.sh` 不再回報 ACTIVE_CHANGE_STAGE（待與 0.2 同批提交後由主 session 核實）。 [@main]
- [x] 0.2 修改 `specs/task-management/013-task-new/spec.md` 之 frontmatter 功能分支欄，使其與 `specs/STATUS.md` 分支欄一致；本任務只改 frontmatter 該欄，不動任何 FR／AC／SC 條文。驗證：執行 `scripts/check-sdd.sh` 之 ACTIVE_CHANGE_STAGE 為 0 筆（待與 0.1 同批提交後由主 session 核實）。 [@main]

> **主 session 核實紀錄（2026-09-16）**：群組 0 於 `00db4611` 落地（`9c18cc4b` 為 propose 產物）；`scripts/check-sdd.sh` 0 error／20 warning、`scripts/check-spec-artifacts.sh` exit 0，ACTIVE_CHANGE_STAGE 與 ACTIVE_CHANGE_SPEC 皆 0 筆。任務 1.1 的 Red 於 `b61157c6` 提交（單檔 22 行），主 session 獨立重跑確認 1 failed，失敗行為 `expect(Array.isArray(hints)).toBe(true)`、`/usr/bin/grep -rn FIELD_ROLE_INPUT_NAME_HINTS design/prototype/pages/` 零命中，屬預期失敗而非頁面載入或 selector 問題。

## 1. PR-755-FIELD-ROLE-HINTS-DATA — 欄名線索常數（FR-002c-8 判定規則資料來源）

**故事目標**（SC-002h）：新增 config-driven 的 `FIELD_ROLE_INPUT_NAME_HINTS` 常數，作為 Input 欄名自動推測的唯一資料來源，不新增任何欄位或任務類型專屬程式邏輯。

> **產品檔案（1）**：`design/prototype/pages/task-management/task-config.data.js`
> **最終群組**：否。
> **相依**：群組 0。1.1 的 committed Red 必須先於 1.2。

- [x] 1.1 新增 `design/prototype/tests/task-management/issue-755-field-role-input-hints.spec.ts` 之 Red 契約：斷言瀏覽器全域變數 `FIELD_ROLE_INPUT_NAME_HINTS` 為陣列且至少含 1 筆、每筆皆為非空字串、且陣列內容包含 `text`（依 docs/product/example-data 下全部 17 份 fixture 逐檔實測，七個關鍵字命中 14 份且全由 `text` 達成，故 `text` 為欄名線索的最低驗收基準）。驗證：`PW_PORT=8899 corepack pnpm playwright test tests/task-management/issue-755-field-role-input-hints.spec.ts` 全數失敗，失敗原因須為全域變數 `FIELD_ROLE_INPUT_NAME_HINTS` 未定義。 [@senior-qa]
- [x] 1.2 （Green）修改 `design/prototype/pages/task-management/task-config.data.js`：於 `FIELD_ROLE_LABELS`（:602-605）鄰近新增 `FIELD_ROLE_INPUT_NAME_HINTS` 常數（config-driven 字串陣列，內容為 `text`／`content`／`sentence`／`passage`／`document`／`body`／`context`）。不得修改 `FIELD_ROLE_LABELS` 或任何既有常數。驗證：`PW_PORT=8899 corepack pnpm playwright test tests/task-management/issue-755-field-role-input-hints.spec.ts` 之 1.1 斷言轉綠（其餘尚未實作之斷言仍可能失敗）。 [@senior-frontend]

> **主 session 核實紀錄（2026-09-16，任務 1.2）**：Green 於 `941b2119` 落地，`git show --stat` 為單檔 5 行純插入（:606-610），位於 `FIELD_ROLE_LABELS`（:602-605）與 `SAMPLING_DEFAULTS_BY_TYPE`（:611）之間，既有常數零修改、工作區乾淨、`task-config.engine.js` 最新提交仍為 `0e724859`（未被本任務碰觸）。主 session 獨立重跑 `PW_PORT=8903` 確認 1 passed；`/usr/bin/grep -rn FIELD_ROLE_INPUT_NAME_HINTS design/prototype/pages design/prototype/tests` 僅命中 data.js:610 與測試檔，確認頁面層無第二份硬編清單。實作 agent 另回報 `corepack pnpm typecheck` exit 0、`tests/task-management` 全量回歸連跑兩次皆 344 passed／0 failed。

## 2. PR-755-FIELD-ROLE-HINTS-ENGINE — 初始化推測邏輯（FR-002c-8、AC-1.6、AC-1.7）

**故事目標**（SC-002h）：`renderInlineDatasetPreview()` 為尚未指定過角色的欄位初始化角色時，依 `FIELD_ROLE_INPUT_NAME_HINTS` 自動預填 Input，且不得覆寫使用者已手動指定或依資料列來源記憶（FR-002c-4／`_roleMapBySource`）還原的既有角色。

> **產品檔案（1）**：`design/prototype/pages/task-management/task-config.engine.js`
> **最終群組**：否。
> **相依**：群組 1。2.1 的 committed Red 必須先於 2.2。

- [ ] 2.1 修改 `design/prototype/tests/task-management/issue-755-field-role-input-hints.spec.ts`，補上 Red 契約：(a) 上傳一份欄名為 `['id', 'text', 'label']`（僅 `text` 命中線索）的測試資料集，斷言 `renderInlineDatasetPreview()` 完成後 `state.fieldRoleMap.text` 為 `'input'`、`state.fieldRoleMap.id`／`state.fieldRoleMap.label` 皆非 `'input'`（維持「不使用」）；(b) 上傳欄名為 `['text', 'content', 'sentence']`（三者皆命中線索）之資料集、`input_type` 為 `single_item`，斷言僅第一個依原始出現順序命中的欄位（`text`）被指定為 Input，其餘兩個命中欄位仍為「不使用」；(c) 針對 (a) 之欄位，先手動將 `text` 的角色改為 `'evidence'`，再觸發同一資料集的重新初始化（如切換資料列來源後切回），斷言 `state.fieldRoleMap.text` 維持使用者手動指定的 `'evidence'`、不被推測邏輯覆寫。驗證：`PW_PORT=8899 corepack pnpm playwright test tests/task-management/issue-755-field-role-input-hints.spec.ts` 新增斷言失敗，失敗原因須為 `state.fieldRoleMap` 未依欄名線索預填 Input（維持全數「不使用」之既有行為）；1.1 斷言維持綠燈。 [@senior-qa]
- [ ] 2.2 （Green）修改 `design/prototype/pages/task-management/task-config.engine.js`：於 `renderInlineDatasetPreview()` 內「Init fieldRoleMap for any new columns not yet in state」既有初始化迴圈中，對尚未指定過角色（即該欄位在 `state.fieldRoleMap` 中不存在，且不在 FR-002c-4 資料列來源記憶還原範圍內）的欄位，依欄名（不分大小寫）比對 `FIELD_ROLE_INPUT_NAME_HINTS` 子字串，命中者依原始出現順序指定為 `'input'`，至多至當下 `input_type` 所需 Input 數量上限（`single_item` 1、`item_pair` 2、未選定時 1）；超出上限或未命中維持既有「不使用」初始值。不得修改 Evidence／Output 角色的初始化邏輯，不得修改該迴圈以外的程式碼。驗證：`PW_PORT=8899 corepack pnpm playwright test tests/task-management/issue-755-field-role-input-hints.spec.ts` 之 1.1、2.1 斷言皆轉綠。 [@senior-frontend]

## 3. 回歸、審查與最終 archive

> **產品檔案（0）**：本組只執行驗證命令與 `specs/**`／`openspec/**` 寫回，不修改任何應用程式產品檔案。
> **最終群組**：是。本組執行 Source-Verify、正典回寫與 `/opsx:archive`。
> **相依**：群組 1～2 全數完成。

**故事目標**（SC-002h）：以完整回歸、自我審查與 Source-Verify 證據，確認 Input 欄名自動推測落地且未影響既有欄位角色手動指定、資料列來源記憶或 014 task-detail 概覽面板行為，並完成正典回寫。

- [ ] 3.1 執行本 change 全部回歸並保存證據。驗證：`cd design/prototype && corepack pnpm typecheck` 與 `PW_PORT=8899 corepack pnpm playwright test tests/task-management` 皆 exit 0（含既有 `task-new-*` 與 `task-detail-*` 相關測試，確認 013／014 共用引擎未被本次改動破壞）；`git diff <commit 1.1> HEAD -- design/prototype/tests/task-management/issue-755-field-role-input-hints.spec.ts` 除 2.1 明訂之新增斷言外，既有已轉綠斷言不得被弱化或刪除。 [@main]
- [ ] 3.2 Code Review（自我審查）：檢查 `FIELD_ROLE_INPUT_NAME_HINTS` 未硬編任務類型或輸出類型邏輯（Generalization-First）、推測邏輯僅涵蓋 Input 角色、未對 Evidence／Output 角色做任何自動推測、未新增或修改提交 payload 欄位或 ground-truth 可見性（Data Fairness）、`validateStep1()` 未被修改、diff 規模於 Principle X 門檻內（2 個手寫產品檔案、預估約 30–35 行）。 [@main]
- [ ] 3.3 QA Scenario 驗收：逐條核對 AC-1.6、AC-1.7、SC-002h 與 `issue-755-field-role-input-hints.spec.ts` 測試斷言一致；並於 `design/prototype/pages/task-management/task-detail.html` 概覽面板手動或既有回歸測試確認既有任務（`field_role_map` 已於任務初始設定當下決定）載入後角色顯示不受影響。 [@main]
- [ ] 3.4 Security Review（自我審查）：確認本次改動不引入使用者輸入注入面、不擴大 CORS、不新增任何後端呼叫或秘密處理、不透過欄名比對間接洩漏被標記為 Output／Evidence 之欄位內容；純前端 DOM／state 初始化邏輯調整。 [@main]
- [ ] 3.5 Source-Verify：`grep` 確認正典 `specs/task-management/013-task-new/spec.md` 內已逐字可定位 FR-002c-8、AC-1.6、AC-1.7、SC-002h 各段落，且七個欄名關鍵字逐字可定位；確認版本號 7.1.0 → 7.2.0 與 Changelog 新增列已寫入；確認 `FIELD_ROLE_INPUT_NAME_HINTS`／`state.fieldRoleMap`／`FIELD_ROLE_LABELS` 等程式碼識別字於對應原型檔案中皆可 grep 定位（proposal.md 之 Source-Verify 更正段落所列項目）。 [@main]
- [ ] 3.6 正典回寫附加動作：於正典 FR-002c-1 的預設值敘述後補一句交叉引用指向 FR-002c-8，使單獨閱讀 FR-002c-1 不會得到錯誤結論。此句刻意不進入 delta（delta 保持純新增以確保 archive 可套用至衍生檢視），因此衍生檢視與正典就此句存在已記錄的分歧。驗證：`grep -n 'FR-002c-8' specs/task-management/013-task-new/spec.md` 於 FR-002c-1 該行亦有命中。 [@main]
- [ ] 3.7 執行 `/opsx:archive` 等價流程：將本 change 的 delta 併入 `openspec/specs/task-management/013-task-new/spec.md`（derived view）、移動本 change 至 `openspec/changes/archive/`。PR 合併後另行更新 `specs/STATUS.md` 之 `task-management-013` 列由 `change-open` 改回 `in-progress`（比照本規格既有先例，013 為持續演進中的長期規格，非本次一次性完成後即封存的功能，不進入 `done`／`archived`）。 [@main]
