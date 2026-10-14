# 任務清單：annotation-dialogue-preview-no-output-entities（issue #1371）

> **Apply 前硬閘（兩道，互不替代）**：先執行 `openspec validate --changes --no-interactive` 取得 OpenSpec schema validation，再執行 `scripts/check-sdd.sh` 取得 Project SDD lint，兩者皆通過後才進入下方群組。
>
> **TDD 硬規則**：每個可觀察行為皆為 Red（`[@senior-qa]`）＋ Green（`[@senior-frontend]`）配對；Red 先 commit 並留下預期失敗證據，Green 才能開始，且不得弱化 Red 契約。只有主 session 勾選 checkbox。
>
> **拆分**：單一 PR 群組（產品檔案 2 個），同時是最終群組，於本 PR 執行 archive。

## 0. 前置

**故事目標**（FR-107、SC-029）：流程狀態檔反映本 change 對 annotation-015 的 in-flight 狀態。

- [x] 0.1 修改 `specs/STATUS.md`，於 annotation-015 列追加本 change 的 in-flight 說明（append-only，只改本列）。 [@main]

## 1. 反白歧義提示文案（FR-107 第 15 點、AC-2.46）

**故事目標**（FR-107、SC-029）：反白歧義有專屬、不含佔位符的中英文案。

> **產品檔案（1）**：`design/prototype/pages/task-management/task-config.data.js`

- [x] 1.1 新增 `design/prototype/tests/annotation/issue-1371-dialogue-preview-no-output-entities.spec.ts` 的 Red：zh 與 en 皆有反白歧義專屬 key，且文案不含 `{n}`。 [@senior-qa]
- [x] 1.2 （Green）修改 `task-config.data.js` 補文案。 [@senior-frontend]

## 2. 引擎：實體不預填與反白歧義（FR-107 第 14、15 點、AC-2.44 ~ AC-2.47）

**故事目標**（FR-107、SC-029）：對話 Input 不從 Output 預填實體、非對話行為不變；反白歧義用新 key，唯一出現 fallback 有驗收。

> **產品檔案（1）**：`design/prototype/pages/task-management/task-config.engine.js`
> **相依**：群組 1。

- [x] 2.1 修改 `design/prototype/tests/annotation/issue-1371-dialogue-preview-no-output-entities.spec.ts`，補 Red：對話 Input＋`entities` 空＋Output 欄位含實體陣列時 `previewEntities` 為空且頁面不含其內容；字串 Input 同資料照舊預填（回歸）；對話 Input 自帶 `entities` 照常載入；反白歧義顯示新 key 文案（zh／en）；唯一出現時 fallback 採該位置。 [@senior-qa]
- [x] 2.2 （Green）修改 `task-config.engine.js`：`initPreviewState()` 以 `getObjectArrayInput()` 守門；反白歧義改用新 key。 [@senior-frontend]

## 3. 驗證與 archive（最終群組）

**故事目標**（FR-107、SC-029）：獨立審查通過，並完成正典寫回與 Source-Verify。

- [x] 3.1 `senior-code-reviewer` 獨立審查。 [@senior-code-reviewer]
- [x] 3.2 執行 `/opsx:archive`，寫回正典 015 v12.11.0（版本、Changelog 指名 #1371 與承接 #1358 裁定 1）、同步 derived view Purpose 版號。 [@main]
- [x] 3.3 Source-Verify：新增 FR／AC ID 與引用條文於正典與 derived view 皆可 `grep` 到。 [@main]
