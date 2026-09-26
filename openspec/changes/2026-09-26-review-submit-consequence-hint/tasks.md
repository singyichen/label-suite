# Tasks

## 1. Red 測試

**故事目標**：SC-006 — Reviewer 主要流程（審查/決策/提交）在送出前即可得知後果，不再靜默定稿或進入爭議池（issue #930）。

- [ ] 1.1 以 `design/prototype/tests/annotation/issue-930-submit-consequence-hint.spec.ts` 建立測試，涵蓋 FR-102 全部四個 Scenario：(a) 未選決策時 `ws-review-submit-consequence` 顯示中性文字、`data-consequence="pending"`，且 `ws-review-quick-submit-consequence` 隱藏；(b) 選「通過」後 `official_run` 與 `dry_run` 兩種 `run_type` 各驗一次對應文字與 `data-run-type`；(c) 選「修正」與「無法裁決」分別驗證兩個提示皆顯示相同的爭議池文字與 `data-consequence="disputed"`；(d) 切換決策（通過→修正→改答案致決策被清空）時提示即時跟著切換。全部案例對兩個送出入口（footer 與決策列）都要驗證。commit 並記錄執行結果為預期失敗。[@senior-qa]
- [ ] 1.2 驗證預期失敗證據前先跑 `git status --short` 確認工作樹乾淨，輸出貼進 issue #930 檢查點留言；Playwright 執行輸出（含失敗訊息）一併貼上。[@senior-qa]

## 2. Green 實作

**故事目標**：SC-006 — 於 `renderReviewerWorkspace()` 與 `buildReviewQuickSubmit()` 新增後果提示，重用既有 `REVIEW_UNIT_STATUS`／`REVIEW_DECISIONS` 推導，不另立第二套判定。

- [ ] 2.1 `design/prototype/pages/annotation/annotation-workspace.html`：action-bar-right 容器內 wsReviewSubmitBtn 旁新增靜態占位元素（預設 hidden，testid ws-review-submit-consequence）。[@senior-frontend]
- [ ] 2.2 `design/prototype/pages/annotation/annotation-workspace.config.js`：新增一個純函式 reviewSubmitConsequenceStatus，對本單位全部已選輸出類型逐一讀取其草稿決策，回傳既有 REVIEW_UNIT_STATUS 三值之一（PENDING／DISPUTED／FINALIZED），規則依 tasks 1.1 之四個 Scenario；MUST NOT 新建與 REVIEW_DECISIONS／REVIEW_UNIT_STATUS 矛盾或重複的第二套字面對照表。[@senior-frontend]
- [ ] 2.3 於 `renderReviewerWorkspace()`（約 :5306）依既有五個非互動分支（ARBITRATION／FINALIZED／OFF_ROSTER／NOT_ASSIGNED／EMPTY）鏡射隱藏 `ws-review-submit-consequence`，於可互動路徑（既有 `reviewSubmitBtn.classList.remove('hidden')` 之後）顯示並掛上文字，且把其 refresh 函式加入既有 `reviewDecisionRefreshers`（與既有決策按鈕、理由欄、修正欄共用同一份重繪清單，不新建第二套訂閱機制）。[@senior-frontend]
- [ ] 2.4 於 `buildReviewQuickSubmit()`（約 :3358）新增 `ws-review-quick-submit-consequence` 元素，沿用同一個 `reviewSubmitConsequenceStatus()`，其可見狀態與既有 `allDecided` 判定同步；同樣掛入 `reviewDecisionRefreshers`。[@senior-frontend]
- [ ] 2.5 新增 zh／en 四組 i18n 字串鍵（中性、爭議池、定稿-official、定稿-dry_run 後綴），沿用既有 `REVIEW_NOTE_RUN_SUFFIX_I18N_KEYS` 的「基底 + 分流後綴」寫法精神。使 1.1 測試全數轉綠。[@senior-frontend]

## 3. 驗證與正典回寫

**故事目標**：SC-006 — 確認新增提示未影響既有送出驗證與既有測試，且 OpenSpec 四道閘門與正典回寫皆完成。

- [ ] 3.1 執行閘門：`cd design/prototype && pnpm install --frozen-lockfile`；`pnpm typecheck`；以 `grep -rl` 推導候選集後 `PW_PORT=8988 pnpm playwright test <候選集>`；`node scripts/gen-screen-inventory.mjs`（僅於最後一次改生產碼後跑一次）；`node scripts/gen-screen-inventory.mjs --check`；`scripts/inventory-tests.sh`；`scripts/check-sdd.sh`（須 0 error）；`scripts/check-spec-artifacts.sh`；`node scripts/check-user-path-map-freshness.mjs`。全部通過方可繼續，主責（main／team-lead）親自重跑並獨立覆核，不採信代理自報。[@main]
- [ ] 3.2 Source-Verify：確認 FR-051、FR-070、FR-092、AC-3.64、AC-3.65 之引用行號與新增函式所在位置皆可逐一 `grep -n` 定位；執行 `openspec archive` 回寫正典（版本 7.1.0 → 7.3.0，實際號碼依主 session 合併時裁決，補 Changelog 條目）並同步更新 `openspec/specs/` derived view。[@main]

## 4. 獨立審查與 PR

**故事目標**：SC-006 — 合併前須經未參與實作者複核，確保後果文字忠實反映真實效果、兩個入口一致、且未弱化既有測試。

- [ ] 4.1 派未寫過本改動的 senior-code-reviewer 獨立審查：(1) 後果文字是否由既有狀態推導決定、有無自寫第二套判定；(2) `dry_run`／`official_run` 的差異是否正確反映；(3) 兩個送出入口的處理是否一致；(4) 被改動的既有測試有無弱化。結論原文貼進 issue #930 檢查點留言。[@senior-code-reviewer]
- [ ] 4.2 開 PR（base main，Closes #930，逐項 Test Plan 證據，紅燈／綠燈證據皆貼），push 前 `git fetch origin main && git merge origin/main`（禁止 rebase 已推送 commit）。[@main]
