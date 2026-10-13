# 任務清單：annotation-list-summary-shared（issue #1339）

> **Apply 前硬閘（兩道，互不替代）**：先執行 `openspec validate --changes --no-interactive` 取得 OpenSpec schema validation，再執行 `scripts/check-sdd.sh` 取得 Project SDD lint，兩者皆通過後才進入下方群組。
>
> **TDD 硬規則**：每個可觀察行為皆為 Red（`[@senior-qa]`）＋ Green（`[@senior-frontend]`）配對；Red 先 commit 並留下預期失敗證據，Green 才能開始，且不得弱化 Red 契約。只有主 session 勾選 checkbox。
>
> **拆分**：單一 PR 群組（產品檔案 3 個），同時是最終群組，於本 PR 執行 archive。

## 0. 前置

**故事目標**（FR-106、SC-028）：流程狀態檔反映本 change 對 annotation-015 的 in-flight 狀態。

- [ ] 0.1 修改 `specs/STATUS.md`，於 annotation-015 列追加本 change 的 in-flight 說明（append-only，只改本列、不動其他列）。 [@main]

## 1. 共用摘要 helper（FR-106、AC-1.35、AC-1.37）

**故事目標**（FR-106、SC-028）：以單一 helper 取代 `getRecordPreviewText`，自動模式依資料形狀產生文字，不輸出 `[object Object]`。

> **產品檔案（1）**：`design/prototype/pages/annotation/annotation-workspace.data.js`

- [ ] 1.1 新增 `design/prototype/tests/annotation/issue-1339-list-summary.spec.ts` 的 Red：T013 工作區左欄與 annotation-list 摘要為 `utterances` 第 1 筆 `text` 且不含 `[object Object]`；不含文字欄位的物件陣列為 `{n} 筆資料`（英文 `{n} items`）；全空退回 `id`。 [@senior-qa]
- [ ] 1.2 （Green）修改 `annotation-workspace.data.js`：新增共用摘要 helper 並取代 `getRecordPreviewText`，`resolveTaskProfile` 帶出 `list_title_field`。 [@senior-frontend]

## 2. 工作區三處呼叫點（FR-106、AC-1.36）

**故事目標**（FR-106、SC-028）：標記員項目、reviewer 分組表頭、例外池分組表頭改用共用 helper 並讀取 `list_title_field`。

> **產品檔案（1）**：`design/prototype/pages/annotation/annotation-workspace.config.js`
> **相依**：群組 1。

- [ ] 2.1 修改 `design/prototype/tests/annotation/issue-1339-list-summary.spec.ts`，補 Red：任務指定 `list_title_field` 後三處皆顯示該欄位值；指向 Output 欄位時退回自動且任何摘要不含 Output 值。 [@senior-qa]
- [ ] 2.2 （Green）修改 `annotation-workspace.config.js` 三處呼叫點。 [@senior-frontend]

## 3. annotation-list 文本摘要（FR-106、SC-028）

**故事目標**（FR-106、SC-028）：`annotation-list` 文本摘要改呼叫同一個 helper。

> **產品檔案（1）**：`design/prototype/pages/annotation/annotation-list.html`
> **相依**：群組 1。

- [ ] 3.1 修改 `design/prototype/tests/annotation/issue-1339-list-summary.spec.ts`，補 Red：指定 `list_title_field` 後 annotation-list 摘要與工作區同字；Output 值不出現。 [@senior-qa]
- [ ] 3.2 （Green）修改 `annotation-list.html`：`getRecordSnippet` 呼叫共用 helper，並於清單 profile 帶出 `list_title_field`。 [@senior-frontend]

## 4. 回歸、審查、Source-Verify 與 archive

**故事目標**（FR-106、SC-028）：確認回歸通過、正典引用可定位，並完成 archive 寫回。

> **產品檔案（0）**：只執行驗證與 specs／openspec 寫回。
> **最終群組**：是。

- [ ] 4.1 執行 typecheck、test:node 與範圍限定的 Playwright（新 spec 與既有 annotation-list／workspace 摘要相關 spec），皆 exit 0。 [@main]
- [ ] 4.2 senior-code-reviewer 獨立審查 Generalization-First、Data Fairness 與 DRY。 [@senior-code-reviewer]
- [ ] 4.3 Source-Verify：衍生檢視每一則正典引用皆可 grep 定位。 [@main]
- [ ] 4.4 執行 openspec archive，正典 015 寫回 12.5.1 至 12.6.0（MINOR）並新增 Changelog，同步衍生檢視 Purpose 版號。 [@main]
