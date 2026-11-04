# Component Inventory

> **用途：** 記錄所有 prototype 頁面中出現的 UI elements，對照 MASTER.md 的定義狀態，作為 design system 擴充的依據。
>
> **維護方式（機器核對，非手動掃描日期）：**
> - 元件清單以 [inventory-manifest.json](inventory-manifest.json) 的 `componentRegistry` 為唯一來源；本檔每個 `### <狀態 emoji> <名稱>` 標題，必須透過 manifest 的 `inventoryHeadings`（標題 → registry key）與 registry **一一對應**，多一個或少一個都會報紅。
> - 本檔仍為手寫文件（變體表、出現頁面、MASTER.md 定義狀態）；不是產生檔。
> - 「prototype 用了哪些元件」由 class 掃描閘門檢查：`design/prototype/pages/**/*.{html,js}` 使用的每個 class 都必須在 manifest `classScan` 登記（元件前綴、過渡例外或頁面專屬），未登記即 CI 失敗。
> - 驗證指令：`node scripts/gen-screen-inventory.mjs --check`（以及回歸測試 `bash scripts/inventory-tests.sh`）。
>
> **Design Token 來源：** `design/prototype/assets/tokens.css`
> **反向索引：** [screen-inventory.md](screen-inventory.md)（「頁面 → 元件」視角；該檔為 generated view，由 [inventory-manifest.json](inventory-manifest.json) 產生）

---

## 維護時機

**本文件與 manifest 必須在 prototype 異動時同步更新，漏了會被 `--check` 擋下。** 觸發條件：

| 觸發 | 動作 |
|------|------|
| Prototype 使用了未登記的新 class | 在 manifest `classScan` 登記其前綴：屬於既有元件 → `componentClasses`；新元件 → 先加 `componentRegistry` 與 `inventoryHeadings`，再於本檔加標題；僅頁面專屬 → `pageLocalClasses`；否則 CI 紅燈（`unregistered component class`） |
| Prototype 新增一個 MASTER.md 尚未定義的 UI 元件 | 在本文件加入該元件標題，狀態標為 ❌ 未定義（標題需同時登記進 `inventoryHeadings`） |
| MASTER.md 補上該元件規格 | 狀態改為 ✅ 已定義 |
| 既有元件出現在新頁面 | 更新該元件的「出現頁面」欄，並更新 manifest 該畫面的 `components` |
| 元件從所有 prototype 中移除 | 狀態改為 🔒 封存（標題保留，registry key 不刪） |
| 修改 manifest 或本檔標題 | 執行 `node scripts/gen-screen-inventory.mjs` 重新產生 [screen-inventory.md](screen-inventory.md)，再跑 `--check` 與 `bash scripts/inventory-tests.sh` |

> `/label-suite-design` skill 以條件式引用本文件：僅在引入新 UI 元件時讀取，不在每次生成頁面時讀取。

## 新元件完整流程

新 component 出現時，依序更新以下文件：

| 步驟 | 文件 | 說明 |
|------|------|------|
| 1 | `design/system/MASTER.md` | 補充元件規格（結構、token、互動規則、a11y） |
| 2 | `design/system/inventory.md` + `design/system/inventory-manifest.json` | 本檔加入標題並標為 ✅ 已定義、更新出現頁面；manifest 加入 `componentRegistry`、`inventoryHeadings` 與 `classScan.componentClasses` 前綴（兩者標題／key 必須一一對應） |
| 3 | `design/prototype/pages/` | 使用 `/label-suite-design` skill 產生 prototype HTML |
| 4 | `design/prototype/assets/tokens.css` | 若有新 token，同步更新 CSS 變數 |

**Prototype 生成工具：** `/label-suite-design`（讀 spec → 產生 HTML）。不使用 Pencil 畫板作為前置步驟。

