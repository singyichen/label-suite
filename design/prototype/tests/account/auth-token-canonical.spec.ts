/**
 * Auth pages — canonical design-token names (issue #183, MASTER Dark Rule 9)
 *
 * The four standalone auth pages define local token names because they do
 * not import tokens.css. MASTER v1.8 arbitrated the canonical local names:
 *   --color-surface = page ground (#F5F3FF / #0B0B12)
 *   --color-card    = card ground (#FFFFFF / #16161F)
 *   --color-ink     = primary text (#1E1B4B / #E2E8F0)
 * The deprecated names (--color-background, --color-text, and
 * --color-surface-as-card) must no longer be defined.
 *
 * Visual invariance: this is a pure rename — computed body/card colors
 * must stay identical in both themes.
 */
import { test, expect } from '@playwright/test';

const AUTH_PAGES = [
  { name: 'login', url: '/pages/account/login.html' },
  { name: 'register', url: '/pages/account/register.html' },
  { name: 'forgot-password', url: '/pages/account/forgot-password.html' },
  { name: 'reset-password', url: '/pages/account/reset-password.html' },
];

async function tokenValue(page: import('@playwright/test').Page, token: string): Promise<string> {
  return page.evaluate(
    (t) => getComputedStyle(document.documentElement).getPropertyValue(t).trim(),
    token,
  );
}

for (const { name, url } of AUTH_PAGES) {
  test.describe(`${name} — canonical token names`, () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(url);
    });

    test('light theme defines canonical names with Rule 9 values', async ({ page }) => {
      expect(await tokenValue(page, '--color-surface')).toBe('#F5F3FF');
      expect(await tokenValue(page, '--color-card')).toBe('#FFFFFF');
      expect(await tokenValue(page, '--color-ink')).toBe('#1E1B4B');
    });

    test('deprecated token names are gone', async ({ page }) => {
      expect(await tokenValue(page, '--color-background')).toBe('');
      expect(await tokenValue(page, '--color-text')).toBe('');
    });

    test('dark theme remaps the canonical names', async ({ page }) => {
      await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
      expect(await tokenValue(page, '--color-surface')).toBe('#0B0B12');
      expect(await tokenValue(page, '--color-card')).toBe('#16161F');
      expect(await tokenValue(page, '--color-ink')).toBe('#E2E8F0');
    });

    test('visual invariance: body ground unchanged in both themes', async ({ page }) => {
      await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(245, 243, 255)');
      await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
      await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(11, 11, 18)');
    });
  });
}
