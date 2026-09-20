# 設計：sticky-review-assignment（issue #824）

## Context

指派的推導鏈（`design/prototype/pages/annotation/annotation-workspace.data.js`）：

| 位置 | 函式 | 行為 |
| --- | --- | --- |
| `:2209` | `getReviewAssignments(runType, units, reviewerIds)` | 純函式。先以 `sample_id`、`annotator_id` 排序，再位置性分派：`official_run` 取 `roster[index % roster.length]`；`dry_run` 以樣本首次出現序取 `sampleOrder.length % roster.length`。名冊為空時回傳 `[]` |
| `:2261` | `getAssignedReviewUnits(taskId, runType, reviewerId, units)` | 由 `findTaskDetailProfile(taskId).reviewerIds`（否則 `REVIEWER_ROSTER`）取名冊，呼叫上者後以 `reviewer_id === reviewerId` 過濾 |
| `:2878` | `computeReviewWorkload(taskId, runType, reviewerIds, activeReviewerIds)` | 014 審核指派表的負荷來源。自行呼叫 `getReviewAssignments()`，再依 `activeReviewerIds` 把非在職者的 `pending` 併入未指派池、`done` 留給原審核員 |

消費端：`annotation-list.html:1680` `filterToAssignedUnits()`（FR-055 清單列）、`annotation-workspace.data.js:3084` `listActionableReviewUnits()`（FR-073／FR-100）、`task-detail.html:7654`（014 AC-1.6 負荷表）。

已儲存的審核提交：bucket key 為 `taskId::reviewer::runType::annotatorId::reviewerId`（`reviewerBucketPrefix()`，`:485`）。`readReviewerSubmissions(taskId, runType, sampleId, identity)`（`:1902`）已經以該前綴泛掃出「某標記員某樣本上全部**已提交**的審核」，並附 `reviewerId` 與 `submittedAt`；`task-detail.data.js:1522` 已用同一個函式回答「這個單位實際由誰審過」。**黏住所需的事實已經在 storage 裡，本單只是把它接到指派上。**

## Goals / Non-Goals

**Goals**：已有審核提交的單位，其指派審核員恆為該提交者；離冊審核員仍看得到自己審過的單位，但不能再送出審核。

**Non-Goals**：見 proposal.md「非目標」。

## Decisions

### D1：新增 `getStickyReviewers(taskId, runType)`

回傳 `{ [unitKey]: reviewerId }`，其中 `unitKey` 為 `sampleId` 與 `annotatorId` 以 `U+0000` 串接（該字元不會出現在兩個 ID 中，故不會誤併）。作法：`listSubmissionBucketKeys()` 掃一次，取形狀為 `taskId::reviewer::runType::<annotatorId>::<reviewerId>` 的 key，讀其 bucket，對每個 `entryStatus(entry) === 'submitted'` 的 `sampleId` 記一筆候選 `{ reviewerId, submittedAt }`。

**同一單位出現多位提交者時的取捨**：取 `submittedAt` 最早者；`submittedAt` 缺值者排在最後；仍並列時取 `reviewerId` 字典序最小者。FR-093 v6.6.0 已禁止示範種子讓兩位以上審核員並列審同一個 `official_run` 單位，所以這條只是**決定性保證**，不是常態路徑——但沒有它，`listSubmissionBucketKeys()` 的排序一旦改變，黏住結果就會跟著飄。

**為什麼不逐單位呼叫 `readReviewerSubmissions()`**：那是 O(單位數 × bucket key 數) 的重複全掃；一次掃描建表是 O(bucket key 數)。行為等價（同一個前綴、同一個 `submitted` 條件）。

**否決的替代方案**：

- **新增一份持久化的 assignment 表**：正典未要求持久化，且與提交歷程各自為政時會出現「表說 A、歷程說 B」的不可裁決狀態。既有事實已足夠。
- **以歷程事件（FR-050／FR-086）推導**：歷程是提交的下游副產品，`modify`／`bypass` 的產生條件直到 issue #804 才補齊；以提交 bucket 為準才是與「該審核員已對此單位表態」等價的最小事實。

### D2：`getReviewAssignments()` 接受選用第 4 參數 `stickyByUnit`

簽章改為 `getReviewAssignments(runType, units, reviewerIds, stickyByUnit)`。未傳入時行為與今日**逐字相同**（既有測試 `tests/annotation/issue-596-review-assignment.spec.ts` 直接以三參數呼叫，不必改）。

傳入時：

- `official_run`：走排序後的清單，黏住者直接取 `stickyByUnit` 的值；未黏住者取 `roster[k % roster.length]`，其中 `k` **只數未黏住的單位**。
- `dry_run`：先以排序後的首次出現序決定每個 `sample_id` 的歸屬——該樣本內第一個黏住的單位決定整個樣本（per_sample 粒度，FR-093 第 1 點）；未被黏住的樣本取 `roster[m % roster.length]`，`m` 只數未黏住的樣本。
- 名冊為空時仍回傳黏住的指派（今日是回傳 `[]`）。否則把全部審核員移出名冊，就會連「誰審過」都一併消失，正是 #824 的症狀 2。

**為什麼是選用參數而不是把 `taskId` 塞進簽章**：`getReviewAssignments()` 的純粹性是它今日唯一可被單元測試直接餵資料的理由（`issue-596-review-assignment.spec.ts` 以 `page.evaluate` 傳入自製 units）。加 `taskId` 會讓它必須讀 storage，測試得先鋪 bucket；選用參數讓純函式維持純函式，讀 storage 的責任留在 D3 的入口。

