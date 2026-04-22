# Label Suite — Design System

A living design system extracted from the **Label Suite** product — a config-driven NLP annotation platform with integrated annotator management, designed for academic research labs.

> **Source repository:** `singyichen/label-suite` (GitHub)
> **Canonical design doc:** `design/system/MASTER.md` in the source repo (46 KB, 2026-04-16)
> **Pencil wireframe source:** `design/wireframes/design-system.pen` (encrypted; read via Pencil MCP)
> **Prototype reference:** `design/prototype/pages/` (login, register, forgot/reset-password, profile, dashboard)

This design system was derived from real product HTML, not screenshots. Every token below traces back to a pen variable or CSS custom property in the source prototype.

---

## What is Label Suite?

Label Suite is an open-source, lightweight alternative to [Label Studio](https://labelstud.io/), purpose-built for academic NLP research teams. It replaces the fragmented "spreadsheet + ad-hoc scripts + external annotator management" workflow most labs inherit.

**Core product claims:**

1. **Config-driven task launch.** NLP annotation tasks (Single Sentence, Sentence Pairs, Sequence Labeling, Generative Labeling) are defined via YAML/JSON — no custom code.
2. **Integrated annotator management.** Built-in account lifecycle, working-hours tracking, and salary estimation for part-time research assistants.
3. **Dry Run / Official Run isolation.** Interfaces and configs can be validated in a sandboxed mode before formal data collection.
4. **Built-in dataset analytics.** #Sentence, #Token, #Label statistics computed automatically.
5. **Bilingual UI (zh-TW / EN).** Primary audience: Taiwan-based research labs; secondary: international collaborators.

**Audience segments (roles in the prototype):**
- **Super Admin** — platform operators; manage users and roles
- **Project Leader** — a researcher who creates and configures annotation tasks
- **Annotator** — typically a part-time RA who performs labeling
- **Reviewer** — senior annotator or researcher who adjudicates
- **User** — default role, graduates into the above through task actions

**Tech stack (informational — for designers implementing in-app):**
React + TypeScript + Vite · FastAPI · PostgreSQL · Redis · Celery · Playwright.

**Category:** Micro SaaS / tool-based web app. Not a marketing site — no hero slabs, no parallax, no illustrations.

---

## Content Fundamentals

Label Suite writes like a **research tool that respects its users' time**. Copy is precise, bilingual-aware, and explains consequences before it asks for action.

### Voice & Tone
- **Calm and functional.** No hype, no "Let's go!" No emoji. No exclamation marks in primary flows.
- **Second-person ("you" / "你"), never first-person plural.** The product describes what the user can do, not what "we" will do.
- **Scholarly vocabulary is acceptable.** Terms like *IAA* (inter-annotator agreement), *Dry Run*, *Official Run*, *Sequence Labeling* are used without apology — audience knows them.
- **Status language is neutral.** "Submitted", "In Progress", "Pending IAA confirmation" — never "🎉 You did it!"

### Casing
- **Sentence case** for button labels in English: *Create Your First Task*, *Continue with Google*, *Sign in*. Not ALL CAPS, not Title Case For Every Word.
- **Labels above inputs** are short nouns: *Email*, *Password*, *電子郵件*, *密碼*.
- **Table headers** use uppercase tracking: `text-xs uppercase tracking-wide text-slate-400`.

### Bilingual Voice (zh-TW / EN)
The product is bilingual-first. Both languages are peers; neither is a translation of the other.

- **Chinese is conversational, not formal.** `登入你的帳號` (not `請登入您的帳戶`). Uses `你` not `您`.
- **English mirrors Chinese directness.** `Sign in to your account`. No filler.
- **Mixed-case handling** is browser-automatic — never hand-kern Chinese text.
- Chinese body text uses `line-height: 1.8`; English uses `1.6`.

### Real examples from the product

| Context | Chinese | English |
|---|---|---|
| Login subtitle | `登入你的帳號` | `Sign in to your account` |
| Primary CTA | `登入` | `Sign In` |
| Google SSO | `使用 Google 帳號繼續` | `Continue with Google` |
| Register link | `還沒有帳號？前往註冊` | `Don't have an account? Register` |
| Forgot password | `忘記密碼？` | `Forgot password?` |
| Dashboard title | `儀表板` | `Dashboard` |
| Dashboard sub | `掌握任務進度與團隊協作狀態` | `Track task progress and team collaboration at a glance` |
| Empty-state CTA | `建立第一個任務` | `Create Your First Task` |
| Alert (login fail) | `帳號或密碼錯誤，請再試一次` | `Invalid email or password` |
| Validation | `請輸入電子郵件` | `Email is required` |
| Role pill | `標記員` / `審核員` / `專案負責人` | `Annotator` / `Reviewer` / `Project Leader` |
| Status badge | `進行中` / `待確認` / `已送出` | `In Progress` / `Pending` / `Submitted` |

### Anti-patterns in copy
- ❌ Emoji as punctuation or in UI labels
- ❌ "Oops!" or any apologetic filler
- ❌ Marketing verbs: *supercharge*, *unlock*, *effortless*
- ❌ First-person plural ("we", "our team")
- ❌ Title Case For Every Button

---

## Visual Foundations

### Philosophy: Flat + one intentional exception
Label Suite commits to **Flat Design** — 2D, bold colors, clean lines, typography-focused. The system allows **exactly one** interactive embellishment: a `translateY(-1px)` to `translateY(-2px)` lift on hover for primary buttons and interactive cards. Nothing else.

| Effect | Allowed? | Notes |
|---|---|---|
| Opacity change on hover | ✅ | Preferred for buttons (`opacity: 0.9`) |
| Color / border-color change on hover | ✅ | Preferred for cards and links |
| `translateY(-1px)` to `-2px` | ✅ | **Only** exception; primary buttons + interactive cards |
| `scale()` transform | ❌ | Causes layout shift |
| Shadow enhancement on hover | ❌ | Violates flat rule |
| Gradients (background, border, text) | ❌ | Never |
| Glassmorphism / blur backdrops | ❌ (modal overlay only) | `backdrop-filter: blur(4px)` on `.modal-overlay` is the one exception |

### Color Vibe
**Indigo + Emerald on Violet-50.** Primary identity is `#6366F1` (Indigo 500); the single emerald CTA (`#10B981`) is the only saturated green. Backgrounds are **violet-tinted off-white** (`#F5F3FF`) — not gray, not pure white — which lends the UI a slightly scholarly, ink-on-paper feel. Inks are deep `#1E1B4B` (Indigo 950), never pure black.

Imagery (when it appears — the product ships none by default) should skew cool, low-saturation, and fundamentally neutral. No grain, no warmth, no b&w photography tropes.

### Type
- **Crimson Pro** (serif) for headings and display — lends the academic, thesis-paper feel the product's research audience expects.
- **Inter** (sans-serif) for UI body, buttons, inputs, labels.
- **Atkinson Hyperlegible** appears in the dashboard as an accessibility-forward alternative for dense data; it's available as a secondary sans family.
- **JetBrains Mono** — a reasonable default for the YAML config editor surface (the product is config-driven; this surface is implied by the product spec even if the prototype lacks it).

Both Crimson Pro and Inter are Google Fonts — no substitution needed. See `fonts/README.md`.

### Spacing & Rhythm
8-based scale (`4 / 8 / 16 / 24 / 32 / 48 / 64`). Panels get `24px` padding; buttons get `12px 24px`; gutters between panels are `24px`. Tight density on data-heavy pages (dashboard), generous on forms (account pages).

### Backgrounds
- **Page:** flat `var(--color-surface)` — `#F5F3FF` violet off-white.
- **Cards/panels:** flat `white` with `1px solid #E2E8F0` border.
- **Full-bleed imagery:** none. No hero photography, no illustrations, no SVG scenes. The logo mark is the only illustrated element.
- **Repeating patterns / textures:** none.

### Animation
- **Duration:** `150ms` (fast) or `200ms` (normal). Anything slower feels sluggish for a tool.
- **Easing:** `cubic-bezier(0.4, 0, 0.2, 1)` (standard material-style). No bouncy springs; no overshoot.
- **Transitions target:** `opacity`, `color`, `border-color`, `background`, `transform: translateY`.
- **Never animate:** `box-shadow`, `scale`, filter, `width`/`height` layout.
- **Reduced motion:** `@media (prefers-reduced-motion: reduce)` collapses durations to `0.01ms`. This is enforced in every prototype page — match.

### Interactive states
- **Hover:** border shifts to `--color-primary` (cards); background shifts to `#EEF2FF` (ghost buttons); opacity `0.9` (primary buttons); `translateY(-1px)`.
- **Press / active:** `transform: translateY(1px)` on CTA buttons.
- **Focus:** visible ring `0 0 0 3px rgba(99,102,241,0.12)` on inputs; `outline: 2px solid var(--color-primary); outline-offset: 2px` on buttons. **Focus must always be visible** — a pre-delivery checklist item.
- **Disabled:** `opacity: 0.4; cursor: not-allowed; pointer-events: none`.
- **Loading:** `opacity: 0.7` + inline spinner (2.5px white ring rotating 0.7s).

### Borders & Dividers
- Card border: `1px solid #E2E8F0` (slate-200).
- List divider: `divide-y divide-slate-100` (`#F1F5F9`) — lighter than card borders for dense lists.
- **Never:** colored left-border accents on cards. Not a Label Suite pattern.

### Shadows
Only on **modals**, **dropdowns**, **toasts**, and the **login card**. Cards, panels, and nav bars are shadow-free. The system defines `--shadow-sm` through `--shadow-xl` plus a bespoke `--shadow-card` (`0 4px 24px rgba(99, 102, 241, 0.10), 0 1px 4px rgba(0, 0, 0, 0.06)`) used on the login/auth card specifically.

### Corner Radii
- `4px` badges, chips
- `8px` buttons, inputs, small cards
- `12px` panels, dashboards
- `16px` modals, login card
- `9999px` avatars, pill badges, progress bars

### Transparency & Blur
- **Modal overlay only:** `rgba(0, 0, 0, 0.5)` + `backdrop-filter: blur(4px)`.
- **Avatar border:** `2px solid rgba(99, 102, 241, 0.16)` — the single other translucency.

### Layout Rules
Three shell patterns, strictly:

- **Pattern A (Header + Content)** — Dashboard, Settings. Sticky 64px top navbar; content `max-w-7xl mx-auto px-4…8`, `pt-6` below navbar.
- **Pattern B (Sidebar + Content)** — Annotation task pages. Fixed 240px left sidebar holding label palette, task metadata, progress.
- **Pattern C (Header + Sidebar + Content)** — Profile, multi-section settings. 64px navbar + 224px sidebar + `max-w-3xl` content.

Mobile collapses Pattern A's navbar links into a hamburger drawer and adds a 56px bottom tab bar. `navbar-mobile-top-height: 64px`, `navbar-mobile-height: 84px`.

Desktop content tabs (inside page content, not main navigation) use the **underline style**:
- container: `border-bottom: 2px solid var(--color-border)`
- item: `padding: 10px 20px; font-size: 14px; font-weight: 500; color: var(--color-text-soft)`
- active: `color: var(--color-primary); border-bottom: 2px solid var(--color-primary); font-weight: 600`
- do not mix pill tabs and underline tabs across modules

---

## Iconography

### What the product uses
**Lucide / Feather-style 24×24 line icons, 2px stroke, `currentColor`.** Every icon in the prototype HTML is hand-authored inline SVG matching the Lucide/Feather visual grammar: `stroke-linecap="round"`, `stroke-linejoin="round"`, `fill="none"`, `stroke-width="2"`.

The brand mark itself is a **price tag** glyph — drawn inline in every page's navbar instead of loaded as a file, though clean SVG versions are also shipped in `assets/logo/`.

### Included in `assets/`
- `assets/logo/banner.svg` — 1280×200 README banner (Label Suite wordmark + tag icon on indigo square).
- `assets/logo/icon.svg` — 24×24 monochrome tag, stroke="currentColor".
- `assets/logo/icon-colored.svg` — 48×48 white tag on `#6366F1` rounded square.
- `assets/logo/logo-horizontal.svg` — icon + "Label Suite" wordmark at 200×48.
- `assets/logo/social-preview.svg` — social card variant.
- `assets/icons/` — UI glyphs: tag, globe, mail, lock, eye, eye-off, logout, user, settings, task, dashboard, chart, check, x, alert-circle, info, plus. All Lucide-matched.
- `assets/google-g.svg` — the Google "G" SSO multi-color mark.

### Rules
- **SVG only.** No PNG icons, no icon fonts, no emoji.
- **24×24 viewBox, 2px stroke, round caps/joins.** If you need a new icon, match this grammar.
- **`currentColor` stroke** so icons inherit text color from context.
- **`aria-hidden="true"`** by default; pair with an accessible label on the parent (`aria-label` on button, or adjacent `<span>` text).
- **Google SSO icon** is the single full-color exception; ship Google's official multi-path G.
- **Substitution:** if you need a glyph not present, fall back to [Lucide](https://lucide.dev/) via CDN — it matches the stroke weight and style exactly. Document the substitution inline as a code comment.
- **Emoji & unicode dingbats:** never. `❌` in anti-pattern tables is allowed in *documentation markdown* only.

---

## Index (root files)

| File | Purpose |
|---|---|
| `README.md` | This file. Product context, content fundamentals, visual foundations, iconography. |
| `colors_and_type.css` | Canonical CSS vars: colors, type, spacing, radii, shadows, z-index. Import this from every prototype. |
| `SKILL.md` | Agent-Skill-compatible entry point. Read when invoking this as a Claude Code skill. |
| `assets/logo/` | Logos (banner, icon, horizontal, social). |
| `assets/icons/` | 24×24 line-icon set (Lucide-style, stroke `currentColor`). |
| `assets/google-g.svg` | Google SSO mark. |
| `fonts/README.md` | Font manifest + substitution notes. |
| `preview/` | HTML cards that populate the Design System tab — one sub-concept per card (including `tabs-desktop.html`). |
| `ui_kits/web-app/` | React/JSX UI kit for the Label Suite web app (login, dashboard, task list, components). |

See each subfolder's `README.md` for more.

---

## Caveats

- **No slide template was provided.** `slides/` is intentionally not created.
- **Fonts** are 100% Google Fonts — no self-hosted TTFs needed, no substitutions flagged.
- **Pencil (`.pen`) source** is encrypted and not read here; all tokens recovered from `design/system/MASTER.md` and the prototype HTML.
- **Annotation task page (Pattern B)** is referenced in MASTER.md but the prototype never implemented it. The UI kit ships the login, dashboard, and shared components; annotation surface is not mocked.
