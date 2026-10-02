# Design — 試標與正式結案條件及跨頁籤狀態對齊（issue #1120）

全部行號皆於工作樹 `.claude/worktrees/issue-1120-task-lifecycle-alignment`（base `1f1e805f`，正典 014 v4.3.0）以 `grep -n` 當場重新定位。issue 所附行號取自 `b586bdad`，已漂移，本文件不沿用。

## D1. 維護者裁示與「試標完成」的實作契約

### 裁示紀錄（2026-10-02，經主 session 問答）

| # | 問題 | 裁示 |
|---|---|---|
| 1 | 是否接受 014 升 **5.0.0（BREAKING）**，改寫 `DRY_RUN_COMPLETION_RULE`／FR-008a／AC-3.2／AC-3.16／SC-004／FR-013(1) 與 ADR-022 轉換表？ | **接受**。既有測試期望於同一支改變行為的 PR 內重寫。 |
| 2 | 無仲裁者死鎖的出口？ | **`arbiter_ids` 為空時 `project_leader` 可直接裁定爭議，視為仲裁完成**。寫入 014 delta（本 change 以新增 FR-023 承載）；若牽動 `annotation/015-annotation-workspace` FR-061 另列 015 delta。 |
| 3 | 「必要審核／仲裁」是否包含試標例外池？ | **包含**。例外池有待處置項目時不得視為試標完成（修訂 FR-018 第 (5) 點）。 |
| 4 | 是否授權在 015 補定義「仲裁輸出項目」的可計數單位？ | **授權**，作為 G5 合併後的獨立單一目的 PR。 |

### 為何是 BREAKING（判定依據，行號為現況重新定位）

| 條文 | 位置 | 被收回的既有行為 |
|---|---|---|
| `DRY_RUN_COMPLETION_RULE` | `specs/task-management/014-task-detail/spec.md:56` | 常數定義只計標註提交 |
| FR-008a | 同檔 `:584` | 「系統**必須自動轉為** `waiting_iaa_confirmation`」之充分條件被收緊 |
| **AC-3.2** | 同檔 `:449` | 其 **Then** 子句（全員 `assigned_count == completed_count` → 自動轉換）變為**偽** |
| AC-3.16 | 同檔 `:463` | 「依 `DRY_RUN_COMPLETION_RULE` 全部完成**才轉為**」之充分性敘述 |
| SC-004 | 同檔 `:773` | 「**僅**在…完成各自全部試標樣本後，才可…自動進入」 |
| FR-013 第 (1) 點 | 同檔 `:637` | 停用原因文字未涵蓋審核／仲裁 |
| FR-018 第 (5) 點 | 同檔 `:693` | 「結案閘門**僅計** `official_run`」——`dry_run` 例外項原本無任何閘門 |
| FR-010t 之無仲裁者警示 | 同檔 `:631` | 警示文字「任務將無法**結案**」在 FR-023 生效後不再成立 |
| ADR-022 Transition Table | `docs/adr/022-task-state-machine-location.md:89` | 該列逐字為 `All dry-run annotations submitted` |

**測試層級佐證**：`design/prototype/tests/task-management/issue-791-trial-round-from-waiting.spec.ts:47` 的既有綠燈案例，標題即 `a fully-submitted dry-run progress moves the task into waiting_iaa_confirmation regardless of the round outcome (FR-008a, FR-010o-3)`，於 `submittedSamples: 1, totalSamples: 1` 前提下斷言 `#statusBadge` 為「待 IAA 確認」且兩個 publish 按鈕皆 `toBeEnabled()`。閘門在 `design/prototype/pages/task-management/task-detail.html:5199` 的 `if (submitted < total) return;`，完全不檢查審核／仲裁。此案例的期望值必須在 G4（改變該行為的那一支 PR）內重寫，不得繞過或刪除。

### 新的試標完成判定式（實作契約）

試標完成 = 以下**全部**成立，範圍限「當前回合」：

1. 無未指派的 `dry_run` 標記作業（既有）
2. 每一位 `membership_status = active` 的 `annotator` 皆 `assigned_count == completed_count`（既有）
3. 全部 `dry_run` 審核單位皆推導為 `finalized`
4. 不存在推導為 `disputed` 的 `dry_run` 審核單位
5. `dry_run` 最終例外池已清空（無待處置項）

第 3／4 項的判定式**一律讀** `annotation/015-annotation-workspace` FR-051（`specs/annotation/015-annotation-workspace/spec.md:797`）的五句推導，014 不得自建第二份。爭議項裁定讀 `annotation/015-annotation-workspace` FR-061（同檔 `:834`），或在 `arbiter_ids` 為空時走本 change 新增的 FR-023。第 5 項讀 FR-018 修訂後的 `dry_run` 計數。

