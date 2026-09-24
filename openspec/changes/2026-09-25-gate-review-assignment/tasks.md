# 任務清單：gate-review-assignment

> **Apply 前硬閘**：先執行 `npx -p @fission-ai/openspec openspec validate --changes --no-interactive` 與 `scripts/check-sdd.sh`，分別回報 OpenSpec schema validation 與 Project SDD lint。兩者都通過才可進入 `/opsx:apply`。主 session／team lead 是唯一可以驗證 Red／Green evidence 並更新 checkbox 的角色。

> **單一群組**：本變更只有 1 個 prototype 產品檔（`annotation-workspace.config.js`），遠低於單一 PR 5 檔上限，不拆群組。propose、apply、archive 放在同一個 PR。
>
> **序列前提**：本波（Wave 3）正典 015 的版本 bump 名額屬於本變更（issue #921），同波的 #942／#923 皆不動 `specs/`。動到 `design/prototype/pages/` 後，必須在最後一次來源編輯之後重生一次 `design/system/screen-inventory.md`（不要每次編輯都重生）。

---

## 1. PR-921 — 工作區補上審核指派閘門

> **相依與平行性**：嚴格依序 1.1 → 1.2 → … → 1.7，不使用 parallel markers。1.1 的 Red 契約必須先於後續步驟。1.2 記錄流程偏離（原定「probe」步驟因故未依計畫執行，見該項說明）。本群組不改 `getAssignedReviewUnits()`／`getReviewAssignments()`／`taskReviewAssignments()` 等指派推導本身、不改 `annotation-list.html` 既有過濾邏輯、不改 FR-060 仲裁資格判定、不新增後端權限控管、不處理 #913／#914。

**故事目標**：SC-004O——審核員要能在工作區左欄走訪到自己名下的每一個審核單位；FR-093「不由審核員自行挑單」要求同一單位恰一位審核員，但未指派的審核員目前能在工作區任意點選他人單位並送出決策，造出同一單位多提交的形狀（#913／#914 的實際產生途徑）。

- [x] 1.1 撰寫 `design/prototype/tests/annotation/issue-921-review-assignment-gate.spec.ts` 作為 Red 契約，釘住下列事項，直接沿用 issue #921 重現步驟給出的 fixture（T015／`official_run`，`ofs-04-pending-review` → `reviewer_wang`、`ofs-02-modified-dispute` → `reviewer_li`）。先提交此單檔再跑測試，保存 command、exit 與失敗訊息。 [@senior-qa]
  - **左欄只列指派給自己的單位**：以 `reviewer_li` 身分開啟 T015 `official_run` 工作區，左欄（`ws-sample-item`）不得出現 `ofs-04-pending-review`（指派給 `reviewer_wang`），只出現指派給 `reviewer_li` 的單位；單位數與 `annotation-list` 該身分看到的清單列數一致。
  - **未指派審核員直接網址開啟他人單位為唯讀**：以 `reviewer_li` 身分直接以網址開啟 `ofs-04-pending-review`（指派給 `reviewer_wang`）：樣本內容（`ws-input-content`）仍渲染；`ws-review-submit-btn` 不可見或 `disabled`；出現 `data-testid="ws-review-not-assigned"` 的原因說明卡；Ctrl/Cmd+Enter 快捷鍵不觸發送出（沿用既有 `ws-review-submit-btn` hidden 時捷徑不生效的斷言寫法，見 `annotation-workspace-action-shortcuts.spec.ts`）。
  - **迴歸防護：仲裁入口不受影響**——以具 `can_arbitrate` 資格且未參與過某爭議單位審核的審核員身分（T015 名冊之 `reviewer_chen`）開啟該爭議單位：仲裁卡（`ws-arbitration-*`）正常渲染，`ws-arbitration-submit-btn` 可用，且不出現 `ws-review-not-assigned`——即使該單位未依 FR-093 指派給這位仲裁者。
  - 斷言不得寫死任務的單位總數；以「不含某 testid」「與清單頁同一身分之列數比對」等方式斷言，避免與 1.2 的期望值同步互相污染。
  - Red 證據：commit `a47c9525`。主 session 於乾淨的 detached worktree（非本 worktree，避開下述 1.2 污染）重跑 `PW_PORT` 另指定埠、`pnpm playwright test tests/annotation/issue-921-review-assignment-gate.spec.ts`：exit 1，2 failed／1 passed（迴歸防護一則本就該綠）。失敗點：`ws-review-submit-btn` 斷言 `toBeHidden()` 逾時，符合預期失敗原因。
