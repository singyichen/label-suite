# profile.html — Page-Scoped Spec

Page-specific components and sanctioned deviations for
`design/prototype/pages/account/profile.html` (Pattern C profile settings
page). Everything not listed here follows MASTER.md in full.

## Sanctioned deviations from MASTER

### Content width

| Property | MASTER (Pattern C) | Shipped | Ruling |
|----------|--------------------|---------|--------|
| Content max width | `max-w-3xl` (768px) within the content area | `.content-inner { max-width: 1280px; }` | Keep shipped |

Reason: the notification-preference table (event name + trigger meta + two
90px centered toggle columns) does not fit legibly in 768px, and all
section cards share `.content-inner` so the page stays on one width.

### Avatar (uploadable)

| Property | MASTER Avatar / Large | Shipped `.avatar-preview` | Ruling |
|----------|----------------------|---------------------------|--------|
| Size | `w-16 h-16` mobile / `w-20 h-20` desktop (64/80px) | `width: 72px; height: 72px` (both breakpoints) | Keep shipped |
| Initials size | `text-xl md:text-2xl` (20/24px) | `font-size: 24px` (fixed) | Keep shipped |
| Overlay ground | `bg-black/50` | `background: rgba(0,0,0,0.48)` | Keep shipped |

Reason: MASTER's own Skeleton Variant B specs `.skel-avatar` at fixed
72px; the shipped page keeps the live avatar and its skeleton at the same
72px so the loading→live swap causes no layout shift (the stated goal of
the Skeleton section). The 0.48 overlay alpha is within rounding of
`bg-black/50` and not worth a re-ship. All other Avatar rules
(`--radius-full`, `--color-primary` ground, hover overlay with upload
icon, `role="button"` + keyboard activation, error/hint lines) follow
MASTER verbatim.

### Secondary button

| Property | MASTER `.btn-secondary` CSS | Shipped `.btn-secondary` | Ruling |
|----------|-----------------------------|--------------------------|--------|
| Border | `1px solid var(--color-border)` | `2px solid var(--color-primary)` | Keep shipped |
| Padding | `10px 20px` | `10px 22px` | Keep shipped |
| Hover | — (unspecified) | `background: var(--color-primary-soft-bg)` | Keep shipped |

Note: MASTER is internally split here — its CSS block says
`border: 1px solid var(--color-border)` but its semantic-usage table
("Neutral cancel / close") says `border: --color-primary`. The shipped
page follows the usage table's border color (at 2px for affordance
against the borderless card interior). Flagged for a future MASTER
reconciliation; until then this page keeps the shipped values.

### Literal colors kept

- `.eye-toggle` `color: #64748B` / hover `#334155` are MASTER-verbatim
  literals (btn-oauth slate family); the dark theme remaps them to
  `var(--color-ink-muted)` / `var(--color-ink)` via an explicit override.
- `.skeleton` shimmer gradient `#E2E8F0 / #F1F5F9` and dark
  `#1F1F28 / #2A2A35` are MASTER Skeleton Variant B verbatim (only the
  keyframes name differs: `shimmer` vs MASTER `skeleton-shimmer`;
  values identical).
- `color: #fff` (avatar initials, btn-primary text) and
  `background: white` (toggle knob, MASTER-verbatim) stay literal:
  white-on-primary / white-on-CTA holds in both themes.

## Page-specific components

### Email Row (masked display + change action)

Read-only masked email presented in an input-shaped container with an
inline change action. No MASTER counterpart.

```css
.email-row {
  display: flex;
  align-items: center;
  padding: 10px 14px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-slate-50);
  gap: 8px;
}

.email-masked { flex: 1; font-size: 15px; color: var(--color-ink-muted); }

.email-change-btn {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-primary);
  background: none;
  border: none;
  padding: 4px 8px;
  border-radius: var(--radius-sm);
}
.email-change-btn:hover { background: var(--color-primary-soft-bg); }
.email-change-btn:focus { outline: 2px solid var(--color-primary); outline-offset: 2px; }
```

Markup contract: container is `role="group"` with an `aria-label`; the
masked value carries its own `aria-label` marking it as masked; the
change button opens the email-change flow (a separate page state), it
never edits in place.

### Appearance Toggle (three-icon theme switcher)

Segmented icon group for the system / light / dark theme choice.
Page-specific (the only page exposing theme preference).

