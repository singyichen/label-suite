# 任務清單：task-detail-lifecycle-roster-keys

> 本 change 只補 014 FR-024、FR-023 的「操作 → 鍵」條文與兩則 AC，屬純規格變更，沒有 Red／Green runtime 證據；正式後端尚未實作，新鍵處於 admin-007 的「已登錄、待啟用」狀態。只有 per-issue lead 依證據更新勾選。

## 1. 規格修訂與驗證

**故事目標**：SC-052 — reviewer 不能編輯或管理成員；矩陣格或 membership 失效後下一請求立即拒絕，生命週期命令與名冊寫入各用自己的鍵。

> 依賴：序列 1.1 → 1.2 → 1.3，沒有平行任務。純文件變更不適用 TDD Red／Green。

- [x] 1.1 撰寫 `openspec/changes/task-detail-lifecycle-roster-keys/specs/task-management/014-task-detail/spec.md`，以 `## MODIFIED Requirements` 收錄 FR-024、FR-023 的完整原文與既有情境，各補 v12.1.0 修訂段與一則不帶 ID 的新情境 [@main]
- [x] 1.2 執行 Gate 1 與 Gate 2，皆預期 exit 0：`openspec validate --changes --no-interactive`、`scripts/check-sdd.sh`、`scripts/speckit-tests.sh`，並在 scratchpad 乾跑 archive [@main]
- [x] 1.3 更新 `specs/task-management/014-task-detail/spec.md` 完成 gate 4 回寫：FR-024、FR-023 各補 v12.1.0 修訂段（原文逐字保留）、新增兩則 AC（編號接續使用者故事 3 現行最大者）、版號 12.0.4 → 12.1.0、Changelog 頂端加一列；不得改寫 Changelog 既有列 [@main]

## Pre-merge finalization（在 /opsx:apply 外，NON-CHECKBOX）

所有 checkbox 完成且 code review 通過後，本 PR 才執行 Source-Verify 與 `/opsx:archive task-detail-lifecycle-roster-keys`。Archive 後依 `docs/sdd-workflow.md` §6.2 逐條 grep 本 change 寫入的 canonical citation（FR-024、FR-023、FR-014b、SC-051、SC-052、`annotation/015-annotation-workspace` FR-104、`task.lifecycle.manage`、`annotation.dispute.adjudicate`、`task.members.manage`、issue #1270），確認每一條都能個別定位。
