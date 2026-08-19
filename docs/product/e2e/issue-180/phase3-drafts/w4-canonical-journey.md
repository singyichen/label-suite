# Issue #180 W4 — 正典跨角色旅程 Playwright 驗收情境設計（草稿）

角色：`senior-qa`｜狀態：**規劃草稿，尚未實作任何 `.spec.ts`**｜範圍：`account`／`dashboard`／`task-management`／`annotation`（排除 `dataset` 分析模組）

本文件正典依據：`specs/task-management/013-task-new/spec.md`、`specs/task-management/014-task-detail/spec.md`、`specs/annotation/015-annotation-workspace/spec.md`、`docs/product/reviewer-model-redesign.md`；PRD／IA／story-map／impact-map／baseline summary 五份產品全景文件在審核員模型重構相關章節視為**已知過期**（phase2 決策 D4）。

---

## 0. 文件性質與分層限制聲明

1. **BrowserContext 策略**（依 `traceability-matrix.md` 主 agent 裁決 #2、`w3-playwright-qa.md` §2.3／§3.1）：本輪一律採「**單一共享 `BrowserContext` ＋ 每角色一個 `Page`**」，非獨立 context／`storageState` per-role。理由：prototype 無後端，獨立 context 會使 `labelsuite.wsSubmissions`／`labelsuite.wsArbitration` 等 localStorage bucket 互相不可見，流程會在「PL 看不到標記員剛送出的試標」直接斷裂。`storageState` 僅用於情境開始前一次性植入固定 fixture，不用於角色間隔離。issue 原文「角色獨立 BrowserContext」語意保留給正式全端 E2E（真 JWT session）。
2. **四類斷言的分層意義**：
   - **UI 斷言**：`data-testid` / `id` 選擇器狀態（`toBeVisible`／`toHaveText`／`toHaveAttribute` 等）。
   - **URL 斷言**：`page.url()` query string 契約。
   - **資料狀態斷言**：`page.evaluate` 呼叫 `window.LabelSuiteAnnotationWorkspaceData.*`（`getSampleStatus`／`getReviewUnitStatus`／`getArbitrationState`／`getDisputeItems`／`getSampleHistory`）等既有匯出函式；這是「呼叫一個沒有網路層的本地 API」，**不能宣稱驗證了真正的後端 API 回應或資料庫狀態**（`w3-playwright-qa.md` §2.5-3）。
   - **audit log 斷言**：prototype 全庫無 audit log 概念（`grep -rln "audit" design/prototype/` 查無結果，`w3-playwright-qa.md` §4.2-2；matrix 節點 15）。本文件所有步驟此欄位一律標記 **N/A — 待正式全端 E2E（ADR-019）**；`work-log`／`review-history` 面板只能作為「顯示對應事件」的替代佐證，不得誤讀為已完成稽核紀錄驗收。
3. **D2/D3 標注慣例**：涉及「完成」節點前置條件（D2）與「成員不足阻擋發布」（D3）的步驟，因對應 FR 尚未落地（僅完成使用者裁決，ADR-022／014 修訂另立階段四 issue），一律標注 **「Spec-defined (pending revision)」**：GWT 情境依裁決後的正典條件撰寫，但對應原子測試目前對 prototype 執行會 **FAIL**（documents-the-gap，充當修正落地後的迴歸測試），不得誤判為既有測試套件的 regression。
4. **IAA gate 邊界**：本文件的 IAA 驗收僅涵蓋「指標可用、負責人可判讀、可退回或進入正式回合」最小 gate（issue 邊界例外第 38 條），不涉及 IAA 數值計算本身（屬 `dataset` 016/017，本輪排除）。

---

## 1. 角色與測試資料前提

| 角色 | 身分 | Query params 慣例 | 備註 |
|---|---|---|---|
| PL01 | 專案負責人 | Dashboard `.scenario-pill[data-scenario="project_leader"]`（`dashboard.js:8,338-375`，per-page 記憶體變數 `scenario`，非 localStorage，各 Page 各自切換不互相污染） | 建立任務、設定、成員、發布、完成、匯出 |
| A01/A02/A03 | 標記員 | `annotator_id` query param（`_workspace-helpers.ts:14-24`；省略時退回預設 roster identity，v3.8.0，issue #145） | 試標：3 人皆標同 2 筆共同樣本；正式：各分配 1 筆 |
| R01/R02 | 審核員 | `reviewer_id` query param，`role=reviewer` | 對同一筆官方標記各自獨立提交（`annotation-workspace-review-identity.spec.ts:87-93` 已驗證 bucket 獨立） |
| R03 | 仲裁者 | `reviewer_id` query param，`can_arbitrate: true`，非 R01/R02 審核單位的參與者 | 依 015 FR-060 兩條件（`spec.md:671`）具仲裁資格 |

### 1.1 Deterministic fixture（沿用 `w3-playwright-qa.md` §3.2 建議的專屬命名空間）

