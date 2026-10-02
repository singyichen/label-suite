/* Red tests for issue #1102 (specs/shared/019-workspace-tabs/spec.md):
 * "多頁籤切換後作用中頁籤落在可見範圍外" -- after switching tabs, the newly
 * active workspace tab can land outside the tab bar's own visible
 * (horizontally scrollable) box.
 *
 * Root cause: `.workspace-tab-bar` (pages/shared/sidebar.js, sidebar.css
 * ~958) is `overflow-x: auto`, but nothing in sidebar.js ever reads or
 * writes its `scrollLeft`. `activateWorkspaceTab()` / `closeWorkspaceTab()`
 * (~line 1065 / ~1081) both end in `window.location.replace(...)` -- a full
 * page reload, by design, per AC-2.5/FR-017 (must not grow browser
 * history) -- and the DESTINATION page's own `mountWorkspaceTabBar()`
 * `run()` (~line 1008) rebuilds the bar from scratch with `scrollLeft`
 * reset to 0, regardless of where the now-active tab actually sits in the
 * (unscrolled) flex row. Confirmed by grep: no `scrollIntoView`/`scrollLeft`
 * occurrence anywhere in sidebar.js.
 *
 * Viewport width, empirically derived (not copied from the issue body's own
 * 1280x900 suggestion, which does NOT reproduce the bug against this file's
 * 8-tab recipe -- see below):
 *
 *   - `setDesktopViewport()`'s stock 1280x900 (used by every other spec in
 *     this directory) yields a `<main>`/bar box of x=240,width=1040 (sidebar
 *     is a fixed 240px here), and this suite's own 8-tab recipe's tab
 *     labels (all short, 1-2 Chinese words, except the long task-detail
 *     title) only sum to ~1046px of content -- a 6px overflow that does NOT
 *     actually clip the active (rightmost) tab's own box (measured:
 *     tab[7].right ~= 1270 < bar.right 1280). Asserting visibility at
 *     1280x900 would pass today, which is the "investigate, don't weaken
 *     the assertion" case this file's own task brief calls out.
 *   - OVERFLOW_VIEWPORT (900x900) was chosen by measuring the SAME 8-tab
 *     recipe's rendered tab positions (fixed regardless of viewport width,
 *     since `.workspace-tab { flex-shrink: 0 }` never lets them shrink) and
 *     picking a width where TWO tabs -- not just the very last one -- sit
 *     fully beyond the bar's visible right edge (bar box becomes
 *     x=240,width=660, i.e. right edge 900; tab[6] box left~=947.5 and
 *     tab[7] box left~=1060.6, both already > 900). Using a width where only
 *     the single rightmost tab overflows would make part 1.d below (closing
 *     the active tab auto-selects its left neighbour, tab[6]) pass
 *     vacuously, because that neighbour would already have been fully
 *     visible by coincidence.
 *   - NARROW_VIEWPORT (886x900) is this same "two tabs off-screen" shape at
 *     a narrower width: 886 - 240px fixed sidebar = 646px bar content width,
 *     matching the issue's own measured narrow-desktop figure. Literal
 *     646px as the WINDOW width would be < the CSS 767px breakpoint that
 *     hides `.workspace-tab-bar` entirely in favour of the mobile dropdown
 *     (sidebar.css ~1021) -- out of scope for this issue, which is about
 *     the desktop bar's own scroll position, not the mobile dropdown. 886px
 *     keeps `isDesktopViewport()` (sidebar.js ~375, `min-width: 768px`) and
 *     the 767px CSS breakpoint both on the desktop side while reproducing
 *     the issue's narrow bar-content-width case. 375px/mobile is explicitly
 *     OUT OF SCOPE for issue #1102 (the mobile dropdown is a separate,
 *     untouched mechanism) and is not exercised anywhere in this file.
 *
 * 8-tab recipe reused verbatim from workspace-tabs-cap.spec.ts (same 8
 * dedupe keys, same order) so the overflow is real, not synthetic.
 *
 * `test.setTimeout(90_000)` follows this directory's existing precedent for
 * multi-navigation workspace-tab specs (workspace-tabs-cap.spec.ts).
 */
import { test, expect, type Page } from '@playwright/test';
import { tabBar, workspaceTabs, closeButton } from './_workspace-tabs-helpers';
import { buildWorkspaceUrl, skipGuidelineModal } from '../annotation/_workspace-helpers';

const DASHBOARD_URL = '/pages/dashboard/dashboard.html';
const TASK_LIST_URL = '/pages/task-management/task-list.html';
const DATASET_LIST_URL = '/pages/dataset/dataset-analysis-list.html';
const USER_MANAGEMENT_URL = '/pages/admin/user-management.html';
const TASK_NEW_URL = '/pages/task-management/task-new.html';
const TASK_DETAIL_T001_R1_URL = '/pages/task-management/task-detail.html?task_id=T001&ap_stage=r1';

