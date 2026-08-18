# Issue #180 W3 — Playwright 與驗收工作流（senior-qa 視角）

角色：`senior-qa`｜範圍：僅盤點與設計建議，不撰寫正式驗收文件、不新增或修改任何測試｜Repo 一律 read-only

---

## 1. 既有測試覆蓋地圖

依生命週期節點「建立專案 → 上傳資料 → 設定 → 成員 → 試標 → IAA gate → 正式標記 → 審核 → 仲裁 → 完成 → 匯出」對照 12.3 MUST READ 測試。所有檔案路徑均以
`design/prototype/tests/` 為根、經 `grep -nE "^\s*(test|test\.describe)\("` 逐檔驗證存在。

判定符號：✅ 已有原子測試｜🟡 部分覆蓋｜❌ 無覆蓋

### 1.1 建立專案 — ✅ 已有原子測試

| Spec 檔 | 代表測試 |
|---|---|
| `task-management/task-new-create-redirect.spec.ts:6` | `redirects to task detail with task_id after create success` |
| `task-management/task-new-guideline-roles.spec.ts:6` | `step 3 and step 4 match updated startup and role guideline requirements` |
| `task-management/task-new-taxonomy-cascade.spec.ts:6,36,79,135,181` | task type / input-output taxonomy 解析與 config schema 對應 |
| `task-management/task-new-input-count-validation.spec.ts:26-67` | `single_item`／`item_pair` Input 欄位數驗證阻擋 Next |

### 1.2 上傳資料（欄位對應、預覽、筆數一致） — 🟡 部分覆蓋

| Spec 檔 | 代表測試 |
|---|---|
| `task-management/task-new-output-type-preview.spec.ts:268-1503` | Step 2 針對 8 個 output type + composite 資料檔的 preview 解析（欄位對應後結果） |
| `task-management/task-detail-config-parity.spec.ts:78` | `overview edit accepts a new JSON dataset upload (T001)`（僅限任務建立後的編輯模式重新上傳） |
| `task-management/task-detail-config-parity.spec.ts:63` | `overview edit shows the field-role table prefilled from the seed dataset (T001)` |

**缺口**：MUST READ 清單中沒有任何測試在**同一條建立流程**內斷言「上傳筆數 = Step 2 預覽筆數 = 之後 annotation-list／task-detail 顯示的任務筆數」三者一致（issue 第 2 節 AC）。`task-list-run-materialization.spec.ts` 只驗證「materialized 筆數」在 annotation-list／workspace 之間一致，起點不是上傳動作本身，而是預先寫入 data.js 的種子資料。

### 1.3 設定（標籤、規則、指引、試標抽樣、最低人數、審核設定） — ✅ 已有原子測試

| Spec 檔 | 代表測試 |
|---|---|
| `task-management/task-detail-settings-edit.spec.ts:15,51,59,74,86,93,100,116` | Step 2 樣式設定、scoring preview、code round-trip、儲存／取消 |
| `task-management/task-detail-sampling-edit.spec.ts:6,68,89,105` | 試標抽樣區塊、每 output type 一列 IAA 指標、target agreement 上下界驗證與儲存 |
| `task-management/task-detail-guideline-edit.spec.ts:10,41` | 標記員／審核員指引上傳 |
| `task-management/task-detail-review-settings.spec.ts:6,40,67,80,96,110,123,145` | 最低審核員人數、指派方式、仲裁開關與仲裁者、未存草稿離開分頁的確認 |
| `task-management/task-new-startup-without-members.spec.ts:6` | 無成員管理時 Step 3 仍可只靠抽樣設定進入 Step 4 |

### 1.4 成員（加入／啟用停用標記員與審核員） — 🟡 部分覆蓋

| Spec 檔 | 代表測試 |
|---|---|
| `task-management/task-detail-member-management-add.spec.ts:10` | `supports search-add and email invite instead of candidate list` |
| `task-management/task-detail-review-assignment.spec.ts:39,134` | 審核負載欄位、`disabling a reviewer returns their pending load to the unassigned pool` |

**缺口**：
- 「停用**標記員**」（非審核員）沒有對應標題的測試。
- Issue 第 2 節 AC「成員不足或其他設定不完整時，不可發布且須指出具體原因」——`grep -rn "insufficient\|成員不足\|blocks publish"` 在 12.3 全部 MUST READ 檔案中**查無結果**；`task-new-startup-without-members.spec.ts` 驗證的是「無需成員管理也能繼續」，不是「成員不足時阻擋發布並顯示原因」，屬 ❌ 相鄰但不等價。

### 1.5 試標 — ✅ 已有原子測試（含跨頁狀態同步）