- `task_id = XROLE-{run_id}`（下文以 `XROLE-001` 代稱；`run_id` 建議取 `testInfo.workerIndex + Date.now()`，避免與既有 39 個 spec 共用的 `T001`／`sent-00N` 系列 ID 衝突）。
- Input type：`single_item`；Output type：`single_label`（labels：`positive` / `negative` / `neutral`）——選擇本型別的理由：既有原子測試（`annotation-workspace-review-identity.spec.ts`、`annotation-dispute-items.spec.ts`、`annotation-workspace-arbitration.spec.ts`）皆以 `single_label` 驗證身分維度與仲裁層，本情境可直接沿用其 `page.evaluate` 資料層 API 型別簽章，降低骨架風險。
- Dataset：5 筆記錄 `xrole-001`..`xrole-005`（沿用 `three-column-dataset.json` 上傳流程的檔案上傳／欄位對應 UI，實際內容改為單欄文本 + 3 類標籤示範）。
- 抽樣設定：`sampling_value = 2`（試標樣本固定為 `xrole-001`／`xrole-002`，3 位標記員皆標記 → 2 筆共同樣本 × 3 標記員，對應任務指定前提）；`min_annotators = 3`（014 FR-010q `spec.md:534`）。
- 正式標記：扣除試標後剩餘 `5 - 2 = 3` 筆（`xrole-003`／`xrole-004`／`xrole-005`，依 014 FR-010f-3 `spec.md:525`），分配方式假設 A01→`xrole-003`、A02→`xrole-004`、A03→`xrole-005`（**情境設計假設，非 spec 明文分配演算法**——014/015 未定義正式標記樣本分派規則，需於整合時與 senior-ba 確認是否需另立 FR；本文件標注於 §7 未解決事項）。
- 審核設定：`min_reviewers = 2`、`review_assignment_mode = manual`（014 FR-010s-1 `spec.md:537`，`#assignmentModeManual`）、`agreement_auto_finalize = true`、`arbitration_enabled = true`、`arbiter_ids = [R03]`（`#arbiterOptions .arbiter-option input`，`task-detail-review-settings.spec.ts:84-93`）。
- **R01/R02 刻意分歧樣本**：`xrole-003`（A01 提交）——R01 核准（同意 A01 答案）、R02 修正為不同值 → 依 FR-051（`spec.md:641`）判定式，`n=2 ≥ min` 且存在差異 → `disputed`；`resolveDisputeConvergence`（`annotation-dispute-items.spec.ts` 同款邏輯）N=2 且僅 1 票偏離 → 平手不收斂 → 進入爭議池，需 R03 仲裁。

---

## 2. 主線 E2E 情境（單一完整測試，Given/When/Then）

規劃檔案位置（本輪不落地）：`design/prototype/tests/annotation/xrole-canonical-journey.spec.ts`（依 D1 決策，本輪測試一律留在 `design/prototype/tests/`；正式 `e2e/` 目錄另立 `[Task]` issue）。

**Given**（測試前置）：
- `context = await browser.newContext()`；`plPage = context.newPage()`，`a01Page/a02Page/a03Page`，`r01Page/r02Page`，`r03Page` 各自 `context.newPage()`（`w3-playwright-qa.md` §3.1 折衷方案）。
- `test.beforeEach` 主動 `page.evaluate(() => localStorage.clear())`（因改用共享 context，不能依賴 Playwright per-test 全新 context 的隱含隔離前提，`w3-playwright-qa.md` §2.4／§3.3）。

### 步驟 1 — 建立專案（四步驟精靈）

- **Given** `plPage.goto('/pages/task-management/task-new.html')`，`#taskCategoryChips [data-key]` 已渲染（`task-new-input-count-validation.spec.ts:9`）。
- **When** PL01 填 `#taskNameInput` = `'XROLE Canonical Journey'`，點擊 `#taskCategoryChips [data-key="classification"]`、`#taskOutputTypeChips [data-key="single_label"]`、`#taskInputTypeChips [data-key="single_item"]`。
- **Then**（UI）：`#errInlineFieldCount` 不含 `show` class（`task-new-input-count-validation.spec.ts:30`）；`#nextBtn` 可點擊。
  **（URL）**：仍在 `task-new.html`（尚未提交）。
  **（資料狀態）**：N/A（尚未持久化）。
  **（audit log）**：N/A。

### 步驟 2 — 上傳資料／欄位對應／預覽（矩陣節點 4，含三方一致缺口）

- **When** 上傳 5 筆 `xrole-*` 資料集檔案（`#datasetFileInput.setInputFiles`），設定欄位角色 `.inline-preview-role-select` → `input`（`task-new-input-count-validation.spec.ts:18-21`）。
- **Then**（UI）：`.inline-dataset-preview-wrap` 可見且列出 **5** 筆預覽列（Step 2 output-type preview，沿用 `task-new-output-type-preview.spec.ts:268-1503` 解析邏輯）。
  **（資料狀態，三方一致 —— 主線必含新斷言，W3 覆蓋缺口 #1）**：
  1. 上傳筆數（檔案內容 `JSON.parse(fs.readFileSync(...))` 或 `.setInputFiles` 前置讀檔結果 `= 5`）
  2. Step 2 預覽渲染筆數（`.inline-dataset-preview-wrap` 列數 `= 5`）
  3. 建立完成後 `annotation-list.html?task_id=XROLE-001&role=annotator` 的清單筆數（`ws-sample-item` 或等效列 `toHaveCount`）
  三者必須全部等於 5，於**同一條建立流程**內斷言（此為 `w3-playwright-qa.md` §1.2 明確指出的缺口：既有測試僅驗證「materialized 筆數在 list/workspace 間一致」，起點不是上傳動作本身）。
  **（URL）**：N/A（同頁）。**（audit log）**：N/A。

