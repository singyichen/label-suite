# 任務清單：gate-review-assignment

> **Apply 前硬閘**：先執行 `npx -p @fission-ai/openspec openspec validate --changes --no-interactive` 與 `scripts/check-sdd.sh`，分別回報 OpenSpec schema validation 與 Project SDD lint。兩者都通過才可進入 `/opsx:apply`。主 session／team lead 是唯一可以驗證 Red／Green evidence 並更新 checkbox 的角色。

> **單一群組**：本變更只有 1 個 prototype 產品檔（`annotation-workspace.config.js`），遠低於單一 PR 5 檔上限，不拆群組。propose、apply、archive 放在同一個 PR。
>
> **序列前提**：本波（Wave 3）正典 015 的版本 bump 名額屬於本變更（issue #921），同波的 #942／#923 皆不動 `specs/`。動到 `design/prototype/pages/` 後，必須在最後一次來源編輯之後重生一次 `design/system/screen-inventory.md`（不要每次編輯都重生）。

---

## 1. PR-921 — 工作區補上審核指派閘門

> **相依與平行性**：嚴格依序 1.1 → 1.2 → … → 1.6，不使用 parallel markers。1.1 的 Red 契約必須先於 1.2 的 probe；1.2 的 probe 必須先於 1.3 的 Green（probe 用暫套 Green 的方式跑，跑完即還原，詳見 1.2）。本群組不改 `getAssignedReviewUnits()`／`getReviewAssignments()`／`taskReviewAssignments()` 等指派推導本身、不改 `annotation-list.html` 既有過濾邏輯、不改 FR-060 仲裁資格判定、不新增後端權限控管、不處理 #913／#914。

**故事目標**：SC-004O——審核員要能在工作區左欄走訪到自己名下的每一個審核單位；FR-093「不由審核員自行挑單」要求同一單位恰一位審核員，但未指派的審核員目前能在工作區任意點選他人單位並送出決策，造出同一單位多提交的形狀（#913／#914 的實際產生途徑）。

- [ ] 1.1 撰寫 `design/prototype/tests/annotation/issue-921-review-assignment-gate.spec.ts` 作為 Red 契約，釘住下列事項，直接沿用 issue #921 重現步驟給出的 fixture（T015／`official_run`，`ofs-04-pending-review` → `reviewer_wang`、`ofs-02-modified-dispute` → `reviewer_li`）。先提交此單檔再跑測試，保存 command、exit 與失敗訊息。 [@senior-qa]
  - **左欄只列指派給自己的單位**：以 `reviewer_li` 身分開啟 T015 `official_run` 工作區，左欄（`ws-sample-item`）不得出現 `ofs-04-pending-review`（指派給 `reviewer_wang`），只出現指派給 `reviewer_li` 的單位；單位數與 `annotation-list` 該身分看到的清單列數一致。
  - **未指派審核員直接網址開啟他人單位為唯讀**：以 `reviewer_li` 身分直接以網址開啟 `ofs-04-pending-review`（指派給 `reviewer_wang`）：樣本內容（`ws-input-content`）仍渲染；`ws-review-submit-btn` 不可見或 `disabled`；出現 `data-testid="ws-review-not-assigned"` 的原因說明卡；Ctrl/Cmd+Enter 快捷鍵不觸發送出（沿用既有 `ws-review-submit-btn` hidden 時捷徑不生效的斷言寫法，見 `annotation-workspace-action-shortcuts.spec.ts`）。
  - **迴歸防護：仲裁入口不受影響**——以具 `can_arbitrate` 資格且未參與過某爭議單位審核的審核員身分（T015 名冊之 `reviewer_chen`）開啟該爭議單位：仲裁卡（`ws-arbitration-*`）正常渲染，`ws-arbitration-submit-btn` 可用，且不出現 `ws-review-not-assigned`——即使該單位未依 FR-093 指派給這位仲裁者。
  - 斷言不得寫死任務的單位總數；以「不含某 testid」「與清單頁同一身分之列數比對」等方式斷言，避免與 1.2 的期望值同步互相污染。
  - Red 證據：待補（commit hash、`PW_PORT=8984 pnpm playwright test tests/annotation/issue-921-review-assignment-gate.spec.ts` 之 exit 與失敗訊息）。