| Spec 檔 | 代表測試 |
|---|---|
| `task-management/task-detail-stage-flow.spec.ts:5` | `keeps the 4-stage stepper while showing a complete trial-to-official flow`（草稿→R1 未達標→R2 通過→正式標記中→已完成，單頁面單一 PL 視角的完整 4 階段點擊流程） |
| `task-management/task-detail-dry-run-status-sync.spec.ts:12` | `moves task status to waiting IAA confirmation after all 5 dry-run samples are submitted`（**唯一一個真正跨模組**的既有測試：同一 `page` 先以 annotator role 逐筆送出 5 筆試標樣本，再導覽到 `task-detail.html` 驗證狀態徽章變成「待 IAA 確認」） |
| `task-management/task-list-run-materialization.spec.ts:11-53` | draft 任務尚無 annotation list／materialized round context／零筆數情境 |

### 1.6 IAA gate — 🟡 部分覆蓋（受排除範圍限制）

`task-detail-stage-flow.spec.ts` 驗證的是「未達標／已通過」文案與 stepper 前進的**狀態機層級**最小 gate（符合 issue 邊界例外第 38 條「只驗證指標可用、負責人可判讀、可退回或進入正式回合」）。實際 IAA 數值計算、gate 徽章的資料來源屬 `specs/dataset/016-*`／`017-*`（12.6 conditional，本輪明確排除）。`task-detail-sampling-edit.spec.ts:68-123` 僅涵蓋「設定」端（target agreement override），不涵蓋「試標完成後 IAA 結果如何呈現給 PL 判讀」。**此節的完整覆蓋依賴被排除的 dataset 模組介面，需在文件中明確標示為 boundary case，不可誤報為 prototype regression。**

### 1.7 正式標記 — ✅ 已有原子測試

| Spec 檔 | 代表測試 |
|---|---|
| `annotation/annotation-workspace-common.spec.ts:19-92` | URL 4-param 契約、middle column 不重複標題、樣本清單、切換樣本保留已答狀態、無效 task_id 導回列表、完整作答提交、缺答阻擋 |
| `annotation/annotation-workspace-save-draft.spec.ts:24-58` | 儲存草稿不標記提交、reload 後草稿還原（FR-026）、annotation-list 顯示已儲存狀態、reviewer 模式不提供 save |
| `annotation/annotation-workspace-submit-validation.spec.ts:26-114` | multi_label／multi_dim／sequence_tagging／entity_recognition／relation_identification 逐型別的必填驗證 |
| `annotation/annotation-workspace-url-sync.spec.ts:21-153` | sample_id／annotator_id 隨導覽同步、history 不堆疊、未知 query 不殘留 |
| `annotation/annotation-list-sample-status.spec.ts:35-95` | 逐筆 submitted／saved／pending 狀態、quick-continue 最新未完成規則（FR-004B） |

**安全相關**：`annotation/annotation-workspace-data-fairness.spec.ts:26-67` 涵蓋「非指定用途 metadata（Title/Source ID/Source URL/ID、article_id/angle）永不進 DOM」與「output-role prefill（gold_label）只出現在自己的答案控制元件內，不作為獨立答案欄位外洩」，reviewer 模式同一組欄位也重測一次。**但沒有任何測試斷言「標記員 A 無法看到／取得標記員 B 已提交的答案」**（`grep -rn "cannot see\|isolat\|other annotator" annotation/*.spec.ts` 除一則不相關的程式碼註解外查無結果）——這正對應 issue 第 3 節 AC「不可看到或修改其他標記員的結果」，目前於 prototype 層 ❌ 無覆蓋（架構上是靠 `annotatorId` bucket key 隔離資料，但沒有測試把它當一項安全斷言驗證）。

### 1.8 審核 — ✅ 已有原子測試，覆蓋深度高

| Spec 檔 | 代表測試 |
|---|---|
| `annotation/annotation-list-reviewer.spec.ts:29-354` | 每 review unit 一列、annotator/run_type 組合、pagination 計算 review unit 而非 sample |
| `annotation/annotation-review-unit.spec.ts:109-376` | 五態機（none/pending/approved/modified/disputed 對應各 output type 比較邏輯）、`min_reviewers` 邊界、dry_run／official_run 各自獨立 review unit |
| `annotation/annotation-workspace-review-unit-nav.spec.ts:38-161` | 審核員左欄導覽、下一筆／上一筆跨 sample／annotator 移動、切換不互相污染 |
| `annotation/annotation-workspace-reviewer.spec.ts:56-412` | 直接修正 UI、submit 阻擋未決策列、reject 重開標記員樣本、8 個 output type 逐一驗證無 page error |
| `annotation/annotation-workspace-review-card.spec.ts:38-276` | 五態卡片渲染、span 型別合併卡、dry_run/official_run 一致化 |
| `annotation/annotation-workspace-review-identity.spec.ts:87-155` | **「提交前不可看到其他審核員尚未提交的判斷」的資料層等價驗證**：`two reviewers on the same annotator keep independent submission buckets`（issue 第 4 節該 AC 的唯一直接對應測試） |
| `annotation/annotation-dispute-items.spec.ts:115-215` | 審核結果不一致自動建立 dispute item，逐 merge key / dimension 拆分 |

### 1.9 仲裁 — ✅ 已有原子測試

