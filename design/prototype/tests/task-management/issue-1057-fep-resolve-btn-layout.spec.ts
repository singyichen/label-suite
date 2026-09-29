/*
 * Traceability: issue #1057 -- 最終例外池「進入處置」按鈕換行造成版面跑版.
 *
 * Root cause (confirmed while writing this Red, not re-derived): the final
 * exception pool table's action cell renders a plain `<a class="mini-btn"
 * data-testid="fep-resolve-link">` (task-detail.html renderFinalExceptionPoolSection(),
 * ~8621-8627). Neither `.member-table td` (~705) nor `.mini-btn` (~902) sets
 * `white-space: nowrap`, unlike `.btn-view-detail` (~1156) which does and
 * never wraps. When an adjoining cell in the same row is long -- T016's sole
 * pending final-exception-pool item, `ofm-05-final-exception`, carries a long
 * `fep-arbiter` reason string (annotation-workspace.data.js:3605, arbReason
 * "依 [[難以判定時的處理]]，原標記與審核修正結果皆缺乏明確文本依據支持，需徵詢更明確判準。")
 * -- the row stretches and the 進入處置 / Resolve link wraps onto two lines,
 * breaking the layout.
 *
 * This Red asserts only observable layout facts (bounding box height and
 * containment within the `<td>`), never a specific CSS property/value, so
 * Green stays free to choose `white-space: nowrap`, `display: inline-block`,
 * or any other fix.
 */
import { test, expect, type Page } from '@playwright/test';

const TASK_DETAIL_URL = '/pages/task-management/task-detail.html';
const PANEL_LOAD_TIMEOUT = 15000;
// A single line of `.mini-btn` text (font-size 12px, padding 6px 10px, 1px
// border) renders at roughly 28-30px tall. A wrapped two-line label adds a
// full line-height (~14-16px) on top of that, comfortably clearing 36px.
const SINGLE_LINE_MAX_HEIGHT = 36;
const FEP_ROW_SAMPLE_ID = 'ofm-05-final-exception';

async function openAnnotationProgress(page: Page, query: string) {
  await page.goto(TASK_DETAIL_URL + query);
  await page.locator('#workLogPanel').waitFor({ state: 'attached', timeout: PANEL_LOAD_TIMEOUT });
  await expect(page.locator('#annotationProgressPanel')).not.toHaveClass(/hidden/);
}

async function setLang(page: Page, lang: 'zh' | 'en') {
  await page.addInitScript((value) => {
    window.localStorage.setItem('labelsuite.lang', value);
  }, lang);
}

function fepResolveLink(page: Page) {
  return page
    .locator('[data-testid="final-exception-pool-row"]')
    .filter({ hasText: FEP_ROW_SAMPLE_ID })
    .locator('[data-testid="fep-resolve-link"]');
}

test.describe('Final exception pool 進入處置/Resolve link stays single-line (issue #1057)', () => {
  for (const lang of ['zh', 'en'] as const) {
    test(`link renders on one line and stays inside its <td> (${lang})`, async ({ page }) => {
      await setLang(page, lang);
      await page.setViewportSize({ width: 1280, height: 800 });
      await openAnnotationProgress(page, '?task_id=T016&tab=annotation-progress&status=official_run_in_progress');

      const link = fepResolveLink(page);
      await expect(link).toBeVisible();

      const linkBox = await link.boundingBox();
      expect(linkBox).not.toBeNull();
      expect(linkBox!.height).toBeLessThanOrEqual(SINGLE_LINE_MAX_HEIGHT);

      const cellBox = await link.locator('xpath=ancestor::td[1]').boundingBox();
      expect(cellBox).not.toBeNull();

      // No overflow: the link's box must lie fully inside its <td>'s box.
      expect(linkBox!.x).toBeGreaterThanOrEqual(cellBox!.x - 0.5);
      expect(linkBox!.y).toBeGreaterThanOrEqual(cellBox!.y - 0.5);
      expect(linkBox!.x + linkBox!.width).toBeLessThanOrEqual(cellBox!.x + cellBox!.width + 0.5);
      expect(linkBox!.y + linkBox!.height).toBeLessThanOrEqual(cellBox!.y + cellBox!.height + 0.5);
    });
  }

  // issue #688's href contract must survive this fix unweakened.
  test('the resolve link keeps its task_id/run_type/annotator_id/sample_id href contract', async ({ page }) => {
    await openAnnotationProgress(page, '?task_id=T016&tab=annotation-progress&status=official_run_in_progress');

    const link = fepResolveLink(page);
    await expect(link).toBeVisible();
    const href = await link.getAttribute('href');
    expect(href).toBeTruthy();
    expect(href).toContain('task_id=T016');
    expect(href).toContain('run_type=official_run');
    expect(href).toContain(`sample_id=${FEP_ROW_SAMPLE_ID}`);
    expect(href).toMatch(/annotator_id=[^&]+/);
  });
});
