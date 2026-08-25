# Anti-AI-Boilerplate Design Audit Checklist

> Purpose: catch "AI boilerplate" defaults — the on-distribution layouts, colors, and motion every LLM was trained into — before a prototype page is frozen into wireframes.
> Scope: Label Suite prototype pages (`design/prototype/pages/**/*.html`). This is a **data-admin back-office tool**; marketing-page rules (hero shapes, landing gradients, nav/footer fingerprints, pricing grids) from the source material are intentionally excluded.
> Relationship to existing docs: this checklist complements — never overrides — `MASTER.md` (tokens, component specs, §Anti-Patterns, §Pre-Delivery Checklist) and `ux-conventions.md` (UXC-01–11). Where a rule overlaps, the upstream file is the source of truth.

**Sources.** Rules marked *hallmark* are adapted from Nutlope's [hallmark](https://github.com/Nutlope/hallmark) skill (`references/slop-test.md` gate numbers, `references/anti-patterns.md` named tells). Rules marked *emilkowalski* are adapted from [emilkowalski/skills](https://github.com/emilkowalski/skills) (`review-animations` standards). Both are **research references only — not installed dependencies** (issue #354 item 5). Rules marked *general principles* have no direct upstream rule; they were derived for this codebase.

**How to audit.** Walk each target page against every item. Record each violation as: `page · rule ID · what was found · remedy direction (token-level)`. Remedies must use existing MASTER.md tokens — never invent a new token system.

---

## A. Layout & structure

