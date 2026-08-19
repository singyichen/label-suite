# annotation-workspace.html — Page-Scoped Specs

Annotation workspace (annotator / reviewer / arbitrator views). The toast is the first page-level implementation of the arbitrated MASTER §Toast / UXC-07 contract (no page override — MASTER applies verbatim). Result-tag chips are specced in MASTER Dark Rules 7–8; the active mini-button states follow MASTER §6 (`mini-btn-active-approve` / `mini-btn-active-reject`, semantic families only). Modals use the shared `.modal-overlay` pattern; this page toggles visibility via a `.hidden` class instead of removing the node.

## Sample Navigation Rail

`.sample-item`: full-width button row, `padding: 10px 12px`, `var(--radius-md)`, transparent 1px border; hover `var(--color-surface)`; active `var(--color-primary-soft-bg)` with `rgba(99,102,241,0.2)` border.

`.sample-index` (22px circle, `11px/700`) encodes per-sample status:

| State | Background | Text | Border |
|-------|-----------|------|--------|
| default | `var(--color-surface)` | `var(--color-text-soft)` | `var(--color-border)` |
| `.active` | `var(--color-primary)` | `var(--color-white)` | `var(--color-primary)` |
| `.status-submitted` | `var(--color-cta)` | `var(--color-white)` | `var(--color-cta)` |
| `.status-saved` | `var(--color-warning-bg)` | `var(--color-warning)` | `var(--color-warning-border)` |

Reviewer-only unit line (`.sample-unit-id` / `.sample-unit-sep` in `var(--color-ink-muted)`, annotator name `600` in `var(--color-ink)`) names the sample × annotator review unit.

## Reviewer Row Family (`rv-*`)

- `.rv-answer-chip`: `12px` ink on `var(--color-white)`, `var(--color-border)`, `var(--radius-md)`, `padding: 2px 8px`.
- `.rv-bypass-pill`: `12px/600` warning family (`--color-warning` / `-bg` / `-border`), `var(--radius-full)`.
- `.rv-source-mark`: inline entity highlight, `padding: 1px 2px`, `var(--radius-sm)`; per-type colors are applied inline from the data-layer entity palette (sanctioned).
- **Dead rule**: `.rv-source-badge` has no renderer anywhere in the module (leftover from a removed source-card design). Kept as shipped per the surgical-change rule; remove when the rv-source card area is next touched.

## Guideline File Icons

`.guideline-file-icon`: `.pdf` error soft family · `.img` primary soft family · `.md` `#8B5CF6` on `var(--color-surface)` (Color Dot violet; dark override `#A78BFA` on `var(--color-primary-soft-bg)`).

## Autosave Indicator + UXC-03

`.autosave-dot`: 8px circle — `.saved` `var(--color-cta)`, `.saving` `var(--color-warning)` with `pulse-dot` keyframes. The indicator is **visual-only** in the prototype; UXC-03 unsaved-changes protection is implemented by a `beforeunload` guard armed by work-column edits and cleared on every persistence path (save / submit / review submit / arbitration submit).

## Sequence-Tagging Type Buttons (generated)

Built in `annotation-workspace.config.js` via inline `cssText`: `padding:4px 10px`, `var(--radius-md)`, `12px/700`, 2px border in the entity-palette color; active state fills with the palette color and switches text to `var(--color-white)`. Palette colors come from the task's `outputConfigs.sequence_tagging.entities[].color` data (sanctioned deviation). Known residual: white text on bright palette values is low-contrast in light mode; the identical generated pattern also ships in `task-config.engine.js` — both are flagged as a cross-module follow-up, not covered by the annotation fix PRs.

## Sanctioned exceptions

- Page `:root` declares layout-only variables (no color tokens) — MASTER rule (d) does not apply.
- `showTaxonomyDeleteModal` stub auto-confirms (bypasses UXC-10) on a path unreachable in the prototype.
- Save/submit buttons have no loading/disabled state (UXC-06) — latent only, since prototype persistence is synchronous.
