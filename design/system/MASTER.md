# Design System Master File

> **LOGIC:** When building a specific page, first check `design/system/pages/[page-name].md`.
> If that file exists, its rules **override** this Master file.
> If not, strictly follow the rules below.

> **WIREFRAME REFERENCE:** The visual component library lives in `design/wireframes/design-system.pen`.
> It is encrypted — read it via Pencil MCP tools only (`mcp__pencil__open_document` → `mcp__pencil__batch_get`).
> When implementing components, extract exact token values (fills, cornerRadius, padding, fonts) from that file.
> The token names defined there (e.g. `$color-surface`, `$color-ink`) are the canonical names to use in code.

---

**Project:** Label Suite
**Updated:** 2026-03-30
**Category:** Micro SaaS (Tool-based Web App)

---

## Global Rules

### Color Palette

| Role | Hex | CSS Variable | Tailwind Token |
|------|-----|--------------|----------------|
| Primary | `#6366F1` | `--color-primary` | `primary` |
| Secondary | `#818CF8` | `--color-secondary` | `secondary` |
| CTA/Accent | `#10B981` | `--color-cta` | `cta` |
| Surface (Background) | `#F5F3FF` | `--color-surface` | `surface` |
| Ink (Text) | `#1E1B4B` | `--color-ink` | `ink` |

**Color Notes:** Indigo primary + emerald CTA. Use `surface` / `ink` (not `background` / `text`) as the canonical semantic token names in both CSS variables and Tailwind config.

**Tailwind Config Example:**
```js
colors: {
  primary:   '#6366F1',
  secondary: '#818CF8',
  cta:       '#10B981',
  surface:   '#F5F3FF',
  ink:       '#1E1B4B',
}
```

### Semantic State Colors

Used for status badges, error banners, alerts, and feedback messages.

| Role | Text | Background | Border | Tailwind Classes |
|------|------|------------|--------|-----------------|
| Error | `#B91C1C` (red-700) | `#FEF2F2` (red-50) | `#FECACA` (red-200) | `text-red-700 bg-red-50 border-red-200` |
| Success | `#15803D` (green-700) | `#F0FDF4` (green-50) | `#BBF7D0` (green-200) | `text-green-700 bg-green-50 border-green-200` |
| Warning | `#A16207` (yellow-700) | `#FEFCE8` (yellow-50) | `#FEF08A` (yellow-200) | `text-yellow-700 bg-yellow-50 border-yellow-200` |
| Info | `#1D4ED8` (blue-700) | `#EFF6FF` (blue-50) | `#BFDBFE` (blue-200) | `text-blue-700 bg-blue-50 border-blue-200` |

**Task Status Badge Mapping:**

| Status | Color Role | Example |
|--------|-----------|---------|
| In Progress | Warning | `bg-yellow-50 text-yellow-700 border-yellow-200` |
| Not Started | Info | `bg-blue-50 text-blue-700 border-blue-200` |
| Submitted / Completed | Success | `bg-green-50 text-green-700 border-green-200` |
| Error / Rejected | Error | `bg-red-50 text-red-700 border-red-200` |

### Typography