| Spec 檔 | 代表測試 |
|---|---|
| `annotation/annotation-list-dispute-entry.spec.ts:80-120` | 爭議中篩選、有資格仲裁者顯示「仲裁」入口、參與者／非參與者維持「編輯」、非爭議列永不顯示仲裁 |
| `annotation/annotation-workspace-arbitration.spec.ts:103-237` | 仲裁版面切換、A/B 投票寫入與 finalize、多數決收斂規則（N=1/2/3）、未逐項選擇則不寫入 |
| `task-management/task-detail-review-history.spec.ts:54,73` | `renders arbitration line after reviewer line for finalized entries`／`renders every review decision line for disputed entries`（**仲裁結果回到 task-detail 稽核紀錄的跨頁同步驗證**） |

### 1.10 完成 — 🟡 部分覆蓋（缺前置條件阻擋測試）

`task-detail-stage-flow.spec.ts:57` 只驗證點擊「標記完成」按鈕後 stepper 前進到「已完成」，**未驗證任何前置條件**（尚有 dispute 未解決、尚有審核未完成時是否應阻擋完成）。`grep -rn "unresolved dispute\|dispute.*complete" task-management/*.spec.ts annotation/*.spec.ts` 查無結果。此缺口與 12.8 已列風險「ADR-022 的 completed 前置條件尚未明確包含所有 review/dispute/arbitration 完成條件」直接對應——目前是規格層級未定義，而非單純測試缺漏，需先由架構/BA 工作流確認正典條件，才能補測試。

### 1.11 匯出 — ✅ 已有原子測試

| Spec 檔 | 代表測試 |
|---|---|
| `task-management/task-detail-annotation-results.spec.ts:183,217,246` | `downloads full JSON export with manifest and VA task-specific fields`／`downloads JSON-MIN export with task-specific NER summary fields`／`includes export stage metadata and success toasts for annotation result exports` |
| `task-management/task-detail-work-log-split.spec.ts:20-73` | 完成數依角色（標記/審核/仲裁）拆欄、加權速度、平均耗時卡片 |

**缺口**：沒有測試斷言 audit log 可重建「建立→完成」全程操作歷程（`grep -rln "audit" design/prototype/tests` 全庫查無結果）；`work-log` 面板是效能統計而非逐操作稽核軌跡，兩者不可互相取代。

### 1.12 結論：12.8「目前不存在單一跨角色 Playwright spec」判定確認 ✅

以上 39 個 MUST READ spec 檔逐一核對後確認：**沒有任何單一 `.spec.ts` 檔案涵蓋「PL 建立 → 上傳 → 設定 → 成員 → 試標 → IAA → 正式標記 → 審核 → 仲裁 → 完成 → 匯出」全鏈路，且沒有任何檔案在同一 test() 內以 3 個以上不同角色身分（annotator/reviewer/arbiter/PL）操作**。最長的既有跨頁測試是 `task-detail-dry-run-status-sync.spec.ts`（annotator → PL，2 角色、2 模組），其次是 `task-detail-review-history.spec.ts` 與 `task-detail-stage-flow.spec.ts`（各自單一模組內的多階段狀態機）。生命週期證據確實分散在 task-management 與 annotation 兩個目錄的 20+ 個獨立 spec 檔中，12.8 的判斷成立。

---

## 2. 測試基礎設施盤點

### 2.1 Serve 方式與 baseURL

- `design/prototype/playwright.config.ts:9-35`：`testDir: './tests'`、`baseURL: 'http://127.0.0.1:8888'`（字面 IPv4，避免 `localhost` 解析到 `::1` 造成連線落空）、`webServer.command: 'node tests/serve.mjs'`，`reuseExistingServer: !process.env.CI`。
- `design/prototype/tests/serve.mjs:1-89`：零依賴 Node 靜態伺服器，取代先前 `python3 -m http.server`（在平行測試下會間歇性斷線，flake 來源已於註解中記錄）；有路徑穿越防護（`relative()` containment check）、`Cache-Control: no-store`、`keepAliveTimeout=60s`／`headersTimeout=65s` 避免長連線被提早 FIN。
- `scripts/serve-prototype.sh:1-35`：純委派給同一支 `serve.mjs`，供本機預覽用，明確標示「不可用於 CI 或正式環境」，Port 走 argv 而非環境變數（避免繼承的 `PORT` 環境變數靜默移動測試埠）。
- CI：`.github/workflows/ci.yml` 的 `prototype-playwright` job 僅在 `design/prototype/package.json` 存在時執行（`needs.validate.outputs.prototype-exists`），沒有 shard/matrix 設定，單一 job 跑整個套件。

### 2.2 平行策略

- `fullyParallel: true`，未設定 `workers`（沿用 Playwright 依 CPU 核心數的預設值），CI 未做 sharding。
- Playwright 預設每個 `test()` 使用獨立 `BrowserContext`（故獨立 storage），因此目前 96 個 spec 檔即使平行執行也不會互相污染 localStorage —— 這是現行套件能安全 `fullyParallel` 的關鍵前提，而非刻意的清理機制。

### 2.3 多身份模擬機制（query params + localStorage）

