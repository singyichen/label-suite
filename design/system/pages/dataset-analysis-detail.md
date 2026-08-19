# dataset-analysis-detail.html — Page-Scoped Specs

Per-task analysis detail with Stats / Quality tabs. Tabs carry full
`tablist`/`tab`/`aria-selected` + `tabpanel`/`aria-controls` wiring, the
breadcrumb renders above the page header (MASTER order), and all icons are
inline Lucide SVGs (ADR-030) — the primary-metric star chip
(`.iaa-primary-star`) and speed-anomaly flag (`.speed-flag`) size their SVG
children from the wrapper class.

## Task registry (mirror + scenario)

`TASK_META` mirrors the list registry one-to-one (`T001`–`T013`, IAA data
consistent with each list row) and additionally hosts spec-scenario fixtures
re-keyed to `T101`–`T109` (reachable only by test/direct URL — e.g. the
FR-024 composite case). `registry-mirror.spec.ts` locks the two registries
together. An unknown `task_id` falls back to `DEFAULT_TASK_ID`.

## Panel loading (UXC-05)

Both partial-load catch paths render one shared DOM-built error
(`.panel-load-error`: localized title, subtitle, and a reload action) — no
hardcoded-language strings. The low-consistency count badge is derived at
render time from the mounted table's row count, so the seven quality
partials carry no hardcoded copy of it.

## Stats charts

SVG charts color exclusively through tokens. multi_dim renders its two
scoring dimensions as a two-series palette — Valence bars fill
`var(--color-primary)`, Arousal bars fill `var(--color-cta)` — a sanctioned
page palette (same arbitration shape as the dashboard role palette): the
two series need distinct identities and both draw from existing tokens.
Single-series hbar charts converge on the `--color-primary` opacity ramp.

## Known deferrals

- Quality/stats partials still mix two i18n mechanisms: older fragments use
  element-id + `setText` (SIMPLE_IDS), newer ones use `data-i18n`
  attributes. Runtime behavior is equivalent; converging on `data-i18n` is
  deferred follow-up, not silent drift. When adding partial markup, static
  text under a SIMPLE_IDS id must copy the flat-key canonical value, since
  runtime overwrites it.
- URL sync (`tab`, `task_id`) uses `history.replaceState`, same stance as
  the list page (see dataset-analysis-list.md).
