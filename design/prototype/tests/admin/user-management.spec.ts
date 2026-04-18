import { test, expect } from '@playwright/test';

const USER_MANAGEMENT_URL = '/pages/admin/user-management.html';

test.describe('Admin user management mobile sidebar layout', () => {
  test('keeps sidebar navbar fixed at the bottom on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(USER_MANAGEMENT_URL);

    const navbar = page.locator('.navbar');
    await expect(navbar).toBeVisible();
    await expect(navbar).toHaveCSS('position', 'fixed');
    await expect(navbar).toHaveCSS('bottom', '0px');
    await expect(navbar).toHaveCSS('left', '0px');
    await expect(navbar).toHaveCSS('right', '0px');
  });
});
