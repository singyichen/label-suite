# Issue #180 W5 — 跨角色測試基礎設施設計（草稿）

角色：`senior-qa`｜狀態：**草稿**，供主 agent 整合進階段三正式文件 `docs/product/e2e/cross-role-task-lifecycle-playwright-plan.md`
範圍：`account` · `dashboard` · `task-management` · `annotation`（排除 dataset 分析模組，依 issue #180 邊界）
本文件只做規劃，不新增／修改任何 `.spec.ts`、不改 `playwright.config.ts`。

## 0. 正典依據與分層聲明（先於設計條目重申，避免下文被斷章引用）

- **D1（`phase2-decision-list.md:46`）**：本輪一切 Playwright 產出（含本文件規劃的 fixture／helper）一律留在 `design/prototype/tests/`；`frontend/tests/` vs `e2e/[module]/` 之爭延後為獨立 `[Task]` issue，與本文件無關。
- **主 agent 裁決 #2（`traceability-matrix.md:11`）**：prototype 層採「**單一共享 BrowserContext ＋ 每角色一個 Page ＋ query params 切換身分**」；「角色獨立 BrowserContext／storageState」保留給未來正式全端 E2E。本文件第 3 節依此裁決設計，不重新討論是否採用。
- **分層聲明（貫穿全文，尤其第 3、4 節）**：prototype 層的任何斷言都只驗證「靜態 HTML＋localStorage＋前端 JS 模組函式」的行為，**不可宣稱**已驗證 JWT、真實 RBAC、資料庫交易、後端 API 或後端安全性（`w3-playwright-qa.md` §2.3 第 142 行、§3.4 第 195 行已有相同限定，此處延續同一措辭，不重新定義）。

---

## 1. Deterministic fixture 策略

### 1.1 現況：三層既有 fixture 來源（先核實再設計，避免與既有機制重複造輪）

| 層級 | 位置 | 證據 | 用途／限制 |
|---|---|---|---|
| A：per-output-type 原始上傳資料 | `docs/product/example-data/*.json`（13 檔，每個 output type 一份：`single-label.json`／`multi-label.json`／`multi-dim.json`／`multi-label-hierarchical.json`／`entity-recognition.json`／`relation-identification.json`／`sequence-tagging.json`／`medical-ner-re.json`／`nli.json`／`mrc.json`／`absa-va.json`／`single-dim.json`／`free-text.json`） | 已被既有測試消費：`task-new-output-type-preview.spec.ts:14` `const EXAMPLE_DATA = path.resolve(__dirname, '../../../../docs/product/example-data')` | **正典的「PL 實際上傳檔案」代表**；每筆記錄形如 `{"id": "sent-001", "text": "...", "gold_label": "positive"}`（`docs/product/example-data/single-label.json:2-6`）。已涵蓋每個 output type 各自的上傳/預覽解析，不需在跨角色測試中重複造 13 組 |
| B：獨立小型 fixture 檔 | `design/prototype/tests/task-management/three-column-dataset.json` | 4 行、2 筆 `sentence_a`／`sentence_b`／`label` 記錄（已 Read 核實） | 僅供 `item_pair` 類 task-new 測試使用，範圍窄，不是跨角色主線的適用形狀 |
| C：內嵌種子 | 各 `pages/**/*.data.js` 內的 `T001..T0xx` profile（如 `annotation-workspace.data.js` 的 `sent-001..005`） | `w3-playwright-qa.md` §2.4 第 148 行：「近 40 個 MUST READ 檔案中重複引用」 | 是近 40 個既有原子測試的共用命名空間；跨角色測試**不可**複用同一批 ID（見第 2 節） |

補充：`design/prototype/pages/dashboard/dashboard.assignments.js:33-51` 是第四種、獨立於上述三層的靜態投影——`assignments[]` 陣列以 `exampleTaskId`（如 `'T001'`）加上 `workItem(sampleId, detail, progress, runType, status)` 建構出 Dashboard 的 `roleLists.annotator`／`roleLists.reviewer`（`:290-307`）。它不是 localStorage、不是即時計算，而是**手動與 `annotation-workspace.data.js` 的 profile 對齊的靜態陣列**——這代表：若跨角色 fixture 使用全新 `task_id`（如下述 `XROLE-*`），Dashboard 的「待辦」卡片**不會自動出現**該任務，因為 `dashboard.assignments.js` 沒有動態關聯機制。跨角色主線流程若要驗證「Dashboard 待辦入口」節點（追溯矩陣 #2），必須額外用 `patchDataFile` 對 `dashboard.assignments.js` 注入一筆新 assignment，或該節點在跨角色測試中改用 `annotation-list.html` 直接進入（略過 Dashboard 待辦卡片斷言），並在文件中註明此限制，不能預期新種子自動出現在 Dashboard。

