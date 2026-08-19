# Issue #180 W6 — 錯誤/邊界情境與鍵盤、無障礙、i18n、Responsive 驗收規劃（草稿 v1.0）

角色：senior-qa｜階段：三（Playwright 驗收文件）｜範圍：`account`／`dashboard`／`task-management`／`annotation`（排除 `dataset` 分析模組與純視覺 polish）
狀態：本文件僅為規劃草稿，**不實作** `.spec.ts`；一切測試 ID 為未來實作用的規劃代號，尚未存在於 `design/prototype/tests/`。

## 0. 正典依據與範圍界定

- 正典來源：`specs/task-management/013-*`、`specs/task-management/014-*`、`specs/annotation/015-*`、`docs/product/reviewer-model-redesign.md`（D4，`phase2-decision-list.md:49`）；PRD/IA/story-map/impact-map/baseline 視為已知過期，不作為本文件判準。
- D1：本輪一切 Playwright 情境落在 `design/prototype/tests/`，正式 `e2e/` 目錄另案決議（`phase2-decision-list.md:46`）。
- D2：「完成」節點驗收條件採 issue #180 完整條件，惟 ADR-022／014 尚未修訂，對應情境標記「Spec-defined (pending revision)」（`phase2-decision-list.md:47`、`traceability-matrix.md:30,38`）。
- 追溯矩陣節點編號沿用 `docs/product/e2e/issue-180/traceability-matrix.md` 的 16 節點（下稱「矩陣節點 #N」）；Finding 編號（F-01～F-11）沿用 `w2-ux-journey.md`。
- 分類定義：
  - **原型層可驗**：目前 prototype 程式碼可直接以 Playwright 斷言驗證（無論現況通過或如實反映一項已知缺口）。
  - **正式 E2E 才可驗**：依賴真實後端／網路層（API、DB、JWT session、WebSocket），prototype 無法有意義驗證，留待正式全端 E2E。
  - **待缺陷修正後啟用**：情境本身可寫，但斷言的「期望行為」依賴一項已定案但**尚未修正**的缺陷（F-01／F-07／F-08b 等）或尚未落地的 D2/D3 決議；本輪只記錄情境設計，實作時機在缺陷修正 PR 合併之後。
- 與既有測試的關係：`沿用`（直接套用既有 spec 之既有測試，不需新增）／`擴充`（在既有 spec 檔新增 test case 或延伸既有 pattern）／`新增`（全新 spec 檔或全新斷言角度，既有套件無對應覆蓋）。
- 本輪核實方式：全部證據以 `Read`／`grep` 於 2026-08-19 對 `design/prototype/` 現況重新核實，不轉引未驗證的舊敘述；凡本文件新發現、未出現在 W1/W2/W3/追溯矩陣中的邊界情況，均明確標注「本輪新發現」並建議留待階段四 triage 判斷是否需要新 Finding，QA 角色本身不自行分配 Finding ID 或判定 Bug／Enhancement 分類。

---

## 1. 操作連續性情境（重新整理／離開再返回／重新登入）

Prototype 無真後端 session；「重新登入」在此僅能以「清空 query params 後以相同身分識別參數重新導覽」近似，且必須在文件與測試註解中明確標注此限制（呼應 `w3-playwright-qa.md` §2.3／§3.1 已建議的分層說明）。

| ID | 情境摘要 | 矩陣節點 | 分類 | 與既有測試關係 |
|---|---|---|---|---|
| CONT-01 | 標記員草稿：整頁重新整理後欄位與清單狀態不遺失 | #8／#10 | 原型層可驗 | 擴充 |
| CONT-02 | 標記員草稿：離開至清單頁再返回工作區，草稿仍在 | #8／#10 | 原型層可驗 | 擴充 |
| CONT-03 | 審核員：尚未送出審核的逐列決策在整頁重新整理後遺失（現況邊界，非既有 Finding） | #11 | 原型層可驗 | 新增 |
| CONT-04 | 「重新登入」近似：以相同 `annotator_id` 換分頁／換 Page 重新進入，先前提交仍可讀取 | #10／#11 | 原型層可驗 | 擴充 |
| CONT-05 | PL 建立任務精靈（Step 1-4）整頁重新整理即遺失全部已填欄位（現況邊界，本輪新發現） | #3 | 原型層可驗 | 新增 |

### CONT-01｜標記員草稿在整頁重新整理後不遺失

- **Given** 標記員 A01（`annotator_id=kioleemg12`）在任務 T001 樣本 `sent-001` 已點擊「儲存草稿」（`ws-single-label-chip-positive` 已選取），尚未點擊「提交」
- **When** 以相同 URL 觸發整頁重新整理（`page.reload()` 或 `page.goto()` 相同組合 query params）
- **Then** 該題目控制項仍呈現先前選取值（`aria-pressed="true"`），且該樣本在 annotation-list 的狀態徽章仍為「已儲存」而非「已提交」
- **證據**：`design/prototype/pages/annotation/annotation-workspace.data.js:233-250`（`markSampleSaved`）將草稿寫入 `submissionBucketKey(taskId, role, runType, identity)`（`:162-167`）對應的 localStorage bucket；既有測試 `design/prototype/tests/annotation/annotation-workspace-save-draft.spec.ts:34-44`（`a saved draft restores after a full page reload (FR-026)`）已驗證同一情境的單一斷言版本
- **分類**：原型層可驗｜**關係**：擴充（既有測試已覆蓋核心行為，本情境用於跨角色驗收文件中重新引用同一 pattern，並補上清單狀態徽章的交叉核對，對照 `annotation-workspace-save-draft.spec.ts:46-56`）

### CONT-02｜標記員草稿在「離開再返回」（非單純 reload）後不遺失

- **Given** 標記員在 `sent-002` 儲存草稿後
- **When** 導覽至 `annotation-list.html`（`buildListUrl`），再導覽至同任務不同樣本 `sent-003`，最後導覽回 `sent-002`
- **Then** `sent-002` 的草稿內容與「已儲存」狀態仍在，且切換途中未寫入任何多餘的 `submitted` 事件
- **證據**：同 CONT-01 的資料層；`annotation-workspace-save-draft.spec.ts` 現有測試只驗證「reload」與「清單顯示已儲存」兩個獨立情境，未在**同一條**「離開→其他樣本→返回」路徑內串聯驗證
- **分類**：原型層可驗｜**關係**：擴充

### CONT-03｜審核員逐列決策在提交前不會被持久化（本輪新發現的邊界情況）

