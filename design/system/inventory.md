# Component Inventory

> **用途：** 記錄所有 prototype 頁面中出現的 UI elements，對照 MASTER.md 的定義狀態，作為 design system 擴充的依據。
>
> **更新規則：** 每次新增 prototype 頁面時，同步更新本文件。新 component 進 prototype 前，必須先在 MASTER.md 定義 token。
>
> **掃描範圍：** `design/prototype/` 所有頁面
> **最後掃描：** 2026-04-16
> **掃描頁面：** account/login.html、account/register.html、account/forgot-password.html、account/reset-password.html、dashboard/dashboard.html
> **Design Token 來源：** `design/wireframes/design-system.pen`（最後修改：2026-04-15 15:13 +0800）

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

### Reusable Components（Pencil 實測，45 個）

- **Buttons（13）**：Primary / Secondary / Ghost / Danger / OAuth / Icon Only / CTA(Default, Hover, Loading, Disabled) / Language Toggle(Default, ZH, EN)
- **Inputs（6）**：Default / Focus / Inline(Default, Focus, Error) / Readonly
- **Feedback（5）**：Toast(Success, Error) / Alert Banner(Error) / State Panel(Success, Token Error)
- **Status + Link（8）**：Badge(Not Started, In Progress, Submitted, Error) / Link(Inline, Action, Nav Active, Nav Inactive)
- **Layout + Data（8）**：Navbar / Sidebar / Table / List / Divider(Horizontal, Text) / Tooltip / Mobile Tab Bar
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

**MASTER.md 狀態：** 已定義（規格、nav item states、divider 用法）

| 元素 | 說明 | MASTER.md |
|------|------|-----------|
| Section nav items | active / inactive 狀態 | ✅ |
| Divider | 分組用 | ✅ |
| 僅 Desktop 顯示 | `hidden md:flex` | ✅ |

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
| P4 | **Divider** | 簡單，低優先 | ✅ 已補充至 MASTER.md |
| P4 | **List** | 簡單，低優先 | ✅ 已補充至 MASTER.md |
| P4 | **Button — OAuth / Icon-only / Language Toggle** | 登入與導覽區已使用 | ✅ 已補充至 MASTER.md |
| P4 | **Input — Leading Icon / Eye Toggle / Field Hint/Error** | account flow 已使用 | ✅ 已補充至 MASTER.md |
| P4 | **State Panel** | forgot/reset 成功與失敗狀態展示 | ✅ 已補充至 MASTER.md |
| P4 | **Link** | 多頁面已使用，需要一致語意與樣式規範 | ✅ 已補充至 MASTER.md |
