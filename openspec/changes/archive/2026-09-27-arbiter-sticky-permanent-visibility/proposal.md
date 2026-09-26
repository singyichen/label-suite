---
對應 Spec: specs/annotation/015-annotation-workspace/spec.md
---

## Why

Issue #1000。issue #956（PR #999）在 CI 紅燈後為 `filterUnitsToAssigned()`（`design/prototype/pages/annotation/annotation-workspace.config.js:1656`）的仲裁者析取補上一段 sticky 可見性——仲裁者送出仲裁後，其目前開啟中的單位保持在左欄，避免 issue #722 的進度計數器分母倒退。但該 sticky 刻意以 `isCurrentUnit()` 限定範圍（只有「當次仍停留於該單位之檢視」才黏著），主動揭露、未擴大處理一個邊角：仲裁者送出仲裁後**切走再切回**，`isCurrentUnit()` 與 `爭議中` 判定同時不成立，該單位又從左欄消失，進度分母再掉一次（現行正典 AC-4.79 之附註句「該審核員切換至其他單位後是否仍看得到該單位不在本點約束範圍內」即為此邊角的明文記錄）。

本 issue 承接該範圍邊界之產品決策，維護者已於 issue #1000 留言裁定（2026-09-26）：**採方案 A——永久黏著**。理由（已記錄，不需重新論證）：(1) 與 issue #824／PR #869 之審核員前例一致——已審核單位黏住原審核員、離冊審核員維持唯讀可見，仲裁者是同一個可追溯性需求；(2) 現狀之分母跳動會被當成缺陷再報一次，明文化為刻意取捨擋不住重複回報。方案 B（維持現狀）不採用。

**實作範圍偵察（propose 前完成）**：`filterUnitsToAssigned()` 第 2 個析取重用既有 `isArbitrationSubmitted()`（`annotation-workspace.data.js:2975`）判定「本人是否已對該單位送出仲裁票」；該函式的真值只在 `arbState` 之 `votes` 陣列含 `arbiter_id === 呼叫者 reviewerId` 時成立，而該值只在此身分曾實際呼叫 `submitArbitration()` 時才會被寫入——`getDisputeItems()` 本身不因呼叫者身分而改變回傳集合。去掉 `isCurrentUnit()` 限定後，一般審核員（從未對該單位送出仲裁票者）不會因此誤中此析取而看到不該看到的單位；此為程式碼閱讀推論，將於 Red/Green 測試 (d) 一般審核員案例實測覆核。

以 `grep -rl` 從測試內容推導回歸候選集（不用目錄猜）：`ws-sample-item|ws-sample-group|ws-progress-text|buildUnits|getAssignedReviewUnits|isArbiterCandidate|isArbitrationSubmitted`、`arbiter|仲裁`、`annotation-workspace.html` 三組聯集去重後 148 個檔案（`annotation/` 115、`task-management/` 18、`dashboard/` 6、`cross-role/` 4、`shared/` 4、`dataset/` 1）。此聯集是「可能相關」的寬集合；本次改動範圍極窄（只影響「非目前開啟中、非爭議中、且本人曾對其送出仲裁票」的單位是否出現在左欄），與該窄邏輯直接耦合的內容再收斂為 `isArbitrationSubmitted|filterUnitsToAssigned|ofs-03-arbitrated-gold|ofs-03\b` 聯集，得 13 個檔案（含本次 Red 契約與 issue-722 進度計數器契約），本機全跑；寬集合其餘檔案交由 CI 全套把關（比照 #956 tasks.md 1.4 之作法）。

## What Changes

- **修訂 FR-093**：延續 v7.1.0（issue #956）之工作區左欄／導覽指派收斂段落，追加一段本版修訂，明文撤銷該段末句「本點範圍以該審核員仍停留於該單位之當次檢視為限」之範圍限定：仲裁者只要曾對某單位送出仲裁票，該單位即恆常出現在該仲裁者的工作區左欄與導覽，不受是否仍停留於該單位之當次檢視所限；歷史仲裁單位（例如 T015 之 `ofs-03-arbitrated-gold`）因此回到黏著範圍。仍 MUST 沿用既有 `isArbitrationSubmitted()`，MUST NOT 另立第二套「是否已仲裁」判定。
- **新增一則新 AC**（接續正典現行 FR-093 最大 AC-4.x 續編，最終編號於 archive 時依主 session 裁定之合併順序指派）：對應本版修訂，涵蓋（a）送出仲裁後切走再切回仍黏著、（b）歷史上曾被本仲裁者仲裁之單位亦黏著、（c）從未被本人仲裁之已定稿單位仍不在左欄、（d）一般審核員之左欄不受影響。
- **原型實作**（1 個生產檔，`design/prototype/pages/annotation/annotation-workspace.config.js`）：`filterUnitsToAssigned()` 第 2 個析取去掉 `isCurrentUnit(unit) &&` 限定，只留 `isArbitrationSubmitted(...)`；同步更新該析取上方之 issue #956 註解，說明範圍已由「當次檢視」放寬為「曾送出仲裁票即永久黏著」（issue #1000）。不改 `isArbitrationSubmitted()`、`getDisputeItems()`、`getAssignedReviewUnits()` 等既有判定函式本身。
- **既有測試修正**：`issue-956-workspace-left-column-filter.spec.ts`（該函式的契約測試）與 13 個候選檔案中因本次放寬而受影響之斷言，逐一判定「位移」或「前提消失」，不得刪除既有斷言；前提消失者改寫為正確行為之正向斷言，保留為迴歸覆蓋。
- **正典回寫（gate 4）**：015 版號 MINOR bump（新增一則新 AC，未移除任何既有 FR／AC），`specs/STATUS.md` 只動 `annotation-015` 一列。

**非目標**：

- 不改 `isArbitrationSubmitted()`、`getDisputeItems()`、`getAssignedReviewUnits()`、`isArbiterCandidate()` 等既有判定函式本身——本次只放寬 `filterUnitsToAssigned()` 消費既有判定結果的範圍條件。
- 不處理 issue #722 進度計數器語意本身是否應補進正典（issue #1000 內文建議事項，另案追蹤，本次只確保 `issue-722-arbiter-progress-counter.spec.ts` 契約仍成立）。
- 不新增後端權限控管。
- 不採方案 B（維持現狀明文化）或方案 C（分母改源）——維護者已裁定不採用。

## Capabilities

`annotation` — 仲裁者工作區左欄之黏著可見性由「當次檢視」放寬為「曾送出仲裁票即永久黏著」。

## Constitution Check

| 原則 | 符合方式 |
| --- | --- |
| **II. Generalization-First（NON-NEGOTIABLE）** | 放寬條件重用既有 `isArbitrationSubmitted()`，不含任何任務 ID、樣本 ID、帳號分支 |
| **III. Data Fairness（NON-NEGOTIABLE）** | 只放寬「本人曾送出仲裁票」之單位可見範圍，不擴大任何人對測試集答案的存取範圍 |
| **X. Change Scope Discipline** | 1 個生產檔；測試檔與 `openspec/**`／`specs/**` 不計入門檻 |
| **XX. Source of Truth & Contract Governance** | 「是否已仲裁」判定單一來源（`isArbitrationSubmitted()`），未另立第二套 |