實測依據：`grep -rn "storageState\|newContext" design/prototype/tests` 全庫**查無結果** —— 現行套件完全不使用 Playwright 的 `storageState` 或 `browser.newContext()` 做角色隔離；全部靠：

1. **URL query params** 決定「以誰的身分渲染」：`_workspace-helpers.ts:26-41` 的 `buildWorkspaceUrl` / `buildListUrl` 組出 `task_id`／`sample_id`／`role`（`annotator`\|`reviewer`）／`run_type`（`dry_run`\|`official_run`）／`annotator_id`／`reviewer_id`。省略 identity 參數時退回 v3.8.0 前既有的預設 roster identity（`_workspace-helpers.ts:14-16` 註解）。
2. **單一 per-origin localStorage key 內的複合 bucket key** 做資料隔離，而非分開的 storage：`annotation-workspace.data.js:162-167` 的 `submissionBucketKey(taskId, role, runType, identity)` 產出 `taskId::role::runType::annotatorId::reviewerId` 字串，所有身分的提交紀錄都寫進同一把 `labelsuite.wsSubmissions` key（`:15`）底下的巢狀物件；仲裁票決另有 `labelsuite.wsArbitration`（`:1552`）走相同模式 `arbitrationBucketKey(taskId, runType, identity)`（`:1563`）。
3. 因此「一個標記員看不到另一個標記員草稿」「審核員提交前互相看不到彼此判斷」是**資料模型層的鍵值隔離**，不是瀏覽器層的身分隔離；`annotation-workspace-review-identity.spec.ts:87-95` 正是針對這個資料層 API 斷言的（見 1.7／1.8 節）。

**對跨角色單一 E2E 設計的可行做法與限制**：

- **關鍵發現**：`task-detail-dry-run-status-sync.spec.ts` 已示範「同一個 `page` 物件先以 annotator 角色逐筆提交，再 `page.goto()` 導覽到 PL 視角的 `task-detail.html`」可行，因為同一 `BrowserContext` 內的 localStorage 在頁面導覽之間會持續存在。**這是規劃單一跨角色 Playwright E2E 的最直接可行路徑**：不同角色的操作用同一個 context（可用多個 `page`／tab，同 context 共享 storage）搭配不同 query params 切換身分，而非替每個角色開獨立 `BrowserContext`。
- **限制／取捨**：若依 issue 第 5 節逐字要求「為不同角色設計獨立 BrowserContext／storage state」，會與上述資料模型衝突 —— Playwright 的 `BrowserContext` 天生互相隔離 storage（除非顯式用 `storageState` 匯出匯入銜接），如果 PL、A01-A03、R01-R02、R03 各自開一個獨立 `BrowserContext`，他們寫入的 `labelsuite.wsSubmissions` / `labelsuite.wsArbitration` 就不會互相可見，流程會在「PL 看不到標記員剛送出的試標」這一步直接斷裂，因為 prototype 沒有後端可以真正同步狀態。此為必須在正式驗收文件中明確記錄的 **infra 限制**（見第 4 節）。
- 折衷方案（供第 3 節設計骨架採用）：**同一 BrowserContext、多個 Page**（每個角色一個 tab，共享 context storage）＋ query params 切換身分，藉此同時滿足「每個角色有獨立的 Page／視窗（可平行操作、UI 上互不干擾）」與「他們操作的資料確實互通」兩個需求；`storageState` 僅用於「情境開始前預先植入一批固定 fixture」（例如 pre-seed `labelsuite.wsSubmissions`），而非用於角色間隔離。

### 2.4 Fixture 與 helper 慣例

- `_workspace-helpers.ts` 是唯一被 12.3 列為 MUST READ 的共用 helper，输出：`buildWorkspaceUrl`／`buildListUrl`（URL 建構）、`skipGuidelineModal`／`dismissGuidelineModal`（略過或操作強制指引 modal）、`patchDataFile`（用 `page.route()` 攔截並在 `*.data.js` 尾端注入 runtime patch，不需碰 `pages/` 下的檔案就能覆蓋 13 組既有種子以外的組態）、`setRangeValue`（直接設定 range input 值並 dispatch `input` 事件）、`selectWorkspaceText`（走 DOM TreeWalker 找文字節點模擬使用者選字，供 relation/entity 抽取類任務用）、`trackPageErrors`／`assertNoPageErrors`（迴歸守門：捕捉 `pageerror` 事件，避免用泛用 timeout 掩蓋真正的 JS runtime error，註解中明確引用「舊 workspace 的 `summarizeReviewerAspectCorrections` ReferenceError」歷史事故）。
- `task-management/three-column-dataset.json`（4 行、2 筆 `sentence_a`/`sentence_b`/`label` 記錄）是唯一被列入 MUST READ 的獨立 fixture 檔案，供 item_pair 類測試使用；其餘 fixture 幾乎全部內嵌在各 `*.data.js`（如 `annotation-workspace.data.js` 內的 T001-T0xx 種子任務）或測試檔內聯物件中，**不是由每次測試執行動態產生**，而是固定寫死的 ID（如 `T001`／`sent-001..005`／`kioleemg12`）在近 40 個 MUST READ 檔案中重複引用。
- 資料清理：因為每個 `test()` 預設拿到全新 `BrowserContext`（等同全新 localStorage），現行套件**沒有顯式的 `afterEach` 清理邏輯**（`grep` 全庫未見 `localStorage.clear()` 或等價 teardown）；隔離完全依賴 Playwright context-per-test 的預設行為，而非測試自行負責。這對「單一跨角色 E2E + 多個獨立可重跑原子測試」並存的設計是重要提醒：一旦跨角色測試改用單一共享 context／多 page，就不能再依賴「每個 test 拿到全新 storage」這個隱含前提，需要自行在 test 開頭／結尾做 `page.evaluate(() => localStorage.clear())` 或改用固定但彼此不衝突的 scenario ID 命名空間。