- [x] 1.2（流程偏離記錄，取代原「probe」步驟）senior-qa 收到的 1.2 prompt 內含本 change 設計者（team lead）給定的完整實作文字，做為「暫套後跑全量、跑完即還原」的探測工具；但該補丁**未被還原**，以未提交變更的形態留在 worktree 中，且 senior-qa 未回報 1.1／1.2 結果即逾時。主 session 複驗時發現此狀態並提交檢查點留言（見下）。team lead 因此改變流程：不再另派 `senior-frontend` 重新實作（該補丁已是 team lead 自己設計的實作，重新指派形同演戲），而是逐行核對該補丁與 design.md D1–D4 是否相符，見 1.3。 [@main]
  - 核對發現一項真實偏差：`filterToAssignedReviewUnits()` 的指派鍵分隔字元被寫成純空白 `' '`，而非 design.md 指定、與 `annotation-list.html` 同款的 `'\u0000'`（NUL）——會造成 sample_id／annotator_id 邊界不明的假性碰撞風險，非表面問題。已修正為逐位元組核對過與 `annotation-list.html:1851` 完全一致的 `'\u0000'` 寫法。
- [x] 1.3 Green（初版，範圍後由 1.4 收斂）：修改 `design/prototype/pages/annotation/annotation-workspace.config.js`（design.md D1–D4，經 1.2 修正）：`buildUnits()`（`:1508`）拆分為 `buildAllUnits()`（現行邏輯逐字搬移）＋ 過濾後的 `buildUnits()`（reviewer 角色套用新增之 `filterToAssignedReviewUnits()`，其餘角色原樣回傳 `buildAllUnits()`）；`filterToAssignedReviewUnits(units)` 呼叫既有 `getAssignedReviewUnits()`，含仲裁例外（`reviewUnitState(unit) === DISPUTED && isArbiterCandidate(...)`），NUL 分隔鍵鏡射 `annotation-list.html` 的 `filterToAssignedUnits()`；`REVIEW_UNIT_BLOCK`（`:3594`）新增 `NOT_ASSIGNED: 'not_assigned'`；`reviewUnitBlockReason()`（`:3611`）判定序改為 ARBITRATION → FINALIZED → OFF_ROSTER → NOT_ASSIGNED → EMPTY（此序後於 1.4 修正，見下），新增 `isCurrentUnitAssigned()` 重用過濾後的 `buildUnits()`；新增唯讀渲染分支（`ws-review-not-assigned`，鏡射 OFF_ROSTER 分支寫法）與中英文案 `reviewNotAssignedNote`（緊接 `reviewOffRosterNote` 之後）；補上本檔一貫的逐函式用途註解（1.2 探測補丁為求精簡未附註解）。不得放寬或改寫 1.1 的 Red 契約，並以 1.1 的 Red 測試重跑轉綠驗證之。 [@main]
  - Green 證據：commit `c8ec438e`（含流程偏離揭露於 commit body）。`PW_PORT=8984 pnpm playwright test tests/annotation/issue-921-review-assignment-gate.spec.ts` → exit 0，3 passed。`pnpm typecheck` → exit 0。
  - **流程偏離揭露**：本次 Red 與 Green 同源——Red 由 senior-qa 撰寫，但其 prompt 內含 team lead 設計的 Green 補丁；Green 由 team lead 逐行核對後直接提交，未經獨立的 `senior-frontend` 從零實作。已於獨立審查明確告知此事並要求加重審查。