- **Given** 審核員 R01 在 T001 `sent-001` 的 official_run 審核頁，已點擊 `ws-review-row-approve`（`aria-pressed=true`）但尚未點擊 `ws-review-submit-btn`
- **When** 整頁重新整理
- **Then**（現況）逐列決策狀態全部回到未決策（`aria-pressed=false`）；已提交的紀錄不受影響
- **證據**：`design/prototype/pages/annotation/annotation-workspace.config.js:1628-1642` 的 `reviewRowDecisions`／`reviewRowOriginals`／`reviewRowSeeded` 為模組層 `var`（純記憶體狀態，非 localStorage），且審核模式**沒有**任何等效於標記員 `markSampleSaved` 的草稿持久化呼叫；`design/prototype/tests/annotation/annotation-workspace-save-draft.spec.ts:58-63`（`the save button is not offered in reviewer mode`）已間接證實審核員模式無「儲存草稿」按鈕，但目前沒有任何測試明確斷言「reload 會遺失尚未送出的逐列決策」這個具體後果
- **分類**：原型層可驗（驗證的是現況實際行為，不預設對錯）｜**關係**：新增
- **注意**：這是本輪新發現、未出現在 W1/W2/W3/追溯矩陣中的邊界情況（標記員有草稿持久化、審核員完全沒有，兩者不對稱）。是否需要補上「審核草稿持久化」屬產品決策，本文件僅記錄現況並建議階段四 triage 評估是否需要新增 Finding；本情境本身可直接實作（斷言現況行為），不需等待缺陷修正。

### CONT-04｜「重新登入」近似：相同身分識別參數換分頁後仍可讀回自己的提交

- **Given** 標記員 A01 已提交 T001 `sent-001`（`official_run`，`annotator_id=kioleemg12`）
- **When** 在同一 `BrowserContext` 另開一個新 `Page`，代入相同 `annotator_id=kioleemg12` 重新導覽至同一工作區 URL（模擬「登出後以同一帳號重新登入」）
- **Then** `getSampleStatus(...)` 回傳仍為 `submitted`，且該提交在 `getSampleHistory` 中可讀回，`actorId` 仍為 `kioleemg12`
- **證據**：`annotation-workspace.data.js:162-167`（bucket key 以 `identity` 而非 session 隔離）；既有 `design/prototype/tests/annotation/annotation-workspace-review-identity.spec.ts:105-131` 已用同一資料層 API 驗證身分維度，但目前所有既有測試都在**同一個 `page` 物件**內序列操作，沒有一個測試是用「兩個獨立 `Page`」模擬「重新登入後用新分頁繼續」
- **分類**：原型層可驗｜**關係**：擴充
- **限制標注**：prototype 無真實 session／JWT，本情境只驗證「以相同 identity 重新進入可讀到自己先前資料」，**不**驗證真實登入態、token 過期或跨裝置同步；正式全端 E2E 才需驗證 JWT session 失效後重新登入的資料一致性

### CONT-05｜PL 建立任務精靈整頁重新整理即遺失全部已填欄位（本輪新發現）

- **Given** PL 在 `task-new.html` Step 2（設定）已填入部分欄位（例如標籤、指引文字），尚未進入 Step 3
- **When** 整頁重新整理
- **Then**（現況）畫面回到 Step 1 空白狀態，已填欄位全部遺失
- **證據**：本輪核實 `grep -rln "localStorage" design/prototype/pages/task-management/task-new.html design/prototype/pages/task-management/task-new.config.js` 全庫查無結果（2026-08-19 核實），確認精靈本身完全沒有 draft 持久化機制；對照標記員草稿（`annotation-workspace.data.js:233-250`）與既有「離開分頁前未存草稿確認」模式（`design/prototype/tests/task-management/task-detail-review-settings.spec.ts:145` 的 `window.confirm` 攔截，見 §3 FAIL-03 佐證），task-new 精靈連「離開前提示」都沒有
- **分類**：原型層可驗｜**關係**：新增
- **注意**：本輪新發現、既有 11 筆 UX 發現與追溯矩陣皆未涵蓋。四步驟精靈通常為一次性短流程，是否需要草稿持久化屬於產品範圍決策；本情境僅陳述現況缺口，是否列入本輪驗收文件主線或另建 Finding，需主 agent／team-lead 裁決（有超出 W2 已列 11 筆發現範圍的風險，見文末未解決事項）。

---

## 2. 重複提交與不可逆操作

### 2.1 重複提交（不應產生重複資料）

| ID | 情境摘要 | 矩陣節點 | 分類 | 與既有測試關係 |
|---|---|---|---|---|
| DUP-01 | 標記員連續點擊「提交」兩次：狀態冪等，但 history 事件會重複累加 | #8／#10 | 原型層可驗 | 新增 |
| DUP-02 | 審核員連續點擊「送出審核」兩次：review unit 狀態冪等 | #11 | 原型層可驗 | 擴充 |
| DUP-03 | 資料隔離啟用時（無二次確認）連續點擊「發布試標」可能建立 2 筆試標回合（本輪新發現） | #6／#8 | 原型層可驗 | 新增 |
| DUP-04 | 同上，套用於「發布正式標記」 | #6／#10 | 原型層可驗 | 新增 |
| DUP-05 | 仲裁投票重複送出：`finalized_value` 冪等，但 `votes[]` 會累加重複投票紀錄（本輪新發現） | #12 | 原型層可驗 | 擴充 |

#### DUP-01｜標記員連續點擊「提交」不產生重複清單列，但 history 會重複追加事件

- **Given** 標記員已完整作答 `sent-001` 尚未提交
- **When** 連續快速觸發「提交」按鈕點擊兩次（`await Promise.all([page.getByTestId('ws-submit-btn').click(), page.getByTestId('ws-submit-btn').click()])` 或連續 `click()`）
- **Then** `getSampleStatus(...)` 僅回傳單一 `submitted` 狀態、annotation-list 只顯示一列樣本（不會因重複點擊產生第二筆清單項目）；但 `getSampleHistory(...)` 的陣列中會出現兩筆 `action: 'submitted'` 事件
- **證據**：`design/prototype/pages/annotation/annotation-workspace.config.js:1589-1618`（`handleSubmit`）每次呼叫都執行 `markSampleSubmitted(...)`；提交按鈕本身未設置 `disabled`／防抖保護（`:2949` 僅 `submitBtn.addEventListener('click', handleSubmit)`，中間無 debounce 或忙碌旗標）；`annotation-workspace.data.js:217-227`（`markSampleSubmitted`）以鍵值覆寫 `store[key][sampleId]`（不會產生第二筆記錄），但 `appendHistoryEvent`（`:206-215`）每次呼叫都會 push 新事件，無「已存在相同 submitted 事件則跳過」的去重邏輯
- **分類**：原型層可驗｜**關係**：新增（既有 `annotation-workspace-submit-validation.spec.ts` 只驗證欄位缺答阻擋，非重複點擊防抖，`w3-playwright-qa.md:200` 已指出此缺口）
- **意義**：「不產生重複資料」在清單/狀態層面成立（鍵值覆寫語意天然冪等），但 history 累積屬於本輪新發現的邊界情況，可能造成稽核紀錄（見矩陣節點 #15）膨脹，需在文件中明確記錄，不可籠統宣稱「已無重複提交風險」。

#### DUP-02｜審核員連續點擊「送出審核」不產生重複 review unit