**不需要動（除非規則本身改變）：**
- `.claude/skills/label-suite-design/SKILL.md` — 只有新增/修改設計規則時才動
- `.claude/skills/label-suite-design/README.md` — 只有品牌方向改變時才動
- `.claude/skills/label-suite-design/colors_and_type.css` — 只有新增全域 token 時才動（給 skill 資料夾外的 standalone artifact 用）

---

## 狀態說明

| 狀態 | 意義 |
|------|------|
| ✅ 已定義 | MASTER.md 已有完整規格 |
| ⚠️ 部分定義 | MASTER.md 有提及但規格不完整 |
| ❌ 未定義 | prototype 已使用，但 MASTER.md 尚未定義 |
| 🔒 封存 | 已不再使用 |

---

## design-system.pen 同步摘要

### Token（已同步）

- **Core colors:** `color-primary #6366F1`、`color-secondary #818CF8`、`color-cta #10B981`、`color-surface #F5F3FF`、`color-ink #1E1B4B`
- **Supporting colors:** `color-border #E2E8F0`、`color-text-muted #94A3B8`、`color-white #FFFFFF`
- **State colors:** error / success / warning / info（含 text/bg/border）
- **Radius:** `sm 4`、`md 8`、`lg 12`、`xl 16`、`full 9999`
- **Spacing:** `xs 4`、`sm 8`、`md 16`、`lg 24`、`xl 32`、`2xl 48`、`3xl 64`

### Typography（Pencil 實測）

- **Component 主要字體：** `Inter`
- **標題字體（在 Modal 標題出現）：** `Crimson Pro`

### Pen 版面區塊（已覆蓋到 MASTER.md）

- `sec_color`, `sec_typo`, `sec_state`, `sec_space`, `sec_radius`, `sec_zindex`
- `sec_comp`, `sec_form`, `sec_alert`, `sec_badge`
- `sec_nav`, `sec_sidebar`, `sec_tab`
- `sec_table`, `sec_list`, `sec_divider`, `sec_tooltip`, `sec_avatar`

### Reusable Components（Pencil 實測，46 個）

- **Buttons（13）**：Primary / Secondary / Ghost / Danger / OAuth / Icon Only / CTA(Default, Hover, Loading, Disabled) / Language Toggle(Default, ZH, EN)
- **Inputs（6）**：Default / Focus / Inline(Default, Focus, Error) / Readonly
- **Feedback（5）**：Toast(Success, Error) / Alert Banner(Error) / State Panel(Success, Token Error)
- **Status + Link（8）**：Badge(Not Started, In Progress, Submitted, Error) / Link(Inline, Action, Nav Active, Nav Inactive)
- **Layout + Data（9）**：Navbar / Sidebar / Desktop Content Tabs / Table / List / Divider(Horizontal, Text) / Tooltip / Mobile Tab Bar
- **Profile + Other（5）**：Card / Modal / Avatar(Small, Large, Uploadable)

---

## Component 清單

### ✅ Button

**MASTER.md 狀態：** 已定義（Primary + Secondary + Danger + Ghost + Loading + Disabled + OAuth + Icon-only + Language Toggle）

| 變體 | 樣式 | 出現頁面 | MASTER.md |
|------|------|----------|-----------|
| Primary (CTA) | `bg-cta` hover:opacity-90 translateY(-1px) | login, dashboard, profile | ✅ |
| Secondary | `border-primary text-primary` transparent bg | dashboard | ✅ |
| Danger | `text-red-600 hover:bg-red-50 hover:border-red-200` | dashboard (logout) | ✅ |
| Ghost / Text | `text-primary` underline on hover | dashboard (view all) | ✅ |
| OAuth (Google/GitHub) | `border-slate-200 bg-white` + 品牌 icon | login | ✅ |
| Icon-only | `w-9 h-9` no label, icon only | dashboard (mobile menu) | ✅ |
| Language Toggle | `border-slate-200 rounded-lg` | login, dashboard, profile | ✅ |

---

### ✅ Input

**MASTER.md 狀態：** 已定義（Normal + Focus + Error + Readonly / Disabled + Leading Icon + Eye Toggle + Field Hint/Error + Character Counter + Required Indicator）

