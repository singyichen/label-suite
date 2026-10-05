/* Red tests for issue #1099 Group G4a (specs/shared/019-workspace-tabs/
 * spec.md FR-001 / AC-1.1; openspec/changes/1099-workspace-tabs-overview-menu/
 * design.md "G4a") -- the maintainer requires the workspace tab bar's tabs to
 * sit flush against the very top of the viewport (NoteCraft style): square
 * corners, and each tab filling the bar's full content height.
 *
 * Today `.workspace-tab-bar` (sidebar.css) has `padding: var(--space-sm)
 * var(--space-md) 0`, which pushes every tab down by --space-sm, and
 * `.workspace-tab` has `border-radius: var(--radius-md) var(--radius-md) 0 0`
 * (rounded top corners). Both are the targeted regressions.
 *
 * Geometry/computed-style only; no raw color assertions. Cases that already
 * hold today (overview trigger geometry, 375px no horizontal scroll) are
 * kept as locked-in regression guards, not new Red content.
 */
import { test, expect, type Page } from '@playwright/test';
import { tabBar, workspaceTabs, setDesktopViewport } from './_workspace-tabs-helpers';

const TOLERANCE_PX = 1;
const SIDEBAR_COLLAPSED_STORAGE_KEY = 'labelsuite.sidebarCollapsed';
const DASHBOARD_URL = '/pages/dashboard/dashboard.html';
const TASK_LIST_URL = '/pages/task-management/task-list.html';

async function openTwoTabs(page: Page): Promise<void> {
  await page.goto(DASHBOARD_URL);
  await page.goto(TASK_LIST_URL);
  await expect(workspaceTabs(page)).toHaveCount(2);
}

interface FlushGeometry {
  barTop: number;
  barBottom: number;
  barBorderBottom: number;
  tabs: { top: number; bottom: number; active: boolean }[];
}

async function readGeometry(page: Page): Promise<FlushGeometry> {
  return tabBar(page).evaluate((bar) => {
    const barRect = bar.getBoundingClientRect();
    return {
      barTop: barRect.top,
      barBottom: barRect.bottom,
      barBorderBottom: parseFloat(getComputedStyle(bar).borderBottomWidth),
      tabs: Array.from(bar.querySelectorAll('[role="tab"]')).map((tab) => {
        const r = tab.getBoundingClientRect();
        return { top: r.top, bottom: r.bottom, active: tab.getAttribute('aria-selected') === 'true' };
      }),
    };
  });
}

function expectFlush(g: FlushGeometry): void {
  expect(Math.abs(g.barTop)).toBeLessThanOrEqual(TOLERANCE_PX);
  expect(g.tabs.length).toBeGreaterThanOrEqual(2);
  expect(g.tabs.some((t) => t.active)).toBe(true);
  const contentBottom = g.barBottom - g.barBorderBottom;
  for (const tab of g.tabs) {
    expect(Math.abs(tab.top - g.barTop)).toBeLessThanOrEqual(TOLERANCE_PX);
    expect(Math.abs(tab.bottom - contentBottom)).toBeLessThanOrEqual(TOLERANCE_PX);
  }
}

test.describe('Workspace tabs flush top — tabs touch the top edge and fill the bar height (G4a)', () => {
  test.beforeEach(async ({ page }) => {
    await setDesktopViewport(page);
  });

  test('zh-TW, sidebar expanded: bar top is 0 and every tab spans from bar top to bar content bottom', async ({ page }) => {
    await openTwoTabs(page);
    expectFlush(await readGeometry(page));
  });

  test('zh-TW, sidebar collapsed: bar top is 0 and every tab spans from bar top to bar content bottom', async ({ page }) => {
    await page.addInitScript((key) => window.localStorage.setItem(key, 'true'), SIDEBAR_COLLAPSED_STORAGE_KEY);
    await openTwoTabs(page);
    await expect(page.locator('body')).toHaveClass(/sidebar-collapsed/);
    expectFlush(await readGeometry(page));
  });

  test('en, sidebar expanded: tabs stay flush with the top after switching language', async ({ page }) => {
    await page.goto(DASHBOARD_URL);
    await page.locator('#langToggle').click();
    await page.goto(TASK_LIST_URL);
    await expect(workspaceTabs(page)).toHaveCount(2);
    expectFlush(await readGeometry(page));
  });
});

