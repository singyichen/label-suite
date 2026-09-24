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

  test('falls back to the "U" placeholder when updateUserChip is given an empty/whitespace-only userName', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/pages/annotation/annotation-workspace.html');

    const userAvatar = page.locator('#userAvatar');
    await expect(userAvatar).toBeVisible();
    await expect(userAvatar).toHaveText('MC');

    // No initial can be derived from an empty/whitespace-only name -- the
    // avatar chip must keep showing a placeholder rather than rendering
    // empty, matching its pre-fix behavior for this case (issue #932 review
    // finding: the fix must not trade "wrong letter" for "no letter").
    await page.evaluate(() => {
      (window as any).LabelSuiteSharedSidebar.updateUserChip({ userName: '   ' });
    });
    await expect(userAvatar).toHaveText('U');
  });
});