| 變體 | 樣式 | 出現頁面 | MASTER.md |
|------|------|----------|-----------|
| Normal | `border-slate-200 rounded-lg` focus:ring-primary | profile | ✅ |
| Error | `border-red-400` focus:ring-red-400 | profile | ✅ |
| Readonly / Disabled | `bg-slate-50 border-slate-100 cursor-not-allowed` | profile (email) | ✅ |

**補充定義（已完成）：**

- ✅ **Leading Icon** — `register`, `forgot-password`, `reset-password`
- ✅ **Eye Toggle** — `register`, `reset-password`
- ✅ **Field Hint Text** — `register`（password 欄位）
- ✅ **Inline Field Error Text** — `register`, `forgot-password`, `reset-password`
- ✅ **Character Counter**
- ✅ **Required Indicator**

---

### ✅ Card

**MASTER.md 狀態：** 已定義（Interactive + Non-interactive）

| 變體 | 樣式 | 出現頁面 | MASTER.md |
|------|------|----------|-----------|
| Interactive | `border-slate-200 rounded-xl` hover:border-primary translateY(-2px) | dashboard (stat card) | ✅ |
| Non-interactive | `border-slate-200 rounded-xl` 無 hover | dashboard, profile | ✅ |
| Login card | `border-slate-200 rounded-2xl p-8` | login | ✅ |
| Dashboard summary card | `border-slate-200 rounded-xl p-6` + KPI / subtitle 結構 | dashboard | ✅ |

---

### ✅ Status Badge

**MASTER.md 狀態：** 已定義（In Progress / Not Started / Submitted / Error）

| 變體 | 出現頁面 | MASTER.md |
|------|----------|-----------|
| In Progress (warning) | dashboard | ✅ |
| Not Started (info) | dashboard | ✅ |
| Submitted (success) | dashboard | ✅ |
| Role badge (indigo, rounded-full + icon) | profile | ✅ |

---

### ✅ Modal

**MASTER.md 狀態：** 已定義

| 變體 | 出現頁面 | MASTER.md |
|------|----------|-----------|
| Confirmation dialog (cancel + confirm) | dashboard (logout) | ✅（含 Escape、click outside、focus trap） |

---

### ✅ Error / Alert Banner

**MASTER.md 狀態：** 已定義（Error）

| 變體 | 出現頁面 | MASTER.md |
|------|----------|-----------|
| Error (red) | login | ✅ |
| Success (green) — Toast 形式 | profile | ✅（Toast 已獨立定義，區分說明已補充）|

---

### ✅ Toast

**MASTER.md 狀態：** 已定義（Success + Error，含 Alert Banner vs Toast 區分）

| 變體 | 樣式 | 出現頁面 | MASTER.md |
|------|------|----------|-----------|
| Success | `bg-green-50 border-green-200 text-green-700` | profile | ✅ |
| Error | `bg-red-50 border-red-200 text-red-700` | profile | ✅ |

---

### ✅ Navbar / Header

**MASTER.md 狀態：** 已定義（結構、nav link states、mobile drawer、accessibility）

| 元素 | 說明 | MASTER.md |
|------|------|-----------|
| Logo + wordmark | 左側，連結至首頁 | ✅ |
| Nav links | Desktop 顯示，active / inactive / disabled state | ✅ |
| User menu | Avatar + 名稱，連結至 profile | ✅ |
| Language toggle | 右側固定 | ✅ |
| Logout button | Danger 樣式 | ✅ |
| Mobile hamburger | Icon-only button，展開 mobile drawer | ✅ |

---

### ✅ State Panel

**MASTER.md 狀態：** 已定義（不同於 Alert Banner 與 Toast，為 form 提交後整區取代 form 的狀態展示容器）

**變體清單：**

- ✅ **Success Panel** — `forgot-password`, `reset-password`
  - 樣式：綠色 bg + icon 圓圈 + 訊息文字 + 返回連結
  - `bg-success-50 border border-success-200 rounded-md p-5 text-center`
