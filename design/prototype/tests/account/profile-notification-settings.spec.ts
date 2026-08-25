/**
 * Profile notification settings tests — event table, per-channel toggles,
 * and save action placement.
 *
 * Traceability: specs/account/005-profile-settings/spec.md
 *   FR-013B, SC-010
 */
import { test, expect } from '@playwright/test';

const PROFILE_URL = '/pages/account/profile.html';

test.describe('Profile notification settings', () => {
  test('defaults every notification channel to enabled', async ({ page }) => {
    await page.goto(PROFILE_URL);

    const toggles = page.locator('#notification-section .toggle-switch input[type="checkbox"]');
    await expect(toggles).toHaveCount(12);

    for (let index = 0; index < await toggles.count(); index += 1) {
      await expect(toggles.nth(index)).toBeChecked();
    }
  });

  test('shows the finalized notification event list and localized email column', async ({ page }) => {
    await page.goto(PROFILE_URL);

    const section = page.locator('#notification-section');

    await expect(section.locator('#notifThEmail')).toHaveText('電子郵件');
    await expect(section).toContainText('試標全員完成');
    await expect(section).toContainText('所有參與者完成試標時通知我');
    await expect(section).toContainText('正式標記全員完成');
    await expect(section).toContainText('所有參與者完成正式標記時通知我');
  });

  test('uses user-facing event descriptions without receiver role labels', async ({ page }) => {
    await page.goto(PROFILE_URL);

    const section = page.locator('#notification-section');

    await expect(section.locator('.event-role-badge')).toHaveCount(0);
    await expect(section).not.toContainText('Project Leader 收');
    await expect(section).not.toContainText('Annotator 收');
    await expect(section).not.toContainText('Reviewer 收');
    await expect(section).toContainText('有人完成所有標記項目時通知我');
    await expect(section).toContainText('有新的審核清單指派給我時通知我');
  });

  test('aligns save button with the password save action', async ({ page }) => {
    await page.goto(PROFILE_URL);
    await page.locator('#saveNotifBtn').scrollIntoViewIfNeeded();

    const passwordBox = await page.locator('#savePwBtn').boundingBox();
    const notificationBox = await page.locator('#saveNotifBtn').boundingBox();

    expect(passwordBox).not.toBeNull();
    expect(notificationBox).not.toBeNull();
    expect(Math.abs((passwordBox?.x ?? 0) - (notificationBox?.x ?? 0))).toBeLessThanOrEqual(2);
    expect(Math.abs(
      ((passwordBox?.x ?? 0) + (passwordBox?.width ?? 0)) -
      ((notificationBox?.x ?? 0) + (notificationBox?.width ?? 0))
    )).toBeLessThanOrEqual(2);
  });
});
