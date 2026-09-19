# 設計：annotation-dry-run-feedback-by-round（issue #834）

## Context

試標歷史回饋（FR-096）目前有兩道以**任務狀態**判定的閘門：

- 資料層 `getDryRunFeedback()`（`design/prototype/pages/annotation/annotation-workspace.data.js:1912`）：任務清單狀態不為 `waiting_iaa_confirmation` 即回傳空陣列。
- 呈現層 `renderDryRunFeedback()`（`design/prototype/pages/annotation/annotation-list.html:2153`）：`profile.status !== 'waiting_iaa_confirmation'` 時只渲染 `ws-dry-run-feedback-pending`，根本不呼叫資料層。

提交儲存鍵 `submissionBucketKey()`（`annotation-workspace.data.js:251`）為 `taskId::role::runType::annotatorId::reviewerId`，**沒有回合維度**；`markSampleSubmitted()`（`:366`）寫入之 entry 亦不記錄回合。annotation 頁唯一的回合來源是 `task-detail.data.js` 之 `materializedRuns.dry_run.round`（`annotation-list.html` 與 `annotation-workspace.config.js` 皆已讀取以顯示「試標回合 R{n}」），缺值時預設為 1。

task-detail 另有 `trialRounds` 種子與 `getTrialRounds()`／`publishDryRun()` 記憶體狀態，只存在於 task-detail 頁、不傳播到 annotation 頁。

## Goals / Non-Goals

**Goals**

- 揭露閘門改為逐回合：已結束回合之回饋在下一回合進行中、以及 `official_run` 之後皆可見；進行中回合之資料一律不經資料層回傳。
- 被修改筆數與占比逐回合分列。
- 既有 AC-1.27 之 R1 行為（進行中不揭露、`waiting_iaa_confirmation` 後揭露）不變。

**Non-Goals**

- 不統一 `materializedRuns` 與 `trialRounds` 兩份原型回合來源。
- 不改回饋列內容欄位、不改「僅呈現本人」約束、不改 014。

## Decisions

### D1：提交時標記回合，而非改儲存鍵

dry_run 標記員提交時，`markSampleSubmitted()` 於 entry 上寫入 `trialRound`，值取自任務之 `materializedRuns.dry_run.round`（缺值為 1）。不把回合放進 `submissionBucketKey()`：改鍵會讓所有既有讀取端（清單計數、工作區恢復、審核單位推導）都須跟著帶回合，範圍遠超本單。

正式系統中的歸屬來源應是樣本所屬之試標清單（014 `AnnotationListMaterialization` 之 `trial_round`），而非提交時的任務狀態；原型以提交時戳記近似，因每回合樣本互斥（見本檔 Q6）兩者結果相同。

### D2：可揭露回合集合由任務狀態與目前回合 r 推導

| 任務狀態 | 可揭露回合 |
| --- | --- |
| `draft` | 無 |
| `dry_run_in_progress`（R{r} 進行中） | R1 … R{r−1}；r = 1 時為空，僅顯示待結束說明 |
| `waiting_iaa_confirmation` | R1 … R{r} |
| `official_run_in_progress`／`completed` | R1 … R{r}（全部已結束之試標回合） |

此推導 MUST 只在資料層做一次；呈現層依資料層回傳之回合分組，不得另以任務狀態短路（否則兩道閘門會再度分歧）。

### D3：呈現層逐回合分組

`renderDryRunFeedback()` 依回傳列之 `round` 分組，每組各自顯示 `dryRunFeedbackSummaryTpl`（總筆數、被修改筆數、占比）與逐筆列；若目前有進行中回合，另顯示既有 `ws-dry-run-feedback-pending` 說明。既有 testid 不改名；分組容器之新 testid 由 Red 契約決定。

### D4：無回合標記之提交採 fail closed

未帶 `trialRound` 之 entry（D1 落地前之既有資料或測試種子）：任務處於 `dry_run_in_progress` 時一律視為屬進行中回合而不揭露；處於 `waiting_iaa_confirmation` 以後則歸於目前回合 r。此規則使既有 `issue-596-dry-run-feedback.spec.ts` 與 `issue-754-dry-run-arbitration-feedback.spec.ts` 之種子（無回合標記）維持原判定。

## Risks / Trade-offs

- **R{n} 回饋於 R{n+1} 期間可見是否構成 IAA 污染**：R{n+1} 樣本與 R{n} 互斥，標記員無法以 R{n} 定案結果回填 R{n+1} 的同一樣本；其效果是「依回饋修正對指南的理解」，正是 FR-096 目的，也是 FR-017 修訂紀錄所預期的回合間學習。若維護者認為回合間學習本身會使 R{n+1} 的 IAA 失去可比性，則本變更方向需重議（Q6）。
- **兩份回合來源**：若 task-detail 在原型中建立 R{n+1}，annotation 頁看不到（其 `materializedRuns` 為靜態種子）。原型展示多回合情境須靠種子或測試修補 `materializedRuns`；此為既有限制，非本單引入。
- **D4 之保守性**：無標記提交於 `dry_run_in_progress` 期間一律隱藏，可能少揭露；方向為安全側。

## Constitution Check

| 原則 | 符合方式 |
| --- | --- |
| **II. Generalization-First（NON-NEGOTIABLE）** | D2 僅讀任務狀態與回合數，無任務 ID 或輸出類型分支 |
| **III. Data Fairness（NON-NEGOTIABLE）** | 進行中回合之資料不經資料層回傳（D2）；無法歸屬者 fail closed（D4）；仍僅揭露本人標記 |
| **X. Change Scope Discipline** | 2 個產品檔案，兩個實作群組各一個 Green |
| **XX. Source of Truth & Contract Governance** | 可揭露回合只在資料層推導一次，呈現層不另設第二道狀態閘門 |

## 待裁定問題

- **Q1**：`official_run_in_progress`／`completed` 後，已結束之試標回合回饋是否仍可見？**建議：可見**——正式清單為扣除所有試標回合後之剩餘樣本（`task-management/014-task-detail` FR-010f-3），無可對齊標的。
- **Q2**：無回合標記之提交於進行中是否 fail closed？**建議：是**（D4）。
- **Q3**：被修改筆數與占比逐回合分列或跨回合累計？**建議：逐回合**，依 FR-096 第 1 點「該回合中」。
- **Q4**：版號 MINOR 或 MAJOR？**建議：MINOR（6.6.0 → 6.7.0）**——放寬揭露範圍且新增 AC，未移除既有需求或 AC。
- **Q5**：是否統一 `materializedRuns` 與 `trialRounds` 兩份原型回合來源？**建議：本單不處理**，另開 issue。
- **Q6**：確認回合間揭露屬 FR-096 所欲之「自我對齊」而非 IAA 污染，且各回合樣本互斥（由 `task-management/014-task-detail` FR-010f-3 筆數等式推得，非明文）。**建議：確認**，`task-management/014-task-detail` FR-013 第 (6) 點已採此口徑；若需明文互斥，另於 014 追加釐清。
