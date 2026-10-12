# 試標回合揭露前之歷程遮蔽

對應 Spec: specs/annotation/015-annotation-workspace/spec.md

## Why

Issue #1268（Data Fairness，憲章 NON-NEGOTIABLE）。

`run_type = dry_run` 期間，標記員可從工作區右欄 `歷程` 頁籤（`annotation-workspace.config.js` `renderHistoryPanel()`）與 `annotation-list` 之「最後動作」彙總（`annotation-list.html` `buildSampleSummary()`）讀到審核員、仲裁與例外池事件，包含其修正後之 `result_snapshot` 與 `reason`。兩條路徑都經過資料供給層 `getSampleHistory()` 之 `maskHistoryForViewer()`（`annotation-workspace.data.js`），而該函式只濾掉「其他標記員」之事件（FR-090 第 (1) 點），對審核類事件不設任何時點閘門。

FR-096 已規定：進行中之試標回合 MUST NOT 對標記員揭露任何定案結果、他人答案或審核判斷，揭露時點必須嚴格晚於該回合進入 `waiting_iaa_confirmation`。歷程頁籤是同一批審核判斷的第二條讀取路徑，卻沒有套用這道閘門，標記員可在回合進行中看到審核員修正後的答案並回頭對齊，污染同輪 IAA。種子任務 T014 目前即處於 `dry_run_in_progress` 且含審核事件，是現行外洩實例。

維護者裁定（2026-10-12，見 issue #1268）：回合進入 IAA 確認（FR-096 揭露時點）之前，標記員只看得到自己的歷程事件；審核／仲裁／例外池事件（含修正後答案快照）一律隱藏。揭露之後維持 FR-090／FR-096 現行行為。

不走 Lightweight Path：需新增一則可測 AC（揭露前之歷程只含本人事件），屬新增 AC。

分級：MINOR。FR-090 首句「事件列對所有可檢視該樣本者可見」本已受第 (1) 點之標記員例外限縮；本次於第 (1) 點再補一道依 FR-096 揭露時點判定之限縮，未移除或推翻任何 FR／AC。

## What Changes

- **修訂 FR-090 第 (1) 點**：`role=annotator` 於 `run_type=dry_run` 檢視某樣本，而該樣本所屬試標回合尚未依 FR-096 揭露時，歷程輸出 MUST 僅含該標記員本人之事件；審核員、仲裁、例外池等其他角色之事件（含事件列、`result_snapshot` 與 `reason`）MUST NOT 進入其歷程輸出。回合揭露與否之判定 MUST 與 FR-096 試標歷史回饋同一口徑（逐回合判定；無法判定所屬回合之提交於 `dry_run_in_progress` 時 fail closed），且 MUST 於資料供給層完成。揭露後與 `official_run` 維持原規則。
- **新增一則 AC**（gate 4 回寫正典時編號，接續第 4 章現行最大者）：揭露前標記員之歷程只含本人事件；揭露後審核事件照 FR-090 原規則可見。
- **原型實作**：`annotation-workspace.data.js` 之 `maskHistoryForViewer()` 依 FR-096 逐回合揭露口徑加上本條閘門；揭露判定與 `getDryRunFeedback()` 共用單一來源，不得複製第二份。
- **正典回寫**：FR-090 補 v12.2.0 修訂段（原文逐字保留）、新 AC、版號 12.1.3 → 12.2.0、Changelog 一列。

**非目標**：

- 不改 FR-096 本文、AC-1.27／AC-1.28（試標歷史回饋本身之揭露已正確）。
- 不改審核員與仲裁者視角之可見性（FR-090 第 (2)、(3) 點）。
- 不改 `official_run` 之標記員歷程可見性。
- 不改 FR-091 條文：其「最後動作」本已「沿用 FR-090」可見性，遮蔽後之結果自動一致。

## Capabilities

`annotation` — 歷程分層遮蔽之揭露時點閘門。
