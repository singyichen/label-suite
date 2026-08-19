# annotation-list.html — Page-Scoped Specs

Annotator/reviewer task list. Run-mode badges (`badge-dry-run` `#6B7280/#F3F4F6/#D1D5DB`, `badge-official` `#5B21B6/#EDE9FE/#DDD6FE`), task-type badges (incl. `badge-task-type-default`), and the expanded-row result-tag chips (`.annotator-result-tag` + `result-tag-*`) all match the MASTER light/dark tables — no page overrides. The dark-mode block matches MASTER §5/§7 value-for-value (audit-verified compliant).

This page's `.status-badge` is the reference implementation of the MASTER **Status Pill** spec (MASTER quotes its shipped CSS verbatim), and `.mini-btn` / `.mini-btn-primary` follow MASTER §Mini Buttons — neither is restated here.

## Empty State (UXC-09)

`.empty` renders two modes: first-use "no data yet" (message only — this page has no creation action, so UXC-09's CTA clause is inapplicable) vs "filters matched nothing" with a clear-filters CTA (`data-testid="empty-clear-filters"`, reuses the toolbar `.clear-btn` style).

## URL State (UXC-11)

Filter/pagination state round-trips through `status`, `q`, `limit`, `offset` URL params (limit/offset per the pagination ADR; defaults omitted; `replaceState`, same pattern as the workspace's `syncUrlToUnit`). A status value the current role's filter does not offer is discarded on load.

## Sanctioned exceptions

- Page `:root` declares layout-only variables (no color tokens) — MASTER rule (d) does not apply.
- Badge hex literals are intentional: they mirror the MASTER light-value tables verbatim (rule (b) — the blue result-tag group equals the info token family).
