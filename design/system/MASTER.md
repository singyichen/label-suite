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
```

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
```

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
- Used for: Dashboard, Leaderboard, Settings, Profile
- Structure: Fixed top navbar (height 56px) + scrollable main content area
- Max content width: `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`
- Top padding: `pt-6` below navbar

**Pattern B: Sidebar + Content Layout** *(reserved for annotation task pages)*
- Used for: Annotation task interface
- Structure: Fixed left sidebar (width 240px) + scrollable main content area
- Sidebar contains: task metadata, label palette, progress indicator
- Define in `design/system/pages/annotation.md` when implemented

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
