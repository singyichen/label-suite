/* Red tests for Workspace Tabs (specs/shared/019-workspace-tabs/spec.md),
 * issue #1075 sub-group G2a-1 -- tab bar existence, open/switch-by-dedupe,
 * and the modifier/middle-click native-behavior guarantee (AC-1.1-AC-1.4),
 * desktop viewport (1280x900) only. AC-1.5 (close button) and AC-1.6
 * (task-detail stage badge) are G2a-2's Red contract, in
 * workspace-tabs-close-badge.spec.ts (split for PR size; see that file's
 * header).
 *
 * No implementation exists yet: `design/prototype/pages/shared/sidebar.js`
 * / `sidebar.css` render no tab bar at all. Every test below is expected to
 * FAIL until a later G2a-1 Green task adds one matching the selector
 * contract documented in `_workspace-tabs-helpers.ts`.
 */
import { test, expect } from '@playwright/test';
import { tabBar, workspaceTabs, readWorkspaceTabState, setDesktopViewport } from './_workspace-tabs-helpers';

const DASHBOARD_URL = '/pages/dashboard/dashboard.html';
const TASK_LIST_URL = '/pages/task-management/task-list.html';
const DATASET_LIST_URL = '/pages/dataset/dataset-analysis-list.html';
const USER_MANAGEMENT_URL = '/pages/admin/user-management.html';
const TASK_NEW_URL = '/pages/task-management/task-new.html';
// T001 (task-list.data.js): valid ap_stage per task-detail.html's own
// URL_VIEW_STATE validator (used here only to prove AC-1.1's tab bar
// renders on task-detail; stage-badge content is G2a-2 scope).
const TASK_DETAIL_R1_URL = '/pages/task-management/task-detail.html?task_id=T001&ap_stage=r1';

test.describe('Workspace tabs — AC-1.1 tab bar presence', () => {
  test.beforeEach(async ({ page }) => {
    await setDesktopViewport(page);
  });

  const pages: Array<{ url: string; label: string }> = [
    { url: DASHBOARD_URL, label: 'dashboard' },
    { url: USER_MANAGEMENT_URL, label: 'admin/user-management (系統管理頁, Q12)' },
    { url: TASK_NEW_URL, label: 'task-new' },
    { url: TASK_DETAIL_R1_URL, label: 'task-detail' },
    {
      url: '/pages/annotation/annotation-workspace.html?task_id=T001&sample_id=sent-001&role=annotator&run_type=official_run',
      label: 'annotation-workspace',
    },
  ];

  for (const { url, label } of pages) {
    test(`shows a workspace tab bar with at least the current page's own tab on ${label}`, async ({ page }) => {
      await page.goto(url);

      await expect(tabBar(page)).toBeVisible();
      await expect(tabBar(page)).toHaveAttribute('role', 'tablist');
      const tabs = workspaceTabs(page);
      await expect(tabs).not.toHaveCount(0);
      // Exactly one tab -- the current page's own -- must be marked active.
      await expect(tabBar(page).getByRole('tab', { selected: true })).toHaveCount(1);
    });
  }
});

