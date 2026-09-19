# 任務清單：drop-reviewer-submit-wrapper-event

> **Apply 前硬閘**：先執行 `openspec validate drop-reviewer-submit-wrapper-event --type change` 與 `scripts/check-sdd.sh`，分別回報 OpenSpec schema validation 與 Project SDD lint。兩者都通過才可進入 `/opsx:apply`。維護者已於 2026-09-19 裁定 R1–R3（見 design.md「維護者裁定」），apply 依裁定執行。主 session／team lead 是唯一可以驗證 Red／Green evidence 並更新 checkbox 的角色。

> **單一群組**：本變更有 3 個 prototype 產品檔，其中 2 個只改註解，未超過單一 PR 5 檔上限，所以不拆群組。propose、apply、archive 放在同一個 PR。
>
> **序列前提**：本變更與 issue #792、#824 都會寫正典 015 的 Changelog，三者依 #583 → #792 → #824 的順序執行。動到 `design/prototype/pages/` 後，必須在 rebase 之後、推送之前重生 `design/system/screen-inventory.md`。

---

## 1. PR-583 — 審核員送出不再寫包裝事件，耗時一次作業一份

> **相依與平行性**：嚴格依序 1.1 → 1.2 → … → 1.8，不使用 parallel markers。1.1 與 1.2 的 committed Red 必須先於 1.3。本群組不改 `HISTORY_ACTIONS`、`ACTION_LABEL`、徽章語意色、`collapseHistory()` 與 `totalLeadTime()` 的邏輯。

**故事目標**：SC-004J — 歷程要依時序讀出審核員實際做出的決策，並附上真實的操作者 ID；一筆與標記員提交同名、又不帶答案的包裝事件，會讓「依動作分類」的讀者把審核送出誤認為標記提交，而同一段耗時重複 N+1 次，也會讓 reviewer 讀到的耗時失真。

- [x] 1.1 撰寫 `design/prototype/tests/annotation/issue-583-reviewer-submit-events.spec.ts` 作為 Red 契約，釘住下列事項。型別宣告必須使用 local cast，不得新增第二份 `declare global`（重複宣告會撞 TS2717）。先提交此單檔再跑測試，expected failure 必須是「審核員送出仍寫 `submitted`」或「timing 仍寫在每一筆決策事件」，並保存 command、exit 與失敗訊息。 [@senior-qa]
  - 審核員對多 `outKey` 審核單位送出後，該審核員新寫入的事件數等於 `outKey` 數，`action` 皆屬 `accepted`／`modified`／`bypassed`，且沒有任何 `submitted`。
  - 同一次送出只有第一筆寫入的決策事件帶 `started_at`／`lead_time`；reviewer 視角 `歷程` 頁籤中，該次送出只有一張卡片顯示耗時。
  - 標記員提交仍然恰好寫入一筆帶 `result_snapshot` 與 timing 的 `submitted`。
  - 預先植入一筆舊版審核員包裝 `submitted`（其後緊接同一 `actor_id` 的 `accepted`）時，歷程頁籤照舊折疊它，不擲錯。
  - `annotation-list` 對同一時戳的 `accepted`、`modified` 兩筆事件，「最後動作」的 `data-action` 為後寫入的 `modified`（此條在現況已成立，預期為綠，用途是把 R3 固定成契約）。
