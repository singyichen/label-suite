/**
 * Auth pages — primary CTA button contrast and token parity (issue #1466)
 *
 * The four standalone auth pages declare a page-local light `--color-cta`
 * (#10B981) under white button text, which renders at 2.54:1. Asserts, per page:
 *   - light: computed CTA background vs computed text colour >= 4.5:1;
 *   - light: the page-local `--color-cta` / `--color-cta-hover` equal the
 *     light values declared in assets/tokens.css (read from disk here);
 *   - dark: CTA stays #34D399 background / #064E3B text, still >= 4.5:1
 *     (unchanged guard — must pass before and after the fix).
 *
 * Traceability: REGRESSION-RISK — auth-page CTA WCAG AA contrast and token
 *   parity with tokens.css; design/system/MASTER.md §Dark Mode Tokens >
 *   Implementation Rules > "9. Standalone auth pages (no tokens.css)"; issue
 *   #1466. No feature-spec FR.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test, expect } from '../fixtures';

const AUTH_PAGES = [
  { name: 'login', url: '/pages/account/login.html', cta: '.login-btn' },
  { name: 'register', url: '/pages/account/register.html', cta: '.submit-btn' },
  { name: 'forgot-password', url: '/pages/account/forgot-password.html', cta: '.submit-btn' },
  { name: 'reset-password', url: '/pages/account/reset-password.html', cta: '.submit-btn' },
];

const WCAG_AA_MIN_CONTRAST = 4.5;

const TOKENS_CSS = readFileSync(join(__dirname, '../../assets/tokens.css'), 'utf8');

/** First (light :root) declaration of a custom property in tokens.css. */
function lightToken(name: string): string {
  const m = TOKENS_CSS.match(new RegExp(`${name}\\s*:\\s*(#[0-9A-Fa-f]{3,8})`));
  if (!m) throw new Error(`${name} not found in tokens.css`);
  return m[1].toUpperCase();
}

/** Parses computed `rgb(r, g, b)`; throws on alpha < 1 (translucent ratio is meaningless). */
function parseRgbChannels(rgbString: string): [number, number, number] {
  const matches = rgbString.match(/\d+(?:\.\d+)?/g);
  if (!matches || matches.length < 3) {
    throw new Error(`Cannot parse computed color as rgb(): ${rgbString}`);
  }
  if (matches.length > 3 && Number(matches[3]) < 1) {
    throw new Error(`Refusing to compute contrast against a translucent colour: ${rgbString}`);
  }
  return [Number(matches[0]), Number(matches[1]), Number(matches[2])];
}

function relativeLuminance([r, g, b]: [number, number, number]): number {
  const toLinear = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(parseRgbChannels(a));
  const lb = relativeLuminance(parseRgbChannels(b));
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

for (const { name, url, cta } of AUTH_PAGES) {
  test.describe(`${name} — primary CTA`, () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(url);
    });

    test('light: CTA text on CTA background clears 4.5:1', async ({ page }) => {
      const { bg, fg } = await page.locator(cta).evaluate((el) => {
        const s = window.getComputedStyle(el);
        return { bg: s.backgroundColor, fg: s.color };
      });
      const ratio = contrastRatio(fg, bg);
      expect(ratio, `light: CTA text ${fg} on ${bg} renders ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(
        WCAG_AA_MIN_CONTRAST,
      );
    });

    test('light: page-local CTA tokens equal tokens.css', async ({ page }) => {
      const local = await page.evaluate(() => {
        const s = window.getComputedStyle(document.documentElement);
        return {
          cta: s.getPropertyValue('--color-cta').trim(),
          hover: s.getPropertyValue('--color-cta-hover').trim(),
        };
      });
      expect(local.cta.toUpperCase()).toBe(lightToken('--color-cta'));
      expect(local.hover.toUpperCase()).toBe(lightToken('--color-cta-hover'));
    });

    test('dark: CTA stays #34D399 on #064E3B text and clears 4.5:1', async ({ page }) => {
      await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
      const button = page.locator(cta);
      await expect(button).toHaveCSS('background-color', 'rgb(52, 211, 153)');
      await expect(button).toHaveCSS('color', 'rgb(6, 78, 59)');
      const { bg, fg } = await button.evaluate((el) => {
        const s = window.getComputedStyle(el);
        return { bg: s.backgroundColor, fg: s.color };
      });
      expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(WCAG_AA_MIN_CONTRAST);
    });
  });
}