### 步驟 3 — 設定：標籤／規則／指引（矩陣節點 5）

- **When** Step 2 設定 3 個 label（`positive`/`negative`/`neutral`），Step 4 上傳標記員指引檔案（`task-detail-guideline-edit.spec.ts:10,41` 對應同構 UI）。
- **Then**（UI）：`task-detail.data.js:1016-1027` 已知的「13 種任務共用同一組附件」缺陷（F-02）不適用於本情境（新任務用專屬上傳檔案，非 seed 附件）；但**指引檔案存在性 assertion**須確認上傳的檔案可經由 workspace 右欄「說明」分頁的檔案列開啟（不驗證內容語意）。
  **（資料狀態）**：`TaskProfile.guideline_files` 非空。**（audit log）**：N/A。

### 步驟 4 — 試標抽樣／最低人數／審核設定（矩陣節點 6，含 D3 負向情境）

- **When** Step 3 填 `#samplingValueInput = '2'`（沿用 `task-new-startup-without-members.spec.ts:6` pattern），提交後於 Overview 補設 `min_annotators=3`（`#minAnnotatorsInput`）、`min_reviewers=2`（`#minReviewersInput`，`task-detail-review-settings.spec.ts:44-45`）、`review_assignment_mode=manual`（`#assignmentModeManual`）、`arbitration_enabled=true` + `arbiter_ids=[R03]`（`#arbiterOptions .arbiter-option`）。
- **Then**（UI）：`#valueMinReviewersControl` = `'2'`、`#valueArbitrationControl` = `'啟用 · 仲裁者 1 人'`（`task-detail-review-settings.spec.ts:91-93` 同款斷言）。
  **（D3 負向子情境，Spec-defined pending revision，需獨立 test，不佔用主線）**：`plPage` 導覽至同任務、僅加入 2 位 active 標記員（尚未達 `min_annotators=3`）時嘗試 `#publishDryRunBtn`，**Then** 依 D3 裁決應阻擋並顯示「還差 1 位」——目前 `canPublish()`（`task-detail.html:8822-8831`）僅呼叫 `validateSamplingData()`（`:5011-5030`，僅驗證設定值 `data.minAnnotators<2`，不比對 `TASK_MEMBERS` 實際啟用人數），此斷言**目前會 FAIL**，標注為 pending revision（對應 W2 F-06、matrix 節點 6）。

### 步驟 5 — 成員管理（矩陣節點 7，含停用標記員缺口）

- **When** PL01 於 `#memberManagementPanel` 以「搜尋平台成員」（`#memberSearchInput`）或「Email 邀請」（`task-detail-member-management-add.spec.ts:10`）加入 A01/A02/A03（`role=annotator`）、R01/R02/R03（`role=reviewer`）。
- **Then**（UI）：`#memberTableBody` 含 6 筆列，`#memberPaginationInfo` 顯示對應總筆數（`task-detail-member-management-add.spec.ts:20`）。
  **（成員停用子情境，覆蓋 W3 §1.4 缺口）**：PL01 點擊 A03 列的 `toggleBtn`（`t('actionDisable')`，`task-detail.html:6477-6493`）→ `openMemberActionModal({type:'disable',...})` 確認 → `member.status` 變為 `'disabled'`、狀態徽章文字為 `t('memberStatusDisabled')`（`'停用'`，`task-detail.html:6451,2643`）。**已知未定義行為**：停用「標記員」（而非審核員）對其已指派中的試標/正式標記樣本有何影響，`task-detail.html` 無對應邏輯（僅 `task-detail-review-assignment.spec.ts:134` 驗證「停用審核員」會將待審負荷歸還未指派池，標記員側無等價機制）——本情境**僅斷言 UI 狀態變更**，資料狀態欄位若涉及「A03 已指派的 `xrole-005` 是否仍可被 A03 提交」則標注為 **Requirement gap，不在本文件斷言範圍**，列入 §7 未解決事項。

### 步驟 6 — 試標啟動＋標記（矩陣節點 8，跨頁交接點 A）

- **When** `plPage` 點擊 `#publishDryRunBtn`（`task-detail-stage-flow.spec.ts:30`），`#statusStepper .step-current .step-label-wrap` → `'試標階段'`。
- **交接點 A 斷言（跨頁數字對帳，矩陣節點 16）**：`a01Page.goto(buildListUrl({task_id:'XROLE-001', role:'annotator', run_type:'dry_run', annotator_id:'A01'}))` → 清單筆數 `= 2`（`xrole-001`／`xrole-002`），與 `plPage` 的 `#splitLegendDynamic` 顯示 `'R1 2筆'`（沿用 `task-detail-stage-flow.spec.ts:38` pattern）**必須一致**。
- **When** A01/A02/A03 各自於 `annotation-workspace.html` 對 `xrole-001`／`xrole-002` 逐筆提交（`skipGuidelineModal` + `ws-single-label-chip-*` + `ws-submit-btn`，沿用 `task-detail-dry-run-status-sync.spec.ts:16-20` pattern，6 次提交）。
- **Then**（UI）：每筆 `ws-sample-item` 皆 `data-submitted="true"`。
  **（資料狀態）**：`page.evaluate(() => getSampleStatus('XROLE-001','annotator','dry_run','xrole-00N',{annotatorId}))` = `'submitted'`（沿用 `annotation-workspace-review-identity.spec.ts:42-60` API 簽章）。
  **（強制指引 modal，已知風險 F-01）**：本情境用 `skipGuidelineModal` 繞過（`_workspace-helpers.ts:47-51`），**不斷言 modal 內容**（modal 現況僅有標題+按鈕，無指引全文，`annotation-workspace.html:755-762`）；已知缺陷不在本輪主線修正範圍，僅在 §6 test gap 段落標注。

