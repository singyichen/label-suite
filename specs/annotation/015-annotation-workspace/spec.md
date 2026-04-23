# 功能規格：Annotation Workspace — 標記作業（Annotator / Reviewer）

**功能分支**：`015-annotation-workspace`  
**建立日期**：2026-04-23  
**版本**：1.2.0  
**狀態**：Draft  
**需求來源**：IA v1.3.1（2026-04-23）標記任務模組規範（`annotation-workspace`）

## 規格常數

- `TASK_ROLES = annotator | reviewer`
- `RUN_TYPES = dry_run | official_run`
- `TASK_TYPE_KEYS = single_sentence_classification | single_sentence_va_scoring`
- `ANNOTATION_WORKSPACE_ROUTE = /annotation-workspace`
- `ANNOTATION_ROUTE_QUERY = task_id | role | run_type | task_type`
- `TASK_CONTEXT_SOURCE = route_query + local_storage_fallback`
- `GUIDELINE_PANEL_TABS = guideline-files | history`
- `GUIDELINE_MODAL_BEHAVIOR = show-on-entry-per-page-load`
- `GUIDELINE_PANEL_COLLAPSE = desktop-toggleable`
- `SAMPLE_SOURCE_CONTRACT = sample_snapshot_id`
- `SUBMIT_DEFAULT_ACTION = go-to-next-sample`
- `AUTOSAVE_TRIGGERS = on-sample-switch | on-save-click | heartbeat`
- `AUTOSAVE_HEARTBEAT_INTERVAL_SECONDS = 15`
- `ACTIVE_TASK_TYPE_STORAGE_KEY = labelsuite.activeTaskType`
- `CONFLICT_RESOLUTION_POLICY = optimistic-lock-with-version-check`
- `MOBILE_BP = 767px`
- `RWD_VIEWPORTS = 375px / 768px / 1440px`

## Process Flow

```mermaid
sequenceDiagram
    actor AN as Annotator
    actor RV as Reviewer
    participant UI as annotation-workspace
    participant Query as URL Query
    participant Storage as localStorage

    AN->>UI: 從 Annotator dashboard 任務列點擊「快速繼續」
    UI->>Query: 讀取 role / run_type / task_type
    UI->>Storage: 讀取 labelsuite.activeTaskType（query 無 task_type 時）
    Storage-->>UI: 回傳 task_type fallback
    UI-->>AN: 顯示三欄工作區 + 進度列
    UI-->>AN: 入場顯示說明 modal（一次）
    AN->>UI: 標記、儲存、提交
    UI-->>AN: 更新完成數與定位

    RV->>UI: 從 Reviewer dashboard 任務列點擊「快速審核」
    UI->>Query: 讀取 role=reviewer
    UI-->>RV: 顯示 reviewer 操作（通過/退回/修正/刪除）
```

| Step | Role | Action | System Response |
|------|------|--------|----------------|
| 1 | `annotator` / `reviewer` | 由 dashboard 或 navbar 進入 `annotation-workspace` | 讀取 query context（`role/run_type/task_type`） |
| 2 | 系統 | 載入工作區資料 | 套用固定樣本、說明檔案與進度（原型內建資料） |
| 3 | `annotator` | 進行逐筆標記、儲存、提交 | 更新完成數，提交後預設進入下一筆 |
| 4 | `reviewer` | 審查結果、通過/退回、必要時修正 | 產生審查結果與歷程 |
| 5 | 使用者 | 切換下一筆/上一筆 | 右欄「說明與檔案」持續可見，不可被清空 |
| 6 | 使用者 | 中途操作 | 由 sample 切換、儲存、heartbeat 觸發自動儲存提示 |

---

## 使用者情境與測試 *(必填)*

### User Story 1 — Annotator 完成 Dry Run / Official Run 標記（優先級：P1）

Annotator 可在同一工作區中，依任務當前 `run_type` 完成逐筆標記並提交結果。

**此優先級原因**：標記作業是核心產出流程。  
**獨立測試方式**：以 `annotator` 身分分別進入 Dry Run 與 Official Run 任務，驗證標記、儲存、提交與進度更新。

**驗收情境**：

1. **Given** `role=annotator` 且 `run_type` 合法，**When** 進入 `annotation-workspace`，**Then** 顯示工作區與當前階段（Dry Run / Official Run）。
2. **Given** 正在標記樣本，**When** 點擊儲存，**Then** 系統保存草稿且更新該筆狀態。
3. **Given** 已完成可提交條件，**When** 點擊提交，**Then** 系統記錄提交並預設導向下一筆（`SUBMIT_DEFAULT_ACTION`）。
4. **Given** 切換樣本或手動儲存，**When** 有編輯行為發生，**Then** 顯示自動儲存狀態更新（Saving → Saved）。