### 1.2 跨角色主線 fixture 設計提案

- **不新增第 14 份 output-type 範例**：跨角色主線的核心驗收目標是「生命週期節點串接」而非「逐 output type 覆蓋」（後者已由 39+ 原子測試覆蓋，`w3-playwright-qa.md` §1.1–§1.11）。因此固定選用 `single_label`（`docs/product/example-data/single-label.json` 形狀）作為主線 output type，避免把「output type 特例」與「生命週期串接」兩種缺陷混在同一支測試裡，難以定位失敗原因。
- **新檔案**：`design/prototype/tests/cross-role/fixtures/xrole-lifecycle-seed.json`
  - 形狀與 Layer A 對齊：`{"id": string, "text": string, "gold_label": "positive"|"negative"|"neutral"}[]`。
  - 筆數設計（呼應 `traceability-matrix.md:12`「試標 2 筆共同樣本 × 3 標記員；正式標記剩餘固定資料；R01/R02 至少一筆刻意分歧、R03 仲裁」與 W3 建議的最小合成集）：
    - `dry_run`：2 筆（`xr-dry-001`／`xr-dry-002`），3 位標記員（A01–A03）各自對這 2 筆提交，供 IAA gate 節點做最小可判讀驗證（`w3-playwright-qa.md` §1.6 已界定為 boundary case，不驗證具體 IAA 數值計算）。
    - `official_run`：3 筆（`xr-off-001..003`），3 位標記員各自完整標記。
    - 其中 `xr-off-002` 的 2 位審核員（R01/R02）**必須**故意給出不同判斷（例如一位「approve」、一位「modify」成不同標籤），以確定性方式觸發 dispute（對應追溯矩陣 #12 需要 R01/R02 刻意分歧才能生成 dispute item，`annotation-dispute-items.spec.ts:115-215` 既有測試已示範同類手法）。
  - `gold_label` 欄位比照既有 13 份 Layer A 檔案的既定慣例（管理端合成資料本就含 gold label，非外洩——外洩是指「回傳給標記員的 API／DOM 內容」，見第 4 節安全測試段落與既有 `annotation-workspace-data-fairness.spec.ts:26-67` 的驗證方式）。
- **不修改** `pages/**/*.data.js`（越界，屬產品原始碼，QA 不可觸碰）；改用既有機制 `patchDataFile()`（`_workspace-helpers.ts:66-75`）在 `test.beforeEach` 內對 `annotation-workspace.data.js`（與必要時 `dashboard.assignments.js`）做 runtime patch，注入上述 `XROLE-*` task profile。新增 helper 檔 `design/prototype/tests/cross-role/fixtures/build-xrole-patch.ts`，匯出 `buildXRoleSeedPatch(taskId: string): string`，回傳可直接餵給 `patchDataFile(page, 'annotation-workspace.data.js', buildXRoleSeedPatch(taskId))` 的 patch script 字串——具體 patch script 內容留待 Generator 階段撰寫，本文件只定義簽名與呼叫慣例。
- **與 D2/D3 的關係**：fixture 本身不含「completed 前置條件」或「成員不足阻擋」的邏輯（那是產品規則，屬 spec/ADR 修訂範圍）；fixture 只需提供「3 位標記員、2 位審核員、1 位仲裁者」剛好等於 `min_annotators`／`min_reviewers` 門檻的資料量，讓 D2／D3 的 FR 落地後可以直接在同一批 fixture 上補「調降到 1 位標記員 → 阻擋」的負向情境（不需要重建整組 fixture）。

---

## 2. Scenario ID 與資料清理

### 2.1 唯一 scenario ID 命名規則

