import { test, expect } from '@playwright/test';

test.describe('Shared sidebar avatar initials', () => {
  test('shows initials of the current user name instead of the hardcoded "U" default', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/pages/annotation/annotation-workspace.html');

    const userName = page.locator('#userName');
    const userAvatar = page.locator('#userAvatar');

    await expect(userName).toBeVisible();
    await expect(userAvatar).toBeVisible();

    // Sidebar's fallback userName (sidebar.js renderSidebar) is 'Mandy Chen'
    // when no page passes userName -- annotation-workspace.html's
    // mountSidebar() call omits it, so this reproduces the reviewer
    // workspace bug from issue #932.
    await expect(userName).toHaveText('Mandy Chen');

    const displayedName = (await userName.textContent())?.trim() ?? '';
    const expectedInitials = displayedName
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase())
      .join('');

    expect(expectedInitials).toBe('MC');
    await expect(userAvatar).toHaveText(expectedInitials);
    await expect(userAvatar).not.toHaveText('U');
  });
});
