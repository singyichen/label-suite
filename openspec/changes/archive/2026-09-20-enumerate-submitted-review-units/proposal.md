---
對應 Spec: specs/annotation/015-annotation-workspace/spec.md
---

## Why

Issue #792。審核單位的列舉只看 `REVIEWER_MOCK_ROWS` 示範列，所以一個標記員**真的提交了**、但該樣本剛好沒有示範列的審核單位，審核員可以開啟並審到定稿（AC-3.38 的空單位閘門只擋「無已儲存提交**且**無示範列」），卻不會出現在任何列舉裡：

- FR-072 任務摘要的待審、未定稿、覆蓋率都少算這個單位；
- FR-073 `快速審核` 永遠不會把審核員帶到它；
- FR-100 定稿卡的剩餘量少算它，可能在還有工作時就顯示「已無可處理項目」；
- `annotation-list` reviewer 清單沒有這一列（FR-055），工作區左欄與上下筆導覽也沒有（FR-056）；
- FR-093 指派只餵入示範列單位，所以這個單位沒有被指派給任何人。

正典並沒有把列舉範圍限定為示範列。v6.3.1（issue #784）的釐清寫的是「FR-044a 兩個 seed 來源（已儲存提交、示範標記員答案）**皆缺**之單位不在列舉範圍內」，並在 Changelog 明記「本版刻意不將列舉範圍定義為示範列，反方向缺口另由 issue #792 追蹤」。依條文，已儲存提交本身就足以讓單位進入列舉；是實作只列舉了示範列。

現況有三份各自獨立的列舉：`annotation-workspace.data.js` 的 `listReviewUnits()`、`annotation-list.html` 的 `buildAllReviewUnitRows()`、`annotation-workspace.config.js` 的 `buildUnits()`。三者都只走示範列，其中兩份還各自寫了「與另一頁同源」的註解，實際上靠的是三處寫法碰巧相同。本單把列舉收斂成資料層的一個函式，三處都讀它。

示範資料中，T015 的 `ofs-05-not-submitted` 刻意不種示範列，是 AC-3.38 空單位閘門的展示點。標記員（T015 的預設標記員 `kioleemg12`）一旦實際提交這筆，就會落入上述缺口。

## What Changes

- **修訂 FR-055**：補一段本版修訂，定義審核單位的列舉來源為「該樣本的示範標記員列」與「該樣本在本 `run_type` 下具已儲存提交之標記員」的聯集，由資料層單一函式提供；清單列、工作區左欄與導覽、FR-072 摘要、FR-073 候選、FR-093 指派的輸入、FR-100 剩餘量都讀這一份結果。兩個 seed 來源皆缺之單位仍不在列舉範圍內（v6.3.1 不變量不變）。新增一個情境：已提交但無示範列之單位出現在清單、摘要與快速審核候選中。
- **原型實作**（3 個產品檔）：
  - `design/prototype/pages/annotation/annotation-workspace.data.js`：新增 `getReviewUnitRows(taskId, runType, sampleId, outKeys)`，回傳示範列，再接上「有已儲存提交、但不在示範列中」的標記員列（形狀與示範列相同：`{ annotator, answers, bypass }`，答案經 `convertSubmissionAnswer()` 轉換）。`listReviewUnits()` 改讀它。
  - `design/prototype/pages/annotation/annotation-list.html`：`buildAllReviewUnitRows()` 改讀 `getReviewUnitRows()`。
  - `design/prototype/pages/annotation/annotation-workspace.config.js`：`buildUnits()` 改讀 `getReviewUnitRows()`。
- **正典回寫（gate 4）**：015 版號 MINOR bump（6.9.0 → 6.10.0，以當下最新版號接續）並補一列 Changelog；FR-072 第 1 點、FR-073 第 1 點、FR-056 補本版修訂段；delta 中未編號的新情境於回寫時接續使用者故事 1 現行最大編號，編成新 AC。

**非目標**：

- **不改 FR-093 的指派演算法**。新單位進入列舉後，`official_run` 的位置性分派會讓排序在它之後的單位換手。這正是 issue #824（指派零持久化）要處理的問題，維護者已裁定「已審單位黏住原審核員」，依 015 序列 #583 → #792 → #824 於本單之後處理。
- **不改 IAA 的評分者列舉**。`computeIaaAlpha()` 與 `countDistinctRaters()` 也只走示範列，但它們屬 012 FR-023 的 IAA 計算，與審核單位列舉是不同的需求；本單另開 issue 追蹤，不在本 change 處理。
- **不改清單答案欄對「示範列標記員已實際提交」時的呈現**。現況答案欄顯示示範列的答案；本單只為**不在示範列中**的標記員補上以其提交轉換而得的答案，不改既有示範列的顯示。
- **不改 `demoAnnotatorRow()`**（FR-044a 的示範列遞補）與 AC-3.38 空單位閘門的判定。
- 不改任何種子資料；T015 `ofs-05-not-submitted` 維持不種示範列。

## Capabilities

`annotation` — 審核單位的列舉來源。

## Constitution Check

| 原則 | 符合方式 |
| --- | --- |
| **II. Generalization-First（NON-NEGOTIABLE）** | 以 bucket key 前綴泛掃已儲存提交，不含任何任務 ID、樣本 ID 或輸出類型分支 |
| **III. Data Fairness（NON-NEGOTIABLE）** | 只讓審核員看到本來就能開啟審核的標記員提交；不揭露任何 gold 欄位或他人草稿（`getSubmission()` 只回傳已提交者） |
| **X. Change Scope Discipline** | 3 個產品檔；測試檔不計入門檻 |
| **XX. Source of Truth & Contract Governance** | 三份各自維護的列舉收斂為資料層單一函式 |