### 2.5 既有斷言風格

三種斷言同時出現，且經常混用在同一支 spec 內：

1. **UI/DOM 斷言**：`page.getByTestId(...)`／CSS locator ＋ `toHaveText`／`toBeVisible`／`toHaveCount`／`toContainText`／`toHaveAttribute`，例：`task-detail-stage-flow.spec.ts:8` `expect(page.locator('#statusStepper .step-label-wrap')).toHaveText([...])`。
2. **URL 斷言**：`annotation-workspace-url-sync.spec.ts` 全檔以 `page.url()` 解析 query string 驗證 `sample_id`／`annotator_id` 同步與 history 不堆疊。
3. **資料層／狀態層斷言（`page.evaluate` 直呼 `window.LabelSuite*Data` 模組函式）**：例如 `annotation-workspace-arbitration.spec.ts:154-165` 用 `page.evaluate(() => window.LabelSuiteAnnotationWorkspaceData.getArbitrationState(...))` 直接讀取投票結果物件斷言 `votes`／`finalized_value`／`finalized_by`；`annotation-review-unit.spec.ts:49-56` 的 `compare()` helper 同樣模式。這類斷言等同於「呼叫一個沒有網路層的本地 API」，比純 DOM 斷言更貼近資料正確性，但**不能宣稱驗證了真正的後端 API 回應或資料庫狀態**（見第 4 節分層限制）。
4. 迴歸守門：`trackPageErrors`／`assertNoPageErrors` 模式常見於 reviewer 相關測試（如 `annotation-workspace-review-card.spec.ts:178`），用於捕捉未預期的 JS exception，而非只驗證功能正確。

---

## 3. 跨角色驗收文件的設計骨架建議

供階段三撰寫 `docs/product/e2e/cross-role-task-lifecycle-playwright-plan.md` 使用（該路徑目前不存在，`docs/product/` 下尚無 `e2e/` 子目錄）。以下僅為骨架建議，非正式文件內容。

### 3.1 角色獨立 BrowserContext／storage state 策略

- 建議採 **單一共享 BrowserContext + 每角色一個 Page（tab）** 的混合模式（理由見 2.3）：
  - `context = await browser.newContext()` 一次；`plPage`／`a01Page`／`a02Page`／`a03Page`／`r01Page`／`r02Page`／`r03Page` 各自 `await context.newPage()`。
  - 每個 Page 導覽時固定帶入該角色的 `role`／`run_type`／`annotator_id`／`reviewer_id` query params（沿用 `_workspace-helpers.ts` 的 `buildWorkspaceUrl`／`buildListUrl` 型別與慣例，避免重造一套 URL builder）。
  - 因為共享 context = 共享 localStorage，PL 送出設定後、annotator 開新 tab 即可看到最新資料，符合角色交接的真實驗收目的。
  - **必須在文件中明確記錄這是 prototype 層的權宜設計**，不等同正式全端環境「每個角色各自獨立登入 session／JWT」的隔離語意；正式全端 E2E（`e2e/[module]/` 或依 ADR 決議路徑）才使用真正的 `storageState` per-role 檔案（如 `playwright/.auth/annotator.json`）搭配各自獨立 `BrowserContext`，因為屆時後端才是狀態的單一真實來源，不再需要靠共享瀏覽器 storage 傳遞狀態。
- `storageState` 在 prototype 層的唯一合理用途：**情境啟動前**一次性植入一組固定 fixture（例如預先寫好的 `labelsuite.wsSubmissions` 快照），取代目前「用 UI 一步步點出來」的重測試設定時間；不用來做角色間隔離。

### 3.2 Deterministic fixture 與唯一 scenario ID

