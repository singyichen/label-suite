---
功能分支: feat/shared/008-sidebar-navbar-shared
建立日期: 2026-04-16
版本: 2.2.0
狀態: Clarified
---

# 功能規格：Shared Sidebar Navbar（共用側欄導覽）

**需求來源**: 資訊架構 [docs/product/ia/information-architecture.md](../../../docs/product/ia/information-architecture.md) §2.1 Sidebar Navbar（跨模組共用）

## 功能目標

提供全站登入後頁面共用的 Sidebar／Navbar 導覽契約——L0 模組導覽（依 `system_role` 條件顯示）、語言與外觀切換、通知鈴鐺、快捷鍵總覽入口，以及 Desktop／Mobile 的 RWD 與 Desktop Mini/Icon-only 收合行為——確保 `dashboard`／`task-management`／`annotation`／`dataset`／`admin`／`account` 六大模組頁在同一份共用元件（`design/prototype/pages/shared/sidebar.js`／`sidebar.css`）下呈現一致的導覽骨架、active 映射與可存取語意。

## 輸入與生成規則

**輸入描述**：本規格需定義 Shared Sidebar Navbar 的跨頁共用 UI 契約、導覽/工具入口、狀態持久化、i18n、可存取屬性與 RWD 行為。

**產生規格時必須遵守**：

1. 先確認本規格範圍與需求來源一致：資訊架構 [docs/product/ia/information-architecture.md](../../../docs/product/ia/information-architecture.md) §2.1 Sidebar Navbar（跨模組共用）。
2. 若新增或改動角色權限、導頁、資料欄位、錯誤狀態、i18n、可存取屬性或響應式邊界，必須同步檢查使用者情境、功能需求、成功標準與規格相依性。
3. 若需求描述缺少角色、狀態、資料來源、權限、錯誤處理、導頁目標或量化門檻，需以待釐清標記記錄具體問題，不得自行假設。
4. 規格應描述使用者可觀察行為、業務規則與驗收條件；避免描述框架、檔案結構、API 實作或資料庫實作，除非該內容本身是已定義的產品契約。
5. 本規格若與 prototype、IA 或上游規格不一致，必須明確記錄差異、更新相依性，並新增 changelog。

**已釐清事項**：

- 本版以既有需求來源與本文件中的 流程圖、使用者情境、功能需求、成功標準 作為 scope baseline。
- 跨頁或跨模組共用行為需透過「規格相依性」追蹤，不在本文件中隱含建立未列出的依賴。
- 若後續新增實作層契約，需先確認是否構成行為變更；若是，必須依 SDD 流程更新 spec。

## Clarifications

### Session 2026-05-22

- Q: Mobile 版是否要顯示快捷鍵總覽入口？ → A: Mobile 完全不支援快捷鍵總覽入口與 `?`。
- Q: 使用者點擊 L0 `標記作業` / `資料集分析` 但缺少對應任務角色或 task context 時，應導回哪裡？ → A: `標記作業` 導回 `/dashboard`；`資料集分析` 導回 `/task-list`。
- Q: 通知 dropdown 的通知資料來源在本規格中應如何界定？ → A: 僅定義前端展示契約，通知資料由頁面或 prototype mock 提供。

## 規格常數

- `SIDEBAR_WIDTH = 240px`
- `SIDEBAR_COLLAPSED_WIDTH = 88px`
- `MOBILE_BP = 767px`
- `MOBILE_TOP_HEIGHT = 64px`
- `MOBILE_BOTTOM_NAV_HEIGHT = 84px`
- `RWD_VIEWPORTS = 375px / 768px / 1440px`
- `SUPPORTED_PAGES = /dashboard, /task-list, /task-new, /task-detail, /annotation-list, /annotation-workspace, /dataset-analysis, /dataset-analysis-detail/:task_id, /user-management, /role-settings, /profile`
- `ACTIVE_TASK_TYPE_STORAGE_KEY = labelsuite.activeTaskType`
- `SIDEBAR_COLLAPSED_STORAGE_KEY = labelsuite.sidebarCollapsed`
- `APPEARANCE_STORAGE_KEY = label-suite-theme`
- `APPEARANCE_MODES = light | dark | system`
- `APPEARANCE_DEFAULT_RESOLVED = light`（`system` 固定解析為 `light`，不跟隨 OS `prefers-color-scheme`）
- `SIDEBAR_UTILITY_ACTIONS = shortcut_help | appearance_toggle | notification_bell`
- `SHORTCUT_HELP_SCOPE = current_page_common_shortcuts`
- `NOTIFICATION_BADGE_MAX_DISPLAY = 9+`（未讀數超過 9 顯示 `9+`）
- `NOTIFICATION_DATA_SOURCE = page_or_prototype_mock`（本規格僅定義前端展示契約，不定義通知 API 或後端事件模型）

## 流程圖

```mermaid
sequenceDiagram
    actor 使用者
    participant 頁面 as 任一登入後頁面
    participant navbar as Shared Sidebar Navbar
    participant authz as 權限/任務上下文判斷
    participant i18n as 語系字典

    使用者->>頁面: 載入登入後頁面
    頁面->>authz: 取得 system role + task membership + task context
    頁面->>navbar: 依 IA 渲染 L0 導覽（Core/Work/Admin/Account）
    頁面->>navbar: 設定 active 導覽項 + aria-current
    頁面->>i18n: 套用語系文字（zh/en）
    i18n-->>navbar: 更新 nav 文案、語言按鈕、登出 aria/title

    使用者->>navbar: 點擊 L0 導覽項
    navbar->>authz: 驗證可見性與進入條件
    authz-->>navbar: 導頁或導回 Landing + 提示

    使用者->>navbar: 點擊語言切換
    navbar->>i18n: 切換語系
    i18n-->>navbar: 更新所有 navbar 文案與可存取屬性
    i18n-->>頁面: 同步更新右側目前模組頁內容文案

    使用者->>navbar: 在 Desktop 點擊快捷鍵 icon 或按 `?`
    navbar-->>使用者: 顯示目前頁面可用快捷鍵總覽 modal

    使用者->>navbar: 點擊外觀 icon
    navbar-->>頁面: 在 light / dark resolved theme 間切換並持久化
```

| 步驟 | 角色 | 動作 | 系統回應 |
|------|------|------|---------|
| 1 | 使用者 | 進入任一登入後頁面 | 載入共用 Sidebar Navbar |
| 2 | 系統 | 判斷目前頁與角色 | 套用 L0 可見項目、active 與 `aria-current="page"` |
| 3 | 使用者 | 點擊 L0 導覽項 | 符合權限則導頁；不符則導回 Landing 並顯示提示 |
| 4 | 使用者 | 點擊語言切換 | Sidebar 與右側目前模組頁文案、可存取屬性同步更新 |
| 5 | 使用者 | 點擊登出 | 導向 `../account/login.html`（原型導頁） |
| 6 | 使用者 | 點擊外觀切換（Appearance） | Sidebar 單鍵在 `light` / `dark` resolved theme 間切換，更新 `html[data-theme]`，持久化至 `APPEARANCE_STORAGE_KEY` |
| 7 | 使用者 | 在 Desktop 點擊快捷鍵 icon 或按 `?` | 開啟目前頁面可用快捷鍵總覽；不包含 task-specific 作答快捷鍵 |

---

## 使用者情境與測試 *(必填)*

### 使用者故事 1 — L0 導覽需對齊 IA 模組（優先級：P1）

登入後使用者在任一模組頁面皆看到同一份 IA 定義的 L0 導覽骨架與順序。

**此優先級原因**：L0 導覽是跨模組一致性的核心，若不一致會造成導覽斷裂。

**獨立測試方式**：在 dashboard / task / annotation / dataset / admin / profile 頁比對 L0 項目、順序、命名。

**驗收情境**：

1. **Given** 進入 `/dashboard`，**When** 檢查 L0，**Then** 顯示 `儀表板、任務管理、標記作業、資料集分析、個人設定`。
2. **Given** 使用者 `system_role = super_admin`，**When** 檢查 L0，**Then** 額外顯示 `系統管理`。
3. **Given** 使用者 `system_role = user`，**When** 檢查 L0，**Then** 不顯示 `系統管理`。

**L0 群組與目標頁（IA Contract）**：

- Core：`儀表板` → `dashboard`
- Work：`任務管理` → `task-list`
- Work：`標記作業` → `annotation-list`
- Work：`資料集分析` → `dataset-analysis-list`（產品路由 `/dataset-analysis`；prototype 檔案 `dataset-analysis-list.html`）
- Admin：`系統管理` → `user-management`（僅 `super_admin` 可見；Desktop 未收合狀態下另提供次選單直達 `role-settings`，見使用者故事 8／FR-019 群，issue #725；次選單子項不計入本節之 L0 清單與計數）
- Account：`個人設定` → `profile`

**角色可見性與 L0 項目數（Desktop / Mobile 一致）**：

| 系統角色 | 可見 L0 項目 | 可見數量 |
|----------|--------------|----------|
| `user` | `儀表板 / 任務管理 / 標記作業 / 資料集分析 / 個人設定` | 5 |
| `super_admin` | `儀表板 / 任務管理 / 標記作業 / 資料集分析 / 系統管理 / 個人設定` | 6 |

> 備註：任務角色（`project_leader / reviewer / annotator`）只影響 `標記作業`、`資料集分析` 的進入 gating，不影響 L0 項目數；是否可見由系統角色決定。

---

### 使用者故事 2 — Active 與模組內頁映射正確（優先級：P1）

使用者在模組 Landing 與次層頁切換時，active 項必須維持 IA 定義的 L0 映射。

**此優先級原因**：錯誤 active 會直接造成定位錯誤與模組歸屬混淆。

**獨立測試方式**：在 L1/L2 各頁驗證 active 狀態與 `aria-current`。

**驗收情境**：

1. **Given** 位於 `task-new` 或 `task-detail`，**When** 檢查 L0，**Then** `任務管理` 為 active。
2. **Given** 位於 `dataset-analysis-list` 或 `dataset-analysis-detail`，**When** 檢查 L0，**Then** `資料集分析` 為 active。
3. **Given** 位於 `role-settings`，**When** 檢查 L0，**Then** `系統管理` 為 active。

**L0 Active 映射規則**：

- `dashboard` → 儀表板
- `task-list` / `task-new` / `task-detail` → 任務管理
- `annotation-list` / `annotation-workspace` → 標記作業
- `dataset-analysis-list` / `dataset-analysis-detail` → 資料集分析
- `user-management` / `role-settings` → 系統管理
- `profile` → 個人設定

---

### 使用者故事 3 — 權限與任務上下文 gating 一致（優先級：P1）

使用者點擊具任務上下文需求的 L0 項目時，系統需一致處理授權與導回。

**此優先級原因**：權限導覽行為不一致將造成流程斷點與誤解。

**獨立測試方式**：使用不同 task role 及缺少 `task_id` 情境驗證導覽結果。

**驗收情境**：

