/**
 * components-showcase.html — living styleguide (issue #183)
 *
 * Validates the token sections enumerate CSS variables from the real
 * assets/tokens.css at runtime (getComputedStyle), so tokens.css edits
 * reflect on reload with zero sync cost, and that section order matches
 * the frozen design-system.pen layout:
 *   Palette → State Colors → Typography → Spacing → Radius → Z-index → Components
 */
import { test, expect } from '@playwright/test';

const SHOWCASE_URL = '/components-showcase.html';

/** Live token value straight from the cascade — the value the page must display. */
async function computedToken(page: import('@playwright/test').Page, token: string): Promise<string> {
  return page.evaluate(
    (t) => getComputedStyle(document.documentElement).getPropertyValue(t).trim(),
    token,
  );
}

test.describe('Components showcase — shell & token sections', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(SHOWCASE_URL);
  });

  test('links the real assets/tokens.css (single source of truth)', async ({ page }) => {
    await expect(page.locator('link[href="assets/tokens.css"]')).toHaveCount(1);
  });

  test('sections appear in the design-system.pen order', async ({ page }) => {
    const ids = await page.locator('main > section').evaluateAll((els) => els.map((e) => e.id));
    expect(ids).toEqual([
      'palette',
      'state-colors',
      'typography',
      'spacing',
      'radius',
      'z-index',
      'components',
    ]);
  });

  test('palette enumerates color tokens at runtime', async ({ page }) => {
    const rows = page.locator('#palette .token-row');
    expect(await rows.count()).toBeGreaterThan(10);
    const primary = page.locator('#palette .token-row', { hasText: '--color-primary' }).first();
    await expect(primary.locator('.token-value')).toHaveText(await computedToken(page, '--color-primary'));
  });

  test('state colors split out of the palette', async ({ page }) => {
    const success = page.locator('#state-colors .token-row', { hasText: '--color-success' }).first();
    await expect(success.locator('.token-value')).toHaveText(await computedToken(page, '--color-success'));
    // state tokens must not double-render in the palette section
    await expect(page.locator('#palette .token-row', { hasText: '--color-success' })).toHaveCount(0, { timeout: 200 });
  });

  test('typography lists font stacks with live values', async ({ page }) => {
    const sans = page.locator('#typography .token-row', { hasText: '--font-sans' }).first();
    await expect(sans.locator('.token-value')).toHaveText(await computedToken(page, '--font-sans'));
  });

  test('spacing lists --space-* with live values', async ({ page }) => {
    const md = page.locator('#spacing .token-row', { hasText: '--space-md' }).first();
    await expect(md.locator('.token-value')).toHaveText(await computedToken(page, '--space-md'));
  });

  test('radius lists --radius-* with live values', async ({ page }) => {
    const md = page.locator('#radius .token-row', { hasText: '--radius-md' }).first();
    await expect(md.locator('.token-value')).toHaveText(await computedToken(page, '--radius-md'));
  });

  test('z-index lists --z-* with live values', async ({ page }) => {
    const toast = page.locator('#z-index .token-row', { hasText: '--z-toast' }).first();
    await expect(toast.locator('.token-value')).toHaveText(await computedToken(page, '--z-toast'));
  });

  test('every rendered token value matches the live cascade', async ({ page }) => {
    const mismatches = await page.evaluate(() => {
      const bad: string[] = [];
      const style = getComputedStyle(document.documentElement);
      document.querySelectorAll('.token-row').forEach((row) => {
        const name = row.querySelector('.token-name')?.textContent?.trim() ?? '';
        const shown = row.querySelector('.token-value')?.textContent?.trim() ?? '';
        if (name && style.getPropertyValue(name).trim() !== shown) bad.push(name);
      });
      return bad;
    });
    expect(mismatches).toEqual([]);
  });

  test('theme toggle flips dark tokens', async ({ page }) => {
    const lightSurface = await computedToken(page, '--color-surface');
    await page.locator('#themeToggle').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    expect(await computedToken(page, '--color-surface')).not.toBe(lightSurface);
    await page.locator('#themeToggle').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  });
});