- **Given** 審核員已對 `sent-001` 逐列決策完畢（`aria-pressed=true`）尚未送出
- **When** 連續快速點擊 `ws-review-submit-btn` 兩次
- **Then** `getReviewUnitStatus`（`annotation-review-unit`）維持單一終態，不因二次點擊而產生第二個 review unit 或第二筆 `approved`/`modified` 紀錄
- **證據**：延伸 DUP-01 相同的 `markSampleSubmitted`／`appendHistoryEvent` 路徑（審核員 `handleReviewSubmit` 最終仍呼叫同一組資料函式，見 `annotation-workspace.config.js:2600-2657`，`w2-ux-journey.md:146-149` 已引用該區塊）；既有 `design/prototype/tests/annotation/annotation-review-unit.spec.ts:109-376` 驗證五態機邊界但未含「同一 submit 動作重複觸發」情境
- **分類**：原型層可驗｜**關係**：擴充

#### DUP-03｜資料隔離啟用時，連續點擊「發布試標」可能建立 2 筆試標回合（本輪新發現）

- **Given** 任務狀態為 `draft`，且 `TASK_DATA.isolationEnabled = true`（資料隔離已啟用，因此不會觸發二次確認 `riskModal`）
- **When** PL 快速連續觸發「發布試標 R1」按鈕點擊兩次
- **Then**（期望）`TASK_DATA.trialRounds` 長度應為 1；（現況風險）`publishDryRun()`（`task-detail.html:8833-8859`）每次呼叫都無條件 `push` 一筆新回合物件到 `trialRounds`，且 click handler（`:9180-9188`）在 `isolationEnabled=true` 時完全跳過 `openRiskModal`，直接呼叫 `publishDryRun()`，函式本身也沒有「正在發布中」的忙碌旗標或按鈕 `disabled` 保護
- **證據**：`task-detail.html:8833-8859`（`publishDryRun`）、`:9180-9188`（click handler 的 isolation 分支）、`:8822-8831`（`canPublish()` 只驗證設定值，不含「是否已在發布中」的狀態鎖）
- **分類**：原型層可驗｜**關係**：新增（本輪核實 `grep -rn "dblclick\|debounce\|disable.*publish" tests/task-management/*.spec.ts pages/task-management/task-detail.html` 全庫查無結果，2026-08-19）
- **注意**：本輪新發現，非既有 F-0x 涵蓋範圍；直接呼應本任務項目「高影響操作的確認機制驗收」——當資料隔離關閉時已有 `riskModal` 二次確認可擋下大部分意外連點，但隔離**啟用**時完全沒有任何保護層，這正是最容易被忽略的分支。建議階段四 triage 評估是否需要新增 Finding（可能歸類 Bug）。

#### DUP-04｜同上，套用於「發布正式標記」

- 同 DUP-03 的邏輯與證據，改用 `publishOfficialRunBtn`／`publishOfficialRun()`（`task-detail.html:8861-8868`，同樣無忙碌旗標）
- **分類**：原型層可驗｜**關係**：新增

#### DUP-05｜仲裁投票重複送出：`finalized_value` 冪等，但 `votes[]` 會累加重複投票紀錄（本輪新發現）

- **Given** 仲裁者 R03 已對某爭議項目完成一輪投票並點擊「送出仲裁」
- **When** 以相同 `decisions` 重複觸發 `submitArbitration(...)`（例如快速連點送出按鈕，或 reload 後對同一批未變更的決策再次提交）
- **Then** `getArbitrationState(...)` 的 `finalized_value`／`finalized_by` 維持同一最終值（冪等），但 `item.votes[]` 陣列每次呼叫都會 `push` 一筆新投票紀錄，即使 `arbiter_id` 相同
- **證據**：`design/prototype/pages/annotation/annotation-workspace.data.js:1581-1599`（`submitArbitration`）第 1587-1592 行：`decisions.forEach` 內無論該 `itemId` 是否已有 `finalized_value`，都會 `item.votes.push(...)` 後覆寫 `finalized_value`/`finalized_by`，沒有「同一 arbiter 已投過票則跳過」的檢查
- **分類**：原型層可驗｜**關係**：擴充（既有 `design/prototype/tests/annotation/annotation-workspace-arbitration.spec.ts:103-237` 驗證多數決收斂規則，未涵蓋同一 arbiter 重複送出同一決策的 votes 陣列膨脹）
- **注意**：本輪新發現；`votes[]` 重複紀錄若未來被用於任何「每人一票」的稽核或統計邏輯，可能造成計數錯誤，建議階段四評估是否需要新增 Finding。

### 2.2 不可逆／高影響操作的確認機制

| ID | 情境摘要 | 矩陣節點 | 分類 | 與既有測試關係 |
|---|---|---|---|---|
| DUP-06 | 發布試標／正式標記（資料隔離關閉時）：二次確認 modal 正確攔截並可取消 | #6／#8／#10 | 原型層可驗 | 新增 |
| DUP-07 | 刪除任務：二次確認 modal 存在且可取消（正向對照組） | — | 原型層可驗 | 沿用 |
| DUP-08 | 「標記完成」無確認、無前置條件檢查（F-07，矩陣節點 #13） | #13 | 待缺陷修正後啟用 | 新增 |

#### DUP-06｜發布試標／正式標記在資料隔離關閉時觸發二次確認，取消不改變狀態

- **Given** 任務狀態為 `draft`，`TASK_DATA.isolationEnabled = false`
- **When** PL 點擊「發布試標」
- **Then** 觸發 `riskModal`（`aria-hidden="false"`）；點擊 `riskCancelBtn` 後 modal 關閉、`TASK_DATA.status` 仍為 `draft`（未發布）；點擊 `riskConfirmBtn` 才真正呼叫 `publishDryRun()` 並切換狀態
- **證據**：`task-detail.html:9180-9187`（`openRiskModal('publishDryRun')`）、`:9205-9216`（`riskCancelBtn`／`riskConfirmBtn` handler，取消不呼叫 `publishDryRun`）
- **分類**：原型層可驗｜**關係**：新增（既有 `task-detail-stage-flow.spec.ts` 測試完整 4 階段點擊流程，但未見專門驗證「取消二次確認不改變狀態」的負向情境）

#### DUP-07｜刪除任務二次確認（正向對照組，佐證「已有此類保護的模式可比照」）

- **Given** PL 於 `task-list.html` 點擊某任務的刪除操作
- **When** `deleteTaskModal` 顯示（`role="dialog" aria-modal="true"`），標題「確認刪除任務」、內文「確認將任務軟刪除？此操作可由管理端復原。」
- **Then** 點擊 `deleteTaskConfirmBtn` 才真正執行刪除；點擊背景遮罩或取消則不執行
- **證據**：`design/prototype/pages/task-management/task-list.html:467-476`（modal 結構）、`:1313-1318`（confirm/backdrop handler）
- **分類**：原型層可驗｜**關係**：沿用（若既有 `task-list` 相關 spec 已涵蓋此流程則直接沿用；本情境列入本文件用途是作為 DUP-08 的「已有正向設計可比照」佐證，並非全新缺口）

#### DUP-08｜「標記完成」目前無確認、無前置條件檢查（F-07）

