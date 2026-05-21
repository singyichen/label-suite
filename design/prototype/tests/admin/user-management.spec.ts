import { test, expect } from '@playwright/test';

const USER_MANAGEMENT_URL = '/pages/admin/user-management.html';

async function visibleUserRows(page: import('@playwright/test').Page) {
  return page.locator('#userTableBody tr');
}

test.describe('Admin user management mobile sidebar layout', () => {
  test('keeps sidebar navbar fixed at the bottom on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(USER_MANAGEMENT_URL);

    const navbar = page.locator('.navbar');
    await expect(navbar).toBeVisible();
    await expect(navbar).toHaveCSS('position', 'fixed');
    await expect(navbar).toHaveCSS('bottom', '0px');
    await expect(navbar).toHaveCSS('left', '0px');
    await expect(navbar).toHaveCSS('right', '0px');
  });
});

test.describe('Admin user management list interactions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(USER_MANAGEMENT_URL);
  });

  test('filters users by case-insensitive name or email search', async ({ page }) => {
    await page.locator('#searchInput').fill('OLIVIA');

    const rows = await visibleUserRows(page);
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText('Olivia Lin');

    await page.locator('#searchInput').fill('jason.h@');
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText('Jason Huang');
  });

  test('filters users by system role and account status', async ({ page }) => {
    await page.locator('#roleFilter').selectOption('super_admin');
    await expect(await visibleUserRows(page)).toHaveCount(1);
    await expect(page.locator('#userTableBody')).toContainText('Mandy Chen');

    await page.locator('#roleFilter').selectOption('');
    await page.locator('#statusFilter').selectOption('disabled');
    await expect(await visibleUserRows(page)).toHaveCount(1);
    await expect(page.locator('#userTableBody')).toContainText('Jason Huang');
  });

  test('shows empty state and clears filters when no users match', async ({ page }) => {
    await page.locator('#searchInput').fill('no-such-user@example.com');

    await expect(page.locator('#userTableWrap')).toBeHidden();
    await expect(page.locator('#emptyState')).toBeVisible();

    await page.locator('#clearFiltersBtn').click();
    await expect(page.locator('#emptyState')).toBeHidden();
    await expect(page.locator('#userTableWrap')).toBeVisible();
    await expect(await visibleUserRows(page)).toHaveCount(5);
  });

  test('adds a user and immediately renders it in the table', async ({ page }) => {
    await page.locator('#addUserBtn').click();
    await page.locator('#addName').fill('Jane Doe');
    await page.locator('#addEmail').fill('jane.doe@labelsuite.io');
    await page.locator('#addRole').selectOption('super_admin');
    await page.locator('#addStatus').selectOption('active');
    await page.locator('#addSaveBtn').click();

    await expect(page.locator('#toast')).toBeVisible();
    await page.locator('#searchInput').fill('jane.doe');
    await expect(await visibleUserRows(page)).toHaveCount(1);
    await expect(page.locator('#userTableBody')).toContainText('Jane Doe');
    await expect(page.locator('#userTableBody')).toContainText('super_admin');
  });

  test('rejects duplicate email when adding a user', async ({ page }) => {
    await page.locator('#addUserBtn').click();
    await page.locator('#addName').fill('Duplicate Mandy');
    await page.locator('#addEmail').fill('mandy@labelsuite.io');
    await page.locator('#addSaveBtn').click();

    await expect(page.locator('#addModal')).toBeVisible();
    await expect(page.locator('#toast')).toBeVisible();
    await expect(page.locator('#toastInner')).toHaveClass(/error/);
  });

  test('edits an existing user and immediately updates the table', async ({ page }) => {
    await page.locator('#userTableBody tr', { hasText: 'Alex Wang' }).getByText('編輯').click();
    await page.locator('#editName').fill('Alex Chen');
    await page.locator('#editEmail').fill('alex.chen@labelsuite.io');
    await page.locator('#editRole').selectOption('super_admin');
    await page.locator('#editStatus').selectOption('active');
    await page.locator('#editSaveBtn').click();

    await page.locator('#searchInput').fill('alex.chen');
    await expect(await visibleUserRows(page)).toHaveCount(1);
    await expect(page.locator('#userTableBody')).toContainText('Alex Chen');
    await expect(page.locator('#userTableBody')).toContainText('super_admin');
  });

  test('disables and re-enables a user in place', async ({ page }) => {
    await page.locator('#userTableBody tr', { hasText: 'Alex Wang' }).getByText('停用').click();
    await page.locator('#disableConfirmBtn').click();

    const alexRow = page.locator('#userTableBody tr', { hasText: 'Alex Wang' });
    await expect(alexRow).toContainText('停用');
    await expect(alexRow.getByText('啟用')).toBeVisible();

    await alexRow.getByText('啟用').click();
    await expect(alexRow).toContainText('啟用');
    await expect(alexRow.getByText('停用')).toBeVisible();
  });

  test('matches task management action button layout', async ({ page }) => {
    const actions = page.locator('#userTableBody tr', { hasText: 'Rachel Su' }).locator('.td-actions');
    const dangerButton = actions.getByRole('button', { name: '停用' });
    const editButton = actions.getByRole('button', { name: '編輯' });

    await expect(actions).toHaveCSS('display', 'inline-flex');
    await expect(actions).toHaveCSS('gap', '8px');
    await expect(dangerButton).toHaveCSS('font-size', '12px');
    await expect(dangerButton).toHaveCSS('font-weight', '600');
    await expect(dangerButton).toHaveCSS('padding-top', '6px');
    await expect(dangerButton).toHaveCSS('padding-right', '10px');
    await expect(dangerButton).toHaveCSS('padding-bottom', '6px');
    await expect(dangerButton).toHaveCSS('padding-left', '10px');
    await expect(editButton).toHaveCSS('background-color', 'rgb(99, 102, 241)');
  });

  test('role settings tab navigates to role-settings page', async ({ page }) => {
    await page.locator('#tabRoles').click();
    await expect(page).toHaveURL(/role-settings\.html/);
  });
});
