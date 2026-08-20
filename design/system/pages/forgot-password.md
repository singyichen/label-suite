# forgot-password.html — Page-Scoped Spec

Standalone auth page for requesting a reset link. Shared auth chrome (navbar variant, card, `.lang-toggle`) is specified in [login.md](login.md) and applies here unchanged.

## `.success-panel` — shipped State Panel / Success

Shipped implementation of the MASTER State Panel (Success) contract — it replaces the form section after submit, is not stacked above it, and follows the icon-circle + message + action layout:

```css
.success-panel {
  display: none;                 /* .visible → flex */
  flex-direction: column;
  align-items: center;
  gap: 16px;
  background: var(--color-success-bg);
  border: 1px solid var(--color-success-border);
  border-radius: var(--radius-md);
  padding: 20px 24px;            /* MASTER mock: p-5 (20px) */
  text-align: center;
}
.success-panel-icon {
  width: 40px; height: 40px;     /* = MASTER w-10 h-10 */
  background: var(--color-success-border);
  color: var(--color-success);
  border-radius: 50%;
}
.success-panel-msg  { font-size: 14px; color: var(--color-success); line-height: 1.6; }
.success-panel-back { font-size: 13px; color: var(--color-link); font-weight: 500; }
```

Markup carries `role="alert" aria-live="polite"`.

**Deviations from the MASTER mock (kept as shipped):**

- Colors come from the page's semantic tokens (Dark Rule 9) instead of the mock's `green-*` utilities, so the panel is theme-complete; the icon circle grounds on `--color-success-border` rather than a separate green-100 tint.
- No separate `<h2>` title element — the panel shows a single message line (the copy is deliberately non-committal: "If this email is registered…", which does not split into title + description).

## Known deferrals (issue #183)

Same as [login.md](login.md): UXC-04 (submit-only validation) and UXC-05 (no toast summary layer).
