/**
 * Dashboard page prototype tests
 * Source spec: specs/dashboard/012-dashboard/spec.md
 *
 * Tests validated against the current static HTML prototype:
 *   - Scenario switcher reveals the matching dashboard view
 *   - Each role view exposes its key content block
 *   - Language toggle updates the document language state
 *   - Responsive rendering at 375px / 768px / 1440px
 */
import { test, expect, type Page } from '@playwright/test';

const DASHBOARD_URL = '/pages/dashboard/dashboard.html';

async function openScenario(page: Page, scenario: 'super_admin_data' | 'project_leader' | 'annotator' | 'reviewer') {
  await page.goto(DASHBOARD_URL);
  const trigger = page.locator(`.scenario-pill[data-scenario="${scenario}"]`);
  await expect(trigger).toBeVisible();
  await trigger.click();
}

test.describe('Dashboard page — scenario rendering', () => {
  test('super admin view shows platform-level summary panels', async ({ page }) => {
    await openScenario(page, 'super_admin_data');
    await expect(page.getByTestId('super-admin-view')).toBeVisible();
    await expect(page.getByRole('heading', { name: /平台統計|Platform Stats/ })).toBeVisible();
    await expect(page.getByRole('heading', { name: /任務概況|Task Overview/ })).toBeVisible();
    await expect(page.getByRole('heading', { name: /最近提醒|Recent Alerts/ })).toBeVisible();
  });

  test('project leader view shows my tasks list', async ({ page }) => {
    await openScenario(page, 'project_leader');
    const leaderView = page.getByTestId('project-leader-view');
    await expect(leaderView).toBeVisible();
    await expect(leaderView.getByRole('heading', { name: /我的任務|My Tasks/ })).toBeVisible();
    await expect(leaderView.getByText('新聞標題分類')).toBeVisible();
    await expect(leaderView.getByText('情感分析基準')).toBeVisible();
  });

  test('annotator view shows progress metrics and continue action', async ({ page }) => {
    await openScenario(page, 'annotator');
    await expect(page.getByTestId('annotator-view')).toBeVisible();
    await expect(page.getByRole('heading', { name: /我的進度|My Progress/ })).toBeVisible();
    await expect(page.getByText(/247/)).toBeVisible();
    await expect(page.getByRole('button', { name: /快速繼續|Continue/ })).toBeVisible();
  });

  test('reviewer view shows pending review panel and start-review action', async ({ page }) => {
    await openScenario(page, 'reviewer');
    await expect(page.getByTestId('reviewer-view')).toBeVisible();
    await expect(page.getByRole('heading', { name: /待審查|Pending Review/ })).toBeVisible();
    await expect(page.getByText(/12 待審/)).toBeVisible();
    await expect(page.getByRole('button', { name: /開始審查|Start Review/ })).toBeVisible();
  });
});

test.describe('Dashboard page — scenario switcher', () => {
  test('switching scenarios updates the active pill and visible view', async ({ page }) => {
    await page.goto(DASHBOARD_URL);

    const superAdminPill = page.locator('.scenario-pill[data-scenario="super_admin_data"]');
    const reviewerPill = page.locator('.scenario-pill[data-scenario="reviewer"]');

    await expect(superAdminPill).toHaveClass(/active/);
    await expect(page.getByTestId('super-admin-view')).toBeVisible();

    await reviewerPill.click();

    await expect(reviewerPill).toHaveClass(/active/);
    await expect(superAdminPill).not.toHaveClass(/active/);
    await expect(page.getByTestId('reviewer-view')).toBeVisible();
    await expect(page.getByTestId('super-admin-view')).not.toHaveClass(/is-active/);
  });
});

test.describe('Dashboard page — language toggle', () => {
  test('toggles the document language and visible copy between zh-TW and en', async ({ page }) => {
    await page.goto(DASHBOARD_URL);

    const title = page.getByRole('heading', { level: 1 });
    await expect(page.locator('html')).toHaveAttribute('lang', 'zh-TW');
    await expect(page.getByTestId('lang-label')).toHaveText('EN');
    await expect(title).toContainText('歡迎回來，Mandy');

    await page.getByTestId('lang-toggle').click();

    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.getByTestId('lang-label')).toHaveText('ZH');
    await expect(title).toContainText('Welcome back, Mandy');

    await page.getByTestId('lang-toggle').click();

    await expect(page.locator('html')).toHaveAttribute('lang', 'zh-TW');
    await expect(page.getByTestId('lang-label')).toHaveText('EN');
    await expect(title).toContainText('歡迎回來，Mandy');
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
      await page.goto(DASHBOARD_URL);
      await expect(page.getByTestId('dashboard-shell')).toBeVisible();
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
    });
  }
});