- 格式：`XROLE-{scenario-slug}-{run_id}`，例如 `XROLE-happy-path-{run_id}`、`XROLE-dispute-arbitration-{run_id}`。
- `run_id` 生成：`` `${test.info().workerIndex}-${Date.now()}` ``（Playwright 內建 `testInfo.workerIndex`，不需額外套件），確保同一 CI 執行內、跨 worker 平行執行時，即使兩個 worker 幾乎同時跑同一支 spec 的不同 test，`task_id` 字面值也不會相同。
- 此 ID 同時作為：(a) `annotation-workspace.data.js` bucket key的 `taskId` 分量、(b) 第 4 節證據保存的 artifact 檔名前綴、(c) 若需要 `dashboard.assignments.js` patch，作為新 assignment 的 `exampleTaskId`。三處統一用同一個字串，避免失敗時要對照三份不同命名規則的紀錄。
- **不可**複用 `T001`／`T002`／`sent-001..005` 等既有種子 ID（`w3-playwright-qa.md` §3.2 第 177 行已提出相同限制，此處延續）：這批 ID 被 39+ 個既有原子測試字面寫死引用（`w3-playwright-qa.md` §2.4 第 148 行），跨角色測試若複用會在「未來若改為共享 storageState 預載」的情境下產生資料互相覆寫風險。

### 2.2 localStorage 命名空間隔離——具體到既有 bucket key 機制

隔離**不是**靠新增清理程式碼，而是靠**善用既有 bucket key 的既定分量順序**：

- 標記提交：`submissionBucketKey(taskId, role, runType, identity)` → 組出 `taskId::role::runType::annotatorId::reviewerId`（`annotation-workspace.data.js:162-167`，已 Read 核實），所有身分共用同一個 `labelsuite.wsSubmissions` key，但巢狀在各自的複合鍵底下（`:15` `SUBMISSION_STORAGE_KEY`）。
- 仲裁投票：`arbitrationBucketKey(taskId, runType, identity)` → 組出 `taskId::runType::annotatorId`（`annotation-workspace.data.js:1563-1566`，已 Read 核實），存在 `labelsuite.wsArbitration`（`:1552`）。
- 因為 `taskId` 是兩個 bucket key 函式的**第一個、也是最左側**分量，只要跨角色 fixture 使用第 2.1 節的唯一 `XROLE-*` task_id，該 scenario 寫入的所有巢狀鍵（不論標記員/審核員/仲裁者身分如何排列組合）天然與其他 scenario、其他既有 39+ 原子測試的 `T00x` 系列**字串層級不相交**，不需要額外的 `localStorage.clear()` 或 teardown 程式碼即可達成隔離。
- **何時仍需要顯式清理**：僅限於「同一支跨角色 spec 內、同一個 `test()` 要重跑同一組角色但换一輪 scenario」的情境（例如 `test.step` 內部要重置某個角色的答案重新走一次），此時建議在 `test.beforeEach` 呼叫 `page.evaluate(() => localStorage.removeItem('labelsuite.wsSubmissions'))` 精準清該 key，而非清整個 `localStorage`（避免波及 `labelsuite.guidelineModalSeen` 等其他無關 key，`_workspace-helpers.ts:47-51`）。**不建議**全域 `afterEach` 清理：跨角色測試本質上要在同一個 test 內累積跨角色的狀態變化（PL 設定 → 標記員提交 → 審核員審核 → 仲裁），中途清空反而破壞旅程語意。

### 2.3 平行執行下測試間互不污染

- Playwright 每個 `test()` 預設拿到全新 `BrowserContext`（`playwright.config.ts:11` `fullyParallel: true`；`w3-playwright-qa.md` §2.2 第 129 行已確認 96 個既有 spec 靠此隱含前提安全平行）。跨角色測試在**單一 test() 內**用「一個共享 context + 多個 Page」（第 3 節），但這個 context 本身仍是 Playwright 為該 test 分配的全新 context，因此：
  - 跨角色測試與其他跨角色測試之間、跨角色測試與 39+ 個既有原子測試之間，即使同時被不同 worker 平行執行，也**不共享**同一個瀏覽器 profile / localStorage store——這一層隔離不需要本文件額外設計，是 Playwright 既有機制的自然延伸。
  - 真正需要人工介入避免碰撞的，只有「同一個 context 內、多個 Page 對同一個 `*.data.js` 檔案各自呼叫 `page.route()`」的情境——`w3-playwright-qa.md` §4.2 第 5 點已標注這是「per-Page 註冊」的技術細節，需在正式撰寫階段逐一確認每個角色 Page 的 route handler 不會互相覆蓋或漏接同一檔案的攔截規則（本文件僅重申此為待驗證風險，不展開解法，避免與 W3 既有結論重複）。
  - CI 層面：`prototype-playwright` job（`.github/workflows/ci.yml:295-333`）目前未做 sharding，跨角色測試預期執行時間長於既有原子測試，是否需要拆 job／加 `--shard` 留給正式落地提案評估（沿用 `w3-playwright-qa.md` §3.3 第 185 行既有建議，不重複展開）。

