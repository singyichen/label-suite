/*
 * Traceability: GitHub issue #1019
 *   task-new.html's `.toast` (design/prototype/pages/task-management/task-new.html:154)
 *   and task-list.html's `.toast` (design/prototype/pages/task-management/task-list.html:290)
 *   both set a literal `color: white` on `background: var(--color-ink)` instead of a
 *   foreground semantic token (`--color-on-ink`, not yet added — this issue's Green step).
 *   In light theme `--color-ink` is #1E1B4B, so white text on it happens to pass AA
 *   (~15.99:1) and hides the bug. In dark theme `--color-ink` becomes #E2E8F0 (a light
 *   slate), but the literal `white` text stays pure white on that light background,
 *   producing ~1.23:1 contrast — far below the WCAG 2.1 AA text threshold of 4.5:1.
 *   Canonical page specs: specs/task-management/013-task-new/spec.md,
 *   specs/task-management/010-task-list/spec.md
 */
import { test, expect, type Page } from '@playwright/test';

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

async function gotoWithTheme(page: Page, url: string, theme: 'light' | 'dark') {
  await page.addInitScript((selectedTheme) => {
    window.localStorage.setItem('label-suite-theme', selectedTheme);
  }, theme);
  await page.goto(url);
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
}

/**
 * `.toast` is invisible by default (`opacity: 0`) and only shown via JS-injected
 * `.show` on a dynamically-created element. Rather than triggering the actual toast
 * interaction (fragile, out of scope), create a throwaway `.toast` element and measure
 * its real computed styles from the page's already-loaded CSS, then remove it.
 */
async function measureToastContrast(page: Page): Promise<number> {
  const { color, backgroundColor } = await page.evaluate(() => {
    const el = document.createElement('div');
    el.className = 'toast';
    document.body.appendChild(el);
    const style = window.getComputedStyle(el);
    const result = { color: style.color, backgroundColor: style.backgroundColor };
    el.remove();
    return result;
  });
  return contrastRatio(color, backgroundColor);
}

const PAGES = [
  { name: 'task-new.html', url: '/pages/task-management/task-new.html' },
  { name: 'task-list.html', url: '/pages/task-management/task-list.html' },
];

for (const { name, url } of PAGES) {
  test.describe(`${name} .toast WCAG contrast (issue #1019)`, () => {
    test('light theme keeps AA contrast on .toast (regression guard)', async ({ page }) => {
      await gotoWithTheme(page, url, 'light');
      const ratio = await measureToastContrast(page);
      expect(ratio).toBeGreaterThanOrEqual(WCAG_AA_MIN_CONTRAST);
    });

    test('dark theme meets AA contrast on .toast', async ({ page }) => {
      await gotoWithTheme(page, url, 'dark');
      const ratio = await measureToastContrast(page);
      expect(ratio).toBeGreaterThanOrEqual(WCAG_AA_MIN_CONTRAST);
    });
  });
}
