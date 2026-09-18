---
對應 Spec: specs/annotation/015-annotation-workspace/spec.md
---

## Why

GitHub issue #627 第 3 項：審核流程示範任務 T016 的兩個正典樣本 id 仍以 v5.0.0 已廢止的中間狀態詞命名——`ofm-02-approved-interim`（`approved`）與 `ofm-03-modified-interim`（`modified`）。issue #596 把 `REVIEW_UNIT_STATUS` 收斂為 `pending`／`disputed`／`finalized` 之後，這兩個詞在現行模型下不再是任何狀態，但 id 仍逐字出現在種子、樣本清單、fixture、測試與正典條文中，等於讓示範資料持續教一套已經不存在的語彙。

這兩個 id 同時是**種子物件的 map key**（`annotation-workspace.data.js` T016 答案種子）與**資料列欄位**（審核種子列、task-detail 樣本清單、`docs/product/example-data` fixture），彼此以字串相等耦合。只改其中一部分，該筆種子會查無對應答案而整列不渲染——這正是 issue #596 tasks.md 7.4b 已經記錄過的風險，因此改名必須一次到位，不能分批。

範圍上有兩項刻意排除：

- `ofm-04-majority-converged` 不在本變更內。它的種子在一個 `official_run` 審核單位上種了三位審核員，而 `getReviewAssignments()` 的 `official_run` 路徑是逐單位 round-robin、一個單位只會派給一位審核員——這個形狀在現行資料模型下永遠產不出來。改名只會把資料模型違規包裝得更好看，維護者已裁定連同種子形狀一起由 issue #815 處理。
- 正典 015 中該兩個 id 共 9 處命中，但其中 7 處屬於沿革條文——AC-4.32 與 AC-4.37 標明「v5.0.0 取代……本條原文保留為沿革，AC ID 保留不重用」，AC-4.47 已於 v4.59.0 撤銷並加刪除線，另有 Changelog 與 `specs/STATUS.md` 的歷史敘事列。沿革與歷史紀錄一律逐字保留、不得改寫，因此正典側只有 AC-4.31 與 AC-4.36 兩條活條文需要同步。

不走 Lightweight Path 的理由：本變更動到 3 個 production 檔（`annotation-workspace.data.js`、`task-detail.data.js`、`task-detail.html`），超過「≤ 2 個 production code 檔」的門檻。

## What Changes

- `ofm-02-approved-interim` 改名為 `ofm-02-reviewer-accepts-a`：審核員對標記員答案送出「通過」，該審核單位隨即定稿。
- `ofm-03-modified-interim` 改名為 `ofm-03-awaiting-arbitration`：審核員送出「修正」使該單位進入爭議，尚未仲裁。此名同時把它與 `ofm-01-reviewer-corrects-b`（同樣是修正，但已由仲裁採納而定稿）區分開來。
- 修訂 FR-044，新增一條情境，規定示範審核單位的 `sample_id` 不得編碼已自 `REVIEW_UNIT_STATUS` 移除的中間狀態詞，並要求同一 id 的所有出現處必須同批改名。
- 同步改名的消費端：`design/prototype/pages/annotation/annotation-workspace.data.js`（T016 答案種子 map key 與審核種子列）、`design/prototype/pages/task-management/task-detail.data.js`、`design/prototype/pages/task-management/task-detail.html`、`docs/product/example-data/review-flow-official-multi.json`，以及 9 個 Playwright 測試檔。
- 正典 015 回寫時同步 AC-4.31 與 AC-4.36 兩條活條文的引文；AC-4.32、AC-4.36 以外的沿革條文、已撤銷條文、Changelog 舊列與 `specs/STATUS.md` 歷史敘事列一律不動。
- 不改變任何審核狀態機、指派邏輯、顯示文案或 API 契約；不新增或移除任何 FR／AC 編號。
- 不處理 `ofm-04-majority-converged` 的改名或其種子形狀（issue #815）。
- 不處理已離開名冊的審核員看不到過去單位的缺口（issue #824）。

## Capabilities

- `annotation/015-annotation-workspace`：修訂 FR-044，補上示範審核單位 `sample_id` 的命名約束與同批改名要求。
