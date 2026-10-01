/* Red tests for Workspace Tabs (specs/shared/019-workspace-tabs/spec.md),
 * issue #1075 sub-group G2b -- AC-3.5 / FR-007 (Q18): an in-page URL change
 * that makes the triggering tab's new dedupe key collide with a DIFFERENT,
 * already-open tab must switch to that existing tab (not merge, not
 * duplicate), leave the triggering tab's own stored entry unchanged, and
 * show a visible notice.
 *
 * No hook exists yet in `design/prototype/pages/shared/sidebar.js` for a
 * page's own `history.replaceState()` calls (task-management-014 FR-019) to
 * re-run workspace-tab dedupe at all -- `syncCurrentPageIntoWorkspaceTabs()`
 * only ever runs once, at `mountWorkspaceTabBar()` time. So the switch-to-B
 * and notice assertions below are expected to FAIL until a later G2b Green
 * task adds that hook.
 */
import { test, expect } from '@playwright/test';
import { workspaceTabs, readWorkspaceTabState, setDesktopViewport } from './_workspace-tabs-helpers';

// T001 (task-list.data.js): same task id matches task-detail.html's own
// URL_VIEW_STATE validator for the 'tab' and 'ap_stage' params; ap_stage is
// held constant across A/B so the ONLY varying dedupe-key component is
// `tab` itself (task-detail dedupes by full normalized URL, spec 019 Q16).
const TASK_DETAIL_OVERVIEW_URL = '/pages/task-management/task-detail.html?task_id=T001&tab=overview&ap_stage=r1';
const TASK_DETAIL_WORKLOG_URL = '/pages/task-management/task-detail.html?task_id=T001&tab=work-log&ap_stage=r1';

test.describe('Workspace tabs — AC-3.5 in-page URL change re-keys into an existing tab', () => {
  test.beforeEach(async ({ page }) => {
    await setDesktopViewport(page);
  });

  test('switching task-detail\'s own sub-tab onto another open tab\'s URL switches to that tab, not a new one', async ({ page }) => {
    // Tab A: task-detail, tab=overview.
    await page.goto(TASK_DETAIL_OVERVIEW_URL);
    await expect(workspaceTabs(page)).toHaveCount(1);

    // Tab B: task-detail, tab=work-log -- a DIFFERENT dedupe key (full
    // normalized URL, FR-006/Q16), so this is deliberately a second,
    // independent tab, not a dedupe hit against tab A.
    await page.goto(TASK_DETAIL_WORKLOG_URL);
    const tabs = workspaceTabs(page);
    await expect(tabs).toHaveCount(2);
    await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true');

    // Switch back to tab A via the tab bar, so it is the active, on-screen
    // document when the in-page change below happens. Checked via the
    // page's OWN sub-tab DOM state, not the raw query string: task-detail's
    // pre-existing URL normalization (task-management-014 FR-019) strips a
    // default-valued `tab=overview` from the address bar on load, so the
    // live URL legitimately ends up WITHOUT `tab=overview` even though
    // that's the tab actually showing -- a page-level behavior orthogonal
    // to this AC, confirmed empirically while writing this test.
    await tabs.nth(0).click();
    await expect(tabs.nth(0)).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('#tabOverview')).toHaveAttribute('aria-selected', 'true');

    // While on tab A, trigger task-detail's OWN in-page sub-tab switch
    // (task-management-014 FR-019: history.replaceState(), no full reload)
    // from 'overview' to 'work-log' -- the exact URL tab B already owns.
    await page.locator('#tabWorkLog').click();

    // FR-007 (Q18): must switch to the existing tab B, not create a third
    // tab and not merge the two.
    await expect(tabs).toHaveCount(2);
    await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true');
    await expect(tabs.nth(0)).toHaveAttribute('aria-selected', 'false');

    // Tab A's OWN stored entry must be unchanged -- still tab=overview --
    // even though the live document it was showing just changed its own
    // address bar to tab=work-log (FR-007: "原觸發切換的頁籤必須維持切換前
    // 狀態"). Tab B's stored entry is unaffected either way.
    const state = (await readWorkspaceTabState(page)) as { tabs: Array<{ url: string }> };
    expect(state.tabs).toHaveLength(2);
    expect(state.tabs[0].url).toContain('tab=overview');
    expect(state.tabs[1].url).toContain('tab=work-log');

    // A visible notice must appear (FR-007: "並顯示提示"). No shell-level
    // toast mechanism exists in sidebar.js/sidebar.css yet; task-detail.html
    // already ships its own UXC-07-compliant single-instance toast
    // (`#toast`, `role="alert"`, shown via its own showToast() adding a
    // `.show` class) at every task-detail.html load. This suite reuses that
    // existing element as the most likely Green-task implementation target
    // (DRY: UXC-07 is a single-instance, one-toast-at-a-time contract, so a
    // second shell-level toast mechanism would itself be a spec conflict)
    // -- but this exact selector is this suite's own judgment call, not a
    // verbatim spec citation; see report.
    await expect(page.locator('#toast')).toHaveClass(/show/);
    await expect(page.locator('#toast')).toHaveAttribute('role', 'alert');
  });
});