- **Heading Font:** Crimson Pro
- **Body Font:** Atkinson Hyperlegible
- **Mood:** academic, research, scholarly, accessible, readable, educational
- **Google Fonts:** [Crimson Pro + Atkinson Hyperlegible](https://fonts.google.com/share?selection.family=Atkinson+Hyperlegible:wght@400;700|Crimson+Pro:wght@400;500;600;700)

**CSS Import:**
```css
@import url('https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;700&family=Crimson+Pro:wght@400;500;600;700&display=swap');
```

**Chinese Fallback:**
```css
/* Headings */
font-family: 'Crimson Pro', 'Noto Serif TC', 'Source Han Serif TC', serif;

/* Body */
font-family: 'Atkinson Hyperlegible', 'Noto Sans TC', 'PingFang TC', sans-serif;
```

### Typography Scale

| Level | Font | Size | Weight | Line-Height | Usage |
|-------|------|------|--------|-------------|-------|
| Display | Crimson Pro | 48px / `text-5xl` | 700 | 1.2 | Hero titles |
| H1 | Crimson Pro | 36px / `text-4xl` | 700 | 1.3 | Page titles |
| H2 | Crimson Pro | 24px / `text-2xl` | 600 | 1.4 | Section headings |
| H3 | Atkinson | 18px / `text-xl` | 600 | 1.5 | Card titles, subsections |
| Body | Atkinson | 16px / `text-base` | 400 | 1.6 (EN) / 1.8 (ZH) | Default body text |
| Caption | Atkinson | 14px / `text-sm` | 400 | 1.5 | Supporting text, metadata |
| Label | Atkinson | 12px / `text-xs` | 500 | 1.4 | Tags, badges, form labels |

### Bilingual Typography

Label Suite supports zh-TW / EN. Apply these rules when building bilingual pages:

- **Line Height:** Chinese body text requires `line-height: 1.8` (vs 1.6 for English) for readability
- **`lang` attribute:** Always set `lang="zh-TW"` or `lang="en"` on the `<html>` element to let browsers apply correct text rendering
- **Mixed CJK/Latin:** When Chinese and English appear inline, the browser handles spacing automatically — do not add manual letter-spacing to Chinese text
- **Heading fallback:** Crimson Pro does not include CJK glyphs; always declare `'Noto Serif TC'` as the next fallback so Chinese headings render in a matching serif weight
- **Font size parity:** At the same `px` size, Chinese characters appear visually larger than Latin; consider using `text-sm` for Chinese where `text-base` is used for English labels

### Spacing Variables

| Token | Value | Usage |
|-------|-------|-------|
| `--space-xs` | `4px` / `0.25rem` | Tight gaps |
| `--space-sm` | `8px` / `0.5rem` | Icon gaps, inline spacing |
| `--space-md` | `16px` / `1rem` | Standard padding |
| `--space-lg` | `24px` / `1.5rem` | Section padding |
| `--space-xl` | `32px` / `2rem` | Large gaps |
| `--space-2xl` | `48px` / `3rem` | Section margins |
| `--space-3xl` | `64px` / `4rem` | Page-level padding |

### Border Radius Scale

| Token | Value | Tailwind | Usage |
|-------|-------|----------|-------|
| `--radius-sm` | `4px` | `rounded` | Badges, tags, small chips |
| `--radius-md` | `8px` | `rounded-lg` | Buttons, inputs, small cards |
| `--radius-lg` | `12px` | `rounded-xl` | Cards, panels |
| `--radius-xl` | `16px` | `rounded-2xl` | Modals, drawers |
| `--radius-full` | `9999px` | `rounded-full` | Avatars, pill badges |

### Z-index Scale

| Level | Value | Usage |
|-------|-------|-------|
| Base | `0` | Default stacking |
| Raised | `10` | Inline popovers, small overlays |
| Dropdown | `100` | Select menus, command palette |
| Sticky | `200` | Sticky header, sticky sidebar |
| Modal | `300` | Modal dialogs, drawer panels |
| Toast | `400` | Toast notifications (above modal) |
| Tooltip | `500` | Tooltips (highest interactive layer) |

### Shadow Depths

| Level | Value | Usage |
|-------|-------|-------|
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,0.05)` | Subtle lift |
| `--shadow-md` | `0 4px 6px rgba(0,0,0,0.1)` | Cards, buttons |
| `--shadow-lg` | `0 10px 15px rgba(0,0,0,0.1)` | Modals, dropdowns |
| `--shadow-xl` | `0 20px 25px rgba(0,0,0,0.15)` | Hero images, featured cards |

---

## Component Specs

### Buttons

```css
/* Primary Button */
.btn-primary {
  background: var(--color-cta);
  color: white;
  padding: 12px 24px;
  border-radius: var(--radius-md);
  font-weight: 600;
  transition: all 200ms ease;
  cursor: pointer;
}

.btn-primary:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}

/* Secondary Button */
.btn-secondary {
  background: transparent;
  color: var(--color-primary);
  border: 2px solid var(--color-primary);
  padding: 12px 24px;
  border-radius: var(--radius-md);
  font-weight: 600;
  transition: all 200ms ease;
  cursor: pointer;
}

