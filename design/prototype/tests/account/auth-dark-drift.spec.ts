/**
 * Auth pages — dark-mode & flat-design drift fixes (issue #183)
 *
 * Covers the P1 audit findings on the four standalone auth pages:
 *   - hover box-shadow enhancements violate the MASTER Flat Design rule
 *   - reset-password logo SVGs hardcode fill="#6366F1" so they alone
 *     ignore the dark primary remap (#818CF8)
 *   - token-error / success panel icons hardcode stroke + circle hexes
 *     (#B91C1C / #15803D / #FEE2E2 / #D1FAE5) that go near-invisible on
 *     their dark panel grounds; canonical tokens flip automatically
 */
import { test, expect } from '@playwright/test';

const AUTH_PAGES = [
  { name: 'login', url: '/pages/account/login.html' },
  { name: 'register', url: '/pages/account/register.html' },
  { name: 'forgot-password', url: '/pages/account/forgot-password.html' },
  { name: 'reset-password', url: '/pages/account/reset-password.html' },
];

async function darkMode(page: import('@playwright/test').Page) {
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
}

for (const { name, url } of AUTH_PAGES) {
  test(`${name} — no :hover rule adds a box-shadow (Flat Design)`, async ({ page }) => {
    await page.goto(url);
    const offenders = await page.evaluate(() => {
      const out: string[] = [];
      const walk = (rules: CSSRuleList) => {
        for (const rule of Array.from(rules)) {
          const styleRule = rule as CSSStyleRule;
          if (styleRule.selectorText?.includes(':hover') && styleRule.style?.boxShadow) {
            out.push(styleRule.selectorText);
          }
          if ((rule as CSSGroupingRule).cssRules) walk((rule as CSSGroupingRule).cssRules);
        }
      };
      for (const sheet of Array.from(document.styleSheets)) {
        try { walk(sheet.cssRules); } catch { /* cross-origin sheet */ }
      }
      return out;
    });
    expect(offenders).toEqual([]);
  });
}

test.describe('reset-password — logo SVGs follow the primary token', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/pages/account/reset-password.html');
  });

  test('navbar and card logo rects remap to dark primary', async ({ page }) => {
    await darkMode(page);
    await expect(page.locator('.navbar-logo rect')).toHaveCSS('fill', 'rgb(129, 140, 248)');
    await expect(page.locator('.card-logo rect')).toHaveCSS('fill', 'rgb(129, 140, 248)');
  });
});

test.describe('reset-password — token-error panel icon uses error tokens', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/pages/account/reset-password.html');
  });

  test('icon circle uses --color-error-border in both themes', async ({ page }) => {
    const icon = page.locator('.token-error-icon');
    await expect(icon).toHaveCSS('background-color', 'rgb(254, 202, 202)');
    await darkMode(page);
    await expect(icon).toHaveCSS('background-color', 'rgb(91, 34, 34)');
  });

  test('icon stroke follows --color-error in dark', async ({ page }) => {
    await darkMode(page);
    await expect(page.locator('.token-error-icon svg')).toHaveCSS('stroke', 'rgb(248, 113, 113)');
  });
});

for (const { name, url } of AUTH_PAGES.filter((p) => p.name !== 'login' && p.name !== 'register')) {
  test.describe(`${name} — success panel icon uses success tokens`, () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(url);
    });

    test('icon circle uses --color-success-border in both themes', async ({ page }) => {
      const icon = page.locator('.success-panel-icon');
      await expect(icon).toHaveCSS('background-color', 'rgb(187, 247, 208)');
      await darkMode(page);
      await expect(icon).toHaveCSS('background-color', 'rgb(31, 81, 50)');
    });

    test('check stroke follows --color-success in dark', async ({ page }) => {
      await darkMode(page);
      await expect(page.locator('.success-panel-icon svg')).toHaveCSS('stroke', 'rgb(74, 222, 128)');
    });
  });
}
