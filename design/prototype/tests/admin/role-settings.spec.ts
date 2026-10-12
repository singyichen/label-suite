/**
 * Traceability: specs/admin/007-role-settings/spec.md
 *   FR-003, FR-003b, FR-003c, FR-003d, FR-004, FR-005, FR-005a, FR-005b,
 *   FR-006, FR-008a, FR-009, FR-010, FR-011, SC-003, SC-007, SC-011
 */
import { test, expect } from '../fixtures';

const ROLE_SETTINGS_URL = '/pages/admin/role-settings.html';

const EXPECTED_PERMISSION_KEYS = [
  'account.profile.view',
  'account.profile.edit',
  'dashboard.view',
  'task.list.view',
  'task.create',
  'task.detail.view',
  'task.detail.edit',
  'task.members.manage',
  'task.lifecycle.manage',
  'task.delete',
  'annotation.workspace.annotate',
  'annotation.workspace.review',
  'annotation.exception.resolve',
  'annotation.dispute.adjudicate',
  'dataset.stats.view',
  'dataset.quality.view',
  'dataset.export',
  'admin.user_management.view',
  'admin.user_management.manage',
  'admin.role_settings.view',
  'admin.role_settings.manage',
  'admin.platform_overview.view',
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

    await expect(page.locator('#thRoleUser')).toHaveAttribute('data-role', 'user');
    await expect(page.locator('#thRoleSuperAdmin')).toHaveAttribute('data-role', 'super_admin');
    await expect(page.locator('#thRoleProjectLeader')).toHaveAttribute('data-role', 'project_leader');
    await expect(page.locator('#thRoleReviewer')).toHaveAttribute('data-role', 'reviewer');
    await expect(page.locator('#thRoleAnnotator')).toHaveAttribute('data-role', 'annotator');

    const roleKeys = await page.locator('.matrix-checkbox').evaluateAll((nodes) =>
      [...new Set(nodes.map((node) => (node as HTMLInputElement).dataset.role))].sort()
    );
    expect(roleKeys).toEqual(['annotator', 'project_leader', 'reviewer', 'super_admin', 'user']);
  });

  test('shows dirty state and cancel restores the saved matrix in place', async ({ page }) => {
    const taskCreateUser = page.locator('[data-key="task.create"][data-role="user"]');
    await expect(taskCreateUser).toBeChecked();

    await page.locator('#editBtn').click();
    await taskCreateUser.uncheck();
    await expect(page.locator('#dirtyBanner')).toBeVisible();

    // Cancel while dirty routes through the UXC-03 guard modal
    await page.locator('#cancelBtn').click();
    await page.locator('#dirtyModal').getByText('放棄變更').click();
    await expect(page).toHaveURL(/role-settings\.html/);
    await expect(taskCreateUser).toBeChecked();
    await expect(page.locator('#dirtyBanner')).toBeHidden();
  });

  test('guards unsaved changes behind the dirty modal (UXC-03)', async ({ page }) => {
    const taskCreateUser = page.locator('[data-key="task.create"][data-role="user"]');
    const modal = page.locator('#dirtyModal');

    // Cancel with no edits exits immediately — no guard
    await page.locator('#editBtn').click();
    await page.locator('#cancelBtn').click();
    await expect(modal).toBeHidden();

    // Cancel while dirty opens the guard modal instead of discarding
    await page.locator('#editBtn').click();
    await taskCreateUser.uncheck();
    await page.locator('#cancelBtn').click();
    await expect(modal).toBeVisible();

    // Stay keeps the edits in place
    await modal.getByText('繼續編輯').click();
    await expect(modal).toBeHidden();
    await expect(taskCreateUser).not.toBeChecked();
    await expect(page.locator('#dirtyBanner')).toBeVisible();

    // Escape also stays
    await page.locator('#cancelBtn').click();
    await expect(modal).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(modal).toBeHidden();
    await expect(taskCreateUser).not.toBeChecked();

    // Leave discards the edits and exits edit mode
    await page.locator('#cancelBtn').click();
    await modal.getByText('放棄變更').click();
    await expect(modal).toBeHidden();
    await expect(taskCreateUser).toBeChecked();
    await expect(page.locator('#dirtyBanner')).toBeHidden();
  });

  test('saves role matrix changes and reloads the persisted state', async ({ page }) => {
    const taskCreateUser = page.locator('[data-key="task.create"][data-role="user"]');
    await page.locator('#editBtn').click();
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
    await page.locator('#editBtn').click();
    await taskCreateUser.uncheck();

    await expect(taskCreateUser).not.toBeChecked();
    await expect(page.locator('#dirtyBanner')).toBeVisible();
  });

  test('rejects stale saves and reloads the latest matrix version', async ({ page }) => {
    // localStorage is patched AFTER page load so matrixVersion (in-memory) stays at 1,
    // while storage jumps to 2 — this triggers the stale-save conflict path.
    // If this evaluate were moved to addInitScript (before load), matrixVersion would init
    // to 2 and no conflict would fire.
    await page.evaluate(() => {
      window.localStorage.setItem('labelsuite.roleSettings.version', '2');
      window.localStorage.setItem(
        'labelsuite.roleSettings.matrix',
        JSON.stringify({ 'task.create__user': false })
      );
    });

    await page.locator('#editBtn').click();
    await page.locator('[data-key="task.list.view"][data-role="user"]').uncheck();
    await page.locator('#saveBtn').click();

    await expect(page.locator('#conflictBanner')).toBeVisible();
    await expect(page.locator('#toast')).toHaveClass(/toast-error/);
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

  test('follows the UXC-07 toast contract', async ({ page }) => {
    // Top-center container on the shared z-toast layer
    const container = page.locator('.toast-container');
    await expect(container).toHaveCSS('top', '24px');
    await expect(container).toHaveCSS('z-index', '400');

    const toast = page.locator('#toast');
    await expect(toast).toBeHidden();

    await page.locator('#editBtn').click();
    await page.locator('[data-key="task.create"][data-role="user"]').uncheck();
    await page.locator('#saveBtn').click();

    await expect(toast).toBeVisible();
    await expect(toast).toHaveClass(/toast-success/);

    // Manual close control
    await page.locator('#toastClose').click();
    await expect(toast).toBeHidden();
  });

  test('aligns page-level details with the design system', async ({ page }) => {
    // Task-role badge renders an inline Lucide SVG, not an emoji glyph
    const badge = page.locator('.task-role-badge').first();
    await expect(badge.locator('svg')).toHaveCount(1);
    await expect(badge).not.toContainText('⛔');

    // Section description drops emoji glyph references
    await expect(page.locator('#matrixSectionDesc')).not.toContainText('⛔');
    await expect(page.locator('#matrixSectionDesc')).not.toContainText('🔒');

    // Permission keys use the shared mono font stack
    await expect(page.locator('.perm-key').first()).toHaveCSS('font-family', /JetBrains Mono/);

    // Page title uses the shared serif display stack
    await expect(page.locator('.page-title')).toHaveCSS('font-family', /Crimson Pro/);

    // Admin tabs expose an accessible name
    await expect(page.locator('.admin-tabs')).toHaveAttribute('aria-label', /.+/);

    // Matrix wrapper is flat (border instead of shadow)
    const wrapper = page.locator('.matrix-scroll-wrapper');
    await expect(wrapper).toHaveCSS('box-shadow', 'none');
    await expect(wrapper).toHaveCSS('border-top-width', '1px');
  });
});

