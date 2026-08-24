/**
 * Dashboard task_membership loading Skeleton + API-error/retry state
 * (issue #261 drift item #5, spec FR-018/FR-019, SC-017/SC-018).
 *
 * Before this fix the dashboard rendered all role content synchronously
 * with no Skeleton and no error/retry affordance -- `?view=error` and
 * `?view=skeleton` are new test-only hooks (mirroring the existing
 * `?view=error` convention on task-list.html) to force each state
 * deterministically instead of racing a real timer.
 */
import { test, expect } from '@playwright/test';

const DASHBOARD_URL = '/pages/dashboard/dashboard.html';

test.describe('Dashboard Skeleton (FR-018)', () => {
  test('shows the Skeleton with metric-card and task-list placeholders before content resolves', async ({
    page,
  }) => {
    await page.goto(`${DASHBOARD_URL}?view=skeleton`);

    const skeleton = page.locator('#dashboardSkeleton');
    await expect(skeleton).toBeVisible();
    await expect(skeleton).toHaveAttribute('aria-busy', 'true');
    await expect(skeleton.locator('.skel-metric')).toHaveCount(4);
    await expect(skeleton.locator('.skel-row')).toHaveCount(3);

    await expect(page.locator('#contentGrid')).toBeHidden();
    await expect(page.locator('#dashboardErrorState')).toBeHidden();

    // ?view=skeleton must stay loading indefinitely (not just still be
    // mid-transition): outlast the normal ~400ms load delay and confirm
    // it never resolves on its own.
    await page.waitForTimeout(1000);
    await expect(skeleton).toBeVisible();
    await expect(page.locator('#contentGrid')).toBeHidden();
  });

  test('replaces the Skeleton with real content once the load resolves, with no blank-page flash', async ({
    page,
  }) => {
    await page.goto(DASHBOARD_URL);

    await expect(page.locator('#contentGrid')).toBeVisible();
    await expect(page.locator('#dashboardSkeleton')).toBeHidden();
    await expect(page.locator('#dashboardErrorState')).toBeHidden();
    await expect(page.locator('#view-user')).toBeVisible();
  });
});

test.describe('Dashboard task_membership API error (FR-019)', () => {
  test('ends the Skeleton and shows an i18n error message with a retry button on failure', async ({
    page,
  }) => {
    await page.goto(`${DASHBOARD_URL}?view=error`);

    const errorState = page.locator('#dashboardErrorState');
    await expect(errorState).toBeVisible();
    await expect(errorState).toHaveAttribute('role', 'alert');
    await expect(page.locator('#errorLoadTitle')).toHaveText('儀表板載入失敗');
    await expect(page.locator('#errorLoadDesc')).toHaveText('無法載入任務成員資格資料，請稍後再試。');
    await expect(page.locator('#errorRetryLabel')).toHaveText('重試');

    // Must not silently fall back to the general-user view or navigate away.
    await expect(page.locator('#dashboardSkeleton')).toBeHidden();
    await expect(page.locator('#contentGrid')).toBeHidden();
    await expect(page).toHaveURL(/dashboard\.html/);
  });

  test('localizes the error state in English mode', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('labelsuite.lang', 'en');
    });
    await page.goto(`${DASHBOARD_URL}?view=error`);

    await expect(page.locator('#errorLoadTitle')).toHaveText('Failed to load dashboard');
    await expect(page.locator('#errorLoadDesc')).toHaveText(
      'Task membership data could not be loaded. Please try again.',
    );
    await expect(page.locator('#errorRetryLabel')).toHaveText('Retry');
  });

  test('clicking retry recovers and shows the real dashboard content', async ({ page }) => {
    await page.goto(`${DASHBOARD_URL}?view=error`);
    await expect(page.locator('#dashboardErrorState')).toBeVisible();

    await page.locator('#errorRetryLabel').click();

    await expect(page.locator('#dashboardErrorState')).toBeHidden();
    await expect(page.locator('#contentGrid')).toBeVisible();
    await expect(page.locator('#view-user')).toBeVisible();
  });
});
