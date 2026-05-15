import { test, expect, type Page } from '@playwright/test';

const BASELINE_URL = '/pages/task-management/task-list.html';

const sidebarModulePages = [
  '/pages/dashboard/dashboard.html',
  '/pages/annotation/annotation-list.html',
  '/pages/dataset/dataset-analysis-list.html',
  '/pages/account/profile.html',
  '/pages/admin/user-management.html',
];

const actionSelectors = [
  '#mobileLangToggle',
  '#mobileShortcutHelpBtn',
  '#mobileThemeToggleBtn',
  '#mobileLogoutBtn',
];

type TopActionMetrics = {
  brandFlex: string;
  wordmarkSize: string;
  actions: {
    width?: number;
    height: number;
    borderRadius: string;
    paddingLeft: string;
    paddingRight: string;
  }[];
};

async function readTopActionMetrics(pageUrl: string, page: Page) {
  await page.goto(pageUrl);

  return page.evaluate((selectors) => {
    const brand = document.querySelector<HTMLElement>('.navbar-brand');
    const wordmark = document.querySelector<HTMLElement>('.navbar-wordmark');

    if (!brand || !wordmark) {
      throw new Error('Missing shared mobile brand elements');
    }

    return {
      brandFlex: window.getComputedStyle(brand).flexGrow,
      wordmarkSize: window.getComputedStyle(wordmark).fontSize,
      actions: selectors.map((selector, index) => {
        const el = document.querySelector<HTMLElement>(selector);
        if (!el) throw new Error(`Missing ${selector}`);
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        return {
          width: index === 0 ? undefined : Math.round(rect.width),
          height: Math.round(rect.height),
          borderRadius: style.borderRadius,
          paddingLeft: style.paddingLeft,
          paddingRight: style.paddingRight,
        };
      }),
    };
  }, actionSelectors);
}

test.describe('Shared mobile top action cluster', () => {
  test('matches the Task Management mobile top action style across modules', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    const baseline = await readTopActionMetrics(BASELINE_URL, page);

    for (const pageUrl of sidebarModulePages) {
      const metrics = await readTopActionMetrics(pageUrl, page);
      expect(metrics, pageUrl).toEqual(baseline);
    }
  });
});
