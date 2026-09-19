---
對應 Spec: specs/annotation/015-annotation-workspace/spec.md
---

## Why

Issue #583。FR-086 把 `submitted` 定義為「標記員提交」，但 `annotation-workspace.data.js` 的 `markSampleSubmitted()` 不分角色，一律先寫一筆 `submitted`。審核員送出時，順序是先寫這筆**外層包裝事件**，再由 `appendReviewDecisionEvents()` 對每個 `outKey` 各寫一筆 `accepted`／`modified`／`bypassed`。

這造成三個問題：

1. **同一個 action 值承載兩件事**。任何依 `action` 分類的消費端都得再看 `role` 才能分辨是誰提交。這違反 FR-086 把 `action` 收斂為封閉集合的本意，而且現行實作本來就不符合 FR-086 條文。
2. **歷程面板出現空殼卡片**。包裝事件依設計不帶 `result_snapshot`，因為答案由決策事件承載。v4.63.0（issue #601）只好在呈現層加一條折疊規則，並附三項邊界，把它藏起來。資料層的多餘事件還在，呈現層的規則愈疊愈多。
3. **耗時重複寫入**（正典 v4.63.0 Changelog 記錄的已知缺陷：「外層事件與各決策事件掛同一份 `payload.timing`……另案處理」）。一次審核送出，同一份 `started_at`／`lead_time` 會寫 N+1 次（N 為 `outKey` 數）。reviewer 視角的歷程卡片因此把同一段耗時顯示 N+1 次。issue #606 在 `annotation-list` 的累計耗時改用「同一 `actor_id` × `started_at` 視為同一作業階段」去重，才擋下 FR-091 的 N 倍膨脹；但資料本身仍然是重複的。

issue #583 提出兩個方向：(1) 審核員送出不再寫包裝事件；(2) 另立 `review_submitted`。本提案採 (1)，理由：

- 包裝事件對審核情境沒有資訊量。「審核員送出了」這件事，已經由同一時刻的決策事件完整表達。
- 審核員每次送出都一定會產生至少一筆決策事件，因為 `handleReviewSubmit` 會為所有已選輸出類型寫入決策（`annotation-workspace.config.js`）。v4.63.0 折疊規則的邊界 (2)「送出未產生任何 `accepted`／`modified`」原本是為退回機制寫的，而退回機制已在 v5.0.0 移除，所以包裝事件不存在「唯一痕跡」的角色。
- 方向 (2) 會讓集合從九值增為十值，還要新增徽章語意色與顯示標籤，而新值的資訊量與方向 (1) 刪掉的完全相同。

**維護者裁定（2026-09-19，本單依此為準）**：

- **R1** 採方向 (1)：移除審核員包裝 `submitted` 事件。
- **R2** 耗時只掛在該次送出的**第一筆**決策事件；同一次送出的其餘決策事件不帶 `started_at`／`lead_time`。
- **R3** FR-091「最後動作」遇到一次送出寫入多筆決策事件、時戳相同的情況時，取**最後寫入**的一筆（以 append 順序為準）。

**不走 Lightweight Path**：FR-088 的「每筆事件 MUST 承載」要改寫成「每次作業 MUST 恰承載一份」，這屬於改變既有 MUST 的語意，不是純釐清；FR-016B 的折疊規則要降為只適用舊資料；FR-091 要新增 tie-break 規則。

## What Changes

