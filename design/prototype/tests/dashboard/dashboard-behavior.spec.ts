/**
 * Dashboard behavior gap tests (issue #183 audit)
 * Source spec: specs/dashboard/012-dashboard/spec.md
 *
 *   - Leader CTA navigates to task creation (was analytics-only dead button)
 *   - UXC-11: scenario round-trips through the URL (?scenario=)
 *   - UXC-09: an empty task list renders an explicit empty state
 *   - Issue #186: pending-IAA stat is a clickable, keyboard-operable entry
 *     point that reconciles with the task list it links to
 *
 * Traceability: specs/dashboard/012-dashboard/spec.md
 *   FR-007B, FR-008F, FR-009A1, SC-025
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

test.describe('Dashboard — issue #186 pending-IAA stat entry point', () => {
  test('admin stat is clickable and reconciles with the filtered task list', async ({ page }) => {
    await page.goto(DASHBOARD_URL);
    await page.locator('.scenario-pill[data-scenario="super_admin_data"]').click();

    const stat = page.locator('#adminPendingIaaValue');
    await expect(stat).toHaveAttribute('role', 'button');
    await expect(stat).toHaveAttribute('tabindex', '0');
    /* Baseline: T002 is the only waiting_iaa_confirmation seed
       (task-list.data.js), so the stat must read 1. */
    await expect(stat).toHaveText('1 個');
    await stat.click();

    await expect(page).toHaveURL(
      /\/pages\/task-management\/task-list\.html\?task_role=super_admin&status=waiting_iaa_confirmation$/,
    );
    await expect(page.locator('#statusFilter')).toHaveValue('waiting_iaa_confirmation');
    await expect(page.locator('#paginationInfo')).toContainText('共 1 筆');
    await expect(page.locator('#taskTableBody tr')).toHaveCount(1);
  });

  test('project leader stat is keyboard-operable and reconciles with the filtered task list', async ({ page }) => {
    await page.goto(DASHBOARD_URL);
    await page.locator('.scenario-pill[data-scenario="project_leader"]').click();

    const stat = page.locator('#plPendingIaaValue');
    await expect(stat).toHaveAttribute('role', 'button');
    await stat.focus();
    await page.keyboard.press('Enter');

    await expect(page).toHaveURL(
      /\/pages\/task-management\/task-list\.html\?task_role=project_leader&status=waiting_iaa_confirmation$/,
    );
    await expect(page.locator('#paginationInfo')).toContainText('共 1 筆');
    await expect(page.locator('#taskTableBody tr')).toHaveCount(1);
  });
});
