/* Red tests for Workspace Tabs (specs/shared/019-workspace-tabs/spec.md),
 * issue #1075 sub-group G2c-1 -- unsaved-state bridge between a page's own
 * dirty tracking and the workspace tab bar (AC-4.3 / AC-4.4 / FR-012).
 * AC-4.1/AC-4.2/FR-011 (cap eviction) are explicitly out of scope here --
 * see G2c-2.
 *
 * Contract this suite assumes for the not-yet-written Green task: each tab
 * entry persisted at `TAB_STORAGE_KEY` gains a `hasUnsavedChanges: boolean`
 * field -- the exact field name already named by spec 019's own 關鍵實體
 * `WorkspaceTab.hasUnsavedChanges` (spec.md:362), not a new name invented
 * here. It must be written at the same `pagehide` lifecycle point
 * `captureWorkspaceTabScroll()` already uses for scroll position
 * (`design/prototype/pages/shared/sidebar.js`, "AC-2.1 / FR-019" comment
 * block), via some predicate the page registers -- this suite does not
 * pin that registration API's name or shape, only the observable
 * `TAB_STORAGE_KEY` outcome and `closeWorkspaceTab()`'s behavior toward a
 * background tab whose last-reported state was dirty.
 *
 * Empirical findings (commit 32f0134e, PW_PORT=8984, throwaway probe specs,
 * not committed -- see report for the exact probe runs):
 *   1. `window.addEventListener('beforeunload', ...)` in
 *      annotation-workspace.config.js is PRE-EXISTING (pre-#1075) and
 *      already fires on ANY real navigation away from a dirty sample --
 *      including closeWorkspaceTab()'s active-tab-closed branch, which
 *      already does a real `window.location.replace(...)` (G2a-2). So
 *      AC-4.3's "active tab close reuses the existing confirm" case is
 *      ALREADY PASSING today; it is kept below as regression coverage
 *      (same convention as workspace-tabs-restore.spec.ts's AC-2.3 case),
 *      not claimed as new Red.
 *   2. A review-row decision click (`ws-review-row-*`) ALREADY sets the
 *      underlying `hasUnsavedChanges` JS variable to true today, via the
 *      PRE-EXISTING `.col-content` capture-phase click listener (role is
 *      irrelevant to that listener) -- confirmed via the same
 *      beforeunload-on-navigate-away probe. The role-gated
 *      `renderAutosaveStatus()` early return for `role==='reviewer'`
 *      (annotation-workspace.config.js:1896) only skips the VISIBLE dot's
 *      class, not the underlying flag -- so the dot's CSS class is NOT a
 *      reliable reviewer-mode signal and is deliberately not asserted
 *      here. AC-4.4's "review decision counts as unsaved" is therefore
 *      ALREADY TRUE at the JS-variable/beforeunload level with zero new
 *      code; what's actually missing (true Red, tested below) is this
 *      sub-group's own job: persisting that existing signal into
 *      `TAB_STORAGE_KEY`'s per-tab `hasUnsavedChanges` field so a
 *      BACKGROUND tab's last-known state can be read later.
 *   3. `closeWorkspaceTab()`'s non-active branch unconditionally splices
 *      the tab out today, with no unsaved check at all -- true Red for the
 *      blocked-background-close case, and already-correct (regression
 *      coverage only) for the clean-background-close corollary.
 *
 * beforeunload dialog approach: `page.on('dialog', ...)` reliably receives
 * a `dialog.type() === 'beforeunload'` event for a real navigation away
 * from a dirty page (confirmed empirically); `dialog.dismiss()` cancels the
 * navigation (stays on the page) and is used in the one test that asserts
 * the dialog itself. Every OTHER test below that needs a dirty tab to
 * actually go to the background registers NO dialog listener at all and
 * relies on Playwright's own default handling, which auto-ACCEPTS a
 * beforeunload dialog (lets the navigation proceed) when nothing is
 * listening -- also confirmed empirically, and exactly the "leave the
 * page" input needed to get tab A backgrounded with its dirty state
 * already captured via `pagehide`, without this suite having to drive a
 * real confirm dialog during setup.
 */
import { test, expect } from '@playwright/test';
import { workspaceTabs, closeButton, readWorkspaceTabState, setDesktopViewport } from './_workspace-tabs-helpers';
import { buildWorkspaceUrl, gotoReviewerWorkspace, skipGuidelineModal } from '../annotation/_workspace-helpers';

const DASHBOARD_URL = '/pages/dashboard/dashboard.html';

test.beforeEach(async ({ page }) => {
  await setDesktopViewport(page);
  await skipGuidelineModal(page);
});