const SYSTEM_KEYS = EXPECTED_PERMISSION_KEYS.filter(
  (k) =>
    k.startsWith('account.') ||
    k.startsWith('admin.') ||
    ['dashboard.view', 'task.list.view', 'task.create'].includes(k)
);
const TASK_KEYS = EXPECTED_PERMISSION_KEYS.filter((k) => !SYSTEM_KEYS.includes(k));
const ADMIN_KEYS = EXPECTED_PERMISSION_KEYS.filter((k) => k.startsWith('admin.'));
const cell = (page: import('@playwright/test').Page, key: string, role: string) =>
  page.locator(`.matrix-checkbox[data-key="${key}"][data-role="${role}"]`);

test.describe('Admin role settings 22-key matrix sync (#1264, #1270)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(ROLE_SETTINGS_URL);
  });

  test('splits keys into 10 system and 12 task keys (layer sanity)', () => {
    expect(SYSTEM_KEYS).toHaveLength(10);
    expect(TASK_KEYS).toHaveLength(12);
  });

  test('renders exactly 56 applicable cells with no layer-mismatched checkbox (FR-008a)', async ({ page }) => {
    await expect(page.locator('.matrix-checkbox')).toHaveCount(56);
    for (const key of SYSTEM_KEYS) {
      for (const role of ['user', 'super_admin']) await expect(cell(page, key, role)).toHaveCount(1);
      for (const role of ['project_leader', 'reviewer', 'annotator']) await expect(cell(page, key, role)).toHaveCount(0);
    }
    for (const key of TASK_KEYS) {
      for (const role of ['project_leader', 'reviewer', 'annotator']) await expect(cell(page, key, role)).toHaveCount(1);
      for (const role of ['user', 'super_admin']) await expect(cell(page, key, role)).toHaveCount(0);
    }
  });

  test('marks exactly 12 fixed cells that stay disabled in edit mode (FR-008a)', async ({ page }) => {
    await expect(page.locator('.matrix-checkbox[data-fixed="true"]')).toHaveCount(12);

    const fixed: Array<[string, string, boolean]> = [
      ['dashboard.view', 'user', true],
      ['dashboard.view', 'super_admin', true],
      ...ADMIN_KEYS.map((k): [string, string, boolean] => [k, 'user', false]),
      ...ADMIN_KEYS.map((k): [string, string, boolean] => [k, 'super_admin', true]),
    ];
    await page.locator('#editBtn').click();
    for (const [key, role, checked] of fixed) {
      const box = cell(page, key, role);
      await expect(box).toHaveAttribute('data-fixed', 'true');
      await expect(box).toBeDisabled();
      if (checked) await expect(box).toBeChecked();
      else await expect(box).not.toBeChecked();
    }
  });

  test('enables the other 44 cells in edit mode and disables all 56 in view mode', async ({ page }) => {
    await expect(page.locator('.matrix-checkbox:enabled')).toHaveCount(0);
    await page.locator('#editBtn').click();
    await expect(page.locator('.matrix-checkbox:enabled')).toHaveCount(44);
    await expect(page.locator('.matrix-checkbox[data-fixed="true"]:enabled')).toHaveCount(0);
  });

  test('super_admin account/task-list cells are checked and editable (canon wins)', async ({ page }) => {
    const keys = ['account.profile.view', 'account.profile.edit', 'task.list.view', 'task.create'];
    await page.locator('#editBtn').click();
    for (const key of keys) {
      await expect(cell(page, key, 'super_admin')).toBeChecked();
      await expect(cell(page, key, 'super_admin')).toBeEnabled();
    }
  });

  test('task.detail.edit and task.detail.view defaults per task role', async ({ page }) => {
    await expect(cell(page, 'task.detail.edit', 'project_leader')).toBeChecked();
    await expect(cell(page, 'task.detail.edit', 'reviewer')).not.toBeChecked();
    await expect(cell(page, 'task.detail.edit', 'annotator')).not.toBeChecked();
    await expect(cell(page, 'task.detail.view', 'reviewer')).toBeChecked();
  });

  test('five #1270 keys carry the canonical defaults', async ({ page }) => {
    for (const key of ['task.lifecycle.manage', 'task.delete', 'annotation.exception.resolve', 'annotation.dispute.adjudicate']) {
      await expect(cell(page, key, 'project_leader')).toBeChecked();
      await expect(cell(page, key, 'reviewer')).not.toBeChecked();
      await expect(cell(page, key, 'annotator')).not.toBeChecked();
      for (const role of ['user', 'super_admin']) await expect(cell(page, key, role)).toHaveCount(0);
    }
    const platform = 'admin.platform_overview.view';
    await expect(cell(page, platform, 'super_admin')).toBeChecked();
    await expect(cell(page, platform, 'super_admin')).toHaveAttribute('data-fixed', 'true');
    await expect(cell(page, platform, 'user')).not.toBeChecked();
    await expect(cell(page, platform, 'user')).toHaveAttribute('data-fixed', 'true');
  });

  test('no-op save keeps version and audit log unchanged (FR-010)', async ({ page }) => {
    await page.locator('#editBtn').click();
    await page.locator('#saveBtn').click();

    const version = await page.evaluate(() => Number(window.localStorage.getItem('labelsuite.roleSettings.version') || '1'));
    expect(version).toBe(1);

    await page.locator('#auditLogBtn').click();
    await expect(page.locator('#auditLogList .audit-log-entry')).toHaveCount(3);
  });

  test('real save bumps version to 2 and appends one audit entry (FR-010)', async ({ page }) => {
    await page.locator('#editBtn').click();
    await cell(page, 'task.create', 'user').uncheck();
    await page.locator('#saveBtn').click();

    const version = await page.evaluate(() => Number(window.localStorage.getItem('labelsuite.roleSettings.version') || '1'));
    expect(version).toBe(2);

    await page.locator('#auditLogBtn').click();
    await expect(page.locator('#auditLogList .audit-log-entry')).toHaveCount(4);
  });
});

test.describe('Admin role settings stored payload validation (FR-011, SC-011)', () => {
  test('rejects the whole payload when it contains an unknown key', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem(
        'labelsuite.roleSettings.matrix',
        JSON.stringify({ 'bogus.key__user': true, 'task.create__user': false })
      );
    });
    await page.goto(ROLE_SETTINGS_URL);

    await expect(cell(page, 'task.create', 'user')).toBeChecked();
    await expect(page.locator('#toast')).toBeVisible();
    await expect(page.locator('#toast')).toHaveClass(/toast-error/);
  });

  test('rejects a stored payload that violates a fixed cell', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem(
        'labelsuite.roleSettings.matrix',
        JSON.stringify({ 'admin.role_settings.manage__user': true })
      );
    });
    await page.goto(ROLE_SETTINGS_URL);

    await expect(cell(page, 'admin.role_settings.manage', 'user')).not.toBeChecked();
    await expect(page.locator('#toast')).toBeVisible();
    await expect(page.locator('#toast')).toHaveClass(/toast-error/);
  });
});
