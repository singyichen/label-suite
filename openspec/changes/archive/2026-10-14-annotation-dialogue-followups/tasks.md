# 任務清單：annotation-dialogue-followups（issue #1358）

> **Apply 前硬閘（兩道，互不替代）**：先執行 `openspec validate --changes --no-interactive` 取得 OpenSpec schema validation，再執行 `scripts/check-sdd.sh` 取得 Project SDD lint，兩者皆通過後才進入下方群組。
>
> **TDD 硬規則**：每個可觀察行為皆為 Red（`[@senior-qa]`）＋ Green（`[@senior-frontend]`）配對；Red 先 commit 並留下預期失敗證據，Green 才能開始，且不得弱化 Red 契約。只有主 session 勾選 checkbox。
>
> **拆分**：單一 PR 群組（產品檔案 5 個，每群組 1 個），同時是最終群組，於本 PR 執行 archive。

## 0. 前置

**故事目標**（FR-107、SC-029）：流程狀態檔反映本 change 對 annotation-015 的 in-flight 狀態。

- [ ] 0.1 修改 `specs/STATUS.md`，於 annotation-015 列追加本 change 的 in-flight 說明（append-only，只改本列）。 [@main]

## 1. 提示文案（FR-107 第 9、10 點、SC-029）

**故事目標**（FR-107、SC-029）：「無法定位」與「重疊未標示」提示有中英文案。

> **產品檔案（1）**：`design/prototype/pages/task-management/task-config.data.js`

- [ ] 1.1 新增 `design/prototype/tests/annotation/issue-1358-dialogue-followups.spec.ts` 的 Red：中英兩語皆有「無法定位」與「重疊未標示」提示文案鍵，且含數量佔位。 [@senior-qa]
- [ ] 1.2 （Green）修改 `task-config.data.js` 補文案。 [@senior-frontend]

## 2. 引擎：不預填、重疊提示、定位失敗（FR-107 第 8、9、10 點、AC-2.36 ~ AC-2.38、SC-029）

**故事目標**（FR-107、SC-029）：物件陣列 Input 不從 Output 預填三元組；重疊實體顯示未標示數量；反白定位失敗不取第一次出現位置。

> **產品檔案（1）**：`design/prototype/pages/task-management/task-config.engine.js`
> **相依**：群組 1。

- [ ] 2.1 修改 `design/prototype/tests/annotation/issue-1358-dialogue-followups.spec.ts`，補 Red：對話 Input 搭配 `entity1` 形狀與 `subj`／`rel`／`obj` 形狀 Output 皆不預填且頁面不含其內容；兩個重疊實體時顯示未標示數量且 `previewEntities` 不變；無座標實體提示數量。 [@senior-qa]
- [ ] 2.2 （Green）修改 `task-config.engine.js`。 [@senior-frontend]

## 3. 摘要 helper 依 dialogue_fields（FR-106 第 3 點、SC-028）

**故事目標**（FR-106、SC-028）：摘要與搜尋字串依 `dialogue_fields.text` 取物件陣列文字；`null` 時不硬取 `text`。

> **產品檔案（1）**：`design/prototype/pages/annotation/annotation-workspace.data.js`
> **相依**：群組 2。

- [ ] 3.1 修改 `design/prototype/tests/annotation/issue-1358-dialogue-followups.spec.ts`，補 Red：`getRecordSummaryText` 傳入指向非 `text` 子欄位的 `dialogue_fields` 時取該子欄位；傳入 `null` 時為 `{n} 筆資料`。 [@senior-qa]
- [ ] 3.2 （Green）修改 `annotation-workspace.data.js` 的 `getRecordSummaryText`、`getRecordSearchText`。 [@senior-frontend]

## 4. 工作區：無座標定位與傳入設定（FR-107 第 9 點、AC-2.37、SC-029）

**故事目標**（FR-107、SC-029）：無座標時僅在唯一位置定位，多次出現不標示；摘要呼叫端傳入 `dialogueFields`。

> **產品檔案（1）**：`design/prototype/pages/annotation/annotation-workspace.config.js`
> **相依**：群組 3。

- [ ] 4.1 修改 `design/prototype/tests/annotation/issue-1358-dialogue-followups.spec.ts`，補 Red：無座標實體文字恰出現一次則定位、出現多次則不標示並顯示提示；已帶座標者照座標；左欄摘要依 dialogue_fields 的 text 子欄位。 [@senior-qa]
- [ ] 4.2 （Green）修改 `annotation-workspace.config.js`。 [@senior-frontend]

## 5. 標記清單呼叫端（FR-106、SC-028）

**故事目標**（FR-106、SC-028）：`annotation-list` 摘要與搜尋傳入 `dialogue_fields`，與工作區左欄一致。

> **產品檔案（1）**：`design/prototype/pages/annotation/annotation-list.html`
> **相依**：群組 3。

- [ ] 5.1 修改 `design/prototype/tests/annotation/issue-1358-dialogue-followups.spec.ts`，補 Red：dialogue_fields 的 text 子欄位 指向非 `text` 子欄位時，`annotation-list` 與工作區左欄摘要相同。 [@senior-qa]
- [ ] 5.2 （Green）修改 `annotation-list.html`。 [@senior-frontend]

## 6. 測試調整、回歸、審查、Source-Verify 與 archive

**故事目標**（FR-106、FR-107、SC-028、SC-029）：測試標題與摘要比對對齊現行種子、回歸通過、正典引用可定位，並完成 archive 寫回。

> **產品檔案（0）**：只改測試與 specs／openspec 寫回。
> **最終群組**：是。

- [ ] 6.1 對齊 `design/prototype/tests/dashboard/dashboard-output-types.spec.ts` 的 Input 摘要比對改讀 dialogue_fields 的 text 子欄位，不放寬斷言。 [@senior-qa]
- [ ] 6.2 對齊 `design/prototype/tests/annotation/issue-590-relation-compact-answer.spec.ts` 的測試標題與 T013 扁平種子，斷言不變。 [@senior-qa]
- [ ] 6.3 對齊 `design/prototype/tests/annotation/issue-590-relation-offsets-engine.spec.ts` 的測試標題與 T013 扁平種子，斷言不變。 [@senior-qa]
- [ ] 6.4 執行 typecheck、test:node 與範圍限定的 Playwright，皆 exit 0。 [@main]
- [ ] 6.5 senior-code-reviewer 獨立審查 Generalization-First、Data Fairness 與 DRY。 [@senior-code-reviewer]
- [ ] 6.6 Source-Verify：衍生檢視每一則正典引用皆可 grep 定位。 [@main]
- [ ] 6.7 執行 openspec archive，正典 015 寫回 12.7.0 至 12.8.0（MINOR）並新增 Changelog，同步衍生檢視 Purpose 版號。 [@main]