**不會被此改寫影響的語意**：IAA 仍為顧問性（FR-010o-3，`:614`），計算狀態 `pending｜done｜failed` 的呈現與停用規則不變（FR-010o-4，`:615`）；新增的三項前置條件與 IAA 達標或計算是否結束皆無關，不得被表述為 IAA 問題。`TASK_STATUSES` 五態不變。

### 死鎖出口的完整性檢查（FR-023 為何足夠）

`annotation/015-annotation-workspace` FR-061 第 3／4 點明文爭議項必須逐項裁定、「不存在自動收斂路徑」。納入「必要仲裁完成」後，可能卡死的路徑只有一條：`arbiter_ids` 為空（FR-010t `:631` 允許且僅警示）而出現 `disputed` 單位。FR-023 以「`arbiter_ids` 為空時 `project_leader` 可裁定」補上該路徑的唯一出口，且：

- 裁定選項與仲裁者相同，`兩者皆非` 仍落入例外池由 `project_leader` 收尾（`annotation/015-annotation-workspace` FR-095，同檔 `:1030`），因此不會產生「有出口但繞過例外池」的新漏洞。
- `arbiter_ids` 非空時不開放此通道，因此不會削弱 `annotation/015-annotation-workspace` FR-060 的非當事人要求。
- 不放寬 `annotation/015-annotation-workspace` FR-062 的盲審隔離（同檔 `:1031` 前後段）。
- FR-010t 的警示文案隨之修訂，否則正典會自相矛盾（警示稱無法結案，而 FR-023 明定可結案）。

**仍須在 G4 的 Red 中釘住的邊界**：`dry_run` 的例外池收尾動作中，`custom_answer` 依 `annotation/015-annotation-workspace` FR-095 第 (3) 點**僅適用 `official_run`**（`dry_run` 不產出最終答案），因此 `dry_run` 例外項只能以 `adopt_annotator`／`adopt_reviewer`／`exclude_from_dataset` 收尾。Red 必須驗證 `dry_run` 收尾介面不提供 `custom_answer`，否則新閘門會把使用者導向一個不存在的出口。

## D2. 衍生狀態契約（issue §2 要求的五個定義）

**聚合層級共三層，不可相加、不可共用分母**：

| 概念 | 分子 | 分母 | 聚合單位 | 正典歸屬 |
|---|---|---|---|---|
| `已提交` | 該 `task_id × run_type × round` 範圍內已提交之標記 assignment 數 | 同範圍已指派之標記 assignment 數 | 標記 assignment | **目前無定義**，014 擁有 → 本 change FR-010u 第 (2) 點新增 |
| `已完成輪次` | 已依試標完成規則結束之回合數（進行中回合不計入） | 不適用（計數非比率） | 試標回合 | **目前無定義**，014 擁有 → 本 change FR-010u 第 (3) 點新增 |
| `已定案 review unit` | 狀態推導為 `finalized` 之審核單位數 | 同範圍審核單位總數 | `sample_id × annotator_id × run_type` | **已定義**：`annotation/015-annotation-workspace` FR-051（`specs/annotation/015-annotation-workspace/spec.md:797`），聚合單位常數 `REVIEW_UNIT_DIMENSIONS`（同檔 `:57`） |
| `仲裁輸出項目` | 已裁定之爭議項數 | 該範圍爭議項總數 | 爭議項（審核單位 × 輸出類型） | **機制已定義、可顯示之計數單位未明文**：`annotation/015-annotation-workspace` FR-061（同檔 `:834`）定義逐爭議項裁定與 `ARBITRATION_OUTCOMES`，但未定義計數單位 → **015 擁有，列為跨 owner 待辦，本 change 不替其定義** |
| `最終例外輸出項目` | 已收尾之例外項數 | 落入例外池之例外項總數 | 爭議項（仲裁裁定為「兩者皆非」者） | **已定義**：`annotation/015-annotation-workspace` FR-095（同檔 `:1030`）定義來源與 `EXCEPTION_POOL_ACTIONS`；分 `run_type` 獨立計數見 014 FR-018 第 (5) 點（`specs/task-management/014-task-detail/spec.md:693`） |

**`已定案 review unit` 的判定式**（`annotation/015-annotation-workspace` FR-051 原文，恰五句，本 change 一字不改、只引用）：標記員未提交 → 不成立審核單位（推導為 null）；該單位之指派審核員尚未提交 → `pending`；審核員逐項決策皆為 `approve` → `finalized`；任一項決策為 `modify` 或 `bypass` → `disputed`；`disputed` 單位之所有爭議項皆已解決（仲裁定案或最終例外池收尾）→ `finalized`，否則維持 `disputed`。`finalized` 為終態。