**介面定義（需與 IA 導覽語意一致）**：

- 區塊 A：`上方任務目標列（固定）`
  - 必要元素：任務目標、操作指引、已標記數量、總量、當前階段、微型進度視覺
- 區塊 B：`三欄工作區（Desktop）`
  - 左欄：樣本清單、目前定位、完成狀態
  - 中欄：樣本內容、`task_type` 動態標記控制項、儲存/提交操作
  - 右欄：`說明與檔案`（預設）與 `History`（次頁）
- 區塊 C：`Mobile 佈局`
  - 精簡任務目標列 + 主操作區
  - 說明與檔案使用底部抽屜（預設收合，可展開），`History` 以分頁切換

**行為規則**：

- `annotation-workspace` 只能讀取由 task-detail 發布時凍結的 `sample_snapshot_id`。
- Dry Run 與 Official Run 樣本切分不可在 workspace 端重算或覆寫。
- 右欄 `說明與檔案` 在翻筆（上一筆/下一筆）後必須持續可見。
- 原型入場時固定顯示說明 modal 一次；關閉後右欄仍固定顯示說明內容。
- Desktop 右欄支援收合/展開切換按鈕，收合後可再次展開。
- 提交後預設停留於 workspace 並載入下一筆；任務全部完成時才顯示返回 dashboard 的完成導引。
- `task_type` 由 query 參數決定；若 query 缺值，回退 `labelsuite.activeTaskType`，最終回退為 `single_sentence_classification`。

---

### User Story 2 — Reviewer 審查與追溯歷程（優先級：P1）

Reviewer 在同一工作區執行審查，能通過、退回、修正、刪除標記結果，並追溯每筆修改歷程。

**此優先級原因**：Dry Run 一致性與正式資料品質依賴 reviewer 決策。  
**獨立測試方式**：以 `reviewer` 身分進入待審任務，驗證審查操作與 History 追溯欄位。

**驗收情境**：

1. **Given** `role=reviewer`，**When** 進入工作區，**Then** 在 Dry Run 與 Official Run 都顯示 reviewer 可用操作（通過/退回/修正/刪除）。
2. **Given** reviewer 退回或修正某筆結果，**When** 儲存審查，**Then** 該筆歷程新增一筆可追溯紀錄（誰、何時、改成什麼）。
3. **Given** reviewer 在 Dry Run 審查，**When** 需要產生標準答案，**Then** 可使用多數決或手動確認流程完成該筆決策。

**介面定義（需與 IA 導覽語意一致）**：

- 區塊 A：`中欄審查操作區`
  - 必要元素：原標記結果、審查決策按鈕（通過/退回）、直接修正/刪除操作
- 區塊 B：`右欄 History`
  - 必要元素：操作者、時間、欄位差異、決策狀態
- 區塊 C：`右欄說明與檔案`
  - 必要元素：任務說明摘要、檔案列表、預覽/新分頁開啟能力

**行為規則**：

- Reviewer 可於 Dry Run 協助產出標準答案（多數決或手動確認）。
- Reviewer 操作必須留下完整審計資訊，供後續品質追溯。
- Reviewer 與 Annotator 共用相同樣本來源契約與導覽骨架，避免視圖不一致。
- Reviewer 在 Dry Run 與 Official Run 皆可執行修正/刪除，但必須填寫審計理由後才能送出。

---

### User Story 3 — 路由上下文解析與進入控制（優先級：P1）

工作區由路由參數決定啟動上下文；`role`、`run_type`、`task_type` 缺值時需套用預設與回退邏輯。

**此優先級原因**：確保 dashboard/task-list/sidebar 進入工作區時可還原正確模式。  
**獨立測試方式**：模擬 `role/run_type/task_type` 組合與缺值案例，驗證畫面模式、語意與 fallback。

**驗收情境**：

1. **Given** query 含有效 `task_id` 且 `role=annotator` 或 `role=reviewer`，**When** 開啟工作區，**Then** 載入對應模式卡片與操作列。
2. **Given** query 缺少 `run_type`，**When** 開啟工作區，**Then** 使用預設 `dry_run`。
3. **Given** query 缺少 `task_type`，**When** 開啟工作區，**Then** 先讀取 `labelsuite.activeTaskType`，若仍缺值則回退 `single_sentence_classification`。

**行為規則**：

- 原型模式下，工作區啟動上下文以 query + localStorage 為主，不在頁面內做 API 權限判斷。
- 無效 `role` 值時，回退預設 `annotator` 呈現，避免頁面不可用。

