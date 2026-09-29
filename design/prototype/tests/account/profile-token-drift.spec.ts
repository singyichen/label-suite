/**
 * Profile — canonical design tokens as applied on /profile (issue #183). The
 * both-theme assertions exercise the `html[data-theme]` token application on
 * the page; the two deprecated-token absence pins (`--color-primary-light`
 * undefined, and unreferenced by any stylesheet rule) that used to live here
 * were removed by issue #1059 group 3, so nothing in this file asserts the
 * absence of a token any more.
 *
 * Traceability: specs/account/005-profile-settings/spec.md
 *   FR-013, SC-009
 */
import { test, expect, type Page } from '@playwright/test';

const PROFILE_URL = '/pages/account/profile.html';

// Reads a computed style off a selector via getComputedStyle so hidden
// elements (#ssoBanner, sent view) can be asserted too.
function cssOf(page: Page, selector: string, prop: string): Promise<string> {
  return page.evaluate(
    ([sel, p]) => {
      const el = document.querySelector(sel);
      if (!el) throw new Error(`missing element: ${sel}`);
      return getComputedStyle(el).getPropertyValue(p).trim();
    },
    [selector, prop] as const,
  );
}

function setDark(page: Page): Promise<void> {
  return page.evaluate(() => {
    document.documentElement.setAttribute('data-theme', 'dark');
  });
}

test.describe('Profile — canonical tokens as applied (issue #183)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PROFILE_URL);
  });

  test('layout-only :root keeps the navbar offsets tokens.css does not provide', async ({ page }) => {
    const value = await page.evaluate(() =>
      getComputedStyle(document.documentElement)
        .getPropertyValue('--navbar-mobile-height')
        .trim(),
    );
    expect(value).toBe('84px');
  });

  test('.field-label follows the sibling auth-page ink convention', async ({ page }) => {
    expect(await cssOf(page, '.field-label', 'color')).toBe('rgb(30, 27, 75)');
    await setDark(page);
    expect(await cssOf(page, '.field-label', 'color')).toBe('rgb(226, 232, 240)');
  });

  test('soft text resolves through --color-text-soft in both themes', async ({ page }) => {
    for (const selector of ['.section-desc', '.field-hint', '.avatar-hint', '.sent-desc', '.back-link']) {
      expect(await cssOf(page, selector, 'color'), `${selector} light`).toBe('rgb(100, 116, 139)');
    }
    await setDark(page);
    for (const selector of ['.section-desc', '.field-hint', '.avatar-hint', '.sent-desc', '.back-link']) {
      expect(await cssOf(page, selector, 'color'), `${selector} dark`).toBe('rgb(161, 161, 170)');
    }
  });

  test('.email-row ground uses --color-slate-50', async ({ page }) => {
    expect(await cssOf(page, '.email-row', 'background-color')).toBe('rgb(248, 250, 252)');
    await setDark(page);
    expect(await cssOf(page, '.email-row', 'background-color')).toBe('rgb(31, 31, 40)');
  });

  test('info banner uses the semantic info token family', async ({ page }) => {
    expect(await cssOf(page, '.info-banner', 'background-color')).toBe('rgb(239, 246, 255)');
    expect(await cssOf(page, '.info-banner', 'border-top-color')).toBe('rgb(191, 219, 254)');
    expect(await cssOf(page, '.info-banner', 'color')).toBe('rgb(29, 78, 216)');
    await setDark(page);
    expect(await cssOf(page, '.info-banner', 'background-color')).toBe('rgb(15, 31, 51)');
    expect(await cssOf(page, '.info-banner', 'border-top-color')).toBe('rgb(30, 58, 102)');
    expect(await cssOf(page, '.info-banner', 'color')).toBe('rgb(96, 165, 250)');
  });

  test('disabled primary button uses the MASTER opacity-40 state', async ({ page }) => {
    await page.evaluate(() => {
      const btn = document.querySelector<HTMLButtonElement>('#saveProfileBtn');
      if (!btn) throw new Error('missing #saveProfileBtn');
      btn.disabled = true;
    });
    // .btn-primary transitions opacity, so use the retrying assertion.
    await expect(page.locator('#saveProfileBtn')).toHaveCSS('opacity', '0.4');
  });
});