**指派粒度差異**（`annotation/015-annotation-workspace` FR-093，同檔 `:1028`）：`dry_run` 以**樣本**為指派單位、`official_run` 以**審核單位**為指派單位；兩者每個指派對象恰一位審核員。這是 `已提交` 與 `已定案 review unit` 分母在兩種 `run_type` 下不同構的原因，計數時不得互換。

**時間語意**：已提交時間不得冒充審核或仲裁完成時間（FR-010u 第 (6) 點）。

**揭露閘門不得被放寬**：FR-010u 第 (3) 點的「歷史回合與當前回合分列」只約束**負責人視角的計數呈現**，不得被解讀為放寬 `annotation/015-annotation-workspace` FR-096（同檔 `:1031`）之試標歷史回饋揭露閘門——該閘門以回合為單位、嚴格晚於該回合轉入 `waiting_iaa_confirmation`、進行中回合 fail closed，且被修改筆數與占比逐回合分列、不得合併分母。

## D3. 正式結案判定式（FR-008b）與原型現況

正典 FR-008b（`specs/task-management/014-task-detail/spec.md:585`）五項前置條件與 issue §1「正式結案」決策**逐項對應，無落差**：(1) 正式標記作業全數提交（已排除作業不計入）；(2) 全部審核單位皆推導為「已定稿」或經最終例外池「自資料集排除」處置；(3) 不存在「爭議中」的審核單位；(4) 最終例外池已清空（僅計 `official_run`，FR-018）；(5) 品質指標計算完成可用。AC-3.9（同檔 `:456`）與 SC-037（同檔 `:810`）為其驗收與成功標準。**issue §4 驗收 07／08 因此不需要新 FR**，Red 直接引用 FR-008b／AC-3.9。

**原型現況是一個已記載的刻意簡化（known ceiling），不是規格缺口**：

- `design/prototype/pages/task-management/task-detail.data.js:1567`～`:1578` 的 `getTaskCompletionBlockers()` 接受五個訊號，但其 doc comment（同檔 `:1560`～`:1566`）明文「each condition defaults to "satisfied" when the caller omits it」——條件 2／3／5 缺值時**預設放行**。
- 呼叫端 `design/prototype/pages/task-management/task-detail.html:10660` 將 `submissionComplete: true` **寫死**，其上方註解（同檔 `:10650`～`:10657`）明文只有 FR-018 例外池是 live-wired。

結果：目前五條件實質只有例外池一條生效。issue §2「禁止為展示可結案而固定條件為 true，缺資料不得默認已完成」指的正是這兩處。修正屬 **Green 實作工作（對齊既有 FR-008b）**，不需要任何 delta。

## D4. 例外與合法排除如何滿足「全部完成」

依既有條文，不自行發明規則：

- **合法排除（標記作業層級）**：FR-005h（`specs/task-management/014-task-detail/spec.md:573`）——`project_leader` 明確排除之未指派標記作業須保存排除者／時間／原因／run stage／原作業識別；被排除作業不計入完成率與標記分布統計，`dry_run` 之排除作業亦不計入 IAA。邊界情況（同檔 `:531`～`:533`）進一步規定：Dry Run 存在未指派作業時不得自動轉 `waiting_iaa_confirmation`，須重新指派或明確排除後再檢查；Official Run 未處理前不得標記為 `completed`。**本 change FR-010u 第 (2) 點據此規定被排除作業不計入 `已提交` 的分子與分母**（既有語意的計數層延伸，非新規則）。
- **例外處置（爭議項層級）**：`annotation/015-annotation-workspace` FR-095 四種收尾動作 `EXCEPTION_POOL_ACTIONS`；其中 `exclude_from_dataset` 之項目不產生 gold，`custom_answer` **僅** `official_run` 可用。FR-008b 第 (2) 項明文「或經最終例外池『自資料集排除』處置」即為「合法排除也算完成」的既有出口——**不得自行把例外自動排除，也不得把既有合法處置改成永遠無法完成**（issue §1 約束）在正式階段已由此條滿足。
- **試標階段無對應閘門**：FR-018 第 (5) 點明文結案閘門僅計 `official_run` 例外項，`dry_run` 例外項目前沒有任何閘門消費。這是 D1 第 3 個待裁示問題。

## D5. Fixture 事實（已逐一 `grep` 核對）