// See the file header comment for how these two widths were derived.
const OVERFLOW_VIEWPORT = { width: 900, height: 900 };
const NARROW_VIEWPORT = { width: 886, height: 900 }; // ~646px bar content width

test.beforeEach(async ({ page }) => {
  await skipGuidelineModal(page);
});

async function openEightOverflowingTabs(page: Page): Promise<void> {
  await page.goto(DASHBOARD_URL); // index 0
  await page.goto(TASK_LIST_URL); // index 1
  await page.goto(DATASET_LIST_URL); // index 2
  await page.goto(USER_MANAGEMENT_URL); // index 3
  await page.goto(TASK_NEW_URL); // index 4
  await page.goto(buildWorkspaceUrl({ task_id: 'T001', sample_id: 'sent-001', role: 'annotator', run_type: 'official_run' })); // index 5
  await page.goto(buildWorkspaceUrl({ task_id: 'T002', sample_id: 'emo-001', role: 'annotator', run_type: 'official_run' })); // index 6
  await page.goto(TASK_DETAIL_T001_R1_URL); // index 7, newest/active, rightmost
  await expect(workspaceTabs(page)).toHaveCount(8);
}

/** Asserts `tab[index]`'s own box AND its close button's box are both fully
 * inside the tab bar's visible (clipped) box -- the correctness contract
 * this whole file is red against today. */
async function assertTabFullyVisibleInBar(page: Page, index: number): Promise<void> {
  const barBox = await tabBar(page).boundingBox();
  expect(barBox).not.toBeNull();
  const tab = workspaceTabs(page).nth(index);
  const tabBox = await tab.boundingBox();
  expect(tabBox).not.toBeNull();
  const closeBox = await closeButton(tab).boundingBox();
  expect(closeBox).not.toBeNull();

  expect(tabBox!.x).toBeGreaterThanOrEqual(barBox!.x);
  expect(tabBox!.x + tabBox!.width).toBeLessThanOrEqual(barBox!.x + barBox!.width);
  expect(closeBox!.x).toBeGreaterThanOrEqual(barBox!.x);
  expect(closeBox!.x + closeBox!.width).toBeLessThanOrEqual(barBox!.x + barBox!.width);
}

/** The tab-bar's own internal `overflow-x: auto` scrolling must never spill
 * into page-level/window horizontal scroll. Independent of which tab is
 * active, so safe to call at every assertion point below. */
async function assertNoPageLevelHorizontalScroll(page: Page): Promise<void> {
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
}

/** task-detail.html (where openEightOverflowingTabs() leaves the page) has
 * a real, visible `<h1 id="pageTitle">` (titleSelector in the sibling
 * workspace-tabs-layout.spec.ts's own PAGES map) -- unlike
 * annotation-workspace.html, whose `<h1>` is `.sr-only` and has no visual
 * footprint to overlap anything (same file's own documented exclusion).
 * Checked once, right after the 8-tab recipe, rather than re-derived on
 * every later page this file navigates through. */
async function assertHeadingNotOverlappedByTabBar(page: Page): Promise<void> {
  const barBox = await tabBar(page).boundingBox();
  expect(barBox).not.toBeNull();
  const headingBox = await page.locator('#pageTitle').boundingBox();
  expect(headingBox).not.toBeNull();
  expect(barBox!.y + barBox!.height).toBeLessThanOrEqual(headingBox!.y);
}

/** Scans from the rightmost tab backward for one -- other than
 * `excludeIndex` -- whose own box already falls outside the bar's visible
 * box. Geometry-driven rather than a hardcoded index, since which tabs
 * overflow depends on the viewport (OVERFLOW_VIEWPORT vs NARROW_VIEWPORT). */
async function findOffscreenTabIndex(page: Page, excludeIndex: number): Promise<number> {
  const barBox = await tabBar(page).boundingBox();
  if (!barBox) throw new Error('workspace tab bar not found');
  const tabs = workspaceTabs(page);
  const count = await tabs.count();
  for (let i = count - 1; i >= 0; i--) {
    if (i === excludeIndex) continue;
    const box = await tabs.nth(i).boundingBox();
    if (!box) continue;
    if (box.x < barBox.x || box.x + box.width > barBox.x + barBox.width) {
      return i;
    }
  }
  throw new Error('expected at least one off-screen tab in this 8-tab overflow fixture');
}

/** Moves DOM focus from `fromIndex` to `toIndex` using real ArrowLeft/
 * ArrowRight keydowns (AC-8.2 wrap-around pattern, sidebar.js ~894), taking
 * whichever direction is fewer presses. */
async function moveFocusWithArrowKeys(page: Page, fromIndex: number, toIndex: number, total: number): Promise<void> {
  const forwardSteps = (toIndex - fromIndex + total) % total;
  const backwardSteps = (fromIndex - toIndex + total) % total;
  const key = forwardSteps <= backwardSteps ? 'ArrowRight' : 'ArrowLeft';
  const steps = Math.min(forwardSteps, backwardSteps);
  for (let i = 0; i < steps; i++) {
    await page.keyboard.press(key);
  }
}