- ✅ **Token Error Panel** — `reset-password`
  - 樣式：紅色 bg + icon 圓圈 + 訊息文字 + 動作按鈕
  - `bg-red-50 border border-red-200 rounded-md p-5 text-center`

**說明：** State Panel 用於 form 提交後（成功）或頁面載入時偵測到 token 無效的情況，整個取代 form 區塊顯示。與 Alert Banner（行內提示，form 保持可見）和 Toast（浮動、自動消失）有本質區別。

---

### ✅ Prototype-Only State Switcher

**MASTER.md 狀態：** 已定義（prototype 輔助控制，不屬正式產品 UI）

| 變體 | 樣式 | 出現頁面 | MASTER.md |
|------|------|----------|-----------|
| Scenario switcher | `border-slate-200 rounded-lg` segmented button group | dashboard | ✅ |

**說明：** 此元件只用於 prototype 在單一 HTML 切換多個 wireframe state，不應直接視為正式產品 component。

---

### ✅ Sidebar

**MASTER.md 狀態：** 已定義（規格、nav item states、divider 用法、Admin Submenu 子規格）

| 元素 | 說明 | MASTER.md |
|------|------|-----------|
| Section nav items | active / inactive 狀態 | ✅ |
| Divider | 分組用 | ✅ |
| 僅 Desktop 顯示 | `hidden md:flex` | ✅ |
| Admin Submenu（issue #725） | 「系統管理」L0 項目的可展開次選單，觸發項 + `role="menu"` 容器 + 兩個 `role="menuitem"` 子項連結；Desktop 展開狀態限定，Mobile／收合 fallback 為既有單一連結 | ✅（MASTER.md §Sidebar → Admin Submenu） |

**Admin Submenu 出現頁面：** 所有登入後頁面（`design/prototype/pages/shared/sidebar.js` 共用元件；子項僅於 `system_role = super_admin` 可見）

---

### ✅ Desktop Content Tabs

**MASTER.md 狀態：** 已定義（底線型 tab 規格、active/inactive state、a11y 與使用情境）

| 元素 | 說明 | MASTER.md |
|------|------|-----------|
| Container | `display:flex + border-bottom: 2px` | ✅ |
| Tab item | `padding: 10px 20px; text-sm; font-medium` | ✅ |
| Active state | `text-primary + border-bottom-primary + font-semibold` | ✅ |
| 視覺一致性 | 模組內固定使用底線型（不混用 pill） | ✅ |

**出現頁面：**
- `admin/user-management.html`
- `admin/role-settings.html`
- `task-management/task-detail.html`

---

### ✅ Mobile Bottom Tab Bar

**MASTER.md 狀態：** 已定義（規格、tab item states、body padding rule、Sidebar 對應規則）

| 元素 | 說明 | MASTER.md |
|------|------|-----------|
| Tab item (icon + label) | active / inactive 狀態 | ✅ |
| 固定底部 | `fixed bottom-0 h-14` | ✅ |
| 僅 Mobile 顯示 | `md:hidden` | ✅ |

---

### ✅ Avatar

**MASTER.md 狀態：** 已定義（display-only + uploadable，含 upload 驗證規則、XSS-safe 實作）

| 變體 | 尺寸 | 出現頁面 | MASTER.md |
|------|------|----------|-----------|
| Small (navbar) | w-8 h-8 | dashboard | ✅ |
| Large (profile) | w-20 h-20 (desktop) / w-16 h-16 (mobile) | profile | ✅ |

---

### ✅ Tooltip

**MASTER.md 狀態：** 已定義（CSS 實作、規格、accessibility 規範）

| 元素 | 說明 | MASTER.md |
|------|------|-----------|
| 觸發器 | 小 info icon，tabindex="0" | ✅ |
| 提示框 | `bg-ink text-white` 絕對定位，底部帶箭頭 | ✅ |
| 出現時機 | hover + focus | ✅ |