- [x] 1.4 執行受影響既有測試並依「位移／前提消失」分類處理，發現於 propose 階段未預期、但與已知 FR-093 v6.15.0（issue #868，仲裁者保留規則）機制交互產生的既有測試失效；同批發現 apply 階段自己設計的判定序有缺陷並修正。 [@main]
  - **判定序修正（設計缺陷，非測試位移）**：以 1.3 的 Green 跑 `issue-307-empty-review-unit-gate.spec.ts`，`reviewer_id: 'reviewer_chen'` 開啟 T015 `ofs-05-not-submitted`（尚無標記員提交、亦無示範列）的首則案例意外轉紅。追查發現 propose 階段設計之判定序 OFF_ROSTER → NOT_ASSIGNED → EMPTY 有真實缺陷：真正空的單位在 `getReviewUnitRows()` 中不產生任何列舉項，對任何人（含未來輪值會分到它的審核員）皆不構成「已指派」，NOT_ASSIGNED 排在 EMPTY 之前會讓未來受派者收到「未指派給你」的假訊息。修正判定序為 **OFF_ROSTER → EMPTY → NOT_ASSIGNED**（design.md D3 已同步更新），此修正使該案例**無需任何測試改動**即轉綠。
  - **位移（identity 改指派對象，非刪除或減弱斷言）**：以 node 端 `taskReviewAssignments()` 直接查詢（非猜測）確認 T015 `official_run` 實際指派為 `ofs-01→wang`、`ofs-02→li`、`ofs-03→lin`、`ofs-04→wang`、`ofs-05→li`（`ofs-05` 於標記員提交後才進入列舉）；T001 `sent-001 × kioleemg12 → reviewer_li`。`issue-307-empty-review-unit-gate.spec.ts` 其餘 3 則案例與 `annotation-list-reviewer.spec.ts` 已示範同構之預設身分位移不同——本檔固定用 `reviewer_chen`（T015 唯一 `can_arbitrate` 者），但 chen 依 issue #868／v6.15.0 規則被排除於**全部**新指派之外，永遠無法成為任何非黏住單位的受派者。修正：`reviewerUrl()` 改為可帶入 `reviewerId` 參數（預設仍為 chen，僅 `ofs-05` 空狀態案例合法沿用，因該情境對任何身分皆同），`ofs-04` 案例改用 `reviewer_wang`、T001 mock-row 案例顯式帶入 `reviewer_id=reviewer_li`、live-path 案例的審核員讀取階段改用 `reviewer_li`。斷言內容與測試結構逐字未改，只改開啟單位的審核員身分。
  - **前提消失（判定為前提消失，重新命名並改寫斷言以驗證新正確行為，未刪除任何測試）**：`annotation-workspace-arbitration.spec.ts` 兩則「negative paths keep the normal review card」案例的前提在 FR-093 指派閘門生效後不再成立：(a) 「non-participant without can_arbitrate flag reviews normally」——`beforeEach` 已令 `reviewer_wang` 對同一單位持有黏住提交（issue #824），FR-093 下該單位僅有 wang 一位受派者，`reviewer_li` 開啟同一單位「正常審核」正是 #921 修復的多提交漏洞本身，不再可能合法發生；(b) 「an arbiter on a non-disputed unit reviews normally」——`reviewer_chen` 依 v6.15.0 規則永遠無法成為任何未爭議單位的受派者，「仲裁者正常審核非爭議單位」在現行分派模型下已無可達狀態。兩則皆判定為前提消失而非位移：不刪除，改為斷言 FR-093 本身要求的正確結果（`ws-review-not-assigned` 唯讀提示、`ws-review-submit-btn` 隱藏），標題與內文註解均已更新並引用 issue #921／#868 說明理由。
  - 受影響測試轉綠證據（1.3 範圍下）：`PW_PORT=8984 pnpm playwright test tests/annotation/annotation-list-reviewer.spec.ts tests/annotation/annotation-workspace-arbitration.spec.ts tests/annotation/issue-307-empty-review-unit-gate.spec.ts tests/annotation/issue-921-review-assignment-gate.spec.ts` → exit 0，38 passed。
