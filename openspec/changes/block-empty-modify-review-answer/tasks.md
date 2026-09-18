# 任務清單：block-empty-modify-review-answer

> **Apply 前硬閘**：先執行 `openspec validate block-empty-modify-review-answer --type change` 與 `scripts/check-sdd.sh`，分別回報 OpenSpec schema validation 與 Project SDD lint。兩者通過後必須停止，取得使用者明確確認才可進入 Stage 1 `/opsx:apply`。主 session／team lead 是唯一可驗證 Red／Green evidence 與更新 checkbox 的角色。

## 1. PR-818-BLOCK-EMPTY-MODIFY — 空的「修正」不得進入儲存層

> **相依與平行性**：本群組嚴格序列 1.1 → 1.2 → 1.3 → 1.4；不使用 parallel markers。1.1 的 committed Red 必須先於 1.2。本群組只動審核送出驗證，不動仲裁版面（已由 PR #817 處理）、不動決策值語彙（屬 #811）、不動 FR-016A 的理由必填規則。

**故事目標**：SC-004L、SC-004D — 兩種 `run_type` 的送出驗證皆為「每個 outKey 一筆決策」，而三向決策 `通過 / 修正 / 無法判定` 必須在資料層互相可區辨；`修正` 存值正是它與 `無法判定` 的唯一區辨，空的 `修正` 會讓三向退化為二向。

- [x] 1.1 建立 `design/prototype/tests/annotation/issue-818-empty-modify-answer-blocked.spec.ts` 作為 Red 契約，釘住三件事：決策為 `修正` 且理由非空但答案為空時送出中止且該 outKey 被 toast 指名、該筆審核零寫入、決策為 `無法判定` 且答案為空時照常送出成功；型別宣告必須使用 local cast，不得新增第二份 `declare global`（既有宣告在 `annotation-workspace-arbitration` 一案，重複宣告會撞 TS2717）；先提交此單檔，再執行測試，expected failure 必須是空的 `修正` 目前可送出成功，並保存 command、exit 與失敗訊息。（Red `1157bbf7`：`PW_PORT=8931 pnpm playwright test tests/annotation/issue-818-empty-modify-answer-blocked.spec.ts` exit 1，1 failed／1 passed；失敗訊息 `expect(locator('#toast')).toHaveClass(/toast-warning/)` Received `"toast toast-success"`，即空的 `修正` 目前可送出成功；`無法判定` 守門案例照常通過。答案須於決策之前清空，因 AC-3.42 會在答案變動後重置既有決策） [@senior-qa]
- [x] 1.2 Green：修改 `design/prototype/pages/annotation/annotation-workspace.config.js`，於 `reviewRowBlocker()` 的回傳值集合新增第三類阻擋，並補上對應的中英 toast 文案鍵；`pendingReviewOutputKeys()` 與送出防呆必須沿用同一份逐 outKey 判定，不得另建第二份計算，也不得放寬或改寫 Red 契約。（Green `184954b8`：`reviewRowBlocker()` 新增 `'answer'`，僅 `modify` 檢查；toast 依阻擋類別選文案，同類時用專屬文案、混合時退回 `toastSelectDecision`，新增中英 `toastAnswerRequired`。Red 單檔及 #578／#750 相鄰規格 14 passed） [@senior-frontend]
- [x] 1.3 執行 code/test gate：`node ~/.cache/node/corepack/v1/pnpm/12.3.4/bin/pnpm.mjs typecheck` 與 `node ~/.cache/node/corepack/v1/pnpm/12.3.4/bin/pnpm.mjs playwright test`（於 `design/prototype/`，並帶本 worktree 專屬 `PW_PORT`），兩者預期 exit `0`；typecheck 必須與 Playwright 分開記錄，兩者是獨立閘門。（於 Green `184954b8`、`PW_PORT=8931`：`typecheck` exit 0；`playwright test` 全量 exit 0，`1703 passed`） [@main]
- [x] 1.4 更新 `specs/annotation/015-annotation-workspace/spec.md` 完成 gate 4 回寫：FR-083 條文改為三項送出驗證條件與三類阻擋回傳值、新增一則 AC（編號接續第 3 章現行最大者）、版號 bump 與 Changelog 補一列；Changelog 既有列不得改寫，被取代的條文逐字保留為沿革。（正典 015 v6.4.0 → v6.5.0 MINOR：FR-083 末尾追加 v6.5.0 修訂段、新增 AC-3.59、元件表 `ws-review-submit-btn` 列同步、Changelog 新增 6.5.0 列；舊條文與 Changelog 既有列未改寫。SHA 為 rebase 到 #828 合併後 main `5f080421` 之值） [@main]

## Pre-merge finalization（在 /opsx:apply 外，NON-CHECKBOX）

所有 apply checkbox 完成、code review 與使用者確認均通過後，本 PR 才執行 Source-Verify 與 `/opsx:archive block-empty-modify-review-answer`。Archive 產生衍生檢視後，必須依 `docs/sdd-workflow.md` §6.2 逐條 grep 本 change 寫入的 canonical citation（FR-083、新 AC、SC-004L、SC-004D、issue／PR 編號），確認每一條都可被個別定位。final merge 後才更新 `specs/STATUS.md`。