1. **Given** 使用者無目前任務 `annotator/reviewer` 資格，**When** 點擊 `標記作業`，**Then** 導回 `dashboard` 並顯示提示。
2. **Given** 使用者無目前任務 `project_leader/reviewer` 資格，**When** 點擊 `資料集分析`，**Then** 導回 `task-list` 並顯示提示。
3. **Given** 進入 `task-detail` 但無任務成員資格，**When** 頁面初始化，**Then** 導回 `task-list`。

**gating 規則**：

- `系統管理`：僅 `super_admin` 可見（不渲染給 `user`）。
- `標記作業`：需當前任務 `annotator` 或 `reviewer`。
- `標記作業` 導頁時，若 `ACTIVE_TASK_TYPE_STORAGE_KEY` 有值，需附帶 `task_type` query 參數。
- `資料集分析`：需當前任務 `project_leader` 或 `reviewer`。
- 任務上下文頁缺 `task_id / membership`：`標記作業` 導回 `/dashboard`，`資料集分析` 導回 `/task-list`，並顯示提示。

---

### 使用者故事 4 — Desktop / Mobile 導覽可用性（優先級：P2）

在不同 viewport，使用者可保持同樣導覽能力與可存取語意。

**此優先級原因**：Sidebar 為全站主導覽，RWD 破版會直接影響任務操作效率。

**獨立測試方式**：在 `RWD_VIEWPORTS` 驗證版型、可點擊範圍與內容避讓。

**驗收情境**：

1. **Given** viewport `> MOBILE_BP`，**When** 載入頁面，**Then** 顯示左側固定 Sidebar（含品牌、L0、底部 utility actions、user chip）。
2. **Given** viewport `<= MOBILE_BP`，**When** 載入頁面，**Then** 顯示上方品牌列（含語言、外觀與登出控制，不顯示使用者姓名與快捷鍵入口）+ 下方主導覽。
3. **Given** 行動版，**When** 操作 L0 導覽，**Then** 主要內容不被遮擋且導覽可點擊。

### 使用者故事 5 — Desktop Sidebar Mini / Icon-only 可收合（優先級：P2）

Desktop 使用者可將左側 Sidebar 收合為 icon-only，以增加主內容寬度，且不影響導覽可用性。

**此優先級原因**：共享殼頁在資料密集頁（task-detail / annotation-workspace）需要更高可視區；收合行為須一致以避免跨頁心智切換。

**獨立測試方式**：在 `RWD_VIEWPORTS` 驗證桌機收合展開、空白區觸發、互動區排除、跨頁與重整狀態保持。

**驗收情境**：

1. **Given** viewport `> MOBILE_BP`，**When** 點擊 sidebar 非互動空白區，**Then** Sidebar 在 `SIDEBAR_WIDTH` 與 `SIDEBAR_COLLAPSED_WIDTH` 間切換。
2. **Given** viewport `> MOBILE_BP`，**When** 點擊 nav link / 語言切換 / 登出，**Then** 只執行原功能，不觸發 Sidebar 收合。
3. **Given** 先前已收合 Sidebar，**When** 重新整理或切換至其他 `SUPPORTED_PAGES`，**Then** 依 `SIDEBAR_COLLAPSED_STORAGE_KEY` 還原收合狀態。
4. **Given** viewport `<= MOBILE_BP`，**When** 點擊導覽區域，**Then** 不啟用 mini 收合，維持既有 mobile top+bottom nav 行為。

---

### 使用者故事 6 — Sidebar Utility 外觀模式切換（優先級：P2）

登入後使用者可透過 Sidebar 底部 utility icon 或 mobile top bar icon，在淺色（light）與深色（dark）resolved theme 間快速切換，切換後立即生效且跨頁保持一致。完整外觀偏好（包含 `system`）仍可在個人設定中呈現；Sidebar 僅提供單鍵快速切換。

**此優先級原因**：外觀偏好為全站橫切功能，Sidebar 是常駐快速操作入口；若切頁後狀態遺失或 FOUC 閃白，會明顯影響使用體驗。

**獨立測試方式**：透過 Sidebar utility icon 切換 light/dark，確認 `html[data-theme]` 即時更新；導向其他 `SUPPORTED_PAGES` 後重整，確認狀態從 `APPEARANCE_STORAGE_KEY` 恢復且無 FOUC。

**驗收情境**：

1. **Given** 使用者在任一登入後頁面且目前為 `light`，**When** 點擊 Sidebar Appearance icon（月亮），**Then** `html[data-theme="dark"]` 即時套用，全頁 CSS token 切換為深色，icon 改顯示太陽。
2. **Given** 使用者目前為 `dark`，**When** 點擊 Sidebar Appearance icon（太陽），**Then** `html[data-theme="light"]` 即時套用，icon 改顯示月亮。
3. **Given** 使用者選擇 `system`，**When** 任何 OS 設定，**Then** 頁面固定套用 `data-theme="light"`（`system` = app 預設 = light，不跟隨 OS）。
4. **Given** 重新整理或重開分頁，**When** 頁面載入，**Then** 從 `APPEARANCE_STORAGE_KEY` 恢復最後一次的 mode，且在首次繪製前完成 `data-theme` 設定。
5. **Given** `APPEARANCE_STORAGE_KEY` 不存在或值無效，**When** 頁面載入，**Then** 預設以 `system` mode 處理。
6. **Given** 使用者切換 zh/en，**When** 檢查 Appearance icon，**Then** `aria-label` / `title` 同步顯示「切換為深色/淺色模式」或 `Switch to dark/light mode`。

**Appearance 控制項行為規則**：

- 持久化 mode 仍允許三種值：`light`（固定淺色）、`dark`（固定深色）、`system`（app 預設淺色）。
- Sidebar utility Appearance 控制項為單一 icon button：目前 `light` 時顯示月亮（下一步切至 `dark`）；目前 `dark` 時顯示太陽（下一步切至 `light`）。不得同時顯示多個外觀 icon。
- 切換後立即更新 `html[data-theme]`（`light` 或 `dark`），不需重新整理。
- 狀態持久化至 `APPEARANCE_STORAGE_KEY`（`localStorage`）。
- 頁面 `<head>` 必須在 CSS 載入前執行同步 JS 讀取 `APPEARANCE_STORAGE_KEY` 並設定 `data-theme`，防止 FOUC（實作於 `design/prototype/assets/theme-fouc.js`）。
- `system` 模式解析為 `light`；Sidebar utility 第一次點擊時應切換並持久化為 `dark`。

---

### 使用者故事 7 — 快捷鍵總覽入口（優先級：P2）

登入後 Desktop 使用者可從 Sidebar utility icon 或 `?` 開啟快捷鍵總覽，查看目前頁面可用的跨任務共用快捷鍵；Mobile 不提供快捷鍵總覽入口，也不支援以 `?` 開啟。

**此優先級原因**：快捷鍵是輔助操作，不應成為主導覽項，但使用者在標記/審核作業中需能快速查詢。

**獨立測試方式**：在 desktop 開啟快捷鍵 modal，切換 zh/en，確認入口、modal 標題、section 與 keycap 顯示皆正確；在 mobile 驗證 keyboard 入口不存在且 `?` 不觸發 modal。

**驗收情境**：

1. **Given** viewport `> MOBILE_BP`，**When** 使用者查看 Sidebar 底部 utility row，**Then** 顯示 icon-only keyboard button，不顯示「快捷鍵」文字。
2. **Given** viewport `<= MOBILE_BP`，**When** 載入頁面，**Then** mobile top bar 不顯示 keyboard icon 入口，且按 `?` 不開啟快捷鍵總覽。
3. **Given** viewport `> MOBILE_BP`，**When** 使用者點擊 keyboard icon 或按 `?`，**Then** 開啟 modal 並顯示目前頁面可用快捷鍵總覽。
4. **Given** 快捷鍵含多個按鍵，**When** 顯示於 modal，**Then** 每個按鍵必須以獨立 keycap 呈現，不得以 `Ctrl / Cmd + S` 這類連續文字呈現。
5. **Given** 使用者切換 zh/en，**When** 檢查快捷鍵入口與 modal，**Then** `aria-label`、標題、說明與 section 文案同步切換。
6. **Given** 快捷鍵總覽列出多個方向或決策動作，**When** 使用者檢視清單，**Then** 每個 action 必須獨立成列；例如 `上一筆` 與 `下一筆` 不得合併成 `上一筆 / 下一筆`，`通過目前結果` 與 `退回目前結果（回退標記員狀態僅限正式標記）` 也不得合併。

**快捷鍵總覽行為規則**：

- `shortcut_help` 不屬於 L0 主導覽，不新增 sidebar nav item。
- Desktop 入口位於 Sidebar 底部 utility row；Mobile 不提供入口，且 `?` 不觸發快捷鍵總覽。
- Modal 只顯示跨任務共用快捷鍵；不得納入 task-specific 作答快捷鍵（例如 label `1-9`、NER entity type、relation type、VA scoring）。
- Keycap 使用獨立元素呈現，例如 `CTRL`、`CMD`、`S` 三個 keycap，而不是單一文字字串。
- 一個 shortcut action 必須對應一列；不得將兩個 action 合併為同一列，即使它們使用相近的 modifier key。
- `Esc` 可關閉快捷鍵 modal；點擊 backdrop 可關閉 modal。

---

### 使用者故事 8 — 系統管理次選單快速直達（優先級：P2，issue #725）

`super_admin` 可在 Desktop 未收合 Sidebar 時展開「系統管理」次選單，一次點擊直達 `role-settings`，不需先落地 `user-management`。

**此優先級原因**：導覽路徑效率提升，非新功能可見性變更；`系統管理` 本身的存在與可見性規則（使用者故事 1）優先級較高。

**獨立測試方式**：以 `super_admin` 於 Desktop 未收合 Sidebar 點擊「系統管理」，驗證出現次選單並可直達兩個子頁；並於 Mobile／Desktop 收合狀態驗證維持既有單一連結行為。

**驗收情境**：

1. **Given** `system_role = super_admin`，viewport `1440x900`（`> MOBILE_BP`）且 Sidebar 未收合，位於任一 `SUPPORTED_PAGES`，**When** 點擊 L0「系統管理」，**Then** 觸發項 `aria-expanded` 由 `false` 變為 `true`，顯示次選單，內容包含「使用者管理」與「角色設定」兩個子項連結，且 `.navbar-center .nav-link` 命中數維持 `6`；點擊「角色設定」子項後直接導向 `role-settings.html`，不經過 `user-management.html`。
2. **Given** 次選單已開啟，**When** 點擊次選單以外的頁面區域，或按 `Esc`，**Then** 次選單關閉，觸發項 `aria-expanded` 回到 `false`。
3. **Given** `super_admin` 位於 `role-settings.html`，**When** 展開「系統管理」次選單，**Then** 「角色設定」子項帶 `aria-current="page"` 且「使用者管理」子項不帶；L0「系統管理」觸發項仍依既有 FR-006／FR-007 顯示 active 樣式與 `aria-current="page"`；改為位於 `user-management.html` 時則反之。
4. **Given** viewport `<= MOBILE_BP`，或 Desktop Sidebar 已收合為 `SIDEBAR_COLLAPSED_WIDTH`，**When** 點擊「系統管理」，**Then** 直接導向 `user-management.html`，不開啟次選單，與本次變更前行為一致。
5. **Given** `super_admin` 位於 `user-management.html`，**When** 不透過側欄次選單、直接點擊頁內既有 admin-tabs 的「角色設定」，**Then** 導向 `role-settings.html`，既有 tabs 導頁契約（spec 006 FR-010、spec 007 FR-006）不變。