/* Danger Button — destructive actions (logout, delete) */
.btn-danger {
  background: transparent;
  color: #B91C1C;           /* red-700 */
  border: 1px solid #E2E8F0;
  padding: 8px 12px;
  border-radius: var(--radius-md);
  font-weight: 500;
  transition: all 200ms ease;
  cursor: pointer;
}

.btn-danger:hover {
  color: #B91C1C;
  background: #FEF2F2;      /* red-50 */
  border-color: #FECACA;    /* red-200 */
}

/* Ghost / Text Button — low-emphasis actions (view all, cancel) */
.btn-ghost {
  background: transparent;
  color: var(--color-primary);
  border: none;
  padding: 8px 12px;
  border-radius: var(--radius-md);
  font-weight: 500;
  transition: all 200ms ease;
  cursor: pointer;
}

.btn-ghost:hover {
  text-decoration: underline;
}

/* Loading state — applies to any button variant */
.btn-loading {
  opacity: 0.7;
  cursor: not-allowed;
  pointer-events: none;
}

/* Disabled state — applies to any button variant */
.btn-disabled,
button[disabled] {
  opacity: 0.4;
  cursor: not-allowed;
  pointer-events: none;
}
```

**Button Variants Summary:**

| Variant | Use case | When NOT to use |
|---------|----------|-----------------|
| Primary (`btn-primary`) | 每頁最重要的單一 CTA | 同頁面出現兩個以上 |
| Secondary (`btn-secondary`) | 次要操作、與 Primary 並列 | 獨立使用時（改用 Ghost） |
| Danger (`btn-danger`) | 破壞性操作（登出、刪除） | 一般取消操作（用 Secondary） |
| Ghost (`btn-ghost`) | 低優先操作（查看全部、跳過） | 需要明顯視覺重量時 |

**Button States:**

| State | Tailwind classes |
|-------|-----------------|
| Default | — |
| Hover | `hover:opacity-90` (primary) / `hover:underline` (ghost) |
| Focus | `focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2` |
| Loading | `opacity-70 cursor-not-allowed` + spinner icon |
| Disabled | `opacity-40 cursor-not-allowed pointer-events-none` |

### Cards

```css
/* Interactive card (clickable) */
.card {
  background: white;
  border: 1px solid #E2E8F0;
  border-radius: var(--radius-lg);
  padding: 24px;
  transition: border-color 200ms ease, transform 200ms ease;
  cursor: pointer;
}

.card:hover {
  border-color: var(--color-primary);
  transform: translateY(-2px);
}

/* Non-interactive card: omit cursor:pointer and hover transform */
```

### Inputs

```css
.input {
  padding: 12px 16px;
  border: 1px solid #E2E8F0;
  border-radius: var(--radius-md);
  font-size: 16px;
  transition: border-color 200ms ease;
}

.input:focus {
  border-color: var(--color-primary);
  outline: none;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.12);
}

.input.error {
  border-color: #B91C1C;
}

/* Readonly — managed by system, not user-editable (e.g. SSO email) */
.input[readonly],
.input.readonly {
  background: #F8FAFC;      /* slate-50 */
  border-color: #F1F5F9;    /* slate-100 */
  color: #94A3B8;            /* slate-400 */
  cursor: not-allowed;
}
```

**Input States:**

| State | Visual cue | When to use |
|-------|-----------|-------------|
| Default | `border-slate-200` | 可編輯欄位 |
| Focus | `border-primary` + ring | 使用者聚焦時 |
| Error | `border-red-400` + ring-red | 驗證失敗 |
| Readonly | `bg-slate-50 border-slate-100 text-slate-400 cursor-not-allowed` | 系統管理欄位（如 SSO email） |
| Disabled | `opacity-40 cursor-not-allowed` | 條件未達成不可使用 |

**Readonly vs Disabled 區分：**
- **Readonly** — 資料存在且有意義，只是不能修改（e.g. email 由 SSO 管理）；仍可被表單提交
- **Disabled** — 功能目前不可用；不會被表單提交

### Modals

```css
.modal-overlay {
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  z-index: 300;
}

