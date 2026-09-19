# 任務清單：enumerate-submitted-review-units

> **Apply 前硬閘**：先執行 `openspec validate enumerate-submitted-review-units --type change` 與 `scripts/check-sdd.sh`，分別回報 OpenSpec schema validation 與 Project SDD lint。兩者都通過才可進入 `/opsx:apply`。主 session／team lead 是唯一可以驗證 Red／Green evidence 並更新 checkbox 的角色。

> **單一群組**：本變更有 3 個 prototype 產品檔，未超過單一 PR 5 檔上限，所以不拆群組。propose、apply、archive 放在同一個 PR。
>
> **序列前提**：本變更與 issue #824 都會寫正典 015 的 Changelog，依 #583 → #792 → #824 的順序執行。動到 `design/prototype/pages/` 後，必須在 rebase 之後、推送之前重生 `design/system/screen-inventory.md`。

---

## 1. PR-792 — 已提交但無示範列之審核單位進入列舉

> **相依與平行性**：嚴格依序 1.1 → 1.2 → … → 1.9，不使用 parallel markers。1.1 與 1.2 的 committed Red 必須先於 1.3–1.5。本群組不改 FR-093 指派演算法、`demoAnnotatorRow()`、AC-3.38 閘門判定與任何種子資料。

**故事目標**：SC-004N — 審核員要能在清單列出、篩選並定位到實際的審核標的；一個標記員已經提交、審核員也能審到定稿的單位，卻不出現在清單、摘要與快速審核裡，審核員就無從知道它存在。

- [ ] 1.1 撰寫 `design/prototype/tests/annotation/issue-792-submitted-unit-enumerated.spec.ts` 作為 Red 契約，釘住下列事項。型別宣告必須使用 local cast，不得新增第二份 `declare global`（重複宣告會撞 TS2717）。先提交此單檔再跑測試，expected failure 必須是「已提交但無示範列之單位不在列舉中」，並保存 command、exit 與失敗訊息。 [@senior-qa]
  - 以 T015 的預設標記員身分，對 `ofs-05-not-submitted`（`official_run`，無示範列）寫入一筆已提交的答案後：`listReviewUnits('T015', 'official_run')` 含該樣本 × 該標記員、狀態為 `pending`；`computeReviewSummary()` 的待審與未定稿各比寫入前多 1。
  - 同一情境下，該單位恰被 `getAssignedReviewUnits()` 指派給名冊中一位審核員；以該審核員身分開啟 `annotation-list` reviewer 視圖，清單出現該列，答案欄顯示提交的答案；以該審核員身分，`findNextActionableReviewUnit()` 在其餘指派單位都處理完後會回傳它（或在待審順位中可達）。
  - 同一情境下，以該審核員身分開啟工作區，左欄導覽含該單位。
  - 只存草稿（未提交）時，上述列舉都不含該單位；兩個 seed 來源皆缺時亦同（`tests/annotation/issue-784-enumerated-units-have-seed-source.spec.ts` 的不變量維持綠燈）。
  - 斷言不得寫死任務的單位總數；以寫入前後的差值斷言。
- [ ] 1.2 以 probe（暫時套用 1.3–1.5 的修改跑全量，跑完即還原）找出既有測試中寫死列舉結果、且會因本單位移的斷言，同步其期望值，只改期望值不改結構。無位移則在此項記錄「probe 無位移」。先提交再跑，保存「舊實作下這些斷言失敗」的證據。 [@senior-qa]
- [ ] 1.3 Green：修改 `design/prototype/pages/annotation/annotation-workspace.data.js`，新增 `getReviewUnitRows(taskId, runType, sampleId, outKeys)`（見 design.md D1）並匯出；`listReviewUnits()` 改讀它。不得放寬或改寫 Red 契約。 [@senior-frontend]
- [ ] 1.4 修改 `design/prototype/pages/annotation/annotation-list.html`：`getMockRows()` 改讀 `getReviewUnitRows()`，同步更新 `buildAllReviewUnitRows()` 上方的列舉註解（見 design.md D2）。 [@senior-frontend]
- [ ] 1.5 修改 `design/prototype/pages/annotation/annotation-workspace.config.js`：`buildUnits()` 改讀 `getReviewUnitRows()`，同步更新其「與 annotation-list 同源」的註解（見 design.md D2）；`demoAnnotatorRow()` 維持讀示範列。 [@senior-frontend]
- [ ] 1.6 執行 code/test gate：在 `design/prototype/` 下帶本 worktree 專屬 `PW_PORT` 執行 `node ~/.cache/node/corepack/v1/pnpm/12.3.4/bin/pnpm.mjs typecheck` 與 `node ~/.cache/node/corepack/v1/pnpm/12.3.4/bin/pnpm.mjs playwright test`（全量，不得只跑子目錄）。兩者預期 exit `0`，且分開記錄。rebase 後再執行 `node scripts/gen-screen-inventory.mjs` 重生盤點並提交。 [@main]
- [ ] 1.7 更新 `specs/annotation/015-annotation-workspace/spec.md`，完成 gate 4 回寫，內容如下。 [@main]
  - 版號 MINOR bump（6.9.0 → 6.10.0，以當下最新版號接續），Changelog 補一列。
  - FR-055、FR-056、FR-072 第 1 點、FR-073 第 1 點補本版修訂段。
  - delta 中未編號的新情境，於本步驟接續使用者故事 1 現行最大編號，編成新 AC。
  - 已被取代的條文、條文內記錄舊版的修訂段、Changelog 舊列（含 6.3.1 列「另由 issue #792 追蹤」）一律逐字保留。
- [ ] 1.8 另開 issue 追蹤：`computeIaaAlpha()` 與 `countDistinctRaters()` 的評分者列舉同樣只走示範列（proposal.md 非目標）。issue URL 記在此項。 [@main]
- [ ] 1.9 執行 `/opsx:archive enumerate-submitted-review-units`。產生衍生檢視後，依 `docs/sdd-workflow.md` §6.2 逐條 grep 本 change 寫入的 canonical citation（FR-044a、FR-051、FR-055、FR-056、FR-062、FR-072、FR-073、FR-093、FR-100、AC-1.26、AC-3.38、新 AC、SC-004N、issue #784／#792／#824 等），確認每一條都能個別定位。archive 指令須經使用者明確授權才執行。final merge 後才更新 `specs/STATUS.md`。 [@main]
