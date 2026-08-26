/**
 * PL dashboard discoverable entry to review-flow demo tasks (issue #404)
 * Source spec: specs/dashboard/012-dashboard/spec.md
 *
 * T014-T017 (review-flow demo tasks, issue #302 / PR #305) were reachable
 * only through the Annotator/Reviewer task lists, or by already knowing the
 * exact "審核流程示範" keyword to type into task-list.html's search box.
 * A project leader browsing the dashboard had no discoverable entry point
 * at all (issue #404, Finding PL-05).
 *
 * The shortcut button rendered here is driven entirely by the generic
 * `demoCategory` field on dashboard.data.js task records plus the
 * `demoCategories` catalog (mirrors the existing `outputTypes` catalog
 * pattern) -- no task id is hardcoded in the rendering code
 * (Generalization-First). The last test in this file asserts that removing
 * every task's `demoCategory` tag makes the shortcut disappear, proving the
 * button is data-driven rather than a hardcoded T014-T017 check.
 *
 * Traceability: specs/dashboard/012-dashboard/spec.md FR-009E, SC-027
 */
import { test, expect } from '@playwright/test';

const DASHBOARD_URL = '/pages/dashboard/dashboard.html';
const DEMO_SHORTCUT_NAME = /審核流程示範|Review Flow Demo/;

test.describe.configure({ mode: 'serial' });

test.describe('Dashboard — PL review-flow demo shortcut (issue #404)', () => {
  test('project leader task list renders a demo-category shortcut button', async ({ page }) => {
    await page.goto(DASHBOARD_URL);
    await page.locator('.scenario-pill[data-scenario="project_leader"]').click();

    const shortcut = page
      .getByTestId('project-leader-view')
      .getByRole('button', { name: DEMO_SHORTCUT_NAME });
    await expect(shortcut).toBeVisible();
  });

  test('clicking the shortcut routes to the task list filtered to all four demo tasks', async ({ page }) => {
    await page.goto(DASHBOARD_URL);
    await page.locator('.scenario-pill[data-scenario="project_leader"]').click();

    const shortcut = page
      .getByTestId('project-leader-view')
      .getByRole('button', { name: DEMO_SHORTCUT_NAME });
    await shortcut.click();

    await expect(page).toHaveURL(
      /\/pages\/task-management\/task-list\.html\?task_role=project_leader&keyword=/,
    );
    await expect(page.locator('#searchInput')).toHaveValue('審核流程示範');
    await expect(page.locator('#paginationInfo')).toContainText('共 4 筆');
  });

  test('the shortcut switches to English copy on language toggle', async ({ page }) => {
    await page.goto(DASHBOARD_URL);
    await page.locator('.scenario-pill[data-scenario="project_leader"]').click();
    await page.getByTestId('lang-toggle').click();

    const shortcut = page
      .getByTestId('project-leader-view')
      .getByRole('button', { name: 'Review Flow Demo' });
    await expect(shortcut).toBeVisible();
  });

  test('the shortcut is absent when no task carries a demo category (data-driven, not hardcoded)', async ({ page }) => {
    await page.goto(DASHBOARD_URL);
    await page.evaluate(() => {
      const dashboard = (window as unknown as {
        LabelSuiteDashboard: {
          data: { tasks: Array<{ demoCategory?: string }> };
          renderTaskLists: () => void;
        };
      }).LabelSuiteDashboard;
      dashboard.data.tasks.forEach((task) => {
        delete task.demoCategory;
      });
      dashboard.renderTaskLists();
    });
    await page.locator('.scenario-pill[data-scenario="project_leader"]').click();

    const shortcut = page
      .getByTestId('project-leader-view')
      .getByRole('button', { name: DEMO_SHORTCUT_NAME });
    await expect(shortcut).toHaveCount(0);
  });
});