**次選單行為規則**：

- 次選單子項不計入既有 FR-002／FR-003A 之 L0 導覽項清單與計數，`.navbar-center .nav-link` 選擇器命中數維持 `user`=5／`super_admin`=6 不變。
- 觸發方式為點擊「系統管理」；再次點擊觸發項、點擊選單外任一處，或按 `Esc`，皆會關閉次選單。
- 觸發項帶 `aria-haspopup="true"` 與正確同步的 `aria-expanded` 狀態；次選單容器使用 `role="menu"`，子項使用 `role="menuitem"`。
- 次選單子項依目前頁面（`user-management` 或 `role-settings`）標示恰一個「目前項」（`aria-current="page"` 與對應樣式）；此標示與既有 L0「系統管理」active 狀態（FR-006）為互補關係，不互斥、不重複渲染兩種語意。
- Mobile（`<= MOBILE_BP`）或 Desktop Sidebar 收合（`SIDEBAR_COLLAPSED_WIDTH`）狀態下，「系統管理」維持既有行為——點擊直接導向 `user-management`，不開啟次選單。
- 本次新增為 `user-management.html` 既有 admin-tabs（使用者管理／角色設定，spec 006 FR-010、spec 007 FR-006）導覽之外的**額外**直達入口，不移除或改變 admin-tabs 既有行為與導頁契約。

---

### 使用者故事 9 — L0「標記作業」與使用者角色標示依任務角色一致呈現（優先級：P2，issue #944）

側欄 L0「標記作業」項目與使用者晶片角色標示，在 reviewer 任務角色下必須讀作「審核作業」／「審核員」，與同頁入口麵包屑（annotation-015 FR-080）一致；annotator／project_leader 任務角色維持既有預設「標記作業」／「一般使用者」。此解析必須由 Shared Sidebar 元件本身完成，消費頁面不得於掛載後另行以 DOM 操作覆寫。

**此優先級原因**：文案一致性缺陷，非導覽骨架或可見性變更；issue #309（角色標示）與 issue #931（L0 項目字面）先前皆由 `annotation-workspace` 消費端各自補丁修正，未收斂至來源，本故事收斂為單一權責。

**獨立測試方式**：以 `role=reviewer`／`role=annotator` 兩種任務角色進入 `annotation-workspace`，比對 `#navAnnotation`、`[data-testid="role-indicator"]` 與入口麵包屑第一層文字；並直接呼叫 Shared Sidebar 的掛載函式（不經任何消費頁面 JS）驗證解析結果同樣正確，確認來源在元件本身。

**驗收情境**：

1. **Given** 任務角色為 `reviewer`，**When** 進入 `annotation-workspace` 並完成側欄掛載，**Then** `#navAnnotation` 文字為「審核作業」，且與同頁入口麵包屑第一層連結文字一致；`[data-testid="role-indicator"]` 文字為「審核員」。
2. **Given** 任務角色為 `annotator` 或 `project_leader`，**When** 進入 `annotation-workspace` 並完成側欄掛載，**Then** `#navAnnotation` 文字維持既有預設「標記作業」；`role-indicator` 於 `annotator` 維持「一般使用者」（`project_leader` 之 `role-indicator` 由頁面既有 `opts.roleIndicator` 顯式覆寫機制決定，不受本故事影響）。
3. **Given** 消費頁面完全不執行任何掛載後 DOM 覆寫邏輯，**When** 直接以 `taskRole: 'reviewer'` 呼叫 Shared Sidebar 掛載函式，**Then** 上述兩項文字仍正確解析為「審核作業」／「審核員」——證明解析邏輯位於元件內部，而非消費端事後補寫。

**任務角色解析規則**：

- 值域對齊既有「任務角色」定義（`project_leader / reviewer / annotator`，見「角色可見性與 L0 項目數」備註）。
- 使用者晶片角色標示既有之顯式覆寫入口（頁面傳入固定字串，如系統管理頁「系統管理員」）優先序不變，僅在未顯式覆寫時套用本故事之任務角色解析預設值。
- 本故事不改變 annotation-015 FR-080 入口麵包屑既有邏輯與文字，僅使側欄與其保持一致。

---

### 邊界情況

- zh/en 長度差異不得造成 L0 文字截斷到不可辨識。
- 行動版底部導覽不得遮擋頁面主要 CTA。
- i18n key 缺漏時需 fallback 文案，不得中斷導覽互動。
- 行動版 top brand bar 不得呈現使用者姓名；最下方 icon-only sidebar footer 必須優先呈現登出按鈕，不得以使用者姓名或頭像取代登出控制。
- 各模組頁若有頁內或全域 anchor 樣式，仍不得讓 Shared Sidebar 的品牌連結或 L0 導覽連結出現文字底線。
- `APPEARANCE_STORAGE_KEY` 值無效（非 `light`/`dark`/`system`）時，fallback 為 `system`，不拋出例外。
- `prefers-color-scheme` 不支援的舊瀏覽器，`system` mode 應 fallback 為 `light`。
- Sidebar utility actions 為 icon-only 時，必須保留 `aria-label` 與 `title`，且 zh/en 切換後同步更新。
- Desktop 快捷鍵 modal 在較窄 viewport 不得讓 keycap 擠壓或覆蓋 action 名稱。

---

### 使用者故事 10 — 工作頁籤殼層整合（優先級：P2，issue #1075）

共用 Sidebar 殼層現在也掛載工作頁籤列；完整行為定義見 `specs/shared/019-workspace-tabs/spec.md`（本規格不重複其 FR），僅收斂兩項因性質屬於共用殼層本身而由本規格承接之條文：關閉作用中頁籤後的焦點移動規則（FR-022）、快捷鍵總覽新增之頁籤 section（FR-016H）。

**此優先級原因**：頁籤列主體行為已由 `specs/shared/019-workspace-tabs/spec.md` 的 9 個使用者故事定義並於原型實作完成；本故事僅收斂歸屬邊界與兩項殼層自身條文，不含獨立新功能。

**獨立測試方式**：參照 `specs/shared/019-workspace-tabs/spec.md` 之頁籤列整體測試；本規格自身僅需驗證關閉作用中頁籤之焦點移動結果與快捷鍵總覽新增 section 之顯示內容。

**驗收情境**：

1. **Given** 已開啟 3 個以上頁籤，目前作用中頁籤非最右側，**When** 使用者關閉該作用中頁籤，**Then** 焦點必須移至原本緊鄰其右側的頁籤。
2. **Given** 已開啟 2 個以上頁籤，目前作用中頁籤為最右側，**When** 使用者關閉該作用中頁籤，**Then** 焦點必須移至原本緊鄰其左側的頁籤。
3. **Given** viewport `> MOBILE_BP`，使用者開啟快捷鍵總覽，**When** 檢視 modal 內容，**Then** 必須存在一個「頁籤」section，內含恰兩列：「切換至對應位置頁籤」與「關閉作用中頁籤」，各自獨立呈現、各按鍵以獨立 keycap 呈現。
4. **Given** 快捷鍵總覽之「頁籤」section 已顯示，**When** 使用者切換 zh/en，**Then** 該 section 標題與兩列動作文字必須同步切換，與既有「全域」「標記作業」「審核」三個 section 之既有語言切換行為一致。

---

## 需求規格 *(必填)*

### 功能需求