- 沿用 issue 附註建議的最小合成資料集（試標 2 筆共同樣本 × 3 標記員；正式標記剩餘固定資料；R01/R02 至少一筆刻意分歧、R03 仲裁），但**不可**直接複用既有 `T001`／`sent-001..005` 這組被 39 個既有 spec 共用的 ID —— 一旦跨角色 E2E 與既有原子測試在 CI 中平行跑、且未來改成共享 context/storage 模式，相同 ID 會造成不可預期的資料互相覆寫。
- 建議為跨角色旅程保留獨立命名空間，例如 `task_id = XROLE-{run_id}`，`run_id` 用 Playwright `testInfo.workerIndex` + timestamp 或 UUID 產生，寫入時機在 `test.beforeEach`／自訂 fixture 內用 `patchDataFile`（`_workspace-helpers.ts:66-75`）把新種子注入對應 `*.data.js`，而不是編輯 `pages/` 下的既有檔案（沿用既有慣例，避免違反「不可修改 prototype 原始碼」的 QA 角色邊界）。
- 每個 scenario 執行都應該把 `scenario_id`／`run_id` 記錄進測試 artifact（見 3.6），方便對照失敗案例的資料快照。

### 3.3 資料清理與平行隔離策略

- 若跨角色單一 E2E 使用共享 context，**必須**在 `test.beforeEach`／自訂 fixture 中主動呼叫 `localStorage.clear()`（或更精準地只清跨角色旅程專屬的 namespace key），不能依賴 Playwright 預設的 context-per-test 隔離（2.4 節已確認現行套件靠這個隱含前提，但共享 context 模式會打破它）。
- 各狀態轉換的原子測試（試標提交、審核提交、仲裁投票等）應**維持**現行「各自獨立 `test()`、各自全新 context」的模式，不與跨角色單一 E2E 共用同一支 spec 檔，避免平行執行時互相干擾；兩者對 fixture ID 的要求不同（原子測試可續用既有 `T001` 系列以維持向後相容，跨角色 E2E 用專屬命名空間）。
- CI 層面：因目前 `prototype-playwright` job 未做 sharding，若新增的跨角色 E2E 執行時間明顯長於其他原子測試（预期會是，因為要跑完整旅程），建議在正式提案中評估是否需要拆成獨立 job 或加 `--shard`，避免拖慢既有套件的回饋速度；本輪僅需在文件中記錄此建議，不需在 W3 內做決定。

### 3.4 每個關鍵動作的 UI／URL／資料狀態斷言設計

延續 2.5 節已觀察到的三段式斷言慣例，建議跨角色 E2E 的每個關鍵動作（例如「A01 提交試標第 5 筆」）固定包含：

1. UI 斷言：對應的 `data-testid` 元件狀態變化（如 `ws-sample-item` 的 `data-submitted` 屬性，沿用 `task-detail-dry-run-status-sync.spec.ts:20` 已驗證過的 pattern）。
2. URL 斷言：導覽後 query string 是否符合契約（沿用 `annotation-workspace-url-sync.spec.ts` 的解析方式）。
3. 資料狀態斷言：透過 `page.evaluate` 呼叫對應 `window.LabelSuite*Data` 模組（`getSampleStatus`／`getReviewUnitStatus`／`getArbitrationState` 等既有匯出函式，見 2.5 節）驗證底層 bucket 是否真的落地正確的值，而不是只看 DOM 有沒有變。
4. 稽核紀錄斷言：由於 prototype 層目前**沒有**任何 audit-log 概念的匯出函式（1.11 節已確認 `grep -rln "audit"` 全庫查無），這一段只能斷言 `task-detail-review-history.spec.ts` 已示範的「work-log／review-history 面板顯示對應事件」，並在文件中明確標示「這不是正式 audit log（ADR-019）」，避免誤導成已完成 AC-19 稽核紀錄驗收。
5. **API／資料庫斷言留白**：prototype 層沒有網路請求也沒有 DB，這一欄在文件模板中應直接標記「N/A — 待正式全端 E2E」，不要用資料層斷言頂替，避免混淆分層邊界（見第 6 節、issue 12.8）。

### 3.5 錯誤情境設計

- **重新整理**：沿用 `annotation-workspace-save-draft.spec.ts:34` 已驗證的「reload 後草稿還原」pattern，擴充到跨角色情境（例如 R01 審核到一半 reload，未提交的判斷是否還在、A01 是否仍看不到）。
- **重複提交**：目前 MUST READ 清單中沒有專門測「連續點兩次提交按鈕」的測試（`annotation-workspace-submit-validation.spec.ts` 測的是欄位缺答阻擋，不是重複點擊防抖）；跨角色文件應新增這類 double-submit race 情境，並記錄 prototype 是否有 debounce／disable-on-click 機制可驗證。
- **逾時**：prototype 沒有真正的網路請求，「逾時」在這一層只能模擬成「locator 等待逾時後仍未出現預期狀態」，需在文件中說明這不等於正式後端的 timeout/retry 行為。
- **失敗復原**：例如 R01 送出審核判斷後 reload 失敗（頁面 JS 拋錯）—— 可沿用 `trackPageErrors`／`assertNoPageErrors`（2.5 節）作為底層機制，擴充成跨角色旅程裡任何一步都不能有未預期 page error 的全域斷言。
- **多人同時操作**：這是共享 context + 多 Page 設計（3.1 節）唯一能低成本模擬的情境 —— 例如 R01、R02 的 Page 交錯操作，驗證「R02 提交前 R01 的 Page 看不到 R02 的判斷」（沿用 `annotation-workspace-review-identity.spec.ts` 的資料層驗證方式，但改成兩個真正並存的 Page 而非同一 Page 換 URL）。**注意**：真正意義上的「並發寫入 race condition」在沒有後端鎖的 prototype 層無法被有意義地驗證，文件需明確排除這類斷言留給正式全端 E2E。

