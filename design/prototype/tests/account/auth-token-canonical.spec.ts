/**
 * Auth pages — rendered page ground in both themes (issue #183)
 *
 * The four standalone auth pages define their design tokens locally because
 * they do not import tokens.css. This file asserts only the rendered result
 * of that local definition: the computed `body` background-color is the
 * canonical page ground in light (#F5F3FF) and its dark remap (#0B0B12).
 *
 * Scope — only `body` is read here. The card ground (--color-card), primary
 * text (--color-ink) and soft hover ground (--color-primary-soft-bg) are NOT
 * covered by this file: issue #1059 group 3 removed the token-name and
 * token-value pins that covered them, and nothing replaced that coverage.
 * The same group also removed this file's deprecated-token-absence pins,
 * which guarded a different set of names (--color-background, --color-text,
 * --color-primary-light) and so never covered the three above.
 *
 * Traceability: REGRESSION-RISK — auth-page rendered light/dark page-ground
 *   invariance; design/system/MASTER.md §Dark Mode Tokens > Implementation
 *   Rules > "9. Standalone auth pages (no tokens.css)". No feature-spec FR.
 */
import { test, expect } from '@playwright/test';

const AUTH_PAGES = [
  { name: 'login', url: '/pages/account/login.html' },
  { name: 'register', url: '/pages/account/register.html' },
  { name: 'forgot-password', url: '/pages/account/forgot-password.html' },
  { name: 'reset-password', url: '/pages/account/reset-password.html' },
];

for (const { name, url } of AUTH_PAGES) {
  test.describe(`${name} — rendered page ground`, () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(url);
    });

    test('visual invariance: body ground unchanged in both themes', async ({ page }) => {
      await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(245, 243, 255)');
      await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
      await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(11, 11, 18)');
    });
  });
}
