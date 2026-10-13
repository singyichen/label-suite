# 任務清單：task-new-dialogue-fields（issue #1340）

> **Apply 前硬閘（兩道，互不替代）**：先執行 `openspec validate --changes --no-interactive` 取得 OpenSpec schema validation，再執行 `scripts/check-sdd.sh` 取得 Project SDD lint，兩者皆通過後才進入下方群組。
>
> **TDD 硬規則**：每個可觀察行為皆為 Red（`[@senior-qa]`）＋ Green（`[@senior-frontend]`）配對；Red 先 commit 並留下預期失敗證據，Green 才能開始，且不得弱化 Red 契約。只有主 session 勾選 checkbox。
>
> **範圍**：單一 PR，產品檔案 3 個（`task-config.data.js`、`task-config.engine.js`、`task-new.html`）。本 change 不碰 `annotation-workspace.*` 與 `annotation-list.html`（#1339 負責）；`getDatasetPreviewText()` 對字串 Input 的行為須逐位元組不變，以標記工作區 span 規格作回歸。

## 0. 前置

**故事目標**（SC-002j）：流程狀態檔與正典 frontmatter 反映本 change 對 task-management-013 的 in-flight 狀態。

- [x] 0.1 修改 `specs/STATUS.md`，將 task-management-013 狀態改為 change-open、分支欄改為本 change 分支。 [@main]
- [x] 0.2 修改 `specs/task-management/013-task-new/spec.md` 的 frontmatter 功能分支欄，使其與狀態檔一致；不動任何條文。 [@main]

## 1. 字串（FR-002c-10）

**故事目標**（SC-002j，AC-1.10）：新增對話串確認區所需的 zh／en 字串，作為 UI 唯一字串來源。

> **產品檔案（1）**：`design/prototype/pages/task-management/task-config.data.js`

- [ ] 1.1 新增 `design/prototype/tests/task-management/issue-1340-dialogue-fields.spec.ts` 的 Red：斷言 zh／en 字串表皆含對話串確認區的標題、提議勾選、文字／發言者／發言編號欄位標籤、「不使用」與「使用陣列序號」選項、剩餘則數提示。 [@senior-qa]
- [ ] 1.2 （Green）修改 `design/prototype/pages/task-management/task-config.data.js`，於 zh／en 字串表新增上述字串，不改既有鍵。 [@senior-frontend]

## 2. 偵測與確認（AC-1.10、AC-1.11）

**故事目標**（SC-002j，AC-1.10、AC-1.11）：Input 物件陣列欄位被偵測並預填，偵測不到時不提議，建立者可改或取消，失效時重新偵測。

> **產品檔案（1）**：`design/prototype/pages/task-management/task-config.engine.js`
> **相依**：群組 1。

- [ ] 2.1 修改 `design/prototype/tests/task-management/issue-1340-dialogue-fields.spec.ts`，補 Red：含 `utterances[]` 的資料集提議對話串並預填三個欄位；字串 Input、元素非物件、元素缺字串子欄位時不提議；更改對應與取消勾選後狀態更新且不被自動預填覆蓋；角色改走或換資料列來源後重新偵測。 [@senior-qa]
- [ ] 2.2 （Green）修改 `design/prototype/pages/task-management/task-config.engine.js`：偵測、預填、確認區與失效重新偵測（design.md D2、D3、D5）。 [@senior-frontend]

## 3. Step 2 預覽與文字來源（AC-1.12）

**故事目標**（SC-002j，AC-1.12）：Step 2 預覽以對話串呈現；Input 文字來源不輸出 `[object Object]`、不退回 Output／Evidence 欄位，字串 Input 行為不變。

> **產品檔案（0 新增）**：沿用 `task-config.engine.js`。
> **相依**：群組 2。

- [ ] 3.1 修改 `design/prototype/tests/task-management/issue-1340-dialogue-fields.spec.ts`，補 Red：Step 2 預覽每則一列含編號、發言者、文字；未確認時物件 Input 以 JSON 呈現；全頁無 `[object Object]`；無 Input 欄位時退回來源不選 Output／Evidence 欄位；字串 Input 的預覽文字與既有行為相同。 [@senior-qa]
- [ ] 3.2 （Green）修改 `design/prototype/pages/task-management/task-config.engine.js`：`getDatasetPreviewText()` 物件安全與退回排除、通用輸入文字區塊的對話串渲染（design.md D4）。 [@senior-frontend]

## 4. task-new 持久化（SC-002j）

**故事目標**（SC-002j）：對話串設定隨精靈草稿與建立任務 payload 帶出。

> **產品檔案（1）**：`design/prototype/pages/task-management/task-new.html`
> **相依**：群組 2。

- [ ] 4.1 修改 `design/prototype/tests/task-management/issue-1340-dialogue-fields.spec.ts`，補 Red：建立任務 payload 的 `dialogue_fields` 為確認的對應、未採用時為 `null`；重新載入精靈草稿後確認區仍為該對應；取消提議後重載仍為取消。 [@senior-qa]
- [ ] 4.2 （Green）修改 `design/prototype/pages/task-management/task-new.html`：狀態初始化、草稿可持久化鍵清單與建立任務 payload。 [@senior-frontend]

## 5. 回歸與審查

**故事目標**（SC-002j）：以外部工具與獨立審查確認未破壞 Step 1／Step 2 既有行為與標記工作區 span 規格。

> **產品檔案（0）**：只執行驗證與審查。

- [ ] 5.1 執行 typecheck、test:node 與範圍限定的 Playwright（新 spec、task-new／task-config 相關規格、標記工作區 span／seq tagging 規格），皆 exit 0。 [@main]
- [ ] 5.2 senior-code-reviewer 獨立審查 Generalization-First、Data Fairness 與 Principle X。 [@senior-code-reviewer]

## 6. Source-Verify 與 archive

**故事目標**（SC-002j）：正典引用可定位，並完成 archive 寫回。

> **產品檔案（0）**：只執行 specs／openspec 寫回。**最終群組**：是（單一 PR）。

- [ ] 6.1 Source-Verify 預掃，衍生檢視每一則正典引用皆可 grep 定位。 [@main]
- [ ] 6.2 執行 openspec archive，正典 013 寫回 8.4.0 至 8.5.0（MINOR）並新增 Changelog，同步衍生檢視 Purpose 版號，STATUS.md 依 append-only 規則更新。 [@main]
