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
 * two SEPARATE, pre-existing bugs unrelated to #1084, filed as issue #1121
 * (the sticky tab bar does not track window scroll on this page, and
 * restoreActiveWorkspaceTabScroll() runs before the async-loaded work-log
 * panel has grown tall enough to scroll into). The plain AC-2.1 scroll case
 * (no in-page sub-tab change) stays covered by workspace-tabs-restore.spec.ts,
 * which is unaffected by either bug.
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

// Second case's pages: task-list.html has no bootstrap-settle noise of its
// own (confirmed by a throwaway probe against this branch, since reverted;
// see report) -- unlike task-detail.html above, a bare load of task-list.html
// triggers zero post-ready history.replaceState() settles. dashboard.html is
// used as tab B purely to switch away and back via the tab bar; it shares no
// dedupe-key surface with task-list.html's own query-string filters.
const TASK_LIST_URL = '/pages/task-management/task-list.html';
const DASHBOARD_URL = '/pages/dashboard/dashboard.html';

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

/* Follow-up to the #1084 case above, filed from a maintainer review of the
 * Green fix for it: `workspaceHasSyncedOwnEntryOnce` (sidebar.js:1033)
 * unconditionally skips the FIRST post-ready replaceState settle for every
 * page instance, reasoning that it is always task-detail.html's own
 * bootstrap render burst (see that file's comment, and the
 * workspace-tabs-rekey.spec.ts AC-3.5 contract it protects). That reasoning
 * does not hold for every page using this mechanism: a bare load of
 * task-list.html (and, per the same throwaway probe, dataset-analysis-detail
 * .html, user-management.html, annotation-list.html, and dashboard.html)
 * produces ZERO post-ready settles of its own. For these pages, the user's
 * very FIRST real in-page change -- e.g. applying a filter -- IS the first
 * -ever settle for that page instance, and the unconditional skip silently
 * drops it, reproducing a variant of #1084 for exactly the pages the
 * original fix does not cover. task-list.html is used here as the
 * representative case because it has a trivially simple first in-page
 * change (a single `<select>` filter) that exercises `syncUrl()` via
 * `history.replaceState()`, the same mechanism task-detail.html's case
 * above exercises. */
test.describe('Workspace tabs — issue #1084 follow-up: a page with no bootstrap-settle noise must not lose its FIRST in-page change', () => {
  test.beforeEach(async ({ page }) => {
    await setDesktopViewport(page);
  });

  test('switching away and back after the first-ever filter change on a zero-bootstrap-noise page restores the filter and URL', async ({ page }) => {
    // Tab A: task-list.html, bare load -- the only tab so far.
    await page.goto(TASK_LIST_URL);
    await expect(workspaceTabs(page)).toHaveCount(1);

    // Tab B: dashboard.html -- switches away from the task-list tab under
    // test before it has produced any settle of its own.
    await page.goto(DASHBOARD_URL);
    const tabs = workspaceTabs(page);
    await expect(tabs).toHaveCount(2);
    await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true');

    // Switch back to tab A via the tab bar before triggering its own
    // in-page change, so it is the active, on-screen document when that
    // happens (same ordering as the #1084 case above).
    await tabs.nth(0).click();
    await expect(tabs.nth(0)).toHaveAttribute('aria-selected', 'true');

    // Trigger task-list's OWN first-ever in-page change: select a non-default
    // status filter ('draft', the first real option after the "all
    // statuses" placeholder -- its value is language-independent, see
    // I18N.zh/I18N.en's shared statusOptions values at task-list.html:490
    // and :549). This is the FIRST-EVER replaceState() settle for this page
    // instance -- task-list.html produces no bootstrap-settle noise of its
    // own, unlike task-detail.html in the case above.
    await page.locator('#statusFilter').selectOption('draft');
    await expect(page).toHaveURL(/status=draft/);

    // Switch to tab B, then back to tab A, both via the tab bar.
    await tabs.nth(1).click();
    await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true');
    await tabs.nth(0).click();
    await expect(tabs.nth(0)).toHaveAttribute('aria-selected', 'true');

    // BUG (issue #1084 follow-up): task-list.html produced no settle before
    // this one, so it IS the "first settle" `workspaceHasSyncedOwnEntryOnce`
    // unconditionally skips -- tab A's stored `url` was never updated, and
    // activateWorkspaceTab() just navigated back to the STALE mount-time URL
    // (no filter), not `status=draft`. Expected to FAIL here until the Green
    // fix lands.
    await expect(page).toHaveURL(/status=draft/);
    await expect(page.locator('#statusFilter')).toHaveValue('draft');

    const state = (await readWorkspaceTabState(page)) as { tabs: Array<{ url: string }> };
    expect(state.tabs[0].url).toContain('status=draft');
  });
});
