# 任務清單：reserve-arbiters-from-review-assignment

> **範圍硬閘**：只得修改 `design/prototype/**`、本 change 與正典／治理檔；不得修改 `backend/**`、`frontend/**` 或 root `e2e/**`。Apply 前執行 OpenSpec schema validation 與 Project SDD lint。

## 1. PR-868A — 保留仲裁者並修復可收斂的示範流程

> **相依與平行性**：1.1 → 1.2 → 1.3 → 1.4 嚴格依序。與 companion change `validate-reviewer-arbiter-role-separation` 的提案可同時審查，但 prototype Green 需與其驗證一同落地。

**故事目標**：SC-004S — 被指定的非當事人仲裁者必須能抵達爭議列並完成仲裁；不得再由自動審核指派先把唯一仲裁者變成當事人。

- [x] 1.1 以 `design/prototype/tests/annotation/issue-868-arbitration-reserve.spec.ts` 建立 committed Red：任務 `arbiterIds` 的每一人皆不取得新分派；非仲裁審核員維持平均分派；歷史黏住的仲裁者提交不被改派；仲裁資格改讀 task profile；T014／T016 的 Chen 皆可看到既有爭議列之仲裁入口。記錄 expected failure。 [@senior-qa]
  - Red commit：`7a8752e1`。`PW_PORT=8991 pnpm playwright test tests/annotation/issue-868-arbitration-reserve.spec.ts tests/task-management/issue-868-arbitration-reserve.spec.ts` → exit 1；本檔 4 failed／1 passed。預期失敗為 helper 尚不存在、T014／T016 仲裁入口缺漏；黏住歷史提交案例維持通過，證明本契約未破壞 #824。
- [x] 1.2 Green：於 `annotation-workspace.data.js` 新增並匯出 `taskArbiterRoster()`、`reviewAssignmentRoster()`；接入 `taskReviewAssignments()`、`computeReviewWorkload()` 與 `isArbiterCandidate()`，且不得弱化 1.1。 [@main]
- [x] 1.3 將 review-flow demo marker 升為 v4，重塑 T014／T016 的 reviewer 歸屬，使已提交種子符合保留後的分派落點；同步移除 T015 名冊順序 workaround，不改樣本 ID、答案或仲裁結果。 [@main]
- [x] 1.4 執行 prototype typecheck、issue #868 定向 Playwright、既有 annotation／task-management 相關回歸、demo-data parity、screen inventory check；全部通過後才回寫正典。 [@main]
  - Green evidence：issue #868 定向套件 10 passed；受影響回歸 70 passed；PR review 修正後相關套件 43 passed；`pnpm run typecheck` 通過；最終完整 prototype Playwright 1,866 passed；demo-data parity 回報 `OK: 4 review-flow dataset file(s) in parity`；screen inventory checks 全數通過。
- [x] 1.5 正典 015 MINOR bump，修訂 FR-060／FR-093；delta 中的新情境於 archive 時接續對應使用者故事現行最大 AC 編號，並新增一條可量測成功標準，補 Changelog；archive 後逐條 Source-Verify。 [@main]
  - Apply／archive evidence：正典更新為 v6.15.0，新增 AC-4.62～AC-4.68 與 SC-010，修訂 FR-060／FR-073 並補 FR-093／FR-099 的角色分離交叉約束；Changelog 已記錄 issue #868。change 已 archive 為 `2026-09-23-reserve-arbiters-from-review-assignment`；canonical ID grep 回報 0 missing，Project SDD lint 回報 0 errors。PR review 追加「seed 寫入失敗不得先提交 v4 marker」契約：Red 1 failed（同組 12 passed），Green 後 issue #856／#868 與相關回歸合計 43 passed；只有逐筆驗證 T014～T016 必要 seed 完整後才寫入完成 marker，失敗保留舊 marker 供下次載入重試。