- **Given** 任務狀態為 `official_run_in_progress`
- **When** PL 點擊「標記完成」按鈕
- **Then**（期望，D2 落地後）應先跳出二次確認 modal，且需檢查「正式標記全數提交／必要 review unit 已 finalize／無未解決 dispute／必要仲裁已完成」，任一未滿足則阻擋並列出具體原因；全數通過才將狀態切為 `completed`
- **現況**：`task-detail.html:9199-9202`（click handler 直接呼叫 `publishComplete()`，無 confirm modal，對照同一段程式碼 `:9183-9195` 的 `publishDryRun`/`publishOfficialRun` 在資料隔離關閉時至少有 `riskModal`）；`:8870-8876`（`publishComplete()` 直接 `TASK_DATA.status = 'completed'`，無任何前置檢查）
- **證據補充**：`w2-ux-journey.md:122-133`（F-07 原始發現）；`traceability-matrix.md:30`（矩陣節點 #13 判定「Requirement gap → 已決策 D2」）；`phase2-decision-list.md:47`（D2 決策內容）
- **分類**：**待缺陷修正後啟用**（正典條件已由 D2 裁決，但 ADR-022／014 尚未實際修訂落地）｜**關係**：新增
- **落地時機**：ADR-022／014 修訂 PR 合併、`publishComplete()` 加入前置檢查與 confirm modal 後，才可將本情境從「待缺陷修正後啟用」移至「原型層可驗」並實作；在此之前，驗收文件僅記錄情境設計，Playwright 斷言留白（沿用 `traceability-matrix.md:38` 的「Spec-defined (pending revision)」標記方式）。

---

## 3. 逾時與失敗復原（分層清單）

### 3.1 原型層可驗（必填缺漏／驗證錯誤訊息／安全出口與返回路徑）

| ID | 情境摘要 | 矩陣節點 | 分類 | 與既有測試關係 |
|---|---|---|---|---|
| FAIL-01 | 標記員缺答阻擋提交，錯誤面板標示，補齊後可送出 | #8／#10 | 原型層可驗 | 沿用 |
| FAIL-02 | 審核員未逐一決策阻擋送出，明確錯誤訊息 | #11 | 原型層可驗 | 沿用 |
| FAIL-03 | 抽樣／IAA 設定超出邊界值時顯示驗證錯誤且不儲存；離開未存分頁時原生 `confirm` 攔截 | #6 | 原型層可驗 | 沿用 |
| FAIL-04 | annotation-list：缺少或無效 `task_id` 顯示明確錯誤狀態並提供返回 dashboard 連結 | #2／#16 | 原型層可驗 | 沿用 |
| FAIL-05 | task-detail：無效 `task_id` 靜默 fallback 顯示 T001，無錯誤狀態（本輪新發現，與 FAIL-04 形成反例對照） | #2 | 原型層可驗 | 新增 |

#### FAIL-01｜標記員缺答阻擋提交

- **Given/When/Then**：沿用 `design/prototype/tests/annotation/annotation-workspace-submit-validation.spec.ts:26-114`（逐 output type 缺答時 `data-error="true"` 且提交被擋，`wsSubmitIncomplete` 提示訊息）
- **分類**：原型層可驗｜**關係**：沿用（跨角色驗收文件僅需在主線流程的「A01 送出試標」步驟引用此既有斷言，不需重造）
- **證據**：`annotation-workspace.config.js:1589-1602`（`handleSubmit` 缺答分支）

#### FAIL-02｜審核員未逐一決策阻擋送出

- **Given/When/Then**：沿用 `design/prototype/tests/annotation/annotation-workspace-review-shortcuts.spec.ts:173-182`（`reviewer: the shortcut routes to 送出審核, not 提交` 一測內含「未決策時送出顯示『請完成每位標記員的審核決策』」的斷言）
- **分類**：原型層可驗｜**關係**：沿用

#### FAIL-03｜抽樣／IAA 設定邊界值驗證與離開分頁未存草稿確認

- **Given/When/Then**：沿用 `design/prototype/tests/task-management/task-detail-sampling-edit.spec.ts:89,105`（target agreement 上下界驗證）；離開未存分頁確認沿用 `design/prototype/tests/task-management/task-detail-review-settings.spec.ts` 對 `window.confirm` 對話框的攔截與接受/取消兩分支（`page.on('dialog', ...)` pattern）
- **分類**：原型層可驗｜**關係**：沿用（跨角色文件需要在「PL 修改抽樣設定」步驟引用此既有斷言作為安全出口的一環，不需重造斷言邏輯本身）

#### FAIL-04｜annotation-list 缺少／無效 `task_id` 的安全出口（issue #154 已修正的正向對照）

- **Given/When/Then**：沿用 `design/prototype/tests/annotation/annotation-list-routing.spec.ts:54-86`——缺少 `task_id` 顯示「未指定任務」（`:64-70`）、無效 `task_id` 顯示「任務代碼 T999-DOES-NOT-EXIST 不存在」（`:80-85`），兩者皆提供 `list-not-found-dashboard-link` 可導回 dashboard
- **分類**：原型層可驗｜**關係**：沿用（此為 2026-08-18 才修正的正向案例，commit `bbde53e`／PR #154，見 repo 最近提交紀錄）

#### FAIL-05｜task-detail 無效 `task_id` 靜默 fallback（本輪新發現，與 FAIL-04 形成反例對照）

- **Given** PL 導覽至 `task-detail.html?task_id=T999-DOES-NOT-EXIST`（任務不存在）
- **When** 頁面載入
- **Then**（期望，對照 FAIL-04 已修正的模式）應顯示「任務代碼不存在」錯誤狀態並提供返回 dashboard 連結；（現況）`resetTaskData()` 靜默 fallback 為 `T001`（`task-detail.html:4346-4357` 第 4353-4357 行：`if (!listEntry || !profile) { resolvedId = 'T001'; ... }`），使用者會看到完整的 T001（醫療文本情感分類）任務內容，卻無從得知自己要找的任務其實不存在
- **證據**：`task-detail.html:4342-4389`（`resetTaskData`）；本輪核實 `grep -n "task-not-found\|taskNotFound\|not_found\|not-found" pages/task-management/task-detail.html tests/task-management/*.spec.ts` 全庫查無結果（2026-08-19）
- **分類**：原型層可驗｜**關係**：新增
- **注意**：本輪新發現，未出現在 W1/W2/W3/追溯矩陣中。與 annotation-list.html 已修正的同類別問題（FAIL-04／PR #154）形成直接反例對照，建議階段四 triage 評估是否需要新增 Finding（可能歸類 Bug，因與同專案內已修正的姊妹頁面行為不一致，屬於一致性缺陷）。

### 3.2 正式 E2E 才可驗（依賴真實後端／網路層，prototype 無法有意義驗證）

以下情境**不**在本輪 prototype 驗收文件內設計 Playwright 斷言，僅列出項目與理由，供正式全端 E2E（`e2e/[module]/`，待 D1 後續 `[Task]` issue 決議路徑）規劃時承接：

