---
name: label-suite-design
description: Use this skill to generate well-branded interfaces and assets for Label Suite — a config-driven NLP annotation platform for academic research labs — either for production code or throwaway prototypes, mocks, slides, and marketing artifacts. Contains essential design guidelines, colors, typography, fonts, brand assets, iconography, and a React UI kit for prototyping.
user-invocable: true
---

# Label Suite Design Skill

Read `README.md` for the full brand context: product overview, voice/tone, visual foundations, iconography rules, and index of every file.

## Key files in this skill
- `README.md` — **read first.** Brand + visual + content fundamentals.
- `colors_and_type.css` — canonical CSS variables. Import this from every HTML artifact.
- `fonts/README.md` — font manifest (all Google Fonts — Crimson Pro, Inter, Atkinson Hyperlegible, JetBrains Mono).
- `ui_kits/web-app/` — React/JSX UI kit: `Icon`, `Primitives`, `Navbar`, `LoginScreen`, `Dashboard`, `TaskDetail`.
- `preview/` — per-concept Design System cards (swatches, type specimens, component samples).

## Assets (single source of truth in the repo)
SVG assets live in `design/prototype/assets/` — do not duplicate them into this skill folder.
- `design/prototype/assets/logo/` — logo SVGs (horizontal, icon, colored, banner, social).
- `design/prototype/assets/icons/` — 28 Lucide-style UI icons (24×24, 2px stroke, `currentColor`).
- `design/prototype/assets/google-g.svg` — Google SSO mark.

When building a new prototype page, reference these via a relative path from the page (e.g. `../../assets/icons/check.svg`). When building a standalone artifact outside the repo, copy the needed SVGs into the artifact folder.

## Working rules
- **Import `design/prototype/assets/tokens.css`** from every prototype page — never hardcode hex values. Use `var(--color-primary)` etc. For standalone artifacts outside the repo, import `colors_and_type.css` from this skill folder instead.
- **Flat Design.** Allowed hover effects: opacity, color shift, `translateY(-1px)`. No scale, no shadow growth, no gradients.
- **Bilingual (zh-TW / EN) peers.** Chinese uses `你` not `您`. Line-heights: EN 1.6, ZH 1.8.
- **Sentence case** for buttons; no emoji in UI; no "We"; no exclamation marks in primary flows.
- **Iconography:** reuse `assets/icons/` or substitute from [Lucide](https://lucide.dev/) — never draw new SVGs, never use emoji or unicode dingbats.
- **Shadows only on** modals, dropdowns, toasts, and the login card. Everything else is flat white with `1px solid #E2E8F0`.
- **Radii:** 4 badges · 8 buttons/inputs · 12 cards · 16 modals · 9999 pills.
- **Motion:** 150–200 ms · `cubic-bezier(0.4, 0, 0.2, 1)` · honor `prefers-reduced-motion`.

## Prototype consistency requirements (Label Suite repo)

When creating a **new prototype page** under `design/prototype/pages/`, do not invent a new page shell from scratch. Mirror the structure used by existing prototype pages (e.g. `dashboard`, `user-management`, `task-list`) and keep cross-page behavior consistent.

### Required integration for every new page

1) Shared sidebar (same pattern as existing pages)
```html
<div id="sharedSidebarMount"></div>
<script src="../shared/sidebar.js"></script> <!-- adjust relative path -->
<script>
  window.LabelSuiteSharedSidebar.mountSidebar({
    mountId: 'sharedSidebarMount',
    activeNav: '...', // dashboard | task-management | annotation | dataset | admin | profile
    dashboardHref: '../dashboard/dashboard.html',
    taskHref: '../task-management/task-list.html',
    profileHref: '../account/profile.html',
    loginHref: '../account/login.html',
    brandHref: '../dashboard/dashboard.html',
  });
</script>
```

2) Global language toggle via shared sidebar helpers
- Use centralized JS i18n object (`zh` / `en`) and explicit `applyLang()`.
- Read initial language from `window.LabelSuiteSharedSidebar.getStoredLang()`.
- Apply language with `window.LabelSuiteSharedSidebar.applyGlobalLanguage(...)`.
- Do not use `data-i18n-*` attribute scanning pattern.

3) Analytics runtime + baseline tracking
```html
<script src="../../assets/analytics.js"></script> <!-- adjust relative path -->
<script>
  window.LabelSuiteAnalytics.init({ page: 'your-page-id' });
  window.LabelSuiteAnalytics.trackPageView('your-page-id', getTrackingContext);
</script>
```
- Track language switch (`prototype_lang_switched`).
- Track primary CTA intent (`prototype_cta_clicked` or page-specific `prototype_*`).
- Track success / failure outcomes for the page's primary flow.
- Reuse shared helpers from `analytics.js`; do not reimplement analytics utilities.

### Pre-delivery checklist for new prototype pages
- [ ] Uses shared sidebar mount + `mountSidebar(...)` (not duplicated custom navbar shell).
- [ ] Uses shared global language pattern (`getStoredLang` + `applyGlobalLanguage` + centralized `i18n` object).
- [ ] Imports `assets/analytics.js`, calls `init(...)`, and sends `trackPageView(...)`.

## When this skill is invoked
If the user invokes this skill without any specific task, ask what they want to build or design. Ask a few clarifying questions about audience, flow, and variations, then act as an expert Label Suite designer.

### If the output is a visual artifact (slide, mock, throwaway prototype)
- Copy the needed assets from this skill into the artifact folder.
- Write a static HTML file that imports `colors_and_type.css` and uses the design tokens directly.
- If building an interactive prototype, import the relevant JSX components from `ui_kits/web-app/`.

### If the output is production code
- Lift the tokens from `colors_and_type.css` into the codebase's own style layer.
- Recreate components using the codebase's component patterns — but match the visual grammar exactly (flat, indigo + emerald, Crimson/Inter, Lucide icons).

## Quick token reference

```css
/* Core palette */
--color-primary:   #6366F1;   /* Indigo 500 */
--color-cta:       #10B981;   /* Emerald 500 */
--color-surface:   #F5F3FF;   /* Violet 50 page bg */
--color-white:     #FFFFFF;
--color-ink:       #1E1B4B;   /* Indigo 950 body */
--color-border:    #E2E8F0;   /* Slate 200 */

/* Type */
--font-serif-display: 'Crimson Pro', 'Noto Serif TC', Georgia, serif;
--font-sans:          'Inter', 'Noto Sans TC', -apple-system, sans-serif;
--font-mono:          'JetBrains Mono', ui-monospace, Menlo, monospace;

/* Motion */
--dur-fast: 150ms;  --dur-normal: 200ms;
--ease-standard: cubic-bezier(0.4, 0, 0.2, 1);
```

See `README.md` for the full token list and rationale.
