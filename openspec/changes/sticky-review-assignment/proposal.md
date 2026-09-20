---
對應 Spec: specs/annotation/015-annotation-workspace/spec.md
---

## Why

Issue #824。審核指派是**純推導、零持久化**的：`getReviewAssignments()`（`annotation-workspace.data.js:2209`）把單位排序後，`official_run` 取 `roster[index % roster.length]`、`dry_run` 取 `sampleOrder.length % roster.length`，兩條路徑都拿**當下名冊長度**當模數。於是：

- **名冊一動，全部重算**。專案負責人在 014 的 Overview 取消勾選或加入一位審核員（`reviewer_ids`，`task-management/014-task-detail` FR-010s-1），模數就變了，**每一個**單位的 `reviewer_id` 重新落點——包含已經被審過、甚至已定稿的單位。審核員隔天回來看到的是另一批工作，而昨天審過的那些單位已經掛在別人名下。
- **單位集合一動，也會重算**。指派是位置性的，任何讓單位集合改變的事件（例如 issue #792 讓「已提交但無示範列」的單位進入列舉）都會使排序在新單位之後的單位換手。#792 已明文把這個位移記為本單的範圍。
- **離冊的審核員完全看不到自己審過的東西**。`getAssignedReviewUnits()`（`:2261`）先由 `profile.reviewerIds` 取名冊、再以 `reviewer_id === reviewerId` 過濾；一旦該審核員不在名冊中，其 id 不可能出現在任何指派裡，回傳恆為空集合。清單（FR-055 經 `filterToAssignedUnits()`）與工作區左欄（FR-056）都不再有那些單位，但其提交與歷程仍在 storage 裡，FR-097 的責任鏈指向一位在畫面上已不存在的人。

正典其他兩處對「成員異動」的規則都與現況相反，FR-093 是唯一的例外：

- `task-management/014-task-detail` **FR-005j**：移除或停用仍有待審負荷的審核員時，其 `pending` 退回未指派池由系統重新分派，**`done` 保留為歷史統計**；
- 同規格 `task-management/014-task-detail` **FR-010f-4**（標記員側）：**發布後的成員異動不得自動重算既有 assignment**。

資料層其實已經照這個方向寫了一半：`computeReviewWorkload()`（`:2878`）刻意傳入**已儲存的** `reviewer_ids` 而非在職名冊，註解寫明「their units are still attributed to them first and then split by liveness」。但它算負荷用的指派來自同一個會整批重算的 `getReviewAssignments()`，所以「先歸屬、再依在職狀態分桶」這個意圖在上游就已經被沖掉。

維護者裁定：**有任一審核提交就黏住**（該單位的 `reviewer_id` 恆為該提交者，含爭議中與被仲裁推翻者），**離冊審核員對其審過的單位唯讀可見**。

## What Changes

- **修訂 FR-093**：補一段本版修訂，定義三件事。
  1. **指派黏住**：一個審核單位一旦存在任一**已儲存的審核提交**，其指派審核員 MUST 恆為該提交者，MUST NOT 因名冊異動或單位集合異動而改派；單位狀態為 `爭議中`（含仲裁推翻其判定者）或 `已定稿` 皆不例外。
  2. **平均分配的適用範圍收斂**：原「任兩位審核員的分派筆數差距 MUST NOT 超過 1」改為只約束**尚無已提交審核**之單位所構成的待分配池；已黏住之單位不參與該次分配，亦不計入差距判定（比照 014 FR-005j「`done` 保留為歷史統計」）。`dry_run` 的 per_sample 粒度不變：同一樣本內任一單位黏住，該樣本的全部單位 MUST 隨之黏住同一位審核員。
  3. **離冊審核員之唯讀可見**：已不在 `reviewer_ids` 名冊中的審核員，對其持有已提交審核之單位 MUST 維持可見——清單列與工作區左欄 MUST 仍列出該單位，歷程 MUST 仍可開啟；但 MUST NOT 再提交任何審核決策（送出控件不得渲染）。其仲裁者資格不受本條影響，仍依 FR-060 判定。
- **原型實作**（2 個產品檔）：
  - `design/prototype/pages/annotation/annotation-workspace.data.js`：新增黏住查表與帶任務脈絡的指派入口，`getAssignedReviewUnits()` 與 `computeReviewWorkload()` 改讀它（見 design.md D1–D3）。
  - `design/prototype/pages/annotation/annotation-workspace.config.js`：新增 `REVIEW_UNIT_BLOCK.OFF_ROSTER` 唯讀閘門與其文案（見 design.md D4）。
