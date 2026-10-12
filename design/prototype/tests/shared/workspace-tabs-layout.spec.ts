/* Red tests for workspace tab bar mount geometry (issue #1098,
 * specs/shared/019-workspace-tabs/spec.md FR-001 / AC-1.1).
 *
 * Root cause: `mountWorkspaceTabBar()`'s `run()` in
 * `design/prototype/pages/shared/sidebar.js` (~line 1008-1021) always does
 * `mainEl.insertBefore(barEl, mainEl.firstChild)`. That only renders the bar
 * flush with -- and as wide as -- the real content area when `<main>` itself
 * is a bare, unstyled flex container and the page's own content-width/
 * padding class (`.layout`, `.main-content`, ...) lives on an INNER `<div>`
 * one level below `<main>` (task-list.html's structure). Several pages put
 * that content class DIRECTLY on `<main>` itself, so the bar -- being
 * `<main>`'s own child -- inherits that class's padding/max-width and
 * renders inset and narrower than `<main>`'s own box; when the page
 * scrolls, the inset sticky bar (`.workspace-tab-bar { position: sticky;
 * top: 0 }`, sidebar.css ~958) also ends up overlapping the page's `<h1>`
 * title instead of sitting flush above it.
 *
 * No Green fix exists yet. Every assertion below compares the bar's
 * `boundingBox()` against `<main>`'s OWN `boundingBox()` -- never against
 * the inner `.layout`/`.main-content` div's box -- because the bug is
 * precisely that the bar's box is smaller/offset relative to `<main>`'s
 * box. This is geometry-only coverage: tab styling, dedupe, count,
 * shortcuts and the mobile dropdown are other issues' scope (#1099/#1102/
 * #1103/#1084) and are untouched here.
 *
 * Known gap in the scroll-overlap half of this suite (confirmed empirically,
 * not assumed): at the 1280x900 fixture viewport and current demo dataset,
 * dashboard.html's and role-settings.html's own <main> has
 * `scrollHeight === clientHeight` -- there is no overflow to scroll at all,
 * so `scrollPage()` is a no-op and their scroll-overlap test passes
 * vacuously today even though these two pages' left/width/top geometry test
 * (above) already proves the underlying mount bug. This is not a test gap
 * to fix here: it reflects real current render state, and the geometry
 * test is this suite's authoritative proof for these two pages.
 */
import { test, expect, type Page } from '@playwright/test';
import { tabBar, setDesktopViewport } from './_workspace-tabs-helpers';

// 0.5*10^0 would be the jest-style toBeCloseTo(_, 0) tolerance used
// elsewhere in this suite (e.g. task-new-single-label-layout.spec.ts); this
// file instead uses explicit two-sided bounds (as in
// issue-1057-fep-resolve-btn-layout.spec.ts) so a failure's diff prints
// both the bar's and <main>'s concrete numbers, not just a boolean.
const TOLERANCE_PX = 1;

interface PageCase {
  label: string;
  url: string;
  /** `<h1>`-equivalent page-title selector; undefined where the page has none. */
  titleSelector?: string;
}

const PAGES: PageCase[] = [
  // Suspected BAD: content class (`.layout`/`.main-content`) lives directly
  // on `<main>` itself.
  { label: 'dashboard', url: '/pages/dashboard/dashboard.html', titleSelector: '#dashboardMainTitle' },
  {
    label: 'annotation-list',
    url: '/pages/annotation/annotation-list.html?task_id=T001&role=annotator&run_type=official_run',
    titleSelector: '#pageTitle',
  },
  {
    label: 'profile',
    url: '/pages/account/profile.html',
    titleSelector: '#pageTitle',
  },
  {
    label: 'role-settings',
    url: '/pages/admin/role-settings.html',
    titleSelector: '#pageTitle',
  },

  // Suspected GOOD: bare `<main>`, content class is on an inner `<div>`.
  { label: 'task-list', url: '/pages/task-management/task-list.html', titleSelector: '#pageTitle' },
  { label: 'user-management', url: '/pages/admin/user-management.html', titleSelector: '#pageTitle' },
  { label: 'dataset-analysis-list', url: '/pages/dataset/dataset-analysis-list.html', titleSelector: '#pageTitle' },
  {
    label: 'task-detail',
    url: '/pages/task-management/task-detail.html?task_id=T001&ap_stage=r1',
    titleSelector: '#pageTitle',
  },
  { label: 'task-new', url: '/pages/task-management/task-new.html', titleSelector: '#pageTitle' },
  {
    label: 'dataset-analysis-detail',
    // T104 + tab=quality: reused verbatim from
    // tests/dataset/dataset-analysis-detail-risk-actions.spec.ts, the
    // existing spec covering this page's query-param contract.
    url: '/pages/dataset/dataset-analysis-detail.html?task_id=T104&tab=quality',
    titleSelector: '#pageTitle',
  },

  // Suspected already-passing (no padding/max-width on <main class="workspace-root">),
  // but with no top-level scroll and no visible <h1> -- see the dedicated
  // comment below where this case is excluded from the scroll-overlap loop.
  {
    label: 'annotation-workspace',
    url: '/pages/annotation/annotation-workspace.html?task_id=T001&sample_id=sent-001&role=annotator&run_type=official_run',
  },
];