---

## 3. 多角色身分模擬

### 3.1 具體實作模式

依主 agent 裁決 #2，採「單一共享 `BrowserContext` + 每角色一個 `Page` + query params 切換身分」。骨架（沿用 `_workspace-helpers.ts` 既有型別與 URL builder，不重造）：

```ts
// design/prototype/tests/cross-role/xrole-lifecycle.spec.ts（規劃中的檔名，尚未建立）
import { test } from '@playwright/test';
import { buildWorkspaceUrl, buildListUrl } from '../annotation/_workspace-helpers';

test('PL creates task, 3 annotators dry-run, 2 reviewers + 1 arbiter resolve dispute, PL completes and exports', async ({ browser }) => {
  const context = await browser.newContext(); // 一次
  const plPage = await context.newPage();
  const a01Page = await context.newPage();
  const a02Page = await context.newPage();
  const a03Page = await context.newPage();
  const r01Page = await context.newPage();
  const r02Page = await context.newPage();
  const r03Page = await context.newPage(); // 仲裁者

  // 每個角色 Page 導覽時固定帶入該角色的 role/run_type/annotator_id/reviewer_id
  await a01Page.goto(
    buildWorkspaceUrl({ task_id: taskId, sample_id: 'xr-dry-001', role: 'annotator', run_type: 'dry_run', annotator_id: 'A01' })
  );
  // ...
});
```

- `buildWorkspaceUrl`／`buildListUrl` 的型別簽名（`_workspace-helpers.ts:11-41`，已 Read 核實）已內建 `role`／`run_type`／`annotator_id`／`reviewer_id` 四個 query params，**沿用即可**，不需要為跨角色測試新增第二套 URL builder。
- Query params 約定（沿用既有，不新增）：`task_id`（必填）、`sample_id`（workspace 頁必填）、`role: 'annotator' | 'reviewer'`、`run_type: 'dry_run' | 'official_run'`、`annotator_id`／`reviewer_id`（省略則退回預設 roster identity，`_workspace-helpers.ts:14-16`）。仲裁者角色目前**沒有獨立的 `role=arbiter`** query 值——仲裁介面是 `reviewer` 角色底下的「仲裁版面」（`annotation-workspace-arbitration.spec.ts:103-237` 已驗證），R03 應以 `role: 'reviewer'`、獨立的 `reviewer_id: 'R03'` 進入同一個 workspace URL，靠介面本身判斷是否顯示仲裁版面，而非靠新的 query 值——這點需在正式文件中明確標注，避免誤植不存在的 `role=arbiter`。

### 3.2 分層限制聲明（必須逐字納入正式文件）

> 原型層的多角色身分模擬僅透過「URL query params + localStorage 複合鍵」實現視覺與資料層的角色區隔（`annotation-workspace.data.js:162-167`／`:1563-1566`）。**原型層不能宣稱已驗證 JWT、真實 RBAC（角色權限邊界僅由前端 JS 決定是否渲染特定 UI，未經任何伺服器端授權檢查）、資料庫交易（無資料庫，僅 `localStorage`）、或後端安全性（無網路請求，`serve.mjs` 純靜態檔案伺服器）。** 所有跨角色斷言的真實含金量止於「前端狀態機與資料模型層的正確性」。

### 3.3 對照表：原型層做法 vs 未來正式 E2E 做法

| 面向 | 原型層（本文件範圍） | 未來正式全端 E2E（不在本文件範圍，D1 延後決議） |
|---|---|---|
| 角色隔離單位 | 單一共享 `BrowserContext`，每角色一個 `Page`（分頁），共享同一份 `localStorage` | 每角色獨立 `BrowserContext`，經由 `storageState` 匯入各自的已登入 session |
| 身分切換方式 | URL query params（`role`／`run_type`／`annotator_id`／`reviewer_id`） | 真實登入流程或預先產生的 per-role `storageState` JSON（如 `playwright/.auth/annotator-a01.json`） |
| 資料隔離機制 | 前端 JS 計算的 localStorage 複合鍵（`taskId::role::runType::annotatorId::reviewerId`） | 後端資料庫的 row-level 權限查詢（依 ADR-021「task role 即時查 `task_membership`」） |
| 跨角色狀態同步 | 同一 context 共享 storage，PL 設定後 annotator 開新 tab 即可讀到最新資料 | 真實 API 呼叫／資料庫寫入後由後端提供，前端不需要靠共享瀏覽器 storage 傳遞狀態 |
| `storageState` 用途 | 僅用於**情境開始前**一次性植入固定 fixture 快照（非角色隔離工具） | 用於角色隔離本身（每個角色一個 storageState 檔） |
| 可驗證安全邊界 | 「UI 是否渲染／隱藏特定元素」「資料模型函式回傳值是否正確區隔」 | 「未授權角色呼叫 API 是否被伺服器拒絕」「JWT 過期/竄改是否被正確處理」 |