| 項目 | 理由 |
|---|---|
| FAIL-D01 API 逾時（例如提交標記時後端逾時未回應） | prototype 沒有真正的網路請求；「逾時」只能模擬成 locator 等待逾時後仍未出現預期狀態，不等同真正的 HTTP timeout/retry 行為（`w3-playwright-qa.md:201`） |
| FAIL-D02 Network error（連線中斷／DNS 失敗／CORS 錯誤） | 無真實 fetch/XHR 呼叫可攔截失敗 |
| FAIL-D03 伺服器 5xx 錯誤回應與前端錯誤邊界（error boundary）處理 | 無後端可回傳 5xx |
| FAIL-D04 JWT session 過期後續請求 401 → 導回登入頁並保留原始意圖 URL | prototype 登入不驗證帳密、無 JWT（`login.html:687-736`），角色靠 query params／scenario 切換模擬（ADR-021 提及 task role 即時查 `task_membership`，但 prototype 未實作） |
| FAIL-D05 Celery／非同步分數計算任務失敗或重試（IAA gate 計算逾時） | 依賴被本輪排除的 dataset 016/017 模組介面（矩陣節點 #9 已標示 boundary case） |
| FAIL-D06 樂觀鎖／版本衝突（同筆資料被伺服器判定為過期寫入而拒絕） | prototype 無伺服器端版本控制或鎖機制，只有 localStorage 覆寫語意 |

**分類**：正式 E2E 才可驗｜**關係**：N/A（不適用「沿用/擴充/新增」，因目前無 prototype 對應物）

---

## 4. 多人同時操作（以 localStorage 重新載入對帳近似）

Prototype 無後端，無法驗證真正的並發寫入 race condition；本節設計採用「同一 `BrowserContext`、多個 `Page`」策略（`w3-playwright-qa.md` §2.3／§3.1 已建議的折衷方案），以「操作交錯 + 重新整理後對帳」近似多人同時操作，並在每個情境明確標注此為近似而非真正併發驗證。

| ID | 情境摘要 | 矩陣節點 | 分類 | 與既有測試關係 |
|---|---|---|---|---|
| CONC-01 | 兩位審核員（R01/R02）各自 Page 審核同一標記員：提交前互不可見 | #11 | 原型層可驗（近似） | 擴充 |
| CONC-02 | PL 停用某標記員的同時，該標記員的 Page 正在標記：兩端各自重新整理後資料收斂一致 | #7×#8／#10 | 原型層可驗（近似） | 新增 |
| CONC-03 | 兩位標記員（A01/A02）各自 Page 真正同時寫入草稿：bucket 隔離在平行事件下不互相覆寫 | #10 | 原型層可驗（近似） | 擴充 |

### CONC-01｜兩位審核員各自 Page 審核同一標記員：提交前互不可見

- **Given** 同一 `BrowserContext` 開兩個 `Page`：`r01Page`（`reviewer_id=reviewer_wang`）與 `r02Page`（`reviewer_id=reviewer_li`），皆導覽至 T001／`sent-001`／`official_run` 審核頁
- **When** `r01Page` 點擊「通過」但**尚未**點擊「送出審核」
- **Then** `r02Page` 重新整理／重新查詢 `getSampleHistory(...)` 後仍看不到 R01 的任何事件（因尚未提交，`markSampleSubmitted` 才寫入 history，見 `annotation-workspace.data.js:217-227`）；待 `r01Page` 點擊送出後，`r02Page` 重新整理才看得到 R01 的紀錄（無即時推播）
- **證據**：`annotation-workspace-review-identity.spec.ts:87-93`（`two reviewers on the same annotator keep independent submission buckets`）已用同一資料層 API 驗證身分隔離，但目前寫法是**同一 `page`** 序列切換 `reviewer_id` query param（`approveAndSubmitAsReviewer` helper 每次都 `page.goto(...)`），並非兩個**真正同時存在**的 `Page` 物件交錯操作；本輪核實 `grep -rn "addEventListener('storage'" design/prototype/pages/` 全庫查無結果——即使 localStorage 寫入在瀏覽器規範下會讓「其他分頁」收到 `storage` 事件，這個 prototype 完全沒有監聽該事件做即時 UI 更新，所以任何跨 Page 的資料變化都必須靠手動 reload／重新導覽才會反映在畫面上，這正是本情境「重新整理後對帳」設計的依據
- **分類**：原型層可驗（近似）｜**關係**：擴充（既有測試驗證資料層 API，本情境改用兩個真正並存的 Page 驗證同一件事，並額外驗證「無即時推播、需手動 reload」這項基礎設施限制）
- **限制標注**：真正意義上的「兩人同時點擊送出」寫入 race condition，在沒有後端鎖的 prototype 層無法被有意義地驗證，明確排除，留給正式全端 E2E（`w3-playwright-qa.md:203`）

### CONC-02｜PL 停用標記員與該標記員同時標記：兩端重新整理後收斂一致

- **Given** `plPage` 於 `task-detail.html` 成員管理面板，`a01Page` 同時在該標記員身分下標記 T001
- **When** `plPage` 執行「停用標記員」（沿用 `design/prototype/tests/task-management/task-detail-review-assignment.spec.ts:134` 已驗證的停用審核員 pattern，套用到標記員角色——目前該檔案僅涵蓋審核員停用，`w3-playwright-qa.md:50-51` 已指出「停用標記員」本身就是既有覆蓋缺口），`a01Page` 在同一時間點擊「提交」
- **Then** `a01Page` 的提交仍成功寫入（prototype 層無伺服器端即時中斷機制）；`plPage` 重新整理成員管理面板後應看到「已停用」狀態，且該標記員最後一筆提交的紀錄仍完整可見於 `task-detail-review-history` 面板（不因停用而遺失稽核痕跡）
- **分類**：原型層可驗（近似）｜**關係**：新增
- **限制標注**：「停用後是否應立即阻擋該標記員後續操作」屬於正式後端權限即時生效的語意（RBAC），prototype 層無法驗證即時性，只能驗證「重新整理後兩端資料一致」這個弱化版本

### CONC-03｜兩位標記員真正同時寫入草稿：bucket 隔離在平行事件下不互相覆寫

- **Given** 同一 `BrowserContext` 開兩個 `Page`：`a01Page`（`annotator_id=kioleemg12`）與 `a02Page`（`annotator_id=113450022`），皆導覽至 T001／`sent-001` 工作區
- **When** 用 `Promise.all([a01Page.getByTestId('ws-save-btn').click(), a02Page.getByTestId('ws-save-btn').click()])` 真正平行觸發兩個 Page 的儲存草稿動作（而非依序各自序列操作）
- **Then** 兩人的草稿分別寫入各自的 `submissionBucketKey`（含 `annotatorId` 維度），互不覆寫；`a01Page` 重新整理後仍讀到自己的草稿內容，`a02Page` 亦然
- **證據**：`annotation-workspace.data.js:162-167`（`submissionBucketKey` 含 `annotatorId` 維度）；既有 `annotation-workspace-review-identity.spec.ts` 的驗證都是單一 `page` 換 URL 的**序列**操作，非兩個真正同時存在的 `Page` 用 `Promise.all` 觸發的**平行**事件
- **分類**：原型層可驗（近似）｜**關係**：擴充
- **技術細節提醒**（沿用 `w3-playwright-qa.md:249` 已記錄的待確認風險）：若兩個角色的 Page 同時對同一個 `*.data.js` 呼叫 `page.route()`（`patchDataFile`）攔截，route handler 是 per-Page 註冊，理論上不會互相覆蓋，但本情境若需要用 `patchDataFile` 植入額外 fixture，須在實作時具體驗證這點，本輪僅記錄提醒。

