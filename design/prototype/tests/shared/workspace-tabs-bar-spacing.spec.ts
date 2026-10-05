/* Red tests for issue #1143 (specs/shared/019-workspace-tabs/spec.md FR-001 /
 * AC-1.1) -- the workspace tab bar must have no horizontal slack: the first
 * tab starts exactly at the bar's left edge, adjacent tabs touch (0px gap),
 * and a 1px divider drawn with the neutral `--color-border` token separates
 * them (NoteCraft style).
 *
 * Today `.workspace-tab-bar` (sidebar.css) has `gap: var(--space-xs)` (4px)
 * and `padding: 0 var(--space-md)` (16px left), and every tab's 1px
 * border-right is `transparent`. Those are the targeted regressions.
 *
 * Geometry/computed-style only. The divider color is compared with the
 * RESOLVED `--color-border` of the current theme (read through a probe
 * element), never a hardcoded color. Guards (top 0, square corners, 180px
 * tab width, overview trigger placement/clickability, 375px) already hold
 * today and must stay green.
 */
import { test, expect, type Page } from '@playwright/test';
import { tabBar, workspaceTabs, setDesktopViewport } from './_workspace-tabs-helpers';

const TOLERANCE_PX = 1;
const SIDEBAR_COLLAPSED_STORAGE_KEY = 'labelsuite.sidebarCollapsed';
const DASHBOARD_URL = '/pages/dashboard/dashboard.html';
const TASK_LIST_URL = '/pages/task-management/task-list.html';
const DATASET_LIST_URL = '/pages/dataset/dataset-analysis-list.html';
const USER_MANAGEMENT_URL = '/pages/admin/user-management.html';
const TASK_NEW_URL = '/pages/task-management/task-new.html';
const TASK_DETAIL_URL = '/pages/task-management/task-detail.html?task_id=T001&tab=work-log';
const TASK_DETAIL_R1_URL = '/pages/task-management/task-detail.html?task_id=T001&ap_stage=r1';

type Theme = 'light' | 'dark';
type Sidebar = 'expanded' | 'collapsed';

async function openTabs(page: Page, urls: string[]): Promise<void> {
  for (const url of urls) await page.goto(url);
  await expect(workspaceTabs(page)).toHaveCount(urls.length);
}

async function openThreeTabs(page: Page, sidebar: Sidebar): Promise<void> {
  if (sidebar === 'collapsed') {
    await page.addInitScript((key) => window.localStorage.setItem(key, 'true'), SIDEBAR_COLLAPSED_STORAGE_KEY);
  }
  await openTabs(page, [DASHBOARD_URL, TASK_LIST_URL, TASK_DETAIL_URL]);
  if (sidebar === 'collapsed') await expect(page.locator('body')).toHaveClass(/sidebar-collapsed/);
}

async function openSevenTabs(page: Page): Promise<void> {
  await openTabs(page, [
    DASHBOARD_URL, TASK_LIST_URL, DATASET_LIST_URL, USER_MANAGEMENT_URL,
    TASK_NEW_URL, TASK_DETAIL_URL, TASK_DETAIL_R1_URL,
  ]);
}

async function applyTheme(page: Page, theme: Theme): Promise<void> {
  if (theme === 'dark') {
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  }
}

interface Spacing {
  barLeft: number;
  tabs: { left: number; right: number; width: number; borderRightWidth: number; borderRightStyle: string; borderRightColor: string }[];
  barBackground: string;
  resolvedBorderToken: string;
}

async function readSpacing(page: Page): Promise<Spacing> {
  return tabBar(page).evaluate((bar) => {
    const probe = document.createElement('div');
    probe.style.cssText = 'position:absolute;visibility:hidden;border-right:1px solid var(--color-border)';
    document.body.appendChild(probe);
    const resolvedBorderToken = getComputedStyle(probe).borderRightColor;
    probe.remove();
    return {
      barLeft: bar.getBoundingClientRect().left,
      barBackground: getComputedStyle(bar).backgroundColor,
      resolvedBorderToken,
      tabs: Array.from(bar.querySelectorAll('[role="tab"]')).map((tab) => {
        const r = tab.getBoundingClientRect();
        const s = getComputedStyle(tab);
        return {
          left: r.left, right: r.right, width: r.width,
          borderRightWidth: parseFloat(s.borderRightWidth),
          borderRightStyle: s.borderRightStyle,
          borderRightColor: s.borderRightColor,
        };
      }),
    };
  });
}

