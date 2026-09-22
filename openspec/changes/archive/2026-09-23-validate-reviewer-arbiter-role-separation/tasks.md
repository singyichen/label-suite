# 任務清單：validate-reviewer-arbiter-role-separation

> **範圍硬閘**：只得修改 `design/prototype/**`、本 change 與正典／治理檔；不得修改 `backend/**`、`frontend/**` 或 root `e2e/**`。

## 1. PR-868B — 阻擋零審核分派池

> **相依與平行性**：1.1 → 1.2 → 1.3 嚴格依序。此 change 與 `reserve-arbiters-from-review-assignment` 為同一產品決策的 companion，須同批 archive。

**故事目標**：SC-033 — PL 儲存的審核設定必須立刻可供系統產生審核指派，不能接受只有保留仲裁者、沒有實際審核分派對象的組合。

- [x] 1.1 以 `design/prototype/tests/task-management/issue-868-arbitration-reserve.spec.ts` 建立 committed Red：所有 reviewer 皆勾為 arbiter 時儲存被阻擋且顯示可修正雙語訊息；至少保留一位非 arbiter reviewer 時儲存成功；`arbiter_ids = []` 仍可儲存。記錄 expected failure。 [@senior-qa]
  - Red commit：`7a8752e1`。同一指令 → 本檔 3 failed／2 passed；預期失敗為中英文零分派池儲存未阻擋與 helper text 尚未揭露保留語意，合法角色分離與空仲裁名冊兩例維持通過。
- [x] 1.2 Green：修改 `task-detail.html` 的 `validateReviewData()` 與審核設定 helper text／i18n；不得改其他 task-detail 行為。 [@main]
- [x] 1.3 與 annotation companion change 一起執行 prototype typecheck、定向 Playwright 與相關回歸；完成後正典 014 MINOR bump，修訂 FR-010s-1；delta 中的新情境於 archive 時接續使用者故事 3 現行最大 AC 編號，並新增一條可量測成功標準，補 Changelog並逐條 Source-Verify。 [@main]
  - Apply／archive evidence：issue #868 定向套件 10 passed、受影響回歸 70 passed、完整 prototype Playwright 1,864 passed、`pnpm run typecheck` 通過；正典更新為 v4.2.0，新增 AC-3.21～AC-3.24 與 SC-048，修訂 FR-010s-1／FR-010t 並補 Changelog。change 已 archive 為 `2026-09-23-validate-reviewer-arbiter-role-separation`；canonical ID grep 回報 0 missing，Project SDD lint 回報 0 errors。PR review 追加 3 個 Red failure（中英文錯誤缺 live alert、成員異動後仍可發布）；Green 後錯誤以 assertive live alert 呈現，且發布時依當下成員狀態重算啟用中的 `reviewer_ids - arbiter_ids`。issue #856／#868 與相關回歸合計 43 passed。