---

### ✅ Table

**MASTER.md 狀態：** 已定義（規格、HTML 結構、accessibility、responsive）

| 元素 | 說明 | MASTER.md |
|------|------|-----------|
| Header row | `bg-slate-50 text-xs uppercase` | ✅ |
| Body row | hover:bg-slate-50、cursor-pointer | ✅ |
| Cell | `px-6 py-4` | ✅ |
| Responsive | `overflow-x-auto` 水平捲動 | ✅ |

---

### ✅ List (Activity List)

**MASTER.md 狀態：** 已定義（tokens、HTML 結構、empty state、right column types）

| 元素 | 說明 | MASTER.md |
|------|------|-----------|
| List item | 左側任務名稱 + 右側日期/分數 | ✅ |
| Divider | `divide-y divide-slate-100` | ✅ |

---

### ✅ Divider

**MASTER.md 狀態：** 已定義（Horizontal Rule、Text Divider、List Divider 三種變體）

| 變體 | 說明 | 出現頁面 | MASTER.md |
|------|------|----------|-----------|
| 水平線 | `h-px bg-slate-200` | login, profile | ✅ |
| 文字分隔（「或」） | 線條 + 中間文字 | login | ✅ |

---

### ✅ Link

**MASTER.md 狀態：** 已定義（Inline text link / Nav link / Action link + a11y 規範）

| 變體 | 樣式 | 出現頁面 |
|------|------|----------|
| Inline text link | `underline hover:text-primary` | login (使用條款) |
| Nav link | `text-slate-600 hover:text-ink hover:bg-slate-50` | dashboard, profile |
| Action link | `text-primary hover:underline` | dashboard (view all) |

---

### ✅ Toolbar

**MASTER.md 狀態：** 已定義（search input + filter select + clear button 組合）

| 元素 | 說明 | MASTER.md |
|------|------|-----------|
| Search input（含 leading icon） | `min-width: 220px`，搜尋框 | ✅ |
| Filter select（custom arrow） | `min-width: 140px`，`appearance: none` | ✅ |
| Clear button | border style，visibility hidden 隱藏而非 display:none | ✅ |

**出現頁面：** task-management/task-list.html、dataset/dataset-analysis-list.html、annotation/annotation-list.html

---

### ✅ Step Indicator

**MASTER.md 狀態：** 已定義（step circle + connector + label，含 active/done 狀態）

| 元素 | MASTER.md |
|------|-----------|
| Step circle (default / active / done) | ✅ |
| Connector (default / done) | ✅ |
| Step label | ✅ |

**出現頁面：** task-management/task-new.html

---

### ✅ Upload Zone

**MASTER.md 狀態：** 已定義（drag-and-drop 上傳區，含 default/hover/dragover/error 狀態 + file preview row）

| 元素 | MASTER.md |
|------|-----------|
| Upload zone (default / hover / error) | ✅ |
| File preview row（含 remove + preview button） | ✅ |

**出現頁面：** task-management/task-new.html

---

### ✅ Tag Input / Tag Pill

**MASTER.md 狀態：** 已定義（multi-value tag input 含 focus-within ring + pill 含 remove button）

**出現頁面：** task-management/task-new.html

---

### ✅ Toggle Switch

**MASTER.md 狀態：** 已定義（40×22px track + 16px thumb，primary 色 on 狀態）

**出現頁面：** task-management/task-new.html

---

### ✅ Code Editor (Schema)

**MASTER.md 狀態：** 已定義（`--font-mono`、dark ink bg、`resize: vertical`）

**出現頁面：** task-management/task-new.html

---

### ✅ Chip

**MASTER.md 狀態：** 已定義（Select chip checkbox/radio + 5 種 display chip 變體 + bypass toggle + a11y 規範）

