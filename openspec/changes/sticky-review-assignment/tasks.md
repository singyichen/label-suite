# 任務清單：sticky-review-assignment

> **Apply 前硬閘**：先執行 `openspec validate sticky-review-assignment --type change` 與 `scripts/check-sdd.sh`，分別回報 OpenSpec schema validation 與 Project SDD lint。兩者都通過才可進入 `/opsx:apply`。主 session／team lead 是唯一可以驗證 Red／Green evidence 並更新 checkbox 的角色。

> **單一群組**：本變更有 2 個 prototype 產品檔，未超過單一 PR 5 檔上限，所以不拆群組。propose、apply、archive 放在同一個 PR。
>
> **序列前提**：本變更與 issue #583、#792 都會寫正典 015 的 Changelog，依 #583 → #792 → #824 的順序執行，本變更最後。動到 `design/prototype/pages/` 後，必須在 rebase 之後、推送之前重生 `design/system/screen-inventory.md`。

---

## 1. PR-824 — 已審單位黏住原審核員與離冊審核員唯讀可見

> **相依與平行性**：嚴格依序 1.1 → 1.2 → … → 1.7，不使用 parallel markers。1.1 與 1.2 的 committed Red 必須先於 1.3–1.4。本群組不改 FR-060 仲裁資格判定、不改待分配池的位置性分派規則本身、不新增持久化指派表、不改 014 任何條文、不改任何種子資料。

**故事目標**：SC-004O — 審核員要能在工作區左欄走訪到自己名下的每一個審核單位；指派每次重算會讓昨天審過的單位換手到別人名下，離冊後更是整批消失，審核員因此走訪不到自己已表態過的標的。

- [ ] 1.1 撰寫 `design/prototype/tests/annotation/issue-824-sticky-review-assignment.spec.ts` 作為 Red 契約，釘住下列事項。型別宣告必須使用 local cast，不得新增第二份 `declare global`（重複宣告會撞 TS2717）。先提交此單檔再跑測試，expected failure 必須是「名冊異動後已審單位改派」與「離冊審核員取不到自己審過的單位」，並保存 command、exit 與失敗訊息。 [@senior-qa]
  - `official_run`：以某審核員身分對一個指派給他的單位寫入已提交的審核後，縮短該任務的 `reviewer_ids`（移除另一位審核員）再重新推導，該單位的 `reviewer_id` 仍為原提交者；加入一位審核員亦同。
  - 同一情境下把**提交者本人**移出 `reviewer_ids`：`getAssignedReviewUnits()` 以該提交者身分仍回傳該單位；以該身分開啟 `annotation-list` reviewer 視圖，清單仍出現該列；開啟工作區，左欄導覽仍含該單位，歷程頁籤仍可開啟。
  - 同一情境下，工作區不渲染可送出的審核控件，且出現 `data-testid="ws-review-off-roster"` 的唯讀說明卡。
  - 只存草稿（未提交）時不構成黏住：名冊異動後該單位仍依位置性分派落點。
  - `dry_run`：對同一樣本的其中一個單位寫入已提交的審核後，該樣本的全部單位的 `reviewer_id` 一致且等於該提交者。
  - 平均分配只約束未黏住池：黏住若干單位後重新推導，未黏住單位在名冊成員間的筆數差距不超過 1。
  - 斷言不得寫死任務的單位總數；以寫入前後的差值或同一樣本內的一致性斷言。
- [ ] 1.2 以 probe（暫時套用 1.3–1.4 的修改跑全量，跑完即還原）找出既有測試中寫死指派落點、且會因黏住而位移的斷言，同步其期望值，只改期望值不改結構。無位移則在此項記錄「probe 無位移」。先提交再跑，保存「舊實作下這些斷言失敗」的證據。 [@senior-qa]
- [ ] 1.3 Green：修改 `design/prototype/pages/annotation/annotation-workspace.data.js`，新增 `getStickyReviewers()`、選用第 4 參數 `stickyByUnit`、`taskReviewAssignments()`、`taskReviewerRoster()` 與 `isRosterReviewer()` 並匯出，`getAssignedReviewUnits()` 改讀新入口、`computeReviewWorkload()` 僅把黏住查表傳給既有呼叫並保留自有名冊參數（見 design.md D1–D4）。不得放寬或改寫 Red 契約。 [@senior-frontend]
- [ ] 1.4 修改 `design/prototype/pages/annotation/annotation-workspace.config.js`：於 `REVIEW_UNIT_BLOCK` 補 `OFF_ROSTER` 值、依 ARBITRATION → FINALIZED → OFF_ROSTER → EMPTY 的判定序接上 `reviewUnitBlockReason()`、補上離冊唯讀渲染分支與 `reviewOffRosterNote` 中英文案（見 design.md D4）。 [@senior-frontend]
- [ ] 1.5 執行 code/test gate：在 `design/prototype/` 下帶本 worktree 專屬 `PW_PORT` 執行 `node ~/.cache/node/corepack/v1/pnpm/12.3.4/bin/pnpm.mjs typecheck` 與 `node ~/.cache/node/corepack/v1/pnpm/12.3.4/bin/pnpm.mjs playwright test`（全量，不得只跑子目錄）。兩者預期 exit `0`，且分開記錄。rebase 後再執行 `node scripts/gen-screen-inventory.mjs` 重生盤點並提交。 [@main]
- [ ] 1.6 更新 `specs/annotation/015-annotation-workspace/spec.md`，完成 gate 4 回寫，內容如下。 [@main]
  - 版號 MINOR bump（6.10.0 → 6.11.0，以當下最新版號接續），Changelog 補一列。
  - FR-093 補本版修訂段，涵蓋指派黏住、平均分配適用範圍、`dry_run` per_sample 粒度、離冊唯讀可見、推導來源五點。
  - delta 中未編號的新情境，於本步驟接續對應使用者故事現行最大編號，編成新 AC。
  - 已被取代的條文、條文內記錄舊版的修訂段（含 v6.6.0 種子釐清）、Changelog 舊列一律逐字保留。
- [ ] 1.7 執行 `/opsx:archive sticky-review-assignment`。產生衍生檢視後，依 `docs/sdd-workflow.md` §6.2 逐條 grep 本 change 寫入的 canonical citation（FR-050、FR-055、FR-056、FR-058、FR-060、FR-062、FR-093、FR-094、FR-097、新 AC、SC-004O、`task-management/014-task-detail` FR-005j 與 FR-010f-4、issue #824 等），確認每一條都能個別定位。archive 指令須經使用者明確授權才執行。final merge 後才更新 `specs/STATUS.md`。 [@main]