.modal {
  background: white;
  border-radius: var(--radius-xl);
  padding: 32px;
  box-shadow: var(--shadow-xl);
  max-width: 500px;
  width: 90%;
}
```

### Status Badges

```html
<!-- In Progress -->
<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-50 text-yellow-700 border border-yellow-200">
  In Progress
</span>

<!-- Not Started -->
<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
  Not Started
</span>

<!-- Submitted / Completed -->
<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-50 text-green-700 border border-green-200">
  Submitted
</span>
```

### Error / Alert Banner

```html
<!-- Error Banner (e.g. login failure) -->
<div class="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3" role="alert">
  <!-- SVG icon -->
  <span>Error message here</span>
</div>
```

**Alert Banner vs Toast 區分：**

| | Alert Banner | Toast |
|---|---|---|
| **位置** | 嵌入頁面流（inline） | 浮動固定（fixed，右下角） |
| **消失方式** | 手動關閉 或 永久顯示 | 4 秒後自動消失，可手動關閉 |
| **使用時機** | 頁面級錯誤（登入失敗） | 操作結果回饋（儲存成功） |
| **aria** | `role="alert"` | `aria-live="polite"` |

### Toast

用於操作後的即時回饋（儲存成功、更新失敗等），浮動顯示於右下角，4 秒後自動消失。

```html
<!-- Toast container — fixed position, right bottom -->
<div
  id="toast"
  class="hidden fixed bottom-6 right-6 z-[400] max-w-sm w-full"
  aria-live="polite"
  aria-atomic="true"
>
  <!-- Success Toast -->
  <div class="flex items-start gap-3 bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg px-4 py-3 shadow-md">
    <!-- SVG check icon -->
    <div class="flex-1">
      <p class="font-medium">儲存成功</p>
      <p class="text-xs mt-0.5 opacity-80">訊息說明（可選）</p>
    </div>
    <!-- Close button -->
    <button class="text-green-500 hover:text-green-700 cursor-pointer" aria-label="關閉通知">
      <!-- SVG x icon -->
    </button>
  </div>

  <!-- Error Toast -->
  <div class="flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 shadow-md">
    <!-- SVG x-circle icon -->
    <div class="flex-1">
      <p class="font-medium">儲存失敗</p>
      <p class="text-xs mt-0.5 opacity-80">訊息說明（可選）</p>
    </div>
    <button class="text-red-500 hover:text-red-700 cursor-pointer" aria-label="關閉通知">
      <!-- SVG x icon -->
    </button>
  </div>
</div>
```

**Toast 規格：**

| 屬性 | 值 |
|------|---|
| 位置 | `fixed bottom-6 right-6` |
| z-index | `400`（Toast 層，高於 Modal） |
| 最大寬度 | `max-w-sm`（384px） |
| 自動消失 | 4000ms |
| 動畫 | fade-in 150ms / fade-out 150ms（`transition-opacity`） |
| 陰影 | `shadow-md`（浮動感，Toast 是允許陰影的例外情境） |

**Toast Variants:**

| Variant | Color role | 使用時機 |
|---------|-----------|---------|
| Success | `bg-green-50 border-green-200 text-green-700` | 操作成功（儲存、更新） |
| Error | `bg-red-50 border-red-200 text-red-700` | 操作失敗（網路錯誤、伺服器錯誤） |

**When NOT to use Toast:**
- ❌ 頁面級錯誤（登入失敗）→ 改用 Alert Banner
- ❌ 需要使用者確認的操作 → 改用 Modal
- ❌ 重要警告不應自動消失 → 改用 Alert Banner

### Navbar

頂部固定導覽列，用於 Pattern A（Dashboard）與 Pattern C（Profile）頁面。

**規格：**

| 屬性 | 值 |
|------|---|
| 高度 | `h-16`（64px） |
| 背景 | `bg-white` |
| 底部邊線 | `border-b border-slate-200` |
| 定位 | `sticky top-0 z-[200]` |
| 內容寬度 | `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8` |

**結構（左 → 右）：**

```
[ Logo ] ─────── [ Nav links (desktop only) ] ─────── [ User menu ]
                                                         ├ Avatar + name → profile
                                                         ├ Language toggle
                                                         ├ Logout button (danger)
                                                         └ Mobile hamburger (mobile only)
