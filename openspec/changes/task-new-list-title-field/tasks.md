# 任務清單：task-new-list-title-field（issue #1338）

> **Apply 前硬閘（兩道，互不替代）**：先執行 `openspec validate --changes --no-interactive` 取得 OpenSpec schema validation，再執行 `scripts/check-sdd.sh` 取得 Project SDD lint，兩者皆通過後才進入下方群組。
>
> **TDD 硬規則**：每個可觀察行為皆為 Red（`[@senior-qa]`）＋ Green（`[@senior-frontend]`）配對；Red 先 commit 並留下預期失敗證據，Green 才能開始，且不得弱化 Red 契約。只有主 session 勾選 checkbox。
>
> **拆分總則（憲法原則 X）**：兩組堆疊 PR，change 保持 open，僅第二組（群組 5～8）執行 archive。第一組（群組 0～4）3 個產品檔案、第二組 3 個產品檔案，各組預估 ≤ 300 行。
>
> **已知過渡缺口**：第一組合併後，task-detail 設定›基本資料編輯模式因共用引擎已顯示「清單標題」下拉，但該值在 task-detail 尚不持久化；第二組補上。

## 0. 前置（第一組）

**故事目標**（SC-002i）：流程狀態檔與正典 frontmatter 反映本 change 對 task-management-013 的 in-flight 狀態。

- [x] 0.1 修改 `specs/STATUS.md`，將 task-management-013 狀態改為 change-open、分支欄改為本 change 的第一組分支。 [@main]
- [x] 0.2 修改 `specs/task-management/013-task-new/spec.md` 的 frontmatter 功能分支欄，使其與狀態檔一致；不動任何條文。 [@main]

## 1. 第一組 — 字串（FR-002c-9）

**故事目標**（SC-002i）：新增清單標題下拉、預覽、物件陣列後綴與回退提示的 zh／en 字串，作為 UI 唯一字串來源。

> **產品檔案（1）**：`design/prototype/pages/task-management/task-config.data.js`

- [x] 1.1 新增 `design/prototype/tests/task-management/issue-1338-list-title-field.spec.ts` 的 Red：斷言 zh／en 字串表皆含清單標題下拉標籤、自動選項、物件陣列後綴、預覽標題與回退提示。 [@senior-qa]
- [x] 1.2 （Green）修改 `design/prototype/pages/task-management/task-config.data.js`，於 zh／en 字串表新增上述字串，不改既有鍵。 [@senior-frontend]

## 2. 第一組 — 引擎（AC-1.8、AC-1.9）

**故事目標**（SC-002i）：Step 1 預覽提供清單標題下拉與即時標記清單預覽，Output 永不列入，所選欄位失效時回退自動並提示。

> **產品檔案（1）**：`design/prototype/pages/task-management/task-config.engine.js`
> **相依**：群組 1。

- [x] 2.1 修改 `design/prototype/tests/task-management/issue-1338-list-title-field.spec.ts`，補 Red：選項不含 Output 且含 Input／Evidence／id、物件陣列欄位帶後綴、預覽前 3 筆隨下拉／角色／資料列來源即時更新、所選欄位轉不使用或 Output 或不在新來源時回退自動並顯示提示。 [@senior-qa]
- [x] 2.2 （Green）修改 `design/prototype/pages/task-management/task-config.engine.js`，於內嵌預覽繪製流程動態建立下拉、預覽與提示（design.md D2～D4）。 [@senior-frontend]

## 3. 第一組 — task-new 持久化（SC-002i）

**故事目標**（SC-002i）：清單標題隨精靈草稿與建立任務 payload 帶出。

> **產品檔案（1）**：`design/prototype/pages/task-management/task-new.html`
> **相依**：群組 2。

- [x] 3.1 修改 `design/prototype/tests/task-management/issue-1338-list-title-field.spec.ts`，補 Red：選定後重新載入精靈草稿仍保留；建立任務 payload 的 list_title_field 為欄位名稱，自動時為 null。 [@senior-qa]
- [x] 3.2 （Green）修改 `design/prototype/pages/task-management/task-new.html`：狀態初始化、草稿可持久化鍵清單與建立任務 payload。 [@senior-frontend]

## 4. 第一組 — 回歸與審查

