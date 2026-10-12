# 任務清單：annotation-exception-resolve-key

> 本 change 只補 015 FR-095 處置動作對應的權限鍵與一則 AC，屬純規格變更，沒有 Red／Green runtime 證據；正式後端尚未實作，`annotation.exception.resolve` 處於 admin-007 的「已登錄、待啟用」狀態。只有 per-issue lead 依證據更新勾選。

## 1. 規格修訂與驗證

**故事目標**：SC-013 — 停用 membership、撤銷矩陣格、跨任務或偽造 URL 身分的下一次請求都被拒絕；例外池處置用專用鍵，處置者身分取自受驗證帳號。

> 依賴：序列 1.1 → 1.2 → 1.3，沒有平行任務。純文件變更不適用 TDD Red／Green。

- [x] 1.1 撰寫 `openspec/changes/annotation-exception-resolve-key/specs/annotation/015-annotation-workspace/spec.md`，以 `## MODIFIED Requirements` 收錄 FR-095 的完整原文與既有情境，補 v12.4.0 修訂段與一則不帶 ID 的新情境 [@main]
- [x] 1.2 執行 Gate 1 與 Gate 2，皆預期 exit 0：`openspec validate --changes --no-interactive`、`scripts/check-sdd.sh`、`scripts/speckit-tests.sh`，並在 scratchpad 乾跑 archive [@main]
- [x] 1.3 更新 `specs/annotation/015-annotation-workspace/spec.md` 完成 gate 4 回寫：FR-095 補 v12.4.0 修訂段（原文逐字保留）、新增一則 AC（編號接續第 4 章現行最大者 AC-4.84）、版號 12.3.0 → 12.4.0、Changelog 頂端加一列；不得改寫 Changelog 既有列 [@main]

## Pre-merge finalization（在 /opsx:apply 外，NON-CHECKBOX）

所有 checkbox 完成且 code review 通過後，本 PR 才執行 Source-Verify 與 `/opsx:archive annotation-exception-resolve-key`。Archive 後依 `docs/sdd-workflow.md` §6.2 逐條 grep 本 change 寫入的 canonical citation（FR-095、SC-013、AC-4.84、`annotation.exception.resolve`、`admin/007-role-settings`、issue #1270），確認每一條都能個別定位。