（此表格延伸自 `w3-playwright-qa.md` §3.1 第 172 行的既有建議，本文件補齊表格形式與逐欄位對照，未新增未經核實的結論。）

---

## 4. 證據保存規則

### 4.1 現行設定與缺口

- `playwright.config.ts:20`：`trace: 'retain-on-failure'`。**未設定** `screenshot`／`video`（Playwright 未設定時預設為 `off`），已由 `w3-playwright-qa.md` §3.6 第 207 行、§4.2 第 3 點第 245 行明確指出。
- CI 現況：`.github/workflows/ci.yml:328-333` 已將整個 `design/prototype/playwright-report/` 上傳為 `prototype-playwright-results` artifact（`always()` 條件，即使測試失敗也上傳）。跨角色測試的證據應輸出到同一目錄樹，不另建平行 artifact pipeline（沿用 `w3-playwright-qa.md` §3.6 第 209 行既有建議）。

### 4.2 驗收輪需要的設定差異提案

- **不修改全域設定**（避免拖慢既有 96 個原子測試、影響既有套件執行時間），改為在跨角色 spec 內用 `test.use({...})` 局部覆蓋，或另立獨立 Playwright `project`（例如 `cross-role`）：
  - `screenshot: 'only-on-failure'`
  - `video: 'retain-on-failure'`
  - `trace: 'retain-on-failure'`（維持現行全域值，不需加強為 `on`，避免長流程 trace 檔案過大）
- 觸發條件：跨角色主線每個關鍵節點轉換（見第 5 節列表）建議搭配 `test.step()` 包裹，讓失敗時的 trace viewer 能定位到「哪一個角色的哪一個動作」失敗，而不是整支長流程籠統顯示紅字。
- Artifact 命名：檔名／`test.step` 標題應包含第 2.1 節的 `scenario_id`（如 `XROLE-happy-path-{run_id}`），方便把失敗案例的截圖/影片與該次 scenario 寫入 `localStorage` 的資料快照對齊（沿用 `w3-playwright-qa.md` §3.6 第 208 行既有建議）。

### 4.3 缺陷證據去敏要求（附到 GitHub issue 前）

- 依 Constitution NON-NEGOTIABLE「Data Fairness」，跨角色截圖／影片若意外顯示 `gold_label`／`answer` 欄位（例如 PL 視角的設定頁本就會顯示，這是合法情境；但若不慎截到標記員視角卻外洩該欄位，則本身就是要回報的 Critical 缺陷，而非單純去敏問題）：
  - 附到公開 GitHub issue 前，先確認截圖/影片中出現的身分是否為「該畫面合法可見」的角色（沿用 `annotation-workspace-data-fairness.spec.ts:26-67` 定義的合法可見範圍：output-role prefill 只能出現在使用者自己的答案控制元件內）。
  - 若證據本身就是在證明「標記員視角外洩了 gold_label」，這類發現依 `.claude/rules/issue-reporting.md` 的 Critical/High 安全發現規則，**不建立公開 issue**，改走 `SECURITY ESCALATION REQUIRED` 私下路徑，證據附件僅提供給 team-lead／repo owner，不留在公開 issue 附件或截圖中。
  - 一般 UI／流程缺陷（無敏感欄位外洩疑慮）的截圖/影片可直接附公開 issue，不需額外去敏處理——prototype 全庫本就是合成假資料（`docs/product/example-data/*.json` 內容為虛構文字，無真實個資），风险主要來自「角色可見範圍是否正確」而非「資料本身是否為真實個資」。

---

## 5. 測試檔案組織

### 5.1 目錄與命名建議

