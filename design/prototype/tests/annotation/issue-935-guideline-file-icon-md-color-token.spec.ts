/*
 * Traceability: GitHub issue #935
 *   annotation-workspace.html's `.guideline-file-icon.md` foreground used a
 *   literal `#8B5CF6` (light) / `#A78BFA` (dark) instead of a CSS token --
 *   the only one of the three `.guideline-file-icon` variants not already
 *   token-backed (`.pdf` reuses `--color-error`, `.img` reuses
 *   `--color-primary`). This adds `--color-file-markdown` (tokens.css) and
 *   pins that the icon's rendered foreground is genuinely sourced from that
 *   token in both themes, not a shadowed or reverted literal -- and that the
 *   rendered contrast against its own background still clears the
 *   applicable WCAG 1.4.11 non-text threshold (the icon is a decorative
 *   `aria-hidden="true"` SVG glyph, not text, per
 *   GUIDELINE_FILE_ICON_SVG.markdown in annotation-workspace.config.js).
 *   Canonical page spec: specs/annotation/015-annotation-workspace/spec.md
 */
import { test, expect, type Page } from '@playwright/test';
import { buildWorkspaceUrl, dismissGuidelineModal } from './_workspace-helpers';

const WCAG_NON_TEXT_MIN_CONTRAST = 3;

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
  await page.goto(buildWorkspaceUrl({ task_id: 'T001', sample_id: 'sent-001' }));
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
  await dismissGuidelineModal(page);
}

/**
 * Atomic single-evaluate measurement: reads the already-rendered
 * `.guideline-file-icon.md` foreground/background plus a throwaway probe
 * styled with `color: var(--color-file-markdown)` directly, all in one
 * pass -- avoids the toBeVisible()-then-evaluate() detached-element race
 * (issue #1040).
 */
async function measureGuidelineMdIcon(page: Page): Promise<{
  iconColor: string;
  iconBackground: string;
  tokenProbeColor: string;
}> {
  await page.waitForSelector('.guideline-file-icon.md');
  return page.evaluate(() => {
    const icon = document.querySelector('.guideline-file-icon.md');
    if (!icon) throw new Error('.guideline-file-icon.md not found');
    const iconStyle = getComputedStyle(icon);
    const iconColor = iconStyle.color;
    const iconBackground = iconStyle.backgroundColor;

    const probe = document.createElement('div');
    probe.setAttribute('style', 'color: var(--color-file-markdown)');
    document.body.appendChild(probe);
    const tokenProbeColor = getComputedStyle(probe).color;
    probe.remove();

    return { iconColor, iconBackground, tokenProbeColor };
  });
}

test.describe('annotation-workspace.html .guideline-file-icon.md color token (issue #935)', () => {
  test('light theme: icon foreground is sourced from --color-file-markdown, not a literal', async ({
    page,
  }) => {
    await gotoWithTheme(page, 'light');
    const { iconColor, tokenProbeColor } = await measureGuidelineMdIcon(page);
    expect(iconColor).toBe(tokenProbeColor);
  });

  test('dark theme: icon foreground is sourced from --color-file-markdown, not a literal', async ({
    page,
  }) => {
    await gotoWithTheme(page, 'dark');
    const { iconColor, tokenProbeColor } = await measureGuidelineMdIcon(page);
    expect(iconColor).toBe(tokenProbeColor);
  });

  test('light theme: rendered contrast clears WCAG 1.4.11 non-text 3:1 (decorative icon, not text)', async ({
    page,
  }) => {
    await gotoWithTheme(page, 'light');
    const { iconColor, iconBackground } = await measureGuidelineMdIcon(page);
    const ratio = contrastRatio(iconColor, iconBackground);
    expect(ratio, `contrast ratio was ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(
      WCAG_NON_TEXT_MIN_CONTRAST
    );
  });

  test('dark theme: rendered contrast clears WCAG 1.4.11 non-text 3:1 (decorative icon, not text)', async ({
    page,
  }) => {
    await gotoWithTheme(page, 'dark');
    const { iconColor, iconBackground } = await measureGuidelineMdIcon(page);
    const ratio = contrastRatio(iconColor, iconBackground);
    expect(ratio, `contrast ratio was ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(
      WCAG_NON_TEXT_MIN_CONTRAST
    );
  });
});