- [ ] 1.2 以 probe（暫套 1.3–1.4 的修改跑全量，跑完即還原）找出既有測試中因指派閘門生效而位移的斷言——預期集中在使用預設身分（`reviewer_wang`）開啟 `reviewerIds` 未設定或多人名冊任務（如 T001）工作區、並斷言左欄項目數／導覽走訪全部單位的既有測試（`annotation-workspace-review-unit-nav.spec.ts` 的 `T001_UNITS = 15` 等）。參照 `annotation-list-reviewer.spec.ts:23-37` 已驗證過的同構數字（`official_run: 5`、`dry_run: 6`，預設身分 `reviewer_wang` 在 T001 的分派結果）校驗新期望值是否一致。只改期望值，不改測試結構；若某則斷言的前提本身消失（而非單純位移，例如斷言的單位剛好從未指派給該測試使用的身分），另行判定並記錄理由，不得逕自刪除斷言。先提交再跑，保存「舊實作下這些斷言失敗」的證據。 [@senior-qa]
  - 證據：待補（涉及檔案清單與 commit hash）。
- [ ] 1.3 Green：修改 `design/prototype/pages/annotation/annotation-workspace.config.js`（design.md D1–D4）：`buildUnits()`（`:1508`）拆分為 `buildAllUnits()`（現行邏輯逐字搬移）＋ 過濾後的 `buildUnits()`（reviewer 角色套用新增之 `filterToAssignedReviewUnits()`，其餘角色原樣回傳 `buildAllUnits()`）；`filterToAssignedReviewUnits(units)` 呼叫既有 `getAssignedReviewUnits()`，含仲裁例外（`reviewUnitState(unit) === DISPUTED && isArbiterCandidate(...)`），NUL 分隔鍵鏡射 `annotation-list.html` 的 `filterToAssignedUnits()`；`REVIEW_UNIT_BLOCK`（`:3594`）新增 `NOT_ASSIGNED: 'not_assigned'`；`reviewUnitBlockReason()`（`:3611`）判定序改為 ARBITRATION → FINALIZED → OFF_ROSTER → NOT_ASSIGNED → EMPTY，新增 `isCurrentUnitAssigned()` 重用過濾後的 `buildUnits()`；新增唯讀渲染分支（`ws-review-not-assigned`，鏡射 OFF_ROSTER 分支寫法）與中英文案 `reviewNotAssignedNote`（緊接 `reviewOffRosterNote` 之後）。不得放寬或改寫 1.1 的 Red 契約。 [@senior-frontend]
  - Green 證據：待補。
- [ ] 1.4 執行 code/test gate：在 `design/prototype/` 下以 `PW_PORT=8984` 執行 `pnpm typecheck` 與 `pnpm playwright test`（全量，不得只跑子目錄）。兩者預期 exit `0`，分開記錄。跑完後於本 worktree 內執行 `node scripts/gen-screen-inventory.mjs` 重生盤點並提交（只在最後一次來源編輯之後重生一次）。 [@main]
  - gate 證據：待補。
- [ ] 1.5 更新 `specs/annotation/015-annotation-workspace/spec.md`，完成 gate 4 回寫。 [@main]
  - 版號 MINOR bump（自當下最新版號接續），Changelog 補一列。
  - FR-093 本文加上「本版修訂（issue #921）」段落（逐字保留既有 v5.0.0／issue #815／issue #824／issue #868 全部既有文字，只在其後追加新段落）。
  - delta 中未編號的新情境，於本步驟接續 US4（FR-093 對應使用者故事）現行最大 AC 編號，編成新 AC。
  - 回寫證據：待補。gate 1／gate 2 證據：待補。
- [ ] 1.6 執行 `/opsx:archive gate-review-assignment`（需經使用者明確授權）。產生衍生檢視後，依 `docs/sdd-workflow.md` §6.2 逐條 grep 本 change 寫入的 canonical citation（FR-058、FR-060、FR-093、FR-094、FR-055、FR-056、新 AC、issue #824、issue #868、issue #921 等），確認每一條都能個別定位。final merge 後才更新 `specs/STATUS.md`。 [@main]
  - 證據：待補。
