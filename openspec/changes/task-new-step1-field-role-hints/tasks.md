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

- [x] 2.1 修改 `design/prototype/tests/task-management/issue-755-field-role-input-hints.spec.ts`，補上 Red 契約：(a) 上傳一份欄名為 `['id', 'text', 'label']`（僅 `text` 命中線索）的測試資料集，斷言 `renderInlineDatasetPreview()` 完成後 `state.fieldRoleMap.text` 為 `'input'`、`state.fieldRoleMap.id`／`state.fieldRoleMap.label` 皆非 `'input'`（維持「不使用」）；(b) 上傳欄名為 `['text', 'content', 'sentence']`（三者皆命中線索）之資料集、`input_type` 為 `single_item`，斷言僅第一個依原始出現順序命中的欄位（`text`）被指定為 Input，其餘兩個命中欄位仍為「不使用」；(c) 針對 (a) 之欄位，先手動將 `text` 的角色改為 `'evidence'`，再觸發同一資料集的重新初始化（如切換資料列來源後切回），斷言 `state.fieldRoleMap.text` 維持使用者手動指定的 `'evidence'`、不被推測邏輯覆寫。驗證：`PW_PORT=8899 corepack pnpm playwright test tests/task-management/issue-755-field-role-input-hints.spec.ts` 新增斷言失敗，失敗原因須為 `state.fieldRoleMap` 未依欄名線索預填 Input（維持全數「不使用」之既有行為）；1.1 斷言維持綠燈。 [@senior-qa]
- [x] 2.2 （Green）修改 `design/prototype/pages/task-management/task-config.engine.js`：於 `renderInlineDatasetPreview()` 內「Init fieldRoleMap for any new columns not yet in state」既有初始化迴圈中，對尚未指定過角色（即該欄位在 `state.fieldRoleMap` 中不存在，且不在 FR-002c-4 資料列來源記憶還原範圍內）的欄位，依欄名（不分大小寫）比對 `FIELD_ROLE_INPUT_NAME_HINTS` 子字串，命中者依原始出現順序指定為 `'input'`，至多至當下 `input_type` 所需 Input 數量上限（`single_item` 1、`item_pair` 2、未選定時 1）；超出上限或未命中維持既有「不使用」初始值。不得修改 Evidence／Output 角色的初始化邏輯，不得修改該迴圈以外的程式碼。驗證：`PW_PORT=8899 corepack pnpm playwright test tests/task-management/issue-755-field-role-input-hints.spec.ts` 之 1.1、2.1 斷言皆轉綠。 [@senior-frontend]

> **主 session 裁決（2026-09-16，任務 2.2 落地後的既有回歸衝突）**：任務 2.2 依約落地後，`tests/task-management` 全量回歸出現 2 個確定性失敗（非 flake，主 session 以 `PW_PORT=8911` 獨立重現得同樣 2 failed／38 passed）。根因是共用測試資料 three-column-dataset.json 的欄名 sentence_a 命中線索關鍵字 sentence，使兩條既有測試賴以成立的前提「上傳資料集後所有欄位皆為不使用」被 FR-002c-8 正面推翻。三個處理方向中，改欄名迴避關鍵字會讓主回歸套件從此不會在寫實資料集上觸及新行為、且該資料被 4 個 spec 共用，收窄為精確比對則牴觸本 change 明訂的子字串語意與維護者裁決①；故裁定**保留 2.2 實作不變，改為對齊那兩條既有測試的前提設定**，並以任務 2.3、2.4 承載。兩條測試的受測需求（FR-002c-2 的 Input 數量阻擋、既存標籤在換資料集後不外洩）皆未改變，只有重建前提的方式改變，覆蓋率不得因此下降。

