/**
 * Auth pages — residual chrome drift (issue #183 audit P2 items)
 *
 * Four small consistency fixes across the standalone auth pages:
 * 1. Navbar landmark: MASTER Navbar Accessibility mandates
 *    `<header role="banner">`. login/forgot/reset shipped `<nav>` and
 *    register shipped `<header>` without the explicit role.
 * 2. Navbar z-index: canonical scale value is --z-sticky = 200; pages
 *    shipped a literal 100.
 * 3. Eye-toggle radius: shipped literal 4px; the canonical --radius-sm
 *    is 4px, so the pages define the local token and consume it.
 * 4. register submit button: inline `style="margin-top: 6px"` moves into
 *    the .submit-btn rule (spacing itself is unchanged).
 */
import { test, expect } from '@playwright/test';

const AUTH_PAGES = [
  { name: 'login', url: '/pages/account/login.html', hasEyeToggle: true },
  { name: 'register', url: '/pages/account/register.html', hasEyeToggle: true },
  { name: 'forgot-password', url: '/pages/account/forgot-password.html', hasEyeToggle: false },
  { name: 'reset-password', url: '/pages/account/reset-password.html', hasEyeToggle: true },
];

async function tokenValue(page: import('@playwright/test').Page, token: string): Promise<string> {
  return page.evaluate(
    (t) => getComputedStyle(document.documentElement).getPropertyValue(t).trim(),
    token,
  );
}

for (const { name, url, hasEyeToggle } of AUTH_PAGES) {
  test.describe(`${name} — chrome consistency`, () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(url);
    });

    test('navbar is a <header role="banner"> landmark', async ({ page }) => {
      await expect(page.locator('header.navbar[role="banner"]')).toHaveCount(1);
      await expect(page.locator('nav.navbar')).toHaveCount(0);
    });

    test('navbar sits on the canonical sticky layer (200)', async ({ page }) => {
      expect(await tokenValue(page, '--z-sticky')).toBe('200');
      await expect(page.locator('.navbar')).toHaveCSS('z-index', '200');
    });

    if (hasEyeToggle) {
      test('eye-toggle radius comes from the local --radius-sm token', async ({ page }) => {
        expect(await tokenValue(page, '--radius-sm')).toBe('4px');
        await expect(page.locator('.eye-toggle').first()).toHaveCSS('border-radius', '4px');
      });
    }
  });
}

test('register submit button has no inline style; spacing kept in CSS', async ({ page }) => {
  await page.goto('/pages/account/register.html');
  const submitBtn = page.locator('#submitBtn');
  expect(await submitBtn.getAttribute('style')).toBeNull();
  await expect(submitBtn).toHaveCSS('margin-top', '6px');
});
