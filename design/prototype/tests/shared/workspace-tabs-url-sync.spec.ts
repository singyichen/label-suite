/* Red tests for Workspace Tabs (specs/shared/019-workspace-tabs/spec.md),
 * issue #1084: a page's own `history.replaceState()` call that does NOT
 * collide with a different, already-open tab (the common, non-AC-3.5 case)
 * is a silent no-op in `mountWorkspaceTabBar()`'s replaceState wrapper
 * (design/prototype/pages/shared/sidebar.js:1027-1060) -- it never updates
 * the triggering tab's own stored `url`/`dedupeKey` entry in
 * `labelsuite.workspaceTabs`. So after switching away to another tab and
 * back via the tab bar, `activateWorkspaceTab()` navigates using the STALE
 * `url` recorded at mount time, silently discarding the sub-tab/filter/page
 * state the page changed via replaceState (AC-2.1 requires that state --
 * not just scroll position -- survive a tab switch away and back).
 *
 * This is a pre-existing gap, not the AC-3.5/FR-007 collision path covered
 * by workspace-tabs-rekey.spec.ts (left untouched by this file): that path
 * is already correctly implemented for the case where the new dedupe key
 * DOES collide with a different open tab. This suite's tab B deliberately
 * uses a different task_id so its dedupe key can never collide with tab A's
 * own in-page sub-tab switch, isolating the no-collision no-op gap.
 *
 * No scroll-position assertion here, deliberately: scrolling into
 * task-detail.html's work-log panel and switching tabs via the tab bar hits
 * two SEPARATE, pre-existing bugs unrelated to #1084 -- see the PR body/issue
 * this discovery was filed under (the sticky tab bar does not track window
 * scroll on this page, and restoreActiveWorkspaceTabScroll() runs before the
 * async-loaded work-log panel has grown tall enough to scroll into). The
 * plain AC-2.1 scroll case (no in-page sub-tab change) stays covered by
 * workspace-tabs-restore.spec.ts, which is unaffected by either bug.
 */
import { test, expect } from '@playwright/test';
import { workspaceTabs, readWorkspaceTabState, setDesktopViewport } from './_workspace-tabs-helpers';

// Tab A: task-detail T001. ap_stage held constant so tab A's own in-page
// sub-tab switch (overview -> work-log, below) is the only thing that
// changes its dedupe key.
const TASK_A_OVERVIEW_URL = '/pages/task-management/task-detail.html?task_id=T001&tab=overview&ap_stage=r1';

// Tab B: task-detail T002 -- a DIFFERENT task id, so its dedupe key can
// never collide with tab A's own URL regardless of which sub-tab tab A is
// on. Distinct from workspace-tabs-rekey.spec.ts's tab B, which is the SAME
// task id at a different `tab=` value specifically to construct a collision
// -- the opposite of what this suite needs.
const TASK_B_OVERVIEW_URL = '/pages/task-management/task-detail.html?task_id=T002&tab=overview&ap_stage=r1';

test.describe('Workspace tabs — issue #1084 non-colliding in-page URL change must survive a tab switch', () => {
  test.beforeEach(async ({ page }) => {
    await setDesktopViewport(page);
  });

  test('switching away and back after a non-colliding sub-tab change restores the new sub-tab and URL', async ({ page }) => {
    // Tab A: task-detail T001, tab=overview.
    await page.goto(TASK_A_OVERVIEW_URL);
    await expect(workspaceTabs(page)).toHaveCount(1);

    // Tab B: task-detail T002 -- a different task, so no collision risk
    // against anything tab A's own sub-tab switch below might produce.
    await page.goto(TASK_B_OVERVIEW_URL);
    const tabs = workspaceTabs(page);
    await expect(tabs).toHaveCount(2);
    await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true');

    // Switch back to tab A via the tab bar before triggering its own
    // in-page change, so it is the active, on-screen document when that
    // happens (same ordering workspace-tabs-rekey.spec.ts uses).
    await tabs.nth(0).click();
    await expect(tabs.nth(0)).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('#tabOverview')).toHaveAttribute('aria-selected', 'true');

    // Trigger task-detail's OWN in-page sub-tab switch (replaceState, no
    // full reload) from 'overview' to 'work-log'. Tab B is a different task
    // id, so this cannot collide with it -- the AC-3.5/FR-007 rekey path
    // (workspace-tabs-rekey.spec.ts) does not apply here.
    await page.locator('#tabWorkLog').click();
    await expect(page.locator('#tabWorkLog')).toHaveAttribute('aria-selected', 'true');

    // Switch to tab B, then back to tab A, both via the tab bar.
    await tabs.nth(1).click();
    await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true');
    await tabs.nth(0).click();
    await expect(tabs.nth(0)).toHaveAttribute('aria-selected', 'true');

    // BUG (issue #1084): tab A's stored `url` was never updated by the
    // non-colliding replaceState above, so activateWorkspaceTab() just
    // navigated back to the STALE mount-time URL (tab=overview), not
    // tab=work-log. Expected to FAIL here until the Green fix lands.
    await expect(page).toHaveURL(/tab=work-log/);
    await expect(page.locator('#tabWorkLog')).toHaveAttribute('aria-selected', 'true');

    const state = (await readWorkspaceTabState(page)) as { tabs: Array<{ url: string }> };
    expect(state.tabs[0].url).toContain('tab=work-log');
  });
});
