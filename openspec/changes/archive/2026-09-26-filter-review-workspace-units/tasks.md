# 任務清單：filter-review-workspace-units

> **Apply 前硬閘**：先執行 `npx -p @fission-ai/openspec openspec validate --changes --no-interactive` 與 `scripts/check-sdd.sh`，分別回報 OpenSpec schema validation 與 Project SDD lint。兩者都通過才可進入 `/opsx:apply`。team lead 是唯一可以驗證 Red／Green evidence 並更新 checkbox 的角色。

> **單一群組**：本變更只有 1 個 prototype 產品檔（`annotation-workspace.config.js`），遠低於單一 PR 5 檔上限，不拆群組。propose、apply、archive 放在同一個 PR。受影響測試檔（10 檔＋）不計入門檻。
>
> **序列前提**：本波（Wave 3）正典 015 的版本 bump 名額屬於 #925（issue #925 預定 6.26.0），本變更（#956）預定接續之 6.27.0；最終版本號由主 session 在合併時依 issue 序號遞增指派。`specs/STATUS.md`、正典 Changelog、`design/system/screen-inventory.md` 三檔之衝突為預期，由主 session 在合併時人工解，不需 lead 處理或協調。

---

## 1. PR-956 — 工作區左欄／導覽依審核指派過濾

> **相依與平行性**：嚴格依序 1.1 → 1.2 → … → 1.8，不使用 parallel markers。1.1 的 Red 契約必須先於 1.3 的 Green。本群組不改 `getAssignedReviewUnits()`／`getReviewAssignments()`／`taskReviewAssignments()` 等指派推導本身、不改 `annotation-list.html` 既有過濾邏輯、不改 FR-060 仲裁資格判定、不新增後端權限控管、不處理 issue #970。

**故事目標**：SC-004O——審核員應能在工作區左欄與導覽走訪到「自己名下的每一個審核單位」，且與 `annotation-list` 的筆數一致；FR-093（issue #921 裁定第 2 項）進一步要求該列舉只含指派給自己的單位，不含他人單位。

- [x] 1.1 撰寫 `design/prototype/tests/annotation/issue-956-workspace-left-column-filter.spec.ts` 作為 Red 契約，涵蓋三件事，直接沿用 issue #921 gate 測試已驗證過的 T015 `official_run` fixture（`ofs-01` → `reviewer_wang`、`ofs-02` → `reviewer_li`、`ofs-03` → `reviewer_lin`、`ofs-04` → `reviewer_wang`，`arbiterIds = ['reviewer_chen']`）。先提交此單檔再跑測試，保存 command、exit 與失敗訊息。 [@senior-qa]
  - **(a) 未受派單位不出現在左欄**：以 `reviewer_li` 身分開啟 T015 `official_run` 工作區，`ws-sample-item` 不得出現 `ofs-01-agree-gold`／`ofs-04-pending-review`（指派給 `reviewer_wang`）與 `ofs-03-arbitrated-gold`（指派給 `reviewer_lin`），只出現 `ofs-02-modified-dispute`（指派給 `reviewer_li`，本身即為非爭議中，需另找或改用一個非爭議中之受派單位斷言更清楚——若 `ofs-02` 已轉爭議中，改用該身分之另一受派、非爭議中單位）。
  - **(b) 受派單位仍出現，且與清單頁筆數一致**：同一身分開啟 `annotation-list` 清單頁與工作區，左欄單位總數（`ws-sample-item` 計數）與清單頁 `filterToAssignedUnits()` 過濾後的列數相同。
  - **(c) 仲裁豁免不受左欄過濾影響（最大回歸風險）**：以 `reviewer_chen`（`can_arbitrate = true`，依 FR-060／issue #868 排除於一般分派池外）身分開啟工作區，某爭議中且 chen 未提交過審核的單位（`ofs-02-modified-dispute`，若已轉爭議中）**仍出現於左欄**，點選後渲染仲裁卡與可送出之仲裁控件——不得因 chen 未被 FR-093 指派到該單位而被本次左欄過濾排除。
  - 斷言不得寫死任務的單位總數；比照 #921 Red 契約的寫法，以「不含某 testid」「與清單頁同一身分之列數比對」斷言。
  - Red 證據：commit `dc2941dd`（senior-qa）。team lead 獨立複驗：`git status --short` 僅新增該測試檔一項、工作樹乾淨；獨立重跑 `PW_PORT=8984 pnpm playwright test tests/annotation/issue-956-workspace-left-column-filter.spec.ts --workers=1` → exit 1，4 failed（與 senior-qa 回報一致），失敗原因確認為過濾尚未實作（非選擇器誤植或 fixture 錯誤）。
