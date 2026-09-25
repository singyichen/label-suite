# Tasks

## 1. Red 測試

**故事目標**：SC-006 — Annotator 主要流程（標記/提交/返回）端到端可完成，且已定稿單位之寫入邊界須可信、有歷程可追溯。

- [x] 1.1 以 `design/prototype/tests/annotation/issue-908-annotator-finalized-lock.spec.ts` 建立測試：seed 一個 `official_run` 單位使其有標記員真實提交且已定稿（`markSampleSubmitted` annotator + 匹配之 reviewer `approve` 決策），以該標記員身分開啟工作區，驗證 `ws-annotator-finalized-notice` 顯示、`wsSkipBtn`／`wsSaveBtn`／`wsSubmitBtn` 皆帶 `disabled` 與 `aria-disabled="true"` 且仍在 DOM 中、自動儲存狀態列文案為鎖定文案。commit 並記錄執行結果為預期失敗。[@senior-qa]
- [x] 1.2 同一測試檔追加：對上述已定稿單位嘗試 `page.evaluate` 直接呼叫 `markSampleSubmitted`／`markSampleSaved`／`appendSampleTimelineEvent`（role='annotator'），驗證三者皆回傳 `false` 且該單位之 `getReviewUnitStatus()` 讀回仍為 `finalized`（不得翻回 `disputed`／`pending`），並驗證 bucket 內容（答案／歷程事件數）於呼叫前後不變。commit 並記錄預期失敗。[@senior-qa]
- [x] 1.3 同一測試檔追加〔示範列 seed 豁免，本張最容易做錯之處〕：seed 一個單位僅有審核員對 FR-044a 示範列之 `approve` 決策、標記員本人**無**任何真實儲存提交，以該標記員身分開啟工作區，驗證 `ws-annotator-finalized-notice` 不存在、三個控件皆無 `disabled`／`aria-disabled`；接著以該身分正常填答並提交，驗證提交成功（`isSampleSubmitted` 為 true 或畫面出現送出成功之既有信號），不被鎖定機制阻擋。commit 並記錄預期失敗（若目前實作意外通過此點，改記錄「新增但暫時通過，待 2. 綠燈實作階段確認不受影響」並於 3. 一併驗證）。[@senior-qa]
- [x] 1.4 同一測試檔追加〔dry_run 不受影響〕：同一組資料以 `run_type=dry_run` 建構同等已定稿情境，驗證鎖定機制不生效，標記員寫入不受額外阻擋。commit 並記錄預期失敗（或視現況記錄基準行為）。[@senior-qa]
- [x] 1.5 驗證預期失敗證據前先跑 `git status --short` 確認工作樹乾淨，輸出貼進 issue #908 檢查點留言；四個案例之 Playwright 執行輸出（含失敗訊息）一併貼上。[@senior-qa]

## 2. Green 實作

**故事目標**：SC-006 — 修正後仍須維持既有流程可完成、已定稿邊界可信之保證。

- [x] 2.1 修改 `design/prototype/pages/annotation/annotation-workspace.data.js`：新增一個內部判定 helper（沿用 `getReviewUnitStatus()`，outKeys 由 `resolveTaskProfile(taskId).outputs.map(o => o.type)` 推導），`markSampleSubmitted()`／`markSampleSaved()`／`appendSampleTimelineEvent()` 於 `role === 'annotator'` 時以寫入前狀態呼叫該判定，已定稿時回傳 `false` 且不產生任何寫入，未鎖定時維持既有行為並回傳 `true`；三者既有簽章不變。使 1.2 測試轉綠，1.3／1.4 維持綠燈（不得因本次修改而破壞示範列豁免或 dry_run 不受影響）。[@senior-frontend]
- [x] 2.2 修改 `design/prototype/pages/annotation/annotation-workspace.config.js`：`handleSave()`／`handleSubmit()`／`handleSkip()` 依 2.1 三個函式之回傳值分流——`false` 時顯示鎖定錯誤 toast、不清空未儲存狀態、不導頁、不呼叫 `syncDryRunProgress()`；`renderWorkspace()` 新增鎖定提示渲染（`ws-annotator-finalized-notice`，資訊色，沿用 FR-094 語言慣例）與 `wsSkipBtn`／`wsSaveBtn`／`wsSubmitBtn` 之 `disabled`＋`aria-disabled` 設定（鎖定解除時需還原，不得殘留於非鎖定單位）；`renderAutosaveStatus()` 新增鎖定分支，顯示「已定稿，不再自動儲存」；新增對應中英文 i18n 字串。使 1.1 測試轉綠。[@senior-frontend]
- [x] 2.3 確認 `#annotationPreview` 內既有作答控制於鎖定生效時亦呈現不可互動狀態（現有 DOM 結構下，逐控件套用 `disabled`／`aria-disabled` 或等效之通用、非任務專屬機制），且已選定之作答維持可辨識、不與未選項套用相同視覺結果。[@senior-frontend]

## 3. 驗證與正典回寫

**故事目標**：SC-006 — 確認新增鎖定與既有審核流程、示範列豁免、dry_run 流程皆未回歸。

- [x] 3.1 執行閘門：`cd design/prototype && pnpm typecheck`；`cd design/prototype && PW_PORT=8994 pnpm playwright test issue-908-annotator-finalized-lock.spec.ts issue-307-empty-review-unit-gate.spec.ts issue-910-review-unit-status-consistency.spec.ts issue-308-finalized-unit-lock.spec.ts --workers=1`；`bash scripts/check-sdd.sh`；`bash scripts/check-spec-artifacts.sh`；`bash scripts/check-demo-data-parity.sh`；`npx -p @fission-ai/openspec openspec validate --changes --no-interactive`。全部通過方可繼續，主責（main）親自重跑並獨立覆核，不採信代理自報。[@main]
- [x] 3.2 若本次變更觸及 `design/prototype/pages/**`，於最後一次來源編輯後重新產生 screen-inventory 一次。[@main]
- [x] 3.3 Source-Verify：確認 FR-101、FR-072 第 3 點修訂、FR-051、FR-044a、FR-094 皆可於正典逐一 grep 定位；`openspec archive` 回寫正典（版本 6.18.0 → 6.19.0，補 Changelog 條目）並同步更新 `openspec/specs/` derived view。[@main]

## 4. 獨立審查與 PR

**故事目標**：SC-006 — 合併前須經未參與實作者複核，確保觸發條件、示範列豁免、dry_run 邊界與定稿快照禁令皆未被弱化。

- [x] 4.1 派未寫過本改動的 senior-code-reviewer 獨立審查：鎖的觸發條件是否真的是「有真實提交」而非僅 `finalized`（最關鍵一項）、示範列 seed 單位是否確實不被鎖、`dry_run` 是否未受影響、三個寫入點是否都加了守衛（有無殘留繞過路徑）、有無引入定稿快照、`issue-307`／`issue-910` 既有斷言是否仍全綠、新增 AC 與 FR-051／FR-072／FR-044a 是否一致、Source-Verify 引用可否逐條 grep 定位、紅燈契約有無被弱化。結論原文貼進 issue #908 檢查點留言。[@senior-code-reviewer]
- [ ] 4.2 開 PR（base main，Closes #908，逐項 Test Plan 證據，紅燈／綠燈證據皆貼），push 前 `git fetch origin main && git rebase origin/main`。[@main]
