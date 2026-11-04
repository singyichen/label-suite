# 任務清單：task-detail-fr014f-tab-ownership

> 本 change 只修訂 014 的條文與常數，屬純規格變更，沒有可執行契約變動，因此不適用 TDD Red／Green。證據：全 repo 搜尋 `TASK_TABS` 僅出現在規格與一則測試註解（`design/prototype/tests/task-management/task-detail-cross-tab-source.spec.ts` 第 7 行），沒有程式或測試斷言分頁清單長度；舊的五區塊清單沒有任何 AC 引用。只有 per-issue lead 依證據更新勾選。

## 1. 規格修訂與驗證

**故事目標**：SC-013、SC-050 — FR-014f、`TASK_TABS`、FR-010u 與 FR-003／FR-026／FR-027 的六分頁結構一致。

> 依賴：序列 1.1 → 1.2 → 1.3，沒有平行任務。

- [x] 1.1 撰寫 `openspec/changes/task-detail-fr014f-tab-ownership/specs/task-management/014-task-detail/spec.md`：`## ADDED Requirements` 收錄 FR-014f 修訂後的區塊歸屬，`## MODIFIED Requirements` 收錄 FR-003（補 `TASK_TABS` 一致句）與 FR-010u（改分頁字樣）的完整原文與既有情境 [@main]
- [x] 1.2 執行 Gate 1 與 Gate 2，皆預期 exit 0：`openspec validate --changes --no-interactive`、`scripts/check-sdd.sh`、`scripts/speckit-tests.sh`，並在 scratchpad 乾跑 archive [@main]
- [x] 1.3 更新 `specs/task-management/014-task-detail/spec.md` 完成 gate 4 回寫：FR-014f 補 v12.2.0 修訂段（原文逐字保留）、`TASK_TABS` 補 `settings`、FR-003 補一致句、FR-010u 改字樣、Prototype Traceability overview 頁面列、版號 12.1.0 → 12.2.0、Changelog 頂端加一列；不得改寫 Changelog 既有列 [@main]

## Pre-merge finalization（在 /opsx:apply 外，NON-CHECKBOX）

所有 checkbox 完成且 code review 通過後，本 PR 才執行 Source-Verify 與 `/opsx:archive task-detail-fr014f-tab-ownership`。Archive 後依 `docs/sdd-workflow.md` §6.2 逐條 grep 本 change 寫入的 canonical citation（FR-014f、FR-014f-1、FR-003、FR-010u、FR-026、FR-027、SC-013、`TASK_TABS`、issue #1305、issue #1243），確認每一條都能個別定位。
