# 功能規格：Dataset Analysis List — 任務列表頁（模組入口）

**功能分支**：`016-dataset-analysis-list`  
**建立日期**：2026-04-24  
**版本**：1.3.0  
**狀態**：In Progress  
**需求來源**：IA v1.3.2（2026-04-24）`dataset-analysis-list` 任務列表頁（模組入口）

## 規格常數

- `TASK_ROLES_ALLOWED = project_leader | reviewer`
- `DATASET_ANALYSIS_LIST_ROUTE = /dataset-analysis`
- `DATASET_ANALYSIS_DETAIL_ROUTE = /dataset-analysis-detail/:task_id`
- `LIST_EMPTY_STATE_TRIGGER = no_tasks_with_membership`
- `INVALID_TASK_TRIGGER = task_not_found_or_no_membership`
- `IAA_BADGE_STATES = pass | fail | pending | not_started`
- `PAGE_SIZE_DEFAULT = 20`
- `PAGE_SIZE_OPTIONS = 20 | 50 | 100`
- `LIST_QUERY_PARAMS = keyword | task_type | iaa_status | page | page_size`
- `MOBILE_BP = 767px`
- `RWD_VIEWPORTS = 375px / 768px / 1440px`

## Process Flow

```mermaid
sequenceDiagram
    actor PL as Project Leader / Reviewer
    participant NAV as Sidebar Navbar
    participant LIST as dataset-analysis-list
    participant DETAIL as /dataset-analysis-detail/:task_id

    PL->>NAV: 點擊「資料集分析」
    NAV->>LIST: 導向 /dataset-analysis
    LIST-->>PL: 顯示具成員資格的任務列表
    PL->>LIST: 搜尋 / 套用篩選 / 分頁
    PL->>LIST: 點擊任務列
    LIST->>DETAIL: 導向 /dataset-analysis-detail/:task_id?tab=stats
```

| Step | Role | Action | System Response |
|------|------|--------|----------------|
| 1 | `project_leader` / `reviewer` | 點擊 Navbar「資料集分析」 | 導向 `/dataset-analysis` |
| 2 | 系統 | 載入列表資料 | 顯示具成員資格的任務列表 |
| 3 | 使用者 | 輸入搜尋 / 套用任務類型、IAA 狀態篩選 / 切換分頁 | 列表即時更新並保留查詢條件 |
| 4 | 使用者 | 點擊任務列 | 導向 `/dataset-analysis-detail/:task_id?tab=stats` |

---

## 使用者情境與測試 *(必填)*

### User Story 1 — 進入資料集分析模組入口（優先級：P1）

使用者由 Navbar 進入資料集分析模組後，可看到自己具 `TASK_ROLES_ALLOWED` 成員資格的任務列表，作為後續進入 analysis detail 的主要入口；Dashboard badge deep link 為合法次入口。

**此優先級原因**：本頁是資料集分析模組的 L1 landing；若沒有此頁，使用者無法選擇分析任務。  
**獨立測試方式**：以具多個 `TASK_ROLES_ALLOWED` membership 的帳號進入頁面，驗證列表資料、搜尋、任務類型/IAA 狀態篩選、分頁、IAA 狀態徽章與導向行為正確。

**驗收情境**：

1. **Given** 使用者至少具一個 `TASK_ROLES_ALLOWED` task membership，**When** 點擊 Navbar「資料集分析」，**Then** 導向 `/dataset-analysis`，顯示該使用者具成員資格的任務列表。
2. **Given** 位於 `/dataset-analysis`，**When** 輸入關鍵字並套用任務類型 / IAA 狀態篩選，**Then** 列表僅顯示符合條件的任務列。
3. **Given** 搜尋或篩選結果超過單頁，**When** 切換分頁，**Then** 顯示對應頁資料且保留現有查詢條件。
4. **Given** 任務列表顯示，**When** 點擊任一任務列，**Then** 導向 `/dataset-analysis-detail/:task_id?tab=stats`。
5. **Given** 使用者無任何具成員資格的任務（`LIST_EMPTY_STATE_TRIGGER`），**When** 進入 `/dataset-analysis`，**Then** 顯示空狀態文字「尚無可分析的任務」。
6. **Given** 某任務的 quality 結果已產生，**When** 任務列顯示，**Then** `IAA 狀態徽章` 以 `pass` 或 `fail` 呈現最終結果；尚未產生最終結果時則顯示 `pending` 或 `not_started`。
7. **Given** 使用者套用搜尋或篩選後無符合結果，**When** 查看列表區，**Then** 顯示空結果狀態並提供清除篩選操作。

**介面定義（需與 IA 導覽語意一致）**：

