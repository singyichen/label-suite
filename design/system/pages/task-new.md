# task-new.html — Page-Scoped Specs

Task creation wizard. The components below are shipped by the shared task-config engine (`task-config.css` + `task-config.engine.js`); task-new is the primary consumer, and task-detail's settings tab reuses them unchanged — specs live here to keep one source per component family.

## Regression Slider — dimension palette

Each regression dimension is colored through a scoped custom property, cycled by index:

```css
.regression-slider-control { --regression-dimension-color: #4F46E5; }
.regression-dimension-color-0 { --regression-dimension-color: #4F46E5; }
.regression-dimension-color-1 { --regression-dimension-color: #0369A1; }
.regression-dimension-color-2 { --regression-dimension-color: #047857; }
.regression-dimension-color-3 { --regression-dimension-color: #B45309; }
.regression-dimension-color-4 { --regression-dimension-color: #BE185D; }
.regression-dimension-color-5 { --regression-dimension-color: #7E22CE; }
.regression-dimension-color-6 { --regression-dimension-color: #C2410C; }
.regression-dimension-color-7 { --regression-dimension-color: #0F766E; }
```

**Sanctioned deviation** from MASTER §Color Dot: this palette is not the `ENTITY_COLORS` set. Slider dimensions drive text (`color`), `accent-color`, borders, and focus rings, so the palette uses 600/700-grade hues that hold 4.5:1 contrast as text on white — Color Dot's fill-grade hues do not. Recorded by the #183 audit; do not "fix" to Color Dot.

Structure: shell grid `auto minmax(0, 1fr) 68px`; value bubble (`regression-slider-value`) bordered in the dimension color with a rotated `::after` arrow; numeric input focus ring `box-shadow: 0 0 0 3px color-mix(in srgb, var(--regression-dimension-color) 18%, transparent)`; 9px dimension dot beside the capitalized title.

## Taxonomy Tree Editor + Selector

Hierarchical label-set editor plus a pick-from-tree selector, both engine-generated.

- **Tree editor**: rows are `taxonomy-treeitem` / `taxonomy-node-row`; disclosure + action buttons share a bordered 28px square (`taxonomy-action-btn`, 36px on mobile); the danger action hovers to the error token family. Children indent 12px behind a 1px `var(--color-border)` left rail with a 7px horizontal connector per row.
- **Selector (desktop)**: `taxonomy-selector-trigger` (min-height 44px, primary focus ring) opens `taxonomy-selector-dialog` as an absolute dropdown — `z-index: 40`, `max-height: min(70vh, 480px)`, sticky search header, checkbox rows (14px box, primary fill when checked).
- **Selector (mobile ≤ 768px)**: the same dialog becomes a fixed bottom sheet — `z-index: 500`, `bottom: 0`, `max-height: 78vh`, top-only `var(--radius-xl)` radius, and a 44×4px drag-handle bar drawn by `.taxonomy-selector-sticky::before`.

**Known deviation (unarbitrated)**: the bottom sheet's `z-index: 500` sits on the tooltip tier instead of the modal tier (`--z-modal: 300`). Flagged by the #183 audit; keep as shipped until the z-scale arbitration assigns a sheet tier.

## Entity-Type Dropdown (engine-generated, ER/RE preview)

Generated inline by `task-config.engine.js` for relation triples; theme-aware via `var()` in inline styles (fixed in #183 task-management PR 2):

- Trigger: `border: 1.5px solid var(--color-primary)`, transparent background, primary text, `border-radius: 4px`, `padding: 2px 6px`, `0.7rem` bold.
- Menu: `background: var(--color-white)`, `border: 1px solid var(--color-border)`, `border-radius: 8px`, `min-width: 180px`, `max-height: 220px` scroll, `z-index: 100`, anchored above the trigger (`bottom: calc(100% + 4px)`).
- Items: `padding: 6px 14px`, `0.8rem`, hover `var(--color-slate-50)`; a 14px leading span carries the `✓` check on the selected type.