### A1. The settings toggle-card template
- **Tell:** a white rounded card containing exactly title + one-line description + toggle (or input) — repeated for every setting. This is the LLM-default "settings block" and instantly reads as generated UI.
- **Instead:** integrate the control into the page's existing form grid (`.field-group` label/control/hint rhythm, `--space-md` gaps) instead of wrapping each control in its own card shell. Reserve card chrome (`--radius-lg`, `1px solid var(--color-border)`) for genuine content groupings, not per-control decoration. See the worked example below.
- **Source:** general principles (issue #354's shipped example); card-overuse direction informed by hallmark anti-patterns "Card-in-card" and "Icon-tile feature card".

### A2. Card nested inside card
- **Tell:** a bordered/rounded card sitting inside another bordered/rounded card — double chrome signals template assembly, not hierarchy.
- **Instead:** flatten to one card level; separate inner groups with `.panel-divider` (`1px` rule on `--color-border-muted`) or spacing steps (`--space-lg` vs `--space-md`), not nested borders.
- **Source:** hallmark slop-test gate 4; anti-patterns "Card-in-card".

### A3. Three-equal-column icon-above-heading tiles
- **Tell:** a 3-equal-column grid of tiles, each icon-on-top + heading + blurb — the canonical AI feature grid.
- **Instead:** back-office summaries should use the Metric KPI Tile or Dashboard Summary Card specs from MASTER.md, sized by content priority (unequal spans, lead metric larger), with Lucide icons inline beside labels rather than enthroned above them.
- **Source:** hallmark slop-test gate 3; anti-patterns "The 3-column feature grid", "Icon-tile feature card".

### A4. Thick colored side-stripe card
- **Tell:** a card with a fat colored left/right border stripe as its only differentiator.
- **Instead:** signal state with the Semantic State Colors triads (`--color-error`/`-bg`/`-border` etc.) applied as full bg + border + text per MASTER.md badge/banner specs — not an ad-hoc stripe.
- **Source:** hallmark slop-test gate 5; anti-patterns "The side-stripe card".

### A5. Undifferentiated section rhythm
- **Tell:** every section separated only by identical whitespace — no rule, no surface shift, no weight change; the page scans as a uniform stack of same-sized boxes.
- **Instead:** vary the rhythm deliberately: `.panel-divider` rules, `--color-surface` vs `--color-white` surface alternation, and the Typography Scale (Page Title 28px → H3 18px) to make primary/secondary readable in 2 seconds.
- **Source:** hallmark slop-test gate 9.

### A6. Centred-everything
- **Tell:** headings, empty states, forms, and CTAs all centred on the vertical axis by default — centring as avoidance of layout decisions.
- **Instead:** back-office content is left-aligned in reading order; centring is reserved for the deliberate exceptions already specced (auth card, State Panel, modal). Follow the Page Shell Patterns in MASTER.md.
- **Source:** hallmark anti-patterns "Centred everything" (marketing-hero gates 6/44 themselves excluded as out of scope).

## B. Color & token discipline

### B1. Gradient surfaces and gradient text
- **Tell:** purple-to-blue (or any) gradient backgrounds, gradient pill buttons, `background-clip: text` headlines — the single strongest AI-generated tell, and doubly tempting with an indigo brand.
- **Instead:** flat design is already law (SKILL.md working rules): solid `--color-primary` / `--color-cta` fills, `--color-white` cards on `--color-surface` ground. No gradients anywhere.
- **Source:** hallmark slop-test gate 2; anti-patterns "The purple-gradient hero", "The gradient headline".

### B2. Accent overuse
- **Tell:** the accent color used as filler — large accent-tinted panels, multiple emerald buttons per view, accent headings — instead of as emphasis.
- **Instead:** `--color-cta` (emerald) is reserved for the single primary action and outcome signals; indigo (`--color-primary`) carries structure and navigation; everything else stays neutral (`--color-ink`, `--color-text-soft`, `--color-border`). One `btn-primary` per page (MASTER.md Button Variants).
- **Source:** hallmark slop-test gate 23 (accent ≤ ~5% of viewport), adapted to Label Suite's indigo/emerald split.

### B3. Mid-render token improvisation
- **Tell:** one-off hex/rgb values or ad-hoc font stacks appearing mid-page instead of token references — the model picked the system, then forgot it and freestyled.
- **Instead:** every color and font must resolve to a `tokens.css` variable (`var(--color-*)`, `var(--font-*)`). If a value is genuinely missing, raise it against MASTER.md's token tables rather than inlining it.
- **Source:** hallmark slop-test gate 48; anti-patterns "Mid-render token improvisation".

### B4. Pure black / pure white as base
- **Tell:** `#000000` text or `#FFFFFF` ground used raw — flat, unanchored neutrals that ignore the brand's tinted palette.
- **Instead:** Label Suite's neutrals are already hue-anchored: ink is `--color-ink` (indigo-950), page ground is `--color-surface` (violet-50), card surface is `--color-white` via token (which re-maps in dark mode). Raw hex `#000`/`#fff` also breaks dark mode (MASTER.md Pre-Delivery Checklist).
- **Source:** hallmark slop-test gate 7; anti-patterns "Pure black, pure white".

## C. Typography

### C1. Italic headings
- **Tell:** italic display/heading type — above all a single italicised emphasis word inside an upright headline — is a top AI tell.
- **Instead:** headings stay roman in `--font-serif-display` (Crimson Pro); emphasis comes from weight or `--color-primary`, per the Typography Scale. Italic only as body-copy emphasis inside running text.
- **Source:** hallmark slop-test gate 38a; anti-patterns "Italic headers".

### C2. Unbounded prose measure
- **Tell:** long-form reading text (annotation guidelines, source passages) running full container width — 100+ character lines that lose the eye.
- **Instead:** cap prose containers at a 45–75ch measure; annotation reading panels additionally use `--font-sans-reading` (Atkinson Hyperlegible) and ZH `line-height: 1.8` per MASTER.md Bilingual Typography.
- **Source:** hallmark slop-test gate 25.

### C3. Data tables without tabular numerals
- **Tell:** counts, percentages, and IAA scores set in proportional figures — columns of numbers that wobble and misalign, a sign nobody looked at the rendered table.
- **Instead:** apply `font-variant-numeric: tabular-nums` (or `--font-mono` where MASTER.md already specs it, e.g. VA chips) to numeric table columns, KPI tiles, and score badges.
- **Source:** hallmark anti-patterns "Tabular data without tabular-nums".

## D. Motion & micro-interactions

### D1. `transition: all`
- **Tell:** `transition-all` / `transition: all` — unbounded property animation, the default the model reaches for when it hasn't decided what should move.
- **Instead:** name the properties: `transition: border-color var(--dur-fast) var(--ease-standard), color var(--dur-fast) var(--ease-standard)` — as MASTER.md component specs already do.
- **Source:** hallmark slop-test gate 10; anti-patterns "`transition-all`"; also emilkowalski review-animations escalation trigger.

### D2. Bouncy / overshoot easing on UI state changes
- **Tell:** elastic `cubic-bezier(0.34, 1.56, …)` bounces on buttons, toggles, modals, tooltips — motion that performs instead of responds. `ease-in` on entrances is the sibling tell (it delays the moment the user watches most).
- **Instead:** all UI transitions use `--ease-standard` at `--dur-fast`/`--dur-normal` (150/200ms). No overshoot easings in a data tool.
- **Source:** hallmark slop-test gate 12; emilkowalski review-animations standards 3 ("Responsive easing") and 4 ("Sub-300ms UI").

### D3. Stacked or uniform hover effects
- **Tell:** the same `hover:scale-105` on every element, or one element combining translate + scale + shadow + color on hover — decoration masquerading as feedback.
- **Instead:** the sanctioned hover grammar is opacity, color shift, or `translateY(-1px)` (max `-2px` on cards) — pick **one** per element (SKILL.md flat-design rules; MASTER.md §Anti-Patterns "Layout-shifting hovers").
- **Source:** hallmark slop-test gates 11 and 13.

### D4. Animating layout properties
- **Tell:** transitions on `width`, `height`, `top`, `left`, `margin`, `padding` — layout thrash that drops frames on dense tables.
- **Instead:** animate `transform` and `opacity` only; use `max-height`-free patterns (grid-rows, clip) for expand/collapse where needed.
- **Source:** hallmark slop-test gate 14; emilkowalski review-animations standard 7 ("GPU-only properties").

### D5. Fading-in focus rings
- **Tell:** the `:focus-visible` ring transitioning into existence — keyboard users need the indicator instantly, not after 200ms.
- **Instead:** focus rings appear with no transition (MASTER.md focus spec: `focus:ring-2 focus:ring-primary`); keep transitions on hover/color only.
- **Source:** hallmark slop-test gate 15.

## E. States & affordances

### E1. Incomplete interactive states
- **Tell:** components shipped with only default + hover — no `:focus-visible`, `:active`, or `:disabled` styling; the "happy screenshot" giveaway.
- **Instead:** every interactive element covers default / hover / focus-visible / active / disabled, using the MASTER.md state rows (`btn-loading`, `btn-disabled`, input Focus/Error/Readonly/Disabled).
- **Source:** hallmark slop-test gate 26.

### E2. Form-state slop
- **Tell:** any of: border-width changing between input states (layout shift), focus ring built from `border` instead of `outline`/ring, input height ≠ adjacent button height, helper-text slot collapsing when empty (appearing errors push the page down), disabled signalled by opacity alone.
- **Instead:** keep `border-width: 1px` across states and move state to `border-color` + ring (MASTER.md `.input:focus` box-shadow spec); share control heights within a form row; reserve the hint slot (the shipped `.field-hint-placeholder` pattern); disabled = opacity + `cursor: not-allowed` + native `disabled` attribute.
- **Source:** hallmark slop-test gate 39 (all five sub-checks).

### E3. Hover-only affordances
- **Tell:** row actions, delete buttons, or tooltips reachable only by mouse hover — invisible to keyboard and touch.
- **Instead:** every hover-revealed affordance is also focusable and visible on `:focus-within`; tooltips bind to focus with no delay (hover may delay, focus must not).
- **Source:** hallmark anti-patterns "Hover-only affordances"; slop-test gate 17 (tooltip focus-delay 0ms).

### E4. Celebratory toast for a visible effect
- **Tell:** a success toast announcing an action whose result is already visible on screen (a row appearing, a toggle flipping) — noise dressed as feedback.
- **Instead:** reserve toasts for failures and invisible effects (background jobs, saves without visible change). Where a toast is warranted, UXC-07 (`ux-conventions.md`) governs duration and position — it remains the source of truth.
- **Source:** hallmark slop-test gate 16, subordinated to UXC-07.

## F. Content & iconography

### F1. Placeholder clichés in seed data
- **Tell:** "Jane Doe / John Smith" annotators, "Acme" datasets, "Lorem ipsum" passages — template residue that undermines a research demo.
- **Instead:** seed prototype data with domain-plausible content: realistic zh-TW/EN annotator names, NLP corpus names, believable IAA values consistent with the page's story (and consistent with Source-Verify: never fabricate numbers presented as real benchmarks).
- **Source:** hallmark slop-test gate 19.

### F2. Emoji icons and mixed icon sets
- **Tell:** emoji glyphs (✨ 🚀 ✅) as UI icons, or Lucide + Heroicons + Material mixed on one page.
- **Instead:** Lucide is the single icon library (ADR-030; MASTER.md §Anti-Patterns "Emojis as icons"): reuse `design/prototype/assets/icons/` or substitute from lucide.dev — never draw new SVGs.
- **Source:** hallmark slop-test gate 30; anti-patterns "Generic emoji as feature icon", "Mismatched icon sets" — restating the existing ADR-030/MASTER.md rule as an audit item.

---

## Worked example — the 資料隔離 toggle card (rule A1)

**Shipped instance:** task-management sampling settings (`design/prototype/pages/task-management/task-detail.panels/overview.html`, `.isolation-wrap`): a boxed row holding `toggle-title` 「是否啟用資料隔離（試標 / 正式）」 + `toggle-desc` one-liner + a right-aligned toggle switch, sitting below the sampling field grid behind a divider.

**Why it violates A1:** it is the verbatim LLM "settings card" template — title + description + toggle in its own chrome — visually disconnected from the `.field-group` rhythm directly above it, even though it is just another sampling setting with the same edit/save lifecycle.

**Remedy direction (audit output format — no redesign here):** fold the control into the sampling `.field-group` grid: label 「資料隔離」 as a `.field-label` peer of 抽樣方式/最少標記者數, demote the description to a `.field-hint`, keep the toggle as the control column, and let the existing `risk-warning` occupy the reserved hint slot (E2) so its appearance doesn't shift layout. Spacing via `--space-md`; no extra card chrome. Any actual change goes through the SDD pipeline for spec 014 — this checklist only records the violation and direction.

---

## Changelog

| Version | Date | Summary |
|---------|------|---------|
| v1.0.0 | 2026-08-25 | Initial checklist: 23 rules (A1–F2) curated from hallmark's 57-gate slop test + named anti-patterns and emilkowalski's review-animations standards, filtered to data-admin back-office scope; 資料隔離 toggle-card worked example (issue #354 items 1–2) |
