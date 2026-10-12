# 任務清單：admin-demotion-revokes-admin-access

> 本 change 只補 006 FR-002 的降級時點條文與一則 AC，屬純規格變更，沒有 Red／Green runtime 證據；`/user-management` 的 API 與授權 middleware 尚未實作，後續 runtime 切片另立任務。只有 per-issue lead 依證據更新勾選。

## 1. 規格修訂與驗證

**故事目標**：SC-015 — 當前 `super_admin` 通過對應矩陣格後才可讀寫帳號；降級後下一個請求即依當前 DB `role` 拒絕，不因舊 token 延續管理權。

> 依賴：本群組序列執行 1.1 → 1.2 → 1.3，沒有平行任務。純文件變更不適用 TDD Red／Green。

- [x] 1.1 撰寫 `openspec/changes/admin-demotion-revokes-admin-access/specs/admin/006-user-management/spec.md`，以 `## MODIFIED Requirements` 收錄完整的 FR-002 原文與既有情境，補 v1.4.0 修訂段和一則不帶 ID 的新情境 [@main]
- [x] 1.2 執行 Gate 1 與 Gate 2，皆預期 exit 0 [@main]
  執行 `openspec validate --changes --no-interactive`、`scripts/check-sdd.sh`、`scripts/speckit-tests.sh`
  - Evidence：`openspec validate --changes --no-interactive` 3 passed／0 failed；`scripts/check-sdd.sh` 0 error(s)；`scripts/speckit-tests.sh` passed；scratchpad 乾跑 `openspec archive admin-demotion-revokes-admin-access --yes` 為 `~ 1 modified`。
- [x] 1.3 更新 `specs/admin/006-user-management/spec.md` 完成 gate 4 回寫：FR-002 補 v1.4.0 修訂段（原文逐字保留）、新增一則 AC（編號接續「帳號生命週期驗收條件」現行最大者）、版號 1.3.1 → 1.4.0、Changelog 頂端加一列；不得改寫 Changelog 既有列 [@main]
  - Evidence：正典 1.3.1 → 1.4.0；FR-002 末尾補 v1.4.0 修訂段（原文逐字保留）；新增 AC-1.3；Changelog 頂端補 1.4.0 一列。

## Pre-merge finalization（在 /opsx:apply 外，NON-CHECKBOX）

所有 checkbox 完成且 code review 通過後，本 PR 才執行 Source-Verify 與 `/opsx:archive admin-demotion-revokes-admin-access`。Archive 後依 `docs/sdd-workflow.md` §6.2 逐條 grep 本 change 寫入的 canonical citation（FR-002、FR-009、SC-015、AC-1.2、`account/020-auth-session-security` FR-002、ADR-037、issue #1269），確認每一條都能個別定位。