---

## 5. 鍵盤與無障礙

### 5.1 既有覆蓋盤點（沿用基礎）

- 鍵盤快捷鍵：`design/prototype/tests/annotation/annotation-workspace-action-shortcuts.spec.ts`（Alt+Arrow 移動、Ctrl+S 儲存、Ctrl+Enter 提交，含瀏覽器原生 Back 行為的 `preventDefault` 驗證，`:93-120`）、`annotation-workspace-review-shortcuts.spec.ts`（A/R 審核決策、Shift+A/R 已停用、輸入框內打字不誤觸快捷鍵，`:107-118`）
- 語系化 aria-label：`annotation-relation-identification-accessibility.spec.ts:5-25`（`undo` 按鈕的 `aria-label` 隨語言切換，`撤銷`／`Undo`）——**僅涵蓋一個按鈕的一個屬性**，不涵蓋 focus 管理
- 這些既有測試多用 `getByTestId(...)` 斷言 `aria-pressed`／`aria-label` 屬性值，**未**使用 `page.getByRole(...)` 做「角色 + 可及名稱」的複合斷言（矩陣任務要求「可讀名稱(getByRole 可及性即斷言)」，見 `.claude/rules/testing-e2e.md` 「使用 `page.getByRole()`／`page.getByLabel()`／`page.getByText()`」的規範）

### 5.2 焦點管理缺口（F-11，本輪確認**未被納入追溯矩陣任何節點**）

- 本輪核實 `traceability-matrix.md` 全文 `grep -n "F-11"` 查無結果——F-11（`w2-ux-journey.md:196-207`：關鍵 modal 缺乏 focus trap／初始焦點／焦點歸還）是階段一 W2 的既有發現，但階段二整合追溯矩陣時**未**被指派任何矩陣節點編號，屬於本輪核實出的文件缺口。本文件依 F-11 原始證據回溯對應的流程節點（#3 刪除任務、#6 資料隔離風險確認、#8 強制指引），供階段四建單時參考。

| ID | 情境摘要 | 矩陣節點（回溯對應） | 分類 | 與既有測試關係 |
|---|---|---|---|---|
| A11Y-01 | 強制指引 modal（`#wsGuidelineModal`）開啟時焦點自動移入，Tab 循環侷限於 modal 內，關閉後焦點歸還 | #8（回溯，F-11 無原矩陣節點） | 待缺陷修正後啟用 | 新增 |
| A11Y-02 | 資料隔離風險確認 modal（`#riskModal`）與刪除任務 modal（`#deleteTaskModal`）同樣缺乏 focus trap | #6／#3（回溯） | 待缺陷修正後啟用 | 新增 |
| A11Y-03 | 高影響操作按鈕（發布試標／正式標記／標記完成）為原生 `<button>`，鍵盤 Enter/Space 可觸發，與滑鼠點擊行為一致 | #6／#8／#10／#13 | 原型層可驗 | 新增 |
| A11Y-04 | 標記員快捷鍵操作後，目標控制項可用 `getByRole` 以可及名稱定位（而非僅 `getByTestId`） | #8／#10 | 原型層可驗 | 擴充 |
| A11Y-05 | 審核員 A/R 快捷鍵操作後，通過/退回按鈕可用 `getByRole('button', { name: ... })` 定位並驗證 `aria-pressed` | #11 | 原型層可驗 | 擴充 |

#### A11Y-01｜強制指引 modal 焦點管理（待 F-11 修正後啟用）

- **Given** 標記員第一次進入任務工作區，強制指引 modal（`#wsGuidelineModal`）顯示
- **When** 使用者以純鍵盤操作（不使用滑鼠）
- **Then**（期望，F-11 修正後）modal 開啟時焦點自動落在 modal 內第一個可互動元素（如確認按鈕）；`Tab`／`Shift+Tab` 循環侷限在 modal 內，不會落到背景頁面的元素上；按 `Esc` 或點擊確認按鈕關閉後，焦點應歸還給觸發 modal 的元素（若無明確觸發元素，則歸還至頁面主要內容區）
- **現況**：本輪核實 `grep -rn "\.focus\(\)" design/prototype/pages/task-management/task-detail.html design/prototype/pages/task-management/task-list.html design/prototype/pages/annotation/annotation-workspace.config.js design/prototype/pages/annotation/annotation-workspace.html` 全庫查無任何命中（與 `w2-ux-journey.md:199` 原始核實結果一致），確認 F-11 至今尚未修正
- **證據**：`design/prototype/pages/annotation/annotation-workspace.html:755-762`（modal 結構）；`design/prototype/pages/annotation/annotation-workspace.config.js:2812-2836`（`setupGuidelineModal`，僅切換 `display`/`class`，無焦點操作）
- **分類**：**待缺陷修正後啟用**（F-11／`w2-ux-journey.md:196-207`）｜**關係**：新增
- **落地時機**：F-11 修正 PR（統一為所有 `role="dialog"` modal 加上 focus trap 共用邏輯，`w2-ux-journey.md:207` 已提出建議）合併後，才可將本情境從「待缺陷修正後啟用」移至「原型層可驗」並實作

#### A11Y-02｜資料隔離風險確認 modal 與刪除任務 modal 同樣缺乏 focus trap（沿用同一 F-11 證據）

- 情境結構同 A11Y-01，套用對象改為 `#riskModal`（`task-detail.html:8808-8820`，`openRiskModal`/`closeRiskModal` 同樣只切換 `class`/`aria-hidden`）與 `#deleteTaskModal`（`task-list.html:467-476`）
- **分類**：**待缺陷修正後啟用**｜**關係**：新增
- **注意**：DUP-07（§2.2）已將 `#deleteTaskModal` 列為「二次確認流程存在」的正向對照組——**該正向結論僅限於「是否會誤觸發刪除」這個功能面向**，不代表其無障礙面向（焦點管理）也合格；兩者判定範疇不同，撰寫驗收文件時需避免讀者誤以為 DUP-07 已涵蓋 A11Y-02。

#### A11Y-03｜高影響操作按鈕的鍵盤可操作性（正向控制組）

