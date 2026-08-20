# register.html — Page-Scoped Spec

Standalone auth registration page. Shared auth chrome (navbar variant, card, `.lang-toggle`, `.sso-btn`, `.eye-toggle`) is specified in [login.md](login.md) and applies here unchanged.

## `.banner` family (error + success)

MASTER defines only the Error / Alert Banner; this page generalizes it into a two-variant `.banner` base so the same slot can confirm account creation:

```css
.banner {
  display: none;                 /* .visible → flex */
  align-items: flex-start;
  gap: 8px;
  border-radius: var(--radius-md);
  padding: 10px 14px;
  margin-bottom: 16px;
  font-size: 14px;
  line-height: 1.4;
}
.banner--error {
  background: var(--color-error-bg);
  border: 1px solid var(--color-error-border);
  color: var(--color-error);
}
.banner--success {
  background: var(--color-success-bg);
  border: 1px solid var(--color-success-border);
  color: var(--color-success);
}
```

- `.banner--error` carries `role="alert" aria-live="assertive"`; `.banner--success` carries `role="status" aria-live="polite"`.
- Icons are inline 16px Lucide strokes on `currentColor`, so both variants recolor with their token set in dark mode.

## `.field-hint`

Password-rule helper line under the password input:

```css
.field-hint { font-size: 12px; color: var(--color-ink-muted); }
```

## Known deferrals (issue #183)

Same as [login.md](login.md): UXC-04 (submit-only validation) and UXC-05 (no toast summary layer).
