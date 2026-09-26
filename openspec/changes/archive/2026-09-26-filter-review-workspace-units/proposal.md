---
對應 Spec: specs/annotation/015-annotation-workspace/spec.md
---

## Why

Issue #956。維護者於 issue #921 的裁定（2026-09-24）包含兩件事：(1) 未受派審核員以直接網址開啟他人審核單位時唯讀可見、不可送出；(2) **工作區左欄與導覽只列出指派給自己的單位，與清單頁一致**。(1) 已由 #921 落地（v6.17.0）。(2) 在 #921 apply 階段實測發現既有測試語料庫的衝擊面遠超單一 PR 承載範圍與 CLAUDE.md「task 觸及 ≥ 10 檔須升級」門檻，經升級判定移交本 issue（前置為 #921 先合併）。

`design/prototype/pages/annotation/annotation-workspace.config.js` 的 `buildUnits()`（`:1625`）目前列舉該任務**全部**審核單位，不依指派過濾。對照 `design/prototype/pages/annotation/annotation-list.html` 的 `filterToAssignedUnits()`（`:1858`）已正確消費 `getAssignedReviewUnits()`（`annotation-workspace.data.js:2556`），兩頁因此左欄筆數不一致——同一位審核員在清單頁看到的單位數與工作區左欄看到的單位數不同，且工作區的進度分母、翻頁走訪序也一併偏離清單頁。

**前置更新（issue #960）**：本 issue 建立時前置為 #921 先合併，後於 2026-09-25 修正為 #960（reviewer 測試語料改用實際受派身分）→ #921 → #956。#960 已以 9 支堆疊 PR（#961–#969）落地，主 session 已確認 #960、#921 皆已合併進 main，本分支基於含兩者之 `bb79448b`。

**衝擊面重新量測（本次 propose 前完成，取代 issue 內文「約 48 支」之過期估計）**：以 `grep -rl` 從測試內容推導候選集（不用目錄猜測），廣義聯集（`annotation-workspace.html`／`buildUnits|getAssignedReviewUnits|ws-review-unit|reviewer`／`isArbiterCandidate|arbiter`）207 個檔案去重後為 205 個 `*.spec.ts`；主 session 建議之收斂 pattern（`ws-sample-item|ws-sample-group|ws-review-unit|ws-prev-btn|ws-next-btn|buildUnits|getAssignedReviewUnits|isArbiterCandidate`）縮小為 82 個。實跑覆蓋 103 個檔案（廣義集 45 個 + 收斂集扣除重疊之 58 個），並以 `git worktree add --detach <tmp> bb79448b` 建立唯讀基準探測樹比對——基準 0 failed，確認分支上找到的失敗**全部**是本次改動造成的真實回歸，非既有缺陷。

真實影響面：**10 個檔案、17 個已知失敗案例**（另有 2 檔因 `test.describe` serial mode 阻擋同檔後續案例，真實總數需待 Green 階段修正首個斷言後才會完整顯出）：
`annotation-review-flow-demo-workspace.spec.ts`、`annotation-review-status-track.spec.ts`、`annotation-workspace-review-unit-nav.spec.ts`、`annotation-workspace-url-sync.spec.ts`、`issue-309-reviewer-workspace-vocab.spec.ts`、`issue-452-review-progress-subjects.spec.ts`、`issue-455-workspace-unit-grouping.spec.ts`、`issue-557-unit-entry-no-sample-id.spec.ts`、`issue-924-review-history-clear.spec.ts`、`tests/dashboard/dashboard-output-types.spec.ts`。與 issue #970（#960 標記之四支與 FR-093 牴觸、需退場或改寫語意之測試）**零重疊**——#970 處理的是 #921 送出閘門下「同一單位兩個審核員身分互動」之已退場模型，與本 issue 的左欄列舉過濾為不同機制。

大部分正如留言預告，因 #960 落地而自動消失（舊估計 48 支 → 實測 10 支），確認可留在單一 PR 內處理：生產碼預期只改 1 個檔案（`annotation-workspace.config.js` 的 `buildUnits()`），未觸及 `annotation-list.html`／`annotation-workspace.data.js`，即使測試檔數量不少，仍遠低於 CLAUDE.md「5 檔／300 行」（測試檔本就排除於計數）與「≥ 10 檔升級」門檻（後者僅計生產碼），故維持單一 PR，不拆堆疊。

## What Changes