- **FR-001**：登入後頁面必須使用同一份 Sidebar Navbar contract；`userIds` 中的 `userAvatar`（見「關鍵實體」`SharedNavbarContract`）必須顯示與同列 `userName` 一致、由目前使用者姓名推導出的縮寫，在所有 `SUPPORTED_PAGES` 皆同（issue #932 澄清：不得停留在未依頁面覆寫的預設佔位文字）。
- **FR-002**：L0 導覽項與順序必須符合 IA：`儀表板 / 任務管理 / 標記作業 / 資料集分析 / 系統管理(條件顯示) / 個人設定`。
- **FR-003**：`系統管理` 僅 `super_admin` 可見，不得渲染給 `user`。
- **FR-003A**：`user` 的 L0 可見項目數必須為 `5`；`super_admin` 的 L0 可見項目數必須為 `6`（多出 `系統管理`）。
- **FR-004**：`task-new`、`task-detail` 必須映射為 `任務管理` active。
- **FR-005**：`dataset-analysis-list` 與 `dataset-analysis-detail` 必須映射為 `資料集分析` active。
- **FR-006**：`role-settings` 必須映射為 `系統管理` active。
- **FR-007**：每頁僅允許一個 L0 active 項，且必須同時包含 active 樣式與 `aria-current="page"`。
- **FR-008**：`標記作業`、`資料集分析` 必須驗證任務角色與任務上下文；不符時 `標記作業` 導回 `/dashboard`，`資料集分析` 導回 `/task-list`，並顯示提示。
- **FR-008A**：點擊 `標記作業` 時，若存在 `ACTIVE_TASK_TYPE_STORAGE_KEY`，導頁 URL 必須附帶 `task_type` query（避免覆蓋既有 query 參數）。
- **FR-009**：Navbar 必須支援 zh/en 切換，切換後同步更新文案、`aria-label`、`title`。
- **FR-009A**：使用者點擊語言切換後，右側內容區不論目前顯示 `dashboard / task-management / annotation / dataset / admin / account` 任一模組頁，皆必須同步切換為相同語系，不可僅更新 Sidebar。
- **FR-009B**：語言狀態必須跨頁持久化；導向任一 `SUPPORTED_PAGES` 後需維持同語系（建議實作：`localStorage`，key：`labelsuite.lang`）。
- **FR-010**：Navbar 必須提供桌面與行動版登出控制項。
- **FR-010A**：Mobile / icon-only sidebar footer 必須顯示登出按鈕；使用者姓名不得佔用該位置。
- **FR-011**：`> MOBILE_BP` 使用左側固定 Sidebar；`<= MOBILE_BP` 使用上方品牌列 + 下方主導覽。
- **FR-011A**：Mobile top brand bar 的右側工具列（語言、外觀、通知、登出）在 `dashboard / task-management / annotation / dataset / admin / account` 模組必須共用一致尺寸、間距、圓角與不可壓縮行為；品牌區需以 `flex: 1` 讓位，避免 icon button 被擠壓。
- **FR-012**：在 `RWD_VIEWPORTS` 下不得出現重疊、不可點擊、內容被導覽遮擋。
- **FR-013**：Shared Sidebar 樣式必須集中於 `design/prototype/pages/shared/sidebar.css`，使用共用 Sidebar 的頁面不得再頁內重複定義同一套 sidebar 規則。
- **FR-013A**：Shared Sidebar 範圍內的品牌連結與 L0 模組導覽連結在 default / hover / focus / active 狀態皆不得顯示文字底線；此規則不得影響頁面主要內容區的一般文字連結。
- **FR-014**：Desktop（`> MOBILE_BP`）必須支援 `Mini / Icon-only` 收合 Sidebar，收合寬度為 `SIDEBAR_COLLAPSED_WIDTH`。
- **FR-014A**：Desktop 收合觸發必須為 sidebar 非互動空白區；互動元素（`a`、`button`、`input/select/textarea`、含語意按鈕角色元素）不得觸發收合。
- **FR-014B**：Sidebar 收合狀態必須持久化於 `SIDEBAR_COLLAPSED_STORAGE_KEY`，並在 `SUPPORTED_PAGES` 間保持一致。
- **FR-014C**：Mobile（`<= MOBILE_BP`）不得啟用 mini/icon-only 收合互動，避免與 bottom nav 操作衝突。
- **FR-014D**：Desktop 收合狀態（`SIDEBAR_COLLAPSED_WIDTH`）下，`shortcut_help` 入口（`shortcutHelpBtn`）必須隱藏；`appearance_toggle`（`sidebarThemeToggleBtn`）與 `notification_bell`（`notificationBellBtn`）維持可見。
- **FR-015**：Sidebar 必須提供 icon-only Appearance 快速切換控制項，在 `light` / `dark` resolved theme 間切換。
- **FR-015A**：`light` → `html[data-theme="light"]`；`dark` → `html[data-theme="dark"]`；`system` → 固定解析為 `html[data-theme="light"]`（app 預設；不跟隨 OS `prefers-color-scheme`）。
- **FR-015B**：Appearance 選擇後必須立即套用，並持久化至 `APPEARANCE_STORAGE_KEY`，在所有 `SUPPORTED_PAGES` 間保持一致。
- **FR-015C**：每個 `SUPPORTED_PAGES` 的 `<head>` 必須在樣式表載入前執行同步 JS（`theme-fouc.js`），讀取 `APPEARANCE_STORAGE_KEY` 並設定 `html[data-theme]`，防止 FOUC。
- **FR-015D**：`APPEARANCE_STORAGE_KEY` 不存在或值無效時，預設 mode 為 `system`。
- **FR-015E**：Appearance icon 必須一次只顯示一個狀態提示 icon：`light` 顯示月亮（可切 dark）、`dark` 顯示太陽（可切 light）。
- **FR-015F**：Appearance icon 的 `aria-label` / `title` 必須支援 zh/en，並依下一步動作顯示「切換為深色/淺色模式」。
- **FR-016**：Sidebar 必須在 Desktop 提供 icon-only 快捷鍵總覽入口，位於 Sidebar 底部 utility row；Mobile 不得顯示快捷鍵總覽入口。
- **FR-016A**：Desktop 快捷鍵入口必須可由 `?` 開啟，並可由 `Esc` 或 backdrop 關閉；Mobile 按 `?` 不得開啟快捷鍵總覽。
- **FR-016B**：Desktop 快捷鍵總覽 modal 必須支援 zh/en，並同步更新 `aria-label`、標題、說明與 section 文案。
- **FR-016C**：Desktop 快捷鍵總覽 modal 中的快捷鍵按鍵必須以獨立 keycap 元素呈現，不得以合併字串呈現。
- **FR-016D**：快捷鍵總覽第一版僅顯示跨任務共用快捷鍵，不得納入 task-specific 作答快捷鍵。
- **FR-016E**：快捷鍵總覽中每個 action 必須獨立成列，不得將相反或相關 action 合併顯示（例如不得以 `上一筆 / 下一筆`、`通過 / 退回目前結果` 作為單一列）。
- **FR-016G**（v1.4.0 新增）：`審核` section 僅列出 `A`（`通過目前結果`）與 `R`（`退回目前結果（回退標記員狀態僅限正式標記）`，v1.4.1 起標籤註記退回僅限 official_run、v1.4.3 起精確化為「僅回退標記員狀態」以避免誤讀為整個退回動作僅限 official_run，見 annotation-015 AC-3.15／AC-6.4／AC-3.33）兩列；批次快捷鍵 `Shift+A`（全部通過）與 `Shift+R`（全部退回）**不得**出現於總覽——annotation-015 v4.0.0 起審核單位為「樣本 × 標記員」，一次審核只涉及一位標記員，批次操作已無可批次的對象（其行為定義見 annotation-015 FR-054）。總覽只承諾實際存在的快捷鍵。
- **FR-016F**：Desktop 快捷鍵總覽 modal 採緊湊視覺密度：section 標題以小寫全大寫（uppercase、muted 色）呈現；每列 action 間距僅以 padding 分隔，列與列之間不加分隔線；按鍵標籤為緊湊尺寸（≤28px 高），複合按鍵間距 ≤6px。
- **FR-016H**（issue #1075 G3 新增）：Desktop 快捷鍵總覽 modal 必須新增一個獨立的「頁籤」section，列出 `Alt+1…8`（切換至對應位置頁籤）與 `Alt+W`（關閉作用中頁籤）兩列，各自獨立成列（依既有 FR-016E）、各按鍵以獨立 keycap 呈現（依既有 FR-016C）、採既有緊湊視覺密度（依既有 FR-016F）。此二快捷鍵之實際觸發行為、按鍵位置判斷方式（`event.code`），以及焦點位於可輸入元素時之抑制規則，由 `specs/shared/019-workspace-tabs/spec.md` FR-013、AC-5.1 至 AC-5.4 定義；本條僅規範快捷鍵總覽之顯示內容與格式，不重複定義其觸發行為。
- **FR-017**：登入後模組頁若包含最上層 `h1` 頁首標題與副標題，該 heading block 必須對齊 Dashboard baseline：`1440px` desktop viewport 下與 Dashboard 相同的左上位置、`28px` serif title、`14px / 1.8` subtitle、title/subtitle 間距 `4px`、heading block 下方留白 `24px`。
- **FR-018**：Sidebar 必須提供通知鈴鐺（`notification_bell`）入口；Desktop 位於 Sidebar 底部 utility row（`notificationBellBtn`），Mobile 位於 top brand bar（`mobileNotificationBellBtn`）。
- **FR-018A**：未讀通知數必須以紅色 badge 顯示於鈴鐺右上角；未讀數為 0 時不顯示 badge；超過 9 顯示 `NOTIFICATION_BADGE_MAX_DISPLAY`。
- **FR-018B**：Desktop `notificationBellBtn` 與 Mobile `mobileNotificationBellBtn` 的 badge 顯示與 `aria-expanded` 狀態必須同步。
- **FR-018C**：點擊鈴鐺開啟通知 dropdown（含通知列表與「全部標為已讀」操作）；再次點擊或點擊空白處關閉。
- **FR-018C1**：通知 dropdown 內容必須完整支援語系切換；標題、操作文案、通知事件句型、任務名稱、行為者顯示名稱與相對時間皆需依目前語系呈現，不得中英混用。
- **FR-018D**：通知 dropdown 定位規則：Desktop 展開時 `left: SIDEBAR_WIDTH`；Desktop 收合時 `left: SIDEBAR_COLLAPSED_WIDTH`；Mobile 時 `top: MOBILE_TOP_HEIGHT`，靠右對齊。
- **FR-018E**：通知 dropdown 不提供跳轉「通知設定」連結；通知偏好設定位於 `/profile` 通知設定區塊（見 spec 005 FR-013B）。
- **FR-018F**：通知資料來源由目前頁面或 prototype mock 提供；本規格僅定義 Shared Navbar 前端展示契約，不新增通知 API、後端事件模型或跨模組資料擁有權。
- **FR-019**（issue #725 新增）：Desktop（`> MOBILE_BP`）且 Sidebar 未收合時，L0「系統管理」項目必須提供可展開次選單，內容恰為「使用者管理」（→ `user-management`）與「角色設定」（→ `role-settings`）兩個子項連結；次選單子項不計入 FR-002／FR-003A 之 L0 導覽項清單與計數。
- **FR-019A**：次選單觸發方式為點擊「系統管理」；再次點擊觸發項、點擊選單外任一處，或按 `Esc`，必須關閉次選單。
- **FR-019B**：次選單觸發項必須帶 `aria-haspopup="true"` 與正確同步的 `aria-expanded` 狀態；次選單容器必須使用 `role="menu"`，子項必須使用 `role="menuitem"`。
- **FR-019C**：次選單子項必須依目前頁面（`user-management` 或 `role-settings`）標示恰一個「目前項」（`aria-current="page"` 與對應樣式）；此標示與既有 L0「系統管理」active 狀態（FR-006）為互補關係，不互斥、不重複渲染兩種語意。
- **FR-019D**：Mobile（`<= MOBILE_BP`）或 Desktop Sidebar 收合（`SIDEBAR_COLLAPSED_WIDTH`）狀態下，「系統管理」必須維持既有行為——點擊直接導向 `user-management`，不開啟次選單，與本次變更前互動路徑完全一致。
- **FR-019E**：本次新增為 `user-management.html` 既有 admin-tabs（使用者管理／角色設定，spec 006 FR-010、spec 007 FR-006）導覽之外的額外直達入口；不得移除或改變 admin-tabs 既有行為與導頁契約。
- **FR-020**（issue #944 新增，issue #1018 修訂）：Shared Sidebar 之 `navItems`（`design/prototype/pages/shared/sidebar.js`）的 `annotation` 項目（DOM id `navAnnotation`），其顯示文字必須依呼叫端傳入的任務角色（`opts.taskRole`，值域對齊既有「任務角色」定義：`project_leader / reviewer / annotator`）於掛載當下解析：`reviewer` 顯示「審核作業」（en: `Review`），與 annotation-015 FR-080 入口麵包屑第一層之 `crumbWorkAreaReviewer` 文字一致；`project_leader` 顯示「例外處置」（en: `Exception Disposition`），與同一畫面入口麵包屑第一層之 `crumbWorkAreaProjectLeader` 文字一致（issue #994／PR #1017）；`annotator` 或未提供時維持既有預設「標記作業」，與 annotation-015 FR-080 之 `crumbWorkAreaAnnotator` 文字一致。此解析必須於 Shared Sidebar 元件內部完成，消費頁面不得於掛載完成後另行以 DOM 操作覆寫該節點之顯示文字。本條不改變 FR-002／FR-008／FR-008A 既有之 L0 項目清單、順序、導頁與 `task_type` query 契約。
- **FR-020A**（issue #944 新增）：Shared Sidebar 使用者晶片之角色標示（DOM id `roleIndicator`），於呼叫端未透過既有顯式覆寫入口傳入固定字串時（例如系統管理頁固定顯示「系統管理員」等既有頁面專屬用途，不受本條影響），其預設顯示文字必須依 FR-020 之任務角色定義解析：`reviewer` → 「審核員」（en: `Reviewer`）；`project_leader` → 「專案負責人」（en: `Project leader`）；`annotator` 或未提供時維持既有預設「一般使用者」。此解析必須於元件內部完成，消費頁面不得於掛載完成後另行以 DOM 操作覆寫該節點；既有顯式覆寫入口之優先序與行為不變。
- **FR-021**（issue #1041 新增）：Shared Sidebar 之 `navItems`（`design/prototype/pages/shared/sidebar.js`）六個 L0 項目（DOM id `navDashboard`／`navTaskManagement`／`navAnnotation`／`navDataset`／`navAdmin`／`navProfile`）之顯示文字，必須於元件內部依語言（`readStoredLang()`／`applyGlobalLanguage()` 傳入之 `lang`）解析對應之雙語字面值：`navDashboard` → 「儀表板」/`Dashboard`；`navTaskManagement` → 「任務管理」/`Task Management`；`navDataset` → 「資料集分析」/`Dataset Analytics`；`navAdmin` → 「系統管理」/`System Administration`；`navProfile` → 「個人設定」/`Profile`。`navAnnotation` 項之既有角色分流（FR-020）三個分支皆須有對應英文字串：`reviewer` → 「審核作業」/`Review`；`project_leader` → 「例外處置」/`Exception Disposition`（皆為既有值，逐字不變）；`annotator` 或未提供 → 維持既有預設「標記作業」，並新增對應英文 `Annotation`。上述解析不只於掛載當下（`mountSidebar()`／`renderSidebar()`）執行一次；每次呼叫 `applyGlobalLanguage(lang, options)` 必須重新解析全部六個節點並更新其顯示文字，語言切換後立即反映新語系，不需重新掛載或重新整理頁面。`navAnnotation` 之角色分流於語言切換時的重新解析，使用最近一次 `mountSidebar()` 呼叫傳入之 `opts.taskRole`（未呼叫過 `mountSidebar()` 傳入 `taskRole` 之頁面，維持既有預設「標記作業」/`Annotation`分支）。此解析必須於 Shared Sidebar 元件內部完成；消費頁面不得於掛載完成後另行以 DOM 操作覆寫本條所列六個節點之顯示文字（重申 FR-020 既有覆寫禁令，明確適用範圍擴及全部六個 L0 標籤，不僅 `navAnnotation`）。本條不改變 FR-002／FR-003A／FR-008／FR-008A／FR-019 群既有之 L0 項目清單、順序、計數、導頁與 `task_type` query 契約，僅新增顯示文字之語言解析規則與重新解析時機。
- **FR-022**（issue #1075 G3 新增）：共用 Sidebar 殼層掛載之工作頁籤列（行為定義見 `specs/shared/019-workspace-tabs/spec.md`），關閉作用中頁籤後，焦點必須依下列規則移動：(1) 若被關閉之作用中頁籤並非最右側頁籤，焦點必須移至其右鄰頁籤；(2) 若被關閉之作用中頁籤為最右側頁籤，焦點必須移至其左鄰頁籤；(3) 若關閉後已無任何頁籤，則無頁籤可移焦，頁籤列呈現空狀態；(4) 此規則僅適用於作用中頁籤之關閉，關閉非作用中頁籤不得觸發任何焦點或導頁變化。此為 `specs/shared/019-workspace-tabs/spec.md` FR-009、AC-1.5 明文委由本規格定義的規則，行為已於原型 `design/prototype/pages/shared/sidebar.js` 之 `closeWorkspaceTab()` 實作完成。

