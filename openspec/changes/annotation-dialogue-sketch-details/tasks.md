# 任務清單：annotation-dialogue-sketch-details（issue #1378，PR-B1）

> **Apply 前硬閘（兩道，互不替代）**：先執行 `openspec validate --changes --no-interactive` 取得 OpenSpec schema validation，再執行 `scripts/check-sdd.sh` 取得 Project SDD lint，兩者皆通過後才進入下方群組。
>
> **TDD 硬規則**：每個可觀察行為皆為 Red（`[@senior-qa]`）＋ Green（`[@senior-frontend]`）配對；Red 先 commit 並留下預期失敗證據，Green 才能開始，且不得弱化 Red 契約。只有主 session／lead 勾選 checkbox。
>
> **範圍**：單一 PR，產品檔案 4 個（`task-config.data.js`、`task-detail.data.js`、`task-config.engine.js`、`task-config.css`）。FR-106 左欄清單摘要延後至 #1378 PR-B2，本 change 不碰 `annotation-workspace.*`、`annotation-list.html`。

## 0. 前置

**故事目標**（SC-029，AC-2.39）：流程狀態檔反映本 change 對 annotation-015 的 in-flight 狀態。

- [x] 0.1 修改 `specs/STATUS.md`，於 annotation-015 列追加本 change 的 in-flight 說明（append-only，只改本列）。 [@main]

## 1. 字串（FR-107 第 12、13 點）

**故事目標**（SC-029，AC-2.40、AC-2.42）：新增回應標記與切換按鈕的 zh／en 字串。

> **產品檔案（1）**：`design/prototype/pages/task-management/task-config.data.js`

- [ ] 1.1 新增 `design/prototype/tests/annotation/issue-1378-dialogue-sketch-details.spec.ts` 的 Red：zh／en 字串表皆含 `dialogueShowEntities`、`dialoguePlainText`、`dialogueReplyTag`，且 `dialogueReplyTag` 含 `{n}`。 [@senior-qa]
- [ ] 1.2 （Green）修改 `task-config.data.js` 新增上述字串，不改既有鍵。 [@senior-frontend]

## 2. T013 種子（AC-2.43）

**故事目標**（SC-029，AC-2.43）：T013 種子宣告 `reply_to`，且有回覆前一則的發言。

> **產品檔案（1）**：`design/prototype/pages/task-management/task-detail.data.js`
> **相依**：群組 1。

- [ ] 2.1 修改 `design/prototype/tests/annotation/issue-1378-dialogue-sketch-details.spec.ts`，補 Red：T013 的 `reply_to` 設定 非 `null`，至少一則發言的 `reply_to` 等於前一則的發言編號，且無任何發言的 `reply_to` 等於自己的發言編號。 [@senior-qa]
- [ ] 2.2 （Green）修改 `task-detail.data.js`：`dialogue_fields` 補 `reply_to`，`absa-001` 的發言補 `reply_to` 值。 [@senior-frontend]

## 3. 版面與回覆（FR-107 第 11、12 點、AC-2.39 ~ AC-2.41）

**故事目標**（SC-029，AC-2.39、AC-2.40、AC-2.41）：整合預覽每則發言為頭像、標頭行、另起一行的文字；有效回覆縮排並標記，無效回覆不縮排。

> **產品檔案（1）**：`design/prototype/pages/task-management/task-config.engine.js`
> **相依**：群組 1、2。

- [ ] 3.1 修改 `design/prototype/tests/annotation/issue-1378-dialogue-sketch-details.spec.ts`，補 Red：頭像內容為發言者第一個字元且同發言者同色、`speaker` 為 `null` 不顯示頭像；有效 `reply_to` 的列帶 `data-reply-to` 與 `dialogue-reply-tag` 文字含被回覆編號；`reply_to` 缺漏、找不到對應、指向自己時皆無 `data-reply-to` 與標記；`dialogue_fields` 缺 `reply_to` 鍵時無任何標記；task-new Step 1 預覽不出現頭像。 [@senior-qa]
- [ ] 3.2 （Green）修改 `task-config.engine.js`：`renderDialogueThread` 的 `rich` 選項 版面、回覆有效性判定、`renderDialogueInput` 傳入 `rich`（design.md D1～D4）。 [@senior-frontend]

## 4. 切換（FR-107 第 13 點、AC-2.42）

**故事目標**（SC-029，AC-2.42）：「顯示已標實體」與「純文字」切換，預設顯示實體。

> **產品檔案（1）**：`design/prototype/pages/task-management/task-config.engine.js`
> **相依**：群組 3。

- [ ] 4.1 修改 `design/prototype/tests/annotation/issue-1378-dialogue-sketch-details.spec.ts`，補 Red：兩按鈕預設「顯示已標實體」`aria-pressed="true"`；按「純文字」後無實體標示 span、`aria-pressed` 互換、實體資料不變；再按回來標示恢復；純文字模式下仍可反白新增實體。 [@senior-qa]
- [ ] 4.2 （Green）修改 `task-config.engine.js`：`dialogueShowEntities` 狀態 與切換按鈕、`fillText` 分流（design.md D5）。 [@senior-frontend]

## 5. 樣式（FR-107 第 11、12 點）

**故事目標**（SC-029，AC-2.39、AC-2.40）：頭像、縮排、標記與切換有對應樣式。

> **產品檔案（1）**：`design/prototype/pages/task-management/task-config.css`
> **相依**：群組 3、4。

- [ ] 5.1 修改 `design/prototype/tests/annotation/issue-1378-dialogue-sketch-details.spec.ts`，補 Red：頭像為圓形（`border-radius` 為 50%）、有效回覆列的 `margin-left` 大於 0 且一般列為 0、`dialogue-text` 在標頭行下方另起一行。 [@senior-qa]
- [ ] 5.2 （Green）修改 `task-config.css`：頭像、縮排、標記、切換按鈕樣式，沿用既有 token。 [@senior-frontend]

## 6. 回歸與審查

**故事目標**（SC-029，AC-2.39 ~ AC-2.43）：以外部工具與獨立審查確認 task-new 預覽與工作區既有行為不變。

> **產品檔案（0）**：只執行驗證與審查。

- [ ] 6.1 執行 typecheck、test:node 與範圍限定的 Playwright（新 spec、issue-1340、issue-1341、issue-1358、issue-1376、1378 PR-A 規格，以及所有引用 `dialogue-` selector 的規格），皆 exit 0。 [@main]
- [ ] 6.2 senior-code-reviewer 獨立審查 Generalization-First、Data Fairness 與 Principle X。 [@senior-code-reviewer]

## 7. Source-Verify 與 archive

**故事目標**（SC-029）：正典引用可定位，並完成 archive 寫回。

> **產品檔案（0）**：只執行 specs／openspec 寫回。**最終群組**：否（#1378 堆疊 PR 的第一段；archive 因維護者派工裁定隨本 change 完成，PR-B2 以另一個 change 堆疊其上）。

- [ ] 7.1 Source-Verify 預掃，衍生檢視每一則正典引用皆可 grep 定位。 [@main]
- [ ] 7.2 執行 openspec archive，正典 015 寫回 12.8.0 至 12.9.0（MINOR）並新增 Changelog，同步衍生檢視 Purpose 版號，STATUS.md 只改自己那列。 [@main]
