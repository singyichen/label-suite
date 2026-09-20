---
對應 Spec: specs/annotation/015-annotation-workspace/spec.md
---

## Why

Issue #866。正典 015 FR-055 於 v6.10.0（issue #792，PR #867）把審核單位的列舉收斂為資料層單一函式 `getReviewUnitRows()`（`annotation-workspace.data.js:1671`），其結果為兩個 seed 來源的**聯集**：示範標記員列（FR-044a 第二來源）∪ 本 `run_type` 下具已儲存提交之標記員（FR-044a 第一來源）。該版修訂段逐一列出必須讀同一份結果的消費端：`annotation-list` 清單列、工作區 reviewer 導覽（FR-056）、任務摘要（FR-072）、快速審核候選（FR-073）、審核指派之輸入（FR-093）、定稿卡剩餘量（FR-100）。

**IAA 不在這份名單裡，實作也確實沒改。** `computeIaaAlpha()`（`:3553`）與 `countDistinctRaters()`（`:3624`）都還在逐列跑 `getReviewerMockRows(taskId, sampleId)`（`:1650`），只看示範標記員列這一個 seed 來源。

後果是同一份資料在兩個地方講不同的話：一位「有已儲存提交、但沒有示範列」的標記員——正是 #792 要納入的那種標記員——會出現在審核清單、被指派審核員、計入待審與定稿剩餘量，卻**不計入該任務的 IAA 評分者數與 α 的值集合**。畫面上是 N 位標記員在標同一批樣本，IAA 報表上只有 N−1 位；若該標記員的答案正是分歧來源，α 會被系統性高估。更棘手的是這個落差不會報錯——`countDistinctRaters()` 少數一位時，IAA 可計算性門檻（至少兩位評分者）仍可能通過，畫面照常出數字。

FR-079 已載明 IAA 閘門語意之正典在 `dataset-017`，015 只負責承接與供應輸入。因此本變更改的是「供應給 IAA 的評分者列舉來源」，**不動 α 演算法、不動閘門語意、不動門檻**。

兩個消費端都只需要每列的標記員帳號（`row.annotator`）——答案是它們各自再以 `getSubmission()` 取得的——所以改用 `getReviewUnitRows(taskId, runType, sampleId, [outKey])` 即可，合成列附帶的 `answers` 欄位用不到亦無害。

## What Changes

- **FR-055 修訂**：消費端清單新增 IAA 之評分者列舉（FR-079 所供應之輸入），使 IAA 與審核單位同源；並新增情境覆蓋「有已儲存提交但無示範列之標記員 MUST 計入 IAA 評分者數與值集合」。
- **實作**：`computeIaaAlpha()` 與 `countDistinctRaters()` 改以 `getReviewUnitRows()` 列舉評分者，移除對 `getReviewerMockRows()` 的直接依賴。
- **非目標**：α 的計算公式、IAA 可計算性門檻與閘門語意（正典在 `dataset-017` FR-079）皆不變；示範資料的標記員組成不變。