```

**Nav link states:**

| State | Classes |
|-------|---------|
| Active | `text-primary font-medium bg-surface rounded-lg` + `aria-current="page"` |
| Inactive | `text-slate-600 hover:text-ink hover:bg-slate-50 rounded-lg` |
| Disabled | `aria-disabled="true"` + same as inactive（無 pointer-events-none，保留 tab stop） |

**Mobile drawer（`md:hidden`）：**
- 展開後位於 navbar 下方，`border-t border-slate-200`
- 項目與 desktop nav link 相同，改為 `block` layout
- 包含 Profile 連結（desktop 的 avatar 在 mobile 隱藏）

**Accessibility：**
- `<header role="banner">`
- `<nav aria-label="Main navigation">`
- Mobile hamburger：`aria-expanded` 隨開關切換
- Logo link：`aria-label` 提供頁面名稱

---

### Sidebar

左側固定導覽，用於 Pattern C（Profile 等多 section 頁面）。Desktop only（`hidden md:flex`）。

**規格：**

| 屬性 | 值 |
|------|---|
| 寬度 | `w-56`（224px） |
| 背景 | `bg-white` |
| 右側邊線 | `border-r border-slate-200` |
| z-index | `z-[200]`（Sticky 層） |
| 內距 | `py-4 px-3`（垂直 padding 在外層，水平在 nav） |
| 項目間距 | `gap-1` |

**Nav item states:**

| State | Classes |
|-------|---------|
| Active | `text-primary font-medium bg-surface rounded-lg` + `aria-current="page"` |
| Inactive | `text-slate-500 hover:bg-surface hover:text-ink rounded-lg` |

**Nav item 結構：**
```html
<a class="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm
          focus:outline-none focus:ring-2 focus:ring-primary">
  <!-- SVG icon, w-4 h-4, aria-hidden="true" -->
  <span>項目名稱</span>
</a>
```

**Divider（分組用）：**
```html
<div class="h-px bg-slate-100 my-1 mx-3" aria-hidden="true"></div>
```

**When NOT to use：**
- ❌ 只有單一 section 的頁面（改用 Pattern A）
- ❌ Mobile 版本（改用 Bottom Tab Bar 或 Mobile drawer）

---

### Table

用於列表型資料展示（如任務列表），支援 hover 行互動與 responsive 水平捲動。

**規格：**

| 元素 | Classes |
|------|---------|
| 容器 | `bg-white border border-slate-200 rounded-xl overflow-hidden` |
| 捲動包層 | `overflow-x-auto` |
| `<table>` | `w-full text-sm` |
| Header row | `text-left text-xs text-slate-400 uppercase tracking-wide bg-slate-50` |
| Header cell | `px-6 py-3 font-medium` + `scope="col"` |
| Body rows | `divide-y divide-slate-100` |
| Body row（可點擊）| `hover:bg-slate-50 cursor-pointer transition-colors duration-150` |
| Primary cell | `px-6 py-4 font-medium text-ink` |
| Secondary cell | `px-6 py-4 text-slate-500` |

**HTML 結構：**

```html
<div class="bg-white border border-slate-200 rounded-xl overflow-hidden">
  <div class="overflow-x-auto">
    <table class="w-full text-sm" role="table" aria-label="表格說明">
      <thead>
        <tr class="text-left text-xs text-slate-400 uppercase tracking-wide bg-slate-50">
          <th class="px-6 py-3 font-medium" scope="col">欄位名稱</th>
          <!-- more th -->
        </tr>
      </thead>
      <tbody class="divide-y divide-slate-100">
        <tr class="hover:bg-slate-50 cursor-pointer transition-colors duration-150">
          <td class="px-6 py-4 font-medium text-ink">主要資料</td>
          <td class="px-6 py-4 text-slate-500">次要資料</td>
        </tr>
      </tbody>
    </table>
  </div>