> **另一項複驗結論（不需處理）**：2.2 的上限計數器只計入本次推測出的欄位，未計入角色表中既有的 `input`。主 session 確認此情境在介面上不可達——附加檔案受 FR-002d 強制同欄位集、資料列來源切換是整份角色表換掉、`analyzeDataset()` 對欄位只做刪除不做新增，故不存在「角色表已有 input 且同時出現新欄位」的路徑。依 Simplicity First 與既有「別為不可能的情境寫測試」的教訓，不為此加防禦碼也不加測試。

> **主 session 核實紀錄（2026-09-16，Green 2.2）**：Green 於 `abe0afa6` 落地，`git show --stat` 為單一產品檔 12 行新增／1 行刪除，零測試檔、零 openspec 檔，提交後工作區乾淨。主 session 逐行複核 diff：推測邏輯確實寫在 `state.fieldRoleMap[col] === undefined` 分支內（符合本節實作定位），上限由 `(state.taskInputTypes && state.taskInputTypes[0]) || 'single_item'` 推導、與本檔 :3506、:4357、:4795 既有讀法一致，關鍵字沿用 `FIELD_ROLE_INPUT_NAME_HINTS` 單一來源未另立副本，Evidence／Output 角色初始化與迴圈外程式碼皆未更動，符合任務 2.2 的兩項禁止事項。主 session 獨立重跑 `PW_PORT=8913 corepack pnpm playwright test tests/task-management/issue-755-field-role-input-hints.spec.ts` 得 **4 passed**，任務 1.1 的既有斷言與 2.1 的 (a)(b)(c) 三案例全數轉綠。

- [x] 2.3 修改 `design/prototype/tests/task-management/task-new-input-count-validation.spec.ts`：該檔「single_item 0 個 Input 欄位」案例原本仰賴上傳資料集後所有欄位皆為不使用這個 FR-002c-8 之前的預設，現因欄名 sentence_a 命中線索而自動取得 input，需在該案例中明確把 sentence_a 的角色改選回不使用以重建 0 個 Input 的前提，使 FR-002c-2 的阻擋斷言維持原義，並順帶涵蓋使用者覆寫推測結果的能力；同檔其餘五個案例的斷言與設定維持原樣。驗證：`PW_PORT=8899 corepack pnpm playwright test tests/task-management/task-new-input-count-validation.spec.ts` 全數 passed。 [@senior-qa]
- [x] 2.4 修改 `design/prototype/tests/task-management/task-detail-task-profiles.spec.ts`：T011 重換資料集後推導 item pair 標籤的案例原本斷言標籤回退為通用名稱「句子 A」，該回退只在沒有任何欄位被指定為 Input 時成立；FR-002c-8 落地後 sentence_a 與 sentence_b 皆自動取得 input，getItemPairLabels() 因而改用資料集欄名作為預設標籤，需把該案例的期望值改為實測到的欄名預設值，並補一條斷言確認標籤不等於先前已儲存的「前提」，讓舊標籤不外洩這個原始測試意圖在檔面上保持可見。驗證：`PW_PORT=8899 corepack pnpm playwright test tests/task-management/task-detail-task-profiles.spec.ts` 全數 passed。 [@senior-qa]

> **主 session 核實紀錄（2026-09-19，任務 2.3／2.4）**：2.3 於 `d2d31a98` 落地（`task-new-input-count-validation.spec.ts:44` 於 0 個 Input 案例明確呼叫 `setFieldRole(page, 'sentence_a', '')` 重建前提，其餘五個案例未動）；2.4 於 `eafaea60` 落地（`task-detail-task-profiles.spec.ts:416-417` 期望值改為 `sentence_a` 並補 `not.toHaveValue('前提')`）。本分支落後 main 377 個 commit，以 merge `92dab975` 併入 `origin/main`（不 rebase，保住上列證據 SHA）後，主 session 以 `PW_PORT=8966` 獨立重跑本 change 三支受影響 spec 得 72 passed。

