# 任務清單：arbiter-sticky-permanent-visibility

> **Apply 前硬閘**：先執行 `npx -p @fission-ai/openspec openspec validate --changes --no-interactive` 與 `scripts/check-sdd.sh`，分別回報 OpenSpec schema validation 與 Project SDD lint。兩者都通過才可進入 `/opsx:apply`。team lead 是唯一可以驗證 Red／Green evidence 並更新 checkbox 的角色。

> **單一群組**：本變更只有 1 個 prototype 產品檔（`annotation-workspace.config.js`），遠低於單一 PR 5 檔上限，不拆群組。propose、apply、archive 放在同一個 PR。受影響測試檔不計入門檻。

---

## 1. PR-1000 — 仲裁者送出仲裁後永久黏著於工作區左欄

> **相依與平行性**：嚴格依序 1.1 → 1.2 → … → 1.8，不使用 parallel markers。1.1 的 Red 契約必須先於 1.2 的 Green。本群組不改 `isArbitrationSubmitted()`、`getDisputeItems()`、`getAssignedReviewUnits()`、`isArbiterCandidate()` 等既有判定函式本身、不採方案 B／C、不處理 issue #722 進度計數器語意是否補入正典（另案追蹤）。

**故事目標**：SC-004O——審核員應能在工作區左欄與導覽走訪到「自己名下的每一個審核單位」，且進度分母與清單頁一致；issue #1000（維護者裁定方案 A）延伸此契約至仲裁者：只要曾對某單位送出仲裁裁定，該單位即恆常出現在該仲裁者的工作區左欄，不受是否仍停留於當次檢視所限，與 issue #824／PR #869 之審核員前例一致。

- [x] 1.1 撰寫 `design/prototype/tests/annotation/issue-1000-arbiter-permanent-sticky.spec.ts` 作為 Red 契約，涵蓋四件事，直接沿用 issue #956 Red 契約已驗證過的 T015 `official_run` fixture（`ofs-03-arbitrated-gold` 指派給 `reviewer_lin`，仲裁者 `reviewer_chen` 具 `can_arbitrate: true`）。先提交此單檔再跑測試，保存 command、exit 與失敗訊息。 [@senior-qa]
  - **(a) 送出仲裁後切走再切回，該單位仍在左欄**：以 `reviewer_chen` 身分對一個目前開啟中的爭議單位送出仲裁，切換至其他單位再切回原單位所在的畫面（不重新整理），確認該單位仍出現在左欄。
  - **(b) 歷史上曾被本仲裁者仲裁的單位（已定稿）也在左欄**：以 `reviewer_chen` 身分開啟工作區（非直接停留於該單位），確認 `ofs-03-arbitrated-gold`（歷史上由 `reviewer_chen` 仲裁定稿）出現在左欄。
  - **(c) 從未被本人仲裁的已定稿單位仍不在左欄（最重要，防止「全部復活」的天真實作）**：確認 `reviewer_chen` 從未仲裁過、且未指派給 `reviewer_chen` 的其他已定稿單位不出現在左欄。
  - **(d) 一般審核員（非仲裁者）的左欄不受影響**：以一般審核員身分（如 `reviewer_wang`）開啟工作區，確認其左欄範圍與 issue #956 既有契約一致，不因本次放寬而多出任何單位。
  - Red 證據：commit `502ea8f4`（senior-qa）。team lead 獨立複驗：`git status --short` 空輸出，工作樹乾淨；獨立重跑 `PW_PORT=8980 pnpm playwright test tests/annotation/issue-1000-arbiter-permanent-sticky.spec.ts --workers=1` → exit 1，3 passed, 2 failed，(a)(b) 失敗、(c)(d) 通過，與 senior-qa 回報一致。(a) 之失敗原因比預期更廣（`isCurrentUnit()` 即時求值使切走時 A 整個從左欄消失，非僅視覺態改變），已誠實記錄。
- [x] 1.2 Green：修改 `design/prototype/pages/annotation/annotation-workspace.config.js` 的 `filterUnitsToAssigned()`。 [@senior-frontend]
  - 第 2 個析取（issue #956 sticky）去掉 `isCurrentUnit(unit) &&` 限定，只留 `data.isArbitrationSubmitted(...)`。
  - 同步更新該析取上方之 issue #956 註解，說明範圍已由「當次檢視」放寬為「曾送出仲裁票即永久黏著」（issue #1000），移除「歷史仲裁單位須維持過濾」之過期敘述。
  - 不得放寬或改寫 1.1 的 Red 契約，並以 1.1 的 Red 測試重跑轉綠驗證之。
  - Green 證據：commit `968407c2`（senior-frontend，只改 `annotation-workspace.config.js` 1 檔，25+/16-）。team lead 獨立複驗：`PW_PORT=8980 pnpm playwright test tests/annotation/issue-1000-arbiter-permanent-sticky.spec.ts --workers=1` → exit 0，5 passed。合併 `origin/main`（`3051d8e1`，撿入 #930／PR #1007，auto-merge 無衝突）後重新確認修改仍完整存在。
