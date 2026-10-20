# 任務清單：annotation-preview-prefill-fields（issue #1430，PR-B）

> **Apply 前硬閘（兩道，互不替代）**：先執行 `openspec validate --changes --no-interactive` 取得 OpenSpec schema validation，再執行 `scripts/check-sdd.sh` 取得 Project SDD lint，兩者皆通過後才進入下方群組。
>
> **TDD 硬規則**：每個可觀察行為皆為 Red（`[@senior-qa]`）＋ Green（`[@senior-frontend]`）配對；Red 先 commit 並留下預期失敗證據，Green 才能開始，且不得弱化 Red 契約。只有主 session／lead 勾選 checkbox。
>
> **範圍**：單一 PR，產品檔案 3 個（`task-config.engine.js`、`annotation-workspace.data.js`、`annotation-workspace.config.js`）。堆疊在 PR-A（013 v8.7.0）之上。

## 0. 前置

**故事目標**（SC-029，AC-2.50）：流程狀態檔反映本 change 對 annotation-015 的 in-flight 狀態。

- [x] 0.1 修改 `specs/STATUS.md` 的 annotation-015 列備註，加上本 change in-flight 的一句紀錄；不動其他列。 [@main]

## 1. 工作區帶出宣告（AC-2.50）

**故事目標**（SC-029，AC-2.50）：工作區的設定狀態帶入任務宣告的 `prefill_fields`，未宣告為 `null`。

> **產品檔案（2）**：`design/prototype/pages/annotation/annotation-workspace.data.js` 與工作區設定狀態接收檔（見 design.md D3）。

- [x] 1.1 新增 `design/prototype/tests/annotation/issue-1430-prefill-fields-preview.spec.ts` 的 Red：開啟 T008 工作區後工作區狀態的 `prefillFields` 為 `{ entities: 'entities', triples: null }`；開啟未宣告的任務為 `null`。 [@senior-qa]
- [x] 1.2 （Green）修改 `annotation-workspace.data.js`：`resolveTaskProfile` 帶出 `prefillFields`，並由工作區設定狀態接收。 [@senior-frontend]

## 2. 預填實體與三元組只讀宣告欄位（AC-2.50、AC-2.51、AC-2.52）

**故事目標**（SC-029，AC-2.50、AC-2.51、AC-2.52）：預覽只從宣告且通過角色守門的欄位預填，未宣告不預填，守門涵蓋三元組。

> **產品檔案（1）**：`design/prototype/pages/task-management/task-config.engine.js`
> **相依**：群組 1。

- [x] 2.1 修改 `design/prototype/tests/annotation/issue-1430-prefill-fields-preview.spec.ts`，補 Red：宣告欄位被讀取、同名未宣告欄位被忽略（AC-2.50）；三元組宣告欄位在 Evidence 時載入、Output／未知時不預填且頁面文字不含內容（AC-2.51）；`prefill_fields` 為 `null`、缺鍵、子鍵缺漏時，名為 `entities`、`triples`、`gold_triplets`、`gold_triples` 的欄位不預填（AC-2.52）；Output 欄位解析路徑不變（AC-2.45）。同時依 design.md D5 清單更新釘住舊硬編鍵名行為的既有規格（改為宣告 `prefill_fields` 並把欄位角色改為 Evidence，或改斷言新契約）。 [@senior-qa]
- [x] 2.2 （Green）修改 `task-config.engine.js`：新增單一讀取 helper，`initPreviewState` 的實體與三元組改由該 helper 取得，移除固定鍵名。 [@senior-frontend]

## 3. 關係類型自動帶入（AC-2.53）

**故事目標**（SC-029，AC-2.53）：關係類型清單只由宣告且通過守門的三元組欄位自動帶入。

> **產品檔案（1）**：`design/prototype/pages/task-management/task-config.engine.js`
> **相依**：群組 2。

- [x] 3.1 修改 `design/prototype/tests/annotation/issue-1430-prefill-fields-preview.spec.ts`，補 Red：宣告且為 Evidence 的三元組欄位帶入不重複標籤；未宣告或 Output 時不帶入（AC-2.53）；task-new 預覽 medical-ner-re 複合檔案的既有斷言改為新契約。 [@senior-qa]
- [x] 3.2 （Green）修改 `task-config.engine.js`：關係類型自動帶入的候選改為宣告且通過守門的三元組欄位，移除固定鍵名。 [@senior-frontend]

## 4. 回歸與審查

**故事目標**（SC-029，AC-2.50 ~ AC-2.53）：以外部工具與獨立審查確認既有行為不變。

- [x] 4.1 執行 typecheck、test:node 與範圍限定的 Playwright（新 spec、design.md D5 清單與所有引用預填來源的規格），皆 exit 0。 [@main]
- [x] 4.2 senior-code-reviewer 獨立審查 Generalization-First、Data Fairness 與 Principle X。 [@senior-code-reviewer]

## 5. Source-Verify 與 archive

**故事目標**（SC-029）：正典引用可定位，並完成 archive 寫回。

> **最終群組**：是（#1430 最後一個 change）。

- [x] 5.1 Source-Verify 預掃，衍生檢視每一則正典引用皆可 grep 定位。 [@main]
- [x] 5.2 執行 openspec archive，正典 015 寫回 12.12.0 至 12.13.0（MINOR）並新增 Changelog，同步衍生檢視 Purpose 版號，STATUS.md 只改自己那列。 [@main]