### 使用者流程與導頁

```mermaid
flowchart LR
    dashboard[/dashboard/]
    taskList[/task-list/]
    annotation[/annotation-list/]
    datasetList[/dataset-analysis/]
    adminUsers[/user-management/]
    profile[/profile/]

    dashboard --> taskList
    dashboard --> annotation
    dashboard --> datasetList
    dashboard --> profile
    dashboard --> adminUsers
```

| From | Trigger | To |
|------|---------|-----|
| 任一登入後頁 | 點擊「儀表板」 | `/dashboard` |
| 任一登入後頁 | 點擊「任務管理」 | `/task-list` |
| 任一登入後頁 | 點擊「標記作業」 | `/annotation-list`（prototype: `../annotation/annotation-list.html`；需 task role/context） |
| 任一登入後頁 | 點擊「資料集分析」 | `/dataset-analysis`（prototype: `../dataset/dataset-analysis-list.html`；需 task role/context） |
| 任一登入後頁 | 點擊「系統管理」 | `/user-management`（僅 super_admin） |
| 任一登入後頁 | 點擊「個人設定」 | `/profile` |
| 任一登入後頁（Desktop） | 點擊 keyboard icon / 按 `?` | 開啟快捷鍵總覽 modal |
| 任一登入後頁 | 點擊 Appearance icon | 切換 `html[data-theme]` light/dark，不導頁 |

### 關鍵實體

- `SharedNavbarContract`
  - `sections`: `brand-section`, `navbar-center`, `nav-actions`
  - `interactiveIds`: `langToggle`, `mobileLangToggle`, `shortcutHelpBtn`, `sidebarThemeToggleBtn`, `mobileThemeToggleBtn`, `notificationBellBtn`, `mobileNotificationBellBtn`, `logoutBtn`, `mobileLogoutBtn`
  - `userIds`: `userName`, `roleIndicator`, `userAvatar`
  - `navIds`: `navDashboard`, `navTaskManagement`, `navAnnotation`, `navDataset`, `navAdmin`, `navProfile`
- `LanguageState`
  - `lang`: `zh` / `en`
  - `storage_key`: `labelsuite.lang`
- `ActiveTaskTypeState`
  - `task_type`: 值域需對齊 task registry（如 `single_sentence_classification`、`single_sentence_va_scoring`）
  - `storage_key`: `labelsuite.activeTaskType`
- `SidebarCollapsedState`
  - `collapsed`: `true` / `false`
  - `storage_key`: `labelsuite.sidebarCollapsed`
  - `desktop_only`: 僅在 `> MOBILE_BP` 生效
- `AppearanceState`
  - `mode`: `light` | `dark` | `system`（使用者的選擇，持久化值）
  - `resolved_theme`: `light` | `dark`（實際套用至 `html[data-theme]` 的值；`mode=dark` → `dark`，其餘皆 → `light`）
  - `storage_key`: `label-suite-theme`
  - `sidebar_toggle`: 單鍵 light/dark 快速切換；目前 `light` 顯示 moon icon，下一步為 `dark`；目前 `dark` 顯示 sun icon，下一步為 `light`
- `ShortcutHelpState`
  - `is_open`: `true` / `false`
  - `scope`: `current_page_common_shortcuts`
  - `entry_points`: `shortcutHelpBtn` / `?`（Desktop only）
  - `excluded_shortcuts`: task-specific 作答快捷鍵（label hotkeys、NER/relation/aspect/score hotkeys）
- `NotificationDisplayState`
  - `unread_count`: `0` 或正整數；大於 `9` 時 badge 顯示 `9+`
  - `is_open`: `true` / `false`
  - `source`: `page_or_prototype_mock`
  - `contract_scope`: 前端展示狀態；不包含通知 API 或後端事件模型

---

## Prototype Traceability

| Artifact | Responsibility | Covered FR/SC | Verification | Status |
|----------|----------------|---------------|--------------|--------|
| [design/prototype/pages/shared/sidebar.js](../../../design/prototype/pages/shared/sidebar.js)<br>[design/prototype/pages/shared/sidebar.css](../../../design/prototype/pages/shared/sidebar.css) | Shared sidebar/navbar component: navigation, role-based menu, language toggle, notification dropdown, keyboard shortcuts overview, and RWD only; not exclusive to any single page — reused as-is (`<script src="../shared/sidebar.js">`) by every module's shell page. Consumed by 14 pages across account (5), admin (2), annotation (2), dashboard (1), dataset (2), task-management (3). | All FR/SC in this spec | [design/prototype/tests/shared/](../../../design/prototype/tests/shared/) (`sidebar-*.spec.ts`, `mobile-top-actions.spec.ts`) | Active; shared component |
| [design/prototype/components-showcase.html](../../../design/prototype/components-showcase.html) | Living styleguide reference for shared component visual states; not a functional consumer page. | No additional FR/SC | [design/prototype/tests/shared/](../../../design/prototype/tests/shared/) (`components-showcase*.spec.ts`) | Active; reference only |

---

## 規格相依性

### 上游（本規格依賴）

| 規格編號 | 功能 | 本規格需要的內容 |
|---------|------|----------------|
| IA v7 | Information Architecture | L0/L1/L2 導覽模型、角色可見性、active 映射與 RWD 導覽定義 |
| 012 | Dashboard — 儀表板 | 既有 navbar 版型與 i18n 行為 |
| 005 | Profile Settings — 個人設定 | 既有 user chip 與 active 行為 |

### 下游（依賴本規格）

| 規格編號 | 功能 | 依賴本規格的內容 |
|---------|------|----------------|
| 012 | Dashboard — 儀表板 | 導入 IA 對齊後的 L0 導覽契約 |
| 005 | Profile Settings — 個人設定 | 導入 IA 對齊後的 L0 導覽契約 |
| 010/013/014 | Task Management | L0 `任務管理` + L2 active 映射規則 |
| 015 | Annotation Workspace | L0 `標記作業` + 任務角色 gating |
| 016/017 | Dataset | L0 `資料集分析` + `stats/quality` active 映射 |
| 006/007 | Admin | L0 `系統管理` 可見性與 active 映射 |
| 019 | Workspace Tabs — 系統內建工作頁籤 | 本規格之共用殼層掛載頁籤列掛載點；承接關閉作用中頁籤焦點移動規則（FR-022）與快捷鍵總覽新增項（FR-016H），頁籤列本身完整行為仍由該規格擁有 |

---

## 成功標準 *(必填)*

### 可量測成果

