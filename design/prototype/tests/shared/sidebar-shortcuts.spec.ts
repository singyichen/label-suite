import { test, expect } from '@playwright/test';

test.describe('Shared sidebar shortcut entry', () => {
  test('shows a desktop utility keyboard button that opens page shortcuts', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/pages/dashboard/dashboard.html');

    const button = page.getByTestId('shortcut-help-button');
    await expect(button).toBeVisible();
    await expect(button).toHaveAttribute('aria-label', '快捷鍵');
    await expect(button).toHaveText('');

    await button.click();
    await expect(page.getByRole('dialog', { name: '快捷鍵' })).toBeVisible();
    await expect(page.getByText('目前頁面可用快捷鍵')).toBeVisible();
    await expect(page.locator('[data-testid="shortcut-keycap"]').filter({ hasText: 'CTRL' }).first()).toBeVisible();
    await expect(page.locator('[data-testid="shortcut-keycap"]').filter({ hasText: 'CMD' }).first()).toBeVisible();
    await expect(page.locator('[data-testid="shortcut-keycap"]').filter({ hasText: 'S' }).first()).toBeVisible();
    await expect(page.locator('.shortcut-help-row').filter({ hasText: '上一筆' })).toBeVisible();
    await expect(page.locator('.shortcut-help-row').filter({ hasText: '下一筆' })).toBeVisible();
    await expect(page.locator('.shortcut-help-row').filter({ hasText: '上一筆 / 下一筆' })).toHaveCount(0);
    await expect(page.locator('.shortcut-help-row').filter({ hasText: '通過 / 退回目前結果' })).toHaveCount(0);
    /* spec 015 v4.0.0 made the review unit one annotator, so there is nothing
     * left for a batch shortcut to act on -- these two rows are retired
     * outright rather than merged (spec 008 v1.4.0, SC-009D). */
    await expect(page.locator('#shortcutReviewApprove')).toHaveText('通過目前結果');
    /* Issue #191: AC-3.15 / AC-6.4 (spec 015) scope the reject channel to
     * official_run only, so the shortcut label must carry that qualifier.
     * Issue #409: the reject control/key itself is NOT run-type-gated (spec
     * 015 AC-3.33 forbids any run_type presentation branch on the review
     * card) -- only the annotator-status ROLLBACK side effect is. The label
     * must say so precisely instead of implying the whole action is
     * official_run-only. */
    await expect(page.locator('#shortcutReviewReject')).toHaveText('退回目前結果（回退標記員狀態僅限正式標記）');
    await expect(page.locator('.shortcut-help-row').filter({ hasText: '全部通過' })).toHaveCount(0);
    await expect(page.locator('.shortcut-help-row').filter({ hasText: '全部退回' })).toHaveCount(0);
  });

  test('translates shortcut entry and modal through the shared language toggle', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/pages/dashboard/dashboard.html');

    await page.locator('#langToggle').click();

    const button = page.getByTestId('shortcut-help-button');
    await expect(button).toHaveAttribute('aria-label', 'Keyboard shortcuts');
    await expect(button).toHaveText('');

    await button.click();
    await expect(page.getByRole('dialog', { name: 'Keyboard shortcuts' })).toBeVisible();
    await expect(page.getByText('Available shortcuts for this page')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Global' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Annotation workspace' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Review' })).toBeVisible();
    await expect(page.locator('#shortcutReviewApprove')).toHaveText('Approve current result');
    /* Issue #409: see the zh-locale test above for the rationale -- the label
     * must scope the "formal runs only" qualifier to the annotator-status
     * rollback side effect, not the reject control/key itself. */
    await expect(page.locator('#shortcutReviewReject')).toHaveText('Return current result (annotator status rollback is formal-run only)');
  });

  test('does not expose or open shortcut help on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/pages/dashboard/dashboard.html');

    const button = page.getByTestId('mobile-shortcut-help-button');
    await expect(button).toHaveCount(0);

    await page.keyboard.press('?');
    await expect(page.getByRole('dialog', { name: '快捷鍵' })).toBeHidden();
  });

  test('does not open shortcut help while typing in editable content', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/pages/dashboard/dashboard.html');

    await page.evaluate(() => {
      const editable = document.createElement('div');
      editable.id = 'shortcut-editable-target';
      editable.setAttribute('contenteditable', 'true');
      editable.style.position = 'fixed';
      editable.style.left = '24px';
      editable.style.top = '24px';
      editable.textContent = 'editable';
      document.body.appendChild(editable);
      editable.focus();
    });

    await page.keyboard.press('?');

    await expect(page.getByRole('dialog', { name: '快捷鍵' })).toBeHidden();
  });

  test('shows a single icon global theme toggle next to shortcut help', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.addInitScript(() => {
      window.localStorage.setItem('label-suite-theme', 'light');
    });
    await page.goto('/pages/dashboard/dashboard.html');

    const toggle = page.getByTestId('sidebar-theme-toggle');
    await expect(toggle).toBeVisible();
    await expect(toggle).toHaveAttribute('aria-label', '切換為深色模式');
    await expect(toggle.locator('[data-theme-toggle-icon="moon"]')).toBeVisible();
    await expect(toggle.locator('[data-theme-toggle-icon="sun"]')).toBeHidden();

    await toggle.click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(toggle).toHaveAttribute('aria-label', '切換為淺色模式');
    await expect(toggle.locator('[data-theme-toggle-icon="sun"]')).toBeVisible();
    await expect(toggle.locator('[data-theme-toggle-icon="moon"]')).toBeHidden();
  });

  test('shows logout instead of user identity in the icon-only sidebar footer', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.addInitScript(() => {
      window.localStorage.setItem('labelsuite.sidebarCollapsed', 'true');
    });
    await page.goto('/pages/dashboard/dashboard.html');

    await expect(page.locator('body')).toHaveClass(/sidebar-collapsed/);
    await expect(page.locator('#logoutBtn')).toBeVisible();
    await expect(page.locator('#logoutBtn')).toHaveAttribute('aria-label', '登出');
    await expect(page.locator('#userName')).toBeHidden();
    await expect(page.locator('#userAvatar')).toBeHidden();
  });
});
