/* Red test for issue #1121 review finding M2.
 *
 * sidebar.css `main:has(> .workspace-tab-bar) { overflow-y: visible }` keeps
 * <main> a non-scroller so the sticky bar resolves against the viewport. It
 * must not leak into annotation-workspace, whose
 * `.workspace-root { height: 100vh; overflow: hidden }` is the containment
 * that keeps the three-column workspace from scrolling the window.
 *
 * Behavioural assertion: inflating content inside the workspace must not make
 * the document taller than the viewport. The computed overflow-y check pins
 * the contract itself (containment) and is acceptable here because the
 * contract IS the containment.
 */
import { test, expect } from '@playwright/test';
import { tabBar, setDesktopViewport } from './_workspace-tabs-helpers';

const WORKSPACE_URL =
  '/pages/annotation/annotation-workspace.html?task_id=T001&sample_id=sent-001&role=annotator&run_type=official_run';

test.describe('Workspace tabs — annotation-workspace keeps its overflow containment (#1121)', () => {
  test.beforeEach(async ({ page }) => {
    await setDesktopViewport(page);
  });

  test('main stays overflow-y: hidden and tall inner content does not grow the document', async ({ page }) => {
    await page.goto(WORKSPACE_URL);
    await expect(tabBar(page)).toBeVisible();

    await expect(page.locator('main')).toHaveCSS('overflow-y', 'hidden');

    await page.locator('.workspace-body > .col-samples').evaluate((el) => {
      const filler = document.createElement('div');
      filler.setAttribute('data-test-filler', '');
      filler.style.height = '5000px';
      el.appendChild(filler);
    });

    const { scrollHeight, innerHeight } = await page.evaluate(() => ({
      scrollHeight: document.documentElement.scrollHeight,
      innerHeight: window.innerHeight,
    }));
    expect(scrollHeight).toBeLessThanOrEqual(innerHeight);
  });
});