- 頁面副標題：`資料集標記一致性與任務執行情形分析`
- 區塊 A：`任務列表區`
  - 呈現形式：表格式列表，視覺樣式需對齊 `task-management-010 / task-list`
  - 必要元素：任務名稱、任務類型、完成率、IAA 狀態徽章、成員角色
- 區塊 A-1：`搜尋與篩選列`
  - 必要元素：任務類型篩選器、IAA 狀態篩選器、關鍵字搜尋、清除篩選
- 區塊 A-2：`列表底部分頁列`
  - 必要元素：總筆數/目前頁數資訊、每頁筆數切換、上一頁/下一頁、頁碼按鈕
- 區塊 B：`空狀態`
  - 必要元素：說明文字「尚無可分析的任務」
- 區塊 C：`空結果狀態`
  - 必要元素：說明文字、清除篩選操作

**行為規則**：

- 列表僅顯示使用者具 `TASK_ROLES_ALLOWED` 角色的任務。
- 搜尋輸入框需配置於篩選器列靠右位置；手機版可換行但不得移除。
- 任務類型篩選查詢值必須使用 task type registry / enum 值；顯示文案由 i18n 映射，不可作為 API 契約值。
- IAA 狀態篩選查詢值必須使用 `IAA_BADGE_STATES`；顯示文案由 i18n 映射，不可作為 API 契約值。
- 查詢條件（`keyword`、`task_type`、`iaa_status`、`page`、`page_size`）需同步到 URL query，於同頁分頁切換、重新整理與返回 `/dataset-analysis` 時保留。
- 點擊任務列導向 detail 頁時，預設進入 `?tab=stats`。
- `IAA 狀態徽章` 僅反映 quality 結果摘要狀態，不顯示原始 IAA 數值；狀態集合為 `IAA_BADGE_STATES`。
- 列表預設每頁筆數為 `PAGE_SIZE_DEFAULT`，可切換 `PAGE_SIZE_OPTIONS`。

---

### Edge Cases

- 使用者沒有任何符合 `TASK_ROLES_ALLOWED` 的任務 membership：顯示空狀態，不顯示錯誤頁。
- 使用者僅具 `annotator` membership、無任何 `TASK_ROLES_ALLOWED` membership：顯示空狀態，不導回其他頁面。
- 使用者以舊連結或無效 `task_id` 嘗試進入 detail 頁：由 detail spec 處理 `INVALID_TASK_TRIGGER` 並導回列表頁。
- 高篩選條件組合導致無結果：顯示空結果狀態，保留一鍵清除篩選。
- URL query 夾帶不支援的 `page_size`：回退至 `PAGE_SIZE_DEFAULT`。
- 手機版（`<= MOBILE_BP`）表格、篩選列與分頁需可完整操作，不可發生資訊重疊。

## Requirements *(必填)*

### Functional Requirements

- **FR-001**: 系統必須提供 `DATASET_ANALYSIS_LIST_ROUTE`（`/dataset-analysis`）作為資料集分析模組的入口頁（L1）。
- **FR-002**: 系統必須以 task membership role 作為列表資料過濾依據；僅具 `TASK_ROLES_ALLOWED` membership 的任務可出現在頁面上。
- **FR-003**: 任務列表必須僅列出使用者具 `TASK_ROLES_ALLOWED` 角色的任務。
- **FR-004**: 任務列表必須提供全欄位搜尋、任務類型篩選、IAA 狀態篩選與分頁。
- **FR-004A**: `IAA 狀態徽章` 必須僅反映該任務最新 quality 結果摘要狀態，狀態值限定為 `pass | fail | pending | not_started`。
- **FR-004B**: 任務類型篩選查詢值必須使用 task type registry / enum 值，且與顯示文案分離。
- **FR-004C**: IAA 狀態篩選查詢值必須使用 `IAA_BADGE_STATES`，且與顯示文案分離。
- **FR-004D**: 分頁預設為 `PAGE_SIZE_DEFAULT`，可切換 `PAGE_SIZE_OPTIONS`。
- **FR-004E**: 查詢條件（`LIST_QUERY_PARAMS`）必須同步至 URL query，並在重新整理、分頁切換與返回列表時保留。
- **FR-005**: 每列任務必須顯示任務名稱、任務類型、完成率、IAA 狀態徽章、成員角色。
- **FR-005B**: 當 `LIST_EMPTY_STATE_TRIGGER` 觸發時，頁面必須顯示空狀態說明文字「尚無可分析的任務」。
- **FR-005A**: `空結果（篩選後）` 必須顯示清除篩選操作，且清除後返回無篩選列表狀態。
- **FR-006**: 點擊任務列必須導向 `DATASET_ANALYSIS_DETAIL_ROUTE`（`/dataset-analysis-detail/:task_id`），預設進入 `?tab=stats`。
- **FR-007**: 頁面必須支援 `RWD_VIEWPORTS`，在 `<= MOBILE_BP` 仍可完成搜尋、篩選、分頁、任務選取與導頁操作。

