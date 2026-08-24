# Screen Inventory（頁面 → 元件反向索引）

> **用途：** 以「頁面」為主鍵列出每頁使用的元件，與 [inventory.md](inventory.md)（「元件 → 出現頁面」）互為反向索引，作為前端 feature 開發時的元件 checklist 與路由／權限／狀態測試矩陣依據。
>
> **本檔為 derived view——只讀不定義。** 元件規格唯一正典是 [MASTER.md](MASTER.md)；行為規格在 `specs/<module>/`；token 實作在 `design/prototype/assets/tokens.css`。本檔內容一律由 prototype 掃描產生並標注掃描日期，不得在此新增或修改任何定義。
>
> **來源：** `design/system/design-inventory.dc.html`（視覺對照畫布）· `design/system/inventory.md`
> **最後掃描：** 2026-07-10（與 inventory.md 同步）
> **本檔產生：** 2026-08-24

---

## 維護時機

**本檔必須與 inventory.md 同一次掃描同步更新**（掃描日期必須一致）。觸發條件沿用 inventory.md「維護時機」表，外加：

| 觸發 | 動作 |
|------|------|
| Prototype 新增頁面 | 在「畫面 × 元件」表加入該頁列，並更新出現次數統計 |
| 既有頁面新增／移除元件 | 更新該頁列與出現次數統計 |
| 頁面新增 URL 參數視圖（scenario / tab / task_type / 狀態） | 在「同頁多重視圖」表加入該視圖 |
| inventory.md 重新掃描 | 本檔同步重掃，兩檔掃描日期一致 |

## 前端開發用法

1. **元件建置優先序**＝「出現次數統計」的降冪排序——出現在越多頁面的元件越先做（進 `frontend/src/shared/`），先補 Storybook story 再開頁面（ADR-016）。
2. **Feature 元件 checklist**＝「畫面 × 元件」表中該頁的列——每開一個 `frontend/src/features/<module>/`，以該頁元件清單為 checklist，缺的元件先補 story。
3. **路由 × 權限 × 狀態測試矩陣**＝「同頁多重視圖」表——36 個視圖（URL 參數 × 角色 × task_type × 錯誤/空狀態）可直接轉成正式 e2e 的 Playwright spec 清單（目錄位置見 ADR-034）。

---

## 元件出現次數統計（建置優先序）

依 2026-07-10 掃描的 15 頁計算：

| 出現頁數 | 元件 | 出現頁面（編號） |
|:---:|------|------|
| 15 | Language Toggle 語言切換 | 全部 |
| 15 | Button（CTA / Primary / Secondary / Ghost / Danger / OAuth / Icon-only） | 全部 |
| 11 | Navbar / Sidebar（共用側欄） | 05–15 |
| 8 | Card 卡片 | 01–06, 09, 15 |
| 7 | Table 表格 | 06, 07, 09, 10, 12, 13, 14 |
| 6 | Input 輸入框 | 01–05, 08 |
| 6 | Modal 對話框 | 06, 07, 09, 11, 12, 13 |
| 5 | Mini Button 列內小按鈕 | 07, 09, 10, 11, 12 |
| 5 | Status Badge 狀態徽章 | 05, 06, 07, 09, 12 |
| 5 | Pagination 分頁 | 07, 09, 10, 12, 14 |
| 5 | Link（Inline / Action） | 01–04, 06 |
| 4 | Chip（VA / 分類 / Cause…） | 08, 09, 11, 15 |
| 3 | Task Type / Run Mode Badge | 07, 09, 14 |
| 3 | Toolbar（搜尋＋篩選＋清除） | 07, 10, 14 |
| 3 | Desktop Content Tabs 內容頁籤 | 09, 12, 13 |
| 3 | Color Dot 色點 | 08, 09, 15 |
| 3 | Divider 分隔線 | 01, 05, 06 |
| 2 | State Panel 狀態面板 | 03, 04 |
| 2 | Breadcrumb 麵包屑 | 09, 15 |
| 2 | Avatar 頭像 | 05, 06 |
| 2 | Skeleton 載入佔位 | 05, 09 |
| 1 | Status Pill（無框軟底） | 10 |
| 1 | Alert Banner 警示橫幅 | 01 |
| 1 | Toast 浮動提示 | 05 |
| 1 | Activity List 活動清單 | 06 |
| 1 | Step Indicator 步驟指示 | 08 |
| 1 | Upload Zone 上傳區 | 08 |
| 1 | Tag Input / Pill 標籤輸入 | 08 |
| 1 | Toggle Switch 開關 | 08 |
| 1 | Code Editor（Schema） | 08 |
| 1 | Accordion 手風琴 | 08 |
| 1 | State Switcher ⚠ prototype-only | 06 |

