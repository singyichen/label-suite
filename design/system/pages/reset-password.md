# reset-password.html — Page-Scoped Spec

Standalone auth page for setting a new password from an emailed token link. Shared auth chrome (navbar variant, card, `.lang-toggle`, `.eye-toggle`) is specified in [login.md](login.md) and applies here unchanged. The `.success-panel` family is identical to [forgot-password.md](forgot-password.md) (here with the copy "密碼重設成功，請重新登入。").

## `.token-error-panel` — shipped State Panel / Token Error

Error mirror of the success panel, shown when the URL token is invalid, expired, or missing. Replaces the form section per the MASTER State Panel contract; markup carries `role="alert"`.

```css
.token-error-panel {
  display: none;                 /* .visible → flex */
  flex-direction: column;
  align-items: center;
  gap: 16px;
  background: var(--color-error-bg);
  border: 1px solid var(--color-error-border);
  border-radius: var(--radius-md);
  padding: 20px 24px;
  text-align: center;
}
.token-error-icon {
  width: 40px; height: 40px;
  background: var(--color-error-border);
  color: var(--color-error);
  border-radius: 50%;
}
.token-error-msg { font-size: 14px; color: var(--color-error); line-height: 1.6; }
.token-error-action {
  height: 38px; padding: 0 20px;
  border: 1px solid var(--color-error-border);
  border-radius: var(--radius-md);
  background: var(--color-card);
  color: var(--color-error);
  font-size: 13px; font-weight: 500;
}
.token-error-action:hover { background: var(--color-error-bg); border-color: var(--color-error); }
```

Same token-vs-utility deviation as the success panel: semantic error tokens replace the MASTER mock's `red-*` utilities, keeping the panel theme-complete under Dark Rule 9.

## `.proto-toggle-bar` — known deviation, deferred

Prototype-only scenario switcher (`role="group"`), shipped as a fixed bottom-center pill bar:

```css
.proto-toggle-bar {
  position: fixed; bottom: 16px; left: 50%; transform: translateX(-50%);
  background: rgba(30,27,75,0.92);
  border-radius: 20px;
  padding: 8px 16px;
  z-index: 999;
}
.proto-btn.active { background: #6366F1; color: #fff; }
```

MASTER (v1.8) re-specified the Prototype-Only State Switcher as top-right `scenario-pill`s, which this page predates. **Deferred (issue #183):** demo-only helper with no product surface — the off-scale `z-index: 999` and the hardcoded `#6366F1` active ground stay as shipped until the page next needs functional work.

## Known deferrals (issue #183)

Same as [login.md](login.md): UXC-04 (submit-only validation) and UXC-05 (no toast summary layer).
