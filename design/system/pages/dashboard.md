# dashboard.html — Page-Scoped Specs

Role-scenario dashboard. Shared chrome follows MASTER without overrides: `.metric` is the reference implementation MASTER's **Metric KPI Tile** spec quotes verbatim, `.scenario-pill` is the shipped source of MASTER's **Prototype-Only State Switcher**, `.page-main-title` uses the specced Page Title scale (Crimson Pro 28px/700/1.3 via `--font-serif-display`), and all badge families (`badge-dry-run` / `badge-official` / `badge-task-type-*` / semantic `badge-info|warning|success|error`) match the MASTER light/dark tables — none are restated here.

## Role Accent System (page-specific)

The three workflow role cards use a fixed accent trio — **emerald** (project leader), **violet** (annotator), **indigo** (reviewer) — applied consistently across `role-avatar--*`, `step-icon--*`, and `btn-*`:

| Accent | Light bg / fg | Dark treatment |
|--------|---------------|----------------|
| emerald | `#D1FAE5` / `var(--color-cta-hover)` | avatar/icon `#059669` bg + `#D1FAE5` fg; `btn-emerald` `#064E3B` on `#34D399` |
| violet | `#EDE9FE` / `#7C3AED` | avatar/icon `#6D28D9` bg + `#EDE9FE` fg; `btn-violet` `#2E1065` on `#A78BFA` |
| indigo | `#E0E7FF` / `#4F46E5` | avatar/icon `#4338CA` bg + `#E0E7FF` fg; `btn-indigo` `#1E1B4B` on `#818CF8` |

**Arbitration record (#183):** the trio is kept as a sanctioned page-specific palette rather than repainted to shared tokens. It is internally coherent, its dark treatments were designed (dark text on bright bg for CTAs, inverted bg/fg for avatars/icons), and MASTER's dark rules already reference this page's patterns. The emerald column doubles as the CTA token family (`--color-cta` / `--color-cta-hover`), so those two resolve through tokens; violet and indigo stay literal because no shared token carries them. The audit's one real defect — `role-avatar--indigo` using blue-family `#DBEAFE`/`#1D4ED8` while every other indigo element used indigo — was fixed to `#E0E7FF`/`#4F46E5`.

Solid `step-icon--*-solid` variants were removed as dead CSS (zero markup usage).

## Empty State (UXC-09)

`.list-empty` (dashed `--color-border`, `--color-ink-muted`, centered) renders when a role task list has no entries. The dashboard has no list filters, so only the no-data mode applies; there is no per-role creation action on this page, so it is message-only (`taskListEmpty`, zh/en).

## URL State (UXC-11)

The scenario switcher round-trips through `?scenario=` (`replaceState`; the default `user` is dropped to keep the URL clean; unknown values fall back to the default view). Deep links such as `?scenario=annotator` restore the demoed view on load.

## Dark-mode notes

- Role CTA buttons flip to dark-text-on-bright (see table above) — this is the pattern MASTER's dark rules cite for high-emphasis colored buttons.
- `<img>`-based SVG icons inside `.step-icon` / `.role-avatar` and the workflow connector arrows use `filter: brightness(0) invert(1)` because `currentColor` does not reach `<img>` content.
- Semantic badges (`badge-info` / `-warning` / `-success`) need no dark overrides: their light rules use the semantic token families, which tokens.css flips.

## Sanctioned exceptions

- Page `:root` declares layout-only variables (`--navbar-mobile-*`, shared via MASTER's Sidebar mobile contract) — MASTER rule (d) does not apply.
- Role accent violet/indigo hex literals per the arbitration record above.
- UXC-08 loading skeletons are inapplicable: the page renders synchronously from bundled mock data.