> 建議第一批（`frontend/src/shared/`）：Language Toggle、Button、Navbar/Sidebar、Card、Table、Input、Modal——出現 6 頁以上的元件全數在列。

## 畫面 × 元件（15 頁）

| # | 頁面 | Module | Spec | 使用元件 |
|---|------|--------|------|----------|
| 01 | 登入 `account/login.html` | account | specs/account/001 | Auth Card、Logo + Wordmark、Language Toggle、Input（Email/密碼）、Eye Toggle、Inline Field Error、Button/CTA、Button/OAuth、Alert Banner/Error、Divider/Text、Link（Inline/Action） |
| 02 | 註冊 `account/register.html` | account | specs/account/003 | Auth Card、Logo + Wordmark、Language Toggle、Input + Leading Icon、Eye Toggle、Field Hint、Inline Field Error、Required Indicator、Button/CTA、Link/Action |
| 03 | 忘記密碼 `account/forgot-password.html` | account | specs/account/004 | Auth Card、Logo、Language Toggle、Input + Leading Icon、Inline Field Error、Button/CTA（Loading）、State Panel/Success、Loading Status（aria-live）、Link/Action |
| 04 | 重設密碼 `account/reset-password.html` | account | specs/account/004 | Auth Card、Logo、Language Toggle、Input + Leading Icon、Eye Toggle、Field Hint、Inline Field Error、Button/CTA、State Panel（Success/Token Error） |
| 05 | 個人資料 `account/profile.html` | account | specs/account/005 | Navbar + Sidebar、Card、Divider、Avatar/Large（Uploadable）、Role Badge、Input（Normal/Error/Readonly）、Toast（Success/Error）、Skeleton/Shimmer |
| 06 | 儀表板 `dashboard/dashboard.html` | dashboard | specs/dashboard/012 | Navbar + Sidebar、Mobile Bottom Tab Bar、Summary Card（KPI）、Table、Activity List、Status Badge、Avatar/Small、Button（Primary/Secondary/Ghost/Danger/Icon-only）、Modal、Scenario Switcher ⚠ PROTO |
| 07 | 任務列表 `task-management/task-list.html` | task-management | specs/task-management/010 | Navbar + Sidebar、Toolbar、Button/Primary、Table、Badge（Task Status/Task Type/Run Mode）、Pagination、Modal、Mini Button |
| 08 | 建立任務 `task-management/task-new.html` | task-management | specs/task-management/013 | Navbar + Sidebar、Step Indicator、Upload Zone、Tag Input/Pill、Toggle Switch、Code Editor、Chip（Select/Bypass Toggle）、Accordion、Color Dot、Button（Primary/Secondary） |
| 09 | 任務詳情 `task-management/task-detail.html` | task-management | specs/task-management/014 | Navbar + Sidebar、Breadcrumb、Desktop Content Tabs、5 個 fetch partials、Table（expandable）、Pagination、Chip（VA/Classification/Metric/md-chip）、Badge/Run Mode、Color Dot、Skeleton/Pulse、Modal、Mini Button |
| 10 | 標記任務列表 `annotation/annotation-list.html` | annotation | pages/annotation-list.md | Navbar + Sidebar、Toolbar、List/Table、Status Pill、Pagination、Mini Button |
| 11 | 標記工作區 `annotation/annotation-workspace.html` | annotation | specs/annotation/015 | Navbar + Sidebar、閱讀面板（Atkinson Hyperlegible）、Config-driven 標記面板（8 種 output type）、Result Tag、Chip/Classification、Mini Button（Approve/Reject）、Modal |
| 12 | 使用者管理 `admin/user-management.html` | admin | specs/admin/006 | Navbar + Sidebar、Desktop Content Tabs、Table、Role/Status Badge、Pagination、Mini Button（primary/danger）、Modal |
| 13 | 角色設定 `admin/role-settings.html` | admin | specs/admin/007 | Navbar + Sidebar、Desktop Content Tabs、Table、Modal/Destructive（alertdialog）、Button/Danger |
| 14 | 資料集分析列表 `dataset/dataset-analysis-list.html` | dataset | specs/dataset/016 | Navbar + Sidebar、Toolbar、Table、Badge/Task Type、Pagination |
| 15 | 資料集分析詳情 `dataset/dataset-analysis-detail.html` | dataset | specs/dataset/017 | Navbar + Sidebar、Breadcrumb、Stats/Quality partials（8 型態 × 2）、Status Dot、Chip/Cause Tag、Table |

## 同頁多重視圖（36 視圖）

同一 HTML 依 URL 參數／頁內狀態切換的視圖清單。每列可直接對應一條正式 e2e 測試（路由 × 權限 × 狀態）。

### 入口 `index.html`

| # | 視圖 | URL 參數 | 說明 |
|---|------|----------|------|
| V00 | 入口導向頁 | （無） | Meta refresh 自動導向 `pages/account/login.html` |

