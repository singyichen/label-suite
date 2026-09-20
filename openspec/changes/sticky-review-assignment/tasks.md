# 任務清單：sticky-review-assignment

> **Apply 前硬閘**：先執行 `openspec validate sticky-review-assignment --type change` 與 `scripts/check-sdd.sh`，分別回報 OpenSpec schema validation 與 Project SDD lint。兩者都通過才可進入 `/opsx:apply`。主 session／team lead 是唯一可以驗證 Red／Green evidence 並更新 checkbox 的角色。

> **單一群組**：本變更有 3 個 prototype 產品檔（含種子歸屬修正的 `task-detail.data.js`），未超過單一 PR 5 檔上限，所以不拆群組。propose、apply、archive 放在同一個 PR。
>
> **序列前提**：本變更與 issue #583、#792 都會寫正典 015 的 Changelog，依 #583 → #792 → #824 的順序執行，本變更最後。動到 `design/prototype/pages/` 後，必須在 rebase 之後、推送之前重生 `design/system/screen-inventory.md`。

---

## 1. PR-824 — 已審單位黏住原審核員與離冊審核員唯讀可見

> **相依與平行性**：嚴格依序 1.1 → 1.2 → … → 1.9，不使用 parallel markers。1.1 與 1.2 的 committed Red 必須先於 1.3–1.4；1.5 的種子歸屬修正必須先於 1.2 的期望值同步（種子未修正前的位移是假訊號）。本群組不改 FR-060 仲裁資格判定、不改待分配池的位置性分派規則本身、不新增持久化指派表、不改 014 任何條文、不改示範任務的內容與樣本命名。

**故事目標**：SC-004O — 審核員要能在工作區左欄走訪到自己名下的每一個審核單位；指派每次重算會讓昨天審過的單位換手到別人名下，離冊後更是整批消失，審核員因此走訪不到自己已表態過的標的。

- [x] 1.1 撰寫 `design/prototype/tests/annotation/issue-824-sticky-review-assignment.spec.ts` 作為 Red 契約，釘住下列事項。型別宣告必須使用 local cast，不得新增第二份 `declare global`（重複宣告會撞 TS2717）。先提交此單檔再跑測試，expected failure 必須是「名冊異動後已審單位改派」與「離冊審核員取不到自己審過的單位」，並保存 command、exit 與失敗訊息。 [@senior-qa]
  - `official_run`：以某審核員身分對一個指派給他的單位寫入已提交的審核後，縮短該任務的 `reviewer_ids`（移除另一位審核員）再重新推導，該單位的 `reviewer_id` 仍為原提交者；加入一位審核員亦同。
  - 同一情境下把**提交者本人**移出 `reviewer_ids`：`getAssignedReviewUnits()` 以該提交者身分仍回傳該單位；以該身分開啟 `annotation-list` reviewer 視圖，清單仍出現該列；開啟工作區，左欄導覽仍含該單位，歷程頁籤仍可開啟。
  - 同一情境下，工作區不渲染可送出的審核控件，且出現 `data-testid="ws-review-off-roster"` 的唯讀說明卡。
  - 只存草稿（未提交）時不構成黏住：名冊異動後該單位仍依位置性分派落點。
  - `dry_run`：對同一樣本的其中一個單位寫入已提交的審核後，該樣本的全部單位的 `reviewer_id` 一致且等於該提交者。
  - 平均分配只約束未黏住池：黏住若干單位後重新推導，未黏住單位在名冊成員間的筆數差距不超過 1。
  - 斷言不得寫死任務的單位總數；以寫入前後的差值或同一樣本內的一致性斷言。
  - Red 證據：`57830d65`；`PW_PORT=8981 pnpm playwright test tests/annotation/issue-824-sticky-review-assignment.spec.ts` → exit 1，6 failed／1 passed。綠的一則是「草稿不黏住」，舊實作下本就成立、Green 後必須維持綠，非假紅。
- [x] 1.2 以 probe（暫時套用 1.3–1.4 的修改跑全量，跑完即還原）找出既有測試中寫死指派落點、且會因黏住而位移的斷言，同步其期望值，只改期望值不改結構。位移若源自種子歸屬本身有誤（示範種子把審核掛給非該單位分派對象），改由 1.5 修正種子，不在此項調整期望值。無位移則在此項記錄「probe 無位移」。先提交再跑，保存「舊實作下這些斷言失敗」的證據。 [@senior-qa]
  - 證據：`3a021547`（三檔期望值同步）。1.7 複跑全量時又抓到同類的一則，於 `c748a0b5` 補正——`ofm-03` 不是期望值位移而是前提不再成立：種子歸屬改正後名冊唯一具 `can_arbitrate` 者成為該單位當事人，依 FR-060 必然無仲裁入口，故改為斷言「沒有仲裁入口」並註明 issue #868，不刪測試。