> **主 session 核實紀錄（2026-09-16，Red 2.1）**：Red 於 `e265f081` 落地，`git show --stat` 為單一測試檔 109 行純新增、零刪除，hunk 標頭 `@@ -20,3 +20,112 @@` 證實任務 1.1 的既有測試逐字未動，零產品檔、工作區乾淨。主 session 獨立重跑 `PW_PORT=8905` 確認 **2 failed／2 passed**，(a)(b) 皆失敗於 `Expected: "input" / Received: ""`，即欄名線索尚未影響 `state.fieldRoleMap` 的既有預設行為，屬契約性失敗；(a) 另已確認上傳與預覽節點皆成功渲染後才取值，非載入或選擇器假紅。(c) 先天為綠且經複驗為**真實護欄**而非空轉：資料列來源切換處理器會把角色表整份存入來源記憶、再以新來源的記憶（不存在時為空物件）取代之，切走時該表確實被清空並重新初始化，切回才還原使用者手動指定值——故 (c) 真的走過一次來回，可有效攔截任務 2.2 覆寫使用者意圖。

> **給任務 2.2 的實作定位（主 session 複驗）**：初始化迴圈在 `design/prototype/pages/task-management/task-config.engine.js` 的 :5341-5345，條件為該欄位在角色表中為 `undefined` 才填入空字串。推測邏輯必須**寫在同一個 `undefined` 分支內**：首次渲染後所有欄位都已是空字串而非 `undefined`，故推測天然只會對每個來源觸發一次；若改在空字串時也推測，會覆寫使用者刻意選回「不使用」的欄位。

## 3. 回歸、審查與最終 archive

> **產品檔案（0）**：本組只執行驗證命令與 `specs/**`／`openspec/**` 寫回，不修改任何應用程式產品檔案。
> **最終群組**：是。本組執行 Source-Verify、正典回寫與 `/opsx:archive`。
> **相依**：群組 1～2 全數完成。

**故事目標**（SC-002h）：以完整回歸、自我審查與 Source-Verify 證據，確認 Input 欄名自動推測落地且未影響既有欄位角色手動指定、資料列來源記憶或 014 task-detail 概覽面板行為，並完成正典回寫。

- [ ] 3.1 執行本 change 全部回歸並保存證據。驗證：`cd design/prototype && corepack pnpm typecheck` 與 `PW_PORT=8899 corepack pnpm playwright test tests/task-management` 皆 exit 0（含既有 `task-new-*` 與 `task-detail-*` 相關測試，確認 013／014 共用引擎未被本次改動破壞）；`git diff <commit 1.1> HEAD -- design/prototype/tests/task-management/issue-755-field-role-input-hints.spec.ts` 除 2.1 明訂之新增斷言外，既有已轉綠斷言不得被弱化或刪除。 [@main]
- [x] 3.2 Code Review（自我審查）：檢查 `FIELD_ROLE_INPUT_NAME_HINTS` 未硬編任務類型或輸出類型邏輯（Generalization-First）、推測邏輯僅涵蓋 Input 角色、未對 Evidence／Output 角色做任何自動推測、未新增或修改提交 payload 欄位或 ground-truth 可見性（Data Fairness）、`validateStep1()` 未被修改、diff 規模於 Principle X 門檻內（2 個手寫產品檔案、預估約 30–35 行）。 [@main]
- [x] 3.3 QA Scenario 驗收：逐條核對 AC-1.6、AC-1.7、SC-002h 與 `issue-755-field-role-input-hints.spec.ts` 測試斷言一致；並於 `design/prototype/pages/task-management/task-detail.html` 概覽面板手動或既有回歸測試確認既有任務（`field_role_map` 已於任務初始設定當下決定）載入後角色顯示不受影響。 [@main]
- [x] 3.4 Security Review（自我審查）：確認本次改動不引入使用者輸入注入面、不擴大 CORS、不新增任何後端呼叫或秘密處理、不透過欄名比對間接洩漏被標記為 Output／Evidence 之欄位內容；純前端 DOM／state 初始化邏輯調整。 [@main]
- [x] 3.5 Source-Verify：`grep` 確認正典 `specs/task-management/013-task-new/spec.md` 內已逐字可定位 FR-002c-8、AC-1.6、AC-1.7、SC-002h 各段落，且七個欄名關鍵字逐字可定位；確認版本號 8.0.0 → 8.1.0（原寫 7.1.0 → 7.2.0，為 propose 時的基準；issue #724／PR #770 已將 013 推進至 8.0.0，本 change 為純 ADDED 故 MINOR）與 Changelog 新增列已寫入；確認 `FIELD_ROLE_INPUT_NAME_HINTS`／`state.fieldRoleMap`／`FIELD_ROLE_LABELS` 等程式碼識別字於對應原型檔案中皆可 grep 定位（proposal.md 之 Source-Verify 更正段落所列項目）。 [@main]
- [x] 3.6 正典回寫附加動作：於正典 FR-002c-1 的預設值敘述後補一句交叉引用指向 FR-002c-8，使單獨閱讀 FR-002c-1 不會得到錯誤結論。此句刻意不進入 delta（delta 保持純新增以確保 archive 可套用至衍生檢視），因此衍生檢視與正典就此句存在已記錄的分歧。驗證：`grep -n 'FR-002c-8' specs/task-management/013-task-new/spec.md` 於 FR-002c-1 該行亦有命中。 [@main]
- [ ] 3.7 執行 `/opsx:archive` 等價流程：將本 change 的 delta 併入 `openspec/specs/task-management/013-task-new/spec.md`（derived view）、移動本 change 至 `openspec/changes/archive/`。PR 合併後另行更新 `specs/STATUS.md` 之 `task-management-013` 列由 `change-open` 改回 `in-progress`（比照本規格既有先例，013 為持續演進中的長期規格，非本次一次性完成後即封存的功能，不進入 `done`／`archived`）。 [@main]