- **Given** PL 以 `Tab` 鍵導覽至「發布試標」按鈕（`focus()` 落在該元素）
- **When** 按下 `Enter` 或 `Space`
- **Then** 觸發與滑鼠點擊相同的 `publishActionRow` click 事件委派邏輯（原生 `<button type="button">` 語意，瀏覽器對 `Enter`/`Space` 自動觸發 `click` 事件），行為與 DUP-06 的滑鼠點擊版本一致
- **證據**：`task-detail.html:5315,5320,5325,5330`（`actionRow.innerHTML` 皆使用 `<button class="btn ..." type="button" id="...">`，非 `<div onclick>`）
- **分類**：原型層可驗｜**關係**：新增（正向控制組，用於在文件中明確區分「原生語意天然可鍵盤操作」與 A11Y-01/02「modal 焦點管理缺陷」兩類不同性質的無障礙問題，避免驗收報告籠統寫成「鍵盤操作有問題」）

#### A11Y-04／A11Y-05｜以 `getByRole` 補強既有快捷鍵測試的可及名稱斷言

- **Given/When**：沿用 `annotation-workspace-action-shortcuts.spec.ts`／`annotation-workspace-review-shortcuts.spec.ts` 既有的快捷鍵觸發步驟（例如 `Control+s`、`a`/`r` 按鍵）
- **Then**：在既有 `getByTestId(...)` 斷言之外，**擴充**一組 `page.getByRole('button', { name: <可及名稱> })` 的等價斷言（例如 `page.getByRole('button', { name: '通過' })`／`page.getByRole('button', { name: '儲存草稿' })`），確保這些互動元素不僅有正確的 `data-testid`，也具備語意正確、可被螢幕報讀器辨識的可及名稱（role + accessible name），呼應 `.claude/rules/testing-e2e.md` 「優先使用 `getByRole()`」的規範與本任務項目「可讀名稱(getByRole 可及性即斷言)」的要求
- **分類**：原型層可驗｜**關係**：擴充（不取代既有 `getByTestId` 斷言，作為無障礙面向的補充斷言，雙軌並存——沿用既有套件慣例、不強行遷移既有 96 個 spec 檔的既有斷言風格，避免不必要的大範圍重構）

---

## 6. i18n 與 Responsive

### 6.1 既有覆蓋盤點

- i18n（UI chrome，非資料內容）：`design/prototype/tests/annotation/annotation-workspace-i18n.spec.ts:14-74`（note 標籤/placeholder、驗證錯誤訊息、multi_label 選取上限提示皆隨 `labelsuite.lang` 切換）；`task-management/task-new-i18n.spec.ts`、`task-management/task-detail-run-control-i18n.spec.ts`、`task-management/task-detail-work-log-i18n.spec.ts`（依 12.4 CONDITIONAL 清單，本輪僅核實檔案存在，未逐檔精讀）
- 全站語言切換一致性：`design/prototype/tests/shared/language-switch-consistency.spec.ts:26-102`——8 個共用元件頁面（dashboard／admin／account 系列）統一使用 `LabelSuiteSharedSidebar.applyGlobalLanguage(...)`，禁止直接寫 `document.documentElement.lang` 或繞過 `setStoredLang`；另涵蓋手機版語言切換（375×812 viewport，`:46-62`）
- Responsive：`design/prototype/tests/annotation/annotation-mobile-collapsed-layout.spec.ts:4-23`（僅涵蓋**標記員**工作區，390×844，指引面板收合後內容欄仍保持單欄寬度）；`design/prototype/tests/shared/mobile-top-actions.spec.ts:63-73`（375×812，共用導覽列頂部操作叢集樣式一致性，橫跨 dashboard／annotation-list／dataset-analysis-list／profile／user-management 5 個頁面，但只驗證樣式尺寸，非功能性佈局）

### 6.2 驗收輪需新增的檢查點

| ID | 情境摘要 | 矩陣節點 | 分類 | 與既有測試關係 |
|---|---|---|---|---|
| I18N-01 | 跨角色旅程共享 context 下，語言切換在角色交接後仍保持一致（PL 切 EN 後，新開的標記員 Page 亦為 EN） | 全節點（跨角色主線） | 原型層可驗 | 擴充 |
| I18N-02 | 指引面板（guideline panel）標籤文字隨語言切換（不含 F-02 已知的附件內容錯置問題） | #5 | 原型層可驗 | 新增 |
| I18N-03 | 審核員文案（「退回」語意）中英文版本一致更新（F-08a 修正後） | #11 | 待缺陷修正後啟用 | 新增 |
| RESP-01 | 審核員工作區（reviewer 角色）行動裝置版面折疊佈局，比照標記員版本 | #11 | 原型層可驗 | 擴充 |
| RESP-02 | task-detail 概覽面板（PL 發布操作、狀態徽章）在行動裝置寬度下可操作、不溢出 | #6／#8／#10／#13 | 原型層可驗 | 新增 |
| RESP-03 | 成員管理／審核設定面板在行動裝置寬度下表單控制項可操作 | #6／#7 | 原型層可驗 | 新增 |

#### I18N-01｜跨角色旅程共享 context 下語言切換一致性

- **Given** 跨角色驗收文件採用「單一共享 `BrowserContext` + 每角色一個 `Page`」策略（`w3-playwright-qa.md` §3.1）；PL 的 Page 透過共用 sidebar 語言切換為 EN（`labelsuite.lang=en` 寫入 localStorage）
- **When** 標記員在同一 `BrowserContext` 另開新 `Page` 導覽至工作區
- **Then** 新 Page 應直接以 EN 呈現（因語言設定同樣是 per-origin localStorage key，與提交資料使用相同的跨 Page 共享機制）
- **證據**：`shared/language-switch-consistency.spec.ts:27-44`（驗證的是同一 page 內的語言切換行為，未涵蓋「新開一個 Page 是否繼承已切換的語言」這個跨 Page 情境）；`annotation-workspace-i18n.spec.ts:16-19`（`beforeEach` 用 `page.addInitScript` **手動**寫入 `labelsuite.lang=en`，等同於每個測試各自模擬「已是 EN」的起始狀態，而非驗證「從另一個 Page 切換後傳遞過來」的真實跨 Page 情境）
- **分類**：原型層可驗｜**關係**：擴充

#### I18N-02｜指引面板標籤文字語系化（不含 F-02 附件內容問題）

- **Given** 標記員開啟工作區右側「說明」分頁（`wsTabGuideline`，見 `w2-ux-journey.md:34`）
- **When** 切換語言為 EN
- **Then** 面板標題／區塊標籤（非附件檔案本身的內容）應正確顯示英文
- **範圍界定**：本情境**不**驗證附件圖片/PDF 內容是否與任務類型相符（該問題已由 F-02 追蹤，`traceability-matrix.md:22` 矩陣節點 #5 已標記「指引檔案存在性 assertion；附件對應任務類型待修正後補」），僅驗證面板本身的 UI chrome 語系化是否正確，避免與 F-02 的驗收範疇混淆
- **分類**：原型層可驗｜**關係**：新增

#### I18N-03｜審核員文案雙語一致性（待 F-08a 修正後啟用）