- [x] 1.3 Green：修改 `design/prototype/pages/annotation/annotation-workspace.data.js`，新增 `getStickyReviewers()`、選用第 4 參數 `stickyByUnit`、`taskReviewAssignments()`、`taskReviewerRoster()` 與 `isRosterReviewer()` 並匯出，`getAssignedReviewUnits()` 改讀新入口、`computeReviewWorkload()` 僅把黏住查表傳給既有呼叫並保留自有名冊參數（見 design.md D1–D4）。不得放寬或改寫 Red 契約。 [@senior-frontend]
  - Green 證據：`1be20289`。
- [x] 1.4 修改 `design/prototype/pages/annotation/annotation-workspace.config.js`：於 `REVIEW_UNIT_BLOCK` 補 `OFF_ROSTER` 值、依 ARBITRATION → FINALIZED → OFF_ROSTER → EMPTY 的判定序接上 `reviewUnitBlockReason()`、補上離冊唯讀渲染分支與 `reviewOffRosterNote` 中英文案（見 design.md D4）。 [@senior-frontend]
  - Green 證據：`63c8a2cc`。離冊送出閘門為該審核員全域生效（非僅限其自有單位），與本版 FR-093 第 4 點「不得再對任何審核單位提交審核決策」一致；判定序置於仲裁與已定稿之後。
- [x] 1.5 修改 `design/prototype/pages/annotation/annotation-workspace.data.js` 的示範種子表，把每一筆 `rev`／`modifyBy`／`bypassBy` 改掛到該單位在 FR-093 位置式分派下的實際審核員（原本一律掛 `reviewer_wang`，純推導時看不出矛盾，黏住後會讓該人獨吞全部已審單位），並於表頭補上「新增列時須依分派落點決定審核員」的不變量註解。示範情境、樣本命名與標記內容不變。 [@main]
  - 證據：`146ea246`（與 1.6 同 commit）。
- [x] 1.6 修改 `design/prototype/pages/task-management/task-detail.data.js`：把 T015 的 `reviewerIds` 改序為 wang、li、lin、chen。唯一具 `can_arbitrate` 的審核員在原順序下正好被分派到 `ofs-03-arbitrated-gold`，種子歸屬修正後他會成為該單位的當事人而依 FR-060 失去仲裁資格，使該筆仲裁種子成為無效資料。 [@main]
  - 證據：`146ea246`。
- [x] 1.7 執行 code/test gate：在 `design/prototype/` 下帶本 worktree 專屬 `PW_PORT` 執行 `node ~/.cache/node/corepack/v1/pnpm/12.3.4/bin/pnpm.mjs typecheck` 與 `node ~/.cache/node/corepack/v1/pnpm/12.3.4/bin/pnpm.mjs playwright test`（全量，不得只跑子目錄）。兩者預期 exit `0`，且分開記錄。rebase 後再執行 `node scripts/gen-screen-inventory.mjs` 重生盤點並提交。 [@main]
  - gate 證據：`pnpm typecheck` → exit 0；`PW_PORT=8981 pnpm playwright test` 全量 → exit 0，1840 passed（8.6m）。main 未前進故未 rebase；`node scripts/gen-screen-inventory.mjs` 重生於 `5fac7572`。首次全量抓到 `ofm-03` 一則紅，於 `c748a0b5` 補正後複跑全綠。
- [x] 1.8 更新 `specs/annotation/015-annotation-workspace/spec.md`，完成 gate 4 回寫，內容如下。 [@main]
  - 版號 MINOR bump（6.10.0 → 6.11.0，以當下最新版號接續），Changelog 補一列。
  - FR-093 補本版修訂段，涵蓋指派黏住、平均分配適用範圍、`dry_run` per_sample 粒度、離冊唯讀可見、推導來源五點。
  - delta 中未編號的新情境，於本步驟接續對應使用者故事現行最大編號，編成新 AC。
  - 已被取代的條文、條文內記錄舊版的修訂段（含 v6.6.0 種子釐清）、Changelog 舊列一律逐字保留。
  - 回寫證據：`95e4994b`（正典 015 v6.10.0 → v6.11.0）。gate 1 `openspec validate sticky-review-assignment --type change` → exit 0；gate 2 `scripts/check-sdd.sh` → 0 error／15 warning（皆為既有 review 類與 legacy debt）。
- [ ] 1.9 執行 `/opsx:archive sticky-review-assignment`。產生衍生檢視後，依 `docs/sdd-workflow.md` §6.2 逐條 grep 本 change 寫入的 canonical citation（FR-050、FR-055、FR-056、FR-058、FR-060、FR-062、FR-093、FR-094、FR-097、新 AC、SC-004O、`task-management/014-task-detail` FR-005j 與 FR-010f-4、issue #824 等），確認每一條都能個別定位。archive 指令須經使用者明確授權才執行。final merge 後才更新 `specs/STATUS.md`。 [@main]
