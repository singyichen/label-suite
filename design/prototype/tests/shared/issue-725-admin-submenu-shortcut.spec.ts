/**
 * Admin submenu direct shortcut to role-settings (issue #725).
 *
 * "系統管理" stays the single L0 item defined by spec 008 FR-002/FR-003A/
 * SC-003 (super_admin=6, user=5); on Desktop with the sidebar expanded it
 * additionally exposes a two-link submenu (使用者管理 / 角色設定) so
 * super_admin can reach role-settings.html directly instead of first
 * landing on user-management.html. Mobile and Desktop collapsed sidebar
 * keep the prior single-link behavior.
 *
 * Traceability: specs/shared/008-sidebar-navbar-shared/spec.md
 *   FR-019, FR-019A, FR-019B, FR-019C, FR-019D, FR-019E, SC-012, SC-012A, SC-012B
 */
import { test, expect } from '@playwright/test';

test.describe('Admin submenu direct shortcut to role-settings (issue #725)', () => {
  test('desktop expanded sidebar: clicking 系統管理 opens a submenu with two direct links without adding an L0 item', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/pages/dashboard/dashboard.html?scenario=super_admin_data');

    const l0Links = page.locator('.navbar-center .nav-link');
    await expect(l0Links).toHaveCount(6);

    const trigger = page.getByTestId('admin-nav-trigger');
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await trigger.click();
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');

    const submenu = page.getByTestId('admin-nav-submenu');
    await expect(submenu).toBeVisible();

    const roleSettingsLink = page.getByTestId('admin-nav-sublink-role-settings');
    await expect(roleSettingsLink).toHaveAttribute('href', /role-settings\.html$/);
    const userMgmtLink = page.getByTestId('admin-nav-sublink-user-management');
    await expect(userMgmtLink).toHaveAttribute('href', /user-management\.html$/);

    // Submenu sub-links are not counted as L0 items (FR-002/FR-003A/SC-003 unchanged).
    await expect(l0Links).toHaveCount(6);
  });

  test('clicking 角色設定 sublink from dashboard navigates directly to role-settings.html', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/pages/dashboard/dashboard.html?scenario=super_admin_data');

    await page.getByTestId('admin-nav-trigger').click();
    await page.getByTestId('admin-nav-sublink-role-settings').click();

    await expect(page).toHaveURL(/role-settings\.html$/);
  });

  test('current sub-item marking: role-settings.html marks 角色設定 as current, user-management.html marks 使用者管理', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    await page.goto('/pages/admin/role-settings.html');
    await page.getByTestId('admin-nav-trigger').click();
    await expect(page.getByTestId('admin-nav-sublink-role-settings')).toHaveAttribute('aria-current', 'page');
    await expect(page.getByTestId('admin-nav-sublink-user-management')).not.toHaveAttribute('aria-current', 'page');

    await page.goto('/pages/admin/user-management.html');
    await page.getByTestId('admin-nav-trigger').click();
    await expect(page.getByTestId('admin-nav-sublink-user-management')).toHaveAttribute('aria-current', 'page');
    await expect(page.getByTestId('admin-nav-sublink-role-settings')).not.toHaveAttribute('aria-current', 'page');
  });

  test('clicking outside or pressing Escape closes the submenu', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/pages/dashboard/dashboard.html?scenario=super_admin_data');

    const trigger = page.getByTestId('admin-nav-trigger');
    await trigger.click();
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await page.keyboard.press('Escape');
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');

    await trigger.click();
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await page.mouse.click(700, 500);
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  test('mobile bottom nav: 系統管理 still navigates directly to user-management without opening a submenu', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/pages/dashboard/dashboard.html?scenario=super_admin_data');

    await page.getByTestId('admin-nav-trigger').click();

    await expect(page).toHaveURL(/user-management\.html$/);
  });

  test('desktop collapsed sidebar: 系統管理 still navigates directly to user-management without opening a submenu', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.addInitScript(() => {
      window.localStorage.setItem('labelsuite.sidebarCollapsed', 'true');
    });
    await page.goto('/pages/dashboard/dashboard.html?scenario=super_admin_data');

    await expect(page.locator('body')).toHaveClass(/sidebar-collapsed/);

    await page.getByTestId('admin-nav-trigger').click();

    await expect(page).toHaveURL(/user-management\.html$/);
  });

  test('existing admin-tabs entry point inside user-management.html is preserved', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/pages/admin/user-management.html');

    const rolesTab = page.locator('#tabRoles');
    await expect(rolesTab).toHaveAttribute('href', 'role-settings.html');
    await rolesTab.click();

    await expect(page).toHaveURL(/role-settings\.html$/);
  });
});
