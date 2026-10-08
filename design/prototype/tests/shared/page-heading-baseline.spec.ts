/**
 * Top-level page heading blocks (h1 title + subtitle) on every module page
 * must align with the Dashboard baseline at the 1440px desktop viewport:
 * same position and typography metrics (title size, subtitle size and
 * line-height, spacing below the heading block).
 *
 * Traceability: specs/shared/008-sidebar-navbar-shared/spec.md
 *   FR-017, SC-010
 */
import { test, expect, type Page } from '@playwright/test';

const BASELINE_URL = '/pages/dashboard/dashboard.html';

const pagesWithTopHeading = [
  '/pages/task-management/task-list.html',
  '/pages/task-management/task-new.html',
  '/pages/task-management/task-detail.html',
  '/pages/annotation/annotation-list.html',
  '/pages/dataset/dataset-analysis-list.html',
  '/pages/dataset/dataset-analysis-detail.html?task_id=T001',
  '/pages/admin/user-management.html',
  '/pages/admin/role-settings.html',
  '/pages/account/profile.html',
];

// FR-025 (014-task-detail) removed the subtitle from task-detail: its H1 is
// followed by the inline stage status, not a subtitle. FR-017 / SC-010 only
// require subtitle metrics on pages that have one, so task-detail keeps the
// title checks and skips the subtitle ones.
const pagesWithoutSubtitle = ['/pages/task-management/task-detail.html'];

type HeadingMetrics = {
  titleX: number;
  titleY: number;
  titleFontSize: string;
  titleLineHeight: string;
  titleMarginBottom: string;
  subtitleX?: number;
  subtitleY?: number;
  subtitleFontSize?: string;
  subtitleLineHeight?: string;
};

async function readHeadingMetrics(page: Page, pageUrl: string): Promise<HeadingMetrics> {
  await page.goto(pageUrl);
  const expectSubtitle = !pagesWithoutSubtitle.includes(pageUrl);

  return page.evaluate((expectSubtitle) => {
    const title = document.querySelector<HTMLElement>('h1');
    if (!title) throw new Error('Missing top-level page title');

    const titleRect = title.getBoundingClientRect();
    const titleStyle = window.getComputedStyle(title);
    const titleMetrics = {
      titleX: Math.round(titleRect.left),
      titleY: Math.round(titleRect.top),
      titleFontSize: titleStyle.fontSize,
      titleLineHeight: titleStyle.lineHeight,
      titleMarginBottom: titleStyle.marginBottom,
    };
    if (!expectSubtitle) return titleMetrics;

    const subtitle = title.nextElementSibling instanceof HTMLElement ? title.nextElementSibling : null;
    if (!subtitle) throw new Error('Missing top-level page subtitle');
    const subtitleRect = subtitle.getBoundingClientRect();
    const subtitleStyle = window.getComputedStyle(subtitle);

    return {
      ...titleMetrics,
      subtitleX: Math.round(subtitleRect.left),
      subtitleY: Math.round(subtitleRect.top),
      subtitleFontSize: subtitleStyle.fontSize,
      subtitleLineHeight: subtitleStyle.lineHeight,
    };
  }, expectSubtitle);
}

test.describe('Shared page heading baseline', () => {
  test('matches Dashboard heading position and typography across pages', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    const baseline = await readHeadingMetrics(page, BASELINE_URL);

    for (const pageUrl of pagesWithTopHeading) {
      const metrics = await readHeadingMetrics(page, pageUrl);
      if (pagesWithoutSubtitle.includes(pageUrl)) {
        const { titleX, titleY, titleFontSize, titleLineHeight, titleMarginBottom } = baseline;
        expect(metrics, pageUrl).toEqual({ titleX, titleY, titleFontSize, titleLineHeight, titleMarginBottom });
      } else {
        expect(metrics, pageUrl).toEqual(baseline);
      }
    }
  });
});
