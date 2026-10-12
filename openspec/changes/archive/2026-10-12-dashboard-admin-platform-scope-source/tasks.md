# 任務清單：dashboard-admin-platform-scope-source

> 本 change 只補 012 FR-008E／FR-008F 的範圍來源條文與一則驗收情境，屬純規格變更，沒有 Red／Green runtime 證據。Prototype 已由 issue #1266 讓 `task-list.html` fail closed，本 change 不改 prototype；正式 `/task-list` API 尚未實作。只有 per-issue lead 依證據更新勾選。

## 1. 規格修訂與驗證

**故事目標**：SC-008A、SC-025 — Super Admin 從「查看全部」與「等待 IAA 確認」進入 `/task-list` 時看到全平台任務，且這個範圍只來自當前 `super_admin` 身分，不來自網址參數。

> 依賴：本群組序列執行 1.1 → 1.2 → 1.3，沒有平行任務。純文件變更不適用 TDD Red／Green。

- [x] 1.1 撰寫 `openspec/changes/dashboard-admin-platform-scope-source/specs/dashboard/012-dashboard/spec.md`，以 `## ADDED Requirements` 收錄 FR-008E、FR-008F 原文與 v2.14.0 修訂段；兩條 FR 尚未進入衍生檢視，因此不得使用 `## MODIFIED` [@main]
- [x] 1.2 執行 Gate 1 與 Gate 2，皆預期 exit 0 [@main]
  執行 `openspec validate --changes --no-interactive`、`scripts/check-sdd.sh`、`scripts/speckit-tests.sh`
  - Evidence：`openspec validate --changes --no-interactive` 3 passed／0 failed；`scripts/check-sdd.sh` 0 error(s)；`scripts/speckit-tests.sh` passed；scratchpad 乾跑 `openspec archive dashboard-admin-platform-scope-source --yes` 為 `+ 2 added`。
- [x] 1.3 更新 `specs/dashboard/012-dashboard/spec.md` 完成 gate 4 回寫：FR-008E／FR-008F 就地補 v2.14.0 修訂段（原文逐字保留）、使用者故事 2 驗收情境新增一項（依檔內慣例不編號）、版號 2.13.0 → 2.14.0、Changelog 頂端加一列；不得改寫 Changelog 既有列 [@main]
  - Evidence：正典 2.13.0 → 2.14.0；FR-008E、FR-008F 各補 v2.14.0 修訂段（原文逐字保留）；使用者故事 2 驗收情境新增第 4 項；Changelog 頂端補 2.14.0 一列。

## Pre-merge finalization（在 /opsx:apply 外，NON-CHECKBOX）

所有 checkbox 完成且 code review 通過後，本 PR 才執行 Source-Verify 與 `/opsx:archive dashboard-admin-platform-scope-source`。Archive 後依 `docs/sdd-workflow.md` §6.2 逐條 grep 本 change 寫入的 canonical citation（FR-008E、FR-008F、FR-009D、SC-008A、SC-025、ADR-037、`task.list.view`、issue #1266、#1269），確認每一條都能個別定位。
