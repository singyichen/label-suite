# 任務清單：annotation-dialogue-list-summary（issue #1378，PR-B2）

> **Apply 前硬閘（兩道，互不替代）**：先執行 `openspec validate --changes --no-interactive` 取得 OpenSpec schema validation，再執行 `scripts/check-sdd.sh` 取得 Project SDD lint，兩者皆通過後才進入下方群組。
>
> **TDD 硬規則**：每個可觀察行為皆為 Red（`[@senior-qa]`）＋ Green（`[@senior-frontend]`）配對；Red 先 commit 並留下預期失敗證據，Green 才能開始，且不得弱化 Red 契約。只有主 session／lead 勾選 checkbox。
>
> **範圍**：單一 PR，產品檔案 3 個（`annotation-workspace.data.js`、`annotation-workspace.config.js`、`annotation-workspace.html`）。

## 0. 前置

**故事目標**（SC-028，AC-1.39）：流程狀態檔反映本 change 對 annotation-015 的 in-flight 狀態。

- [x] 0.1 修改 `specs/STATUS.md`，於 annotation-015 列追加本 change 的 in-flight 說明（append-only，只改本列）。 [@main]

## 1. 資料層前綴與標籤（FR-106 第 6 點、AC-1.35、AC-1.39 ~ AC-1.41）

**故事目標**（SC-028，AC-1.39、AC-1.40、AC-1.41）：摘要 helper 對對話串加發言者前綴，並提供標籤 helper；不適用時維持原行為。

> **產品檔案（1）**：`design/prototype/pages/annotation/annotation-workspace.data.js`

- [x] 1.1 新增 `design/prototype/tests/annotation/issue-1378-dialogue-list-summary.spec.ts` 的 Red：T013 摘要為「發言者：第 1 筆文字」、標籤為 `5 則發言` 與 `3 位發言者`（英文 `5 turns`、`3 speakers`）；`dialogue_fields` 為 `null` 時無前綴、無標籤；`speaker` 為 `null` 時無前綴、僅有發言數標籤；搜尋字串不含前綴；不讀 Output 欄位。同時更新既有規格中對 T013 摘要的精確比對。 [@senior-qa]
- [x] 1.2 （Green）修改 `annotation-workspace.data.js`：前綴與 `getRecordSummaryTags`，共用選欄邏輯（design.md D1、D2）。 [@senior-frontend]

## 2. 左欄顯示與樣式（FR-106 第 6 點、AC-1.39）

**故事目標**（SC-028，AC-1.39）：左欄三處摘要旁顯示小標籤。

> **產品檔案（2）**：`design/prototype/pages/annotation/annotation-workspace.config.js`、`design/prototype/pages/annotation/annotation-workspace.html`
> **相依**：群組 1。

- [x] 2.1 修改 `design/prototype/tests/annotation/issue-1378-dialogue-list-summary.spec.ts`，補 Red：annotator 左欄項目、reviewer 分組表頭、例外池分組表頭皆出現 `ws-summary-tag`；`annotation-list` 摘要帶前綴但無標籤。 [@senior-qa]
- [x] 2.2 （Green）修改 `annotation-workspace.config.js` 渲染標籤，`annotation-workspace.html` 補標籤樣式（design.md D3）。 [@senior-frontend]

## 3. 回歸與審查

**故事目標**（SC-028，AC-1.35 ~ AC-1.41）：以外部工具與獨立審查確認既有摘要行為不變。

> **產品檔案（0）**：只執行驗證與審查。

- [x] 3.1 執行 typecheck、test:node 與範圍限定的 Playwright（新 spec，以及所有引用摘要的既有規格），皆 exit 0。 [@main]
- [x] 3.2 senior-code-reviewer 獨立審查 Generalization-First、Data Fairness 與 Principle X。 [@senior-code-reviewer]

## 4. Source-Verify 與 archive

**故事目標**（SC-028）：正典引用可定位，並完成 archive 寫回。

> **產品檔案（0）**：只執行 specs／openspec 寫回。**最終群組**：是（#1378 堆疊 PR 的最後一段）。

- [ ] 4.1 Source-Verify 預掃，衍生檢視每一則正典引用皆可 grep 定位。 [@main]
- [ ] 4.2 執行 openspec archive，正典 015 寫回 12.9.0 至 12.10.0（MINOR）並新增 Changelog，同步衍生檢視 Purpose 版號，STATUS.md 只改自己那列。 [@main]