### 步驟 7 — IAA gate（矩陣節點 9，跨頁交接點 B）

- **交接點 B 斷言**：全部 6 筆試標提交後，`plPage.goto('/pages/task-management/task-detail.html?task_id=XROLE-001&status=dry_run_in_progress')` → `#statusBadge` = `'待 IAA 確認'`（`task-detail-dry-run-status-sync.spec.ts:23-24` 已驗證同款跨模組同步；本情境擴充為 3 標記員而非單一標記員）。
- **Then**（最小 gate，依 issue 邊界）：`.exec-stage-banner #trialDecisionTitle` 文字可讀（不驗證 IAA 數值本身，屬 dataset 016/017 邊界，`task-detail-stage-flow.spec.ts:33` 同款 pattern：`'R1 未達標...'`／`'R1 已通過...'` 二擇一文案存在即視為「可判讀」）；PL01 點擊對應「新增下一回合」或「開始正式標記」按鈕視文案結果而定，代表「可退回或進入正式回合」的 gate 已跑通。

### 步驟 8 — 正式標記（矩陣節點 10，跨頁交接點 C，含跨標記員隔離）

- **交接點 C 斷言**：`plPage` 點擊 `#publishOfficialRunBtn` → `#splitLegendDynamic` 含 `'正式 3筆'`。`a01Page.goto(buildListUrl({task_id:'XROLE-001', role:'annotator', run_type:'official_run', annotator_id:'A01'}))` 清單筆數 `= 1`（僅 `xrole-003`，因分配假設見 §1.1）；三位標記員清單合計 `= 3`，與 `plPage` 的 `'正式 3筆'` 一致。
- **When** A01 提交 `xrole-003`（值 `positive`）、A02 提交 `xrole-004`（值 `negative`）、A03 提交 `xrole-005`（值 `neutral`）。
- **Then（跨標記員隔離，W3 §1.7 覆蓋缺口，安全延伸斷言）**：在 A02 提交前，`a01Page` 或 `plPage` 對 `getSampleStatus('XROLE-001','annotator','official_run','xrole-004',{annotatorId:'A02'})` 應為 `'pending'`（尚無法讀到 A02 的答案）；A02 提交後才變為 `'submitted'`。**A01 不得經由任何既有匯出函式讀到 A02 的具體答案內容**——沿用 `annotation-workspace-review-identity.spec.ts:121-130`「the annotator dimension is real, not decorative」的驗證模式，擴充為明確安全斷言：`getSampleStatus(...,{annotatorId:'A02'})` 從 A01 的 page context 呼叫時同樣只回傳狀態列舉值，不回傳答案內容（呼叫端本來就無法取得 payload，此為既有 API 設計，本測試將其**顯式斷言化**而非僅隱含於架構）。

### 步驟 9 — 審核（矩陣節點 11，跨頁交接點 D，含盲審隔離＋dry_run 不可退回負向）

- **交接點 D 斷言**：`r01Page.goto(buildListUrl({task_id:'XROLE-001', role:'reviewer', run_type:'official_run'}))` → 3 個審核單位（`REVIEW_UNIT_DIMENSIONS = sample_id × annotator_id × run_type`，015 FR-051 `spec.md:641`）皆可見，`annotation-list-reviewer.spec.ts:29-354` 同款 pagination-by-review-unit 慣例。
- **When**（`xrole-003`／A01 的審核單位）：`r01Page` 開啟 → 核准（`ws-review-row-approve`）→ `ws-review-submit-btn`。`r02Page`（尚未看到 R01 判斷前）先讀 `getSampleHistory('XROLE-001','official_run','xrole-003',{annotatorId:'A01'})`，**Then（盲審隔離，W3 §1.8 已定位的資料層 API，本情境將其顯式串入跨角色主線）**：篩選 `role==='reviewer'` 的事件應為空陣列（R01 尚未送出 R02 不應看到）。R01 送出後，`r02Page` 開啟同一單位，修正為 `negative`（reviewer 直接修正控件）並送出。
  **（資料狀態）**：`getReviewUnitStatus('XROLE-001','official_run','xrole-003',{annotatorId:'A01'},['single_label'])` = `'disputed'`（依 FR-051 判定式：n=2≥min=2 且存在差異）；`getDisputeItems(...)` 回傳 1 筆 `{outKey:'single_label', annotatorValue:'positive', reviewerValues:{R02:'negative'}}`（R01 同意故不出現在 `reviewerValues`，沿用 `annotation-dispute-items.spec.ts:146-154` 同款「an agreeing reviewer does not appear among the B values」語意）。
