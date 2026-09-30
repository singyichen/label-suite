/**
 * Auth pages — rendered ground, card surface and readable ink (issue #183)
 *
 * The four standalone auth pages define their design tokens locally because
 * they do not import tokens.css. This file asserts only the rendered result of
 * that local definition — never the custom-property names or literal values:
 *   - computed `body` background-color is the canonical page ground,
 *     light #F5F3FF / dark #0B0B12 (--color-surface);
 *   - computed `.card` background-color is the card surface,
 *     light #FFFFFF / dark #16161F (--color-card);
 *   - computed `color` of `h1.card-title` — the element that carries primary
 *     card text on all four pages, setting `color: var(--color-ink)` directly
 *     inside `.card` — is light #1E1B4B / dark #E2E8F0 (--color-ink);
 *   - that ink-on-card pair clears 4.5:1 in both themes, so a dark remap
 *     dropped from --color-ink (which leaves the light ink on the dark card at
 *     roughly 1.1:1, i.e. invisible text) cannot merge silently.
 *
 * On that threshold: `.card-title` is 22px/700, i.e. WCAG large text, whose AA
 * minimum is 3:1 — 4.5 is deliberately stricter. MASTER's prescribed colours
 * measure 15.99:1 light and 14.58:1 dark, i.e. 3.55x and 3.24x of the asserted
 * floor, so the ratio only catches gross failures; anything subtler is caught
 * by the two value assertions, not by the ratio.
 *
 * What this file does NOT assert, stated plainly because these assertions read
 * rendered colour and nothing else:
 *   - **that the tokens are declared and re-mapped at all.** Hardcoding
 *     `.card { background: #FFFFFF }` plus a dark override, with no
 *     --color-card declaration anywhere, passes every case here — while the
 *     token pins issue #1059 group 3 removed would have failed, because they
 *     read the declaration. On that axis this file is weaker than what it
 *     replaced. The clause left unguarded is rule 9's "Each page must include
 *     a `html[data-theme="dark"]` block that re-maps the local tokens".
 *   - **that the local names are the canonical ones.** Renaming
 *     --color-card to, say, --auth-card-bg and declaring plus re-mapping it
 *     in both themes passes every case here (verified). This is a different
 *     axis from the one above — the token is declared and re-mapped, just not
 *     under the name rule 9 requires: "Local token names **must reuse the
 *     canonical names** from `tokens.css` — do not invent parallel names".
 *   - --color-primary-soft-bg: consumed only by `:hover` rules
 *     (`.lang-toggle:hover`, and on login.html `.sso-btn:hover`), so it is not
 *     part of the static ink-on-card pair and would need hover simulation.
 *   - --color-ink-muted, which `.card-subtitle` uses. Note this is not merely
 *     uncovered: all four pages still declare #94A3B8, which on the white card
 *     is 2.564:1 for 15px normal-weight text — a live WCAG AA failure, and the
 *     same value issue #973 raised to #64748B (4.76:1) in tokens.css, a fix
 *     that never reached these pages because they do not import it.
 *   - the deprecated-name hygiene rule. Group 3 removed pins on
 *     --color-background / --color-text / --color-primary-light, names no page
 *     or asset consumes; re-declaring an unconsumed custom property changes no
 *     pixel, so no rendered assertion can see it.
 * The first, second and last of those are source-text rules and belong in the
 * node gate, which already reads these page shells as source. Issue #1067
 * tracks all five.
 *
 * Traceability: REGRESSION-RISK — auth-page rendered light/dark ground, card
 *   surface and ink contrast; design/system/MASTER.md §Dark Mode Tokens >
 *   Implementation Rules > "9. Standalone auth pages (no tokens.css)".
 *   No feature-spec FR.
 */
import { test, expect, type Page } from '@playwright/test';

const AUTH_PAGES = [
  { name: 'login', url: '/pages/account/login.html' },
  { name: 'register', url: '/pages/account/register.html' },
  { name: 'forgot-password', url: '/pages/account/forgot-password.html' },
  { name: 'reset-password', url: '/pages/account/reset-password.html' },
];