issue 走查表引用的全部數字**經核對後確認無誤**，無需修正：T013 資料總數 `1`／試標抽樣 `1`／正式保留 `0`；T014 進度 `5/5`、已完成輪次 `1`、R1 樣本 `1`、審核 `7/15` 已定案、`3` 爭議；T015 提交 `4/5`、review unit 定案 `2/4`；T016 提交 `5/5`、定案 `2/5`、爭議 `3`、仲裁輸出 `2`、最終例外輸出 `1`；T018 正式可用池 `0`。主要來源為 `task-detail.data.js`、`task-detail.html` 的 `ANNOTATION_PROGRESS_BY_TASK`／`WORK_LOG_ENTRIES_BY_TASK`，以及 `design/prototype/pages/annotation/annotation-workspace.data.js:3559` 起的 `var scripts` 審核狀態 seed 表。（**引用更正**：T01 報告原稱此表為 `seedReviewFlowDemo()`，但該符號在倉庫中不存在——`annotation-workspace.data.js` 全檔沒有任何 `function`，是純資料檔；該名稱僅作為註解措辭散見於多個既有檔案，屬本 change 之前即存在的文件漂移。）

**審核單位計數的查證邊界**：`已定案`／`爭議中` 兩個數字可由上述 seed 表逐列核算（T014：15 列＝5 樣本 × 3 標記員，核算得 finalized `7`、disputed `3`）。但**待審數無法僅由靜態核算定案**：逐列核算得 `5`，而 `design/prototype/pages/dashboard/dashboard.assignments.js:268` 的既有註解寫 `T014=6 of 15`，兩者相差 1。該註解引用 issue #302／#310，而此 seed 表其後經 issue #596／#837／#843／#868 多次改寫，註解可能已過期；亦可能兩者分母語意不同（dashboard 為「對當前登入審核員而言待審」）。本 change 不裁定此數字——撰寫 Red 斷言前必須開啟實際頁面確認，見 `tasks.md` 群組 4 之撰寫前置。

**跨任務污染的機制**（issue 稱 T013／T018 顯示其他任務的通用 R1/R2、124 筆與工時／匯出歷史）：

- `ANNOTATION_PROGRESS_BY_TASK`、`WORK_LOG_ENTRIES_BY_TASK`、`UNASSIGNED_ANNOTATION_ASSIGNMENTS_BY_TASK` 三張表**只收錄 T014／T015／T016**；T013 與 T018 一律 fallback 到通用舊資料。
- 字面 `124` 命中於 `design/prototype/pages/task-management/task-detail.html:3631`。
- `exportHistory` **從未依任務覆寫**，全任務共用同一份。

本 change FR-010u 第 (1) 點（共用查詢上下文 + 真實空狀態）即為此現象的規格承載。

## D6. PR 拆分與既有測試衝突面

`task-detail.html` 禁止平行修改（issue §5），且 5 檔／300 行為硬上限。分組與順序見 `tasks.md`。兩處既有綠燈測試會因 fixture 對齊而變紅，**必須在同一 PR 內同步改寫期望值，不得繞過或刪除**：

1. `design/prototype/tests/task-management/issue-887-explicit-empty-trial-rounds.spec.ts` 三個案例斷言 T015／T016 的 `#officialPoolValue` = `5`、`#trialRoundsUsedValue` = `0`、`#trialRoundTimeline` 項目數 `0`。來源是 `ANNOTATION_PROGRESS_BY_TASK.T015/T016.rounds = []`（`task-detail.html:3679`、`:3691`，刻意的 `hasExplicitEmptyTrialRounds()` 設計）。補上「正式案例需有符合前置條件的試標歷史」（issue §4 驗收 11）會改變這四個值。
2. `design/prototype/tests/task-management/issue-791-trial-round-from-waiting.spec.ts:47` 之案例（D1 已詳述）——屬 D1 的 MAJOR 範圍，**本 change 不觸碰**。

T013／T018 的污染修正**未發現任何既有測試鎖定其舊的通用數值**，風險最低，故排為第一組。

## D7. 明確排除於本 change 的範圍

- `annotation/015-annotation-workspace` 的 `仲裁輸出項目` 計數單位定義 → 015 擁有；維護者已授權，由本單 lead 於 G5 合併後另提**獨立單一目的 PR**，不併入本 change。
- `docs/adr/022-task-state-machine-location.md` 缺 2026-09-07 Amendment、其 Transition Table（`:93`）與 2026-08-19 Amendment（`:104`、`:106`）仍引用 014 v3.0.0 已移除的 `min_reviewers` 與舊版「所有必要仲裁完成」條件 → **既有技術債，與 #1120 無關**，另開單一目的 PR，不得夾帶。
- issue §7 四組建議介面圖**尚未上傳**，本 change 未審閱任何圖片；正式階段 KPI 配置與決策欄屬候選 UI 方案，待維護者設計定稿，相關任務在 `tasks.md` 明確 gated。
- #1108 的候選 A–H、backend／API／DB／React、資料集分析模組、新任務狀態、重開流程皆為範圍外（issue §8）。
