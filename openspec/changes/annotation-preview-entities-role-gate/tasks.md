# 任務清單：annotation-preview-entities-role-gate（issue #1413）

> **Apply 前硬閘（兩道，互不替代）**：先執行 `openspec validate --changes --no-interactive` 取得 OpenSpec schema validation，再執行 `scripts/check-sdd.sh` 取得 Project SDD lint，兩者皆通過後才進入下方群組。
>
> **TDD 硬規則**：每個可觀察行為皆為 Red（`[@senior-qa]`）＋ Green（`[@senior-frontend]`）配對；Red 先 commit 並留下預期失敗證據，Green 才能開始，且不得弱化 Red 契約。只有主 session（lead）勾選 checkbox。
>
> **拆分**：單一 PR 群組（產品檔案 1 個），同時是最終群組，於本 PR 執行 archive。

## 0. 前置

**故事目標**（FR-107、SC-029）：流程狀態檔反映本 change 對 annotation-015 的 in-flight 狀態。

- [x] 0.1 修改 `specs/STATUS.md`，於 annotation-015 列最前面追加本 change 的 in-flight 說明（append-only，只改本列）。 [@main]

## 1. 引擎：資料自帶 entities 欄位的角色守門（FR-107 第 16 點、AC-2.45、AC-2.48、AC-2.49）

**故事目標**（FR-107、SC-029）：角色為 Output 或角色未知的 `entities` 欄位不預填；非 Output 的已知角色照常載入；非物件陣列 Input 由 Output 欄位解析預填的路徑不變。

> **產品檔案（1）**：`design/prototype/pages/task-management/task-config.engine.js`

- [ ] 1.1 新增 `design/prototype/tests/annotation/issue-1413-preview-entities-role-gate.spec.ts` 的 Red：對話 Input 的 `entities` 角色為 Output 時 `previewEntities` 為空且頁面不含其內容；角色未知（無鍵、空字串）時不預填（字串與對話 Input）；角色為 Input／Evidence 時照常載入；字串 Input 由 Output 欄位解析預填的回歸。 [@senior-qa]
- [ ] 1.2 （Green）修改 `task-config.engine.js`：`initPreviewState()` 載入資料自帶實體欄位前依欄位角色對照表查角色。 [@senior-frontend]

## 2. 驗證與 archive（最終群組）

**故事目標**（FR-107、SC-029）：獨立審查通過，並完成正典寫回與 Source-Verify。

- [ ] 2.1 `senior-code-reviewer` 獨立審查。 [@senior-code-reviewer]
- [ ] 2.2 執行 `/opsx:archive`，寫回正典 015 v12.12.0（版本、Changelog 指名 #1413、延後至 #1430）、同步 derived view Purpose 版號。 [@main]
- [ ] 2.3 Source-Verify：新增 AC ID 與引用條文於正典與 derived view 皆可 `grep` 到。 [@main]