</div>
```

**Accessibility：**
- `<table role="table" aria-label="...">` 提供表格描述
- `<th scope="col">` 標示欄位
- 可點擊的列：加上 `tabindex="0"` 與 `onkeydown` 支援 Enter/Space

**When NOT to use：**
- ❌ 資料少於 3 筆 → 改用 List
- ❌ 需要大量欄位比較 → 考慮折疊或分頁設計

---

### Avatar

用於顯示使用者身份識別圖像，分為 display-only（navbar）與 uploadable（profile）兩種用途。

**尺寸規格：**

| Size | 尺寸 | 使用場景 |
|------|------|---------|
| Small | `w-8 h-8`（32px） | Navbar user menu |
| Large | `w-16 h-16` mobile / `w-20 h-20` desktop（64/80px） | Profile 頁頭像上傳區 |

**Display-only（Navbar）：**

```html
<img
  src="avatar-url"
  alt="User avatar"
  class="w-8 h-8 rounded-full border-2 border-primary/20"
/>
```

**Uploadable（Profile）：**

```html
<div class="relative avatar-wrap cursor-pointer shrink-0"
     role="button" tabindex="0"
     aria-label="上傳頭像"
     aria-describedby="avatar-error"
     onclick="document.getElementById('avatar-input').click()"
     onkeydown="if(event.key==='Enter'||event.key===' ')this.click()">

  <!-- Avatar display -->
  <div id="avatar-preview"
       class="w-16 h-16 md:w-20 md:h-20 rounded-full bg-primary
              flex items-center justify-center text-white
              text-xl md:text-2xl font-bold overflow-hidden select-none">
    <!-- initials fallback or <img> after upload -->
  </div>

  <!-- Hover overlay -->
  <div class="avatar-overlay absolute inset-0 rounded-full bg-black/50
              flex items-center justify-center opacity-0
              transition-opacity duration-200">
    <!-- SVG upload icon, w-5 h-5 text-white -->
  </div>

  <input id="avatar-input" type="file"
         accept="image/jpeg,image/png,image/webp"
         class="hidden" aria-hidden="true" />
</div>

<!-- Error message -->
<p id="avatar-error" class="hidden text-xs text-red-500 mt-1" role="alert"></p>
<!-- Hint text -->
<p class="text-xs text-slate-500">JPG、PNG 或 WebP，最大 5 MB</p>
```

**CSS（hover overlay）：**
```css
.avatar-wrap:hover .avatar-overlay { opacity: 1; }
```

**Upload 驗證規則：**
- 允許格式：`image/jpeg`、`image/png`、`image/webp`
- 最大檔案大小：5 MB
- 圖片預覽：使用 `URL.createObjectURL()`，載入後執行 `URL.revokeObjectURL()` 釋放記憶體（禁止使用 `innerHTML` 設定 `src` 以防 XSS）

**Avatar states（uploadable）：**

| State | 表現 |
|-------|------|
| Default | 顯示 initials 或已上傳圖片 |
| Hover | `.avatar-overlay` opacity 0 → 1（半透明深色 + 上傳圖示） |
| Focus | `focus:ring-2 focus:ring-primary`（鍵盤導覽） |
| Error | 顯示 `#avatar-error`，`role="alert"` |

---

### Tooltip

用於提供補充說明，當元素因空間限制無法展示完整說明時使用（如 readonly 欄位的原因說明）。

**規格：**

| 屬性 | 值 |
|------|---|
| 觸發方式 | `hover` + `focus-within`（支援鍵盤） |
| 出現位置 | 觸發元素上方，`bottom: calc(100% + 6px)`，水平置中 |
| 背景 | `#1E1B4B`（`var(--color-ink)`） |
| 文字 | `#fff`，`font-size: 11px` |
| 內距 | `padding: 4px 8px` |
| 圓角 | `border-radius: 6px`（`var(--radius-sm)` 4px 稍大） |
| 動畫 | `opacity` 0 → 1，`150ms ease` |
| z-index | `500`（Tooltip 層，最高） |
| 箭頭 | `::after` 偽元素，`border-top-color: var(--color-ink)` |

**CSS：**
```css
.tooltip-wrap { position: relative; display: inline-flex; }

.tooltip-wrap .tooltip {
  visibility: hidden; opacity: 0;
  position: absolute;
  bottom: calc(100% + 6px); left: 50%; transform: translateX(-50%);
  background: var(--color-ink); color: #fff;
  font-size: 11px; white-space: nowrap;
  padding: 4px 8px; border-radius: 6px;
  transition: opacity 150ms ease;
  pointer-events: none; z-index: 500;
}

.tooltip-wrap .tooltip::after {
  content: '';
  position: absolute; top: 100%; left: 50%; transform: translateX(-50%);
  border: 4px solid transparent;
  border-top-color: var(--color-ink);
}

.tooltip-wrap:hover .tooltip,
.tooltip-wrap:focus-within .tooltip { visibility: visible; opacity: 1; }
```

