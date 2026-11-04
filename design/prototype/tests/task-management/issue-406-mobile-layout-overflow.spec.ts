/*
 * Traceability: specs/task-management/014-task-detail/spec.md
 *   SC-007 (mobile reflow, WCAG 2.1 AA 1.4.10)
 *
 * Issue #406: at a 375px viewport the tab bar's last tab is sliced mid-
 * character ("標記結" instead of "標記結果") and the member-management
 * panel's search-results table forces the whole page to scroll
 * horizontally instead of scrolling in its own contained widget.
 */
import { test, expect } from '../fixtures';

const TASK_DETAIL_URL = '/pages/task-management/task-detail.html?task_role=project_leader&task_id=T016';
const PANEL_LOAD_TIMEOUT = 15000;

test.use({ viewport: { width: 375, height: 812 } });

test.describe('Task detail at 375px width (issue #406)', () => {
  test('content tabs scroll inside .admin-tabs, every tab is reachable, and the page has no horizontal overflow', async ({ page }) => {
    await page.goto(TASK_DETAIL_URL);
    await page.locator('#workLogPanel').waitFor({ state: 'attached', timeout: PANEL_LOAD_TIMEOUT });
    await page.locator('#loadingSkeleton').waitFor({ state: 'hidden', timeout: PANEL_LOAD_TIMEOUT });

    const tabs = page.locator('.admin-tab');
    const tabCount = await tabs.count();
    expect(tabCount).toBeGreaterThan(0);

    // Issue #1393: the tab strip is a single row that scrolls on its own
    // (overflow-x: auto) instead of wrapping or widening the page.
    const strip = page.locator('.admin-tabs').first();
    expect(await strip.evaluate((el) => getComputedStyle(el).overflowX)).toBe('auto');

    // Every tab must be reachable: after scrolling it into view, its full
    // box lies inside the .admin-tabs container's visible bounds.
    for (let i = 0; i < tabCount; i += 1) {
      const tab = tabs.nth(i);
      await tab.scrollIntoViewIfNeeded();
      const box = await tab.boundingBox();
      const stripBox = await strip.boundingBox();
      expect(box).not.toBeNull();
      expect(stripBox).not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(stripBox!.x - 1);
      expect(box!.x + box!.width).toBeLessThanOrEqual(stripBox!.x + stripBox!.width + 1);
    }

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test('member management panel does not force the page to scroll horizontally', async ({ page }) => {
    await page.goto(TASK_DETAIL_URL);
    await page.locator('#workLogPanel').waitFor({ state: 'attached', timeout: PANEL_LOAD_TIMEOUT });
    await page.locator('#loadingSkeleton').waitFor({ state: 'hidden', timeout: PANEL_LOAD_TIMEOUT });
    await page.locator('#tabMemberManagement').click();
    await expect(page.locator('#memberManagementPanel')).not.toHaveClass(/hidden/);

    // The member table's own scroll container (.table-scroll) may still
    // scroll horizontally -- that is an accepted, contained pattern for
    // wide data tables -- but it must not force `main` or the document to
    // grow past the viewport width.
    const overflow = await page.evaluate(() => ({
      main: document.querySelector('main')!.scrollWidth - document.querySelector('main')!.clientWidth,
      doc: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    }));
    expect(overflow.main).toBeLessThanOrEqual(0);
    expect(overflow.doc).toBeLessThanOrEqual(0);
  });
});