test.describe('Workspace tabs — AC-1.2 / AC-1.3 open vs switch by dedupe key', () => {
  test.beforeEach(async ({ page }) => {
    await setDesktopViewport(page);
  });

  test('AC-1.2: opens a new tab inserted to the right of the active tab, not appended at the end', async ({ page }) => {
    await page.goto(DASHBOARD_URL);
    await expect(workspaceTabs(page)).toHaveCount(1);

    // Open task-management via the sidebar -> second tab, inserted right of
    // the (only, active) dashboard tab, and becomes active itself (Q13/Q19/Q21).
    await page.getByRole('link', { name: '任務管理' }).click();
    await expect(page).toHaveURL(new RegExp(TASK_LIST_URL.replace(/\//g, '\\/')));
    await expect(workspaceTabs(page)).toHaveCount(2);
    await expect(workspaceTabs(page).nth(1)).toHaveAttribute('aria-selected', 'true');

    // Re-activate the existing dashboard tab (AC-1.3 setup, not yet the
    // assertion under test here) so the active tab is no longer the last one.
    await workspaceTabs(page).nth(0).click();
    await expect(workspaceTabs(page)).toHaveCount(2);
    await expect(workspaceTabs(page).nth(0)).toHaveAttribute('aria-selected', 'true');

    // With dashboard (index 0) active and task-list (index 1) NOT active,
    // opening a third, previously-unopened page must insert at index 1 --
    // immediately right of the active tab -- pushing task-list to index 2,
    // not appending the new tab after it (FR-008, Q19).
    await page.getByRole('link', { name: '資料集分析' }).click();
    await expect(page).toHaveURL(new RegExp(DATASET_LIST_URL.replace(/\//g, '\\/')));
    const tabs = workspaceTabs(page);
    await expect(tabs).toHaveCount(3);
    await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true');
    await expect(tabs.nth(2)).toHaveAttribute('aria-selected', 'false');
  });

  test('AC-1.3: navigating to an already-open tab\'s URL switches to it instead of opening a duplicate', async ({ page }) => {
    await page.goto(DASHBOARD_URL);
    await page.getByRole('link', { name: '任務管理' }).click();
    const tabs = workspaceTabs(page);
    await expect(tabs).toHaveCount(2);
    await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true');

    // The dashboard link's target (DASHBOARD_URL) matches tab 0's dedupe
    // key exactly -- clicking it must switch back to tab 0, not open a
    // third tab (Q13, Q21).
    await page.getByRole('link', { name: '儀表板' }).click();
    await expect(page).toHaveURL(new RegExp(DASHBOARD_URL.replace(/\//g, '\\/') + '$'));
    await expect(tabs).toHaveCount(2);
    await expect(tabs.nth(0)).toHaveAttribute('aria-selected', 'true');
    await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'false');
  });
});

test.describe('Workspace tabs — AC-1.4 modifier-click and middle-click stay native', () => {
  test.beforeEach(async ({ page }) => {
    await setDesktopViewport(page);
  });

  test('Ctrl/Cmd+click opens a real browser tab and leaves the workspace tab list untouched', async ({ page }) => {
    await page.goto(DASHBOARD_URL);
    await expect(workspaceTabs(page)).toHaveCount(1);
    const before = await readWorkspaceTabState(page);

    const [popup] = await Promise.all([
      page.context().waitForEvent('page'),
      page.getByRole('link', { name: '任務管理' }).click({ modifiers: ['ControlOrMeta'] }),
    ]);
    await popup.waitForURL(/task-management\/task-list\.html/);
    expect(popup.url()).toContain('task-management/task-list.html');
    await popup.close();

    // The original tab must not have navigated, and must not have gained a
    // second workspace tab entry (FR-005A, Q21).
    await expect(page).toHaveURL(new RegExp(DASHBOARD_URL.replace(/\//g, '\\/') + '$'));
    await expect(workspaceTabs(page)).toHaveCount(1);
    const after = await readWorkspaceTabState(page);
    expect(after).toEqual(before);
  });

  test('middle-click opens a real browser tab and leaves the workspace tab list untouched', async ({ page }) => {
    await page.goto(DASHBOARD_URL);
    await expect(workspaceTabs(page)).toHaveCount(1);
    const before = await readWorkspaceTabState(page);

    const [popup] = await Promise.all([
      page.context().waitForEvent('page'),
      page.getByRole('link', { name: '任務管理' }).click({ button: 'middle' }),
    ]);
    await popup.waitForURL(/task-management\/task-list\.html/);
    expect(popup.url()).toContain('task-management/task-list.html');
    await popup.close();

    await expect(page).toHaveURL(new RegExp(DASHBOARD_URL.replace(/\//g, '\\/') + '$'));
    await expect(workspaceTabs(page)).toHaveCount(1);
    const after = await readWorkspaceTabState(page);
    expect(after).toEqual(before);
  });
});

// AC-1.5 (close button / focus-move) and AC-1.6 (task-detail stage badge)
// moved to workspace-tabs-close-badge.spec.ts -- see that file's header for
// why (G2a-2 PR-size split; no assertion changes, verbatim move).
