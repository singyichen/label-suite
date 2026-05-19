import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '../..');

test.describe('Shared notification dropdown', () => {
  test('does not show a notification settings link', async ({ page }) => {
    await page.goto('/pages/dashboard/dashboard.html');
    await page.locator('#notificationBellBtn').click();

    await expect(page.locator('#notificationDropdown')).toBeVisible();
    await expect(page.locator('#notifSettingsLink')).toHaveCount(0);
    await expect(page.locator('#notificationDropdown')).not.toContainText('通知設定');
    await expect(page.locator('#notificationDropdown')).not.toContainText('Notification settings');
  });

  test('localizes notification dropdown content in English', async ({ page }) => {
    await page.goto('/pages/dashboard/dashboard.html');
    await page.locator('#langToggle').click();
    await page.locator('#notificationBellBtn').click();

    const dropdown = page.locator('#notificationDropdown');

    await expect(dropdown).toBeVisible();
    await expect(dropdown.locator('#notifDropdownTitle')).toHaveText('Notifications');
    await expect(dropdown.locator('#notifMarkAllBtn')).toHaveText('Mark all as read');
    await expect(dropdown).toContainText('Alex Chen completed annotation for "Task A"');
    await expect(dropdown).toContainText('All annotators completed formal annotation for "Task C"');
    await expect(dropdown).toContainText('2 minutes ago');
    await expect(dropdown).toContainText('1 hour ago');
    await expect(dropdown).not.toContainText('任務');
    await expect(dropdown).not.toContainText('分鐘前');
    await expect(dropdown).not.toContainText('小時前');
  });

  test('does not keep the removed notification settings page', () => {
    expect(fs.existsSync(path.join(ROOT, 'pages/account/notification-settings.html'))).toBe(false);
  });
});