---

### User Story 4 — 說明與檔案常駐 + 響應式體驗（優先級：P2）

使用者在 Desktop 與 Mobile 標記流程中都能持續查看說明內容，不因翻筆或版型切換遺失任務指引。

**此優先級原因**：降低標記偏差與操作中斷。  
**獨立測試方式**：在 `375px`、`768px`、`1440px` 驗證翻筆、切換 panel、切換階段時說明區持續可見。

**驗收情境**：

1. **Given** Desktop 三欄佈局，**When** 切換下一筆，**Then** 右欄說明不收起且內容不重置。
2. **Given** Mobile 底部抽屜模式，**When** 切換下一筆，**Then** 抽屜維持目前開合狀態，並保留目前 tab。
3. **Given** 檔案為 PDF/圖片/Markdown，**When** 在右欄點擊檔案，**Then** 能預覽（圖片/Markdown）或新分頁開啟（PDF）。

**行為規則**：

- `說明與檔案` 為本模組強制常駐資訊，不能只在入場 modal 顯示。
- Mobile 必須保留主操作優先，並以抽屜承載輔助資訊，不可遮蔽核心標記區。

---

### Edge Cases

- `task_type` query 值非支援類型時，需回退 `single_sentence_classification` 並保持頁面可操作。
- 使用者同時在多分頁操作同任務同樣本時，必須使用版本號檢查；版本衝突時阻擋覆寫並提示手動合併。
- 自動儲存由 `AUTOSAVE_TRIGGERS` 觸發；其中 heartbeat 週期為 `AUTOSAVE_HEARTBEAT_INTERVAL_SECONDS` 秒。
- 自動儲存失敗時，需保留本地編輯狀態並提供明確重試操作。
- `run_type` query 值缺失或非支援值時，前端需回退 `dry_run`。
- 說明檔案連結失效時，不影響標記主流程，但需顯示可追蹤錯誤訊息。

## Requirements *(必填)*

### Functional Requirements

- **FR-001**: 系統必須提供 `annotation-workspace` 作為 `annotator` 與 `reviewer` 的任務內工作頁。
- **FR-002**: 系統必須在進入工作區時解析 `ANNOTATION_ROUTE_QUERY`（`task_id`、`role`、`run_type`、`task_type`）。
- **FR-002A**: 由 dashboard 任務列進入時，`task_id` 必須對應被點擊的任務，且不得導向其他任務工作區。
- **FR-003**: `role` 僅支援 `annotator`、`reviewer`；非支援值必須回退 `annotator`。
- **FR-004**: `run_type` 僅支援 `dry_run`、`official_run`；缺值或非支援值必須回退 `dry_run`。
- **FR-005**: 工作區樣本來源必須鎖定為 `SAMPLE_SOURCE_CONTRACT`，不得在 workspace 端重算或覆寫切分。
- **FR-006**: 系統必須支援 `RUN_TYPES` 並在 UI 明確標示當前階段。
- **FR-007**: Annotator 模式必須支援逐筆標記、儲存草稿、提交。
- **FR-008**: Reviewer 模式必須支援通過、退回、修正、刪除標記結果。
- **FR-009**: Reviewer 在 Dry Run 必須可使用多數決或手動確認流程協助產出標準答案。
- **FR-010**: 系統必須記錄每筆資料的標記歷程（操作者、時間、修改內容）。
- **FR-010A**: Reviewer 在 Dry Run 與 Official Run 執行修正/刪除時，系統必須強制填寫審計理由並記錄。
- **FR-011**: Desktop 介面必須提供三欄工作區與固定任務目標列。
- **FR-012**: Mobile 介面必須提供精簡目標列、主操作區與底部抽屜說明區（預設收合）。
- **FR-013**: `說明與檔案` 面板必須於翻筆後持續可見，不可自動收起或清空。
- **FR-014**: 說明檔案至少必須支援圖片/Markdown 快速預覽與 PDF 新分頁開啟。
- **FR-015**: 原型頁每次 page load 進入時，必須顯示一次說明 modal。
- **FR-016**: 自動儲存必須支援 `on-sample-switch`、`on-save-click` 與每 `AUTOSAVE_HEARTBEAT_INTERVAL_SECONDS` 秒 heartbeat 觸發。
- **FR-016A**: 提交後預設行為必須為載入下一筆（`SUBMIT_DEFAULT_ACTION`）。
- **FR-016B**: 寫入標記結果時必須使用版本號檢查；版本衝突時阻擋覆寫並要求手動合併。
- **FR-017**: 工作區不得回傳任何 ground-truth 測試答案給 annotator 可見介面。
- **FR-018**: 工作區必須支援 `TASK_TYPE_KEYS` 並依 `task_type` 切換對應標記控制項（分類 / VA 雙維度）。
- **FR-019**: 工作區啟動時若缺少 `task_type` query，必須讀取 `ACTIVE_TASK_TYPE_STORAGE_KEY` 作為 fallback。

