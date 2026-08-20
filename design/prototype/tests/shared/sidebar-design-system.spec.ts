import { test, expect } from '@playwright/test';

const HOST_PAGE_URL = '/pages/dashboard/dashboard.html';

test.describe('Shared sidebar design-system alignment', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(HOST_PAGE_URL);
  });

  test('dark navbar border follows the canonical border token', async ({ page }) => {
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'dark');
    });
    // tokens.css dark --color-border = #2A2A35 (the old override forced #3A3A4A)
    await expect(page.locator('.navbar')).toHaveCSS('border-right-color', 'rgb(42, 42, 53)');
  });

  test('desktop navbar sits on the z-sticky layer', async ({ page }) => {
    await expect(page.locator('.navbar')).toHaveCSS('z-index', '200');
  });

  test('sidebar fragment buttons are clickable affordances', async ({ page }) => {
    await expect(page.locator('#langToggle')).toHaveCSS('cursor', 'pointer');
    await expect(page.getByTestId('shortcut-help-button')).toHaveCSS('cursor', 'pointer');
    await expect(page.locator('#logoutBtn')).toHaveCSS('cursor', 'pointer');
  });

  test('notification icons are Lucide SVGs on semantic token colors', async ({ page }) => {
    await page.locator('#notificationBellBtn').click();

    const checkIcon = page.locator('.notif-icon-check').first();
    const assignIcon = page.locator('.notif-icon-assign').first();

    // Inline Lucide SVG instead of CSS pseudo-element glyphs
    await expect(checkIcon.locator('svg')).toHaveCount(1);
    await expect(assignIcon.locator('svg')).toHaveCount(1);
    await expect(assignIcon).not.toContainText('+');

    // Success family (light: #F0FDF4 / #15803D) and primary family (#EEF2FF / #6366F1)
    await expect(checkIcon).toHaveCSS('background-color', 'rgb(240, 253, 244)');
    await expect(checkIcon).toHaveCSS('color', 'rgb(21, 128, 61)');
    await expect(assignIcon).toHaveCSS('background-color', 'rgb(238, 242, 255)');
    await expect(assignIcon).toHaveCSS('color', 'rgb(99, 102, 241)');
  });

  test('shortcut dialog traps focus and returns it on close (MASTER modal contract)', async ({ page }) => {
    const helpButton = page.getByTestId('shortcut-help-button');
    await helpButton.click();

    const dialog = page.getByRole('dialog', { name: '快捷鍵' });
    await expect(dialog).toBeVisible();
    await expect(page.locator('#shortcutHelpCloseBtn')).toBeFocused();

    // Tab cycles inside the dialog instead of escaping to the page behind it
    await page.keyboard.press('Tab');
    const focusStaysInside = await page.evaluate(() => {
      const modal = document.getElementById('shortcutHelpModal');
      return modal !== null && modal.contains(document.activeElement);
    });
    expect(focusStaysInside).toBe(true);

    // Closing returns focus to the button that opened the dialog
    await page.locator('#shortcutHelpCloseBtn').click();
    await expect(dialog).toBeHidden();
    await expect(helpButton).toBeFocused();
  });
});