test.describe('Workspace tabs — AC-4.3/FR-012 active-tab close reuses the existing beforeunload confirm', () => {
  /* Expected to ALREADY PASS (see file header finding 1) -- kept as a
   * regression guard: FR-012 forbids a Green implementation from adding a
   * second confirmation mechanism alongside the native dialog that already
   * fires here. If a future change makes this fail, that is the real
   * regression to investigate, not a reason to delete this test. */
  test('closing the active, dirty annotation-workspace tab triggers the native beforeunload dialog, with no second dialog added', async ({ page }) => {
    await page.goto(buildWorkspaceUrl({ task_id: 'T001', sample_id: 'sent-001', role: 'annotator', run_type: 'official_run' }));
    await page.goto(DASHBOARD_URL); // second tab, so closing tab A navigates rather than emptying the bar
    await workspaceTabs(page).nth(0).click(); // back to tab A, making it active again
    await expect(workspaceTabs(page).nth(0)).toHaveAttribute('aria-selected', 'true');

    await page.getByTestId('ws-single-label-chip-negative').click();

    const dialogTypes: string[] = [];
    page.on('dialog', (dialog) => {
      dialogTypes.push(dialog.type());
      dialog.dismiss(); // stay on the page -- this test only asserts the dialog FIRED
    });

    await closeButton(workspaceTabs(page).nth(0)).click();
    // Exactly one dialog, of type beforeunload -- a second entry here would
    // mean a Green task added its own extra confirm()/alert(), which FR-012
    // forbids.
    await expect.poll(() => dialogTypes).toEqual(['beforeunload']);
  });
});

test.describe('Workspace tabs — AC-4.3 background tab close is blocked when its last-known state was unsaved', () => {
  test('closing a background annotation-workspace tab that was dirty when it lost focus keeps it in the tab bar', async ({ page }) => {
    // Tab A: annotation-workspace, dirtied via a real answer edit.
    await page.goto(buildWorkspaceUrl({ task_id: 'T001', sample_id: 'sent-001', role: 'annotator', run_type: 'official_run' }));
    await page.getByTestId('ws-single-label-chip-negative').click();

    // Tab B: dashboard, a real navigation away from dirty tab A. No
    // page.on('dialog') listener here -- see file header: Playwright's
    // default auto-accepts beforeunload, letting this navigation (and
    // sidebar.js's pagehide-based capture) proceed.
    await page.goto(DASHBOARD_URL);
    const tabs = workspaceTabs(page);
    await expect(tabs).toHaveCount(2);
    await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true');

    // From tab B, close tab A's (background, dirty) tab via its own × button.
    await closeButton(tabs.nth(0)).click();

    // Tab A must still be present: the minimal, non-invented signal for
    // "blocked" this suite picked (no new confirm/toast UI asserted here --
    // that is the Green task's own judgment call per the task brief).
    await expect(tabs).toHaveCount(2);
  });
});

test.describe('Workspace tabs — AC-4.3 corollary: a clean background tab still closes normally', () => {
  /* Same setup as the blocked case above, minus the dirtying edit -- shows
   * the block is conditional on the reported state, not a blanket rule
   * against ever closing a background tab. Expected to ALREADY PASS (see
   * file header finding 3): closeWorkspaceTab()'s non-active branch
   * unconditionally splices today, which already matches this expectation.
   * Kept as a regression guard against a Green fix for the blocked case
   * above that over-corrects into blocking ALL background closes. */
  test('closing a background annotation-workspace tab with no unsaved changes removes it normally', async ({ page }) => {
    await page.goto(buildWorkspaceUrl({ task_id: 'T001', sample_id: 'sent-001', role: 'annotator', run_type: 'official_run' }));
    // No edit made -- tab A stays clean.

    await page.goto(DASHBOARD_URL);
    const tabs = workspaceTabs(page);
    await expect(tabs).toHaveCount(2);

    await closeButton(tabs.nth(0)).click();
    await expect(tabs).toHaveCount(1);
  });
});

test.describe("Workspace tabs — AC-4.4 an unsubmitted review decision is reported as this tab's unsaved state", () => {
  /* See file header finding 2: the underlying hasUnsavedChanges JS flag is
   * ALREADY true after this click (pre-existing .col-content capture
   * listener); what's actually under test is whether that fact reaches
   * TAB_STORAGE_KEY's own per-tab hasUnsavedChanges field -- it does not,
   * today, because nothing writes it yet. */
  test('an unsubmitted review-row decision is persisted as hasUnsavedChanges:true on this tab once it leaves focus', async ({ page }) => {
    await gotoReviewerWorkspace(page, { task_id: 'T001', sample_id: 'sent-001', run_type: 'dry_run' });

    await page.getByTestId('ws-review-row-approve').click();

    // Background this tab the same way as the AC-4.3 blocked-close test
    // above: a real navigation, no dialog listener registered, relying on
    // Playwright's default beforeunload auto-accept.
    await page.goto(DASHBOARD_URL);

    const tabState = (await readWorkspaceTabState(page)) as {
      tabs: Array<{ dedupeKey: string; hasUnsavedChanges?: boolean }>;
    } | null;
    const reviewTab = tabState?.tabs.find((tab) => tab.dedupeKey === 'annotation-workspace:T001:review');
    expect(reviewTab, 'expected a persisted tab entry for the review-mode workspace').toBeDefined();
    expect(reviewTab?.hasUnsavedChanges).toBe(true);
  });
});
