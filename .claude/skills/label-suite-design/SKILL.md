---
name: label-suite-design
description: Use this skill to generate well-branded interfaces and assets for Label Suite — a config-driven NLP annotation platform for academic research labs — either for production code or throwaway prototypes, mocks, slides, and marketing artifacts. Contains essential design guidelines, colors, typography, fonts, brand assets, and iconography.
user-invocable: true
---

# Label Suite Design Skill

Read `README.md` for the full brand context: product overview, voice/tone, visual foundations, iconography rules, and index of every file.

## Key files in this skill
- `README.md` — **read first.** Brand + visual + content fundamentals.
- `colors_and_type.css` — canonical CSS variables (light theme). Import this from every local HTML artifact.
- `artifact-tokens.css` — dual-theme tokens for claude.ai Artifacts, mirroring canonical `design/prototype/assets/tokens.css`. Copy inline, never `@import`.
- `artifact-icons.html` — CSP-safe inline Lucide sprite snippet for claude.ai Artifacts.
- `fonts/README.md` — font manifest (all Google Fonts — Crimson Pro, Inter, Atkinson Hyperlegible, JetBrains Mono).
- `preview/` — per-concept Design System cards (swatches, type specimens, component samples).

## Assets (single source of truth in the repo)
SVG assets live in `design/prototype/assets/` — do not duplicate them into this skill folder.
- `design/prototype/assets/logo/` — logo SVGs (horizontal, icon, colored, banner, social).
- `design/prototype/assets/icons/` — 28 Lucide-style UI icons (24×24, 2px stroke, `currentColor`).
- `design/prototype/assets/google-g.svg` — Google SSO mark.

When building a new prototype page, reference these via a relative path from the page (e.g. `../../assets/icons/check.svg`). When building a standalone artifact outside the repo, copy the needed SVGs into the artifact folder.

## Upstream design system references
Before generating any page, read these two files for the authoritative rules:
- **`design/system/MASTER.md`** — visual tokens, component specs, anti-patterns, pre-delivery checklist.
- **`design/system/ux-conventions.md`** — cross-feature behavioral patterns (UXC-01–UXC-11): state initialization, wizard persistence, unsaved changes protection, validation timing, error presentation, submit behavior, toast duration, loading/empty states, destructive confirmation, pagination & URL state.

Every prototype page must comply with both files. When this skill's Working rules overlap with MASTER.md or ux-conventions.md, the upstream files are the source of truth.

### Conditional: component inventory
Read **`design/system/inventory.md`** only when introducing a UI element that does not already appear in existing prototype pages. It tracks which components exist, their definition status in MASTER.md, and the maintenance workflow for adding new ones. After adding a new component to a prototype, update inventory.md (add the component, set its status, list the page it appears on).

## Working rules
- **Import `design/prototype/assets/tokens.css`** from every prototype page — never hardcode hex values. Use `var(--color-primary)` etc. For standalone artifacts outside the repo, import `colors_and_type.css` from this skill folder instead — except claude.ai Artifacts, which cannot import anything (see the Artifact section below).
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

### Anti-pattern audit (after prototype, before UI/UX re-verification)

