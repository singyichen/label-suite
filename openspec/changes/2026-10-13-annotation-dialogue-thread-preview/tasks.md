# 任務清單：annotation-dialogue-thread-preview（issue #1341）

> **Apply 前硬閘（兩道，互不替代）**：先執行 `openspec validate --changes --no-interactive` 取得 OpenSpec schema validation，再執行 `scripts/check-sdd.sh` 取得 Project SDD lint，兩者皆通過後才進入下方群組。
>
> **TDD 硬規則**：每個可觀察行為皆為 Red（`[@senior-qa]`）＋ Green（`[@senior-frontend]`）配對；Red 先 commit 並留下預期失敗證據，Green 才能開始，且不得弱化 Red 契約。只有主 session 勾選 checkbox。
>
> **拆分**：單一 PR 群組（產品檔案 4 個，每群組 1 個），同時是最終群組，於本 PR 執行 archive。

## 0. 前置

**故事目標**（FR-107、SC-029）：流程狀態檔反映本 change 對 annotation-015 的 in-flight 狀態。

- [ ] 0.1 修改 `specs/STATUS.md`，於 annotation-015 列追加本 change 的 in-flight 說明（append-only，只改本列、不動其他列）。 [@main]

## 1. T013 種子（FR-107、AC-2.35、SC-029）

**故事目標**（FR-107、SC-029）：T013 種子 `text` 角色為不使用、`utterances` 為唯一 Input，並設定對話欄位。

> **產品檔案（1）**：`design/prototype/pages/task-management/task-detail.data.js`

- [ ] 1.1 新增 `design/prototype/tests/annotation/issue-1341-dialogue-thread-preview.spec.ts` 的 Red：T013 的 `text` 角色為 `unused`、`utterances` 為唯一 `input`、`dialogue_fields` 已設定。 [@senior-qa]
- [ ] 1.2 （Green）修改 `task-detail.data.js` 的 T013 種子。 [@senior-frontend]

## 2. 設定帶入（FR-107、SC-029）

**故事目標**（FR-107、SC-029）：`dialogue_fields` 由任務 profile 帶入工作區。

> **產品檔案（1）**：`design/prototype/pages/annotation/annotation-workspace.data.js`
> **相依**：群組 1。

- [ ] 2.1 修改 `design/prototype/tests/annotation/issue-1341-dialogue-thread-preview.spec.ts`，補 Red：工作區 profile 帶出 T013 的 `dialogue_fields`，未設定者為 `null`。 [@senior-qa]
- [ ] 2.2 （Green）修改 `annotation-workspace.data.js`：`resolveTaskProfile` 帶出 `dialogueFields`。 [@senior-frontend]

## 3. 對話串、座標與跨發言（FR-107、AC-2.31 ~ AC-2.34、SC-029）

**故事目標**（FR-107、SC-029）：整合預覽一則一列；反白記為 `{utt_id,start,end}` 半開區間；跨發言拒絕；無設定退回原始 JSON。

> **產品檔案（1）**：`design/prototype/pages/task-management/task-config.engine.js`
> **相依**：群組 2。

- [ ] 3.1 修改 `design/prototype/tests/annotation/issue-1341-dialogue-thread-preview.spec.ts`，補 Red：整合預覽 5 列且各有發言者與編號；反白存成 `{utt_id,start,end}` 且 `slice(start,end)` 等於選取文字；跨發言選取被拒並顯示提示；無設定時顯示可摺疊等寬原始 JSON。 [@senior-qa]
- [ ] 3.2 （Green）修改 `task-config.engine.js`：對話分支、跨發言拒絕、2-C 後備與關係識別傳遞 `utt_id`。 [@senior-frontend]

## 4. 工作區種子與 Input 角色保留（FR-107、AC-2.35、SC-029）

**故事目標**（FR-107、SC-029）：物件陣列 Input 不再被刪除，純值陣列仍剔除；示範答案與 reviewer 原文隨之正確；Output 與 Evidence 不外露。

> **產品檔案（1）**：`design/prototype/pages/annotation/annotation-workspace.config.js`
> **相依**：群組 3。

- [ ] 4.1 修改 `design/prototype/tests/annotation/issue-1341-dialogue-thread-preview.spec.ts`，補 Red：`utterances` 保留於工作區 `fieldRoleMap`、`tokens` 型純值陣列仍被剔除；頁面文字不含 `gold_triplets` 內容。 [@senior-qa]
- [ ] 4.2 （Green）修改 `annotation-workspace.config.js`：`seedEngineState` 保留規則、`placeCompactEntities`、`buildReviewerInputText`。 [@senior-frontend]
- [ ] 4.3 更新受 T013 `text` 改為不使用影響的既有測試，不放寬斷言本意，逐條記入 PR 說明。 [@senior-qa]

## 5. 回歸、審查、Source-Verify 與 archive

**故事目標**（FR-107、SC-029）：確認回歸通過、正典引用可定位，並完成 archive 寫回。

> **產品檔案（0）**：只執行驗證與 specs／openspec 寫回。
> **最終群組**：是。

- [ ] 5.1 執行 typecheck、test:node 與範圍限定的 Playwright（新 spec 與受影響 spec），皆 exit 0。 [@main]
- [ ] 5.2 senior-code-reviewer 獨立審查 Generalization-First、Data Fairness 與 DRY。 [@senior-code-reviewer]
- [ ] 5.3 Source-Verify：衍生檢視每一則正典引用皆可 grep 定位。 [@main]
- [ ] 5.4 執行 openspec archive，正典 015 寫回 12.6.0 至 12.7.0（MINOR）並新增 Changelog，同步衍生檢視 Purpose 版號。 [@main]
