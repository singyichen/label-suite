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
});