- [x] 1.3 執行受影響既有測試並依「位移／前提消失」分類處理。目標檔案（`grep -rl "isArbitrationSubmitted\|filterUnitsToAssigned\|ofs-03-arbitrated-gold\|ofs-03\b" tests/` 導出之窄集合，13 檔，含本次 Red 契約與 `issue-722`/`issue-956` 兩支必跑契約）： [@senior-frontend]
  - `annotation-review-flow-demo-seed.spec.ts`
  - `annotation-review-status-track.spec.ts`
  - `issue-308-finalized-unit-lock.spec.ts`
  - `issue-408-arbitration-item-label-duplicate.spec.ts`
  - `issue-452-review-progress-subjects.spec.ts`
  - `issue-525-reachable-track.spec.ts`
  - `issue-722-arbiter-progress-counter.spec.ts`（issue #956 之 CI 紅燈來源，必跑）
  - `issue-843-review-demo-seed-single-reviewer.spec.ts`
  - `issue-880-review-information-hierarchy.spec.ts`
  - `issue-881-history-reason-dedup.spec.ts`
  - `issue-921-review-assignment-gate.spec.ts`
  - `issue-924-review-history-clear.spec.ts`
  - `issue-956-workspace-left-column-filter.spec.ts`（被本次改動函式的契約，必跑）
  - **不得直接刪除既有斷言**；前提消失者改寫為本次放寬生效後之正確行為的正向斷言，保留為迴歸覆蓋；位移者改寫期望值，斷言結構與意圖不變。 [@senior-frontend]
  - 較寬之候選集聯集（`ws-sample-item|ws-sample-group|ws-progress-text|buildUnits|getAssignedReviewUnits|isArbiterCandidate|isArbitrationSubmitted`、`arbiter|仲裁`、`annotation-workspace.html` 三組聯集去重，148 檔）不在本機重跑，交由 CI 全套把關（比照 #956 tasks.md 1.4 之作法，本次改動範圍遠窄於 #956）；若 CI 發現額外回歸，另開追蹤（不阻塞本 PR）。
  - 結果：13 檔中僅 `issue-956-workspace-left-column-filter.spec.ts` 受影響（前提消失，非位移）；其餘 12 檔（含 `issue-722-arbiter-progress-counter.spec.ts`）62 個 test 一輪全過，未修改。`issue-956` 之修正：commit `f6775681`（senior-frontend，只改該測試檔 1 檔，14+/3-）——原第 150 行 `reviewer_chen` 左欄「恰好 1 筆」之斷言前提（chen 只有一個可仲裁單位、只有當次開啟才黏著）因 issue #1000 而消失，改為 `toHaveCount(2)` 並新增正向斷言鎖定第二筆即為 chen 歷史仲裁過的 `ofs-03-arbitrated-gold`（非巧合湊數），原第 151-155 行既有斷言保留不變，並補英文註解說明位移來源。team lead 獨立複驗：三支核心契約（`issue-956`＋`issue-722`＋`issue-1000`）合併重跑 → exit 0，12 passed；其餘 11 檔（`issue-924` 已含在上面 12 檔之外的獨立批次）重跑 → exit 0，62 passed，與 senior-frontend 回報一致。
- [x] 1.4 執行 code/test gate（`design/prototype/` 目錄）：`pnpm install --frozen-lockfile`、`pnpm typecheck`、`PW_PORT=8980 pnpm playwright test`（1.1、1.3 之全部檔案）。 [@main]
  - 證據：`pnpm typecheck` → exit 0（`tsc --noEmit` 無輸出）。14 個檔案（Red 契約 + 13 檔窄集合）合併重跑 → exit 0，**74 passed**。
- [x] 1.5 生產碼變更完成後（最後一次來源編輯之後），於 worktree 根執行 `node scripts/gen-screen-inventory.mjs` 重生盤點並提交，接著 `node scripts/gen-screen-inventory.mjs --check`、`scripts/inventory-tests.sh`、`scripts/check-sdd.sh`（0 error）、`scripts/check-spec-artifacts.sh`、`node scripts/check-user-path-map-freshness.mjs`。 [@main]
  - 證據：commit `4a789042`（重生盤點，只改內容雜湊一行）。`--check` → up to date；`inventory-tests.sh` → All inventory generator tests passed；`check-sdd.sh` → **0 error(s), 16 warning(s)**（baseline 11 個既有 warning ＋ 本次 5 個 human-review 性質 warning）；`check-spec-artifacts.sh` → passed；`check-user-path-map-freshness.mjs` → `PATH_MAP_FRESH`。