- **Then（dry_run 不可退回負向測試，覆蓋 F-08-b／AC-3.15，Spec-defined pending revision）**：另建立一筆 `dry_run` 情境（`xrole-001`，A01 的試標提交）由 R01 於 `role=reviewer&run_type=dry_run` 判定「退回」，**Then** 依 015 AC-3.15（`spec.md:334` 「v3.0.0 起僅適用 official_run」）該操作**不應**呼叫 `markSampleRejected` 或使樣本狀態回退為 `待標記`；但 `annotation-workspace.config.js:2650` 目前呼叫 `markSampleRejected(..., currentRunType, ...)` **無 run_type 防護**（matrix F-08-b），此斷言**目前會 FAIL**，作為 Bug 修正後的迴歸測試。

### 步驟 10 — Dispute／仲裁（矩陣節點 12，跨頁交接點 D 延伸）

- **交接點 D 延伸**：`r03Page.goto(buildListUrl({task_id:'XROLE-001', role:'reviewer', run_type:'official_run', reviewer_id:'R03'}))` → `xrole-003` 列（disputed）顯示 `list-arbitrate-entry`（「仲裁」按鈕，015 FR-060 `spec.md:671`，`annotation-list-dispute-entry.spec.ts:91-92` 同款）；`xrole-004`／`xrole-005` 列（尚未達 disputed，見下）維持 `编辑`。
- **When**（`xrole-004`／A02）：R01 核准、R02 核准（皆同意 A02 原答案 `negative`）→ **Then** `getReviewUnitStatus(...) = 'finalized'`（n=2=min 且全數同意，FR-051 判定式）。
  （`xrole-005`／A03）：R01 修正為 `positive`、R02 修正為 `positive`（兩者一致但皆異於 A03 原答案 `neutral`）→ 依 `resolveDisputeConvergence`（`annotation-dispute-items.spec.ts` 同款演算法）N=2 且票數一致（2/2）→ **Then** 自動收斂為 `finalized`，`finalized_value = 'positive'`，**不需**仲裁（呼應 `annotation-workspace-arbitration.spec.ts:217-220` 「N=2 unanimous reviewers converge」情境）。
  （`xrole-003`／A01，前步已建立分歧）：R03 開啟 → **Then**（UI）`ws-arbitration-card` 可見、`ws-arbitration-item` count=1（`annotation-workspace-arbitration.spec.ts:103-109`）；R03 點擊 `ws-arbitration-choose-b`（選 R02 的 `negative`）並 `ws-arbitration-submit`。
  **（資料狀態）**：`getArbitrationState(...)['single_label::single_label']` = `{votes:[{arbiter_id:'R03',choice:'B',...}], finalized_value:'negative', finalized_by:'R03'}`（沿用 `annotation-workspace-arbitration.spec.ts:154-166`）；`getReviewUnitStatus(...) = 'finalized'`。
- **交接點 E 斷言（仲裁完成→狀態同步）**：`plPage.goto('/pages/task-management/task-detail.html?task_id=XROLE-001&tab=annotation-results')` → `#arResultTableBody` 對 `xrole-003` 列展開後，`.ar-review-badge .badge` = `'已定稿'`，且 `.ar-history-line.ar-history-arbitration` 含 R03 與「採 B」字樣（沿用 `task-detail-review-history.spec.ts:54-70` 同款斷言）；此為「仲裁完成→狀態同步」跨頁對帳的具體落地。

### 步驟 11 — 完成（矩陣節點 13，D2 完整條件，Spec-defined pending revision）

- **Given**：3 個官方審核單位皆已 `finalized`（`xrole-003` 經仲裁、`xrole-004`／`xrole-005` 經一致同意），無未解決 dispute。
- **When** `plPage` 點擊 `#publishCompleteBtn`。
- **Then（依 D2 裁決的完整條件，issue #180 完整條件：正式標記全提交＋必要 review unit finalized＋無未解決 dispute＋必要仲裁完成＋品質指標可用）**：
  1. 二次確認 modal 應出現（比照 `publishDryRun`/`publishOfficialRun` 於資料隔離關閉情境已有的 `riskModal` 等效機制，`task-detail.html:9183-9195`）；
  2. 若任一 review unit 未達 `finalized`/`approved`（依 min_reviewers 判定）或存在未解決 `disputed` 單位，「標記完成」應被阻擋並列出具體缺口。
  目前 `publishComplete()`（`task-detail.html:8870-8876`）**直接** `TASK_DATA.status='completed'`，無確認 modal、無任何前置條件檢查（`task-detail-stage-flow.spec.ts:57` 現況僅驗證點擊後 stepper 前進，未驗證任何 gate）；**本步驟斷言目前會 FAIL**，對應 W2 F-07／matrix 節點 13，標注 **Spec-defined (pending revision)**，待 ADR-022＋014 新 FR（階段四 issue）落地後轉為真正 Green 斷言。
  **（audit log）**：N/A。

### 步驟 12 — 匯出（矩陣節點 14，終點）

