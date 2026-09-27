/*
 * Traceability: GitHub issue #981
 *   user-management.html's `.btn-primary` sets a literal `color: white`
 *   instead of `var(--color-white)`
 *   (design/prototype/pages/admin/user-management.html:61). In light theme
 *   `--color-white` is #FFFFFF, so the literal value happens to match and
 *   hides the bug. In dark theme `--color-white` becomes #16161F, but the
 *   literal `white` text stays pure white on the dark theme's `--color-cta`
 *   background (#34D399), producing ~1.92:1 contrast — below the WCAG 2.1
 *   AA text threshold of 4.5:1.
 *   Canonical page spec: specs/admin/006-user-management/spec.md
 */
import { test, expect, type Page } from '@playwright/test';

const USER_MANAGEMENT_URL = '/pages/admin/user-management.html';
const WCAG_AA_MIN_CONTRAST = 4.5;

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
  await page.goto(USER_MANAGEMENT_URL);
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
}

async function measureBtnPrimaryContrast(page: Page): Promise<number> {
  const btnPrimary = page.locator('#addUserBtn.btn-primary');
  await expect(btnPrimary).toBeVisible();
  const { color, backgroundColor } = await btnPrimary.evaluate((el) => {
    const style = window.getComputedStyle(el);
    return { color: style.color, backgroundColor: style.backgroundColor };
  });
  return contrastRatio(color, backgroundColor);
}

test.describe('user-management.html .btn-primary WCAG contrast (issue #981)', () => {
  test('light theme keeps AA contrast on the primary CTA button (regression guard)', async ({ page }) => {
    await gotoWithTheme(page, 'light');
    const ratio = await measureBtnPrimaryContrast(page);
    expect(ratio).toBeGreaterThanOrEqual(WCAG_AA_MIN_CONTRAST);
  });

  test('dark theme meets AA contrast on the primary CTA button', async ({ page }) => {
    await gotoWithTheme(page, 'dark');
    const ratio = await measureBtnPrimaryContrast(page);
    expect(ratio).toBeGreaterThanOrEqual(WCAG_AA_MIN_CONTRAST);
  });
});
