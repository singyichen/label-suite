# 設計：reserve-arbiters-from-review-assignment（issue #868）

## Context

`task-detail.data.js` 已為每個任務 profile 提供 `reviewerIds` 與 `arbiterIds`。但 annotation 資料層目前只把前者交給 `getReviewAssignments()`，仲裁資格則另讀全域 `REVIEWER_ROSTER.can_arbitrate`。這使設定畫面與實際資格來源分裂，也讓唯一仲裁者可能先被分派為當事審核員。

## Decisions

### D1：任務 `arbiter_ids` 是仲裁名冊唯一來源

新增 `taskArbiterRoster(taskId)`。profile 明確存在 `arbiterIds` 時（包含空陣列）原樣採用；只有缺少 profile 或欄位的舊 prototype 資料才回退到 `REVIEWER_ROSTER.can_arbitrate`，以維持相容性。`isArbiterCandidate()` 改查此 helper，再疊加 FR-060 的非當事人條件。

### D2：所有指定仲裁者都保留，不只保留第一人

新增純函式 `reviewAssignmentRoster(reviewerIds, arbiterIds)`，回傳保序的集合差 `reviewerIds - arbiterIds`。選擇「全部保留」是因 `arbiter_ids` 本身就是 PL 明確指定的角色；若只秘密保留第一人，名冊順序會變成未揭露的權限規則，也會讓其餘被標為仲裁者的人仍有機會成為當事人。

### D3：黏住優先於保留

`taskReviewAssignments()` 把 D2 的有效名冊交給既有 `getReviewAssignments(..., stickyByUnit)`。既有已提交單位先由 issue #824 的 `stickyByUnit` 決定歸屬；保留規則只影響尚未黏住的新分派池。這避免角色設定變更竄改歷史責任鏈。

### D4：所有指派消費端共用同一集合差

工作區／清單使用 `taskReviewAssignments()`；`computeReviewWorkload()` 保留呼叫端傳入名冊的既有邊界，但在呼叫 `getReviewAssignments()` 前以同一 `reviewAssignmentRoster()` 排除任務仲裁者。負荷表與實際工作區不得對同一單位給出不同負責人。

### D5：空仲裁名冊維持既有語意，零分派池由 companion change 阻擋

`arbiterIds = []` 時集合差等於完整 reviewer 名冊；系統不虛構仲裁者。若所有 reviewer 都同時被指定為 arbiter，014 的 companion change 在儲存時阻擋。annotation helper 對不合法舊資料則誠實回傳空的新分派池，不私自打破角色設定。

### D6：示範種子升級為 v4

T014／T016 目前把部分已提交審核掛給 `reviewer_chen`，issue #824 黏住後會使其永遠成為當事人。seed marker 由 v3 升為 v4，偵測 v1～v3 時重建 T014–T016 的 prototype 審核 bucket；審核決策改掛有效分派池 `wang → li → lin` 的位置性落點，既有仲裁內容、樣本 ID 與答案不變。這是 prototype localStorage 遷移，不代表正式資料庫 migration。

### D7：下一個可處理單位不為仲裁者製造例外指派

`findNextActionableReviewUnit()` 不新增仲裁者專用分支；它繼續消費 `getAssignedReviewUnits()` 與 FR-060 仲裁資格。D2 使保留仲裁者沒有新的 `pending` 指派，因此 FR-073 原本「pending 優先」對該身分自然成為不可達分支。仲裁送出 `兩者皆非` 後，若目前爭議仍是其最前面的可仲裁單位，函式可回傳目前單位以保留 FR-065 改票；任務中屬於其他審核員的 pending 不得改變這個結果。

## Risks / Trade-offs

- 指定多位仲裁者會縮小審核池；014 因此必須保證至少留一位非仲裁審核員。
- 歷史上由仲裁者提交的單位仍黏住，該人仍不能仲裁；本變更保證的是新分派不再製造同一死路，不竄改既有責任鏈。
- 舊 profile 沒有 `arbiterIds` 時才回退全域示範名冊；一旦有明確空陣列就不得回退，否則「未指定仲裁者」會被靜默改寫。
