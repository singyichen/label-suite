/* Red tests for issue #1121 (specs/shared/019-workspace-tabs/spec.md AC-2.1).
 *
 * Defect 1: task-detail.html styles `main` as an overflow-y:auto flex column
 * that grows to content height, so the window (not main) scrolls and the
 * `position: sticky; top: 0` workspace tab bar scrolls away with `main`
 * instead of sticking to the viewport.
 * Defect 2: restoreActiveWorkspaceTabScroll() (sidebar.js) runs once on mount,
 * before task-detail's async panels grow the document, so window.scrollTo(0, y)
 * is clamped to 0 and never re-applied.
 *
 * Behaviour assertions only: bar viewport geometry and window.scrollY.
 */
import { test, expect } from '../fixtures';
import type { Page } from '@playwright/test';
import { tabBar, workspaceTabs, setDesktopViewport } from './_workspace-tabs-helpers';

const TOLERANCE_PX = 1;
const SCROLL_Y = 400;
const DASHBOARD_URL = '/pages/dashboard/dashboard.html';
const TASK_DETAIL_URL = '/pages/task-management/task-detail.html?task_role=project_leader&task_id=T001&tab=work-log&ap_stage=r1';
const TASK_LIST_URL = '/pages/task-management/task-list.html';

// Wait until async panels have rendered and the document is tall enough to scroll SCROLL_Y.
async function waitForTallDocument(page: Page): Promise<void> {
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight), { timeout: 5000 })
    .toBeGreaterThan(SCROLL_Y);
}

async function scrollWindowTo(page: Page, y: number): Promise<void> {
  await page.evaluate((v) => window.scrollTo(0, v), y);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
}

test.describe('Workspace tabs — sticky bar stays at viewport top while the window scrolls (#1121)', () => {
  test.beforeEach(async ({ page }) => {
    await setDesktopViewport(page);
  });

  for (const [name, url] of [
    ['task-detail (work-log)', TASK_DETAIL_URL],
    ['task-list', TASK_LIST_URL],
  ] as const) {
    test(`${name}: bar top is within ${TOLERANCE_PX}px of 0 after scrolling ${SCROLL_Y}px`, async ({ page }) => {
      await page.goto(url);
      await expect(workspaceTabs(page)).toHaveCount(1);
      await waitForTallDocument(page);
      await scrollWindowTo(page, SCROLL_Y);

      const barTop = await tabBar(page).evaluate((el) => el.getBoundingClientRect().top);
      expect(Math.abs(barTop)).toBeLessThanOrEqual(TOLERANCE_PX);
    });
  }
});

test.describe('Workspace tabs — scroll restore waits for async content (#1121, AC-2.1)', () => {
  test.beforeEach(async ({ page }) => {
    await setDesktopViewport(page);
  });

  test('task-detail work-log scrolled to 400 returns to ~400 after switching away and back', async ({ page }) => {
    await page.goto(TASK_DETAIL_URL);
    await expect(workspaceTabs(page)).toHaveCount(1);
    await waitForTallDocument(page);
    await scrollWindowTo(page, SCROLL_Y);
    // Let the scroll listener persist the position before navigating away.
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThanOrEqual(SCROLL_Y - 2);

    // Open a second tab by navigating to another page.
    await page.goto(DASHBOARD_URL);
    await expect(workspaceTabs(page)).toHaveCount(2);

    // Switch back via a DOM click so the test does not depend on the bar being
    // visible (defect 1 would otherwise hit first).
    await workspaceTabs(page).nth(0).evaluate((el) => (el as HTMLElement).click());
    await expect(page).toHaveURL(/task-detail\.html/);
    await expect(workspaceTabs(page).nth(0)).toHaveAttribute('aria-selected', 'true');

    await expect
      .poll(() => page.evaluate(() => window.scrollY), { timeout: 5000 })
      .toBeGreaterThanOrEqual(SCROLL_Y - 2);
    expect(await page.evaluate(() => window.scrollY)).toBeLessThanOrEqual(SCROLL_Y + 2);
  });
});

test.describe('Workspace tabs — scroll restore survives a switch during async render (#1121 review M3)', () => {
  test.beforeEach(async ({ page }) => {
    await setDesktopViewport(page);
  });

  test('leaving a tab before its async content renders must not overwrite the stored scroll position', async ({ page }) => {
    await page.goto(TASK_DETAIL_URL);
    await expect(workspaceTabs(page)).toHaveCount(1);
    await waitForTallDocument(page);
    await scrollWindowTo(page, SCROLL_Y);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThanOrEqual(SCROLL_Y - 2);

    await page.goto(DASHBOARD_URL);
    await expect(workspaceTabs(page)).toHaveCount(2);

    // Return to task-detail, then leave again before its ~560 ms async render
    // grows the document. The click and the "document still short" probe run in
    // one synchronous evaluate so the intermediate state is asserted, not assumed.
    await workspaceTabs(page).nth(0).evaluate((el) => (el as HTMLElement).click());
    await expect(page).toHaveURL(/task-detail\.html/);
    await expect(workspaceTabs(page)).toHaveCount(2);
    const early = await workspaceTabs(page).nth(1).evaluate((el) => {
      const snapshot = {
        scrollY: window.scrollY,
        scrollable: document.documentElement.scrollHeight - window.innerHeight,
      };
      (el as HTMLElement).click();
      return snapshot;
    });
    expect(early.scrollY).toBe(0);
    expect(early.scrollable).toBeLessThan(SCROLL_Y);
    await expect(page).toHaveURL(/dashboard\.html/);
    await expect(workspaceTabs(page)).toHaveCount(2);

    // Final switch back: the position stored before the aborted visit must survive.
    await workspaceTabs(page).nth(0).evaluate((el) => (el as HTMLElement).click());
    await expect(page).toHaveURL(/task-detail\.html/);
    await expect
      .poll(() => page.evaluate(() => window.scrollY), { timeout: 5000 })
      .toBeGreaterThanOrEqual(SCROLL_Y - 2);
    expect(await page.evaluate(() => window.scrollY)).toBeLessThanOrEqual(SCROLL_Y + 2);
  });
});
