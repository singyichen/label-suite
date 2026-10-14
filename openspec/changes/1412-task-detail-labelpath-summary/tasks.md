# 任務清單：1412-task-detail-labelpath-summary（issue #1412 PR-B，正典 014 側）

> **Apply 前硬閘（兩道，互不替代）**：先 `openspec validate --changes --no-interactive`，再 `scripts/check-sdd.sh`。**主 session／lead 是唯一可驗證證據與更新 checkbox 的角色**。
>
> **TDD 硬規則**：每個可觀察行為皆為 Red（`[@senior-qa]`）＋ Green（`[@senior-frontend]`）配對；Red 先 commit 並留下預期失敗證據，Green 才能開始，且不得弱化 Red 契約。
>
> **範圍**：單一 PR，產品檔案 2 個（`task-detail.config.js`、`task-detail.html`）。不得動概覽「下一步」卡片與 `nextStepGroupsHtml()`（#1438 平行修改）。
>
> **拆分總則（憲法原則 X）**：archive 與正典回寫在同一 PR（ADR-033 Rule 1）。013 延後條文改為已完成屬 PR-C，另開堆疊 PR。

## 0. 前置

**故事目標**（SC-020，AC-3.85）：流程狀態檔反映本 change 對 task-management-014 的 in-flight 狀態。

- [x] 0.1 修改 `specs/STATUS.md` 的 task-management-014 列，追加本 change in-flight 的一句紀錄（append-only，只改本列）。 [@main]

## 1. 階層 label_options 唯讀摘要（AC-3.85）

**故事目標**（SC-020，AC-3.85）：階層任務的「標記設定」檢視以縮排清單列出每個節點並帶完整 `LabelPath`；扁平任務不變。

> **產品檔案（2）**：`task-detail.config.js`、`task-detail.html`

- [ ] 1.1 （Red）新增 `design/prototype/tests/task-management/issue-1412-task-detail-labelpath-summary.spec.ts`，斷言 T003 摘要為縮排清單、每列帶完整路徑、扁平任務不變；先 commit 並執行，留下預期失敗證據。 [@senior-qa]
- [ ] 1.2 （Red）修改 `design/prototype/tests/task-management/task-detail-task-profiles.spec.ts`，把 T003 的舊期望值更新為新行為；與 1.1 同批 commit。 [@senior-qa]
- [ ] 1.3 （Green）修改 `design/prototype/pages/task-management/task-detail.config.js`：摘要函式依 registry 欄位型別 `taxonomy-tree` 分流，回傳節點清單。 [@senior-frontend]
- [ ] 1.4 （Green）修改 `design/prototype/pages/task-management/task-detail.html`：`renderSettingsSummaryRows` 渲染縮排清單，使 1.1、1.2 通過。 [@senior-frontend]

## 2. archive 與正典回寫（最終群組）

**故事目標**（SC-020，AC-3.85）：正典 014 自 v13.0.0 回寫為 v13.1.0，FR-014i-1 與 AC-3.85 只有一種說法。

> **版本判定**：**MINOR v13.1.0**。回寫前須先 `git fetch` 並確認 `origin/main` 上正典 014 仍為 v13.0.0。

- [ ] 2.1 執行 Source-Verify 預掃：本 change 引入的 FR／AC ID、檔案路徑、issue 編號與引用的 FR 皆可逐項 `grep` 定位。 [@main]
- [ ] 2.2 執行 `openspec archive 1412-task-detail-labelpath-summary`，使衍生檢視收錄 FR-014i-1。 [@main]
- [ ] 2.3 修改正典 `specs/task-management/014-task-detail/spec.md`：新增 FR-014i-1、AC-3.85，FR-014i 就地補交叉引用，Prototype Traceability 補列，版本改為 v13.1.0 並新增 Changelog 列。 [@main]
- [ ] 2.4 修改 `specs/STATUS.md` 的 task-management-014 列為 v13.1.0 並記錄本 change 已 archive。 [@main]
- [ ] 2.5 逐條驗證衍生檢視的正典引用（archive 後 Source-Verify）。 [@main]
