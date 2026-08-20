/**
 * components-showcase.html — Components section, controls batch (issue #183)
 *
 * Validates the first batch of component cards: Buttons (all MASTER
 * variants + loading/disabled states), Inputs (default/error/readonly +
 * hint/error text), and Toggle Switch. Every asserted value is verbatim
 * from design/system/MASTER.md canonical CSS, so a drifting copy of the
 * canonical block fails here.
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

test.describe('Components showcase — controls batch', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(SHOWCASE_URL);
  });

  test('placeholder is replaced by component cards', async ({ page }) => {
    await expect(page.locator('#componentsPlaceholder')).toHaveCount(0, { timeout: 200 });
    expect(await page.locator('#components .component-card').count()).toBeGreaterThanOrEqual(3);
  });

  test('buttons card renders every MASTER variant', async ({ page }) => {
    const card = page.locator('#comp-buttons');
    for (const cls of ['btn-primary', 'btn-secondary', 'btn-danger', 'btn-ghost', 'btn-oauth', 'btn-icon', 'btn-language']) {
      await expect(card.locator(`.${cls}`).first()).toBeVisible();
    }
  });

  test('btn-primary uses CTA background and white text (MASTER verbatim)', async ({ page }) => {
    const btn = page.locator('#comp-buttons .btn-primary').first();
    const cta = await computedToken(page, '--color-cta');
    // canonical: background: var(--color-cta); color: white; font-weight: 600
    await expect(btn).toHaveCSS('color', 'rgb(255, 255, 255)');
    await expect(btn).toHaveCSS('font-weight', '600');
    const bg = await btn.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(bg.replace(/\s/g, '')).toBe(
      await page.evaluate((v) => {
        const probe = document.createElement('div');
        probe.style.color = v;
        document.body.appendChild(probe);
        const out = getComputedStyle(probe).color;
        probe.remove();
        return out;
      }, cta).then((s) => s.replace(/\s/g, '')),
    );
  });

  test('loading and disabled states carry MASTER opacities', async ({ page }) => {
    // .btn-loading { opacity: 0.7 } / button[disabled] { opacity: 0.4 }
    await expect(page.locator('#comp-buttons .btn-loading').first()).toHaveCSS('opacity', '0.7');
    await expect(page.locator('#comp-buttons button[disabled]').first()).toHaveCSS('opacity', '0.4');
    await expect(page.locator('#comp-buttons button[disabled]').first()).toHaveCSS('cursor', 'not-allowed');
  });

  test('btn-icon is the canonical 36px square', async ({ page }) => {
    const btn = page.locator('#comp-buttons .btn-icon').first();
    await expect(btn).toHaveCSS('width', '36px');
    await expect(btn).toHaveCSS('height', '36px');
  });

  test('input error and readonly states match MASTER', async ({ page }) => {
    // .input.error { border-color: #B91C1C }
    await expect(page.locator('#comp-inputs .input.error').first()).toHaveCSS(
      'border-color', 'rgb(185, 28, 28)',
    );
    // .input[readonly] { background: #F8FAFC; cursor: not-allowed }
    const readonly = page.locator('#comp-inputs .input[readonly]').first();
    await expect(readonly).toHaveCSS('background-color', 'rgb(248, 250, 252)');
    await expect(readonly).toHaveCSS('cursor', 'not-allowed');
  });

  test('focused input takes the primary border (MASTER focus state)', async ({ page }) => {
    const input = page.locator('#comp-inputs .input:not(.error):not([readonly])').first();
    await input.click();
    const primary = await computedToken(page, '--color-primary');
    const normalized = await page.evaluate((v) => {
      const probe = document.createElement('div');
      probe.style.color = v;
      document.body.appendChild(probe);
      const out = getComputedStyle(probe).color;
      probe.remove();
      return out;
    }, primary);
    // border-color transitions 200ms — poll past the interpolation
    await expect
      .poll(() => input.evaluate((el) => getComputedStyle(el).borderColor))
      .toBe(normalized);
  });

  test('field error text uses role=alert (MASTER inline-error pattern)', async ({ page }) => {
    const err = page.locator('#comp-inputs .field-error').first();
    await expect(err).toBeVisible();
    await expect(err).toHaveAttribute('role', 'alert');
    await expect(page.locator('#comp-inputs .field-hint').first()).toBeVisible();
  });

  test('toggle switch flips track color between border and primary tokens', async ({ page }) => {
    const toggle = page.locator('#comp-toggle .toggle-switch').first();
    const slider = toggle.locator('.toggle-slider');
    const toRgb = (v: string) =>
      page.evaluate((val) => {
        const probe = document.createElement('div');
        probe.style.color = val;
        document.body.appendChild(probe);
        const out = getComputedStyle(probe).color;
        probe.remove();
        return out;
      }, v);
    expect(await slider.evaluate((el) => getComputedStyle(el).backgroundColor))
      .toBe(await toRgb(await computedToken(page, '--color-border')));
    await toggle.click();
    await expect(toggle.locator('input')).toBeChecked();
    // track background transitions var(--dur-fast) — poll past the interpolation
    await expect
      .poll(() => slider.evaluate((el) => getComputedStyle(el).backgroundColor))
      .toBe(await toRgb(await computedToken(page, '--color-primary')));
  });

  test('toggle switch keeps the MASTER accessible-label contract', async ({ page }) => {
    const toggle = page.locator('#comp-toggle .toggle-switch').first();
    await expect(toggle).toHaveAttribute('aria-label', /.+/);
  });
});