- **When** `plPage` 於 `annotation-results` tab 選擇 `#arStageSelect = 'official'`，點擊 `#arExportJsonBtn`。
- **Then**（UI/資料狀態）：下載檔案 `payload.manifest.applied_filters.run_stage === 'official'`、`payload.items.length === 3`（等於正式標記筆數）、每筆 `item.annotations` 含最終定案值（`xrole-003` 應反映仲裁後的 `negative`，非 A01 原始的 `positive`）——沿用 `task-detail-annotation-results.spec.ts:183-215` 匯出結構，擴充「匯出值必須是仲裁後定案值而非原始標記員答案」的斷言，驗證步驟 10 的仲裁結果確實回寫進匯出鏈路。
  **（audit log）**：N/A。

---

## 3. 角色交接點斷言彙總（矩陣節點 16，跨頁數字對帳）

| 交接點 | 觸發方 | 接收方 | 對帳數字 | 對應步驟 |
|---|---|---|---|---|
| A. PL 發布試標 → 標記員可見 | PL01（`#publishDryRunBtn`） | A01/A02/A03（`annotation-list`） | `annotation-list` 筆數 = `#splitLegendDynamic` 的 `R1 {n}筆` | 步驟 6 |
| B. 標記提交 → PL 待辦可判讀 | A01-A03（6 次提交） | PL01（`task-detail` 狀態徽章） | `#statusBadge` = `'待 IAA 確認'` 當且僅當 6/6 提交完成 | 步驟 7 |
| C. PL 開始正式標記 → 標記員可見新指派 | PL01（`#publishOfficialRunBtn`） | A01/A02/A03 | `annotation-list`（`run_type=official_run`）合計筆數 = `#splitLegendDynamic` 的 `正式 {n}筆` | 步驟 8 |
| D. 標記提交 → 審核員可見 | A01-A03 | R01/R02/R03 | `annotation-list-reviewer` 審核單位列數 = 官方提交筆數（3） | 步驟 9 |
| D-ext. 審核分歧 → dispute → 仲裁者可見 | R01/R02（分歧提交） | R03 | `list-arbitrate-entry` 只出現在 `disputed` 列，且僅 1 列（`xrole-003`） | 步驟 10 |
| E. 仲裁完成 → 狀態同步 | R03（`ws-arbitration-submit`） | PL01（`annotation-results` 面板） | `.ar-review-badge .badge` = `'已定稿'` 且 `.ar-history-line.ar-history-arbitration` 含仲裁者與選擇 | 步驟 10 |

---

## 4. 原子測試清單

命名規則：`XROLE-NN`；「關係」欄標注 沿用 / 擴充 / 新增（對照 `w3-playwright-qa.md` §1 既有覆蓋地圖）；「狀態」欄：🟢 可立即撰寫且應為 Green、🟡 可立即撰寫但目前會 Red（記錄已知缺口，等實作修正後轉 Green）。