for (const theme of ['light', 'dark'] as const) {
  for (const sidebar of ['expanded', 'collapsed'] as const) {
    test.describe(`Workspace tabs bar spacing (#1143) — ${theme}, sidebar ${sidebar}`, () => {
      test.beforeEach(async ({ page }) => {
        await setDesktopViewport(page);
      });

      test(`${theme}, ${sidebar}: first tab starts exactly at the bar left edge`, async ({ page }) => {
        await openThreeTabs(page, sidebar);
        await applyTheme(page, theme);
        const g = await readSpacing(page);
        expect(g.tabs[0].left - g.barLeft).toBe(0);
      });

      test(`${theme}, ${sidebar}: adjacent tabs touch with a 0px gap`, async ({ page }) => {
        await openThreeTabs(page, sidebar);
        await applyTheme(page, theme);
        const g = await readSpacing(page);
        expect(g.tabs).toHaveLength(3);
        for (let i = 1; i < g.tabs.length; i++) {
          expect(g.tabs[i].left - g.tabs[i - 1].right).toBe(0);
        }
      });

      test(`${theme}, ${sidebar}: each non-last tab has a visible 1px divider in the --color-border token color`, async ({ page }) => {
        await openThreeTabs(page, sidebar);
        await applyTheme(page, theme);
        const g = await readSpacing(page);
        for (const tab of g.tabs.slice(0, -1)) {
          expect(tab.borderRightWidth).toBe(1);
          expect(tab.borderRightStyle).toBe('solid');
          expect(tab.borderRightColor).toBe(g.resolvedBorderToken);
          // Visible: neither transparent nor identical to the bar background.
          expect(tab.borderRightColor).not.toBe('rgba(0, 0, 0, 0)');
          expect(tab.borderRightColor).not.toBe(g.barBackground);
        }
      });
    });
  }
}

test.describe('Workspace tabs bar spacing (#1143) — guards that already hold', () => {
  test.beforeEach(async ({ page }) => {
    await setDesktopViewport(page);
  });

  for (const sidebar of ['expanded', 'collapsed'] as const) {
    test(`sidebar ${sidebar}: bar top 0, square corners, and every tab is 180px wide`, async ({ page }) => {
      await openThreeTabs(page, sidebar);
      const top = await tabBar(page).evaluate((bar) => bar.getBoundingClientRect().top);
      expect(Math.abs(top)).toBeLessThanOrEqual(TOLERANCE_PX);
      const tabs = workspaceTabs(page);
      for (let i = 0; i < 3; i++) {
        for (const prop of [
          'border-top-left-radius', 'border-top-right-radius',
          'border-bottom-left-radius', 'border-bottom-right-radius',
        ]) {
          await expect(tabs.nth(i)).toHaveCSS(prop, '0px');
        }
        const w = await tabs.nth(i).evaluate((el) => el.getBoundingClientRect().width);
        expect(Math.abs(w - 180)).toBeLessThanOrEqual(TOLERANCE_PX);
      }
    });
  }

  for (const scenario of ['three tabs', 'seven tabs overflowing the bar'] as const) {
    test(`overview trigger stays at the bar right end and is clickable — ${scenario}`, async ({ page }) => {
      if (scenario === 'three tabs') await openThreeTabs(page, 'expanded');
      else await openSevenTabs(page);
      const bar = tabBar(page);
      if (scenario !== 'three tabs') {
        const overflow = await bar.evaluate((el) => el.scrollWidth - el.clientWidth);
        expect(overflow).toBeGreaterThan(0);
      }
      const trigger = page.locator('.workspace-tab-overview-trigger--desktop');
      await expect(trigger).toBeVisible();

      const check = async () =>
        page.evaluate(() => {
          const barEl = document.querySelector('[data-testid="workspace-tab-bar"]') as HTMLElement;
          const trg = document.querySelector('.workspace-tab-overview-trigger--desktop') as HTMLElement;
          const b = barEl.getBoundingClientRect();
          const t = trg.getBoundingClientRect();
          const hit = document.elementFromPoint(t.left + t.width / 2, t.top + t.height / 2);
          return {
            leftInside: t.left - b.left,
            rightGap: b.right - t.right,
            covered: !(hit === trg || trg.contains(hit)),
          };
        });

      for (const scrollTo of ['start', 'end'] as const) {
        await bar.evaluate((el, where) => { el.scrollLeft = where === 'end' ? el.scrollWidth : 0; }, scrollTo);
        const m = await check();
        expect(m.leftInside).toBeGreaterThanOrEqual(0);
        expect(m.rightGap).toBeGreaterThanOrEqual(-TOLERANCE_PX);
        expect(m.rightGap).toBeLessThanOrEqual(20);
        expect(m.covered).toBe(false);
      }
      await trigger.click();
      await expect(page.getByTestId('workspace-tab-overview-menu')).toBeVisible();
    });
  }
});

test.describe('Workspace tabs bar spacing (#1143) — 375px viewport guards', () => {
  test('no horizontal document scroll, tab bar hidden, and the mobile overview trigger still opens the menu', async ({ page }) => {
    await setDesktopViewport(page);
    await openTabs(page, [DASHBOARD_URL, TASK_LIST_URL]);
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto(TASK_LIST_URL);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
    await expect(tabBar(page)).toBeHidden();
    const trigger = page.locator('.workspace-tab-overview-trigger--mobile');
    await expect(trigger).toBeVisible();
    await trigger.click();
    await expect(page.getByTestId('workspace-tab-overview-menu')).toBeVisible();
  });
});