- **SC-001**：所有 `SUPPORTED_PAGES` 的 L0 導覽項與順序符合 IA 定義。
- **SC-002**：L1/L2 頁面的 L0 active 映射正確，且每頁僅一個 `aria-current="page"`。
- **SC-003**：`super_admin` 與 `user` 的 L0 可見性符合矩陣（僅 `super_admin` 可見 `系統管理`）。
- **SC-003A**：L0 可見項目數驗證通過：`user = 5`、`super_admin = 6`（Desktop / Mobile 皆一致）。
- **SC-004**：缺少任務角色或上下文時，`標記作業` 會導回 `/dashboard`，`資料集分析` 會導回 `/task-list`，並顯示提示。
- **SC-004A**：點擊 `標記作業` 且存在 `labelsuite.activeTaskType` 時，導頁 URL 需包含 `task_type=<stored_value>`。
- **SC-005**：`RWD_VIEWPORTS` 下 navbar 無破版、無重疊、無不可點擊控制項。
- **SC-005A**：在 `375px` mobile viewport 下，所有共用 Sidebar 模組頁的 top brand bar 工具列視覺尺寸必須與 Task Management baseline 一致，icon-only 按鈕不得被壓縮。
- **SC-005B**：在 `dashboard / task-management / annotation / dataset / admin / account` 共用 Sidebar 模組頁，`.navbar-brand` 與 `.navbar-center .nav-link` 的 computed `text-decoration-line` 必須為 `none`。
- **SC-006**：在任一 `SUPPORTED_PAGES` 點擊語言切換後，Sidebar 與右側模組內容語系一致，且切頁後保持同一語系狀態。
- **SC-006A**：重新載入任一 `SUPPORTED_PAGES` 後，仍可恢復最後一次語言狀態（`zh` / `en`）。
- **SC-007**：Desktop 可在 `SIDEBAR_WIDTH` / `SIDEBAR_COLLAPSED_WIDTH` 間切換，且收合後保留 icon 導覽可辨識與 active 狀態可見。
- **SC-007A**：點擊 sidebar 非互動空白區會觸發收合；點擊 nav link / 語言切換 / 登出不會觸發收合。
- **SC-007B**：`SIDEBAR_COLLAPSED_STORAGE_KEY` 在重整與跨頁後可還原最後收合狀態。
- **SC-007C**：Mobile viewport 下收合互動不生效，且 top+bottom nav 操作不受影響。
- **SC-007D**：icon-only sidebar footer 顯示 `logoutBtn` 並隱藏使用者姓名/頭像，使用者可直接登出。
- **SC-008**：Appearance 切換後，`html[data-theme]` 即時更新，全頁 CSS token（`tokens.css` dark override）正確套用。
- **SC-008A**：重新整理或切換至任一 `SUPPORTED_PAGES`，Appearance 從 `APPEARANCE_STORAGE_KEY` 恢復，首次繪製不出現 FOUC。
- **SC-008B**：`system` 模式下，無論 OS `prefers-color-scheme` 為何，`html[data-theme]` 固定為 `light`。
- **SC-008C**：`APPEARANCE_STORAGE_KEY` 不存在或無效時，系統預設為 `system` mode，且不拋出 JS 例外。
- **SC-008D**：Sidebar Appearance icon 在 `light` 時顯示月亮且點擊後切至 `dark`；在 `dark` 時顯示太陽且點擊後切至 `light`；同一時間不得同時顯示太陽與月亮。
- **SC-008E**：Sidebar Appearance icon 的 `aria-label` / `title` 隨 zh/en 與下一步動作同步更新。
- **SC-009**：Desktop Sidebar 底部 utility row 在展開狀態顯示 keyboard、appearance、notification bell 三個 icon-only 入口；收合時 keyboard 入口隱藏，appearance 與 notification bell 維持可見。Mobile top bar 顯示 appearance 與 notification bell 入口（keyboard 在 mobile 上不顯示）。
- **SC-009A**：Desktop 點擊 keyboard icon 或按 `?` 可開啟快捷鍵總覽 modal；按 `Esc` 或點擊 backdrop 可關閉。Mobile 不顯示 keyboard icon，且按 `?` 不開啟快捷鍵總覽。
- **SC-009B**：快捷鍵總覽 modal 的 zh/en 文案、section 與可存取屬性同步切換。
- **SC-009C**：快捷鍵總覽中的複合快捷鍵以獨立 keycap 呈現，例如 `CTRL`、`CMD`、`S` 為三個元素。
- **SC-009D**（v1.4.0 修訂，v1.4.3 標籤字面更新）：快捷鍵總覽不得出現合併 action 列；`上一筆`、`下一筆`、`通過目前結果`、`退回目前結果（回退標記員狀態僅限正式標記）` 各自獨立顯示，且 `全部通過`、`全部退回` 兩列為 0 個 DOM 節點（見 FR-016G）。
- **SC-010**：在 `1440px` desktop viewport 下，`dashboard / task-management / annotation / dataset / admin / account` 主要模組頁的最上層 heading block 與 Dashboard baseline 的計算位置與 typography 相符。
- **SC-011**：Desktop `notificationBellBtn` 與 Mobile `mobileNotificationBellBtn` 的 badge 未讀數與 `aria-expanded` 在 dropdown 開關時同步一致。
- **SC-011A**：未讀數 = 0 時 badge 不顯示；1–9 顯示實際數字；>9 顯示 `9+`。
- **SC-011B**：Mobile 通知鈴鐺（`mobileNotificationBellBtn`）視覺樣式與 `mobileThemeToggleBtn` 一致（34×34、`border: 1px solid var(--color-border)`、白底、hover 切 primary）。
- **SC-011C**：通知 dropdown 不包含「通知設定」跳轉連結；通知偏好設定入口位於 `/profile`（spec 005）。
- **SC-011D**：語系為 `en` 時，通知 dropdown 不得顯示中文任務名稱或中文相對時間；語系為 `zh` 時，通知 dropdown 不得顯示英文事件句型。
- **SC-011E**：Shared Navbar 可使用頁面或 prototype mock 提供的通知資料渲染 badge 與 dropdown；驗收不得要求本規格提供通知 API 或後端事件模型。
- **SC-012**（issue #725 新增）：`super_admin` 在 Desktop 未收合 Sidebar，可透過「系統管理」次選單於一次點擊內直達 `role-settings`，不需先進入 `user-management`。
- **SC-012A**：次選單子項不影響本規格既有的 L0 可見性與計數矩陣（`user`=5／`super_admin`=6 維持不變）。
- **SC-012B**：Mobile 與 Desktop 收合狀態下「系統管理」點擊行為與次選單新增前一致，不因本次變更產生互動落差或死角。
- **SC-013**（issue #944 新增）：`reviewer` 任務角色下，`#navAnnotation` 與 `[data-testid="role-indicator"]` 文字分別為「審核作業」與「審核員」，且 `#navAnnotation` 與同頁入口麵包屑第一層連結文字一致；直接呼叫 Shared Sidebar 掛載函式（不經任何消費頁面 JS）亦得到相同結果。
- **SC-013A**（issue #1018 修訂）：`annotator` 任務角色下 `#navAnnotation` 維持既有預設「標記作業」；`project_leader` 任務角色下 `#navAnnotation` 改為「例外處置」；`annotator` 之 `role-indicator` 維持既有預設「一般使用者」。
- **SC-014**（issue #1041 新增）：任一語系（zh/en）、任一任務角色（`reviewer` / `project_leader` / `annotator` / 未提供）組合下，直接呼叫 Shared Sidebar 掛載函式並切換語言，六個 L0 標籤（`navDashboard`／`navTaskManagement`／`navAnnotation`／`navDataset`／`navAdmin`／`navProfile`）之渲染文字須與 FR-021 定義之雙語對照表逐字一致，且語言切換後立即反映新語系，不需重新掛載或重新整理頁面。若任何消費頁面自行實作了覆寫程式碼，其渲染結果仍必須與此門檻一致，不得因頁面自有覆寫而產生偏離。

### 驗證建議

- 建立 navbar contract 測試：逐頁驗證 L0 順序、active、`aria-current`、role visibility。
- 加入 gating smoke test：覆蓋無 task context 與無 membership 的導回行為。
- 加入 utility smoke test：驗證 Desktop keyboard icon、快捷鍵 modal i18n 與 keycap 呈現；驗證 Mobile 不顯示 keyboard icon 且 `?` 不觸發 modal；驗證 Appearance icon。
- 加入 sidebar link decoration smoke test：逐頁驗證品牌與 L0 模組導覽連結不被頁內 anchor 樣式套用底線。

---

## 審查與驗收清單

### 內容品質

- [x] 規格聚焦使用者可觀察行為、業務規則與驗收條件。
- [x] 所有必填章節已完成；不適用的內容已明確排除或未納入本版範圍。
- [x] 無未解決的待釐清標記殘留。
- [x] 需求、驗收情境與成功標準皆可測試。

### Label Suite 合規性

- [x] 功能分支格式符合 `feat/[module]/NNN-feature`。
- [x] 已檢查本規格未要求跨 feature import；跨模組共用行為需透過 shared contract 或規格相依性追蹤。
- [x] 本規格不新增 task type 邏輯；若後續接觸任務行為，需回到 config-driven task architecture 檢查。
- [x] 已檢查 annotator-facing API / UI 不得暴露 test-set answer、ground-truth 或等價特權資料。
- [x] Prototype / IA / 上游規格 source of truth 已列於需求來源或規格相依性。
- [x] 上下游規格相依性已列出；若本規格改版，需檢查 downstream 影響。

### 執行狀態

- [x] 輸入描述已解析。
- [x] 角色、互動、資料狀態與限制已萃取。
- [x] 模糊點已釐清或明確排除於本版範圍。
- [x] 使用者情境已定義。
- [x] 功能需求已定義。
- [x] 關鍵實體或狀態模型已定義。
- [x] Review checklist 已通過。

---

## Changelog