| 測試 ID | 矩陣節點 | 前置 fixture | 驗證重點 | 關係 | 狀態 |
|---|---|---|---|---|---|
| XROLE-01 | 3（建立專案） | 空白 task-new 表單 | 四步驟精靈完成後導向 `task-detail.html?task_id=...` | 沿用 `task-new-create-redirect.spec.ts` | 🟢 |
| XROLE-02 | 4（上傳資料三方一致） | 5 筆 `xrole-*` 資料集檔案 | 上傳筆數＝Step2 預覽筆數＝annotation-list 筆數（三方全等於 5） | **新增**（W3 覆蓋缺口 #1） | 🟢 |
| XROLE-03 | 5（指引） | 已上傳指引檔案 | 指引檔案於工作區右欄「說明」分頁可開啟且不 404 | 擴充 `task-detail-guideline-edit.spec.ts` | 🟢 |
| XROLE-04 | 6（成員不足阻擋，D3） | 僅 2 位 active 標記員，`min_annotators=3` | `#publishDryRunBtn` 應 disabled 或點擊後顯示「還差 1 位」 | **新增**（D3 落地前置測試，目前 FAIL） | 🟡 |
| XROLE-05 | 7（成員管理） | 6 位候選成員 | 加入標記員／審核員成功，`#memberTableBody` 對帳 | 沿用 `task-detail-member-management-add.spec.ts` | 🟢 |
| XROLE-06 | 7（停用標記員） | A03 已加入 active | 點擊停用 → 確認 modal → 狀態徽章變 `停用` | **新增**（W3 §1.4 缺口，僅斷言 UI/狀態，不斷言已指派樣本行為） | 🟢 |
| XROLE-07 | 8（試標三標記員） | 2 筆共同樣本，`min_annotators=3` | A01/A02/A03 各自提交 `xrole-001`/`xrole-002`，6 筆 `getSampleStatus` 皆為 `submitted` | 擴充 `task-detail-dry-run-status-sync.spec.ts`（原僅單一標記員） | 🟢 |
| XROLE-08 | 8→9（跨頁交接點 A/B） | 步驟 6-7 完成後狀態 | `annotation-list` 筆數與 `#splitLegendDynamic` 對帳；6/6 提交後 `#statusBadge='待 IAA 確認'` | 擴充 `task-detail-dry-run-status-sync.spec.ts` | 🟢 |
| XROLE-09 | 9（IAA 最小 gate） | 6 筆試標已提交 | `.exec-stage-banner #trialDecisionTitle` 呈現可判讀文案，可操作進入下一步 | 沿用 `task-detail-stage-flow.spec.ts` | 🟢 |
| XROLE-10 | 10（正式標記提交） | 3 筆剩餘資料已分配 | A01/A02/A03 各自提交 1 筆正式標記 | 沿用 `annotation-workspace-common.spec.ts` 系列 | 🟢 |
| XROLE-11 | 10（跨標記員隔離，安全延伸） | A02 尚未提交 `xrole-004` | A01 呼叫 `getSampleStatus(...,{annotatorId:'A02'})` 於提交前為 `pending`，提交後為 `submitted`；任何時點皆讀不到 A02 答案內容 | **新增**（W3 §1.7 缺口，明確安全斷言化） | 🟢 |
| XROLE-12 | 11（盲審隔離） | R01 尚未提交對 `xrole-003` 的判斷 | R02 呼叫 `getSampleHistory(...)` 篩選 `role==='reviewer'` 應為空陣列，直到 R01 送出 | **新增**（沿用 `annotation-workspace-review-identity.spec.ts` API，顯式串入盲審語意） | 🟢 |
| XROLE-13 | 11（dry_run 不可退回負向） | R01 於 `dry_run` 對 A01 的 `xrole-001` 判定「退回」 | 樣本狀態不應回退為 `待標記`，`markSampleRejected` 不應被呼叫於 `dry_run` | **新增**（覆蓋 F-08-b／AC-3.15，目前 FAIL） | 🟡 |
| XROLE-14 | 11（審核分歧產生 dispute） | R01 核准、R02 修正 `xrole-003` | `getReviewUnitStatus=disputed`，`getDisputeItems` 回傳 1 筆含 R02 值 | 沿用 `annotation-dispute-items.spec.ts` 演算法，擴充為跨角色情境 | 🟢 |
| XROLE-15 | 11（一致同意 finalize） | R01/R02 皆核准 `xrole-004` | `getReviewUnitStatus=finalized`（n=2=min） | 沿用 `annotation-review-unit.spec.ts:221` | 🟢 |
| XROLE-16 | 11（多數收斂自動 finalize） | R01/R02 皆修正 `xrole-005` 為同一新值 | `resolveDisputeConvergence` 收斂，`getReviewUnitStatus=finalized`，無需仲裁 | 沿用 `annotation-workspace-arbitration.spec.ts:217-220` | 🟢 |
| XROLE-17 | 12（仲裁入口可見性） | `xrole-003` 為 disputed，R03 具仲裁資格 | R03 清單列顯示 `list-arbitrate-entry`；R01/R02（參與者）與 R02 之外任何非仲裁資格者維持 `編輯` | 沿用 `annotation-list-dispute-entry.spec.ts` | 🟢 |
| XROLE-18 | 12（仲裁投票與定案） | R03 開啟 `xrole-003` 仲裁版面 | `ws-arbitration-card` 渲染、選 B、`getArbitrationState` 回傳 `finalized_by=R03` | 沿用 `annotation-workspace-arbitration.spec.ts:150-166` | 🟢 |
| XROLE-19 | 12→13（仲裁完成→狀態同步，交接點 E） | 仲裁已定案 | `task-detail` `annotation-results` 面板顯示 `已定稿` + 仲裁歷程線 | 沿用 `task-detail-review-history.spec.ts:54-70` | 🟢 |
| XROLE-20 | 13（完成前置條件，D2） | 尚有未解決 dispute（可用另一 seed 構造） | `#publishCompleteBtn` 點擊後應被阻擋並列出缺口（未解決 dispute） | **新增**（D2 落地前置測試，目前 FAIL） | 🟡 |
| XROLE-21 | 13（完成，全部 finalized） | 3 個 review unit 皆 finalized，無未解決 dispute | `#publishCompleteBtn` 點擊需二次確認 modal，確認後 `#statusStepper` 前進至「已完成」 | **新增**（D2 落地前置測試，目前 FAIL：現況無確認 modal） | 🟡 |
| XROLE-22 | 14（匯出定案值） | 任務已完成 | 匯出 JSON 的 `xrole-003` 標註值為仲裁後 `negative`，非 A01 原始 `positive` | 擴充 `task-detail-annotation-results.spec.ts:183-215` | 🟢 |
| XROLE-23 | 16（重新整理復原） | R01 審核到一半（尚未送出） | reload 後未提交判斷不遺失／A01 仍看不到 R01 動態 | 擴充 `annotation-workspace-save-draft.spec.ts:34` 的 reload pattern 至跨角色情境 | 🟢 |
| XROLE-24 | 16（重複提交防抖） | A01 於 `ws-submit-btn` 快速連點兩次 | 僅產生 1 筆 history 事件，非 2 筆 | **新增**（W3 §3.5 明確指出既有套件無此測試） | 🟢（若無 debounce 機制則需先於實作面補上，測試本身可先寫並可能 Red） |
| XROLE-25 | 全域（page error 守門） | 全流程 12 步驟 | `trackPageErrors`／`assertNoPageErrors` 貫穿整條主線，任何一步不得有未預期 JS exception | 沿用 `_workspace-helpers.ts:120-128` | 🟢 |

