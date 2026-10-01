/* Red tests for Workspace Tabs (specs/shared/019-workspace-tabs/spec.md),
 * issue #1075 sub-group G2f -- User Story 7 (AC-7.1/AC-7.2): a tab whose
 * page turns out to be 403 (permission revoked) or 404 (resource deleted)
 * must stay in the tab bar, render its own fallback pane, and still be
 * closeable by the user (Q14). AC-7.3 (no live push) is architectural --
 * this static multi-page prototype has no mechanism to push updates into an
 * idle tab in the first place, so the FR is satisfied by construction and
 * has no dedicated test here (see task brief / PR report).
 *
 * 404 (AC-7.2): REUSES the pre-existing `#taskNotFound` / `TASK_NOT_FOUND`
 * mechanism (task-detail.html, issue #200), which predates this sub-group
 * entirely. sidebar.js's workspace-tab dedupe/tracking is purely URL-based
 * (see computeWorkspaceDedupeInfo() in sidebar.js) and never inspects a
 * page's rendered content to decide whether to keep or drop a tab, so the
 * "tab bar doesn't auto-close on 404" assertions below are expected to
 * ALREADY PASS -- kept as regression coverage (same convention as
 * workspace-tabs-restore.spec.ts's AC-2.3 cases), not claimed as new Red.
 *
 * 403 (AC-7.1): genuinely new. No `sim_403` query flag or forbidden pane
 * exists anywhere in the codebase yet (the pre-existing `toastRoleDenied` /
 * `reviewerTabBlocked` i18n strings are a different, unrelated role-gate
 * mechanism and are not reused here, per the task brief). This suite
 * DEFINES the contract the not-yet-written Green task must satisfy:
 *
 *   - `task-detail.html?...&sim_403=1` must render a NEW pane at
 *     `[data-testid="task-forbidden-pane"]`, mirroring `#taskNotFound`'s
 *     existing shape: a `.panel` with `role="alert"`, a title/message
 *     containing the zh substring "無權限" (en: matching /not allowed|
 *     permission/i -- this suite's own wording choice, consistent with
 *     this file's pre-existing `toastRoleDenied`/`reviewerTabBlocked`
 *     "無權限..." phrasing, same convention as workspace-tabs-mobile.spec.ts's
 *     own EN wording choice for "N tabs open"), and a `role="link"` back
 *     link (symmetric to `#taskNotFoundBackLink`).
 *   - The pane must NOT auto-close its workspace tab; the user closes it
 *     via the existing tab close button (`closeButton()` helper), with no
 *     new close mechanism.
 *
 * Both cases are task-detail-only (out of scope: any other page kind, the
 * mobile dropdown's own rendering of 403/404 tabs, and any role-based
 * access control beyond the simulated `sim_403=1` flag -- per task brief).
 */
import { test, expect } from '@playwright/test';
import { workspaceTabs, closeButton, readWorkspaceTabState, setDesktopViewport } from './_workspace-tabs-helpers';

const DASHBOARD_URL = '/pages/dashboard/dashboard.html';
// An id that does not resolve against task-list.data.js / task-detail.data.js
// -- mirrors issue-200-task-detail-not-found.spec.ts's own fixture choice.
const TASK_DETAIL_404_URL = '/pages/task-management/task-detail.html?task_id=T999_NONEXISTENT';
// T001 (task-list.data.js): a real, existing task -- sim_403=1 is the only
// thing making this tab's resource "forbidden".
const TASK_DETAIL_403_URL = '/pages/task-management/task-detail.html?task_id=T001&ap_stage=r1&sim_403=1';

interface WorkspaceTabStateShape {
  tabs: Array<{ dedupeKey: string }>;
  activeIndex: number;
}

test.describe('Workspace tabs — AC-7.2 404 (deleted task) pane does not affect the tab bar', () => {
  test.beforeEach(async ({ page }) => {
    await setDesktopViewport(page);
  });

  test('the 404 tab stays in the tab bar, shows the existing not-found pane, and can be closed manually', async ({ page }) => {
    await page.goto(DASHBOARD_URL);
    await page.goto(TASK_DETAIL_404_URL);

    const tabs = workspaceTabs(page);
    await expect(tabs).toHaveCount(2); // [dashboard, task-detail(404)] -- not auto-excluded
    await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true');

    const notFound = page.locator('#taskNotFound');
    await expect(notFound).toBeVisible();
    await expect(notFound).toHaveAttribute('role', 'alert');
    await expect(notFound).toContainText('T999_NONEXISTENT');

    const stateBeforeClose = (await readWorkspaceTabState(page)) as WorkspaceTabStateShape | null;
    expect(stateBeforeClose?.tabs).toHaveLength(2);

    // User can still close the 404 tab via the existing close mechanism --
    // no new close logic expected (Q14).
    await closeButton(tabs.nth(1)).click();
    await expect(tabs).toHaveCount(1);
    const stateAfterClose = (await readWorkspaceTabState(page)) as WorkspaceTabStateShape | null;
    expect(stateAfterClose?.tabs).toHaveLength(1);
  });
});

test.describe('Workspace tabs — AC-7.1 403 (permission revoked) pane', () => {
  test.beforeEach(async ({ page }) => {
    await setDesktopViewport(page);
  });

  test('zh: sim_403=1 shows a forbidden pane, the tab bar keeps both tabs, and the tab can be closed manually', async ({ page }) => {
    await page.goto(DASHBOARD_URL);
    await page.goto(TASK_DETAIL_403_URL);

    const tabs = workspaceTabs(page);
    await expect(tabs).toHaveCount(2); // [dashboard, task-detail(403)] -- not auto-excluded
    await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true');

    const forbidden = page.getByTestId('task-forbidden-pane');
    await expect(forbidden).toBeVisible();
    await expect(forbidden).toHaveAttribute('role', 'alert');
    await expect(forbidden).toContainText('無權限');
    await expect(forbidden.getByRole('link')).toBeVisible();

    const stateBeforeClose = (await readWorkspaceTabState(page)) as WorkspaceTabStateShape | null;
    expect(stateBeforeClose?.tabs).toHaveLength(2);

    await closeButton(tabs.nth(1)).click();
    await expect(tabs).toHaveCount(1);
    const stateAfterClose = (await readWorkspaceTabState(page)) as WorkspaceTabStateShape | null;
    expect(stateAfterClose?.tabs).toHaveLength(1);
  });

  test('en: the forbidden pane translates through the shared language toggle (#langToggle)', async ({ page }) => {
    await page.goto(DASHBOARD_URL);
    await page.locator('#langToggle').click();
    await page.goto(TASK_DETAIL_403_URL);

    const tabs = workspaceTabs(page);
    await expect(tabs).toHaveCount(2);

    const forbidden = page.getByTestId('task-forbidden-pane');
    await expect(forbidden).toBeVisible();
    await expect(forbidden).toContainText(/not allowed|permission/i);
    await expect(forbidden.getByRole('link')).toBeVisible();
  });
});
