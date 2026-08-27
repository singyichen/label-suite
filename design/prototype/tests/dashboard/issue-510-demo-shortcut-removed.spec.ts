/**
 * PL dashboard no longer renders a demo-category shortcut (issue #510)
 * Source spec: specs/dashboard/012-dashboard/spec.md
 *
 * Issue #404 put a "審核流程示範" shortcut above the PL task list, on the
 * premise that T014-T017 could not be found from the dashboard or from its
 * "查看全部" entry. That premise only held for the three task cards the
 * dashboard itself renders: `plViewAllBtn` calls openTaskList without a
 * keyword, so the unfiltered task list already lists all 17 seeded tasks,
 * the four review-flow demo ones included. The shortcut saved a keyword
 * lookup rather than making anything reachable, so FR-009E and SC-027 were
 * retired and the button removed.
 *
 * The second test pins that premise rather than the removal: should View All
 * ever start applying a filter, the demo tasks would lose the discoverable
 * path this removal relies on, and this guard fails instead of letting the
 * regression pass silently.
 */
import { test, expect } from '@playwright/test';

const DASHBOARD_URL = '/pages/dashboard/dashboard.html';
const DEMO_SHORTCUT_NAME = /審核流程示範|Review Flow Demo/;
const DEMO_TASK_NAMES = [
  '審核流程示範：試標',
  '審核流程示範：正式標記（單一審核員）',
  '審核流程示範：正式標記（三審核員多數決）',
  '審核流程示範：正式標記（雙審核員平手）',
];

test.describe('Dashboard — PL demo shortcut removed (issue #510)', () => {
  test('project leader task list renders no demo-category shortcut button', async ({ page }) => {
    await page.goto(DASHBOARD_URL);
    await page.locator('.scenario-pill[data-scenario="project_leader"]').click();

    const plView = page.getByTestId('project-leader-view');
    await expect(plView.getByRole('button', { name: DEMO_SHORTCUT_NAME })).toHaveCount(0);
    await expect(plView.locator('#plDemoShortcuts')).toHaveCount(0);
    await expect(plView.locator('.demo-shortcut-btn')).toHaveCount(0);
  });

  test('the View All entry still reaches every demo task through the unfiltered task list', async ({ page }) => {
    await page.goto(DASHBOARD_URL);
    await page.locator('.scenario-pill[data-scenario="project_leader"]').click();
    await page.locator('#plViewAllBtn').click();

    await expect(page).toHaveURL(/\/task-list\.html\?task_role=project_leader$/);
    await expect(page.locator('#searchInput')).toHaveValue('');
    await expect(page.locator('#paginationInfo')).toContainText('共 17 筆');

    for (const name of DEMO_TASK_NAMES) {
      await expect(page.getByText(name, { exact: true })).toBeVisible();
    }
  });
});
