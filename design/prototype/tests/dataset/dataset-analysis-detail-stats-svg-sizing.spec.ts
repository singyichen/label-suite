/**
 * Traceability: specs/dataset/017-dataset-analysis-detail/spec.md
 *   FR-009H (AC-2.3 single_dim histogram), FR-009I (AC-2.4 multi_dim histograms + scatter)
 *   Issue #1454: stats chart SVGs share one max width (360px), are left-aligned,
 *   and keep rendered text between 11px and 16px.
 */
import { test, expect } from '../fixtures';
import type { Page } from '@playwright/test';

const DETAIL_URL = '/pages/dataset/dataset-analysis-detail.html';
const MAX_WIDTH = 360;
const MIN_FONT = 11;
const MAX_FONT = 16;

interface SvgGeometry {
  width: number;
  leftDelta: number;
  fontSizes: number[];
}

async function measure(page: Page, selector: string): Promise<SvgGeometry> {
  const svg = page.locator(selector).first();
  await expect(svg).toBeVisible();
  await expect(svg.locator('text').first()).toBeAttached();
  return svg.evaluate((el: Element) => {
    const s = el as unknown as SVGSVGElement;
    const rect = s.getBoundingClientRect();
    const vbWidth = s.viewBox.baseVal.width;
    const scale = rect.width / vbWidth;
    const parent = s.parentElement as HTMLElement;
    const pr = parent.getBoundingClientRect();
    const pcs = getComputedStyle(parent);
    const contentLeft = pr.left + parseFloat(pcs.paddingLeft) + parseFloat(pcs.borderLeftWidth);
    const fontSizes = Array.from(s.querySelectorAll('text')).map((t) => {
      const attr = t.getAttribute('font-size');
      const base = attr !== null && attr !== '' && !Number.isNaN(parseFloat(attr))
        ? parseFloat(attr)
        : parseFloat(getComputedStyle(t).fontSize);
      return base * scale;
    });
    return { width: rect.width, leftDelta: rect.left - contentLeft, fontSizes };
  });
}

const CASES: Array<{ taskId: string; name: string; selector: string }> = [
  { taskId: 'T005', name: 'multi_dim valence histogram', selector: 'svg[data-i18n-aria-label="statsVAValenceAria"]' },
  { taskId: 'T005', name: 'multi_dim arousal histogram', selector: 'svg[data-i18n-aria-label="statsVAArousalAria"]' },
  { taskId: 'T005', name: 'multi_dim V-A scatter', selector: 'svg[data-i18n-aria-label="statsVAScatterAria"]' },
  { taskId: 'T108', name: 'single_dim histogram', selector: 'svg[data-i18n-aria-label="singleDimStats.histAria"]' },
];

test.describe('Dataset analysis detail stats SVG sizing (#1454)', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  for (const c of CASES) {
    test(`${c.name} (${c.taskId}): width, font size and alignment`, async ({ page }) => {
      await page.goto(`${DETAIL_URL}?task_id=${c.taskId}&tab=stats`);
      const g = await measure(page, c.selector);

      // All stats SVGs share one rendered width: the shared max width.
      expect.soft(Math.abs(g.width - MAX_WIDTH), `rendered width ${g.width}`).toBeLessThanOrEqual(1);

      // Effective text size = font-size x (rendered width / viewBox width).
      expect(g.fontSizes.length).toBeGreaterThan(0);
      for (const fs of g.fontSizes) {
        expect.soft(fs, `effective font size ${fs}`).toBeGreaterThanOrEqual(MIN_FONT);
        expect.soft(fs, `effective font size ${fs}`).toBeLessThanOrEqual(MAX_FONT);
      }

      // Left-aligned in its containing block's content box.
      expect.soft(Math.abs(g.leftDelta), `left offset from content edge ${g.leftDelta}`).toBeLessThanOrEqual(1);
    });
  }
});