```
design/prototype/tests/
├── task-management/          # 既有，39+ 個 output-type/setup 相關原子測試，不動
├── annotation/                # 既有，workspace/review/dispute/arbitration 原子測試，不動
├── dataset/                   # 既有，排除在本輪範圍外，不動
├── serve.mjs                  # 既有，共用靜態伺服器
└── cross-role/                 # 新增：跨角色主線 E2E 專屬目錄
    ├── fixtures/
    │   ├── xrole-lifecycle-seed.json      # 第 1.2 節：single_label 形狀的合成資料
    │   └── build-xrole-patch.ts           # 第 1.2 節：patchDataFile 用的 patch script builder
    └── xrole-task-lifecycle.spec.ts        # 主線 happy path：建立→…→完成→匯出
    └── xrole-dispute-arbitration.spec.ts   # 分支情境：R01/R02 分歧→dispute→R03 仲裁（可併入主線或獨立，視 Generator 階段執行時間評估）
```

- 選擇獨立 `cross-role/` 子目錄而非塞進 `task-management/` 或 `annotation/`：跨角色主線橫跨兩個既有模組目錄，若塞入任一方都會造成「這支測試屬於哪個模組」的歸屬模糊；獨立目錄也讓第 4.2 節提議的獨立 Playwright `project`／`test.use()` 覆蓋範圍容易用 glob（`cross-role/**`）精準匹配，不影響既有 `task-management/`／`annotation/` 目錄下測試的預設證據保存設定。
- 檔名前綴 `xrole-` 呼應第 2.1 節的 `XROLE-*` scenario ID 命名，方便從檔名直接聯想到資料命名空間。
- 錯誤情境（第 3.5 節 W3 已規劃：重新整理、重複提交、逾時模擬、失敗復原、多人同時操作）建議收斂進同一批 `cross-role/` 檔案內，依情境拆檔（如 `xrole-error-recovery.spec.ts`），不要把錯誤情境斷言散落插入 happy-path 主線檔案，避免主線檔案過度肥大（沿用 `w3-playwright-qa.md` §3.7 第 218 行「避免跨角色 E2E 檔案過度肥大」的既有提醒，套用到全部錯誤情境而非僅 a11y/i18n）。

### 5.2 與既有測試檔的共存確認

- 不修改、不刪除 `task-management/`／`annotation/` 下任何既有檔案；跨角色測試純新增。
- Fixture 命名空間（`XROLE-*` task_id、`cross-role/fixtures/` 目錄）與既有 `T001..T0xx`／`three-column-dataset.json` 完全不相交（第 1.1、2.1 節已核實），`grep -rn "XROLE" design/prototype/tests/` 目前應為零筆（新目錄尚未建立），可作為 Generator 階段落地前的 sanity check。
- `patchDataFile()` 攔截目標檔名以 `annotation-workspace.data.js`（必要時 `dashboard.assignments.js`）為主，不修改任何 `pages/**/*.data.js` 原始碼；因為 `serve.mjs` 是無狀態靜態伺服器（`Cache-Control: no-store`，`serve.mjs:54`），新增 `cross-role/` 目錄下的檔案不需要任何額外的伺服器端註冊或路由設定即可被既有 `webServer` 自動提供服務。

---

## 6. 執行環境

### 6.1 Serve 方式與 port 約定

- 沿用既有機制，不新增第二套伺服器：`design/prototype/playwright.config.ts:30-34` 的 `webServer.command: 'node tests/serve.mjs'`，固定 `baseURL: 'http://127.0.0.1:8888'`（`playwright.config.ts:19`，字面 IPv4 避免 `localhost` 解析到 `::1` 造成連線落空）。
- `scripts/serve-prototype.sh` 純委派同一支 `serve.mjs`（`w3-playwright-qa.md` §2.1 第 123 行），供本機預覽用，**不可用於 CI 或正式環境**——跨角色測試比照既有慣例，一律透過 Playwright `webServer` 自動啟動，不手動另開伺服器。
- Port 固定走 `serve.mjs` 的 argv 參數，不吃環境變數 `PORT`（`serve.mjs:21-24` 註解已說明原因），跨角色測試不需要、也不應該為了「多角色」而嘗試起多個埠——多角色是靠同一個 context 內的多個 Page 對同一個 origin 發請求，不是多伺服器架構。

### 6.2 CI 注意事項與已記載的 flake 教訓