- [x] 1.2 Green：修改 `design/prototype/pages/annotation/annotation-workspace.config.js`。 [@senior-frontend]
  - `buildUnits()`（現行邏輯）拆為 `enumerateReviewUnits()`（完整未過濾列舉，逐字搬移現行邏輯）＋ `filterUnitsToAssigned(units)`（鏡射 `annotation-list.html` 的 `filterToAssignedUnits()`：呼叫既有 `getAssignedReviewUnits()`，NUL 分隔鍵 `sample_id + '\u0000' + annotator_id`，含仲裁豁免析取 `status === DISPUTED && isArbiterCandidate(...)`）＋ `buildUnits()`（reviewer 角色回傳 `filterUnitsToAssigned(enumerateReviewUnits())`，其餘角色原樣回傳 `enumerateReviewUnits()`）。
  - `isCurrentUnitAssigned()`（issue #921）改讀 `enumerateReviewUnits()`（完整宇宙），不再讀 `buildUnits()`（自本變更起已過濾）——避免其內部呼叫之 `getAssignedReviewUnits()` 因輸入宇宙縮小而使位置性（round-robin／per-sample 黏著）指派位移。
  - 不得放寬或改寫 1.1 的 Red 契約，並以 1.1 的 Red 測試重跑轉綠驗證之。 [@senior-frontend]
  - Green 證據：commit `6d31dadf`（senior-frontend）。team lead 獨立複驗發現一項位元組層瑕疵並修正：`filterUnitsToAssigned()` 的兩處 NUL 分隔鍵誤寫成實際 NUL 控制位元組（而非 `annotation-list.html` 原用的可讀轉義序列文字）——執行期行為相同、非邏輯缺陷，但會讓 `grep` 誤判該檔為 binary，commit `0be3f993` 修正。修正後：`PW_PORT=8984 pnpm playwright test tests/annotation/issue-956-workspace-left-column-filter.spec.ts` → exit 0，4 passed；`tests/annotation/issue-921-review-assignment-gate.spec.ts tests/annotation/annotation-list-reviewer.spec.ts` → exit 0，25 passed（送出閘門與清單頁皆未受影響）；`pnpm typecheck` → exit 0。
- [x] 1.3 執行受影響既有測試並依「位移／前提消失」分類處理，10 個檔案、17＋ 案例（真實影響面已於 propose 前完成重新量測，見 proposal.md「Why」節）。 [@senior-frontend]
  - `annotation-review-flow-demo-workspace.spec.ts:42`（位移，3→N 位標記員計數）
  - `annotation-review-status-track.spec.ts:235`（前提消失，改寫為「未受派單位不出現在左欄」之正向斷言或改用實際受派身分）
  - `annotation-workspace-review-unit-nav.spec.ts`（serial mode，1 個位移斷言擋住同檔另 11 個測試，修正首個後需重跑顯出剩餘，issue 內文預告其中 3 個為前提消失）
  - `annotation-workspace-url-sync.spec.ts:130`（位移，nav 按鈕啟用狀態依過濾後位置改變）
  - `issue-309-reviewer-workspace-vocab.spec.ts:51`（位移，serial mode 擋住同檔另 4 個測試）
  - `issue-452-review-progress-subjects.spec.ts:121`（位移，進度分母）
  - `issue-455-workspace-unit-grouping.spec.ts`（全檔 7 案例前提消失，dry_run 逐樣本黏著下預設身分僅擁有 5 群組中的 2 個，全檔以索引迭代全部 5 個之前提不再成立，改寫為正向斷言）
  - `issue-557-unit-entry-no-sample-id.spec.ts`（2 案例位移，過濾後群組重新編號）
  - `issue-924-review-history-clear.spec.ts:146`（疑似前提消失，T015 `reviewer_wang` 過濾後無法導覽至 `ofs-03`〈指派給 `reviewer_lin`〉，待確認改用實際受派身分或改寫斷言）
  - `tests/dashboard/dashboard-output-types.spec.ts:239`（位移，reviewer `expectedCount` 需依 16 個任務各自實際指派數重算）
  - **不得直接刪除既有斷言**；前提消失者改寫為 FR-093 過濾生效後之正確行為的正向斷言，保留為迴歸覆蓋。若判斷任一案例落入 issue #970 範圍（與 FR-093 已退場多審核員模型牴觸、無法用身分選擇修正），不予處理並於 PR body 註明——重新量測結果顯示零重疊，預期不會發生。 [@senior-frontend]
  - 轉綠證據：10 個 commit（`b1154634`、`ef34bea0`、`65bf99c9`、`d0ddfb54`、`b44e47f3`、`42a6ff07`、`7ea9c273`、`13277175`、`89a7fa66`、`bee96ccc`，senior-frontend），無一撞到 issue #970 範圍。team lead 獨立複驗：分兩批重跑全部 10 檔（`--workers=1`）→ 43 passed ＋ 37 passed，與回報一致。獨立審查（見 1.7）複查後發現 `annotation-review-flow-demo-workspace.spec.ts`（commit `b1154634`）之修正為「數字位移套用到前提已消失情境」的缺陷——已用 commit `f7c3d4e8` 修正（改用實際受派者 `reviewer_wang`）。修正後完整重跑全部 11 個相關檔案（新 Red 契約 + 10 個既有測試）→ exit 0，84 passed, 0 failed。
