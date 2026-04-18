import { test, expect } from '@playwright/test';

const ROLE_SETTINGS_URL = '/pages/admin/role-settings.html';

test.describe('Admin role settings mobile sidebar layout', () => {
  test('keeps shared sidebar fixed at bottom and brand section fixed at top on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(ROLE_SETTINGS_URL);

    const navbar = page.locator('.navbar');
    const brandSection = page.locator('.brand-section');

    await expect(navbar).toBeVisible();
    await expect(navbar).toHaveCSS('position', 'fixed');
    await expect(navbar).toHaveCSS('bottom', '0px');

    await expect(brandSection).toBeVisible();
    await expect(brandSection).toHaveCSS('position', 'fixed');
    await expect(brandSection).toHaveCSS('top', '0px');
  });

  test('does not show a mobile read-only notice block', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(ROLE_SETTINGS_URL);
    await expect(page.locator('#mobileNotice')).toHaveCount(0);
  });

  test('uses the same heading typography scale as other admin pages', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(ROLE_SETTINGS_URL);

    await expect(page.locator('.page-title')).toHaveCSS('font-size', '28px');
    await expect(page.locator('.page-subtitle')).toHaveCSS('font-size', '14px');
  });

  test('applies stored global language on initial load', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('labelsuite.lang', 'en');
    });

    await page.goto(ROLE_SETTINGS_URL);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.locator('#pageTitle')).toHaveText('Role Settings');
  });

  test('persists language selection across admin pages', async ({ page }) => {
    await page.goto(ROLE_SETTINGS_URL);
    await page.evaluate(() => {
      window.localStorage.setItem('labelsuite.lang', 'zh');
    });
    await page.reload();

    await page.click('#langToggle');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');

    await page.goto('/pages/admin/user-management.html');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.locator('#pageTitle')).toHaveText('User Management');
  });

  test('shows language toggle label in single-code format', async ({ page }) => {
    await page.goto(ROLE_SETTINGS_URL);
    await expect(page.locator('#langLabel')).toHaveText('ZH');
    await expect(page.locator('#mobileLangLabel')).toHaveText('ZH');

    await page.click('#langToggle');
    await expect(page.locator('#langLabel')).toHaveText('EN');
    await expect(page.locator('#mobileLangLabel')).toHaveText('EN');
  });
});
