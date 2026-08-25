/**
 * components-showcase.html — Components section, composite batch (issue #183)
 *
 * Validates the fourth batch of component cards: Color Dot (entity dot +
 * preview + status-dot variants), Divider (hr / text / list — token-rendered,
 * MASTER §Divider ships no canonical CSS block), Accordion (verbatim
 * .output-accordion family + ARIA/toggle contract), Progress Bar and
 * Metric KPI Tile. Asserted values come verbatim from design/system/MASTER.md
 * §Color Dot, §Divider, §Accordion, §Progress Bar and §Metric KPI Tile.
 *
 * This file verifies a design-system contract rather than a feature-spec FR
 * (spec 008 Prototype Traceability lists the showcase as reference-only).
 * Traceability: design/system/MASTER.md
 *   §Color Dot, §Divider, §Accordion, §Progress Bar, §Metric KPI Tile
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

test.describe('Components showcase — composite batch', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(SHOWCASE_URL);
  });

  test('composite cards are present', async ({ page }) => {
    for (const id of ['#comp-colordot', '#comp-divider', '#comp-accordion', '#comp-progress', '#comp-metric']) {
      await expect(page.locator(id)).toBeVisible();
    }
  });

  test('color dot variants match MASTER sizes and the 8-color palette renders', async ({ page }) => {
    const card = page.locator('#comp-colordot');
    // .entity-color-dot { width/height 20px; border-radius: var(--radius-sm) = 4px }
    const entity = card.locator('.entity-color-dot').first();
    await expect(entity).toHaveCSS('width', '20px');
    await expect(entity).toHaveCSS('height', '20px');
    await expect(entity).toHaveCSS('border-radius', '4px');
    // Default palette has 8 entries, applied via inline style.background.
    expect(await card.locator('.entity-color-dot').count()).toBe(8);
    // .annotation-preview-color { 12px; border-radius: 3px }
    const preview = card.locator('.annotation-preview-color').first();
    await expect(preview).toHaveCSS('width', '12px');
    await expect(preview).toHaveCSS('height', '12px');
    await expect(preview).toHaveCSS('border-radius', '3px');
    // .t-dot status dot — 8px circle
    const tdot = card.locator('.t-dot').first();
    await expect(tdot).toHaveCSS('width', '8px');
    await expect(tdot).toHaveCSS('height', '8px');
    await expect(tdot).toHaveCSS('border-radius', '50%');
  });

  test('horizontal rule divider is a 1px --color-border line', async ({ page }) => {
    const hr = page.locator('#comp-divider hr.divider-hr').first();
    await expect(hr).toHaveCSS('height', '1px');
    expect(await hr.evaluate((el) => getComputedStyle(el).backgroundColor))
      .toBe(await toRgb(page, await computedToken(page, '--color-border')));
  });

  test('text and list divider variants render with muted label', async ({ page }) => {
    const card = page.locator('#comp-divider');
    const textDivider = card.locator('.divider-text');
    await expect(textDivider).toBeVisible();
    const label = textDivider.locator('span');
    await expect(label).toHaveCSS('font-size', '14px');
    expect(await label.evaluate((el) => getComputedStyle(el).color))
      .toBe(await toRgb(page, await computedToken(page, '--color-ink-muted')));
    const listItems = card.locator('.divider-list li');
    expect(await listItems.count()).toBeGreaterThanOrEqual(3);
    // divide-slate-100 (#F1F5F9) row border from MASTER §Divider variant 3
    expect(await listItems.nth(1).evaluate((el) => getComputedStyle(el).borderTopColor))
      .toBe(await toRgb(page, '#F1F5F9'));
  });

  test('accordion header carries MASTER chrome and ARIA pairing', async ({ page }) => {
    const card = page.locator('#comp-accordion');
    const header = card.locator('.output-accordion-header').first();
    // .output-accordion-header { background: var(--color-slate-50); font-size: 14px; font-weight: 600 }
    await expect(header).toHaveCSS('font-size', '14px');
    await expect(header).toHaveCSS('font-weight', '600');
    expect(await header.evaluate((el) => getComputedStyle(el).backgroundColor))
      .toBe(await toRgb(page, await computedToken(page, '--color-slate-50')));
    await expect(header).toHaveAttribute('role', 'button');
    await expect(header).toHaveAttribute('tabindex', '0');
    // aria-controls must point at an existing body with role="region"
    const controls = await header.getAttribute('aria-controls');
    expect(controls).toBeTruthy();
    const body = page.locator(`#${controls}`);
    await expect(body).toHaveAttribute('role', 'region');
  });

  test('accordion toggles collapsed state, aria-expanded and body visibility', async ({ page }) => {
    // Anchor by id — state-based locators would re-resolve after the click.
    const panel = page.locator('#showcase-accordion-1');
    const header = panel.locator('.output-accordion-header');
    const body = panel.locator('.output-accordion-body');
    await expect(header).toHaveAttribute('aria-expanded', 'true');
    await expect(body).toBeVisible();
    await header.click();
    await expect(panel).toHaveClass(/collapsed/);
    await expect(header).toHaveAttribute('aria-expanded', 'false');
    await expect(body).toBeHidden();
    await header.click();
    await expect(header).toHaveAttribute('aria-expanded', 'true');
    await expect(body).toBeVisible();
  });

  test('collapsed accordion rotates the chevron, expanded does not', async ({ page }) => {
    const expandedChevron = page.locator('#showcase-accordion-1 .output-accordion-chevron');
    const collapsedChevron = page.locator('#showcase-accordion-2 .output-accordion-chevron');
    // .collapsed .output-accordion-chevron { transform: rotate(-90deg) } — transition
    // var(--dur-fast) means post-load values are stable, but poll to be safe.
    await expect
      .poll(() => collapsedChevron.evaluate((el) => getComputedStyle(el).transform))
      .toMatch(/^matrix\(/);
    expect(await expandedChevron.evaluate((el) => getComputedStyle(el).transform)).toBe('none');
  });

  test('progress bar keeps the 6px pill track with a --color-cta fill', async ({ page }) => {
    const bar = page.locator('#comp-progress .progress').first();
    await expect(bar).toHaveCSS('height', '6px');
    await expect(bar).toHaveCSS('border-radius', '9999px');
    await expect(bar).toHaveAttribute('role', 'progressbar');
    await expect(bar).toHaveAttribute('aria-valuemin', '0');
    await expect(bar).toHaveAttribute('aria-valuemax', '100');
    expect(await bar.getAttribute('aria-valuenow')).toBeTruthy();
    expect(await bar.locator('span').evaluate((el) => getComputedStyle(el).backgroundColor))
      .toBe(await toRgb(page, await computedToken(page, '--color-cta')));
  });

  test('metric KPI tile matches the dense dashboard spec', async ({ page }) => {
    const card = page.locator('#comp-metric');
    expect(await card.locator('.metric').count()).toBeGreaterThanOrEqual(3);
    const tile = card.locator('.metric').first();
    // .metric { border-radius: var(--radius-lg) = 12px; border: 1px solid var(--color-border) }
    await expect(tile).toHaveCSS('border-radius', '12px');
    expect(await tile.evaluate((el) => getComputedStyle(el).borderColor))
      .toBe(await toRgb(page, await computedToken(page, '--color-border')));
    const label = tile.locator('span').first();
    await expect(label).toHaveCSS('font-size', '11px');
    await expect(label).toHaveCSS('text-transform', 'uppercase');
    const value = tile.locator('strong').first();
    await expect(value).toHaveCSS('font-weight', '700');
  });
});