### 3.6 Screenshot／trace／video 與缺陷證據保存規則

- 現況缺口：`playwright.config.ts:20` 只設定 `trace: 'retain-on-failure'`，**未設定 `screenshot`／`video`**（Playwright 預設值為 `off`）。跨角色文件應明確提案：至少對跨角色 E2E 這一支長流程測試加開 `screenshot: 'only-on-failure'` 與 `video: 'retain-on-failure'`（不需動到既有 96 個原子測試的全域設定，可用 `test.use({...})` 或獨立 project 覆蓋，降低對既有套件執行時間的影響）。
- Artifact 命名應包含 3.2 節的 `scenario_id`／`run_id`，方便和失敗案例的資料快照對齊。
- 沿用既有 CI 慣例：`.github/workflows/ci.yml` 已將 `design/prototype/playwright-report/` 作為 `prototype-playwright-results` artifact 上傳，跨角色測試的 trace/video 應輸出到同一目錄樹下，不另建平行的 artifact pipeline。

### 3.7 鍵盤／a11y／i18n／responsive 檢核點

- 這些不是跨角色旅程主線的職責，但 12.4 CONDITIONAL 清單已有对应的既有原子測試可參考慣例，跨角色文件應「引用」而非「重造」：
  - a11y：`annotation/annotation-relation-identification-accessibility.spec.ts`
  - responsive：`annotation/annotation-mobile-collapsed-layout.spec.ts`
  - i18n：`annotation/annotation-workspace-i18n.spec.ts`、`task-management/task-new-i18n.spec.ts`（依 12.4 檔名清單，未逐檔精讀）
  - 鍵盤操作：`annotation/annotation-workspace-action-shortcuts.spec.ts`、`annotation/annotation-workspace-review-shortcuts.spec.ts`
- 建議跨角色文件只在「該檢核點會影響角色交接理解」時才嵌入主線旅程斷言（例如 PL 用鍵盤操作也能觸發「新增試標回合」），其餘留給既有 CONDITIONAL 套件覆蓋，避免跨角色 E2E 檔案過度肥大、難以維護。

---

## 4. 基礎設施風險

### 4.1 驗證 issue 12.8 已列項目

全部逐項驗證，結論：**12.8 列出的 5 項具體風險全部屬實**。

| 12.8 項目 | 驗證方式 | 結果 |
|---|---|---|
| `NAVIGATION.md` 記載不存在的 `annotation-workspace.panels/` | `grep -n "panels" design/prototype/NAVIGATION.md` 命中第 46、336 行提及 `annotation-workspace.panels/`；`ls design/prototype/pages/annotation/` 只有 4 個檔案（`annotation-list.html`／`annotation-workspace.{html,data.js,config.js}`），**無 `.panels/` 目錄** | ✅ 屬實 |
| `README.md` 記載不存在的 `shared/proto-bar.js`，且仍使用 npm 指令 | `README.md:172` 提到 `proto-bar.js`；同檔 `:19,32,40,151` 使用 `npm ci`／`npm test`／`npm run test:ui`／`npm run test:headed`／`npm run typecheck`，但 `package.json:16` 的 `packageManager` 欄位鎖定 `pnpm@10.18.3`，與 CLAUDE.md「Prohibitions」明文禁止 `npm install`／混用 lockfile 直接衝突 | ✅ 屬實 |
| `package-lock.json` 與 pnpm 並存 | `ls -la design/prototype/` 確認 `package-lock.json`（Apr 8）與 `pnpm-lock.yaml`（Apr 8）同時存在，兩者 mtime 相同（同次 commit 產生，非各自獨立維護），但只有 `pnpm-lock.yaml` 是 CI 實際使用的 lockfile（`ci.yml` 的 `cache-dependency-path: design/prototype/pnpm-lock.yaml`） | ✅ 屬實 |
| `annotation-guideline.pdf` 不存在 | `task-detail.data.js:1018` 參照 `../../assets/guidelines/annotation-guideline.pdf`；`ls design/prototype/assets/guidelines/` 回傳 `No such file or directory` | ✅ 屬實 |

### 4.2 W3 新發現的補充風險

