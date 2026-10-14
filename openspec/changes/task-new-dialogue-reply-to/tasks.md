# 任務清單：task-new-dialogue-reply-to（issue #1378，PR-A）

> **Apply 前硬閘（兩道，互不替代）**：先執行 `openspec validate --changes --no-interactive` 取得 OpenSpec schema validation，再執行 `scripts/check-sdd.sh` 取得 Project SDD lint，兩者皆通過後才進入下方群組。
>
> **TDD 硬規則**：每個可觀察行為皆為 Red（`[@senior-qa]`）＋ Green（`[@senior-frontend]`）配對；Red 先 commit 並留下預期失敗證據，Green 才能開始，且不得弱化 Red 契約。只有主 session／lead 勾選 checkbox。
>
> **範圍**：單一 PR，產品檔案 2 個（`task-config.data.js`、`task-config.engine.js`）。本 change 不碰 `annotation-workspace.*`、`annotation-list.html`、`task-detail.data.js`（第二個 change 負責）；`task-new.html` 已整體傳遞 `state.dialogueFields`，不需修改。

## 0. 前置

**故事目標**（SC-002j，AC-1.13）：流程狀態檔反映本 change 對 task-management-013 的 in-flight 狀態。

- [x] 0.1 修改 `specs/STATUS.md` 的 task-management-013 列備註，加上本 change in-flight 的一句紀錄；不動其他列。 [@main]

## 1. 字串（FR-002c-10）

**故事目標**（SC-002j，AC-1.13）：新增「回覆對象欄位」下拉所需的 zh／en 字串。

> **產品檔案（1）**：`design/prototype/pages/task-management/task-config.data.js`

- [ ] 1.1 新增 `design/prototype/tests/task-management/issue-1378-dialogue-reply-to-config.spec.ts` 的 Red：斷言 zh／en 字串表皆含 `dialogueReplyToLabel`、`dialogueReplyToNoneOption`。 [@senior-qa]
- [ ] 1.2 （Green）修改 `task-config.data.js`，於 zh／en 字串表新增上述字串，不改既有鍵。 [@senior-frontend]

## 2. 候選、確認與失效（AC-1.13、AC-1.14）

**故事目標**（SC-002j，AC-1.13、AC-1.14）：確認區出現「回覆對象欄位」下拉，預設留空，可選擇與清除，失效時只清除該對應。

> **產品檔案（1）**：`design/prototype/pages/task-management/task-config.engine.js`
> **相依**：群組 1。

- [ ] 2.1 修改 `design/prototype/tests/task-management/issue-1378-dialogue-reply-to-config.spec.ts`，補 Red：有候選時下拉預設「不使用」、候選不含文字欄位；選擇與清除後 reply_to 對應更新；無候選時不顯示下拉；`reply_to` 失效時只清該對應、其餘保留；切換勾選重新預填時 `reply_to` 為 `null`。 [@senior-qa]
- [ ] 2.2 （Green）修改 `task-config.engine.js`：候選偵測、`prefillDialogueFields` 與 `dialogueFieldsValid` 對 `reply_to` 的處理、確認區下拉（design.md D1～D4）。 [@senior-frontend]

## 3. payload 與草稿（SC-002j）

**故事目標**（SC-002j，AC-1.14）：`reply_to` 隨建立任務 payload 帶出，草稿重載後保留；既有斷言隨形狀更新。

> **產品檔案（0 新增）**：沿用群組 2 的引擎狀態；`task-new.html` 不修改。
> **相依**：群組 2。

- [ ] 3.1 修改 `design/prototype/tests/task-management/issue-1378-dialogue-reply-to-config.spec.ts`，補 Red：已選 reply_to 的 payload 與草稿重載後仍為該對應，未選為 null；既有 issue-1340 規格的 payload 斷言同步改為含 reply_to。 [@senior-qa]
- [ ] 3.2 （Green）確認群組 2 實作使 3.1 通過；僅在必要時微調 `task-config.engine.js`。 [@senior-frontend]

## 4. 回歸與審查

**故事目標**（SC-002j，AC-1.13、AC-1.14）：以外部工具與獨立審查確認 Step 1／Step 2 與標記工作區既有行為不變。

> **產品檔案（0）**：只執行驗證與審查。

- [ ] 4.1 執行 typecheck、test:node 與範圍限定的 Playwright（新 spec、所有引用 `dialogue_fields`／`dialogue-field-` 的規格），皆 exit 0。 [@main]
- [ ] 4.2 senior-code-reviewer 獨立審查 Generalization-First、Data Fairness 與 Principle X。 [@senior-code-reviewer]

## 5. Source-Verify 與 archive

**故事目標**（SC-002j）：正典引用可定位，並完成 archive 寫回。

> **產品檔案（0）**：只執行 specs／openspec 寫回。**最終群組**：否（堆疊 PR 的第一個 change；archive 因維護者派工裁定隨本 change 完成，PR-B 以另一個 change 堆疊其上）。

- [ ] 5.1 Source-Verify 預掃，衍生檢視每一則正典引用皆可 grep 定位。 [@main]
- [ ] 5.2 執行 openspec archive，正典 013 寫回 8.5.2 至 8.6.0（MINOR）並新增 Changelog，同步衍生檢視 Purpose 版號，STATUS.md 只改自己那列。 [@main]