const WCAG_AA_MIN_CONTRAST = 4.5;

/**
 * Parses a computed `rgb(r, g, b)` string into channel values.
 *
 * Throws on any alpha below 1 rather than dropping it: a contrast ratio
 * computed from a translucent colour is not the ratio the user sees, and
 * silently treating `rgba(0, 0, 0, 0)` as opaque black makes the guard below
 * report a comfortable ratio for text on a transparent card.
 */
function parseRgbChannels(rgbString: string): [number, number, number] {
  const matches = rgbString.match(/\d+(?:\.\d+)?/g);
  if (!matches || matches.length < 3) {
    throw new Error(`Cannot parse computed color as rgb(): ${rgbString}`);
  }
  if (matches.length > 3 && Number(matches[3]) < 1) {
    throw new Error(
      `Refusing to compute contrast against a translucent colour: ${rgbString}. ` +
        'The rendered ratio depends on what shows through, which this helper cannot see.',
    );
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

/**
 * Asserts MASTER rule 9's card surface and primary ink as the page renders them.
 *
 * `.card` and `h1.card-title` each occur exactly once per auth page. `.card`
 * paints `background: var(--color-card)`; `.card-title` sits inside it via
 * `.card-header` (which sets no background) and resolves its own `color`
 * through `var(--color-ink)`, so the pair is the real rendered ink-on-card
 * combination rather than two values read off `:root`.
 *
 * Contrast is asserted before the two exact-value pins on purpose: a dropped
 * dark remap then reports the observed ratio, which is the reason this case
 * exists, instead of stopping at a mismatched channel triple.
 */
async function expectCardSurfaceAndInk(
  page: Page,
  theme: 'light' | 'dark',
  expectedCardBackground: string,
  expectedInk: string,
): Promise<void> {
  const card = page.locator('.card');
  const inkCarrier = page.locator('.card h1.card-title');
  await expect(inkCarrier).toBeVisible();

  // The ratio below pairs the title's colour with `.card`'s background, which
  // is the colour the user sees only while nothing between them paints its
  // own. These two assertions cover the two painters that exist today — the
  // wrapper and the title itself. A background on either renders the title at
  // ~1.2:1 in one theme while `.card` still measures 14.6:1, so without them
  // every case passes. They do not generalise to a painter that does not exist
  // yet: a new wrapper inserted between `.card-header` and the title would
  // slip through, and closing that needs a walk up the ancestor chain rather
  // than a fixed pair of selectors.
  await expect(page.locator('.card .card-header')).toHaveCSS(
    'background-color',
    'rgba(0, 0, 0, 0)',
  );
  await expect(inkCarrier).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');

  const renderedCardBackground = await card.evaluate(
    (el) => window.getComputedStyle(el).backgroundColor,
  );
  const renderedInk = await inkCarrier.evaluate((el) => window.getComputedStyle(el).color);
  const ratio = contrastRatio(renderedInk, renderedCardBackground);
  expect(
    ratio,
    `${theme}: card-title ink ${renderedInk} on card ${renderedCardBackground} renders ${ratio.toFixed(2)}:1`,
  ).toBeGreaterThanOrEqual(WCAG_AA_MIN_CONTRAST);

  await expect(card).toHaveCSS('background-color', expectedCardBackground);
  await expect(inkCarrier).toHaveCSS('color', expectedInk);
}

for (const { name, url } of AUTH_PAGES) {
  test.describe(`${name} — rendered ground, card surface and ink`, () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(url);
    });

    test('rendered outcome: ground, card and readable ink hold in both themes', async ({
      page,
    }) => {
      await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(245, 243, 255)');
      await expectCardSurfaceAndInk(page, 'light', 'rgb(255, 255, 255)', 'rgb(30, 27, 75)');

      await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
      await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(11, 11, 18)');
      await expectCardSurfaceAndInk(page, 'dark', 'rgb(22, 22, 31)', 'rgb(226, 232, 240)');
    });
  });
}