- [x] 1.2 同步既有測試中以審核員包裝事件計數或斷言其存在的斷言，只改期望值與篩選條件，不改測試結構。雙擊不重複的測試改為斷言「每個 `outKey` 恰一筆決策事件」，繼續守住雙擊防護。範圍以 probe（見 1.2 附註）為準；issue #856 的 T014–T016 歷程基線筆數若因此位移，也在本項同步。先提交再跑，保存「舊實作下這些斷言失敗」的證據。 [@senior-qa]
  - probe 結果（2026-09-19，基底 `278e4872`，暫時套用 1.3 的 data.js 修改後跑全量 1815 則，跑完即還原）：7 則失敗，全部屬本項同步範圍——`tests/annotation/annotation-review-unit.spec.ts:394`（DUP-02）、`tests/annotation/annotation-reviewer-decision-persistence.spec.ts:83`（CONT-03）、`tests/annotation/annotation-workspace-review-identity.spec.ts:91`／`:103`／`:143`、`tests/cross-role/xrole-canonical-journey.spec.ts:749`（XROLE-12；同檔其後 13 則因 serial 模式未執行，同步後須確認全數執行且通過）、`tests/cross-role/xrole-concurrency.spec.ts:86`（CONC-01）。另有 4 則 flaky 落在 `tests/account/forgot-password.spec.ts:106` 與 `tests/account/reset-password.spec.ts:173` 的 loading lock，與歷程無關、不在本項範圍。issue #856 的歷程基線若在本 change apply 前已進 main，須於 rebase 後重跑 probe 補列。
- [ ] 1.3 Green：修改 `design/prototype/pages/annotation/annotation-workspace.data.js`。`markSampleSubmitted()` 只在沒有 `decisions` 時寫 `submitted`；`appendReviewDecisionEvents()` 只在第一筆有 `action` 的決策事件附上 `timingFields()`；同步修正 `appendHistoryEvent()` 連點防護註解中「Reviewer submit hits this same function」的錯誤敘述。不得放寬或改寫 Red 契約。 [@senior-frontend]
- [ ] 1.4 修改 `design/prototype/pages/shared/annotation-history.js` 的 `collapseHistory()`、`totalLeadTime()` 註解，以及 `design/prototype/pages/annotation/annotation-list.html` 的 `buildSampleSummary()` 註解，把「一次送出寫包裝事件加逐項決策」改寫為本版以前的舊資料形狀；不改任何邏輯。 [@senior-frontend]
- [ ] 1.5 執行 code/test gate：在 `design/prototype/` 下帶本 worktree 專屬 `PW_PORT` 執行 `node ~/.cache/node/corepack/v1/pnpm/12.3.4/bin/pnpm.mjs typecheck` 與 `node ~/.cache/node/corepack/v1/pnpm/12.3.4/bin/pnpm.mjs playwright test`（全量，不得只跑子目錄）。兩者預期 exit `0`，且分開記錄，因為它們是兩道獨立閘門。rebase 後再執行 `node scripts/gen-screen-inventory.mjs` 重生盤點並提交。 [@main]
- [ ] 1.6 更新 `specs/annotation/015-annotation-workspace/spec.md`，完成 gate 4 回寫，內容如下。 [@main]
  - 版號 MINOR bump（6.8.0 → 6.9.0，以當下最新版號接續），Changelog 補一列。
  - FR-086、FR-088、FR-016B、FR-091 補本版修訂段。
  - AC-2.21 中 v4.63.0 的外層 `submitted` 子句改為只適用舊事件。
  - delta 中未編號的新情境，於本步驟接續各章現行最大編號，編成新 AC。
  - 已被取代的條文、條文內記錄舊版的修訂段、Changelog 舊列一律逐字保留。
- [ ] 1.7 另開 issue 追蹤：正典 FR-091「累計耗時為全部事件 `lead_time` 之和」與 issue #606 落地的作業階段去重口徑不一致（proposal.md 非目標）。issue URL 記在此項。 [@main]
- [ ] 1.8 執行 `/opsx:archive drop-reviewer-submit-wrapper-event`。產生衍生檢視後，依 `docs/sdd-workflow.md` §6.2 逐條 grep 本 change 寫入的 canonical citation（FR-016B、FR-086、FR-088、FR-091、AC-1.25、AC-2.15、AC-2.16、AC-2.19、AC-2.21、AC-3.49、新 AC、SC-004J、issue #583／#601／#606 等），確認每一條都能個別定位。archive 指令須經使用者明確授權才執行。final merge 後才更新 `specs/STATUS.md`。 [@main]
