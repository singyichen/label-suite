/**
 * Dashboard behavior gap tests (issue #183 audit)
 * Source spec: specs/dashboard/012-dashboard/spec.md
 *
 *   - Leader CTA navigates to task creation (was analytics-only dead button)
 *   - UXC-11: scenario round-trips through the URL (?scenario=)
 *   - UXC-09: an empty task list renders an explicit empty state
 */
import { test, expect } from '@playwright/test';

const DASHBOARD_URL = '/pages/dashboard/dashboard.html';

test.describe.configure({ mode: 'serial' });

test.describe('Dashboard — leader CTA navigation', () => {
  test('start-creating-task button routes to task-new', async ({ page }) => {
    await page.goto(DASHBOARD_URL);
    await page.locator('#ctaLeaderBtn').click();
    await expect(page).toHaveURL(/\/pages\/task-management\/task-new\.html$/);
  });
});

test.describe('Dashboard — UXC-11 scenario URL sync', () => {
  test('deep link with ?scenario= opens the matching view', async ({ page }) => {
    await page.goto(`${DASHBOARD_URL}?scenario=annotator`);
    await expect(page.locator('.scenario-pill[data-scenario="annotator"]')).toHaveClass(/active/);
    await expect(page.getByTestId('annotator-view')).toBeVisible();
    await expect(page.getByTestId('user-view')).not.toHaveClass(/is-active/);
  });

  test('switching scenarios writes the URL param and the default clears it', async ({ page }) => {
    await page.goto(DASHBOARD_URL);
    await page.locator('.scenario-pill[data-scenario="reviewer"]').click();
    await expect(page).toHaveURL(/scenario=reviewer/);

    await page.locator('.scenario-pill[data-scenario="user"]').click();
    await expect(page).not.toHaveURL(/scenario=/);
    await expect(page.getByTestId('user-view')).toBeVisible();
  });

  test('unknown scenario param falls back to the default view', async ({ page }) => {
    await page.goto(`${DASHBOARD_URL}?scenario=nonsense`);
    await expect(page.locator('.scenario-pill[data-scenario="user"]')).toHaveClass(/active/);
    await expect(page.getByTestId('user-view')).toBeVisible();
  });
});

test.describe('Dashboard — UXC-09 empty task list', () => {
  test('an empty role list renders an explicit empty state instead of a blank panel', async ({ page }) => {
    await page.goto(DASHBOARD_URL);
    await page.evaluate(() => {
      const dashboard = (window as unknown as {
        LabelSuiteDashboard: {
          data: { roleLists: Record<string, unknown[]> };
          renderTaskLists: () => void;
        };
      }).LabelSuiteDashboard;
      dashboard.data.roleLists.annotator = [];
      dashboard.renderTaskLists();
    });
    await page.locator('.scenario-pill[data-scenario="annotator"]').click();
    const emptyState = page.getByTestId('annotator-view').getByTestId('task-list-empty');
    await expect(emptyState).toBeVisible();
    await expect(emptyState).toHaveText(/目前沒有進行中的任務|No active tasks yet/);
  });
});
