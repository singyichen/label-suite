/*
 * Traceability: GitHub issue #1029
 *   task-new.html's `.step-circle.done` (design/prototype/pages/task-management/task-new.html:40)
 *   sets a literal `color: white` on `background: var(--color-cta)`. `--color-white` in dark
 *   theme is itself remapped (tokens.css line 147, `#16161F` — a card surface color, not pure
 *   white), but the literal keyword `white` bypasses that remap and stays pure white regardless
 *   of theme. In light theme this passes (~5.4839:1), but in dark theme `--color-cta` shifts to
 *   a bright tone and the literal white text stays white, producing ~1.9224:1 contrast — far
 *   below the WCAG 2.1 AA text threshold of 4.5:1. The Green fix switches this to the foreground
 *   semantic token `--color-on-cta` (design/prototype/assets/tokens.css: light #FFFFFF, dark
 *   #1E1B4B), which resolves per-theme like `--color-white` but with theme-appropriate contrast.
 *
 *   task-detail.html's `.btn-cta` (design/prototype/pages/task-management/task-detail.html:225)
 *   sets `color: var(--color-white)` on `background: var(--color-cta)`. Because `--color-white`
 *   is already theme-aware (light #FFFFFF, dark #16161F), this location's dark-theme contrast is
 *   already ~9.3472:1 today — a plain AA-ratio assertion would NOT be Red here. Instead, the Red
 *   assertion is behavioral equivalence to the token: `.btn-cta`'s computed `color` must equal a
 *   probe element's computed `color` when the probe is styled with `color: var(--color-on-cta)`
 *   directly. Today in dark theme this fails (`.btn-cta` resolves to rgb(22, 22, 31) via
 *   `--color-white`; the on-cta probe resolves to rgb(30, 27, 75)); after Green switches `.btn-cta`
 *   to `var(--color-on-cta)` both will resolve identically.
 *   Canonical page specs: specs/task-management/013-task-new/spec.md,
 *   specs/task-management/014-task-detail/spec.md
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
 * `.step-circle.done` is not rendered in its "done" state by default. Rather than driving
 * the real wizard interaction (fragile, out of scope), create a throwaway
 * `<div class="step-circle done">` and measure its real computed styles from the page's
 * already-loaded CSS, then remove it.
 */
async function measureStepCircleDoneContrast(page: Page): Promise<number> {
  const { color, backgroundColor } = await page.evaluate(() => {
    const el = document.createElement('div');
    el.className = 'step-circle done';
    document.body.appendChild(el);
    const style = window.getComputedStyle(el);
    const result = { color: style.color, backgroundColor: style.backgroundColor };
    el.remove();
    return result;
  });
  return contrastRatio(color, backgroundColor);
}

/**
 * Creates a throwaway `<button class="btn btn-cta">` plus a throwaway `<div>` probe with
 * inline `style="color: var(--color-on-cta)"`, reads both computed styles from the page's
 * already-loaded CSS, then removes both elements.
 */
async function measureBtnCtaAndOnCtaProbe(
  page: Page
): Promise<{ btnCtaColor: string; btnCtaBackgroundColor: string; onCtaProbeColor: string }> {
  return page.evaluate(() => {
    const btnCta = document.createElement('button');
    btnCta.className = 'btn btn-cta';
    document.body.appendChild(btnCta);
    const btnCtaStyle = window.getComputedStyle(btnCta);
    const btnCtaColor = btnCtaStyle.color;
    const btnCtaBackgroundColor = btnCtaStyle.backgroundColor;
    btnCta.remove();

    const onCtaProbe = document.createElement('div');
    onCtaProbe.setAttribute('style', 'color: var(--color-on-cta)');
    document.body.appendChild(onCtaProbe);
    const onCtaProbeColor = window.getComputedStyle(onCtaProbe).color;
    onCtaProbe.remove();

    return { btnCtaColor, btnCtaBackgroundColor, onCtaProbeColor };
  });
}

const TASK_NEW_URL = '/pages/task-management/task-new.html';
const TASK_DETAIL_URL = '/pages/task-management/task-detail.html';

test.describe('task-new.html .step-circle.done WCAG contrast (issue #1029)', () => {
  test('light theme keeps AA contrast (regression guard)', async ({ page }) => {
    await gotoWithTheme(page, TASK_NEW_URL, 'light');
    const ratio = await measureStepCircleDoneContrast(page);
    expect(ratio).toBeGreaterThanOrEqual(WCAG_AA_MIN_CONTRAST);
  });

  test('dark theme meets AA contrast', async ({ page }) => {
    await gotoWithTheme(page, TASK_NEW_URL, 'dark');
    const ratio = await measureStepCircleDoneContrast(page);
    expect(ratio).toBeGreaterThanOrEqual(WCAG_AA_MIN_CONTRAST);
  });
});

test.describe('task-detail.html .btn-cta WCAG contrast (issue #1029)', () => {
  test('light theme: .btn-cta color matches --color-on-cta probe (regression guard)', async ({ page }) => {
    await gotoWithTheme(page, TASK_DETAIL_URL, 'light');
    const { btnCtaColor, onCtaProbeColor } = await measureBtnCtaAndOnCtaProbe(page);
    expect(btnCtaColor).toBe(onCtaProbeColor);
  });

  test('light theme keeps AA contrast (defense-in-depth)', async ({ page }) => {
    await gotoWithTheme(page, TASK_DETAIL_URL, 'light');
    const { btnCtaColor, btnCtaBackgroundColor } = await measureBtnCtaAndOnCtaProbe(page);
    const ratio = contrastRatio(btnCtaColor, btnCtaBackgroundColor);
    expect(ratio).toBeGreaterThanOrEqual(WCAG_AA_MIN_CONTRAST);
  });

  test('dark theme: .btn-cta color matches --color-on-cta probe', async ({ page }) => {
    await gotoWithTheme(page, TASK_DETAIL_URL, 'dark');
    const { btnCtaColor, onCtaProbeColor } = await measureBtnCtaAndOnCtaProbe(page);
    expect(btnCtaColor).toBe(onCtaProbeColor);
  });

  test('dark theme keeps AA contrast (defense-in-depth)', async ({ page }) => {
    await gotoWithTheme(page, TASK_DETAIL_URL, 'dark');
    const { btnCtaColor, btnCtaBackgroundColor } = await measureBtnCtaAndOnCtaProbe(page);
    const ratio = contrastRatio(btnCtaColor, btnCtaBackgroundColor);
    expect(ratio).toBeGreaterThanOrEqual(WCAG_AA_MIN_CONTRAST);
  });
});