- **http.server flake 教訓（已在 repo 內記載，予以引用）**：`serve.mjs:4-11` 註解與 `playwright.config.ts:24-29` 註解一致記載：先前用 Python `http.server`（含 `ThreadingHTTPServer` 變體）在平行測試負載下會間歇性斷線（`net::ERR_SOCKET_NOT_CONNECTED`），導致頁面全域變數未定義、拖累不相關測試的 flake；`docs/adr/014-prototype-playwright-testing.md:5` 記錄此變更於 2026-08-18 生效。跨角色測試的長流程（多 Page、多次導覽）比既有短測試更依賴伺服器連線穩定性，**必須**沿用現行 Node 版 `serve.mjs`，不可為了跨角色測試另外引入任何 Python-based 或第三方靜態伺服器。
- `webServer.reuseExistingServer: !process.env.CI`（`playwright.config.ts:33`）：CI 上一律強制重啟（`CI` 環境變數在 GitHub Actions 中預設為 `true`），跨角色測試在 CI 上不會受本機殘留進程影響；本機開發時若已有殘留 `serve.mjs` 進程，Playwright 會直接重用，**不會**因為新增 `cross-role/fixtures/` 檔案而自動反映（因為 `serve.mjs` 是無狀態檔案伺服器，重用舊進程本身不影響檔案內容是否最新——真正需要注意的是本機瀏覽器快取或 `page.route()` 攔截邏輯本身是否寫錯，而非伺服器進程新舊，此點沿用 `w3-playwright-qa.md` §4.2 第 4 點的既有分析，不重複展開）。
- CI job 配置現況：`prototype-playwright` job（`.github/workflows/ci.yml:295-333`）僅在 `design/prototype/package.json` 存在時觸發（`needs.validate.outputs.prototype-exists`），單一 job、無 sharding，`pnpm test` 一次跑完整套件，測試產物一律上傳至 `prototype-playwright-results`（`:330-333`）。跨角色測試加入後若明顯拉長整體 CI 時間，屬於第 2.3 節已提及的「是否需要拆 job／加 shard」評估範圍，本文件不在此節重複展開結論。

---

## 未解決事項（需主 agent／使用者 checkpoint 裁決，非本文件可獨立決定）

1. **`dashboard.assignments.js` 動態關聯缺口**（第 1.1 節新發現）：跨角色 fixture 使用全新 `XROLE-*` task_id 時，Dashboard 待辦卡片不會自動出現該任務（`dashboard.assignments.js` 是手動同步的靜態陣列，非即時計算）。需決定：(a) 額外 `patchDataFile` 對 `dashboard.assignments.js` 注入一筆 assignment 以完整驗證追溯矩陣 #2 節點，或 (b) 該節點在跨角色主線中改用 `annotation-list.html` 直接進入、略過 Dashboard 待辦卡片斷言（Dashboard 待辦卡片本身已有既有原子測試覆蓋 F-03/F-04，不一定要在跨角色主線重複驗證）。本文件傾向 (b)（降低 fixture 複雜度、與追溯矩陣 #2 判定「PL 逐列 CTA＝Requirement gap」也一致，該節點的完整驗收本就等待 enhancement 落地），但屬於範圍取捨判斷，留待 checkpoint 確認。
2. **仲裁者 URL 身分表示法**（第 3.1 節）：確認「R03 以 `role: 'reviewer'` + 獨立 `reviewer_id` 進入 workspace，靠介面本身判斷顯示仲裁版面」是否與 `annotation-workspace-arbitration.spec.ts` 既有測試的身分模擬方式完全一致（本文件依現有 `Role` 型別只有 `'annotator' | 'reviewer'` 兩值推論，`_workspace-helpers.ts:11` 已核實無第三值，但仲裁版面觸發條件的完整邏輯未在本輪逐行核實，建議 Generator 階段撰寫第一支跨角色 spec 前，先讀 `annotation-workspace-arbitration.spec.ts` 全文確認）。
3. **`xrole-dispute-arbitration.spec.ts` 是否併入主線**（第 5.1 節）：取決於 happy-path 主線加入 dispute/arbitration 分支後的執行時間，是否超過建議的單一長流程測試合理長度，需 Generator 階段實際撰寫後才能評估，本文件先保留兩個檔案並存的彈性。

---

最後更新：本文件為階段三 W5 草稿，尚未經主 agent 統一檢查（traceability coverage、placeholder、內部連結、Mermaid、驗收條件二元可測性）。