- **修訂 FR-086**：明文規定審核員送出 MUST NOT 寫入 `submitted`，`submitted` 只由標記員提交產生；審核員送出的產生點只有逐 `outKey` 的決策事件。集合九值不變，徽章對照表不變。AC-2.21 補一個情境：審核員送出後，該審核員的新事件中不含 `submitted`。
- **修訂 FR-088**：`started_at`／`lead_time` 由「每筆事件 MUST 承載」改為「每次作業 MUST 恰寫入一份」。一次審核送出只由第一筆決策事件承載，其餘決策事件不得重複寫入。
- **修訂 FR-016B**：補一段說明，v4.63.0 的折疊規則只用於本版以前寫入的舊包裝事件。事件維持 append-only，舊事件不刪除、不改寫，呈現層繼續折疊。
- **修訂 FR-091**：「最後動作」「最後活動時間」遇到同時戳事件時，以同一紀錄內最後寫入者為準。
- **原型實作**（1 個產品檔改邏輯，另 2 檔只修註解）：`design/prototype/pages/annotation/annotation-workspace.data.js`
  - `markSampleSubmitted()` 只在標記員提交時寫 `submitted`。
  - `appendReviewDecisionEvents()` 只把 timing 掛在第一筆決策事件。
  - `appendHistoryEvent()` 的連點防護註解同步修正：該防護原本就只比對連續的 `submitted`，對審核員無效；審核員送出的防重由 UI busy flag 負責。
  - `shared/annotation-history.js`（`collapseHistory()`、`totalLeadTime()`）與 `annotation-list.html`（`buildSampleSummary()`）的註解都把包裝事件寫成現況，改為標明那是本版以前的舊資料；這兩檔不改邏輯。FR-091 的 R3 tie-break 在現況已經成立（`getSampleHistory()` 升冪穩定排序，`buildSampleSummary()` 取最後一個元素），本單把它寫成條文並用測試固定下來。
- **測試同步**（senior-qa，Red 階段）：既有測試中凡是斷言審核員 `submitted` 事件存在、或以它計數者，改為斷言決策事件的筆數與內容；這包括 issue #856 的 T014–T016 歷程基線筆數。
- **正典回寫（gate 4）**：015 版號 MINOR bump（6.8.0 → 6.9.0，以當下最新版號接續）並補一列 Changelog；AC-2.21 正典版的 v4.63.0 折疊子句改寫為只適用舊資料。

**非目標**：

- **不改 `collapseHistory()` 的邏輯**（`shared/annotation-history.js`）。它仍須折疊本版以前寫入的舊包裝事件（append-only，舊事件不會消失）。
- **不改 `totalLeadTime()` 的邏輯**（issue #606 的作業階段去重）。舊資料仍有重複的 timing；另外，同一作業階段內先存草稿再送出，兩筆事件也共用 `started_at`，仍需要去重。正典 FR-091 寫的是「全部事件 `lead_time` 之和」，和 #606 落地的去重口徑有落差；這個落差另開 issue 處理，本單不改累計耗時的條文。
- **不改 `appendHistoryEvent()` 的連點防護邏輯**，只修正它的註解。
- **跨紀錄的同時戳排序**：`getSampleHistory()` 先把多個 bucket 串接再做穩定排序，所以跨 bucket 的同時戳事件依 bucket key 順序排列。R3 只保證同一紀錄內的順序；跨紀錄同毫秒寫入在單人單分頁操作下不會發生。
- **`task-management/014-task-detail` FR-015d-4 不受影響**：task-detail 仲裁歷程讀的是靜態種子 `annotation.reviews`，不讀工作區的提交歷程（`task-detail.html` 只從工作區資料層取 `IAA_NOMINAL_OUTPUT_TYPES` 與 `computeIaaAlpha`）。
- 不回填、不刪除任何既存 `localStorage` 事件；不改 `HISTORY_ACTIONS` 集合、`ACTION_LABEL` 或徽章語意色。

## Capabilities

`annotation` — 歷程事件的產生點與耗時承載。

## Constitution Check

| 原則 | 符合方式 |
| --- | --- |
| **II. Generalization-First（NON-NEGOTIABLE）** | 產生規則只依 `role` 與決策，不含任何任務 ID、輸出類型或 `run_type` 分支 |
| **III. Data Fairness（NON-NEGOTIABLE）** | 不改任何揭露時機或可見範圍；FR-088 的 annotator 不可見耗時規則不變 |
| **X. Change Scope Discipline** | 3 個產品檔（其中 2 檔只修註解）；耦合測試同步屬測試檔，不計入門檻 |
| **XX. Source of Truth & Contract Governance** | 讓實作回到 FR-086 既有定義（`submitted`＝標記員提交），並消除同一份 timing 的 N+1 份副本 |