> **主 session 核實紀錄（2026-09-19，任務 3.2～3.6）**：
>
> - **3.2**：相對 merge-base 的產品 diff 僅 `task-config.data.js`（+5）與 `task-config.engine.js`（+12／−1），合計 17 行、2 檔，低於 Principle X 門檻；`FIELD_ROLE_INPUT_NAME_HINTS` 為純字串陣列、未依任務或輸出類型分支（Generalization-First）；推測只寫 `'input'`，diff 中 evidence／output 僅出現在未改動的 `FIELD_ROLE_LABELS` 上下文行；`validateStep1()`、提交 payload 與 ground-truth 可見性零改動。已知取捨：`item_pair` → 2 的上限沿用 `task-new.html` 既有的寫死慣例（該檔同樣以字面值判斷 `item_pair`），全庫無共用常數，抽取需修改 `validateStep1()`，與本任務禁令衝突，故不抽取。
> - **3.3**：AC-1.6 ↔ 2.1 (a)、AC-1.7 ↔ 2.1 (c) 的來源切換來回、SC-002h 的上限 ↔ 2.1 (b)；task-detail 概覽由既有 `task-detail-task-profiles.spec.ts` 回歸涵蓋（2.4 已對齊）。
> - **3.4**：純前端 state 初始化，欄名只做 `toLowerCase().indexOf()` 比對、不寫入 DOM；無新後端呼叫、CORS 或秘密；Evidence／Output 永不推測，`gold_label`（7 份 fixture）／`gold_answer`（1 份）／`gold_entities`（1 份）不會因欄名被自動設為 Output。
> - **3.5**：正典 `specs/task-management/013-task-new/spec.md` `版本: 8.1.0`，FR-002c-8 於 :556、AC-1.6／AC-1.7 於 :172-173、SC-002h 於 :750、Changelog 8.1.0 列於 :796，七個關鍵字與 FR-003g-5（:584）皆可 grep 定位；程式識別字 `FIELD_ROLE_INPUT_NAME_HINTS` 於 `task-config.data.js:595`／`task-config.engine.js:5347`。
> - **3.6**：FR-002c-1（:549）已補「（欄名命中 Input 線索之例外見 FR-002c-8）」。