- **修訂 FR-093**：接續 v6.17.0（issue #921）之送出閘門修訂，補一段本版修訂，定義**列舉層**的指派收斂：
  1. 工作區左欄（`ws-sample-item`）與導覽（上一筆／下一筆、送出後自動前進、跳至下一筆待審）MUST 只列舉指派給目前審核員的單位，與 `annotation-list` 之 `filterToAssignedUnits()` 同源收斂。
  2. **仲裁豁免**：具 FR-060 仲裁資格（`isArbiterCandidate()`）且該單位爭議中者，MUST 不受本過濾排除——鏡射 `annotation-list.html` 的 `arbiterEntry` 判定，理由同構：FR-060 之仲裁入口只給非當事人，非當事人不可能同時是該單位的指派審核員。
  3. **推導來源**：MUST 沿用既有 `getAssignedReviewUnits()`，MUST NOT 另立第二套指派判定（DRY）。
  4. **完整宇宙不得因本過濾而縮小**：`getAssignedReviewUnits()`／`getReviewAssignments()` 依位置（round-robin）對其輸入單位列表進行推導，任何既有消費端（如 `isCurrentUnitAssigned()`，issue #921）需要完整、未過濾之單位宇宙時，MUST 透過獨立的列舉來源取得，不得以已過濾後的列舉結果餵入，以避免位置性指派因輸入宇宙縮小而位移。
- **原型實作**（1 個生產檔，`design/prototype/pages/annotation/annotation-workspace.config.js`）：
  - 現行 `buildUnits()` 拆為 `enumerateReviewUnits()`（現行邏輯逐字搬移，完整未過濾列舉，供 `isCurrentUnitAssigned()` 沿用)+ `filterUnitsToAssigned()`（鏡射 `annotation-list.html` 的 `filterToAssignedUnits()`，含仲裁豁免析取,共用 `getAssignedReviewUnits()`)+ `buildUnits()`（reviewer 角色套用過濾,其餘角色原樣回傳完整列舉)。
  - `isCurrentUnitAssigned()` 改讀 `enumerateReviewUnits()`（完整宇宙),不再讀 `buildUnits()`（自本變更起已過濾),避免其內部呼叫之 `getAssignedReviewUnits()` 因輸入宇宙縮小而使位置性指派位移。
- **既有測試修正**：依重新量測結果逐檔處理上列 10 檔、17＋案例,逐一判定「位移」或「前提消失」：
  - 位移：改寫斷言之期望值(如受派單位數、進度分母、群組索引),斷言結構與意圖不變。
  - 前提消失：不刪除既有斷言,改寫為 FR-093 過濾生效後之正確行為的正向斷言(如「未受派單位不出現在左欄」),保留為迴歸覆蓋。
- **正典回寫（gate 4）**：015 版號 MINOR bump（新增 AC,不移除任何既有 FR／AC）,`specs/STATUS.md` 只動 `annotation-015` 一列。

**非目標**：

- 不改 `getAssignedReviewUnits()`／`getReviewAssignments()`／`taskReviewAssignments()` 等指派推導本身——工作區只是消費既有指派結果。
- 不改 `annotation-list.html` 既有過濾邏輯——它已經正確過濾,不受本單影響。
- 不改仲裁者資格判定（FR-060）與 `isArbiterCandidate()`。
- 不處理 issue #970（#960 標記之四支與 FR-093 牴觸之已退場模型測試）——與本 issue 機制不同,零重疊,若量測過程中遇到屬其範圍者不予處理並於 PR body 註明。
- 不新增後端權限控管——與 #921 同理,真正的存取控管屬於後端職責。

## Capabilities

`annotation` — 審核工作區左欄／導覽之單位列舉收斂為指派範圍,與清單頁一致。

## Constitution Check

| 原則 | 符合方式 |
| --- | --- |
| **II. Generalization-First（NON-NEGOTIABLE）** | 過濾直接沿用既有 `getAssignedReviewUnits()` 推導,不含任何任務 ID、樣本 ID、帳號分支 |
| **III. Data Fairness（NON-NEGOTIABLE）** | 過濾只收斂「列舉哪些單位」,不擴大任何人對測試集答案的存取範圍;與 `annotation-list` 既有行為同構 |
| **XV. Role-Based Access Control（NON-NEGOTIABLE）** | 使工作區左欄／導覽與清單頁採同一套指派收斂標準,補齊 #921 已收斂之送出閘門之外的列舉面 |
| **X. Change Scope Discipline** | 1 個生產檔;測試檔（10 檔＋）與 `openspec/**`／`specs/**` 不計入門檻 |
| **XX. Source of Truth & Contract Governance** | 指派事實單一來源（`getAssignedReviewUnits()`）,工作區與清單頁對「列出哪些單位」不再可能給出不同答案 |
