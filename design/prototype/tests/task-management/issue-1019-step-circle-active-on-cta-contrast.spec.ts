/*
 * Traceability: GitHub issue #1019
 *   task-new.html's `.step-circle.active` (design/prototype/pages/task-management/task-new.html:39)
 *   sets `border-color: var(--color-primary); background: var(--color-primary); color: white`
 *   — a literal `color: white` instead of a foreground semantic token (`--color-on-cta`,
 *   not yet added — this issue's Green step). In dark theme `--color-primary` becomes
 *   #818CF8, producing ~2.98:1 contrast against white text — below the WCAG 2.1 AA text
 *   threshold of 4.5:1.
 *
 *   In light theme `--color-primary` is #6366F1, producing ~4.47:1 — already marginally
 *   below the 4.5:1 threshold *before* this issue. That pre-existing gap is not called out
 *   by issue #1019 and is out of scope for this PR; the light-theme test below only guards
 *   against further regression (asserted at 4.4, not 4.5), so the Green fix for #1019 is
 *   not required to also fix this unrelated pre-existing gap.
 *   Canonical page spec: specs/task-management/013-task-new/spec.md
 *
 *   Update (issue #1030, maintainer decision 2026-09-27): the light-theme gap is resolved
 *   as a sanctioned accepted tradeoff, not a defect — see the Step Indicator arbitration
 *   record in design/system/MASTER.md (measured 4.4669:1, 0.033 under AA). The floor below
 *   still guards against regression rather than asserting AA pass, so a future change to
 *   `--color-primary` or `--color-on-cta` that pushes this below 4.4 fails here as a signal
 *   to update that arbitration record.
 */
import { test, expect, type Page } from '@playwright/test';

const TASK_NEW_URL = '/pages/task-management/task-new.html';
const WCAG_AA_MIN_CONTRAST = 4.5;
// Accepted-tradeoff light-theme floor (issue #1030) — see traceability note above.
const ACCEPTED_TRADEOFF_LIGHT_FLOOR = 4.4;

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

async function gotoWithTheme(page: Page, theme: 'light' | 'dark') {
  await page.addInitScript((selectedTheme) => {
    window.localStorage.setItem('label-suite-theme', selectedTheme);
  }, theme);
  await page.goto(TASK_NEW_URL);
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
}

async function measureStepCircleActiveContrast(page: Page): Promise<number> {
  const stepCircleActive = page.locator('.step-circle.active').first();
  await expect(stepCircleActive).toBeVisible();
  const { color, backgroundColor } = await stepCircleActive.evaluate((el) => {
    const style = window.getComputedStyle(el);
    return { color: style.color, backgroundColor: style.backgroundColor };
  });
  return contrastRatio(color, backgroundColor);
}

test.describe('task-new.html .step-circle.active WCAG contrast (issue #1019)', () => {
  test('light theme: accepted-tradeoff floor, not regressed (issue #1030)', async ({ page }) => {
    await gotoWithTheme(page, 'light');
    const ratio = await measureStepCircleActiveContrast(page);
    expect(ratio).toBeGreaterThanOrEqual(ACCEPTED_TRADEOFF_LIGHT_FLOOR);
  });

  test('dark theme meets AA contrast on .step-circle.active', async ({ page }) => {
    await gotoWithTheme(page, 'dark');
    const ratio = await measureStepCircleActiveContrast(page);
    expect(ratio).toBeGreaterThanOrEqual(WCAG_AA_MIN_CONTRAST);
  });
});
