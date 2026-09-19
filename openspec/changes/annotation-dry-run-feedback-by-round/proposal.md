---
對應 Spec: specs/annotation/015-annotation-workspace/spec.md
---

## Why

Issue #834（源自 #791 design.md Q3 之裁定：#791 不動 FR-096，改由本單追蹤）。

FR-096 的揭露時機條文寫於「一個任務只有一個試標回合」的年代，因此把「回合進行中」與「任務狀態為 `dry_run_in_progress`」視為同義，並以「任務轉入 `waiting_iaa_confirmation`」作為唯一開放條件。#791（PR #830）落地後，試標可多回合：R{n} 進入 `waiting_iaa_confirmation` 後，負責人可建立 R{n+1}，任務狀態回到 `dry_run_in_progress`。此時原型的 `getDryRunFeedback()`（`annotation-workspace.data.js:1912`）與 `renderDryRunFeedback()`（`annotation-list.html:2153`）都以**任務狀態**判定，於是：

- R{n} 已結束、其回饋本已對標記員開放；
- R{n+1} 一開始，R{n} 的回饋整個消失，直到 R{n+1} 也結束才重新出現。

這是**過度隱藏**，不是資料洩漏：Data Fairness 要防的是「標記員看到**同一回合**的定案結果後回頭對齊、污染同輪 IAA」。`task-management/014-task-detail` FR-010f-2 要求每回合建立獨立清單、不得重用前一回合已建立的清單資料，FR-010f-3 以「`dataset_total - sum(trial_round.sampling_value)`」之剩餘樣本建立正式清單——此等式唯有各回合樣本互斥時才成立，故 R{n} 回饋揭露的是已封口回合的樣本，對 R{n+1} 與 `official_run` 的作答沒有可對齊的標的。（「互斥」係由等式推得而非條文明文，列為 design.md 待裁定問題 Q6。）反之，FR-096 開宗明義的目的正是讓標記員在「不退回重標」的前提下**自我對齊**——R{n+1} 正是最需要看 R{n} 回饋的時候。

下游 `task-management/014-task-detail`（衍生檢視 FR-013 第 (6) 點）已先寫明「R{n+1} 只能在 R{n} 已進入 `waiting_iaa_confirmation` 之後建立，因此 R{n} 的揭露前提在 R{n+1} 建立前即已成立；R{n+1} 進行中其本身資料仍一律不揭露」，即 014 已採逐回合口徑，015 FR-096 條文與原型實作落後於此。

不走 Lightweight Path：(1) 本變更改寫 Data Fairness NON-NEGOTIABLE 的揭露閘門，屬高風險條文；(2) 衍生檢視 FR-096 之 MUST「本列表 MUST 僅在…任務轉入 `waiting_iaa_confirmation` 之後對標記員開放」須實質改寫，不是措辭釐清；(3) 需新增一則可測行為（R{n+1} 進行中仍可見 R{n} 回饋），即新增 AC；(4) 原型資料層須引入「提交歸屬哪一回合」的概念，目前 `submissionBucketKey()` 無回合維度。

## What Changes

- **修訂 FR-096 揭露時機**：閘門由「任務狀態」改為「回合」——某試標回合之回饋於**該回合**結束（進入 `waiting_iaa_confirmation`）後開放，且此後不因任務建立新回合或進入 `official_run_in_progress` 而收回；**進行中回合**之資料一律不揭露（原條文之 Data Fairness 保證逐字保留其實質）。第 1 點「被修改筆數與占比」明定為逐回合計算。
- **新增一則 AC**（gate 4 回寫正典時編號，接續第 1 章現行最大者）：釘住三件事——R{n+1} 進行中仍可見已結束之 R{n} 回饋、R{n+1} 之資料不揭露、被修改筆數與占比逐回合分列。AC-1.27 逐字保留（其情境為 R1 進行中，新口徑下行為不變）。
- **原型實作**：
  - `annotation-workspace.data.js`：dry_run 標記員提交時記錄所屬回合；`getDryRunFeedback()` 改依回合篩選，回傳列帶 `round` 欄位。
  - `annotation-list.html`：`renderDryRunFeedback()` 不再以任務狀態短路；已結束回合逐回合分組呈現（各自的被修改筆數與占比），進行中回合僅顯示既有待結束說明。
- **正典回寫**：FR-096 條文、新 AC、版號 bump（建議 MINOR 6.6.0 → 6.7.0）與 Changelog 一列。

**非目標**：

- 不改 014（衍生檢視 FR-013 第 (6) 點已是逐回合口徑）。
- 不改回饋列的內容欄位（第 2–4 點：我的答案 → 定案結果、定案來源與具名決策者、理由原文與指南跳轉）與「僅呈現本人」約束。
- 不統一原型中兩份回合來源：annotation 頁讀 `task-detail.data.js` 之 `materializedRuns.dry_run.round`，task-detail 另有 `trialRounds`／`getTrialRounds()` 記憶體狀態、不會傳播到 annotation 頁。此為既有原型限制，本單僅沿用前者，另於回報中列出供維護者決定是否開 issue。
- 不改 dataset-017 之品質指標計算。

## Capabilities

`annotation` — 試標歷史回饋之揭露閘門。
