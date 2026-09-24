---
對應 Spec: specs/annotation/015-annotation-workspace/spec.md
---

## Why

Issue #907。以 `role=project_leader` 開啟 `annotation-workspace` 時，只有中央面板由 `renderExceptionPoolScreen()` 接管，其餘畫面外殼全部沿用標記員版面——每一處角色分流都只特判 `currentRole === 'reviewer'`，`project_leader` 一律落入 else 分支。實測（`T016` / `ofm-05-final-exception` / `official_run`）畫面同時呈現：整份資料集的五筆標記樣本且每列標籤為「待標記」、頂部「0 / 5 已提交」、底部「尚未儲存」。這三項對專案負責人皆無意義——PL 在本畫面沒有標記工作、沒有提交進度，其儲存與送出鈕早已隱藏，因此自動儲存狀態永遠不會前進。

同一畫面還缺少判斷所需的資訊與風險提示：使該項落入例外池的仲裁理由（`ARBITRATION_OUTCOMES.reject` 之必填理由）完全未呈現，而 `exclude_from_dataset` 與其餘三個採用型處置共用同一個 `mini-btn` 樣式，視覺上無從區辨一個不產出 gold 且無法於本畫面復原的動作。

FR-095 目前只規範四個處置動作與其資料契約，對本畫面的外殼未有任何條文，因此現況並未違反既有條文，需以本 change 補上。

## What Changes

- `FR-095` 新增「最終例外處置畫面外殼」段落，規範 `role=project_leader` 畫面 MUST 使用例外池專屬外殼而非標記員樣本導覽外殼，涵蓋五點：左側待處置佇列、以例外項為單位的標題與計數、隱藏自動儲存狀態、呈現仲裁理由與仲裁者、`exclude_from_dataset` 之危險樣式。
- 原型 `annotation-workspace.config.js` 依上述條文改寫 PL 分流；左側佇列直接消費既有的 `listReviewPoolItems(taskId, runType).pendingExceptions`（issue #891 已建立，`task-detail.html` 已在消費），不新增資料層 API。
- 樣式層新增 `exclude_from_dataset` 的危險樣式 token 用法，沿用設計系統既有的 danger 色階。

## 非目標

- 不改變 `EXCEPTION_POOL_ACTIONS` 的集合、`dry_run` 不提供 `custom_answer` 的分流，或四個處置各自的資料寫入契約（AC-4.56／AC-4.57 維持原狀）。
- 不改變「採用型處置一鍵生效、`custom_answer`／`exclude_from_dataset` 需理由後確認」的既有互動契約；issue #907 預期結果中「底部改為『尚未選擇最終處置』＋『確認處置』」屬互動模型變更，會改寫 AC-4.56／AC-4.57 已驗證的一鍵契約，另案處理。
- 不修改 `backend/**`、`frontend/**` 或 root `e2e/**`。
- 不處理 `buildExceptionPoolItemRow()` 以 `readReviewerSubmissions(...)[0]` 取審核員的取值缺陷（issue #913），該缺陷與畫面外殼無關。

## Capabilities

`annotation` — 最終例外池收尾畫面之角色專屬外殼。

## Constitution Check

| 原則 | 符合方式 |
| --- | --- |
| **II. Generalization-First** | 佇列與計數皆由 `listReviewPoolItems()` 依 `task_id × run_type` 推導，無任務、樣本或帳號硬編 |
| **III. Data Fairness** | 只呈現該爭議項本身既有的標記員值、審核員值與仲裁理由，不新增跨標記員內容揭露 |
| **X. Change Scope Discipline** | 產品變更集中於 `annotation-workspace.config.js` 與其樣式檔兩個檔案 |
| **XX. Source of Truth** | 待處置佇列與 `task-detail.html` 的例外池計數共用同一個 `listReviewPoolItems()`，兩處不可能對「還有幾項待處置」產生分歧 |
