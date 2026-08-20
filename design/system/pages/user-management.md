# user-management.html — Page-Scoped Specs

Admin user list (filter bar, dense table, add/edit/disable modals, audit
drawer). Shared chrome follows MASTER without restatement: Toast is the
UXC-07 implementation, Mini Buttons / solid Danger confirm / Pagination /
Empty State match their MASTER specs, destructive row actions sit far
right, and pagination is a `nav` landmark with Lucide chevron arrows.

## Badge family (sanctioned deviation)

One rectangular `.badge` base (`--radius-sm`, bordered, 12px/500) serves
both table columns: role (`badge-admin` primary family, `badge-user`
success family) and status (`badge-active` success, `badge-disabled`
slate). MASTER's rounded-full indigo **role pill** was not adopted.
**Arbitration record (#183):** the pill rule exists to separate role
badges from task-status badges when they mix in one context; here role
and status are sibling columns of the same table and the color family
already carries the distinction, so a second shape system would add
noise. New pages outside this table context must use the MASTER pill.

## Mini-button page extensions

Beyond MASTER's `mini-btn` / `-primary` / `-danger`:

- `.mini-btn-success` — re-enable action; `--color-success-soft-bg` /
  `--color-success-soft-border` / `--color-success` (mirrors `-danger`).
- `.mini-btn-log` — audit-drawer trigger; `--color-info-bg` /
  `--color-info-border` / `--color-info` (also used by role-settings).
- `.mini-btn-icon` — icon-only padding variant (`padding: 0 6px`).

## Audit Drawer (admin module component)

Shared verbatim by both admin pages (role-settings duplicates this CSS):

- Overlay `rgba(0,0,0,0.3)` at `var(--z-modal)`; panel 480px right
  slide-in at `calc(var(--z-modal) + 10)` (drawer must clear its own
  overlay; the +10 stays inside the modal band below `--z-toast`).
- Mobile (≤767px): full-width bottom sheet, `72vh`, top radius
  `--radius-xl`, `translateY` transition; `prefers-reduced-motion`
  collapses both transitions.
- Entry card: `--radius-lg` bordered card; timestamp `--font-mono` 12px;
  diff block `--font-mono` on `--color-slate-50`; type badges use soft
  semantic families (e.g. `.audit-badge-perm_update` primary family).
- Empty state: centered `--color-text-soft` 13px text.

## UXC behavior notes

- **UXC-10**: disable confirm uses the action verb 停用 on the MASTER
  solid `btn-danger`, Enter confirms, Escape closes, and overlay-click
  dismissal is disabled on this destructive modal only — the add/edit
  modals keep overlay dismissal.
- **UXC-11**: `q` / `role` / `status` / `limit` / `offset` round-trip via
  `history.replaceState`; invalid values are dropped, defaults omitted,
  and the URL is synced once at the end of `renderUsers()` after
  clamping.

## Sanctioned exceptions

- `filter-select` / `page-size-select` chevrons are data-URI SVGs with
  `stroke='%2394A3B8'` (`--color-ink-muted`'s value) — `var()` cannot
  reach inside a `url()` data URI; keep the hex in sync with the token.

## Known deferrals

- `.btn-primary` and `.page-btn.active` still set literal `white`; MASTER
  v1.11 (published after the admin fix PRs) corrected Pagination to
  `var(--color-white)`. The page has no dark-mode block (all other color
  flips through tokens), so the literals also pin white in dark — align
  both in a follow-up token pass, not silent drift.