1. **正式 E2E 目錄規範衝突已在治理文件層級被雙重確認**（12.8 已提及此衝突存在，本輪補上具體出處與己方角色定位）：
   - `docs/adr/009-testing-strategy.md:98,118`、`docs/adr/012-frontend-testing-strategy.md:28,368-401`、`docs/adr/014-prototype-playwright-testing.md:21,24,63-183` 全部一致採用 `frontend/tests/`。
   - `specs/_governance/testing-constitution.md:56` 採用 `e2e/[module]/`。
   - 而 senior-qa 的 agent 定義本身（本次任務 system prompt「Monorepo... `e2e/`（your exclusive ownership）」）已預設採用 testing-constitution 的路徑；`backend/tests/`、`frontend/src/**/__tests__/` 也都對齊 constitution 側的命名，而非 ADR 側。這代表**若不先由主 agent／team-lead 裁決正典優先順序，senior-qa 未來實際建立正式 E2E 目錄時很可能與 3 份 ADR 的既有敘述直接矛盾**，屬於必須在 checkpoint 解決、不能由 QA 工作流自行選邊的 source-precedence decision（呼應 issue 12.1 最後一段）。
   - 佐證現況：`ls e2e/`、`ls frontend/tests/` 均回傳 `No such file or directory`（`frontend/` 目前只有 `src/`）—— 兩個候選路徑都還沒有人建立，代表這是一個「必須趕在第一支正式 E2E 檔案落地前決議」的阻塞項，而非可以延後的技術債。

2. **Prototype 層完全沒有 audit log 概念**：`grep -rln "audit" design/prototype/` 全庫（含 `pages/` 與 `tests/`）查無結果。issue 第 6 節要求「每個關鍵動作同時定義 UI、URL、API／資料狀態與 audit log 斷言」，但 prototype 層連 audit log 的資料模型雛形都不存在（`work-log` 面板是效能統計，不是逐操作稽核軌跡，見 1.11 節）。這代表跨角色驗收文件裡的 audit log 欄位，在 prototype 層只能全面標記「N/A — 待正式全端 E2E（ADR-019）」，若不明確標示，容易被誤讀成「prototype 已經有稽核紀錄可驗收」。

3. **`playwright.config.ts` 未設定 `screenshot`／`video`**（2.6 節已述，此處歸類為風險）：目前只有 `trace: 'retain-on-failure'`。若跨角色 E2E 失敗，預設情況下除了 trace 之外沒有影片／截圖可供除錯，而長流程測試的 trace 檔案本身會相當大且不易快速定位失敗步驟，建議列為文件必須解決的落地前提，而非留待實作時才發現。

4. **`webServer.reuseExistingServer: !process.env.CI`**（`playwright.config.ts:33`）意謂本機開發時若已有殘留的 `serve.mjs` 進程在跑，Playwright 會直接重用它、不會重啟。若未來跨角色 fixture 需要「乾淨啟動」（例如伺服器啟動時預載某些一次性 fixture），這個設定在本機會靜默略過重啟，需要在文件的「已知限制」中提醒開發者，避免本機重現失敗案例時撈到過期的殘留狀態（雖然目前 fixture 都是靜態檔案而非伺服器啟動時生成，此風險目前影響有限，僅在採用 3.2 節建議的 `patchDataFile`／動態 fixture 方案時才會真正命中）。

5. **`serve.mjs` 對外提供的是整個 `design/prototype/` 目錄**（`ROOT = fileURLToPath(new URL('..', import.meta.url))`，即 `tests/` 的上一層），包含所有 `*.data.js` 與 fixture JSON 都可被任何測試的 `page.route()` 攔截／改寫（`patchDataFile` 正是利用這點）。這是既有慣例且運作良好，非新風險，但在跨角色文件設計「唯一 scenario ID + 動態 fixture 注入」時，需注意多個角色的 Page 若同時對同一個 `*.data.js` 呼叫 `page.route()` 攔截，攔截規則是 **per-Page** 註冊（Playwright route handler 綁定在呼叫的 `page`/`context` 上），共享 context 下若不同角色各自 patch 同一檔案，需確認彼此的 route handler 不會互相覆蓋或漏接——這是 3.1 節「多 Page 共享 context」設計需要在正式文件內具體驗證的技術細節，本輪僅記錄為待確認風險，不展開結論。

---

## 5. 狀態

**DONE_WITH_CONCERNS**

未解決事項（均需由主 agent／team-lead 或使用者 checkpoint 裁決，非 QA 工作流可獨立決定）：

1. 「成員不足時阻擋發布並顯示原因」「未解決 dispute 阻擋完成」兩項 issue 明文 AC，目前 prototype 層完全無對應測試，且後者的正典前置條件（ADR-022）本身尚未明確定義——需先由規格／架構工作流確認正典條件，QA 才能設計對應斷言，不能自行假設完成 gate 的規則。
2. 正式 E2E 目錄（`frontend/tests/` vs `e2e/[module]/`）的 ADR／constitution 衝突尚未裁決，直接影響 QA 自身未來的檔案所有權路徑，必須在正式全端 E2E 開始前解決。
3. 「角色獨立 BrowserContext」與「prototype 靠共享 localStorage 傳遞跨角色狀態」之間的架構衝突（2.3、3.1 節）需要在正式驗收文件定稿前，由主 agent 確認採用本報告建議的「共享 context + 多 Page」折衷方案，或改變 issue 原始措辭的期待。
4. IAA gate 的完整覆蓋依賴被本輪排除的 dataset 模組（1.6 節），需在正式文件中持續標示為 boundary case。