### User Flow & Navigation *(必填)*

```mermaid
flowchart LR
    D["/dashboard"] --> AW["/annotation-workspace?role=..."]
    D --> NAV["Navbar: 標記作業"]
    NAV --> AW
    AW --> NEXT["下一筆/上一筆（頁內）"]
    AW --> SUBMIT["提交（頁內）"]
    SUBMIT --> AW
    AW --> AUTO["sample 切換/手動儲存/heartbeat（自動儲存提示）"]
```

| From | Trigger | To |
|------|---------|----|
| `dashboard（annotator 視圖）` | 點擊任務列 `快速繼續` | `annotation-workspace?task_id=...&role=annotator` |
| `dashboard（reviewer 視圖）` | 點擊任務列 `快速審核` | `annotation-workspace?task_id=...&role=reviewer` |
| `annotation-workspace` | 提交完成 | `annotation-workspace`（下一筆） |
| `annotation-workspace` | 手動返回 | `dashboard` |

**Entry points**: `dashboard` Annotator/Reviewer 任務列表（快速繼續/快速審核）、Navbar 標記作業（由 query/localStorage 解析上下文）。  
**Exit points**: 手動返回 `dashboard`、任務完成導引返回 `dashboard`。

### Key Entities *(必填)*

- **TaskContext（Prototype）**: 任務上下文，至少包含 `task_id`、`role`、`run_type`、`task_type`。
- **AnnotationRecord**: 標記結果資料，包含樣本識別、標記內容、狀態（draft/submitted）、操作者與時間戳。
- **ReviewDecision**: Reviewer 決策資料，包含 `approve/reject/edit/delete` 結果與原因。
- **AnnotationHistoryItem**: 標記歷程節點，包含修改前後差異、操作者、時間、來源動作。
- **GuidelineAsset**: 任務說明資產，包含文字摘要、檔案清單、modal 與右欄同步呈現設定。

---

## Spec Dependencies *(必填)*

### Upstream（本 spec 依賴）

| Spec # | Feature | What this spec needs from it |
|--------|---------|------------------------------|
| shared-008 | Shared Sidebar Navbar | 登入後共用導覽結構與 active 規則 |
| dashboard-012 | Dashboard | Annotator/Reviewer 進入工作區入口與待辦卡 |
| task-management-013 | New Task | 任務類型設定、說明檔案、初始成員與 run 初始化 |
| task-management-014 | Task Detail | Dry/Official 狀態管理、`sample_snapshot_id` 凍結與發布流程 |

### Downstream（依賴本 spec）

| Spec # | Feature | What they rely on from this spec |
|--------|---------|----------------------------------|
| dataset-016 | Dataset Stats | 已提交標記結果與階段資料來源 |
| dataset-017 | Dataset Quality | Dry Run 審查結果、IAA 計算輸入與異常偵測基礎資料 |

---

## Success Criteria *(必填)*

- **SC-001**: `role/run_type/task_type` query 解析正確率達 100%，缺值時 fallback 行為符合規格常數。
- **SC-002**: `single_sentence_classification` 與 `single_sentence_va_scoring` 兩種 task type 均可完成標記提交流程。
- **SC-003**: 在 `375px / 768px / 1440px` 下，翻筆後 `說明與檔案` 內容維持，Desktop 可收合/展開且 Mobile 抽屜開合可用。
- **SC-004**: Annotator 與 Reviewer 主要流程（標記/審查/提交/返回）端到端可完成，且關鍵操作皆有歷程可追溯。
- **SC-005**: autosave 提示於 sample 切換、手動儲存、15 秒 heartbeat 皆可被觸發。

---

## Changelog

| Version | Date | Change Summary |
|---------|------|----------------|
| 1.2.0 | 2026-04-23 | Sync prototype behavior: query-driven launch context (`role/run_type/task_type`), active task type fallback, 15s autosave heartbeat, desktop guideline collapse, mobile drawer default collapsed |
| 1.1.0 | 2026-04-23 | Applied clarify decisions: submit default next sample, reviewer edit/delete audit rule, version-check conflict policy, autosave triggers, unified dashboard redirect |
| 1.0.0 | 2026-04-23 | Initial spec based on IA v1.3.1 annotation module rules |