- [x] 1.4 廣義候選集（207 個 `*.spec.ts` 聯集）中未收斂於 1.3 之殘餘檔案（僅命中裸字 `reviewer`、不含左欄專屬 testid），依主 session 裁示不在本機重跑，交由 CI 全套把關；若 CI 發現額外回歸，另開追蹤（不阻塞本 PR）。 [@main]
- [x] 1.5 執行 code/test gate（design/prototype/ 根目錄）：`pnpm install --frozen-lockfile`、`pnpm typecheck`、受影響檔案分批 `PW_PORT=8984 pnpm playwright test`。 [@main]
  - 證據：`pnpm typecheck` → exit 0（兩次，Green 後與獨立審查修正後各一次）。
- [x] 1.6 生產碼變更完成後（最後一次來源編輯之後），於 worktree 根執行 `node scripts/gen-screen-inventory.mjs` 重生盤點並提交，接著 `node scripts/gen-screen-inventory.mjs --check`、`scripts/inventory-tests.sh`、`scripts/check-sdd.sh`（0 error）、`scripts/check-spec-artifacts.sh`、`node scripts/check-user-path-map-freshness.mjs`。 [@main]
  - 證據：commit `5dc539b3`（重生盤點）。`--check` → up to date；`inventory-tests.sh` → 全部 PASS；`check-sdd.sh` → 0 error(s), 15 warning(s)；`check-spec-artifacts.sh` → passed；`check-user-path-map-freshness.mjs` → `PATH_MAP_FRESH`。
- [x] 1.7 獨立審查（`senior-code-reviewer`，與 1.5 gate 並行啟動）：確認 (1) 未寫第二套平行的指派判定邏輯（DRY）；(2) 仲裁豁免是否仍有效；(3) 1.3 之既有測試修正有無「前提消失」被誤當「位移」、或斷言被弱化。裁決記入檢查點留言。 [@senior-code-reviewer]
  - 裁決：(1) PASS（`filterUnitsToAssigned()` 與測試側 `dashboard-output-types.spec.ts` 皆重用真實 `getAssignedReviewUnits()`）；(2) PASS（`isCurrentUnitAssigned()` 正確改讀 `enumerateReviewUnits()`；新 Red 契約之仲裁案例為有意義斷言）；(3) 初判 FAIL，一項缺陷（`annotation-review-flow-demo-workspace.spec.ts:61`，斷言巧合通過但未驗證到目標單位），已用 commit `f7c3d4e8` 修正並複驗，其餘 9 檔複查合格，無刪除斷言、無斷言弱化。
- [x] 1.8 更新 `specs/annotation/015-annotation-workspace/spec.md`，完成 gate 4 回寫：版號 MINOR bump（新增 3 個 AC，未移除任何既有 FR／AC），Changelog 補一列，FR-093 本文接續 v6.17.0 追加「本版修訂（issue #956）」段落（含 archive 時把 delta 之 MUST 風格轉為正典既有 必須／不得 措辭）。delta 中未編號之新情境接續 US4（FR-093 對應使用者故事）現行最大 AC 編號續編。`specs/STATUS.md` 只動 `annotation-015` 一列。執行 `/opsx:archive`，依 `docs/sdd-workflow.md` §6.2 逐條 grep 驗證所有引用（FR-093、AC 新編號、版本號、issue #956/#921/#960/#868、`getAssignedReviewUnits()`、`isArbiterCandidate()`、`enumerateReviewUnits()`、`filterUnitsToAssigned()` 檔案行號）皆可定位。 [@main]
  - 版號 MINOR bump：6.25.0 → 6.27.0（新增 AC-4.72 ~ AC-4.74，未移除任何既有 FR／AC），commit `7b5884ad`。`specs/STATUS.md` 只動 `annotation-015` 一列。`openspec archive` 已執行，衍生檢視同步、change 已移至本目錄。Source-Verify 逐條 grep 驗證：`AC-4.72`（3 處）、`AC-4.73`（2 處）、`AC-4.74`（3 處）、`getAssignedReviewUnits`（6 處）、`isArbiterCandidate`（4 處）、`enumerateReviewUnits`（1 處）、`filterUnitsToAssigned`（1 處）、`isCurrentUnitAssigned`（3 處）、`v6.27.0`（5 處）、issue `#956`（6 處）、`#921`（6 處）、`#960`（1 處）、`#868`（15 處）皆存在；10 個引用之既有測試檔名逐一確認實際存在於 `design/prototype/tests/`。