| 變體 | 說明 | 出現頁面 | 頁面數 |
|------|------|----------|--------|
| Select chip (checkbox) | 表單多選，`role="checkbox"` + `aria-checked` | task-new | 1 |
| Select chip (radio) | 表單單選，`role="radio"` + `aria-checked` | task-new | 1 |
| Classification display | 唯讀標籤展示（紫色 pill） | task-detail, annotation-workspace | 2 |
| VA scoring | 數值展示含正常/離群語意色 | task-detail | 1 |
| Metric chip | 小型 KPI 值 | task-detail | 1 |
| Cause tag | 品質風險原因標籤 | dataset-analysis-detail | 1 |
| Bypass toggle | 輸出類型 bypass 選項（inline styles） | task-new | 1 |

---

### ✅ Accordion

**MASTER.md 狀態：** 已定義（output-accordion 結構、collapsed 狀態、auto-collapse 規則、a11y）

| 變體 | 說明 | 出現頁面 | 頁面數 |
|------|------|----------|--------|
| Schema accordion (output type panels) | 可展開/收合面板，標題含序號與輸出類型名稱 | task-new (Step 2) | 1 |

---

### ✅ Pagination

**MASTER.md 狀態：** 已定義（page-btn active/disabled、page-size-select、summary 格式、mobile 堆疊、UXC-11 整合）

| 變體 | 說明 | 出現頁面 | 頁面數 |
|------|------|----------|--------|
| Page number pagination | 頁碼按鈕列 + 每頁筆數選擇 + 總筆數提示 | task-list, annotation-list, dataset-analysis-list, user-management, task-detail panels (annotation-progress, annotation-results, member-management, work-log) | 5 |

---

### ✅ Color Dot

**MASTER.md 狀態：** 已定義（entity-color-dot 20px 圓角方塊 + preview 12px 變體 + status dot 8px 圓形 + 8 色預設色板）

| 變體 | 說明 | 出現頁面 | 頁面數 |
|------|------|----------|--------|
| Entity color indicator (20px) | entity-list 各項目前方的色點，顯示 entity 指定顏色 | task-new (Step 2), task-detail | 2 |
| Preview color (12px) | annotation preview 圖例色點 | task-new | 1 |
| Status dot (8px) | IAA 門檻通過/失敗圓形指示 | dataset-analysis-detail | 1 |

---

### ✅ Breadcrumb

**MASTER.md 狀態：** 已定義（nav.breadcrumb 結構、› 分隔符、link/current 色彩、a11y）

| 變體 | 說明 | 出現頁面 | 頁面數 |
|------|------|----------|--------|
| Path breadcrumb | 層級路徑導覽（如 任務列表 › 任務詳情） | task-detail, dataset-analysis-detail | 2 |

---

### ✅ Skeleton

**MASTER.md 狀態：** 已定義（Pulse 變體 + Shimmer 變體 + dark mode + a11y aria-busy + UXC-08 整合）

| 變體 | 說明 | 出現頁面 | 頁面數 |
|------|------|----------|--------|
| Pulse (card skeleton) | opacity 閃爍，card 佈局佔位 | task-detail | 1 |
| Shimmer (form skeleton) | 水平漸層掃過，表單佈局佔位 | profile | 1 |

---

### ✅ Language Toggle

**MASTER.md 狀態：** 已定義（MASTER.md §Buttons → Language Toggle Button，zh-TW / EN 切換）

- class：`lang-toggle`、`mobile-lang-toggle`（navbar 右側固定；mobile 版收在 drawer）
- 出現頁面：所有頁面（auth 頁面自帶 navbar；登入後頁面由 shared sidebar 提供）

---

### ✅ Mini Button

**MASTER.md 狀態：** 已定義（MASTER.md §Buttons 密集列操作 `.mini-btn`，含 reviewer active 狀態）

- class：`mini-btn`、`mini-btn-primary` / `-danger` / `-success` / `-warning` / `-icon` / `-log` / `-active-approve`
- 出現頁面：task-list、task-detail、annotation-list、annotation-workspace、user-management、role-settings

---