**HTML：**
```html
<div class="tooltip-wrap" tabindex="0" aria-describedby="tooltip-text-id">
  <!-- Trigger element (e.g. info icon) -->
  <svg class="w-3.5 h-3.5 text-slate-400 cursor-default" aria-hidden="true">
    <!-- info-circle icon -->
  </svg>
  <span id="tooltip-text-id" class="tooltip">說明文字</span>
</div>
```

**Accessibility：**
- 觸發元素加 `tabindex="0"` 讓鍵盤可聚焦
- `aria-describedby` 指向 tooltip 文字的 id
- Tooltip 本身加 `pointer-events: none` 避免干擾互動
- 禁止使用原生 `title` 屬性（無法 focus 觸發，鍵盤使用者看不到）

**When NOT to use：**
- ❌ 說明文字超過 1 行 → 改用 Popover 或展開說明
- ❌ 說明文字包含連結或互動元素 → 改用 Popover
- ❌ 關鍵資訊不應只放在 Tooltip（hover 才看到） → 直接顯示在頁面

---

### Mobile Bottom Tab Bar

Mobile 專用底部導覽列（`md:hidden`），取代 Sidebar 在小螢幕上的導覽功能。

**規格：**

| 屬性 | 值 |
|------|---|
| 高度 | `h-14`（56px） |
| 位置 | `fixed bottom-0 left-0 right-0` |
| z-index | `z-[200]`（Sticky 層） |
| 背景 | `bg-white` |
| 頂部邊線 | `border-t border-slate-200` |
| 顯示條件 | `md:hidden`（640px 以下） |

**Tab item states：**

| State | Classes |
|-------|---------|
| Active | `text-primary font-medium` + `aria-current="page"` |
| Inactive | `text-slate-500 hover:text-primary` |
| Focus | `focus:ring-2 focus:ring-inset focus:ring-primary` |

**HTML 結構：**
```html
<nav class="md:hidden fixed bottom-0 left-0 right-0 h-14
            bg-white border-t border-slate-200
            flex items-stretch z-[200]"
     aria-label="底部導覽">

  <!-- Active tab -->
  <a href="#"
     class="flex-1 flex flex-col items-center justify-center gap-0.5
            text-primary font-medium transition-colors duration-200
            focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary"
     aria-current="page">
    <!-- SVG icon, w-5 h-5, aria-hidden="true" -->
    <span class="text-xs font-medium">頁面名稱</span>
  </a>

  <!-- Inactive tab -->
  <a href="target.html"
     class="flex-1 flex flex-col items-center justify-center gap-0.5
            text-slate-500 hover:text-primary transition-colors duration-200
            focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary">
    <!-- SVG icon, w-5 h-5, aria-hidden="true" -->
    <span class="text-xs">頁面名稱</span>
  </a>

</nav>
```

**頁面底部留白：**
Tab bar 為 fixed 定位，需在 `<main>` 底部加上留白避免內容被遮擋：
```css
/* 僅在 mobile 套用 */
@media (max-width: 767px) {
  main { padding-bottom: 56px; } /* h-14 = 56px */
}
```
或使用 Tailwind：`<main class="pb-14 md:pb-0">`

**當 Sidebar → Mobile Tab Bar 對應規則：**
- Sidebar 的每個 section nav item → Tab Bar 的一個 tab
- 項目超過 5 個時，最後一個改為「更多」（overflow menu）

---

## Style Guidelines

**Style:** Flat Design

**Keywords:** 2D, minimalist, bold colors, clean lines, simple shapes, typography-focused, modern, tool-oriented

**Best For:** Web apps, SaaS dashboards, annotation tools, cross-platform