### D3：新增 `taskReviewAssignments(taskId, runType, units)` 作為帶任務脈絡的唯一入口

內部組合：`taskReviewerRoster(taskId)`（由 `getAssignedReviewUnits()` 現有的名冊推導抽出）＋ `getStickyReviewers(taskId, runType)` ＋ `getReviewAssignments()`。

- `getAssignedReviewUnits()` 改呼叫它後再過濾——離冊審核員的 id 自此會出現在指派結果中，症狀 2 的清單／左欄可見性即由此恢復。
- `computeReviewWorkload()` **不改呼叫 `taskReviewAssignments()`**，只把同一份 `getStickyReviewers(taskId, runType)` 當第 4 參數傳進它既有的 `getReviewAssignments()` 呼叫。它刻意吃**呼叫端傳入的 `reviewerIds`**（014 傳的是**已儲存**的名冊，含已離冊者）而不是當下勾選的名冊——這正是「`done` 留給原審核員、非在職者的 `pending` 併入未指派池」得以成立的前提。改成讀 `taskReviewerRoster()` 會把它換成當下名冊，離冊者的單位會在到達 `activeReviewerIds` 分桶前就先被重新發牌，未指派池永遠歸零，等於把 014 的負荷表語意一起改掉——那超出本單範圍。

**為什麼兩個消費端都要改**：不讓 `computeReviewWorkload()` 也吃黏住查表的話，014 的負荷表與工作區會對「誰擁有這個已審單位」給出不同答案——那正是 issue #501／#761 把數字搬到指派規則旁邊所要避免的情形。兩者共用查表即可對齊，不需要共用名冊。

### D4：離冊唯讀閘門 `REVIEW_UNIT_BLOCK.OFF_ROSTER`

`annotation-workspace.config.js`：

- 新增列舉值 `OFF_ROSTER: 'off_roster'`（`:3447`）。
- `reviewUnitBlockReason()`（`:3460`）判定序為 **ARBITRATION → FINALIZED → OFF_ROSTER → EMPTY**。
  - 仲裁分支在最前：仲裁者資格由 `isArbiterCandidate()` 依 `REVIEWER_ROSTER.can_arbitrate` 判定，與任務的 `reviewer_ids` 是兩份名冊；把離冊閘門放在它前面會連帶關掉 FR-060 的仲裁入口。
  - 定稿分支在其前：定稿單位本就唯讀，且定稿卡（FR-094）資訊量高於離冊註記，離冊者看定稿單位仍應看到定稿卡。
- 新增渲染分支：隱藏送出鈕（連帶擋掉 FR-058 的 Ctrl/Cmd+Enter，`setupActionShortcuts` 跳過隱藏按鈕）、以 `buildReviewerInputText()` 渲染唯讀輸入卡（沿用 FINALIZED 分支寫法），再附一張 `data-testid="ws-review-off-roster"` 的說明卡，文案取自新 i18n 鍵 `reviewOffRosterNote`（中英各一）。
- 判定用的名冊查詢由資料層新增 `isRosterReviewer(taskId, reviewerId)` 提供，內部就是 D3 的 `taskReviewerRoster()`，不在 config 層另寫一份名冊推導。

歷程頁籤不在本閘門範圍內：它是另一個頁籤、讀 `getSampleHistory()`，本單不動它，離冊者的歷程可見性因此自動成立。

### D5：不變量

- **每個單位恰一位審核員（FR-093）**：D1 的取捨規則保證查表值唯一，D2 的黏住分支一次只寫一個 `reviewer_id`。
- **決定性**：`listSubmissionBucketKeys()` 已排序，D1 的取捨規則全序，D2 未黏住者仍只依輸入陣列順序——同一份 storage 永遠得到同一組指派。
- **盲審隔離（FR-062）不放寬**：D1 只採 `entryStatus === 'submitted'` 的 bucket，草稿不構成黏住，也不讓任何人多看到別人未提交的判斷。
- **`dry_run` per_sample 粒度不破**：D2 的樣本層黏住確保同一樣本不會被拆給兩位審核員。

## Risks / Trade-offs

- **既有夾具的指派會位移**：`tests/cross-role/`（xrole 旅程）、`issue-719-review-submit-auto-advance`、`issue-766-finalized-card-remaining-cue` 都依賴位置性指派，而其情境中往往已存在審核提交。黏住會讓這些單位改掛提交者，連帶改變**其後未黏住單位**的輪流起點。處置：Red 之後以 probe（暫套 Green 跑全量）盤點受影響的寫死斷言，只同步期望值、不改測試結構——這正是 #792 已驗證過的作法。
- **負荷分布可能失衡**：一位審核員大量提交後離冊，其單位全部黏住，剩餘池才平均分。這是裁定本身的代價，也與 `task-management/014-task-detail` FR-005j「`done` 保留為歷史統計」一致；差距 ≤ 1 的約束因此必須收斂到待分配池，否則正典會自相矛盾（本單的 delta 即修此）。
- **離冊者仍看得到受審資料**：唯讀可見必然讓已離冊者留有可視窗口。限縮為「其持有已提交審核之單位」而非整份任務，且不得再提交，是本單採的邊界；更嚴格的撤銷（連唯讀都收回）會使 FR-097 責任鏈指向不可達的畫面，裁定已排除此選項。