### 儀表板 `dashboard/dashboard.html`（4 角色視角，⚠ 切換器 prototype-only）

| # | 視圖 | URL 參數 | 說明 |
|---|------|----------|------|
| V01 | 系統管理員 | `?scenario=super_admin_data` | 平台總覽 KPI、使用者管理捷徑 |
| V02 | 專案負責人 | `?scenario=project_leader` | 空狀態 CTA「建立第一個任務」 |
| V03 | 標記員 | `?scenario=annotator` | 待辦標記清單 |
| V04 | 審核員 | `?scenario=reviewer` | 審查佇列 |

### 任務列表 `task-management/task-list.html`

| # | 視圖 | URL 參數 | 說明 |
|---|------|----------|------|
| V05 | 專案負責人視角 | `?task_role=project_leader` | 建立任務 CTA、run materialization |
| V06 | 標記員視角 | `?task_role=annotator` | 唯讀列表 |
| V07 | 審核員視角 | `?task_role=reviewer` | 審查導向列操作 |
| V08 | 載入失敗 | `?view=error` | Alert Banner + 重試 |

### 任務詳情 `task-management/task-detail.html`（5 tabs + 角色）

| # | 視圖 | URL 參數 | 說明 |
|---|------|----------|------|
| V09 | 標記進度 | `?tab=annotation-progress` | 進度表格 + Pagination |
| V10 | 標記結果 | `?tab=annotation-results` | Expandable rows、VA scoring chips |
| V11 | 成員管理 | `?tab=member-management` | md-chip、密集列操作 |
| V12 | 工時紀錄 | `?tab=work-log` | 工時表格 + Pagination |
| V13 | 審核員角色 | `?task_role=reviewer` | 成員管理 tab 隱藏 |

### 標記清單 `annotation/annotation-list.html`

| # | 視圖 | URL 參數 | 說明 |
|---|------|----------|------|
| V14 | 審核員佇列 | `?role=reviewer` | 審查單元（sample × annotator × run_type）、unit 狀態 pill |

### 標記工作區 `annotation/annotation-workspace.html`（8 種輸出型態 + 組合 + 審查，ADR-029）

| # | 視圖 | URL 參數（節錄） | 說明 |
|---|------|----------|------|
| V15 | single_label | `?task_id=T001&…&task_type=single_label` | 分類 chips（radio） |
| V16 | multi_label | `?task_id=T002&…&task_type=multi_label` | 多選 chips（checkbox） |
| V17 | single_dim | `?task_id=T004&…&task_type=single_dim` | 評分滑桿 |
| V18 | multi_dim | `?task_id=T005&…&task_type=multi_dim` | 多維度滑桿 |
| V19 | sequence_tagging | `?task_id=T006&…&task_type=sequence_tagging` | Token 級標記（BIO）、Color Dot |
| V20 | entity_recognition | `?task_id=T007&…&task_type=entity_recognition` | Span 選取高亮 |
| V21 | relation_identification | `?task_id=T008&…&task_type=relation_identification` | 實體對關係連結 |
| V22 | free_text | `?task_id=T009&…&task_type=free_text` | Textarea 生成式輸入 |
| V23 | 組合輸出 ABSA | `?task_id=T013&sample_id=absa-001&…` | ER + RI + multi_dim 整合面板 |
| V24 | 審查模式 | `?task_id=T001&role=reviewer&…` | Approve/Reject、答案 diff |

### 資料集分析詳情 `dataset/dataset-analysis-detail.html`（型態 × tab）

| # | 視圖 | URL 參數 | 說明 |
|---|------|----------|------|
| V25 | single_label 統計 | `?task_id=T001&tab=stats` | 標籤分佈 |
| V26 | multi_label 統計 | `?task_id=T002&tab=stats` | 共現統計 |
| V27 | single_dim 統計 | `?task_id=T004&tab=stats` | 分數分佈直方 |
| V28 | multi_dim 統計 | `?task_id=T005&tab=stats` | 各維度分佈 |
| V29 | sequence_tagging 統計 | `?task_id=T006&tab=stats` | Tag/token 統計 |
| V30 | entity_recognition 統計 | `?task_id=T007&tab=stats` | Entity 型別統計 |
| V31 | relation_identification 統計 | `?task_id=T008&tab=stats` | IAA fail：Status Dot（紅） |
| V32 | free_text 統計 | `?task_id=T009&tab=stats` | 長度分佈 |
| V33 | 品質監控（single_label） | `?task_id=T001&tab=quality` | IAA 門檻、Cause Tag |
| V34 | 品質監控（組合輸出） | `?task_id=T013&tab=quality` | 三輸出品質分區 |
| V35 | 空狀態 | `?task_id=T001&tab=stats&s_state=empty` | Empty state CTA |
