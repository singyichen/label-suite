/*
 * Traceability: GitHub issue #1019
 *   task-list.html's `.page-btn.active` (design/prototype/pages/task-management/task-list.html:276)
 *   and task-detail.html's member-management pagination `.page-btn.active`
 *   (design/prototype/pages/task-management/task-detail.html:744-746) both set a literal
 *   `color: white` on `background: var(--color-primary)` instead of a foreground semantic
 *   token (`--color-on-cta`, not yet added — this issue's Green step). In dark theme
 *   `--color-primary` becomes #818CF8, producing ~2.98:1 contrast against white text —
 *   below the WCAG 2.1 AA text threshold of 4.5:1.
 *
 *   In light theme `--color-primary` is #6366F1, producing ~4.47:1 — already marginally
 *   below the 4.5:1 threshold *before* this issue. That pre-existing gap is not called out
 *   by issue #1019 and is out of scope for this PR; the light-theme test below only guards
 *   against further regression (asserted at 4.4, not 4.5) rather than asserting AA pass,
 *   so the Green fix for #1019 is not required to also fix this unrelated pre-existing gap.
 *   Canonical page specs: specs/task-management/010-task-list/spec.md,
 *   specs/task-management/014-task-detail/spec.md
 */
import { test, expect, type Page } from '@playwright/test';

const WCAG_AA_MIN_CONTRAST = 4.5;
// Pre-existing (non-#1019) light-theme floor — see traceability note above.
const PRE_EXISTING_LIGHT_FLOOR = 4.4;

const TASK_LIST_URL = '/pages/task-management/task-list.html';
const TASK_DETAIL_URL = '/pages/task-management/task-detail.html';
const PANEL_LOAD_TIMEOUT = 15000;

/** Parses a computed `rgb(r, g, b)` / `rgba(r, g, b, a)` string into channel values. */
function parseRgbChannels(rgbString: string): [number, number, number] {
  const matches = rgbString.match(/\d+(?:\.\d+)?/g);
  if (!matches || matches.length < 3) {
    throw new Error(`Cannot parse computed color as rgb(): ${rgbString}`);
  }
  return [Number(matches[0]), Number(matches[1]), Number(matches[2])];
}

/** WCAG 2.1 relative luminance (sRGB gamma-corrected). */
function relativeLuminance([r, g, b]: [number, number, number]): number {
  const toLinear = (channel8bit: number) => {
    const c = channel8bit / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const [rl, gl, bl] = [toLinear(r), toLinear(g), toLinear(b)];
  return 0.2126 * rl + 0.7152 * gl + 0.0722 * bl;
}

/** WCAG 2.1 contrast ratio between two computed color strings. */
function contrastRatio(colorA: string, colorB: string): number {
  const luminanceA = relativeLuminance(parseRgbChannels(colorA));
  const luminanceB = relativeLuminance(parseRgbChannels(colorB));
  const lighter = Math.max(luminanceA, luminanceB);
  const darker = Math.min(luminanceA, luminanceB);
  return (lighter + 0.05) / (darker + 0.05);
}

async function gotoWithTheme(page: Page, url: string, theme: 'light' | 'dark') {
  await page.addInitScript((selectedTheme) => {
    window.localStorage.setItem('label-suite-theme', selectedTheme);
  }, theme);
  await page.goto(url);
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
}

async function measureLocatorContrast(page: Page, locator: ReturnType<Page['locator']>): Promise<number> {
  await expect(locator).toBeVisible();
  const { color, backgroundColor } = await locator.evaluate((el) => {
    const style = window.getComputedStyle(el);
    return { color: style.color, backgroundColor: style.backgroundColor };
  });
  return contrastRatio(color, backgroundColor);
}

/** task-list.html renders its numbered pagination buttons synchronously on load. */
async function measureTaskListPageBtnActiveContrast(page: Page): Promise<number> {
  return measureLocatorContrast(page, page.locator('.page-btn.active').first());
}

/**
 * task-detail.html's member-management pagination lives behind a tab click, and its
 * panels arrive via fetched partials — wait for the last partial before interacting,
 * matching the pattern in task-detail-member-management-add.spec.ts.
 */
async function measureTaskDetailPageBtnActiveContrast(page: Page): Promise<number> {
  await page.locator('#workLogPanel').waitFor({ state: 'attached', timeout: PANEL_LOAD_TIMEOUT });
  await page.locator('#tabMemberManagement').click();
  await expect(page.locator('#memberManagementPanel')).not.toHaveClass(/hidden/);
  return measureLocatorContrast(page, page.locator('#memberPaginationControls .page-btn.active'));
}

test.describe('task-list.html .page-btn.active WCAG contrast (issue #1019)', () => {
  test('light theme: pre-existing floor, not regressed (out of #1019 scope)', async ({ page }) => {
    await gotoWithTheme(page, TASK_LIST_URL, 'light');
    const ratio = await measureTaskListPageBtnActiveContrast(page);
    expect(ratio).toBeGreaterThanOrEqual(PRE_EXISTING_LIGHT_FLOOR);
  });

  test('dark theme meets AA contrast on .page-btn.active', async ({ page }) => {
    await gotoWithTheme(page, TASK_LIST_URL, 'dark');
    const ratio = await measureTaskListPageBtnActiveContrast(page);
    expect(ratio).toBeGreaterThanOrEqual(WCAG_AA_MIN_CONTRAST);
  });
});

test.describe('task-detail.html member-management .page-btn.active WCAG contrast (issue #1019)', () => {
  test('light theme: pre-existing floor, not regressed (out of #1019 scope)', async ({ page }) => {
    await gotoWithTheme(page, TASK_DETAIL_URL, 'light');
    const ratio = await measureTaskDetailPageBtnActiveContrast(page);
    expect(ratio).toBeGreaterThanOrEqual(PRE_EXISTING_LIGHT_FLOOR);
  });

  test('dark theme meets AA contrast on .page-btn.active', async ({ page }) => {
    await gotoWithTheme(page, TASK_DETAIL_URL, 'dark');
    const ratio = await measureTaskDetailPageBtnActiveContrast(page);
    expect(ratio).toBeGreaterThanOrEqual(WCAG_AA_MIN_CONTRAST);
  });
});