```css
.appearance-toggle { display: inline-flex; align-items: center; gap: 2px; padding: 2px; background: transparent; border-radius: var(--radius-md); }
.appearance-toggle button { width: 32px; height: 32px; border: none; background: transparent; color: var(--color-text-soft, #64748B); border-radius: 6px; }
.appearance-toggle button:hover { opacity: 0.7; }
.appearance-toggle button[aria-pressed="true"] { background: var(--color-slate-50); color: var(--color-ink); }
.appearance-toggle button:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px; }
.appearance-toggle svg { width: 18px; height: 18px; stroke: currentColor; fill: none; stroke-width: 2; }
```

Markup contract: `role="group"` + `aria-labelledby` pointing at the row
label; exactly one button has `aria-pressed="true"`; each button carries
a `data-theme-choice` of `system | light | dark` and an `aria-label`.

### Preference Row

Label + control row inside the preferences card.

```css
.preference-row { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 12px 0; }
.preference-row + .preference-row { border-top: 1px solid var(--color-border); }
.preference-label { font-size: 14px; font-weight: 500; color: var(--color-ink); }
```

### Notification Preference Table

Event × channel matrix; each cell hosts a MASTER toggle-switch (contract
followed verbatim; the only structural diff is `cursor: pointer` living
on `.toggle-switch` instead of `.toggle-slider` — behavior-identical).

```css
.notif-pref-table { width: 100%; border-collapse: collapse; }
.notif-pref-table th { padding: 10px 0; font-size: 11px; font-weight: 600; color: var(--color-ink-muted); text-transform: uppercase; letter-spacing: 0.06em; text-align: left; }
.notif-pref-table th.col-ch { text-align: center; width: 90px; }
.notif-pref-table tbody tr { border-bottom: 1px solid var(--color-border); }
.notif-pref-table tbody tr:last-child { border-bottom: none; }
.notif-pref-table td { padding: 14px 0; vertical-align: middle; }
.event-name { font-size: 14px; font-weight: 500; color: var(--color-ink); margin: 0 0 4px; }
.event-trigger { font-size: 12px; color: var(--color-ink-muted); }
.toggle-wrap { display: flex; align-items: center; justify-content: center; }
```

Markup contract: every checkbox gets an `aria-label` of
"event — channel" so screen readers hear the full coordinate.

### Email Sent Card (State Panel variant)

Shown after requesting an email change; replaces the section content
(MASTER State Panel replacement rule). Departs from the State Panel
container spec because it stands alone as a full section card rather
than swapping inside an auth card:

| Property | MASTER State Panel | Shipped `.sent-card` |
|----------|--------------------|----------------------|
| Container | `rounded-md border p-5 text-center` on state-colored ground | `var(--color-white)` card, `1px solid var(--color-border)`, `var(--radius-lg)`, `padding: 40px 24px`, centered |
| Icon | `w-10 h-10` circle on state ground | 64px circle, `var(--color-success-bg)` + `1px solid var(--color-success-border)`, 28px `var(--color-success)` icon |
| Title | `text-base font-semibold` state color | Crimson Pro 22px/700 `var(--color-ink)` |

Supporting styles: `.sent-desc` 14px `var(--color-text-soft)`;
`.sent-email-highlight` 600 `var(--color-ink)`; `.sent-hint` 13px
`var(--color-ink-muted)`; `.resend-link` 13px/500 `var(--color-primary)`
with underline revealed on hover via `text-decoration-color` transition.

### Back Link

Ghost navigation button used above sub-flow states (email change,
sent card). Differs from MASTER `btn-ghost` (primary color, underline
hover) — this is a muted directional control:

```css
.back-link { font-size: 13px; font-weight: 500; color: var(--color-text-soft); padding: 6px 8px; border-radius: var(--radius-sm); }
.back-link:hover { color: var(--color-ink); background: var(--color-slate-50); }
.back-link svg { width: 14px; height: 14px; }
```

### Loading button spinner

`.btn-primary.is-loading` follows MASTER Loading state / UXC-06
(`opacity: 0.7`, `cursor: not-allowed`, `pointer-events: none`) and adds
a page-specific 12px `::before` spinner (2px `rgba(255,255,255,0.35)`
ring, `#fff` top, `btn-spin 0.6s linear infinite`).

## Deferrals

- **UXC-04 (clear field error on input)** — only the email-change flow
  clears errors while typing; the name / contact / password fields clear
  on re-validate instead. Deferred module-wide (same deferral as the
  auth pages; see `login.md`).