- [x] 1.4b 升級判定：以 senior-qa 之全量 probe（雖受並行 commit 汙染，形狀可信）確認 1.3 之左欄過濾牽動約 48 個既有測試檔——遠超單一 PR 承載範圍，亦踩 CLAUDE.md「task 觸及 ≥ 10 檔須升級」門檻。上呈主 session 裁決，裁決為選項 1（堆疊拆分）：本 PR 只保留指派閘門本身，左欄過濾移交新開 issue #956（前置本 issue）。 [@main]
  - 證據：主 session 檢查點留言（裁決全文）；issue #956 已開立：https://github.com/singyichen/label-suite/issues/956
- [x] 1.4c 依 1.4b 裁決收斂範圍，修改 `annotation-workspace.config.js`：左欄過濾之拆分函式還原為單一未過濾之單位列舉（左欄、導覽、送出後自動前進回復列舉全部單位）；指派檢查改為直接把完整單位宇宙餵給既有的指派查詢函式，只檢查目前單位成員資格，不再需要仲裁例外析取（ARBITRATION 分支已於此之前攔截）；判定序維持 1.4 修正後的 ARBITRATION → FINALIZED → OFF_ROSTER → EMPTY → NOT_ASSIGNED。同步收窄 Red 測試檔，移除左欄過濾斷言（移交 #956），保留直接網址唯讀與仲裁迴歸防護兩則。 [@main]
  - 收斂實作證據：commit `86463573`。`pnpm typecheck` → exit 0；Red 測試（收斂後 2 則，`issue-921-review-assignment-gate.spec.ts`）→ exit 0，2 passed。
  - 重新核對 1.4 已修正之兩支既有測試檔（`annotation-workspace-arbitration.spec.ts`、`issue-307-empty-review-unit-gate.spec.ts`）：兩者斷言皆針對送出閘門（審核卡、送出鈕、仲裁卡），與左欄無關，收斂後全部仍需要、且仍然通過，未還原任何斷言。四支受影響檔（含 `annotation-list-reviewer.spec.ts`）合併重跑 → exit 0，37 passed（較 1.4 少 1，為移除之左欄測試本身）。
  - 累計產品碼變更（相對 `origin/main`）：1 個檔案、76 行，遠低於 5 檔／300 行門檻。
- [ ] 1.6 執行 code/test gate：在 `design/prototype/` 下以 `PW_PORT=8984` 執行 `pnpm typecheck` 與**乾淨工作樹**上不過濾路徑之全量 `pnpm playwright test`（全量，不得只跑子目錄；主 session 已指示需在乾淨狀態下重跑，1.4c 之範圍收斂後真實影響面應大幅收斂）。兩者預期 exit `0`，分開記錄；若仍有非本 PR 造成之失敗，逐一 triage 後回報，不得逕自修改超出閘門範圍之檔案。跑完後於本 worktree 內執行 `node scripts/gen-screen-inventory.mjs` 重生盤點並提交（只在最後一次來源編輯之後重生一次）。 [@main]
  - gate 證據：待補。
- [ ] 1.7 更新 `specs/annotation/015-annotation-workspace/spec.md`，完成 gate 4 回寫。 [@main]
  - 版號 MINOR bump（自當下最新版號接續），Changelog 補一列。
  - FR-093 本文加上「本版修訂（issue #921）」段落（逐字保留既有 v5.0.0／issue #815／issue #824／issue #868 全部既有文字，只在其後追加新段落）。
  - delta 中未編號的新情境，於本步驟接續 US4（FR-093 對應使用者故事）現行最大 AC 編號，編成新 AC。
  - 回寫證據：待補。gate 1／gate 2 證據：待補。
- [ ] 1.8 執行 `/opsx:archive gate-review-assignment`（需經使用者明確授權）。產生衍生檢視後，依 `docs/sdd-workflow.md` §6.2 逐條 grep 本 change 寫入的 canonical citation（FR-058、FR-060、FR-093、FR-094、FR-055、FR-056、新 AC、issue #824、issue #868、issue #921 等），確認每一條都能個別定位。final merge 後才更新 `specs/STATUS.md`。 [@main]
  - 證據：待補。