---

## 5. D2/D3 特殊處理摘要

- **D2（「完成」前置條件）**：主線步驟 11、原子測試 XROLE-20／XROLE-21 依 issue #180 完整條件撰寫（正式標記全提交＋必要 review unit finalized＋無未解決 dispute＋必要仲裁完成＋品質指標可用），**明確標注「Spec-defined (pending revision)」**：這些測試在 ADR-022／014 新 FR（階段四 issue）落地前對 prototype 執行必然 FAIL，屬「先寫測試、等實作跟上」的正向缺口記錄，不得被誤判為既有套件的 regression 或本文件品質問題。
- **D3（成員不足阻擋）**：步驟 4 子情境、原子測試 XROLE-04 同樣標注 pending revision；同時本文件在步驟 4 明確要求「阻擋＋顯示還差 N 位」的具體文案存在性，供未來新 FR 撰寫時對照。

---

## 6. 測試缺口覆蓋對照（本輪明確涵蓋的 matrix「測試缺口」項目）

| Matrix 缺口 | 對應原子測試 | 說明 |
|---|---|---|
| 節點 4：上傳/預覽/清單三方筆數一致 | XROLE-02 | 同一建立流程內斷言，非拼接既有分散測試 |
| 節點 7：停用標記員無對應測試 | XROLE-06 | 覆蓋 UI／狀態層；已指派樣本行為留為未解決事項（見 §7） |
| 節點 10：跨標記員隔離無顯式安全斷言 | XROLE-11 | 將既有架構隱含隔離顯式斷言化 |
| 節點 11：盲審隔離（提交前不可見他人判斷） | XROLE-12 | 沿用 review-identity 資料層 API，串入跨角色情境；同時對照 W2 F-09「歷程面板可能洩漏未提交草稿事件」的已知風險，本測試僅驗證『提交後才可見』這條正向規則，不直接斷言 F-09 的洩漏情境（F-09 屬另案 Requirement gap，需先由 spec 015 FR-016/AC-3.8 對照定案，見 matrix 主 agent 裁決 #3） |
| 節點 11：dry_run 不可退回負向 | XROLE-13 | 覆蓋 F-08-b，目前 Red，記錄修正前後對照 |

---

## 7. 未解決事項（需主 agent 整合時裁決）

1. **正式標記樣本分派演算法未定義**（§1.1）：本文件假設「剩餘 3 筆依標記員輪流各分配 1 筆」，但 013/014 spec 未明文定義正式標記的樣本-標記員分派規則（僅定義扣除試標後的總筆數，FR-010f-3）。若正式規則非「輪流各 1 筆」而是「全體標記員皆分攤全部剩餘筆數」或其他演算法，步驟 8-10 的交接點筆數對帳與 XROLE-10/11 需要調整。建議整合時請 senior-ba 或 senior-backend 確認。
2. **停用標記員對已指派樣本的行為未定義**（步驟 5、XROLE-06）：審核員停用有明確「待審負荷歸還未指派池」規則（014 FR-005j／`task-detail-review-assignment.spec.ts:134`），標記員側無對應 FR。本文件僅斷言 UI／狀態欄位變更，未對「A03 停用後 `xrole-005` 的正式標記指派是否仍可提交」做斷言。建議另立 `[Task]` 或 `[Spike]` issue（可併入階段四 D2/D3 落地 issue 群一併處理，或獨立追蹤）。
3. **F-09（審核歷程可能洩漏未提交草稿事件）與本文件 XROLE-12 的關係**：XROLE-12 僅驗證「未提交前歷程為空」的正向規則，尚未涵蓋 F-09 描述的「草稿儲存（`saved`）事件本身是否被記入 `history[]` 並外洩」這條負向情境（需先由 W1／spec 015 FR-016 對照定案是否為刻意設計）。若 F-09 定案為 Bug，應在此新增 `XROLE-12b`（提交前草稿儲存事件不得出現在他人可見的歷程中）。
4. **重複提交防抖（XROLE-24）目前無已知 debounce 機制佐證**：`w3-playwright-qa.md` §3.5 僅指出既有套件缺乏此類測試，未確認 prototype 是否已有 disable-on-click 邏輯。整合時建議先以程式碼盤點（grep `ws-submit-btn` 的 click handler）確認現況，避免此原子測試在無對應機制時產生誤判的「新缺陷」。
5. **步驟 8 官方標記分配為單筆／人，未涵蓋「一位標記員負責多筆正式標記」的情境**：若後續要驗證 annotation-list 分頁／篩選在大量正式標記下的行為，需擴充資料量，本文件的 5 筆極簡資料集不足以驗證（此為刻意的最小合成資料集設計，非疏漏）。
6. **screenshot／video 尚未設定**（`w3-playwright-qa.md` §3.6／§4.2-3）：本文件的主線情境涵蓋 12 步驟、25 個原子測試，若沿用現行 `playwright.config.ts` 僅 `trace:'retain-on-failure'` 的設定，長流程失敗時除錯成本高。建議整合時一併提案 `screenshot:'only-on-failure'` + `video:'retain-on-failure'`（可用獨立 project 或 `test.use({...})` 覆蓋，不影響既有 96 個原子測試）。