After generating or substantially revising prototype pages, walk each affected page under `design/prototype/pages/**/*.html` against **`design/system/anti-pattern-checklist.md`** (anti-AI-boilerplate rules A1–F2). For every violation, record: page · rule ID · what was found · remedy direction using existing MASTER.md tokens. Fix violations in the prototype, or document the rationale for keeping them, before handing the page to UI/UX re-verification (see "Design flow ownership and UI/UX re-verification" below). Do not invent new tokens as remedies — raise token gaps against MASTER.md instead. `design/wireframes/` is frozen (2026-08-20, issue #183) and is read-only reference — this audit does not hand off to `/pencil-wireframe` for new wireframe work or a re-freeze.

## Design flow ownership and UI/UX re-verification

This section sits inside `docs/sdd-workflow.md` §2 stage `[3] prototype` → `[3d] Frontend Ready Gate`; it adds no new gate and does not reorder SDD's Red/Green ownership (`senior-qa` owns the Red contract; the implementation agent owns Green — see CLAUDE.md "TDD (REQUIRED)"). On conflict between any two steps below, or with `docs/sdd-workflow.md`, escalate to team-lead per #1106's hand-off contract rather than resolving silently.

Applicable order and ownership for a page-scoped feature:

1. **UX goals & journeys** — `senior-uiux` (role split per #1106): user goals, information architecture, role/task/state matrix, reachability paths, error-recovery flows.
2. **UI presentation proposal** — `senior-visual-designer` consumes (1) and applies tokens, hierarchy, density, component states — never the reverse.
3. **Prototype shell** — static shell per "Prototype consistency requirements" above; no target selectors or behavior yet.
4. **Red** — `senior-qa` commits the expected-failure Playwright test against the shell.
5. **Green** — `senior-frontend` implements against the committed Red contract; must not weaken or rewrite it.
6. **Page design** — finish visual polish; the anti-pattern audit above runs here, before step 7.
7. **UI/UX re-verification** — `senior-uiux` + `senior-visual-designer`, after implementation ships (rules below).
8. **Frontend Ready Gate** — the 9-item checklist in `docs/sdd-workflow.md` §2, owned by the main agent.

### Deliverable contracts

- **UX (`senior-uiux`) delivers**: entry point, task goal, steps, post-completion destination, error recovery, permission boundary.
- **UI (`senior-visual-designer`) delivers**: visual hierarchy, density, token mapping, responsive/i18n/theme coverage, component states.

### Review matrix

Derive the matrix at review time from the canonical spec, `design/system/user-path-map.html`, and `design/system/screen-inventory.md` — never write a hand-made, site-wide page list. One row = one page × role × state combination actually reachable per those three sources.

Required columns: page, role, state, viewport, language (zh-TW/en), theme (light/dark), URL params, fixture/demo data, then the evidence fields — screenshot path, operation result, `file:line`, evidence class (`expert evaluation` / `tool rule result` / `real-user data`, per `senior-uiux`'s existing "Method classification"), matched existing issue.

Required coverage per page: loading / empty / error / disabled, keyboard / focus, zh-TW / en, light / dark, desktop / narrow — each is either covered or marked N/A with a reason; never leave a cell silently blank.

Example row (pilot: task-detail, #1108), values grepped from live files, not invented:

| page | role | state | viewport | language | theme | URL params | fixture/demo data | screenshot | operation result | file:line | evidence class | matched issue |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| task-detail (`overview` tab) | project_leader | default | desktop | zh-TW | light | `?task_id=T001` | `task-detail.data.js` `T001`: `single_label`, label options `positive`/`neutral`/`negative` | pending (no browser tool available this run) | pending | `design/prototype/pages/task-management/task-detail.html:2288` `id="tabOverview"`; `specs/task-management/014-task-detail/spec.md:554` FR-001 | tool rule result (static grep only — not yet a live operation) | — |

### Re-verification rules

- Observe the rendered page and operate the core journey; use the same scenario before and after the change.
- When no browser tool is available for a given run, say so explicitly and record `pending` — never claim a pass.
- Every tool-rule finding is re-read in code and matched against existing issues before being recorded.
- Distinguish `expert evaluation` (cognitive walkthrough), `tool rule result`, and `real-user data` — never present one as another.

### Future hook (not installed by this skill)

#936's daily-critique / fixed-journey regression concept may plug into step 7 once the maintainer authorizes running it (#936 is currently `blocked` pending that decision). This skill does not install any tool, does not change #936's acceptance criteria, and does not bypass its open execution limits.

## When this skill is invoked
If the user invokes this skill without any specific task, ask what they want to build or design. Ask a few clarifying questions about audience, flow, and variations, then act as an expert Label Suite designer.

### If the output is a local visual artifact (slide, mock, throwaway prototype)
- Copy the needed assets from this skill into the artifact folder.
- Write a static HTML file that imports `colors_and_type.css` and uses the design tokens directly.
- If building an interactive prototype, reuse markup from the existing pages under `design/prototype/pages/` and the component samples in `preview/`.

### If the output is a claude.ai Artifact (Artifact tool)
Artifacts run under a strict CSP that blocks **all** external requests — `@import`, `<link>`, CDN scripts, and webfonts fail silently. Everything must be inline in one HTML file.

- **Tokens:** copy the contents of `artifact-tokens.css` into the artifact `<style>`. Do not `@import` it, and do not reuse `colors_and_type.css` (its Google Fonts `@import` dies silently under the CSP).
- **Dual theme is mandatory:** keep all four token blocks (`:root`, `@media (prefers-color-scheme: dark)`, `:root[data-theme="dark"]`, `:root[data-theme="light"]`) — the viewer's theme toggle stamps `data-theme` on the root and must beat the media query in both directions. Style components only through the tokens. Values mirror the canonical `design/prototype/assets/tokens.css` (light + dark per MASTER.md §Dark Mode Tokens); if they diverge, tokens.css wins.
- **Fonts:** rely on the system-fallback chains already in `artifact-tokens.css`; never link a webfont.
- **Icons:** paste the inline Lucide sprite from `artifact-icons.html` and reference with `<svg class="ic"><use href="#i-name"/></svg>`. Extend it only with path data copied from lucide.dev (ADR-030) — no emoji, no hand-drawn SVGs, no vendor logos (substitute semantic Lucide equivalents). Sole exception: the Google SSO mark — inline `design/prototype/assets/google-g.svg` when the artifact shows the login/SSO UI (the design system's single full-color vendor mark).
- **Color discipline:** emerald (`--color-cta`) is reserved for outcomes and CTA accents; indigo carries structure and navigation.
- **Disclosure footer:** end every data-bearing artifact with a source note — where the content came from (repo paths, spec versions) — and mark anything illustrative or unverified as such (Source-Verify gate).

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
