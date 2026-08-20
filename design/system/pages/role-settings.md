# role-settings.html — Page-Scoped Specs

Admin role-permission matrix (system + task column groups, edit mode with
dirty guard). Shared chrome follows MASTER without restatement: Toast is
the UXC-07 implementation, the destructive/dirty modals use MASTER's Modal
contract (`var(--z-modal)` overlay, `rgba(0,0,0,0.5)` + `blur(4px)`), and
all icons are inline Lucide SVGs (ADR-030) — the forbidden-emoji
task-role badge was replaced by a Lucide `ban` icon in the #183 fix PRs.

## Teal task-column palette (sanctioned page palette)

The matrix renders two column groups that need distinct identities:
system roles use the shared primary (indigo) family, task roles use a
page-local teal pair declared in the page `:root`:

| Token | Light | Dark |
|-------|-------|------|
| `--color-task-soft-bg` | `#F0FDFA` | `#0C2A27` |
| `--color-task-header` | `#0D9488` | `#2DD4BF` |

Applied to `.col-group-task`, `.col-role-header.task-col` (bg/fg + 2px
header underline) and `.matrix-checkbox.task-check` (`accent-color`).
**Arbitration record (#183):** kept as a sanctioned page palette (same
shape as the dashboard role-accent trio) — teal exists nowhere in
`tokens.css`, the pair carries its own designed dark values, and reusing
a second shared family (e.g. success green) would collide with the
success semantics used elsewhere on the page.

## Permission Matrix (page-specific component)

- Wrapper: `.matrix-scroll-wrapper` — `overflow-x: auto`, `--radius-lg`,
  1px `--color-border`, no shadow (flat rule); table `min-width: 780px`.
- Sticky label column: `.col-perm-header` / `.perm-cell` pin `left: 0`
  with local `z-index` 10/5 (intra-table stacking, not the global scale);
  `.perm-key` is `--font-mono` 12px/600 primary, `.perm-desc` 11px muted.
- Group tints: `.check-cell.sys-bg` `rgba(99,102,241,0.025)` and
  `.check-cell.task-bg` `rgba(13,148,136,0.025)` — **sanctioned**: alpha
  washes of the two group accents; CSS custom properties offer no
  token-alpha syntax in the prototype baseline, so the base hex repeats.
- Locked cells: base-permission lock = `--color-slate-50` + Lucide lock;
  admin-lock (FR-008a) = `--color-primary-soft-bg`; both `not-allowed`.
- `.task-role-badge`: warning-soft pill (`--radius-full`, 10px/700,
  `--color-warning` family) with an 11px Lucide `ban` icon.

## Button naming (documented drift)

`.btn-cta` is MASTER's CTA button and `.btn-ghost` is MASTER's
**Secondary** (bordered white) in everything but name — the true ghost
style lives in user-management's `.btn-ghost`. Renaming was deferred by
the #183 fix PRs (behavior-only scope); treat these class names as local
aliases, do not copy them to new pages. Dark mode keeps
`html[data-theme="dark"] .btn-cta { color: #0F172A; }` per MASTER's
bright-CTA dark-text contrast rule.

## UXC behavior notes

- **UXC-03**: `cancelEdit()` routes through `#dirtyModal`
  (繼續編輯 / 放棄變更), `beforeunload` guards browser navigation while
  dirty, Escape closes / Enter confirms the open modal.
- Tabs carry `role="tablist"` + `aria-label`; the audit drawer is the
  shared admin component specced in [user-management.md](user-management.md).
