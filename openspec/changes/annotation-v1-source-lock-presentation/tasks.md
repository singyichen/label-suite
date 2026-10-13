# 任務清單：annotation-v1-source-lock-presentation

> 本 change 只修訂 015 FR-101／AC-2.27 並新增一則 AC，屬純規格變更，沒有 runtime 證據；原型段由 #1330 承接。只有 per-issue lead 依證據更新勾選。

## 1. 規格修訂與驗證

**故事目標**：SC-015 — 首次審核後標記來源凍結，標記員在鎖定下的呈現與寫入結果一致且不洩漏審核內容。

> 依賴：序列 1.1 → 1.2 → 1.3，沒有平行任務。純文件變更不適用 TDD。

- [x] 1.1 撰寫 `openspec/changes/annotation-v1-source-lock-presentation/specs/annotation/015-annotation-workspace/spec.md`，以 `## MODIFIED Requirements` 收錄 FR-101 的完整原文、AC-2.27 情境與一則不帶 ID 的新情境 [@main]
- [x] 1.2 執行 Gate 1 與 Gate 2，皆預期 exit 0：`openspec validate --changes --no-interactive`、`scripts/check-sdd.sh`、`scripts/speckit-tests.sh` [@main]
- [x] 1.3 更新 `specs/annotation/015-annotation-workspace/spec.md` 完成 gate 4 回寫：FR-101 與 AC-2.27 子句修訂、新增一則 AC（編號接續第 2 章現行最大者 AC-2.29）、版號 12.4.1 → 12.5.0、Changelog 頂端加一列；不得改寫 Changelog 既有列 [@main]

## Pre-merge finalization（在 /opsx:apply 外，NON-CHECKBOX）

所有 checkbox 完成且 code review 通過後，本 PR 才執行 Source-Verify 與 `/opsx:archive annotation-v1-source-lock-presentation`。Archive 後依 `docs/sdd-workflow.md` §6.2 逐條 grep 本 change 寫入的 canonical citation（FR-101、AC-2.27、AC-7.5、FR-051、FR-105、SC-015、issue #1328），確認每一條都能個別定位。
