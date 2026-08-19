# dataset-analysis-list.html — Page-Scoped Specs

User-facing dataset analysis list (analysis-eligible tasks with IAA status). The
dense table follows the MASTER **Table dense variant**, task-type badges
(including `badge-task-type-default`) mirror the MASTER light/dark tables
verbatim, pagination implements the MASTER ellipsis contract
(`.page-ellipsis` mirrors `.page-btn` metrics), and the toast is a UXC-07
implementation (top-center, semantic variants, manual close, Error never
auto-dismisses) — none of these are restated here.

## Empty State (UXC-09)

The in-table empty row (`.empty-row` with `.empty-title` / `.empty-desc`)
renders two localized modes: first-use "no data yet" vs "filters matched
nothing". Both are message-only: the page has no creation action (UXC-09's
CTA clause is inapplicable, same stance as annotation-list), and for the
no-results mode the toolbar's clear-filters `.clear-btn` remains visible as
the recovery affordance. Load failure renders a distinct `.error-row`
(`.error-title` / `.error-desc` + a `.clear-btn`-styled retry, UXC-05), so
a valid-but-empty membership response never looks like a failed load.

## URL State (UXC-11)

Filter/pagination state round-trips through `keyword`, `output_type`,
`limit`, `offset` URL params (limit/offset per the pagination ADR; defaults
omitted; legacy/invalid values normalized on load; keyword sync debounced).
Sync uses `history.replaceState` — F5/share round-trips work; back/forward
filter history (pushState) is a deliberate cross-module deferral, matching
annotation-list and the workspace's `syncUrlToUnit`.

## Sanctioned exceptions

- Page `:root` declares layout-only variables (`--navbar-mobile-*`) — MASTER
  rule (d) does not apply.
- `free_text` outputs render with `badge-task-type-pairs` (emerald Pairs
  identity). This mirrors task-list.data.js — the mapping is a cross-module
  convention, so defining a dedicated free_text badge is a MASTER-level
  decision deferred from the per-module fix PRs (issue #183 audit finding).
- Task-type badge hex literals mirror the MASTER light/dark value tables
  verbatim (rule (b)); the per-page duplication across three list pages is a
  known extraction candidate, not a drift.
