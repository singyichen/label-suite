/**
 * components-showcase.html — Components section, final batch (issue #183)
 *
 * Validates the last batch of component cards: State Panel (success/error
 * variants) and Avatar (display-only + uploadable). Asserted values come
 * from design/system/MASTER.md §State Panel and §Avatar; both sections ship
 * Tailwind-only samples, so assertions target the token-rendered mapping
 * (state token families per tokens.css, radius per the shipped account
 * state panels).
 */
import { test, expect } from '@playwright/test';

const SHOWCASE_URL = '/components-showcase.html';

/** Live token value straight from the cascade. */
async function computedToken(page: import('@playwright/test').Page, token: string): Promise<string> {
  return page.evaluate(
    (t) => getComputedStyle(document.documentElement).getPropertyValue(t).trim(),
    token,
  );
}

/** Normalize any CSS color to the browser's rgb()/rgba() form. */
async function toRgb(page: import('@playwright/test').Page, value: string): Promise<string> {
  return page.evaluate((v) => {
    const probe = document.createElement('div');
    probe.style.color = v;
    document.body.appendChild(probe);
    const out = getComputedStyle(probe).color;
    probe.remove();
    return out;
  }, value);
}

test.describe('Components showcase — final batch', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(SHOWCASE_URL);
  });

  test('final cards are present', async ({ page }) => {
    for (const id of ['#comp-statepanel', '#comp-avatar']) {
      await expect(page.locator(id)).toBeVisible();
    }
  });

  test('success state panel carries the success token family', async ({ page }) => {
    const panel = page.locator('#comp-statepanel .state-panel--success');
    await expect(panel).toBeVisible();
    // bg-green-50 / border-green-200 → --color-success-bg / --color-success-border;
    // rounded-md → var(--radius-md) per the shipped account state panels; p-5 text-center.
    expect(await panel.evaluate((el) => getComputedStyle(el).backgroundColor))
      .toBe(await toRgb(page, await computedToken(page, '--color-success-bg')));
    expect(await panel.evaluate((el) => getComputedStyle(el).borderColor))
      .toBe(await toRgb(page, await computedToken(page, '--color-success-border')));
    await expect(panel).toHaveCSS('border-radius', '8px');
    await expect(panel).toHaveCSS('text-align', 'center');
  });

  test('state panel icon circle is 40px round with the state text color', async ({ page }) => {
    const icon = page.locator('#comp-statepanel .state-panel--success .state-panel-icon');
    // w-10 h-10 rounded-full, mx-auto mb-3; text-green-700 → --color-success
    await expect(icon).toHaveCSS('width', '40px');
    await expect(icon).toHaveCSS('height', '40px');
    await expect(icon).toHaveCSS('border-radius', '9999px');
    expect(await icon.evaluate((el) => getComputedStyle(el).color))
      .toBe(await toRgb(page, await computedToken(page, '--color-success')));
  });

  test('error state panel is an alert in the error token family', async ({ page }) => {
    const panel = page.locator('#comp-statepanel .state-panel--error');
    await expect(panel).toHaveAttribute('role', 'alert');
    expect(await panel.evaluate((el) => getComputedStyle(el).backgroundColor))
      .toBe(await toRgb(page, await computedToken(page, '--color-error-bg')));
    expect(await panel.evaluate((el) => getComputedStyle(el).borderColor))
      .toBe(await toRgb(page, await computedToken(page, '--color-error-border')));
    // desc text-red-700 → --color-error
    expect(await panel.locator('.state-panel-desc').evaluate((el) => getComputedStyle(el).color))
      .toBe(await toRgb(page, await computedToken(page, '--color-error')));
  });

  test('state panel action link is a primary text link', async ({ page }) => {
    const action = page.locator('#comp-statepanel .state-panel--success .state-panel-action');
    // mt-4 text-sm font-medium text-primary hover:underline
    await expect(action).toHaveCSS('font-size', '14px');
    await expect(action).toHaveCSS('font-weight', '500');
    expect(await action.evaluate((el) => getComputedStyle(el).color))
      .toBe(await toRgb(page, await computedToken(page, '--color-primary')));
  });

  test('display-only avatar keeps the 32px navbar chrome', async ({ page }) => {
    const avatar = page.locator('#comp-avatar .avatar-sm');
    // w-8 h-8 rounded-full border-2 border-primary/20
    await expect(avatar).toHaveCSS('width', '32px');
    await expect(avatar).toHaveCSS('height', '32px');
    await expect(avatar).toHaveCSS('border-radius', '9999px');
    expect(await avatar.evaluate((el) => getComputedStyle(el).borderColor))
      .toBe('rgba(99, 102, 241, 0.2)'); // border-primary/20 — MASTER §Avatar literal
  });

  test('uploadable avatar carries the upload contract and hover overlay', async ({ page }) => {
    const wrap = page.locator('#comp-avatar .avatar-wrap');
    await expect(wrap).toHaveAttribute('role', 'button');
    await expect(wrap).toHaveAttribute('tabindex', '0');
    await expect(wrap).toHaveAttribute('aria-label', 'Upload avatar');
    await expect(wrap).toHaveAttribute('aria-describedby', 'avatar-error');
    const preview = wrap.locator('#avatar-preview');
    // md:w-20 md:h-20 rounded-full bg-primary — initials fallback on primary
    await expect(preview).toHaveCSS('width', '80px');
    await expect(preview).toHaveCSS('height', '80px');
    await expect(preview).toHaveCSS('border-radius', '9999px');
    expect(await preview.evaluate((el) => getComputedStyle(el).backgroundColor))
      .toBe(await toRgb(page, await computedToken(page, '--color-primary')));
    const overlay = wrap.locator('.avatar-overlay');
    await expect(overlay).toHaveCSS('opacity', '0');
    await wrap.hover();
    // .avatar-wrap:hover .avatar-overlay { opacity: 1 } — poll past the 200ms transition
    await expect.poll(() => overlay.evaluate((el) => getComputedStyle(el).opacity)).toBe('1');
    await expect(wrap.locator('input[type="file"]')).toHaveAttribute(
      'accept',
      'image/jpeg,image/png,image/webp',
    );
  });
});