### ✅ Task Type / Run Mode Badge

**MASTER.md 狀態：** 已定義（MASTER.md §Status Badges → Task Type 與 Run Mode Badge Mapping）

- class：`badge-task-type-*`、`badge-official`、`badge-dry-run`（多由 JS 組字串產生，掃描閘門以前綴 `badge-task-type` / `badge-official` / `badge-dry-run` 登記）
- 出現頁面：task-list、task-detail、dataset-analysis-list

---

### ✅ Status Pill

**MASTER.md 狀態：** 已定義（MASTER.md §Status Pill，無框軟底，用於樣本層級狀態）

- class：`status-submitted`、`status-saved`、`status-pending-*`
- 出現頁面：annotation-list、annotation-workspace
- 與 Status Badge 的差異：Badge 有框、用於任務層級；Pill 無框、用於密集列

---

### ✅ Empty State

**MASTER.md 狀態：** 已定義（MASTER.md §Empty State：icon／標題／說明／可選動作；table-cell、panel、full-page 三種尺寸；issue #1188）

- **收斂狀態：** issue #1189 已把各頁自訂的空狀態 class（`ar-empty-*`、`worklog-empty-*`、`progress-empty-*`、`member-detail-empty` 等）全部改用共用的 `pages/shared/empty-state.css`，掃描閘門的 `transitionalClasses` 已清空；新增各頁自訂空狀態 class 會讓閘門變紅
- 與 State Panel 的差異：State Panel 是「表單送出後整區取代表單」，Empty State 是「清單／表格／面板沒有資料」
- 出現頁面：dashboard、task-list、task-detail、annotation-list、annotation-workspace、user-management、role-settings、dataset-analysis-list、dataset-analysis-detail、shared notification dropdown

---

### ✅ Workspace Tabs

**MASTER.md 狀態：** 已定義（MASTER.md §Workspace Tabs，shell 層級頁籤列；與 Desktop Content Tabs 為不同元件）

- class：`workspace-tab`、`workspace-tab-bar`、`workspace-tab-overview-*`
- 出現頁面：所有登入後頁面（`shared/sidebar.js` 的 `mountWorkspaceTabBar()` 注入）

---

### ⚠️ Notification Bell

**MASTER.md 狀態：** 部分定義（MASTER.md §Sidebar → Notification Bell + Badge + Dropdown 已有 badge、dropdown、未讀項數值；尚無獨立章節，鍵盤操作與空狀態行為未規格化）

- class：`notif-*`、`mobile-notification-bell-btn`
- 出現頁面：所有登入後頁面（`shared/sidebar.js` 共用 fragment）
- 缺口：開合鍵盤行為、focus 管理、`empty-state-compact` 於通知下拉內的版式

---

### ✅ Progress Bar

**MASTER.md 狀態：** 已定義（MASTER.md §Progress Bar，`role="progressbar"`、fill 固定 `var(--color-cta)`）

- class：`progress`、`progress-track`、`progress-fill`、`progress-inline-*`
- 出現頁面：dashboard、task-detail、annotation-list、annotation-workspace、dataset-analysis-list

---

### ✅ Metric KPI Tile

**MASTER.md 狀態：** 已定義（MASTER.md §Metric KPI Tile，dashboard 指標卡）

- class：`metric`
- 出現頁面：dashboard

---

### ✅ Review Status Track

**MASTER.md 狀態：** 已定義（MASTER.md §Review Status Track，雙車道狀態機軌道，與 Step Indicator 不同）

- class：`review-track*`
- 出現頁面：annotation-workspace

---

## MASTER.md 補充歷程

記錄各 component 加入 MASTER.md 的順序與原因，供追蹤設計系統擴充脈絡。