- **示範種子歸屬修正**（同 `annotation-workspace.data.js`，另加 `design/prototype/pages/task-management/task-detail.data.js`）：`seedReviewFlowDemo()` 的 `scripts` 表原本把**每一筆** `rev` 都掛給 `reviewer_wang`，包含 FR-093 位置式分派實際派給 li／chen／lin 的單位。純推導時這個矛盾看不出來（指派本來就不查提交歷程），但黏住之後 wang 會獨吞全部已審單位、其餘三位審核員歸零。本單把每筆 `rev`／`modifyBy`／`bypassBy` 改成該單位在位置式分派下的實際落點。連帶：T015 的 `reviewerIds` 改序為 `['reviewer_wang', 'reviewer_li', 'reviewer_lin', 'reviewer_chen']`——`reviewer_chen` 是名冊唯一帶 `can_arbitrate` 者，原順序下正好落在 `ofs-03-arbitrated-gold`，種子歸屬改正後 chen 會成為該單位的當事人而依 FR-060 失去仲裁資格，使種子的 `arb` 成為無效資料。
- **正典回寫（gate 4）**：015 版號 MINOR bump（6.10.0 → 6.11.0，以當下最新版號接續）並補一列 Changelog；delta 中未編號的新情境於回寫時接續對應使用者故事現行最大編號，編成新 AC。

**非目標**：

- **不改 `getReviewAssignments()` 對待分配池的分派規則本身**。它仍是位置性輪流分派、仍先排序、仍不因審核員恰為該筆標記員而排除（FR-093「明確不存在的規則」不變）。本單只把已黏住的單位移出待分配池。
- **不引入任何持久化的指派表**。黏住由既有的審核提交 bucket 推導（`reviewerBucketPrefix()`／`readReviewerSubmissions()`），不新增第二份儲存——正典未要求持久化 assignment，且新增一份會與 FR-093「指派由系統推導」的語意衝突，也會產生與提交歷程對不上的可能。
- **不改 014 的任何條文**。FR-005j 與 FR-010f-4 在本單只作為理據引用；014 的「未指派筆數」呈現與 `computeReviewWorkload()` 的分桶語意（`done`／`pending`／未指派）不變。
- **不改仲裁者資格判定（FR-060）與 `isArbiterCandidate()`**。離冊閘門的優先序低於仲裁分支，仲裁路徑不因本單關閉。
- **不改 IAA、摘要計數與快速審核的候選推導本身**；它們讀到的指派變了，但推導規則不變。
- **不改示範任務的內容、樣本命名與示範情境**。種子修正只動「這筆審核掛在誰名下」與 T015 的名冊順序；樣本 id、標記內容、`arb`／`modifyBy`／`bypassBy` 的存在與否、以及每個示範想演示的流程全部不變。
- **不修補「爭議單位落在唯一仲裁者名下就無人可仲裁」這個結構性缺口**。T014 `dry-03` 與 T016 `ofm-03` 在種子歸屬改正後會出現此情形，但那是單一仲裁者配 N 人名冊的產品層限制，與本單的黏住規則無關，另開 issue 追蹤。

## Capabilities

`annotation` — 審核指派的穩定性與離冊審核員的可見性。

## Constitution Check

| 原則 | 符合方式 |
| --- | --- |
| **II. Generalization-First（NON-NEGOTIABLE）** | 黏住以審核提交 bucket 前綴泛掃推導，不含任何任務 ID、樣本 ID、帳號或輸出類型分支 |
| **III. Data Fairness（NON-NEGOTIABLE）** | 離冊審核員只看得到**自己已提交**過的單位；`getSubmission()` 只回傳已提交者，盲審隔離（FR-062）不放寬 |
| **X. Change Scope Discipline** | 3 個產品檔（含種子歸屬修正的 `task-detail.data.js`）；測試檔與 `openspec/**`／`specs/**` 不計入門檻 |
| **XX. Source of Truth & Contract Governance** | 黏住事實收斂為資料層單一查表，`getAssignedReviewUnits()` 與 `computeReviewWorkload()` 對「誰擁有這個已審單位」不再可能給出不同答案 |