- [x] 1.6 獨立審查（`senior-code-reviewer`，與 1.4 gate 並行啟動）：確認 (1) 未寫第二套平行的「是否已仲裁」判定邏輯（DRY）；(2) 一般審核員的左欄是否被誤擴大；(3) 1.3 之既有測試修正有無「前提消失」被誤當「位移」、或斷言被弱化；(4) issue #722 之進度計數器契約是否仍成立。裁決記入檢查點留言。 [@senior-code-reviewer]
  - 裁決：**四項全數 PASS**。(1) `git show 968407c2` 只刪 2 行程式碼＋改註解，`filterUnitsToAssigned()` 仍呼叫既有 `data.isArbitrationSubmitted(...)`，`annotation-workspace.data.js` 完全未出現在本分支變更檔案列表中，未另立第二套判定。(2) 完整推導 `isArbitrationSubmitted()` 真值條件，確認其只在呼叫者 `reviewerId` 曾出現於某筆 `vote.arbiter_id`（唯一寫入來源 `submitArbitration()`，寫入值即呼叫時的 `identity.reviewerId`）時才為真；`REVIEWER_ROSTER` 四個 ID 互不重複，無字串碰撞風險；case (d) 斷言之 6/5 筆數逐字對應 issue #956 既有已驗證契約同一 fixture，非空斷言。(3) `issue-956` 測試修正之數字位移正確定性為「前提消失」而非位移，新斷言確實鎖定 `ARBITRATED_SAMPLE`＋`LI_OWNED_ANNOTATOR` 身分（非巧合湊數），原斷言逐字保留未刪除，同檔其餘 test 掃過未被連帶弱化。(4) `git log` 確認本分支未動 `issue-722-arbiter-progress-counter.spec.ts`，其 fixture 全程未切走單位，`isCurrentUnit()` 拿掉前後行為相同，契約仍成立。額外檢查：OpenSpec delta 三個新 Scenario 用語與程式碼行為完全對應；10 個 commit 逐一核實範圍純淨，無夾帶。兩點非阻斷觀察：(a) `isArbitrationSubmitted()` 以 `reviewerId` 字串相等判定屬既有設計，非本次引入風險；(b) 1.7/1.8 尚未完成屬預期中的後續步驟。
- [x] 1.7 更新 `specs/annotation/015-annotation-workspace/spec.md`，完成 gate 4 回寫：版號 MINOR bump（接續現行最大 AC-4.x 續編一則新 AC，未移除任何既有 FR／AC），Changelog 補一列，FR-093 本文接續 v7.1.0 追加「本版修訂（issue #1000）」段落，`specs/STATUS.md` 只動 `annotation-015` 一列（歷史段落一字不動）。 [@main]
  - 版號依主 session 通知自 7.4.0 改為 **7.5.0**（同波 #975 已就緒取走 7.4.0）；正典 frontmatter、Changelog 版本欄皆寫乾淨的 `7.5.0`／`| 7.5.0 |`，無任何「暫定」字樣殘留。新增 **AC-4.80**（送出仲裁後切走再切回仍黏著、歷史仲裁單位亦黏著、從未仲裁之已定稿單位仍不在左欄、一般審核員不受影響）。commit `3dfb9ec0`（正典回寫，只改 `specs/annotation/015-annotation-workspace/spec.md` 與 `specs/STATUS.md` 兩檔）。
  - Source-Verify 逐條 grep 驗證（`/usr/bin/grep`，本 worktree 互動殼層 `grep` 對 `annotation-workspace.data.js` 有假陰性，改用絕對路徑避開）：`FR-093`（52 處）、`AC-4.80`（正典 2 處：AC 清單＋FR-093 標頭括號）、`7.5.0`（正典 frontmatter＋Changelog＋`specs/STATUS.md` 皆命中）、`issue #1000`／`#1000`（正典 3 處＋STATUS.md 1 處）、`#956`（8 處）、`#824`（14 處）、`#722`（3 處）、`function isArbitrationSubmitted`（`annotation-workspace.data.js:2975`）、`function filterUnitsToAssigned`（`annotation-workspace.config.js:1664`）皆可定位。
  - 執行 `/opsx:archive`（`npx -p @fission-ai/openspec openspec archive arbiter-sticky-permanent-visibility --yes`）→ `Change 'arbiter-sticky-permanent-visibility' archived as '2026-09-27-arbiter-sticky-permanent-visibility'`；衍生檢視 `openspec/specs/annotation/015-annotation-workspace/spec.md` 同步合併（FR-093 本文追加段落 ＋ 3 個新 Scenario），只 modify 該 1 個檔案，比對 diff 確認合併內容與正典一致。change 目錄已移至 `openspec/changes/archive/2026-09-27-arbiter-sticky-permanent-visibility/`。
- [x] 1.8 commit、push（worktree 內，不 rebase 已推送 commit），PR body 寫入 scratchpad，回報主 session。 [@main]
  - 全程 13 個 commit 已依序 push（無 force、無 rebase 已推送 commit；`3051d8e1` 為合併 `origin/main` 撿入 #930／PR #1007）。PR body 已寫入 `/private/tmp/claude-501/-Users-mandy610425-project-label-suite/f4b8fc17-b2d8-43cb-8ca6-1e4aaa298706/scratchpad/pr-1000.md`。未自行開 PR，回報主 session 依此檢查點與 handback 報告處理。
