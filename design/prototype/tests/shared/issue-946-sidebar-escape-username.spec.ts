import { test, expect } from '@playwright/test';

test.describe('Shared sidebar userName escaping (issue #946)', () => {
  test('renders a malicious userName as literal text instead of parsing it as markup on initial mount', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/pages/annotation/annotation-workspace.html');

    const payload = '<img src=x onerror="window.__sidebarXssFired = true">';

    // renderSidebar() (sidebar.js) string-concatenates userName straight into
    // the HTML it hands to mountNode.innerHTML, so re-running mountSidebar()
    // with a malicious userName reproduces the initial-render injection path
    // (updateUserChip's later textContent-based update path is unaffected and
    // out of scope here).
    await page.evaluate((userNamePayload) => {
      (window as any).__sidebarXssFired = false;
      (window as any).LabelSuiteSharedSidebar.mountSidebar({ userName: userNamePayload });
    }, payload);

    const userName = page.locator('#userName');
    const userAvatar = page.locator('#userAvatar');

    // The payload must survive as literal text content, not be parsed into
    // an <img> element that drops its tags from textContent.
    await expect(userName).toHaveText(payload);

    // No markup may be parsed out of userName in either the name span or the
    // avatar chip (computeAvatarInitials() also concatenates the same
    // unescaped string in for its first-character slice).
    await expect(page.locator('#userName img')).toHaveCount(0);
    await expect(page.locator('#userAvatar img')).toHaveCount(0);

    // The onerror handler must never have executed.
    const xssFired = await page.evaluate(() => (window as any).__sidebarXssFired);
    expect(xssFired).toBe(false);
  });
});