- **Given** F-08a（`dashboard.html:163,180`、`sidebar.js:48,512` 仍用「退回」舊語意文案）修正後，審核員相關文案改為符合「獨立審核＋直接修正＋仲裁」新模型的措辭
- **When** 切換語言為 EN／保持 ZH
- **Then** 兩語言版本的新文案應一致更新（不應只改中文漏改英文，或反之）
- **證據**：`w2-ux-journey.md:139-143`（F-08a 原始發現）；`design/prototype/pages/dashboard/dashboard.i18n.js:52,68`（同一文案的 i18n 來源，中英文皆需檢查）
- **分類**：**待缺陷修正後啟用**（F-08a）｜**關係**：新增

#### RESP-01｜審核員工作區行動裝置版面（比照標記員版本擴充）

- **Given/When/Then**：比照 `annotation-mobile-collapsed-layout.spec.ts:4-23` 的既有 pattern（390×844 viewport，指引面板收合，內容欄寬度占比 > 90% body 寬度），改用 `role=reviewer` 導覽至同一任務的審核頁，驗證通過/退回按鈕列與逐列決策 UI 在收合後同樣維持單欄可操作寬度，不因多一組操作按鈕（相較標記員的作答欄位）而溢出或被截斷
- **證據**：本輪核實 `grep -rln "setViewportSize" design/prototype/tests/annotation/*.spec.ts` 僅命中 `annotation-mobile-collapsed-layout.spec.ts` 一個檔案，且該檔案固定使用 `role`（未指定，預設 `annotator`，見 `_workspace-helpers.ts:34`），確認目前完全沒有審核員視角的行動裝置版面測試
- **分類**：原型層可驗｜**關係**：擴充

#### RESP-02｜task-detail 概覽面板行動裝置版面

- **Given** PL 在行動裝置寬度（375×812 或 390×844）開啟 `task-detail.html` 概覽面板
- **When** 檢視狀態徽章與「發布試標／正式標記／標記完成」操作按鈕列（`#publishActionRow`）
- **Then** 操作按鈕應完整可見、可點擊，不因版面收縮而被裁切或需要橫向捲動才能觸及
- **證據**：本輪核實 `grep -rln "setViewportSize" design/prototype/tests/task-management/*.spec.ts` 命中 `task-list-output-types.spec.ts`／`task-new-multi-label-taxonomy.spec.ts`／`task-new-single-label-layout.spec.ts` 三檔，皆與 `task-detail.html` 概覽/發布操作面板無關（用途分別是任務清單輸出類型欄位與 task-new 精靈的標籤佈局），確認 task-detail 概覽面板目前完全無行動裝置版面測試
- **分類**：原型層可驗｜**關係**：新增

#### RESP-03｜成員管理／審核設定面板行動裝置版面

- **Given** PL 在行動裝置寬度開啟成員管理面板（新增成員／停用成員）與審核設定面板（最低審核員人數、仲裁開關）
- **When** 操作表單控制項（輸入框、切換開關、下拉選單）
- **Then** 各控制項應可正常聚焦與操作，觸控熱區不重疊
- **證據**：`design/prototype/tests/task-management/task-detail-member-management-add.spec.ts`、`task-detail-review-settings.spec.ts` 皆未见 `setViewportSize` 呼叫（本輪核實同上 grep 結果），確認無行動裝置覆蓋
- **分類**：原型層可驗｜**關係**：新增

---

## 7. 情境總表（依分類統計）

| 分類 | 情境數 |
|---|---|
| 原型層可驗 | 28 |
| 待缺陷修正後啟用 | 4（DUP-08／A11Y-01／A11Y-02／I18N-03） |
| 正式 E2E 才可驗 | 6（FAIL-D01～FAIL-D06，未計入編號情境總數） |
| **編號情境合計**（不含 FAIL-D 系列） | **32** |

依章節分布：操作連續性 5（CONT-01～05，全數原型層可驗）／重複提交與不可逆操作 8（DUP-01～08，7 原型層可驗＋1 待缺陷修正後啟用）／逾時與失敗復原 5（FAIL-01～05，全數原型層可驗）＋ 正式 E2E 清單 6 項（FAIL-D01～06，不編號為主線情境）／多人同時操作 3（CONC-01～03，全數原型層可驗-近似）／鍵盤與無障礙 5（A11Y-01～05，2 待缺陷修正後啟用＋3 原型層可驗）／i18n 與 responsive 6（I18N-01～03、RESP-01～03，1 待缺陷修正後啟用＋5 原型層可驗）。

---

## 8. 未解決事項與需主 agent 裁決

1. **F-11 未被納入追溯矩陣任何節點**（本輪新核實）：`traceability-matrix.md` 全文查無 `F-11`，導致 A11Y-01／A11Y-02 只能由本文件自行回溯對應節點（#3／#6／#8）。建議階段四 triage 時明確補上矩陣列，或在建 issue 時直接引用本文件的回溯對應，避免 F-11 在後續追蹤中遺失。
2. **本輪新發現、未出現在 W1/W2/W3/追溯矩陣中的邊界情況**（共 6 項，均已在對應章節標注「本輪新發現」）：
   - CONT-03（審核員逐列決策提交前無草稿持久化，與標記員不對稱）
   - CONT-05（task-new 建立精靈整頁重新整理即遺失全部進度，無任何離開前提示）
   - DUP-03／DUP-04（資料隔離啟用時，發布試標／正式標記按鈕連續點擊可能建立 2 筆回合，因跳過 `riskModal` 二次確認且無忙碌旗標）
   - DUP-05（仲裁投票重複送出時 `votes[]` 陣列會累加重複紀錄）
   - FAIL-05（task-detail 對無效 `task_id` 靜默 fallback 為 T001，無錯誤狀態，與 annotation-list.html 已修正的同類問題形成不一致）
   這些均屬 senior-qa 依現況程式碼核實所得的邊界情況描述，**不**由本文件自行判定 Bug／Enhancement 分類或建立 Finding ID（該分配權屬階段四 triage 流程）；請主 agent／team-lead 決定是否：(a) 直接併入階段四既有 Finding 清單建立新編號、(b) 視為本文件的補充範圍註記留待驗收輪執行時再議、或 (c) 需要回頭知會 W1/W2 工作流補登。
3. **CONT-05（task-new 精靈無草稿持久化）的範圍界定**：是否屬於本輪「錯誤/邊界情境」驗收文件的必要主線情境，或應視為超出 W2 已列 11 筆發現範圍的產品需求討論，需主 agent 裁決是否保留在最終版驗收文件中。
4. **DUP-06（正向對照組）與 A11Y-02 的判定範疇差異**已在文件內明確加註提醒（同一個 `#deleteTaskModal`，功能面「有二次確認」成立，但無障礙面「缺 focus trap」仍不成立），建議階段三彙整最終版文件時保留此提醒文字，避免被後續讀者簡化為單一結論。
5. 本文件全部情境的 Playwright 斷言尚未實作（依任務範圍要求），「待缺陷修正後啟用」的 4 項（DUP-08／A11Y-01／A11Y-02／I18N-03）在對應缺陷修正 PR 合併前不可標記為可執行任務。
