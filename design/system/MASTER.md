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
**Updated:** 2026-04-21
**Category:** Micro SaaS (Tool-based Web App)
**Pencil Source Sync:** `design/wireframes/design-system.pen` (last modified: 2026-04-15 15:13 +0800)

---

## Contents

**Foundation** — [Color Palette](#color-palette) · [Semantic State Colors](#semantic-state-colors) · [Typography](#typography) · [Bilingual Typography](#bilingual-typography) · [Spacing](#spacing-variables) · [Border Radius](#border-radius-scale) · [Z-index](#z-index-scale) · [Shadows](#shadow-depths)

**Components** — [Buttons](#buttons) · [Cards](#cards) · [Inputs](#inputs) · [Modals](#modals) · [Status Badges](#status-badges) · [Alert Banner](#error--alert-banner) · [Toast](#toast) · [Navbar](#navbar) · [Sidebar](#sidebar) · [Desktop Content Tabs](#desktop-content-tabs) · [Table](#table) · [Avatar](#avatar) · [Tooltip](#tooltip) · [Mobile Tab Bar](#mobile-bottom-tab-bar) · [State Panel](#state-panel) · [Prototype Switcher](#prototype-only-state-switcher) · [Divider](#divider) · [List](#list-activity-list) · [Link](#link)

**Guidelines** — [Style / Flat Design](#style-guidelines) · [Page Shells](#page-shell-patterns) · [Anti-Patterns](#anti-patterns-do-not-use) · [Pre-Delivery Checklist](#pre-delivery-checklist)

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

### Pen Variable Snapshot (Canonical)

The latest `design-system.pen` defines the following variable set. Keep these names and values aligned when updating Tailwind/CSS tokens.

| Group | Variable | Value |
|------|----------|-------|
| Core | `color-primary` | `#6366F1` |
| Core | `color-secondary` | `#818CF8` |
| Core | `color-cta` | `#10B981` |
| Core | `color-surface` | `#F5F3FF` |
| Core | `color-ink` | `#1E1B4B` |
| Supporting | `color-border` | `#E2E8F0` |
| Supporting | `color-text-muted` | `#94A3B8` |
| Supporting | `color-white` | `#FFFFFF` |
| State | `color-error` / `color-error-bg` / `color-error-border` | `#B91C1C` / `#FEF2F2` / `#FECACA` |
| State | `color-success` / `color-success-bg` / `color-success-border` | `#15803D` / `#F0FDF4` / `#BBF7D0` |
| State | `color-warning` / `color-warning-bg` / `color-warning-border` | `#A16207` / `#FEFCE8` / `#FEF08A` |
| State | `color-info` / `color-info-bg` / `color-info-border` | `#1D4ED8` / `#EFF6FF` / `#BFDBFE` |
| Alias (legacy in pen) | `color-background` | `#F5F3FF` |
| Alias (legacy in pen) | `color-text` | `#1E1B4B` |
| Radius | `radius-sm` / `radius-md` / `radius-lg` / `radius-xl` / `radius-full` | `4 / 8 / 12 / 16 / 9999` |
| Spacing | `space-xs` / `space-sm` / `space-md` / `space-lg` / `space-xl` / `space-2xl` / `space-3xl` | `4 / 8 / 16 / 24 / 32 / 48 / 64` |

### Pen Typography Snapshot (Canonical)

Direct read from `design-system.pen` reusable components:

- **Primary UI font in components:** `Inter` (buttons, card text, inputs, labels)
- **Heading/Display font used in pen components:** `Crimson Pro` (modal title)

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
- **Body Font:** Inter
- **Mood:** academic, research, scholarly, accessible, readable, educational
- **Google Fonts:** [Crimson Pro + Inter](https://fonts.google.com/share?selection.family=Crimson+Pro:wght@400;500;600;700|Inter:wght@400;500;600;700)

**CSS Import:**
```css
@import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap');
```

**Chinese Fallback:**
```css
/* Headings */
font-family: 'Crimson Pro', 'Noto Serif TC', 'Source Han Serif TC', serif;

/* Body */
font-family: 'Inter', 'Noto Sans TC', 'PingFang TC', sans-serif;
```

### Typography Scale

| Level | Font | Size | Weight | Line-Height | Usage |
|-------|------|------|--------|-------------|-------|
| Display | Crimson Pro | 48px / `text-5xl` | 700 | 1.2 | Hero titles |
| H1 | Crimson Pro | 36px / `text-4xl` | 700 | 1.3 | Page titles |
| H2 | Crimson Pro | 24px / `text-2xl` | 600 | 1.4 | Section headings |
| H3 | Inter | 18px / `text-xl` | 600 | 1.5 | Card titles, subsections |
| Body | Inter | 16px / `text-base` | 400 | 1.6 (EN) / 1.8 (ZH) | Default body text |
| Caption | Inter | 14px / `text-sm` | 400 | 1.5 | Supporting text, metadata |
| Label | Inter | 12px / `text-xs` | 500 | 1.4 | Tags, badges, form labels |

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

### Pencil Section Coverage (Latest Pen Sync)

The current `design-system.pen` includes these section groups, and this file is aligned to them:

- Foundation: `sec_color`, `sec_typo`, `sec_state`, `sec_space`, `sec_radius`, `sec_zindex`
- Core components: `sec_comp`, `sec_form`, `sec_alert`, `sec_badge`
- Navigation: `sec_nav`, `sec_sidebar`, `sec_tab`
- Data/display: `sec_table`, `sec_list`, `sec_divider`, `sec_tooltip`, `sec_avatar`

### Pencil Reusable Components (Latest Pen Sync)

Direct read from `design-system.pen` (`reusable: true`, total `45`):

- Buttons: `Button / Primary`, `Button / Secondary`, `Button / Ghost`, `Button / Danger`, `Button / OAuth`, `Button / Icon Only`, `Button / CTA / Default`, `Button / CTA / Hover`, `Button / CTA / Loading`, `Button / CTA / Disabled`, `Button / Language Toggle`, `Button / Language Toggle / ZH`, `Button / Language Toggle / EN`
- Inputs: `Input / Default`, `Input / Focus`, `Input / Default / Inline`, `Input / Focus / Inline`, `Input / Error / Inline`, `Input / Readonly`
- Feedback: `Toast / Success`, `Toast / Error`, `Alert Banner / Error`, `State Panel / Success`, `State Panel / Token Error`
- Status/Link: `Badge / Not Started`, `Badge / In Progress`, `Badge / Submitted`, `Badge / Error`, `Link / Inline`, `Link / Action`, `Link / Nav / Active`, `Link / Nav / Inactive`
- Layout/Data: `Navbar / Desktop`, `Sidebar / Desktop`, `Table / Default`, `List / Activity`, `Divider / Horizontal`, `Divider / Text / Or`, `Tooltip / Info`, `Mobile Tab Bar / Default`
- Profile/Other: `Card / Default`, `Modal / Default`, `Avatar / Small`, `Avatar / Large`, `Avatar / Uploadable`

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

/* OAuth Button — third-party auth entry (Google, GitHub) */
.btn-oauth {
  background: white;
  color: #334155;           /* slate-700 */
  border: 1px solid #E2E8F0;
  padding: 10px 16px;
  border-radius: var(--radius-md);
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: background-color 200ms ease, border-color 200ms ease;
  cursor: pointer;
}

.btn-oauth:hover {
  background: #F8FAFC;      /* slate-50 */
  border-color: #CBD5E1;    /* slate-300 */
}

/* Icon-only Button — compact trigger (mobile menu, utility controls) */
.btn-icon {
  width: 36px;
  height: 36px;
  border: 1px solid #E2E8F0;
  border-radius: var(--radius-md);
  background: white;
  color: #475569;           /* slate-600 */
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: background-color 200ms ease, border-color 200ms ease, color 200ms ease;
  cursor: pointer;
}

.btn-icon:hover {
  background: #F8FAFC;      /* slate-50 */
  border-color: #CBD5E1;    /* slate-300 */
  color: #1E293B;           /* slate-800 */
}

/* Language Toggle Button — locale switcher (zh-TW / EN) */
.btn-language {
  background: white;
  color: #334155;           /* slate-700 */
  border: 1px solid #E2E8F0;
  padding: 8px 12px;
  min-height: 36px;
  border-radius: var(--radius-md);
  font-size: 14px;
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: background-color 200ms ease, border-color 200ms ease;
  cursor: pointer;
}

.btn-language:hover {
  background: #F8FAFC;      /* slate-50 */
  border-color: #CBD5E1;    /* slate-300 */
}
```

**Button Variants Summary:**

| Variant | Use case | When NOT to use |
|---------|----------|-----------------|
| Primary (`btn-primary`) | The single most important CTA per page | When two or more appear on the same page |
| Secondary (`btn-secondary`) | Secondary actions, paired alongside Primary | When used standalone (use Ghost instead) |
| Danger (`btn-danger`) | Destructive actions (logout, delete) | General cancel actions (use Secondary) |
| Ghost (`btn-ghost`) | Low-priority actions (view all, skip) | When the action needs clear visual weight |
| OAuth (`btn-oauth`) | Social sign-in buttons with brand icon | Non-auth flows (use Primary/Secondary) |
| Icon-only (`btn-icon`) | Compact icon triggers (mobile menu, utility actions) | Primary CTA requiring clear text label |
| Language Toggle (`btn-language`) | zh-TW / EN switching control | General icon actions unrelated to locale |

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

**Card Variants:**

| Variant | Classes | Use case |
|---------|---------|----------|
| Interactive | `border border-slate-200 rounded-xl p-6 hover:border-primary hover:-translate-y-0.5` | Clickable summary/stat card |
| Non-interactive | `border border-slate-200 rounded-xl p-6` | Static content blocks |
| Login Card | `border border-slate-200 rounded-2xl p-8` | Auth shell in account pages |
| Dashboard Summary Card | `border border-slate-200 rounded-xl p-6` + title + KPI + subtitle | KPI widgets on dashboard |

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

/* Input with leading icon */
.input-wrapper {
  position: relative;
}

.input-wrapper .input-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  width: 16px;
  height: 16px;
  color: #94A3B8;            /* slate-400 */
  pointer-events: none;
}

.input-wrapper .input.leading-icon {
  padding-left: 40px;        /* icon + gap */
}

/* Password visibility toggle */
.input-wrapper .eye-toggle {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  color: #64748B;            /* slate-500 */
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.input-wrapper .eye-toggle:hover {
  color: #334155;            /* slate-700 */
}

/* Supporting text under field */
.field-hint {
  margin-top: 6px;
  font-size: 12px;
  line-height: 1.4;
  color: #64748B;            /* slate-500 */
}

.field-error {
  margin-top: 6px;
  font-size: 12px;
  line-height: 1.4;
  color: #B91C1C;            /* red-700 */
}

/* Optional counters / indicators */
.field-meta {
  margin-top: 6px;
  font-size: 12px;
  line-height: 1.4;
  color: #64748B;            /* slate-500 */
  display: flex;
  justify-content: space-between;
  gap: 8px;
}

.required-indicator {
  color: #B91C1C;            /* red-700 */
  margin-left: 4px;
}
```

**Input States:**

| State | Visual cue | When to use |
|-------|-----------|-------------|
| Default | `border-slate-200` | Editable field |
| Focus | `border-primary` + ring | When the user focuses the input |
| Error | `border-red-400` + ring-red | Validation failure |
| Readonly | `bg-slate-50 border-slate-100 text-slate-400 cursor-not-allowed` | System-managed fields (e.g. SSO email) |
| Disabled | `opacity-40 cursor-not-allowed` | Feature unavailable under current conditions |

**Input Sub-patterns:**

| Pattern | Key classes | Notes |
|---------|-------------|-------|
| Leading Icon | `.input-wrapper .input-icon` + `.input.leading-icon` | Keep icon decorative (`aria-hidden="true"`) |
| Eye Toggle | `.eye-toggle` | Toggle `type="password"` / `type="text"`; update `aria-label` dynamically |
| Hint Text | `.field-hint` | For constraints like min length and allowed characters |
| Inline Error Text | `.field-error` + `role="alert"` | Error message appears below field, paired with `.input.error` |
| Character Counter | `.field-meta` | Use for length-limited fields |
| Required Indicator | `.required-indicator` | Append to label text only (do not rely on color alone) |

**Readonly vs Disabled:**
- **Readonly** — Data exists and is meaningful, but cannot be edited (e.g. email managed by SSO); still submitted with the form
- **Disabled** — Feature is currently unavailable; not submitted with the form

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

**Modal Interaction Rules:**

- `Escape` key closes the modal unless a blocking action is in progress
- Click outside (`.modal-overlay`) closes only for non-destructive confirmation dialogs
- Trap focus inside modal while open; return focus to opener when closed
- Set `aria-modal="true"` and `role="dialog"` (or `alertdialog` for destructive confirmation)

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

<!-- Role Badge -->
<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
  <!-- Optional role icon -->
  Reviewer
</span>
```

**Role Badge Use:**
- For identity/context labels such as `Admin`, `Reviewer`, `Annotator`
- Use rounded-full pill shape (`rounded-full`) to visually separate from task status badges

### Error / Alert Banner

```html
<!-- Error Banner (e.g. login failure) -->
<div class="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3" role="alert">
  <!-- SVG icon -->
  <span>Error message here</span>
</div>
```

**Alert Banner vs Toast:**

| | Alert Banner | Toast |
|---|---|---|
| **Position** | Inline within page flow | Fixed floating (bottom-right corner) |
| **Dismissal** | Manual close or always visible | Auto-dismiss after 4 seconds; closeable manually |
| **When to use** | Page-level errors (login failure) | Action result feedback (save successful) |
| **aria** | `role="alert"` | `aria-live="polite"` |

### Toast

Used for immediate action feedback (save success, update failure, etc.). Floats at the bottom-right corner and auto-dismisses after 4 seconds.

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
      <p class="font-medium">Saved successfully</p>
      <p class="text-xs mt-0.5 opacity-80">Optional description</p>
    </div>
    <!-- Close button -->
    <button class="text-green-500 hover:text-green-700 cursor-pointer" aria-label="Close notification">
      <!-- SVG x icon -->
    </button>
  </div>

  <!-- Error Toast -->
  <div class="flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 shadow-md">
    <!-- SVG x-circle icon -->
    <div class="flex-1">
      <p class="font-medium">Failed to save</p>
      <p class="text-xs mt-0.5 opacity-80">Optional description</p>
    </div>
    <button class="text-red-500 hover:text-red-700 cursor-pointer" aria-label="Close notification">
      <!-- SVG x icon -->
    </button>
  </div>
</div>
```

**Toast Specs:**

| Property | Value |
|----------|-------|
| Position | `fixed bottom-6 right-6` |
| z-index | `400` (Toast layer, above Modal) |
| Max width | `max-w-sm` (384px) |
| Auto-dismiss | 4000ms |
| Animation | fade-in 150ms / fade-out 150ms (`transition-opacity`) |
| Shadow | `shadow-md` (Toast is an approved exception to the no-shadow flat design rule) |

**Toast Variants:**

| Variant | Color role | When to use |
|---------|-----------|-------------|
| Success | `bg-green-50 border-green-200 text-green-700` | Action succeeded (save, update) |
| Error | `bg-red-50 border-red-200 text-red-700` | Action failed (network error, server error) |

**When NOT to use Toast:**
- ❌ Page-level errors (login failure) → use Alert Banner instead
- ❌ Actions requiring user confirmation → use Modal instead
- ❌ Critical warnings that must not auto-dismiss → use Alert Banner instead

### Navbar

Top sticky navigation bar used in Pattern A (Dashboard) and Pattern C (Profile) pages.

**Specs:**

| Property | Value |
|----------|-------|
| Height | `h-16` (64px) |
| Background | `bg-white` |
| Bottom border | `border-b border-slate-200` |
| Position | `sticky top-0 z-[200]` |
| Content width | `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8` |

**Structure (left → right):**

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
| Disabled | `aria-disabled="true"` + same as inactive (no `pointer-events-none` — preserves tab stop) |

**Navbar control mapping:**
- Language toggle uses `btn-language` (not generic ghost button)
- Mobile hamburger uses `btn-icon` and must include `aria-label="Open navigation menu"`

**Mobile drawer (`md:hidden`):**
- Expands below the navbar with `border-t border-slate-200`
- Same items as desktop nav links, rendered as `block` layout
- Includes a Profile link (the desktop avatar is hidden on mobile)

**Accessibility:**
- `<header role="banner">`
- `<nav aria-label="Main navigation">`
- Mobile hamburger: toggle `aria-expanded` on open/close
- Logo link: provide `aria-label` with the page name

---

### Sidebar

Left fixed navigation used in Pattern C (Profile and other multi-section pages). Desktop only (`hidden md:flex`).

**Specs:**

| Property | Value |
|----------|-------|
| Width | `w-56` (224px) |
| Background | `bg-white` |
| Right border | `border-r border-slate-200` |
| z-index | `z-[200]` (Sticky layer) |
| Padding | `py-4 px-3` (vertical on wrapper, horizontal on nav items) |
| Item gap | `gap-1` |

**Nav item states:**

| State | Classes |
|-------|---------|
| Active | `text-primary font-medium bg-surface rounded-lg` + `aria-current="page"` |
| Inactive | `text-slate-500 hover:bg-surface hover:text-ink rounded-lg` |

**Nav item structure:**
```html
<a class="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm
          focus:outline-none focus:ring-2 focus:ring-primary">
  <!-- SVG icon, w-4 h-4, aria-hidden="true" -->
  <span>Item label</span>
</a>
```

**Divider (for grouping):**
```html
<div class="h-px bg-slate-100 my-1 mx-3" aria-hidden="true"></div>
```

**When NOT to use:**
- ❌ Pages with only a single section (use Pattern A instead)
- ❌ Mobile viewports (use Bottom Tab Bar or Mobile drawer instead)

---

### Desktop Content Tabs

Desktop/top-of-content tab navigation for section switching within the same module (for example: `admin/user-management` and `task-management/task-detail`).

**Specs:**

| Property | Value |
|----------|-------|
| Container | `display:flex; border-bottom: 2px solid var(--color-border); margin-bottom: var(--space-lg)` |
| Tab item | `padding: 10px 20px; font-size: 14px; font-weight: 500` |
| Base color | `var(--color-text-soft)` |
| Active state | `color: var(--color-primary); border-bottom: 2px solid var(--color-primary); font-weight: 600` |
| Inactive hover | `color: var(--color-primary)` |
| Active alignment | `margin-bottom: -2px` (to align with container bottom border) |

**CSS reference:**
```css
.admin-tabs {
  display: flex;
  border-bottom: 2px solid var(--color-border);
  margin-bottom: var(--space-lg);
}

.admin-tab {
  padding: 10px 20px;
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-soft);
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  cursor: pointer;
  transition: color var(--dur-fast), border-color var(--dur-fast);
  text-decoration: none;
  display: inline-block;
  background: transparent;
  border-left: none;
  border-right: none;
  border-top: none;
}

.admin-tab:hover { color: var(--color-primary); }

.admin-tab.active {
  color: var(--color-primary);
  border-bottom-color: var(--color-primary);
  font-weight: 600;
}
```

**HTML structure (navigation tabs):**
```html
<div class="admin-tabs" role="tablist" aria-label="Section tabs">
  <a class="admin-tab active" href="user-management.html" role="tab" aria-selected="true">
    使用者管理
  </a>
  <a class="admin-tab" href="role-settings.html" role="tab" aria-selected="false">
    角色設定
  </a>
</div>
```

**HTML structure (in-page tabs):**
```html
<div class="admin-tabs" role="tablist" aria-label="Task detail tabs">
  <button class="admin-tab active" type="button" role="tab" aria-selected="true">
    任務概覽
  </button>
  <button class="admin-tab" type="button" role="tab" aria-selected="false">
    成員管理
  </button>
</div>
```

**Accessibility:**
- Use `role="tablist"` on the container.
- Use `role="tab"` and explicit `aria-selected`.
- For button-based tabs, support keyboard interaction (`ArrowLeft/ArrowRight`, `Enter`, `Space`) in JS.
- Do not hide disabled tabs from keyboard; keep them focusable and set `aria-disabled="true"` when needed.

**Usage rules:**
- Use Desktop Content Tabs for module-level section switching inside page content.
- Keep this visual pattern consistent across modules; do not mix pill-style tabs on one module and underline tabs on another.
- Mobile should still rely on page-specific layouts and/or Bottom Tab Bar; this pattern is desktop-first.

---

### Table

Used for list-style data display (e.g. task list). Supports row hover interaction and responsive horizontal scroll.

**Specs:**

| Element | Classes |
|---------|---------|
| Container | `bg-white border border-slate-200 rounded-xl overflow-hidden` |
| Scroll wrapper | `overflow-x-auto` |
| `<table>` | `w-full text-sm` |
| Header row | `text-left text-xs text-slate-400 uppercase tracking-wide bg-slate-50` |
| Header cell | `px-6 py-3 font-medium` + `scope="col"` |
| Body rows | `divide-y divide-slate-100` |
| Body row (clickable) | `hover:bg-slate-50 cursor-pointer transition-colors duration-150` |
| Primary cell | `px-6 py-4 font-medium text-ink` |
| Secondary cell | `px-6 py-4 text-slate-500` |

**HTML structure:**

```html
<div class="bg-white border border-slate-200 rounded-xl overflow-hidden">
  <div class="overflow-x-auto">
    <table class="w-full text-sm" role="table" aria-label="Table description">
      <thead>
        <tr class="text-left text-xs text-slate-400 uppercase tracking-wide bg-slate-50">
          <th class="px-6 py-3 font-medium" scope="col">Column name</th>
          <!-- more th -->
        </tr>
      </thead>
      <tbody class="divide-y divide-slate-100">
        <tr class="hover:bg-slate-50 cursor-pointer transition-colors duration-150">
          <td class="px-6 py-4 font-medium text-ink">Primary data</td>
          <td class="px-6 py-4 text-slate-500">Secondary data</td>
        </tr>
      </tbody>
    </table>
  </div>
</div>
```

**Accessibility:**
- `<table role="table" aria-label="...">` — provide a descriptive label
- `<th scope="col">` — mark column headers
- Clickable rows: add `tabindex="0"` and `onkeydown` to support Enter/Space

**When NOT to use:**
- ❌ Fewer than 3 rows → use List instead
- ❌ Many columns requiring comparison → consider collapsible sections or pagination

---

### Avatar

Displays the user's identity image. Two usage modes: display-only (navbar) and uploadable (profile).

**Size specs:**

| Size | Dimensions | Usage |
|------|-----------|-------|
| Small | `w-8 h-8` (32px) | Navbar user menu |
| Large | `w-16 h-16` mobile / `w-20 h-20` desktop (64/80px) | Profile page avatar upload area |

**Display-only (Navbar):**

```html
<img
  src="avatar-url"
  alt="User avatar"
  class="w-8 h-8 rounded-full border-2 border-primary/20"
/>
```

**Uploadable (Profile):**

```html
<div class="relative avatar-wrap cursor-pointer shrink-0"
     role="button" tabindex="0"
     aria-label="Upload avatar"
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
<p class="text-xs text-slate-500">JPG, PNG, or WebP — max 5 MB</p>
```

**CSS (hover overlay):**
```css
.avatar-wrap:hover .avatar-overlay { opacity: 1; }
```

**Upload validation rules:**
- Allowed formats: `image/jpeg`, `image/png`, `image/webp`
- Max file size: 5 MB
- Preview: use `URL.createObjectURL()` and call `URL.revokeObjectURL()` after load to free memory (never set `src` via `innerHTML` — XSS risk)

**Avatar states (uploadable):**

| State | Behavior |
|-------|---------|
| Default | Shows initials or uploaded image |
| Hover | `.avatar-overlay` opacity 0 → 1 (semi-transparent dark overlay + upload icon) |
| Focus | `focus:ring-2 focus:ring-primary` (keyboard navigation) |
| Error | Shows `#avatar-error`, `role="alert"` |

---

### Tooltip

Provides supplementary explanation when space constraints prevent showing full context inline (e.g. reason why a field is readonly).

**Specs:**

| Property | Value |
|----------|-------|
| Trigger | `hover` + `focus-within` (keyboard-accessible) |
| Position | Above trigger element, `bottom: calc(100% + 6px)`, horizontally centered |
| Background | `#1E1B4B` (`var(--color-ink)`) |
| Text | `#fff`, `font-size: 11px` |
| Padding | `padding: 4px 8px` |
| Border radius | `border-radius: 6px` (slightly larger than `var(--radius-sm)` at 4px) |
| Animation | `opacity` 0 → 1, `150ms ease` |
| z-index | `500` (Tooltip layer — highest) |
| Arrow | `::after` pseudo-element, `border-top-color: var(--color-ink)` |

**CSS:**
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

**HTML:**
```html
<div class="tooltip-wrap" tabindex="0" aria-describedby="tooltip-text-id">
  <!-- Trigger element (e.g. info icon) -->
  <svg class="w-3.5 h-3.5 text-slate-400 cursor-default" aria-hidden="true">
    <!-- info-circle icon -->
  </svg>
  <span id="tooltip-text-id" class="tooltip">Tooltip text</span>
</div>
```

**Accessibility:**
- Add `tabindex="0"` to the trigger element so keyboard users can focus it
- `aria-describedby` must point to the tooltip's `id`
- Add `pointer-events: none` to the tooltip itself to prevent interaction interference
- Never use the native `title` attribute — it cannot be triggered by focus and is invisible to keyboard users

**When NOT to use:**
- ❌ Explanation longer than one line → use Popover or inline expanded text instead
- ❌ Explanation contains links or interactive elements → use Popover instead
- ❌ Critical information must not be hidden behind hover → display it directly on the page

---

### Mobile Bottom Tab Bar

Mobile-only bottom navigation (`md:hidden`). Replaces the Sidebar for navigation on small screens.

**Specs:**

| Property | Value |
|----------|-------|
| Height | `h-14` (56px) |
| Position | `fixed bottom-0 left-0 right-0` |
| z-index | `z-[200]` (Sticky layer) |
| Background | `bg-white` |
| Top border | `border-t border-slate-200` |
| Visibility | `md:hidden` (below 768px) |

**Tab item states:**

| State | Classes |
|-------|---------|
| Active | `text-primary font-medium` + `aria-current="page"` |
| Inactive | `text-slate-500 hover:text-primary` |
| Focus | `focus:ring-2 focus:ring-inset focus:ring-primary` |

**HTML structure:**
```html
<nav class="md:hidden fixed bottom-0 left-0 right-0 h-14
            bg-white border-t border-slate-200
            flex items-stretch z-[200]"
     aria-label="Bottom navigation">

  <!-- Active tab -->
  <a href="#"
     class="flex-1 flex flex-col items-center justify-center gap-0.5
            text-primary font-medium transition-colors duration-200
            focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary"
     aria-current="page">
    <!-- SVG icon, w-5 h-5, aria-hidden="true" -->
    <span class="text-xs font-medium">Page name</span>
  </a>

  <!-- Inactive tab -->
  <a href="target.html"
     class="flex-1 flex flex-col items-center justify-center gap-0.5
            text-slate-500 hover:text-primary transition-colors duration-200
            focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary">
    <!-- SVG icon, w-5 h-5, aria-hidden="true" -->
    <span class="text-xs">Page name</span>
  </a>

</nav>
```

**Bottom page padding:**
The tab bar uses fixed positioning — add bottom padding to `<main>` to prevent content from being covered:
```css
/* Mobile only */
@media (max-width: 767px) {
  main { padding-bottom: 56px; } /* h-14 = 56px */
}
```
Or with Tailwind: `<main class="pb-14 md:pb-0">`

**Sidebar → Mobile Tab Bar mapping rule:**
- Each Sidebar section nav item maps to one tab in the Tab Bar
- When there are more than 5 items, the last tab becomes "More" (overflow menu)

---

### State Panel

Form-level state container that replaces the form block after submit success or token validation failure.
Different from Alert Banner (inline message while form remains visible) and Toast (floating auto-dismiss).

**Specs:**

| Property | Value |
|----------|-------|
| Container | `rounded-md border p-5 text-center` |
| Layout | icon circle + title + description + action link/button |
| Replacement rule | Replaces the form section, not stacked above it |

**Success Panel (form submitted):**

```html
<section class="bg-green-50 border border-green-200 rounded-md p-5 text-center">
  <div class="mx-auto mb-3 w-10 h-10 rounded-full bg-green-100 text-green-700 flex items-center justify-center">
    <!-- success icon -->
  </div>
  <h2 class="text-base font-semibold text-green-800">Check your email</h2>
  <p class="mt-1 text-sm text-green-700">We've sent a reset link to your inbox.</p>
  <a href="login.html" class="mt-4 inline-flex text-sm font-medium text-primary hover:underline">Back to login</a>
</section>
```

**Token Error Panel (invalid/expired token):**

```html
<section class="bg-red-50 border border-red-200 rounded-md p-5 text-center" role="alert">
  <div class="mx-auto mb-3 w-10 h-10 rounded-full bg-red-100 text-red-700 flex items-center justify-center">
    <!-- error icon -->
  </div>
  <h2 class="text-base font-semibold text-red-800">Reset link is invalid</h2>
  <p class="mt-1 text-sm text-red-700">Please request a new password reset email.</p>
  <a href="forgot-password.html" class="mt-4 inline-flex text-sm font-medium text-primary hover:underline">Request new link</a>
</section>
```

---

### Prototype-Only State Switcher

Used only in static prototypes to switch scenarios within a single HTML file.
This is a demo helper, not a production component.

**Specs (prototype only):**
- Container: `inline-flex rounded-lg border border-slate-200 p-1`
- Segment button:
  - Active: `bg-primary text-white`
  - Inactive: `text-slate-600 hover:bg-slate-50`
- Place in low-priority area (top-right utility zone), never as a core product interaction

---

### Divider

Visually separates two content blocks. Carries no semantic meaning.

**Tokens:**

| Property | Token | Value |
|----------|-------|-------|
| Color | `border-slate-200` | #E2E8F0 |
| Thickness | `h-px` / `border-t` | 1px |

**Variants:**

#### 1. Horizontal Rule

```html
<hr class="h-px bg-slate-200 border-0 my-6">
```

- Used to separate page sections (e.g. inside a Card, between Form groups)
- `my-6` (24px) is the default spacing; use `my-4` when space is tight

#### 2. Text Divider

```html
<div class="flex items-center gap-3 my-6">
  <hr class="flex-1 h-px bg-slate-200 border-0">
  <span class="text-sm text-slate-400">or</span>
  <hr class="flex-1 h-px bg-slate-200 border-0">
</div>
```

- Used only on the login page to separate OAuth from account login
- Text uses `text-sm text-slate-400` (not `text-ink`) to reduce visual weight

#### 3. List Divider

Applied via Tailwind divide utilities — no standalone `<hr>`:

```html
<ul class="divide-y divide-slate-100">
  <li class="py-4">...</li>
  <li class="py-4">...</li>
</ul>
```

- `divide-slate-100` is lighter than `divide-slate-200` — preferred for dense lists

**When NOT to use:**
- Do not use Dividers to separate too many adjacent blocks (more than 3 consecutive dividers usually signals a layout problem)
- Do not use Dividers as a substitute for spacing — try increasing padding/margin first; add a Divider only when visual grouping is still unclear

---

### List (Activity List)

Displays a homogeneous set of items with a consistent per-row format (e.g. activity log, task list).

**Tokens:**

| Property | Value |
|----------|-------|
| Divider | `divide-y divide-slate-100` |
| Row padding | `py-4` |
| Left primary text | `text-sm font-medium text-ink` |
| Right secondary text | `text-sm text-slate-400` |
| Hover | `hover:bg-slate-50` |

**HTML structure:**

```html
<ul class="divide-y divide-slate-100">
  <li class="flex items-center justify-between py-4 hover:bg-slate-50 px-1 rounded">
    <span class="text-sm font-medium text-ink">Task name</span>
    <span class="text-sm text-slate-400">2024-01-15</span>
  </li>
  <li class="flex items-center justify-between py-4 hover:bg-slate-50 px-1 rounded">
    <span class="text-sm font-medium text-ink">Task name</span>
    <span class="text-sm text-slate-400 tabular-nums">92 pts</span>
  </li>
</ul>
```

**Right column types:**

| Type | Style |
|------|-------|
| Date | `text-sm text-slate-400` |
| Score / number | `text-sm text-slate-400 tabular-nums` |
| Status Badge | Embed a `<span>` Badge component |

**"View all" link:**

```html
<div class="mt-4 text-right">
  <a href="#" class="text-sm text-primary hover:underline">View all</a>
</div>
```

**Empty state:**

```html
<div class="py-8 text-center text-sm text-slate-400">
  No records yet
</div>
```

**When NOT to use:**
- Data requires sorting, filtering, or multi-column comparison → use **Table** instead
- Items need to expand for more detail → consider Accordion or a dedicated page

---

### Link

Text-based navigation/action element. Use semantic `<a>` for navigation targets and avoid button styling unless the visual hierarchy requires it.

**Link Variants:**

| Variant | Classes | Use case |
|---------|---------|----------|
| Inline text link | `underline text-slate-700 hover:text-primary` | Legal text, inline references |
| Nav link | `text-slate-600 hover:text-ink hover:bg-slate-50 rounded-lg` | Navbar / Sidebar navigation |
| Action link | `text-primary hover:underline` | Lightweight actions like "View all" |

**Accessibility and behavior:**
- Always provide a real `href`; avoid `href="#"` in delivered code
- Use `aria-current="page"` for active nav links
- Keep focus visible: `focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2`
- Disabled link behavior: keep focusable only when discoverability is needed; use `aria-disabled="true"` and prevent activation in JS

**When NOT to use:**
- Actions that submit data or open confirm flows → use Button
- Primary CTA that must stand out visually → use Primary Button

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
- Structure: Fixed top navbar (height 64px) + scrollable main content area
- Max content width: `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`
- Top padding: `pt-6` below navbar

**Pattern B: Sidebar + Content Layout** *(reserved for annotation task pages)*
- Used for: Annotation task interface
- Structure: Fixed left sidebar (width 240px) + scrollable main content area
- Sidebar contains: task metadata, label palette, progress indicator
- Define in `design/system/pages/annotation.md` when implemented

**Pattern C: Header + Sidebar + Content Layout**
- Used for: Profile, multi-section settings pages
- Structure: Fixed top navbar (height 64px) + fixed left nav sidebar (width 224px) + scrollable main content area
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