| 優先級 | Component | 加入原因 | 狀態 |
| --- | --- | --- | --- |
| P1 | **Toast** | profile 已使用，與 Alert Banner 需區分 | ✅ 已補充至 MASTER.md |
| P1 | **Button — Danger / Ghost / Loading 狀態** | 多頁面使用，規格不完整 | ✅ 已補充至 MASTER.md |
| P1 | **Input — Readonly 狀態** | profile 已使用 | ✅ 已補充至 MASTER.md |
| P2 | **Navbar** | 下個頁面必定使用 | ✅ 已補充至 MASTER.md |
| P2 | **Sidebar** | Annotation task 頁面必定使用 | ✅ 已補充至 MASTER.md |
| P2 | **Table** | Dashboard 核心元素 | ✅ 已補充至 MASTER.md |
| P3 | **Avatar** | Upload 行為需規範 | ✅ 已補充至 MASTER.md |
| P3 | **Tooltip** | 無障礙規範需特別注意 | ✅ 已補充至 MASTER.md |
| P3 | **Mobile Bottom Tab Bar** | RWD 規範 | ✅ 已補充至 MASTER.md |
| P3 | **Desktop Content Tabs** | admin 與 task-detail 需統一 tab pattern | ✅ 已補充至 MASTER.md |
| P4 | **Divider** | 簡單，低優先 | ✅ 已補充至 MASTER.md |
| P4 | **List** | 簡單，低優先 | ✅ 已補充至 MASTER.md |
| P4 | **Button — OAuth / Icon-only / Language Toggle** | 登入與導覽區已使用 | ✅ 已補充至 MASTER.md |
| P4 | **Input — Leading Icon / Eye Toggle / Field Hint/Error** | account flow 已使用 | ✅ 已補充至 MASTER.md |
| P4 | **State Panel** | forgot/reset 成功與失敗狀態展示 | ✅ 已補充至 MASTER.md |
| P4 | **Link** | 多頁面已使用，需要一致語意與樣式規範 | ✅ 已補充至 MASTER.md |
| P2 | **Token gap sync** | tokens.css 領先 MASTER.md：motion tokens、semantic aliases、extended colors、font stacks | ✅ 已補充至 MASTER.md (2026-05-20) |
| P2 | **Badge — Task Status / Task Type** | task-list.html 新增 draft/iaa/task-type-* 等 8 種新 badge | ✅ 已補充至 MASTER.md (2026-05-20) |
| P2 | **Toolbar** | task-list、dataset-list 使用，為新 list page pattern | ✅ 已補充至 MASTER.md (2026-05-20) |
| P2 | **Step Indicator** | task-new.html wizard 使用 | ✅ 已補充至 MASTER.md (2026-05-20) |
| P2 | **Upload Zone** | task-new.html dataset 上傳 | ✅ 已補充至 MASTER.md (2026-05-20) |
| P3 | **Tag Input / Tag Pill** | task-new.html label 設定 | ✅ 已補充至 MASTER.md (2026-05-20) |
| P3 | **Toggle Switch** | task-new.html schema 設定 | ✅ 已補充至 MASTER.md (2026-05-20) |
| P3 | **Code Editor (Schema)** | task-new.html JSON schema 編輯 | ✅ 已補充至 MASTER.md (2026-05-20) |
| P2 | **Chip** | 12 個頁面使用（篩選、表單選擇、展示），為最常見未定義元件 | ✅ 已補充至 MASTER.md (2026-07-10) |
| P2 | **Pagination** | 5 個頁面使用（含 task-detail 子面板），為 list page 基本元件 | ✅ 已補充至 MASTER.md (2026-07-10) |
| P3 | **Accordion** | task-new Step 2 output type 手風琴面板 | ✅ 已補充至 MASTER.md (2026-07-10) |
| P3 | **Breadcrumb** | task-detail、dataset-analysis-detail 層級導覽 | ✅ 已補充至 MASTER.md (2026-07-10) |
| P3 | **Skeleton** | task-detail、profile 載入佔位 | ✅ 已補充至 MASTER.md (2026-07-10) |
| P4 | **Color Dot** | task-new、task-detail entity 色點指示 | ✅ 已補充至 MASTER.md (2026-07-10) |