test.describe('Workspace tabs -- issue #1102: active tab stays visible after switching', () => {
  test('a. clicking a different, off-screen tab to activate it keeps it visible after the reload', async ({ page }) => {
    test.setTimeout(90_000);
    await page.setViewportSize(OVERFLOW_VIEWPORT);
    await openEightOverflowingTabs(page);

    // Scenario 2's heading-overlap check -- see assertHeadingNotOverlappedByTabBar()'s own comment for why it is only asserted here.
    await assertHeadingNotOverlappedByTabBar(page);
    await assertNoPageLevelHorizontalScroll(page);

    // Active tab is index 7 (task-detail, rightmost). Click a DIFFERENT tab
    // that is itself already off-screen (per this fixture's geometry, index
    // 6 -- see file header) to activate it.
    const targetIndex = await findOffscreenTabIndex(page, 7);
    await workspaceTabs(page).nth(targetIndex).click();
    await expect(workspaceTabs(page).nth(targetIndex)).toHaveAttribute('aria-selected', 'true');

    await assertTabFullyVisibleInBar(page, targetIndex);
    await assertNoPageLevelHorizontalScroll(page);
  });

  test('b. keyboard Enter on a focused, off-screen tab keeps it visible after the reload', async ({ page }) => {
    test.setTimeout(90_000);
    await page.setViewportSize(OVERFLOW_VIEWPORT);
    await openEightOverflowingTabs(page);

    const activeIndex = 7;
    const targetIndex = await findOffscreenTabIndex(page, activeIndex);

    // AC-8.2: focus the active tab, move focus only (no activation) via
    // ArrowLeft/ArrowRight to the off-screen target, then Enter activates it.
    await workspaceTabs(page).nth(activeIndex).focus();
    await moveFocusWithArrowKeys(page, activeIndex, targetIndex, 8);
    await page.keyboard.press('Enter');

    await expect(workspaceTabs(page).nth(targetIndex)).toHaveAttribute('aria-selected', 'true');
    await assertTabFullyVisibleInBar(page, targetIndex);
    await assertNoPageLevelHorizontalScroll(page);
  });

  test('c. reloading the page keeps the already-active, off-screen tab visible', async ({ page }) => {
    test.setTimeout(90_000);
    await page.setViewportSize(OVERFLOW_VIEWPORT);
    await openEightOverflowingTabs(page);

    // Active tab (index 7) is already off-screen straight out of the 8-tab
    // recipe (same mount-time scrollLeft-reset bug) -- this case isolates a
    // plain reload, with no tab-bar interaction at all, from a/b above.
    await page.reload();
    await expect(workspaceTabs(page)).toHaveCount(8);
    await expect(workspaceTabs(page).nth(7)).toHaveAttribute('aria-selected', 'true');

    await assertTabFullyVisibleInBar(page, 7);
    await assertNoPageLevelHorizontalScroll(page);
  });

  test('d. closing the active rightmost tab reveals the auto-selected neighbour tab', async ({ page }) => {
    test.setTimeout(90_000);
    await page.setViewportSize(OVERFLOW_VIEWPORT);
    await openEightOverflowingTabs(page);

    // AC-1.5: closing the active (rightmost, index 7) tab auto-selects the
    // neighbour to its left (now the last remaining tab, index 6) and
    // navigates there. At OVERFLOW_VIEWPORT, tab 6 is ALSO off-screen before
    // this close (see file header) -- picked deliberately so this case
    // actually exercises the bug instead of passing vacuously on a neighbour
    // that already happened to be visible.
    await closeButton(workspaceTabs(page).nth(7)).click();

    const remainingTabs = workspaceTabs(page);
    await expect(remainingTabs).toHaveCount(7);
    await expect(remainingTabs.nth(6)).toHaveAttribute('aria-selected', 'true');

    await assertTabFullyVisibleInBar(page, 6);
    await assertNoPageLevelHorizontalScroll(page);
  });
});

test.describe('Workspace tabs -- issue #1102: narrow desktop (~646px bar content width)', () => {
  // 375px/mobile is explicitly OUT OF SCOPE for issue #1102 -- see file
  // header comment on NARROW_VIEWPORT. This is the issue's own measured
  // narrow-DESKTOP case, not the <=767px mobile dropdown.
  test('active rightmost tab stays visible on a narrower desktop viewport', async ({ page }) => {
    test.setTimeout(90_000);
    await page.setViewportSize(NARROW_VIEWPORT);
    await openEightOverflowingTabs(page);

    await assertTabFullyVisibleInBar(page, 7);
    await assertNoPageLevelHorizontalScroll(page);
  });
});
