# login.html — Page-Scoped Spec

Standalone auth entry page (no tokens.css import — MASTER Dark Rule 9 local token scheme). This file also hosts the **shared auth chrome** arbitrations for the four standalone auth pages (login, register, forgot-password, reset-password); the sibling page files cross-reference this section instead of restating it.

## Shared auth chrome (all four standalone auth pages)

### Auth navbar variant

Brand bar only (logo + wordmark + language toggle) — no navigation links, so the page ships a bare `<header class="navbar" role="banner">` without the inner `<nav aria-label="Main navigation">` from the MASTER Navbar spec.

| Property | Value |
|----------|-------|
| Height | `64px`, `position: sticky; top: 0` |
| Layer | `z-index: var(--z-sticky)` (local token, `200`) |
| Ground | `background: var(--color-card)`, `border-bottom: 1px solid var(--color-border)` |
| Padding | `0 32px` |
| Logo | `.navbar-logo` 32px square, `border-radius: 8px`, `background: var(--color-primary)` |
| Wordmark | Crimson Pro 700 / 18px, `color: var(--color-ink)` |

### Auth card — sanctioned deviation from MASTER Login Card

MASTER Cards lists Login Card as `border border-slate-200 rounded-2xl p-8`. The shipped auth family uses a shadow-elevated borderless card instead:

```css
.card {
  background: var(--color-card);
  border-radius: var(--radius-lg);      /* 12px, vs rounded-2xl 16px */
  box-shadow: var(--shadow-card);       /* §9 local shadow token */
  padding: 40px 40px 36px;              /* vs p-8 (32px) */
  max-width: 480px;
}
```

**Arbitration record (#183):** kept as shipped. The auth pages define their own `--shadow-card` in the Dark Rule 9 scheme (with a dark-mode remap that adds a 1px indigo ring), so elevation-by-shadow is a deliberate, theme-complete choice for the single-card centered layout. The MASTER Login Card row remains the target for any future in-app auth shell.

### `.lang-toggle` — sanctioned deviation from `btn-language`

Same role as MASTER `btn-language`, different metrics and hover ground:

| Property | Shipped `.lang-toggle` | MASTER `btn-language` |
|----------|------------------------|----------------------|
| Padding | `6px 12px` | `8px 12px`, `min-height: 36px` |
| Font size | `13px` | `14px` |
| Hover | `border-color: var(--color-primary)`, `background: var(--color-primary-soft-bg)` | slate-50 ground, slate-300 border |

### `.sso-btn` — sanctioned deviation from `btn-oauth`

| Property | Shipped `.sso-btn` | MASTER `btn-oauth` |
|----------|--------------------|--------------------|
| Padding | `11px 16px` | `10px 16px` |
| Hover | `border-color: var(--color-primary)`, `background: var(--color-primary-soft-bg)` | slate-50 ground, slate-300 border |

**Arbitration record (#183)** for both buttons: the indigo `primary-soft-bg` hover is kept as the auth-family interaction ground — it is the same soft-indigo hover the pages use everywhere else and stays theme-complete via the Dark Rule 9 remap (`#1E1B4B`), whereas the MASTER slate hovers have no dark story on these token-isolated pages.

### `.eye-toggle` (password visibility)

Page-family utility button inside `.input-wrapper` (login, register, reset-password):

```css
.eye-toggle {
  position: absolute; right: 12px;
  background: none; border: none;
  color: var(--color-ink-muted);
  padding: 2px;
  border-radius: var(--radius-sm);
}
.eye-toggle:hover { color: var(--color-ink); }
```

## Page-specific notes

- **Error banner** follows MASTER Error / Alert Banner with the local error tokens; no page-level override.
- **Text divider** ("or continue with email") follows the MASTER Divider / Text Divider variant.
- **Submit CTA** (`.login-btn`) follows the Dark Rule 9 CTA contract (dark remap `color: #064E3B; background: #34D399`).

## Known deferrals (issue #183)

- **UXC-04**: validation is submit-only (clear-on-input works, no on-blur validation). Deferred module-wide.
- **UXC-05**: no toast summary layer for validation errors; the inline banner + field errors pattern is kept. Deferred pending a cross-module arbitration.
