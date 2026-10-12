# 任務清單：annotation-arbitration-review-key

> 本 change 只補 015 FR-104 的仲裁授權條文、規格常數 `TASK_ROLES` 對齊與一則 AC，屬純規格變更，沒有 Red／Green runtime 證據；正式 workspace API 尚未實作。`task-management/014-task-detail` 不在本 change 修改範圍。只有 per-issue lead 依證據更新勾選。

## 1. 規格修訂與驗證

**故事目標**：SC-013 — 正式後端依 active role、membership、格與名冊授權寫入；仲裁寫入沿用審核鍵，不在 `arbiter_ids` 中或已停用 membership 的請求都被拒絕。

> 依賴：本群組序列執行 1.1 → 1.2 → 1.3 → 1.4，沒有平行任務。純文件變更不適用 TDD Red／Green。

- [x] 1.1 撰寫 `openspec/changes/annotation-arbitration-review-key/specs/annotation/015-annotation-workspace/spec.md`，以 `## MODIFIED Requirements` 收錄完整的 FR-104 原文與既有情境，補 v12.3.0 修訂段和一則不帶 ID 的新情境 [@main]
- [x] 1.2 執行 Gate 1 與 Gate 2，皆預期 exit 0 [@main]
  執行 `openspec validate --changes --no-interactive`、`scripts/check-sdd.sh`、`scripts/speckit-tests.sh`
  - Evidence：`openspec validate --changes --no-interactive` 3 passed／0 failed；`scripts/check-sdd.sh` 0 error(s)；`scripts/speckit-tests.sh` passed；scratchpad 乾跑 `openspec archive annotation-arbitration-review-key --yes` 為 `~ 1 modified`。
- [x] 1.3 更新 `specs/annotation/015-annotation-workspace/spec.md` 完成 gate 4 回寫：FR-104 補 v12.3.0 修訂段（原文逐字保留）、規格常數 `TASK_ROLES` 改為三角色並限縮 workspace active role、新增一則 AC（編號接續「run／assignment 身分驗收情境」現行最大者）、版號 12.2.0 → 12.3.0、Changelog 頂端加一列；不得改寫 Changelog 既有列 [@main]
  - Evidence：正典 12.2.0 → 12.3.0；FR-104 補 v12.3.0 修訂段（原文逐字保留）；規格常數 `TASK_ROLES` 改為參照共用常數；新增 AC-7.9；Changelog 頂端補 12.3.0 一列。
- [x] 1.4 更新 `specs/_shared/constants.md`：移除 `TASK_ROLES` 衝突註記與表格中的 ⚠ 標記，版號 1.2.0 → 1.2.1、Changelog 加一列；常數值不變 [@main]
  - Evidence：`specs/_shared/constants.md` 1.2.0 → 1.2.1；移除 `TASK_ROLES` 衝突註記列與 ⚠ 標記（表格保留「目前無」佔位列）；Changelog 補 1.2.1 一列；常數值不變。

## Pre-merge finalization（在 /opsx:apply 外，NON-CHECKBOX）

所有 checkbox 完成且 code review 通過後，本 PR 才執行 Source-Verify 與 `/opsx:archive annotation-arbitration-review-key`。Archive 後依 `docs/sdd-workflow.md` §6.2 逐條 grep 本 change 寫入的 canonical citation（FR-104、FR-060、FR-061、FR-065、FR-093、FR-095、SC-013、AC-7.8、`ARBITER_CANDIDATE_RULE`、`annotation.workspace.review`、issue #1269），確認每一條都能個別定位。
