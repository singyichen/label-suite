/*
 * Traceability: GitHub issue #1029
 *   role-settings.html's base `.btn-cta` rule (design/prototype/pages/admin/role-settings.html:103-109)
 *   sets `color: var(--color-white)` on `background: var(--color-cta)`, plus a page-local
 *   dark-theme override (design/prototype/pages/admin/role-settings.html:389)
 *   `html[data-theme="dark"] .btn-cta { color: #0F172A; }` that hardcodes a literal
 *   instead of the foreground semantic token `--color-on-cta` (already defined in
 *   design/prototype/assets/tokens.css: light #FFFFFF, dark #1E1B4B).
 *
 *   Unlike the other three #1029 locations, this page's dark-theme contrast is already
 *   >= 4.5:1 today (the literal #0F172A measures ~9.29:1 against --color-cta), so a plain
 *   AA-ratio assertion would NOT be Red here — it would pass before the fix too. Instead,
 *   the Red assertion is behavioral equivalence to the token: `.btn-cta`'s computed `color`
 *   must equal a probe element's computed `color` when the probe is styled with
 *   `color: var(--color-on-cta)` directly. Today in dark theme this fails (`.btn-cta`
 *   resolves to rgb(15, 23, 42) from the hardcoded override; the on-cta probe resolves to
 *   rgb(30, 27, 75)); after Green removes the override both will resolve identically.
 *   Canonical page spec: specs/admin/007-role-settings/spec.md
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
 * Creates a throwaway `<button class="btn-cta">` plus a throwaway `<div>` probe with
 * inline `style="color: var(--color-on-cta)"`, reads both computed styles from the
 * page's already-loaded CSS, then removes both elements.
 */
async function measureBtnCtaAndOnCtaProbe(
  page: Page
): Promise<{ btnCtaColor: string; btnCtaBackgroundColor: string; onCtaProbeColor: string }> {
  return page.evaluate(() => {
    const btnCta = document.createElement('button');
    btnCta.className = 'btn-cta';
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

const ROLE_SETTINGS_URL = '/pages/admin/role-settings.html';

test.describe('role-settings.html .btn-cta WCAG contrast (issue #1029)', () => {
  test('light theme: .btn-cta color matches --color-on-cta probe (regression guard)', async ({ page }) => {
    await gotoWithTheme(page, ROLE_SETTINGS_URL, 'light');
    const { btnCtaColor, onCtaProbeColor } = await measureBtnCtaAndOnCtaProbe(page);
    expect(btnCtaColor).toBe(onCtaProbeColor);
  });

  test('light theme keeps AA contrast (defense-in-depth)', async ({ page }) => {
    await gotoWithTheme(page, ROLE_SETTINGS_URL, 'light');
    const { btnCtaColor, btnCtaBackgroundColor } = await measureBtnCtaAndOnCtaProbe(page);
    const ratio = contrastRatio(btnCtaColor, btnCtaBackgroundColor);
    expect(ratio).toBeGreaterThanOrEqual(WCAG_AA_MIN_CONTRAST);
  });

  test('dark theme: .btn-cta color matches --color-on-cta probe', async ({ page }) => {
    await gotoWithTheme(page, ROLE_SETTINGS_URL, 'dark');
    const { btnCtaColor, onCtaProbeColor } = await measureBtnCtaAndOnCtaProbe(page);
    expect(btnCtaColor).toBe(onCtaProbeColor);
  });

  test('dark theme keeps AA contrast (defense-in-depth)', async ({ page }) => {
    await gotoWithTheme(page, ROLE_SETTINGS_URL, 'dark');
    const { btnCtaColor, btnCtaBackgroundColor } = await measureBtnCtaAndOnCtaProbe(page);
    const ratio = contrastRatio(btnCtaColor, btnCtaBackgroundColor);
    expect(ratio).toBeGreaterThanOrEqual(WCAG_AA_MIN_CONTRAST);
  });
});
