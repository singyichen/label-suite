/**
 * Dashboard page prototype tests
 * Source spec: specs/dashboard/012-dashboard/spec.md
 *
 * Tests that can be validated against the static HTML prototype:
 *   - Role-driven dashboard rendering
 *   - Scenario switcher exposes required wireframe states
 *   - User empty state promotes create-task CTA
 *   - Super Admin shows platform progress summary
 *   - Project Leader shows system announcement block
 *   - Annotator quick continue CTA targets annotation workspace
 *   - Language toggle updates key UI copy immediately
 *   - Responsive rendering at 375px / 768px / 1440px
 */
import { test, expect } from '@playwright/test';

const DASHBOARD_URL = '/pages/dashboard/dashboard.html';

async function openAsRole(page: import('@playwright/test').Page, role: string) {
  await page.addInitScript((value) => {
    window.sessionStorage.setItem('proto_role', value);
  }, role);
  await page.goto(DASHBOARD_URL);
}

test.describe('Dashboard page — role rendering', () => {
  test('super admin sees platform progress summary', async ({ page }) => {
    await openAsRole(page, 'super_admin');
    await expect(page.getByTestId('role-indicator')).toContainText(/系統管理員|Super Admin/i);
    await expect(page.getByTestId('super-admin-view')).toBeVisible();
    await expect(page.getByTestId('sa-progress-summary')).toBeVisible();
  });

  test('project leader sees system announcement block', async ({ page }) => {
    await openAsRole(page, 'project_leader');
    await expect(page.getByTestId('pl-view')).toBeVisible();
    await expect(page.getByTestId('system-announcement')).toBeVisible();
  });

  test('annotator sees quick continue CTA to annotation workspace', async ({ page }) => {
    await openAsRole(page, 'annotator');
    const cta = page.getByTestId('quick-continue-btn');
    await expect(cta).toBeVisible();
    await expect(cta).toHaveAttribute('href', /annotation-workspace\.html\?taskId=/);
  });

  test('reviewer can switch to reviewer empty state', async ({ page }) => {
    await openAsRole(page, 'reviewer');
    await page.getByRole('button', { name: /Reviewer Empty|Reviewer 空狀態/ }).click();
    await expect(page.getByTestId('reviewer-empty-view')).toBeVisible();
    await expect(page.getByTestId('review-empty-stats-btn')).toBeVisible();
  });
});

test.describe('Dashboard page — scenario switcher', () => {
  test('user empty state exposes create task as primary CTA', async ({ page }) => {
    await openAsRole(page, 'project_leader');
    await page.getByRole('button', { name: /User Empty|無任務空狀態/ }).click();
    const createBtn = page.getByTestId('create-task-btn');
    await expect(page.getByTestId('user-empty-view')).toBeVisible();
    await expect(createBtn).toBeVisible();
    await expect(createBtn).toHaveAttribute('href', /task-new\.html/);
  });

  test('super admin error state can recover back to data view', async ({ page }) => {
    await openAsRole(page, 'super_admin');
    await page.getByRole('button', { name: /Error|錯誤/ }).click();
    await expect(page.getByTestId('dashboard-error')).toBeVisible();
    await page.getByRole('button', { name: /Retry|重試載入/ }).click();
    await expect(page.getByTestId('super-admin-view')).toBeVisible();
  });
});

test.describe('Dashboard page — language toggle', () => {
  test('switches headline copy to English immediately', async ({ page }) => {
    await openAsRole(page, 'project_leader');
    await expect(page.getByTestId('dashboard-title')).toContainText('儀表板');
    await page.getByTestId('lang-toggle').click();
    await expect(page.getByTestId('lang-label')).toHaveText('EN');
    await expect(page.getByTestId('dashboard-title')).toContainText('Dashboard as the first decision surface');
  });
});

test.describe('Dashboard page — responsive rendering', () => {
  const viewports = [
    { name: '375px (mobile)', width: 375, height: 812 },
    { name: '768px (tablet)', width: 768, height: 1024 },
    { name: '1440px (desktop)', width: 1440, height: 900 },
  ];

  for (const vp of viewports) {
    test(`renders without horizontal overflow at ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await openAsRole(page, 'project_leader');
      await expect(page.getByTestId('dashboard-shell')).toBeVisible();
      const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
      const clientWidth = await page.evaluate(() => document.body.clientWidth);
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
    });
  }
});
