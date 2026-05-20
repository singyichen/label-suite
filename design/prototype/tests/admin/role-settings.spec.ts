import { test, expect } from '@playwright/test';

const ROLE_SETTINGS_URL = '/pages/admin/role-settings.html';

const EXPECTED_PERMISSION_KEYS = [
  'account.profile.view',
  'account.profile.edit',
  'dashboard.view',
  'task.list.view',
  'task.create',
  'task.detail.view',
  'task.members.manage',
  'annotation.workspace.annotate',
  'annotation.workspace.review',
  'dataset.stats.view',
  'dataset.quality.view',
  'dataset.export',
  'admin.user_management.view',
  'admin.user_management.manage',
  'admin.role_settings.view',
  'admin.role_settings.manage',
];

test.describe('Admin role settings mobile sidebar layout', () => {
  test('keeps shared sidebar fixed at bottom and brand section fixed at top on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(ROLE_SETTINGS_URL);

    const navbar = page.locator('.navbar');
    const brandSection = page.locator('.brand-section');

    await expect(navbar).toBeVisible();
    await expect(navbar).toHaveCSS('position', 'fixed');
    await expect(navbar).toHaveCSS('bottom', '0px');

    await expect(brandSection).toBeVisible();
    await expect(brandSection).toHaveCSS('position', 'fixed');
    await expect(brandSection).toHaveCSS('top', '0px');
  });

  test('does not show a mobile read-only notice block', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(ROLE_SETTINGS_URL);
    await expect(page.locator('#mobileNotice')).toHaveCount(0);
  });

  test('uses the same heading typography scale as other admin pages', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(ROLE_SETTINGS_URL);

    await expect(page.locator('.page-title')).toHaveCSS('font-size', '28px');
    await expect(page.locator('.page-subtitle')).toHaveCSS('font-size', '14px');
  });

  test('applies stored global language on initial load', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('labelsuite.lang', 'en');
    });

    await page.goto(ROLE_SETTINGS_URL);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.locator('#pageTitle')).toHaveText('Role Settings');
  });

  test('persists language selection across admin pages', async ({ page }) => {
    await page.goto(ROLE_SETTINGS_URL);
    await page.evaluate(() => {
      window.localStorage.setItem('labelsuite.lang', 'zh');
    });
    await page.reload();

    await page.click('#langToggle');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');

    await page.goto('/pages/admin/user-management.html');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.locator('#pageTitle')).toHaveText('User Management');
  });

  test('shows language toggle label in single-code format', async ({ page }) => {
    await page.goto(ROLE_SETTINGS_URL);
    await expect(page.locator('#langLabel')).toHaveText('ZH');
    await expect(page.locator('#mobileLangLabel')).toHaveText('ZH');

    await page.click('#langToggle');
    await expect(page.locator('#langLabel')).toHaveText('EN');
    await expect(page.locator('#mobileLangLabel')).toHaveText('EN');
  });
});

test.describe('Admin role settings matrix behavior', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(ROLE_SETTINGS_URL);
  });

  test('renders the complete whitelist and canonical role keys', async ({ page }) => {
    await expect(page.locator('.perm-key')).toHaveText(EXPECTED_PERMISSION_KEYS);

    await expect(page.locator('#thRoleUser')).toContainText('user');
    await expect(page.locator('#thRoleSuperAdmin')).toContainText('super_admin');
    await expect(page.locator('#thRoleProjectLeader')).toContainText('project_leader');
    await expect(page.locator('#thRoleReviewer')).toContainText('reviewer');
    await expect(page.locator('#thRoleAnnotator')).toContainText('annotator');

    const roleKeys = await page.locator('.matrix-checkbox').evaluateAll((nodes) =>
      [...new Set(nodes.map((node) => (node as HTMLInputElement).dataset.role))].sort()
    );
    expect(roleKeys).toEqual(['annotator', 'project_leader', 'reviewer', 'user']);
  });

  test('shows dirty state and cancel restores the saved matrix in place', async ({ page }) => {
    const taskCreateUser = page.locator('[data-key="task.create"][data-role="user"]');
    await expect(taskCreateUser).toBeChecked();

    await taskCreateUser.uncheck();
    await expect(page.locator('#dirtyBanner')).toBeVisible();

    await page.locator('#cancelBtn').click();
    await expect(page).toHaveURL(/role-settings\.html/);
    await expect(taskCreateUser).toBeChecked();
    await expect(page.locator('#dirtyBanner')).toBeHidden();
  });

  test('saves role matrix changes and reloads the persisted state', async ({ page }) => {
    const taskCreateUser = page.locator('[data-key="task.create"][data-role="user"]');
    await taskCreateUser.uncheck();
    await page.locator('#saveBtn').click();

    await expect(page.locator('#toast')).toBeVisible();
    await expect(page.locator('#dirtyBanner')).toBeHidden();

    await page.reload();
    await expect(page.locator('[data-key="task.create"][data-role="user"]')).not.toBeChecked();
  });

  test('keeps the matrix editable on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.reload();

    const taskCreateUser = page.locator('[data-key="task.create"][data-role="user"]');
    await taskCreateUser.uncheck();

    await expect(taskCreateUser).not.toBeChecked();
    await expect(page.locator('#dirtyBanner')).toBeVisible();
  });

  test('rejects stale saves and reloads the latest matrix version', async ({ page }) => {
    await page.evaluate(() => {
      window.localStorage.setItem('labelsuite.roleSettings.version', '2');
      window.localStorage.setItem(
        'labelsuite.roleSettings.matrix',
        JSON.stringify({ 'task.create__user': false })
      );
    });

    await page.locator('[data-key="task.list.view"][data-role="user"]').uncheck();
    await page.locator('#saveBtn').click();

    await expect(page.locator('#conflictBanner')).toBeVisible();
    await expect(page.locator('#toastInner')).toHaveClass(/error/);
    await expect(page.locator('#saveBtn')).toBeDisabled();

    await page.locator('#reloadBtn').click();
    await expect(page.locator('#conflictBanner')).toBeHidden();
    await expect(page.locator('[data-key="task.create"][data-role="user"]')).not.toBeChecked();
    await expect(page.locator('[data-key="task.list.view"][data-role="user"]')).toBeChecked();
  });

  test('user management tab returns to the user management page', async ({ page }) => {
    await page.locator('#tabUsers').click();
    await expect(page).toHaveURL(/user-management\.html/);
  });
});