**故事目標**（SC-002i）：以外部工具與獨立審查確認第一組未破壞既有 Step 1 欄位預覽與 task-detail 基本資料行為。

> **產品檔案（0）**：只執行驗證與審查。

- [x] 4.1 執行 typecheck、test:node 與範圍限定的 Playwright（新 spec 與既有 task-new 欄位預覽、角色、task-detail 基本資料 spec），皆 exit 0。 [@main]
- [x] 4.2 senior-code-reviewer 獨立審查 Generalization-First、Data Fairness 與 Principle X。 [@senior-code-reviewer]

## 5. 第二組 — task-detail 設定載入（FR-014k，specs/task-management/014-task-detail/spec.md）

**故事目標**（SC-002i）：task-detail 開啟時載入任務的 list_title_field，編輯模式顯示同一值。

> **產品檔案（1）**：`design/prototype/pages/task-management/task-detail.data.js`
> **基底**：第一組分支（堆疊）。

- [ ] 5.1 新增 `design/prototype/tests/task-management/issue-1338-list-title-detail.spec.ts` 的 Red：task-new 建立任務後於 task-detail 設定›基本資料編輯模式開啟，下拉為同一值。 [@senior-qa]
- [ ] 5.2 （Green）修改 `design/prototype/pages/task-management/task-detail.data.js`：建立任務資料對應與可編輯欄位清單帶入 list_title_field。 [@senior-frontend]

## 6. 第二組 — task-detail 設定種子

**故事目標**（SC-002i）：task-detail 設定種子與資料集更換流程保留 list_title_field。

> **產品檔案（1）**：`design/prototype/pages/task-management/task-detail.config.js`
> **相依**：群組 5。

- [ ] 6.1 修改 `design/prototype/tests/task-management/issue-1338-list-title-detail.spec.ts`，補 Red：更換資料集後所選欄位失效時回退自動並提示，仍有效時保留。 [@senior-qa]
- [ ] 6.2 （Green）修改 `design/prototype/pages/task-management/task-detail.config.js`：設定種子與資料集更換流程處理 list_title_field。 [@senior-frontend]

## 7. 第二組 — task-detail 儲存

**故事目標**（SC-002i）：task-detail 基本資料儲存後重新載入仍保留 list_title_field。

> **產品檔案（1）**：`design/prototype/pages/task-management/task-detail.html`
> **相依**：群組 6。

- [ ] 7.1 修改 `design/prototype/tests/task-management/issue-1338-list-title-detail.spec.ts`，補 Red：編輯模式變更下拉並儲存，重新載入後保留。 [@senior-qa]
- [ ] 7.2 （Green）修改 `design/prototype/pages/task-management/task-detail.html`：狀態初始化、重置與儲存流程讀寫 list_title_field。 [@senior-frontend]

## 8. 第二組 — 回歸、Source-Verify 與 archive

**故事目標**（SC-002i）：確認第二組回歸通過、正典引用可定位，並完成 archive 寫回。

> **產品檔案（0）**：只執行驗證與 specs／openspec 寫回。
> **最終群組**：是。

- [ ] 8.1 執行第二組回歸、獨立審查與 Source-Verify，衍生檢視每一則正典引用皆可 grep 定位。 [@main]
- [ ] 8.2 執行 openspec archive，正典 013 寫回 8.3.2 至 8.4.0（MINOR）並新增 Changelog，同步衍生檢視 Purpose 版號；狀態檔列於 PR 合併後恢復。 [@main]

> **主 session 核實紀錄（第一組）**：Red `5bf452f6`（13 個案例，皆失敗於預期原因）、Green `5101887f`；審查（senior-code-reviewer）發現 H1（自動標題讀取角色為 Output 的 id，Data Fairness）與 M2（移除檔案後殘留所選欄位），Red `6fde5b69` 先行、Green `68500e94` 修正；範圍限定 Playwright 43 passed、typecheck 與 test:node（218 pass）通過。未處理、留待維護者裁定：M1（task-detail 內操作觸發未儲存標記但值不持久化，屬已知過渡缺口）；M3（`id` 角色為不使用時仍屬選項集合，FR／AC-1.9 文字未明示，建議第二組 archive 前於 delta 補一句）。群組 1～3 的 Red 因 QA 一次提交全部案例而合併為單一 Red commit。
