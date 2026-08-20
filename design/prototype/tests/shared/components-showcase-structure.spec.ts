/**
 * components-showcase.html — Components section, structure batch (issue #183)
 *
 * Validates the third batch of component cards: Chip (interactive select
 * chips in checkbox/radio mode + the four read-only display chip families),
 * Pagination, and Breadcrumb. Asserted values come verbatim from
 * design/system/MASTER.md §Chip, §Pagination and §Breadcrumb.
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

test.describe('Components showcase — structure batch', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(SHOWCASE_URL);
  });

  test('structure cards are present', async ({ page }) => {
    for (const id of ['#comp-chips', '#comp-pagination', '#comp-breadcrumb']) {
      await expect(page.locator(id)).toBeVisible();
    }
  });

  test('select chip carries the MASTER pill chrome', async ({ page }) => {
    const chip = page.locator('#comp-chips .task-type-chip[role="checkbox"][aria-checked="false"]').first();
    await expect(chip).toBeVisible();
    // .task-type-chip { border: 1.5px solid var(--color-border); border-radius: var(--radius-full);
    //   font-size: 13px; font-weight: 500 } — border width is asserted via color only because
    //   Chromium floors the 1.5px used value to 1px in getComputedStyle.
    await expect(chip).toHaveCSS('border-radius', '9999px');
    await expect(chip).toHaveCSS('font-size', '13px');
    await expect(chip).toHaveCSS('font-weight', '500');
    expect(await chip.evaluate((el) => getComputedStyle(el).borderColor))
      .toBe(await toRgb(page, await computedToken(page, '--color-border')));
  });

  test('checkbox chip toggles into the selected primary family', async ({ page }) => {
    // Anchor by accessible name — an [aria-checked] locator would re-resolve after the click.
    const chip = page.locator('#comp-chips .task-type-chip[role="checkbox"]', { hasText: '實體辨識' });
    await expect(chip).toHaveAttribute('aria-checked', 'false');
    await chip.click();
    await expect(chip).toHaveAttribute('aria-checked', 'true');
    await expect(chip).toHaveCSS('font-weight', '600');
    // border/background transition var(--dur-fast) — poll past the interpolation
    await expect
      .poll(() => chip.evaluate((el) => getComputedStyle(el).borderColor))
      .toBe(await toRgb(page, await computedToken(page, '--color-primary')));
    expect(await chip.evaluate((el) => getComputedStyle(el).backgroundColor))
      .toBe(await toRgb(page, await computedToken(page, '--color-primary-soft-bg')));
  });

  test('radio chips are single-select with a round indicator', async ({ page }) => {
    const radios = page.locator('#comp-chips .task-type-chip[role="radio"]');
    expect(await radios.count()).toBeGreaterThanOrEqual(2);
    // .task-type-chip[role="radio"] .task-type-chip-check { border-radius: 50% }
    const check = radios.first().locator('.task-type-chip-check');
    await expect(check).toHaveCSS('border-radius', '50%');
    await expect(check).toHaveCSS('width', '14px');
    await radios.nth(1).click();
    await expect(radios.nth(1)).toHaveAttribute('aria-checked', 'true');
    await radios.first().click();
    await expect(radios.first()).toHaveAttribute('aria-checked', 'true');
    await expect(radios.nth(1)).toHaveAttribute('aria-checked', 'false');
  });

  test('display chip families render, cause chip in the primary family', async ({ page }) => {
    const card = page.locator('#comp-chips');
    for (const cls of ['ar-classif-chip', 'ar-va-chip-normal', 'ar-va-chip-outlier', 'round-metric-chip', 'cause-chip']) {
      await expect(card.locator(`.${cls}`).first()).toBeVisible();
    }
    const cause = card.locator('.cause-chip').first();
    await expect(cause).toHaveCSS('border-radius', '9999px');
    expect(await cause.evaluate((el) => getComputedStyle(el).backgroundColor))
      .toBe(await toRgb(page, await computedToken(page, '--color-primary-soft-bg')));
  });

  test('pagination nav carries the MASTER chrome and 32px page buttons', async ({ page }) => {
    const nav = page.locator('#comp-pagination nav.pagination');
    await expect(nav).toHaveAttribute('aria-label', 'Pagination');
    await expect(nav).toHaveCSS('font-size', '13px');
    const btn = nav.locator('.page-btn:not(.active):not([disabled])').first();
    await expect(btn).toHaveCSS('width', '32px');
    await expect(btn).toHaveCSS('height', '32px');
    await expect(btn).toHaveCSS('border-radius', '8px');
  });

  test('pagination active, disabled, ellipsis and page-size states match MASTER', async ({ page }) => {
    const nav = page.locator('#comp-pagination nav.pagination');
    const active = nav.locator('.page-btn.active');
    await expect(active).toHaveAttribute('aria-current', 'page');
    await expect(active).toHaveCSS('font-weight', '600');
    expect(await active.evaluate((el) => getComputedStyle(el).backgroundColor))
      .toBe(await toRgb(page, await computedToken(page, '--color-primary')));
    expect(await active.evaluate((el) => getComputedStyle(el).color))
      .toBe(await toRgb(page, await computedToken(page, '--color-white')));
    const prev = nav.locator('.page-btn[disabled]').first();
    await expect(prev).toHaveCSS('opacity', '0.4');
    await expect(prev).toHaveCSS('cursor', 'not-allowed');
    await expect(nav.locator('.page-ellipsis')).toBeVisible();
    await expect(nav.locator('.page-size-select')).toBeVisible();
  });

  test('breadcrumb keeps the MASTER path chrome and accessibility contract', async ({ page }) => {
    const nav = page.locator('#comp-breadcrumb nav.breadcrumb');
    await expect(nav).toHaveAttribute('aria-label', 'breadcrumb');
    await expect(nav).toHaveCSS('font-size', '13px');
    expect(await nav.locator('a').first().evaluate((el) => getComputedStyle(el).color))
      .toBe(await toRgb(page, await computedToken(page, '--color-primary')));
    const sep = nav.locator('.breadcrumb-sep').first();
    await expect(sep).toHaveAttribute('aria-hidden', 'true');
    await expect(sep).toHaveCSS('font-size', '11px');
    expect(await sep.evaluate((el) => getComputedStyle(el).color))
      .toBe(await toRgb(page, await computedToken(page, '--color-ink-muted')));
    await expect(nav.locator('[aria-current="page"]')).toBeVisible();
  });
});
