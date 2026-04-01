# Component Inventory

> **用途：** 記錄所有 prototype 頁面中出現的 UI elements，對照 MASTER.md 的定義狀態，作為 design system 擴充的依據。
>
> **更新規則：** 每次新增 prototype 頁面時，同步更新本文件。新 component 進 prototype 前，必須先在 MASTER.md 定義 token。
>
> **掃描範圍：** `design/prototype/` 所有頁面
> **最後掃描：** 2026-03-31
> **掃描頁面：** index.html、login.html、dashboard.html、profile.html

---

## 狀態說明

| 狀態 | 意義 |
|------|------|
| ✅ 已定義 | MASTER.md 已有完整規格 |
| ⚠️ 部分定義 | MASTER.md 有提及但規格不完整 |
| ❌ 未定義 | prototype 已使用，但 MASTER.md 尚未定義 |
| 🔒 封存 | 已不再使用 |

---

## Component 清單

### ✅ Button

**MASTER.md 狀態：** 已定義（Primary + Secondary + Danger + Ghost + Loading + Disabled）

| 變體 | 樣式 | 出現頁面 | MASTER.md |
|------|------|----------|-----------|
| Primary (CTA) | `bg-cta` hover:opacity-90 translateY(-1px) | login, dashboard, profile | ✅ |
| Secondary | `border-primary text-primary` transparent bg | dashboard | ✅ |
| Danger | `text-red-600 hover:bg-red-50 hover:border-red-200` | dashboard (logout) | ✅ |
| Ghost / Text | `text-primary` underline on hover | dashboard (view all) | ✅ |
| OAuth (Google/GitHub) | `border-slate-200 bg-white` + 品牌 icon | login | ❌ 未定義 |
| Icon-only | `w-9 h-9` no label, icon only | dashboard (mobile menu) | ❌ 未定義 |
| Language Toggle | `border-slate-200 rounded-full` | login, dashboard, profile | ❌ 未定義 |

**缺少規格：** OAuth 變體、Icon-only 變體、Language Toggle 變體

---

### ✅ Input

**MASTER.md 狀態：** 已定義（Normal + Focus + Error）

| 變體 | 樣式 | 出現頁面 | MASTER.md |
|------|------|----------|-----------|
| Normal | `border-slate-200 rounded-lg` focus:ring-primary | profile | ✅ |
| Error | `border-red-400` focus:ring-red-400 | profile | ✅ |
| Readonly / Disabled | `bg-slate-50 border-slate-100 cursor-not-allowed` | profile (email) | ✅ |

**缺少規格：** 字元計數提示（character counter）、必填標記（required indicator）

---

### ✅ Card

**MASTER.md 狀態：** 已定義（Interactive + Non-interactive）

| 變體 | 樣式 | 出現頁面 | MASTER.md |
|------|------|----------|-----------|
| Interactive | `border-slate-200 rounded-xl` hover:border-primary translateY(-2px) | dashboard (stat card) | ✅ |
| Non-interactive | `border-slate-200 rounded-xl` 無 hover | dashboard, profile | ✅ |
| Login card | `border-slate-200 rounded-2xl p-8` | login | ⚠️ 尺寸未標準化 |
| Stat card | header + 大數字 + 副文字 + icon 的特定結構 | dashboard | ❌ 未定義結構 |

---

### ✅ Status Badge

**MASTER.md 狀態：** 已定義（In Progress / Not Started / Submitted / Error）

| 變體 | 出現頁面 | MASTER.md |
|------|----------|-----------|
| In Progress (warning) | dashboard | ✅ |
| Not Started (info) | dashboard | ✅ |
| Submitted (success) | dashboard | ✅ |
| Role badge (indigo, rounded-full + icon) | profile | ❌ 未定義 |

---

### ✅ Modal

**MASTER.md 狀態：** 已定義

| 變體 | 出現頁面 | MASTER.md |
|------|----------|-----------|
| Confirmation dialog (cancel + confirm) | dashboard (logout) | ✅ |

**缺少規格：** Escape 鍵關閉行為、click outside 關閉行為、focus trap

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
| Language toggle | 右側固定 | ❌ 未定義（Icon-only button 變體） |
| Logout button | Danger 樣式 | ✅ |
| Mobile hamburger | Icon-only button，展開 mobile drawer | ❌ 未定義（Icon-only button 變體） |

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

### ⚠️ Link

**MASTER.md 狀態：** 未定義（Anti-patterns 有提及 `href="#"` 規範，但無 component 規格）

| 變體 | 樣式 | 出現頁面 |
|------|------|----------|
| Inline text link | `underline hover:text-primary` | login (使用條款) |
| Nav link | `text-slate-600 hover:text-ink hover:bg-slate-50` | dashboard, profile |
| Action link | `text-primary hover:underline` | dashboard (view all) |

---

## 優先補充至 MASTER.md 的項目

依使用頻率與即將開發的頁面排序：

| 優先級 | Component | 理由 | 狀態 |
|--------|-----------|------|------|
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