| 版本 | 日期 | 變更摘要 |
|------|------|---------|
| 2.2.0 | 2026-10-02 | Issue #1075（OpenSpec change `1075-workspace-tabs-shared-008`，MINOR，G3——issue #1075 的第 10 個、最終堆疊 PR 群組）：新增使用者故事 10、FR-022、FR-016H。`specs/shared/019-workspace-tabs/spec.md`（workspace tabs，v1.0.0，9 個使用者故事、FR-001～022、SC-001～016）已於 G1～G2g 共 9 個先行 PR 群組實作工作頁籤列完整行為，其中 FR-009／Q7 明文將「關閉作用中頁籤後的焦點移動規則」委由本規格定義——**FR-022** 正式承接此規則（優先移至右鄰、若為最右側則移至左鄰），規則本身逐字對應該規格之 AC-1.5，行為已於原型 G2a-2（PR #1080）落地為 `closeWorkspaceTab()` 之既有邏輯，本次純為規格補述，未異動任何程式碼。**FR-016H** 為既有 FR-016 群（快捷鍵總覽）新增之頁籤 section（比照既有 FR-016G 之加列慣例），列出 `Alt+1…8`（切換頁籤）與 `Alt+W`（關閉作用中頁籤）兩列；此二快捷鍵之實際觸發與抑制行為仍由 `specs/shared/019-workspace-tabs/spec.md` FR-013、AC-5.1 至 AC-5.4 擁有，本條不重複定義，僅規範總覽顯示內容與格式——此項已依 TDD（Red→Green）於 `design/prototype/pages/shared/sidebar.js` 新增對應 section markup（手寫 production 18 行）。既有 FR-001～FR-021 群（含 FR-016～FR-016G）、SC-001～SC-014 逐字不動，未推翻任何既有 FR/AC（MINOR 邊界）。OpenSpec 衍生檢視 `openspec/specs/shared/008-sidebar-navbar-shared/` 已合併本次 2 個新增 Requirement（`added: 2, modified: 0, removed: 0`）。 |
| 2.1.0 | 2026-09-28 | Issue #1041（OpenSpec change `fix-1041-sidebar-nav-i18n`，MINOR，4 個 stacked PR 群組：PR #1049／#1050／#1052／本次）：新增 FR-021、SC-014——Shared Sidebar 六個 L0 標籤（`navDashboard`／`navTaskManagement`／`navAnnotation`／`navDataset`／`navAdmin`／`navProfile`）全面語言感知，於元件內部解析並隨每次 `applyGlobalLanguage()` 呼叫重新解析（不只掛載當下一次）；`navAnnotation` 之 `annotator`/else 分支補上此前未定義的英文變體 `Annotation`（沿用全站既有消費頁一致採用之既有慣例字面值，非新創）。**issue body 前提已於派工前更正**：原描述「六個標籤從未國際化」不成立——11 個消費頁面中 10 個本來就各自以頁面級 `applyLang` 覆寫達成語言切換（只是違反 FR-020），真實的使用者可見缺陷僅兩處：`annotation-list.html` 的 `#navAnnotation`（`annotator`/無角色情境，issue #1023 移除覆寫後暴露的英文缺失）與 `annotation-workspace.html`（deep-link 情境下五中一英混雜）。**四組拆分**：第一組（PR #1049）修好上述兩處真實缺陷；第二至四組依模組批次移除其餘 10 個頁面已成死碼或持續生效覆寫（`admin/user-management.html`、`admin/role-settings.html`、`dashboard/dashboard.i18n.js`、`dataset/dataset-analysis-detail.html`、`dataset/dataset-analysis-list.js`＋`.i18n.js`、`account/profile.html`、`task-management/task-detail.html`／`task-list.html`／`task-new.html`），純屬 FR-020 合規與 DRY，非缺陷修復；逐檔核實覆寫與 `applyGlobalLanguage()` 之相對時序後發現並非全部同型——`annotation-list.html`／`admin` 兩頁／`dashboard.i18n.js`／`account/profile.html`／`dataset-analysis-detail.html`／`task-detail.html` 為持續生效之覆寫（移除前後渲染結果不變，是因字面值與元件逐字相同，非因覆寫已失效），`dataset-analysis-list.js`／`task-list.html`／`task-new.html` 之覆寫執行於 `applyGlobalLanguage()` **之前**、元件隨後蓋回，屬真正的無害死碼，兩者於各自 PR body 分開陳述。**SC-014 建模方式**：比照 issue #1018 已查證並裁定之既有模式——`specs/shared/008` 之成功標準（`SC-001`–`SC-013A`）從未透過 OpenSpec delta 的 `### Requirement:` 宣告產生，衍生檢視 `openspec/specs/shared/008-…` 僅含 FR 項目、零個 SC；SC-014 因此比照辦理，delta 僅宣告 FR-021 一個 Requirement，SC-014 於本次 archive 直接手寫進正典本節，未經過衍生檢視。既有 FR-020／FR-020A／FR-019 群／FR-002／FR-003A 等條文逐字不動，未推翻任何既有 FR/AC。 |
| 2.0.1 | 2026-09-27 | **Lightweight Path** 澄清（issue #1023，非 OpenSpec change）：FR-020 本身只規範 Shared Sidebar 元件內部如何依 `opts.taskRole` 解析三個任務角色，並未規範**哪些消費頁面必須傳入該參數**——issue #944／#1018 兩版變更都只碰過 `sidebar.js` 與 `annotation-workspace.html` 一個消費端，`annotation-list.html` 的 `mountSidebar()` 呼叫從未補上對應的 `taskRole` 解析。annotation-015 FR-080 第 2 點要求入口麵包屑第 2 層返回 `annotation-list.html` 時回帶 `task_id`／`role`／`run_type`，`role` 確實回帶了，但 `annotation-list.html` 端沒有讀出來餵給側欄，導致 reviewer／project_leader 從 `annotation-workspace.html` 返回清單頁時，L0「標記作業」標籤會從「審核作業」／「例外處置」變回「標記作業」，同一審核動線內文案左右搖擺。**修法**（僅 `design/prototype/pages/annotation/annotation-list.html` 一個檔案）：`mountSidebar()` 呼叫新增比照 `annotation-workspace.html` 既有 `urlTaskRole` 解析邏輯（從 URL `role` 參數解析、`reviewer`／`project_leader`／其餘落回 `annotator`）並傳入 `taskRole`；同時發現並修正該頁自有、與 `taskRole` 完全無關的 `applyNavLabels()` 對 `navAnnotation` 節點之事後 DOM 覆寫——這個覆寫本身已違反 FR-020「此解析必須於 Shared Sidebar 元件內部完成，消費頁面不得於掛載完成後另行以 DOM 操作覆寫該節點之顯示文字」，若不移除，`taskRole` 解析出來的正確文字會在 `init()` 與每次語言切換時被這個舊機制蓋回頁面自有的固定字串；隨之移除因此孤兒化的 `I18N.zh.navAnnotation`／`I18N.en.navAnnotation` 兩個字典項（僅被該覆寫陣列引用，無其他消費者）。**FR-020 條文本身未新增、未移除、未修改任何字**——本次僅是澄清其既有沉默地帶（未規定哪些頁面必須傳入）並記錄一個既存缺口的修正，實際影響面由「僅 `annotation-workspace.html`」擴大為「`annotation-workspace.html` ＋ `annotation-list.html`」兩個頁面。**範圍外**：全站 11 個 `mountSidebar()` 呼叫點中，僅這兩個頁面屬於同一條審核／標記動線（有 FR-080 回帶的 `role` 脈絡可用）；本次不規定、不代表其餘頁面也須傳入 `taskRole`，那是新增契約、需完整 OpenSpec change 且需先逐頁盤點（issue #1023 body 明確排除，另立範圍）。**副作用（刻意接受的迴歸，非本次修正的一部分）**：移除 `annotation-list.html` 之消費端覆寫（該覆寫本身已違反 FR-020）後，該頁在英文語系下對 `annotator` 任務角色的 `#navAnnotation` 由原本頁面自有字典值 `'Annotation'` 退回 `sidebar.js` 之未翻譯回退值「標記作業」——英文使用者看到的介面文字比修法前更差，屬刻意接受、非預期的正確結果。原因：FR-020 現行條文對 `reviewer`（en: `Review`）與 `project_leader`（en: `Exception Disposition`）皆已定義英文字串，但 `annotator`／else 分支僅有「維持既有預設『標記作業』」、從未定義任何英文變體；補一個英文字串屬**新增**FR-020 契約內容，不是澄清，超出本次 Lightweight Path 範圍，已由 issue #1041 追蹤（待維護者裁示 L0 標籤 i18n 缺口）。`annotation-list.html` 因本次修法而加入 #1041 待修頁面集合。**相關既存缺口**：`design/prototype/tests/shared/language-switch-consistency.spec.ts:77` 現有一支測試**強制要求** `pages/admin/user-management.html`／`pages/admin/role-settings.html` 之 `applyLang` 邏輯必須更新 `navAnnotation`——即這兩頁的消費端覆寫同樣違反 FR-020，且有測試在強制維持該違規；此缺口與本次發現同類，非本次範圍，一併留給 #1041 處理，避免該 issue 派工時需重新發現。 |
| 2.0.0 | 2026-09-27 | Issue #1018（OpenSpec change `fix-1018-sidebar-pl-label`，維護者裁定推翻 FR-020 對 `project_leader` 之既有判定，MAJOR）：`sidebar.js` 之 `navAnnotation` 於 `taskRole === 'project_leader'` 時原落回既有預設「標記作業」——這是 FR-020（issue #944）明文之既有判定，其依據為「與 annotation-015 FR-080 之 `crumbWorkAreaAnnotator` 文字一致」。但 issue #994／PR #1017 已讓同一畫面（`annotation-workspace.html`，`role=project_leader`）之入口麵包屑第一層改用新增之 `crumbWorkAreaProjectLeader`（「例外處置」／`Exception Disposition`），不再與 `crumbWorkAreaAnnotator`（「標記作業」）一致，FR-020 原判定依據之交叉引用因此失效，造成同一畫面上側欄與麵包屑文案矛盾。**變更內容**：FR-020 新增 `project_leader` 分支，顯示「例外處置」（en: `Exception Disposition`），與 `crumbWorkAreaProjectLeader` 文字一致；`reviewer`／`annotator` 兩分支逐字不變。同步修訂 SC-013A：`annotator` 維持既有預設「標記作業」；`project_leader` 改為「例外處置」，不再與 `annotator` 併列同一預設；`role-indicator`（FR-020A／SC-013A 之 `annotator` → 「一般使用者」）部分不變，不在本次範圍內。解析全部於 `sidebar.js` 元件內部（`renderSidebar()`）完成，延伸既有 `taskRoleI18n` 對照表，未新增任何消費端 DOM 覆寫。實查 11 個 `mountSidebar()` 呼叫點，僅 `annotation-workspace.html` 傳入 `taskRole`，故本次變更之實際影響面僅一個畫面，其餘不受影響。**範圍外發現（issue #1041 追蹤，本版不動）**：`navItems` 六個 L0 標籤中五個（`儀表板`／`任務管理`／`資料集分析`／`系統管理`／`個人設定`，`sidebar.js:498,505,519,526,536`）為硬編碼中文字面值，僅 `annotation` 項之角色分支透過 `taskRoleI18n` 語言感知；`readStoredLang()`（`sidebar.js:486`）僅於掛載當下讀取一次。故根因為「`annotator`／`project_leader` 共用預設『標記作業』從未有對應英文字串」，症狀為「`#navAnnotation` 不隨頁面 `lang-toggle` 即時切換」；`lang=en` 且 `role=reviewer` 時側欄實際渲染為五個中文項夾一個英文項（`儀表板 / 任務管理 / Review / 資料集分析 / 系統管理 / 個人設定`）之中英混雜結果，本次為 `project_leader` 新增語言感知分支後，觸發面擴大一倍。`sidebar.js` 本身已具備語言更新機制（`updateShortcutHelpLanguage()` `:140`、`updateSidebarThemeToggleLanguage()` `:212`），缺的是這幾個標籤的字串而非機制。 |
| 1.6.0 | 2026-09-25 | Issue #944（OpenSpec change `fix-944-sidebar-role-aware-labels`，MINOR）：新增使用者故事 9（L0「標記作業」與使用者角色標示依任務角色一致呈現）、FR-020／FR-020A、SC-013／SC-013A——共用側欄 `navItems` 的 `annotation` 項目（`#navAnnotation`）與使用者晶片角色標示（`roleIndicator`）原本恆為寫死預設值「標記作業」／「一般使用者」，`annotation-workspace` 頁面因此在消費端 `applyStaticI18nText()` 以直接 DOM 操作（`document.getElementById(...).textContent = ...`）事後補寫——issue #309（角色標示覆寫為「審核員」）與 issue #931（L0 項目覆寫為「審核作業」）各自重複同一問題，來源側欄從未真正支援角色解析。維護者裁定（2026-09-25）採方向 A——收斂到來源：`design/prototype/pages/shared/sidebar.js` 的 `renderSidebar()` 新增 `opts.taskRole`（值域對齊既有「任務角色」：`project_leader / reviewer / annotator`），內建僅含本條所需雙語詞彙之小型對照表（比照既有 `adminSubmenuI18n` 前例）解析 `navAnnotation` 標籤與 `roleIndicator` 預設值；`annotation-workspace.html` 之 `mountSidebar()` 呼叫新增自 URL `role` 參數同步解析之 `taskRole`；`annotation-workspace.config.js` 之 `applyStaticI18nText()` 移除 issue #309、#931 兩處消費端覆寫區塊（其 i18n 表資料本身保留，仍供他處使用）。新增條文與 annotation-015 FR-080 入口麵包屑既有角色分流（`crumbWorkAreaReviewer`／`crumbWorkAreaAnnotator`）一致，FR-080 本身未變更；既有 `opts.roleIndicator` 顯式覆寫入口（例如系統管理頁「系統管理員」）優先序不變。既有測試 `issue-309-reviewer-workspace-vocab.spec.ts`／`issue-931-sidebar-reviewer-label.spec.ts` 斷言全數位移保留，僅後者檔頭註解更新為描述新來源機制。 |
| 1.5.1 | 2026-09-24 | 澄清 FR-001（issue #932）：規格原文未明確規範 `userAvatar` 的顯示內容，僅在「關鍵實體」`SharedNavbarContract.userIds` 列出其為契約 id 之一，導致實作僅 dashboard 頁呼叫 `updateUserChip({ avatarLabel })` 帶入正確縮寫，其餘頁面停留在寫死的預設佔位文字「U」，與同列 `userName` 顯示的實際使用者姓名不一致。修法（`design/prototype/pages/shared/sidebar.js`）：新增 `computeAvatarInitials(name)`，接入 `renderSidebar` 初次渲染與 `updateUserChip` 的 `userName` 同步路徑（僅在未帶 `avatarLabel` 時），使所有 `SUPPORTED_PAGES` 首次渲染即依 `userName` 顯示正確縮寫；`userName` 為空白、僅含空白字元，或僅含零寬字元（`U+200B`／`U+200C`／`U+200D`／`U+FEFF`，code review 於本次發現：`\s` 不比對零寬字元）時，無法推導出縮寫，維持顯示既有預設佔位文字「U」，避免頭像圓圈顯示為空白（不得以「無字母」取代「錯字母」）；dashboard 既有以 `avatarLabel` 明確覆寫角色字母（`SA`／`PL`／`A`／`R`）的展示需求不受影響、行為不變。本次為既有 FR-001「同一份 contract」語意的澄清補述，未新增或移除 FR/AC。 |
| 1.5.0 | 2026-09-13 | Issue #725（OpenSpec change `admin-role-settings-nav-shortcut`，PR #757）：新增使用者故事 8（系統管理次選單快速直達）、FR-019 群（FR-019／FR-019A／FR-019B／FR-019C／FR-019D／FR-019E）與 SC-012 群（SC-012／SC-012A／SC-012B）——`super_admin` 在 Desktop 未收合 Sidebar 時，L0「系統管理」項目提供可展開次選單（使用者管理／角色設定兩個子項連結），一次點擊即可直達 `role-settings`，不需先落地 `user-management`；Mobile 與 Desktop 收合狀態維持既有單一連結行為。次選單子項不計入既有 FR-002／FR-003A／SC-003 之 L0 導覽項清單與計數，兩者文字逐字不變，僅在「L0 群組與目標頁（IA Contract）」之 Admin 條目補註次選單存在事實。維護者已就「新增側欄一級項目 vs. 展開次選單」的架構衝突裁示採用後者（不新增/移除 L0 項目）。 |
| 1.4.4 | 2026-09-13 | 結構補齊：新增缺漏的 `## 功能目標` 標題（Project SDD lint `SPEC_REQUIRED_HEADING` ratchet——OpenSpec change `admin-role-settings-nav-shortcut`（issue #725）首次以本流程觸碰本規格，觸發既有 legacy heading debt 的強制補齊）。規格條文未變，純結構 patch；`scripts/sdd-lint-baseline.txt` 同步移除本檔對應的 `LEGACY_SPEC_HEADING` 豁免項。 |
| 1.4.3 | 2026-08-26 | **修正快捷鍵總覽 `R` 列標籤誤導性文案**（issue #409）：v1.4.1 加上的「（限正式標記）」註記，字面上讀起來像整個退回動作／`R` 快捷鍵都被限制在 `official_run`，但實際上 reject 控件與 `R` 鍵在 `dry_run` 一樣可用且必須維持一致呈現（annotation-015 **AC-3.33** 禁止審核卡上任何依 `run_type` 分流的呈現分支）——僅有「退回時把標記員狀態回退為待標記」這個副作用（annotation-015 FR-014I／AC-3.15／AC-6.4）才是 `official_run` 專屬。修法：標籤字面由「退回目前結果（限正式標記）」改為「退回目前結果（回退標記員狀態僅限正式標記）」（en：「Return current result (formal runs only)」改為「Return current result (annotator status rollback is formal-run only)」），將限定範圍精確掛在「回退標記員狀態」上。規格條文未變（FR-016G／SC-009D 既有行為的標籤字面精確化，非新增契約）；同步修訂 AC 6 例示、FR-016G 與 SC-009D 的標籤字面。 |
| 1.4.2 | 2026-08-24 | Issue #261：新增 Prototype Traceability，明確對應共用 `sidebar.js`／`sidebar.css`（14 個消費頁面）與 living styleguide 參考頁的責任邊界；規格條文未變。 |
| 1.4.1 | 2026-08-19 | 快捷鍵總覽 `R` 列標籤改為「退回目前結果（限正式標記）」（zh）／「Return current result (formal runs only)」（en）：annotation-015 AC-3.15／AC-6.4 將退回通道收斂為 official_run 專屬，標籤補上適用範圍註記（issue #191）；`A` 列標籤不變。同步修訂 AC 6 例示、FR-016G 與 SC-009D 的標籤字面。 |
| 1.4.0 | 2026-08-17 | 移除快捷鍵總覽 `審核` section 的批次兩列（`Shift+A` 全部通過、`Shift+R` 全部退回）：annotation-015 v4.0.0 起審核單位為「樣本 × 標記員」，一次審核只涉及一位標記員，批次操作沒有可批次的對象；同版落地的 `A`／`R` 行為定義見 annotation-015 FR-054。新增 FR-016G，修訂 FR-016E 例示與 SC-009D 列舉。 |
| 1.3.10 | 2026-05-22 | 釐清 Mobile 不支援快捷鍵總覽入口與 `?` 開啟行為；將快捷鍵 modal 入口與驗收收斂為 Desktop-only；固定缺少任務角色或上下文時的 gating fallback：標記作業導回 `/dashboard`、資料集分析導回 `/task-list`；界定通知 dropdown 僅為前端展示契約，資料由頁面或 prototype mock 提供 |
| 1.3.9 | 2026-05-21 | 補充輸入與產生規則、已釐清事項、審查清單與執行狀態；同步功能分支格式 |
| 1.3.8 | 2026-05-19 | 補齊 notification dropdown i18n 規格：事件句型、行為者、任務名稱與相對時間皆依目前語系呈現；新增 SC-011D |
| 1.3.7 | 2026-05-19 | 新增 notification bell 規格：FR-014D（收合時 keyboard 隱藏、bell + appearance 保留）、FR-018 群（bell 入口、badge、dropdown 定位與無設定連結規則）、SC-011 群；更新 `SIDEBAR_UTILITY_ACTIONS`、`interactiveIds`、SC-009；明確通知設定入口移至 `/profile`（spec 005 FR-013B） |
| 1.3.6 | 2026-05-19 | 以最新 prototype 同步 supported pages 與 dataset 導覽：加入 `annotation-list`、`dataset-analysis`、`dataset-analysis-detail/:task_id`，移除舊 `dataset-stats` / `dataset-quality` 導覽命名 |
| 1.3.5 | 2026-05-19 | 快捷鍵 modal 視覺密度收斂：新增 FR-016F，規範 section 標題小寫全大寫、列間無分隔線、按鍵標籤緊湊尺寸 |
| 1.3.4 | 2026-05-15 | 同步 Shared Sidebar 連結樣式 contract：品牌與 L0 模組導覽連結在 default / hover / focus / active 狀態不得顯示文字底線，並補充跨模組驗收標準 |
| 1.3.3 | 2026-05-15 | 新增跨模組頁首 heading baseline：所有登入後主要頁面的最上層主標題、副標題位置與 typography 對齊 Dashboard |
| 1.3.2 | 2026-05-15 | 統一 mobile top brand bar 右側工具列樣式，將 Task Management 的手機版工具列尺寸與品牌區讓位規則收斂至 shared sidebar contract |
| 1.3.1 | 2026-05-13 | 調整 Mobile / icon-only sidebar footer：最下方呈現登出按鈕，不再以使用者姓名或頭像取代登出控制；移除 `mobileUserName` contract |
| 1.3.0 | 2026-05-12 | 同步 Sidebar utility：新增 icon-only 快捷鍵總覽入口、快捷鍵 modal i18n、獨立 keycap 與一 action 一列呈現；Sidebar Appearance 改為單鍵 light/dark icon toggle，Desktop/Mobile 入口同步，並更新 `APPEARANCE_STORAGE_KEY = label-suite-theme` |
| 1.2.0 | 2026-05-12 | 新增 Appearance 外觀模式切換規格：`APPEARANCE_STORAGE_KEY`、三態 mode（light/dark/system）、FOUC 防護（`theme-fouc.js`）、FR-015 群、AppearanceState 實體、SC-008 群 |
| 1.1.5 | 2026-04-23 | 補充 Shared Sidebar 收合規格：新增 Desktop `Mini / Icon-only`、空白區觸發排除互動元件、`labelsuite.sidebarCollapsed` 狀態持久化、Mobile 不啟用收合，並明確化共用 `shared/sidebar.css` 契約 |
| 1.1.4 | 2026-04-23 | 同步 shared sidebar：新增 `labelsuite.activeTaskType` 導頁契約，點擊「標記作業」時附帶 `task_type` query |
| 1.1.3 | 2026-04-16 | 新增語言持久化機制規範（FR-009B / LanguageState / SC-006A），明確定義 `labelsuite.lang` 跨頁與重載一致性 |
| 1.1.2 | 2026-04-16 | 新增「角色可見性與 L0 項目數」矩陣，明確規範 `user=5`、`super_admin=6`，並補 FR/SC 可驗收條款 |
| 1.1.1 | 2026-04-16 | 新增全域語言切換規則：切換語言後 Sidebar 與右側任一模組頁需同步更新並保持一致 |
| 1.1.0 | 2026-04-16 | 依 IA v7 重新定義 L0 導覽項、角色可見性、L1/L2 active 映射、task context gating 與 `SUPPORTED_PAGES` |
| 1.0.2 | 2026-04-16 | 補上「規格相依性」與「Changelog」章節，對齊 dashboard spec 結構 |
| 1.0.1 | 2026-04-16 | 依 dashboard spec 風格重寫 shared navbar 規格（Process Flow、User Story、FR、SC） |
| 1.0.0 | 2026-04-16 | Shared sidebar navbar 初版規格建立 |