### User Flow & Navigation *(必填)*

```mermaid
flowchart LR
    NAV["Sidebar：資料集分析"] --> LIST["/dataset-analysis（任務列表）"]
    LIST -->|點擊任務列| DETAIL["/dataset-analysis-detail/:task_id?tab=stats"]
```

| From | Trigger | To |
|------|---------|----|
| `Sidebar Navbar` | 點擊「資料集分析」 | `/dataset-analysis` |
| `dataset-analysis-list` | 點擊任務列 | `/dataset-analysis-detail/:task_id?tab=stats` |

**Entry points**: Sidebar Navbar「資料集分析」。  
**Exit points**: 點擊任務列進入 analysis detail。

### Key Entities *(必填)*

- **TaskSummaryRow**: 任務列表資料列，至少包含 `task_id`、`task_name`、`task_type`、`overall_completion_rate`、`membership_role`、`iaa_status`。
- **IAAStatusSummary**: quality 結果摘要狀態，列舉值為 `pass | fail | pending | not_started`；供列表頁資料列徽章顯示使用。
- **DatasetAnalysisListViewState**: 列表視圖狀態，包含 `keyword`、`task_type`、`iaa_status`、`page`、`page_size`。

---

## Spec Dependencies *(必填)*

### Upstream（本 spec 依賴）

| Spec # | Feature | What this spec needs from it |
|--------|---------|------------------------------|
| shared-008 | Shared Sidebar Navbar | 登入後共用導覽結構與 active 規則（資料集分析 L0 項） |

### Downstream（依賴本 spec）

| Spec # | Feature | What they rely on from this spec |
|--------|---------|----------------------------------|
| dataset-017 | Dataset Analysis Detail | detail 頁入口路徑、task row 導頁行為、列表頁返回目標 |

---

## Success Criteria *(必填)*

- **SC-001**: 進入 `/dataset-analysis` 時，任務列表正確顯示使用者具成員資格的任務。
- **SC-002**: 每列任務皆正確顯示任務名稱、任務類型、完成率、IAA 狀態徽章、成員角色，且徽章值僅為 `pass | fail | pending | not_started` 之一。
- **SC-003**: 搜尋、任務類型篩選、IAA 狀態篩選、分頁可獨立與組合運作，並於同頁更新結果。
- **SC-004**: `LIST_QUERY_PARAMS` 可於重新整理、分頁切換與返回列表時正確保留。
- **SC-005**: `LIST_EMPTY_STATE_TRIGGER` 觸發時，正確顯示「尚無可分析的任務」空狀態。
- **SC-006**: `空結果（篩選後）` 正確顯示清除篩選操作，且清除後返回完整列表。
- **SC-007**: 點擊任務列後，正確導向 `/dataset-analysis-detail/:task_id?tab=stats`。
- **SC-008**: 使用者僅具 `annotator` membership、無任何 `TASK_ROLES_ALLOWED` membership 時，頁面顯示空狀態且不顯示不可存取錯誤。
- **SC-009**: 在 `375px / 768px / 1440px` 三種視窗寬度下，表格、篩選列與分頁皆可正常操作且可完成導頁。

---

## Changelog

| Version | Date | Change Summary |
| --- | --- | --- |
| 1.3.0 | 2026-04-30 | Sync with current prototype: 列表入口改為對齊 task-list 的 table layout；新增 task type / IAA status / keyword filters、footer pagination、URL query 保留、空結果清除篩選、membership role 欄位 |
| 1.2.1 | 2026-04-24 | Clarify entry/permission/badge semantics: 列表頁改為主要入口而非唯一入口；權限以 task membership role 為準；補入 IAA badge state enum（pass/fail/pending/not_started） |
| 1.2.0 | 2026-04-24 | Narrow scope to pure IA planning for `dataset-analysis-list`: 移除 stats/detail 詳細規格，僅保留列表入口、空狀態與導向 detail 行為 |
| 1.1.0 | 2026-04-24 | Redesign: 採用任務列表入口 + 雙 Tab 架構（統計總覽 / 品質監控），路由改為 /dataset-analysis-detail/:task_id，task_type 改由 API 載入 |
| 1.0.0 | 2026-04-24 | Initial spec based on IA v1.3.1 dataset module — dataset-stats page |