**Key Effects:**
- No gradients or decorative shadows
- Hover feedback: `opacity` change and/or `color` change
- Allowed micro-interaction: `translateY` up to `-2px` maximum (creates subtle lift without layout shift)
- Forbidden hover: `scale` transforms, shadow enhancement on hover
- Transitions: 150–200ms ease
- Minimal, purposeful icons (Heroicons / Lucide)

### Flat Design in This Project

Label Suite uses Flat Design with **one allowed exception**: a maximum `translateY(-2px)` on interactive elements (cards, primary buttons) to provide tactile hover feedback without adding shadows or gradients. This is intentional and consistent.

| Effect | Allowed | Notes |
|--------|---------|-------|
| `opacity` change on hover | Yes | Preferred for buttons |
| `color` / `border-color` change on hover | Yes | Preferred for cards |
| `translateY(-1px)` to `(-2px)` | Yes | Max 2px, buttons and interactive cards only |
| `scale` transform | No | Causes layout shift |
| Shadow enhancement on hover | No | Violates flat design |
| Gradients | No | Background or border |

### Page Shell Patterns

Label Suite is a **tool-based web app** (not a marketing site). Use these two shell layouts:

**Pattern A: Header + Content Layout**
- Used for: Dashboard, Settings
- Structure: Fixed top navbar (height 56px) + scrollable main content area
- Max content width: `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`
- Top padding: `pt-6` below navbar

**Pattern B: Sidebar + Content Layout** *(reserved for annotation task pages)*
- Used for: Annotation task interface
- Structure: Fixed left sidebar (width 240px) + scrollable main content area
- Sidebar contains: task metadata, label palette, progress indicator
- Define in `design/system/pages/annotation.md` when implemented

**Pattern C: Header + Sidebar + Content Layout**
- Used for: Profile, multi-section settings pages
- Structure: Fixed top navbar (height 56px) + fixed left nav sidebar (width 224px) + scrollable main content area
- Sidebar contains: section navigation links (e.g., Profile Info, Security, Notifications)
- Max content width: `max-w-3xl` within the content area

---

## Anti-Patterns (Do NOT Use)

- ❌ Complex onboarding flow
- ❌ Cluttered layout
- ❌ **Emojis as icons** — Use SVG icons (Heroicons, Lucide, Simple Icons)
- ❌ **Missing cursor:pointer** — All clickable elements must have cursor:pointer
- ❌ **cursor:pointer on non-interactive cards** — Only add when the card is actually clickable
- ❌ **Layout-shifting hovers** — No scale transforms; translateY max -2px
- ❌ **Low contrast text** — Maintain 4.5:1 minimum contrast ratio
- ❌ **Instant state changes** — Always use transitions (150-300ms)
- ❌ **Invisible focus states** — Focus states must be visible for a11y
- ❌ **Hardcoded state colors** — Use the Semantic State Colors table, not ad-hoc Tailwind color classes
- ❌ **`--color-background` / `--color-text`** — Use `--color-surface` / `--color-ink` (deprecated naming)

---

## Pre-Delivery Checklist

Before delivering any UI code, verify:

- [ ] Every page is reachable from at least one entry point (no orphan pages)
- [ ] Every `href="#"` placeholder has been replaced with a real path or marked `aria-disabled="true"`
- [ ] Navigation flow matches the Page Navigation Flow table in `spec.md`
- [ ] No emojis used as icons (use SVG instead)
- [ ] All icons from consistent icon set (Heroicons/Lucide)
- [ ] `cursor-pointer` on all **clickable** elements only
- [ ] Hover states with smooth transitions (150-300ms)
- [ ] Light mode: text contrast 4.5:1 minimum
- [ ] Focus states visible for keyboard navigation
- [ ] `prefers-reduced-motion` respected
- [ ] Responsive: 375px, 768px, 1024px, 1440px
- [ ] No content hidden behind fixed navbars
- [ ] No horizontal scroll on mobile
- [ ] Color tokens use `surface`/`ink` (not `background`/`text`)
- [ ] State colors use Semantic State Colors (not ad-hoc Tailwind utilities)
- [ ] `lang` attribute set on `<html>` for bilingual pages
- [ ] Chinese body text uses `line-height: 1.8`
- [ ] Z-index values follow the Z-index Scale table
