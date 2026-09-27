/*
 * Traceability: GitHub issue #1028
 *   task-list.html already `<link>`s the canonical
 *   `design/prototype/assets/tokens.css` (design/prototype/pages/task-management/task-list.html:7),
 *   but its inline `<style>` block redeclares a whole `:root` (lines 14-43) that shadows it.
 *   34 of those 36 tokens are pure redundancy or a formatting-only variant (no behavior
 *   change); 2 (`--color-cta` line 16, `--color-ink-muted` line 19) actually shadow the
 *   canonical value with the PRE-#973-fix value, silently reverting the issue #973 WCAG AA
 *   contrast fix on this page only:
 *     - `--color-cta` (line 16): page `#10B981` vs canonical `#047857`
 *       (design/prototype/assets/tokens.css:13, "WCAG AA fix (issue #973), was #10B981
 *       (2.54:1 white text)"). Consumed by `.btn-primary` background, e.g. `#newTaskBtn`
 *       (design/prototype/pages/task-management/task-list.html:407).
 *     - `--color-ink-muted` (line 19): page `#94A3B8` vs canonical `#64748B`
 *       (design/prototype/assets/tokens.css:31, "WCAG AA fix (issue #973), was #94A3B8
 *       (2.56:1)"). Consumed as `.task-table th` foreground color against its own
 *       `background: var(--color-slate-50)`, e.g. `#thTaskName`
 *       (design/prototype/pages/task-management/task-list.html:422).
 *   `--shadow-lg` (line 27) also shadows canonical but only differs in decimal formatting
 *   (`rgba(0,0,0,0.1)` vs `rgba(0, 0, 0, 0.10)`), same computed value — not covered here.
 *   `--navbar-mobile-height` / `--navbar-mobile-top-height` (line 28) are page-specific,
 *   not present in canonical tokens.css at all, and must keep resolving after Green removes
 *   the redundant/shadowing declarations.
 *   Canonical page spec: specs/task-management/010-task-list/spec.md
 */
import { test, expect, type Page } from '@playwright/test';

const TASK_LIST_URL = '/pages/task-management/task-list.html';
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
  await page.goto(TASK_LIST_URL);
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
}

async function measureElementContrast(page: Page, selector: string): Promise<number> {
  const el = page.locator(selector).first();
  await expect(el).toBeVisible();
  const { color, backgroundColor } = await el.evaluate((node) => {
    const style = window.getComputedStyle(node);
    return { color: style.color, backgroundColor: style.backgroundColor };
  });
  return contrastRatio(color, backgroundColor);
}

test.describe('task-list.html token-shadow AA contrast (issue #1028)', () => {
  test('light theme: .btn-primary (#newTaskBtn) currently fails AA due to shadowed --color-cta', async ({
    page,
  }) => {
    await gotoWithTheme(page, 'light');
    const ratio = await measureElementContrast(page, '#newTaskBtn');
    expect(ratio, `#newTaskBtn contrast ratio was ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(
      WCAG_AA_MIN_CONTRAST
    );
  });

  test('light theme: .task-table th (#thTaskName) currently fails AA due to shadowed --color-ink-muted', async ({
    page,
  }) => {
    await gotoWithTheme(page, 'light');
    const ratio = await measureElementContrast(page, '#thTaskName');
    expect(ratio, `#thTaskName contrast ratio was ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(
      WCAG_AA_MIN_CONTRAST
    );
  });

  test('dark theme already meets AA on .btn-primary (regression guard, unaffected by the light :root shadow)', async ({
    page,
  }) => {
    await gotoWithTheme(page, 'dark');
    const ratio = await measureElementContrast(page, '#newTaskBtn');
    expect(ratio).toBeGreaterThanOrEqual(WCAG_AA_MIN_CONTRAST);
  });

  test('dark theme already meets AA on .task-table th (regression guard, unaffected by the light :root shadow)', async ({
    page,
  }) => {
    await gotoWithTheme(page, 'dark');
    const ratio = await measureElementContrast(page, '#thTaskName');
    expect(ratio).toBeGreaterThanOrEqual(WCAG_AA_MIN_CONTRAST);
  });

  test('page-specific --navbar-mobile-height and --navbar-mobile-top-height still resolve (not in canonical tokens.css)', async ({
    page,
  }) => {
    await gotoWithTheme(page, 'light');
    const { navbarMobileHeight, navbarMobileTopHeight } = await page.evaluate(() => {
      const rootStyle = window.getComputedStyle(document.documentElement);
      return {
        navbarMobileHeight: rootStyle.getPropertyValue('--navbar-mobile-height').trim(),
        navbarMobileTopHeight: rootStyle.getPropertyValue('--navbar-mobile-top-height').trim(),
      };
    });
    expect(navbarMobileHeight).toBe('84px');
    expect(navbarMobileTopHeight).toBe('64px');
  });
});