async function scrollPage(page: Page): Promise<void> {
  // After #1121 `<main>` is no longer a scroller on any page except
  // annotation-workspace (which has no titled scroll content), so the window
  // is the only scroll container to exercise here.
  // behavior: 'instant' is required: profile.html sets
  // `html { scroll-behavior: smooth }`, which makes a bare
  // `window.scrollTo(x, y)` animate; reading `boundingBox()` mid-animation
  // is flaky. 'instant' bypasses the CSS property per the CSSOM View spec.
  await page.evaluate(() => window.scrollTo({ left: 0, top: document.body.scrollHeight, behavior: 'instant' }));
}

test.describe('Workspace tab bar mount geometry (issue #1098)', () => {
  test.beforeEach(async ({ page }) => {
    await setDesktopViewport(page);
  });

  for (const pageCase of PAGES) {
    test(`tab bar's box matches <main>'s own box on ${pageCase.label}`, async ({ page }) => {
      await page.goto(pageCase.url);
      await expect(tabBar(page)).toBeVisible();

      const mainBox = await page.locator('main').boundingBox();
      expect(mainBox).not.toBeNull();
      const barBox = await tabBar(page).boundingBox();
      expect(barBox).not.toBeNull();

      // left: the bar must start at <main>'s own left edge, not inset by a
      // content class's padding/max-width centering.
      expect(barBox!.x).toBeGreaterThanOrEqual(mainBox!.x - TOLERANCE_PX);
      expect(barBox!.x).toBeLessThanOrEqual(mainBox!.x + TOLERANCE_PX);

      // width: the bar must span <main>'s own full width.
      expect(barBox!.width).toBeGreaterThanOrEqual(mainBox!.width - TOLERANCE_PX);
      expect(barBox!.width).toBeLessThanOrEqual(mainBox!.width + TOLERANCE_PX);

      // top: the bar must sit flush with <main>'s own top edge, not inset
      // by a padding gap.
      expect(barBox!.y).toBeGreaterThanOrEqual(mainBox!.y - TOLERANCE_PX);
      expect(barBox!.y).toBeLessThanOrEqual(mainBox!.y + TOLERANCE_PX);
    });
  }

  // annotation-workspace is excluded from this loop: its <main
  // class="workspace-root"> has `overflow: hidden; height: 100vh` and never
  // scrolls at the top level -- only its internal 3-column panels do -- and
  // it has no visible page <h1> (`#wsPageHeading` is `.sr-only`, never
  // rendered on screen). There is therefore nothing for a sticky bar to
  // overlap on this page; its geometry is still covered by the loop above.
  const titledPages = PAGES.filter((p): p is PageCase & { titleSelector: string } => p.titleSelector !== undefined);

  // issue #1121 supersedes the original post-scroll
  // "title stays below the bar" assertion. That only held because the bar
  // wrongly scrolled away with the page; a working sticky bar (spec 019
  // AC-2.1) stays pinned to the viewport top while the title legitimately
  // scrolls up underneath it. The #1098 intent is preserved as two checks:
  // in the initial layout the title sits at/below the bar (no overlap), and
  // after scrolling the bar is still flush at the viewport top and visible.
  for (const pageCase of titledPages) {
    test(`tab bar clears the page title initially and stays stuck at the viewport top after scrolling on ${pageCase.label}`, async ({ page }) => {
      await page.goto(pageCase.url);
      await expect(tabBar(page)).toBeVisible();

      const initialBar = await tabBar(page).boundingBox();
      expect(initialBar).not.toBeNull();
      const initialTitle = await page.locator(pageCase.titleSelector).boundingBox();
      expect(initialTitle).not.toBeNull();
      expect(initialTitle!.y).toBeGreaterThanOrEqual(initialBar!.y + initialBar!.height - TOLERANCE_PX);

      await scrollPage(page);

      await expect(tabBar(page)).toBeVisible();
      const scrolledBar = await tabBar(page).boundingBox();
      expect(scrolledBar).not.toBeNull();
      expect(Math.abs(scrolledBar!.y)).toBeLessThanOrEqual(TOLERANCE_PX);
    });
  }
});