test.describe('Workspace tabs flush top — square corners on every tab (G4a)', () => {
  test.beforeEach(async ({ page }) => {
    await setDesktopViewport(page);
  });

  test('active and inactive tabs all have 0px radius on all four corners', async ({ page }) => {
    await openTwoTabs(page);
    const tabs = workspaceTabs(page);
    const count = await tabs.count();
    expect(count).toBeGreaterThanOrEqual(2);
    const states = new Set<string>();
    for (let i = 0; i < count; i++) {
      states.add((await tabs.nth(i).getAttribute('aria-selected')) ?? '');
      for (const prop of [
        'border-top-left-radius',
        'border-top-right-radius',
        'border-bottom-left-radius',
        'border-bottom-right-radius',
      ]) {
        await expect(tabs.nth(i)).toHaveCSS(prop, '0px');
      }
    }
    // Both an active and an inactive tab were covered.
    expect(states).toEqual(new Set(['true', 'false']));
  });
});

test.describe('Workspace tabs flush top — overview trigger keeps its own size (G4a)', () => {
  test.beforeEach(async ({ page }) => {
    await setDesktopViewport(page);
  });

  test('trigger sits at the bar right end, keeps its 34px height, and stays vertically centered', async ({ page }) => {
    await openTwoTabs(page);
    const trigger = page.getByTestId('workspace-tab-overview-trigger');
    await expect(trigger).toBeVisible();
    const m = await page.evaluate(() => {
      const bar = document.querySelector('[data-testid="workspace-tab-bar"]') as HTMLElement;
      const trg = document.querySelector('[data-testid="workspace-tab-overview-trigger"]') as HTMLElement;
      const b = bar.getBoundingClientRect();
      const t = trg.getBoundingClientRect();
      const tabs = Array.from(bar.querySelectorAll('[role="tab"]')).map((x) => x.getBoundingClientRect());
      return {
        barLeft: b.left, barRight: b.right, barTop: b.top, barBottom: b.bottom,
        tLeft: t.left, tRight: t.right, tTop: t.top, tBottom: t.bottom, tHeight: t.height,
        barBorderBottom: parseFloat(getComputedStyle(bar).borderBottomWidth),
        lastTabRight: Math.max(...tabs.map((r) => r.right)),
      };
    });
    expect(m.tLeft).toBeGreaterThanOrEqual(m.barLeft - TOLERANCE_PX);
    expect(m.tRight).toBeLessThanOrEqual(m.barRight + TOLERANCE_PX);
    expect(m.tLeft).toBeGreaterThanOrEqual(m.lastTabRight - TOLERANCE_PX);
    expect(Math.abs(m.tHeight - 34)).toBeLessThanOrEqual(TOLERANCE_PX);
    const trigCenter = (m.tTop + m.tBottom) / 2;
    // Center of the bar's box minus its bottom border line.
    const barCenter = (m.barTop + m.barBottom - m.barBorderBottom) / 2;
    expect(Math.abs(trigCenter - barCenter)).toBeLessThanOrEqual(2);
  });
});

test.describe('Workspace tabs flush top — 375px viewport has no horizontal page scroll (G4a)', () => {
  for (const lang of ['zh-TW', 'en'] as const) {
    test(`${lang}: document scrollWidth does not exceed clientWidth`, async ({ page }) => {
      // #langToggle is not reachable at 375px, so switch language at desktop
      // size first (the choice persists in localStorage), then shrink.
      await setDesktopViewport(page);
      await page.goto(DASHBOARD_URL);
      if (lang === 'en') await page.locator('#langToggle').click();
      await page.setViewportSize({ width: 375, height: 800 });
      await page.goto(TASK_LIST_URL);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
    });
  }
});
