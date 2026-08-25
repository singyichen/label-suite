/**
 * components-showcase.html — Components section, feedback batch (issue #183)
 *
 * Validates the second batch of component cards: Status Badges (bordered
 * task-status family + role badge pill), Status Pill (borderless soft),
 * Error / Alert Banner, Toast (live UXC-07 behavior via trigger buttons),
 * and Skeleton (pulse + shimmer). Asserted values come verbatim from
 * design/system/MASTER.md §Semantic State Colors, §Status Badges,
 * §Status Pill, §Error / Alert Banner, §Toast and §Skeleton.
 *
 * This file verifies a design-system contract rather than a feature-spec FR
 * (spec 008 Prototype Traceability lists the showcase as reference-only).
 * Traceability: design/system/MASTER.md
 *   §Semantic State Colors, §Status Badges, §Status Pill,
 *   §Error / Alert Banner, §Toast, §Skeleton
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

test.describe('Components showcase — feedback batch', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(SHOWCASE_URL);
  });

  test('feedback cards are present', async ({ page }) => {
    for (const id of ['#comp-badges', '#comp-banner', '#comp-toast', '#comp-skeleton']) {
      await expect(page.locator(id)).toBeVisible();
    }
  });

  test('base badge carries the MASTER chrome and every status variant renders', async ({ page }) => {
    const card = page.locator('#comp-badges');
    for (const cls of ['badge-draft', 'badge-dry-run-status', 'badge-iaa', 'badge-in-progress', 'badge-completed', 'badge-error']) {
      await expect(card.locator(`.badge.${cls}`).first()).toBeVisible();
    }
    // .badge { border-radius: var(--radius-sm); font-size: 12px; font-weight: 500 }
    const base = card.locator('.badge').first();
    await expect(base).toHaveCSS('border-radius', '4px');
    await expect(base).toHaveCSS('font-size', '12px');
    await expect(base).toHaveCSS('font-weight', '500');
  });

  test('badge-completed resolves to the live success token family', async ({ page }) => {
    const badge = page.locator('#comp-badges .badge-completed').first();
    expect(await badge.evaluate((el) => getComputedStyle(el).color))
      .toBe(await toRgb(page, await computedToken(page, '--color-success')));
    expect(await badge.evaluate((el) => getComputedStyle(el).backgroundColor))
      .toBe(await toRgb(page, await computedToken(page, '--color-success-bg')));
    expect(await badge.evaluate((el) => getComputedStyle(el).borderColor))
      .toBe(await toRgb(page, await computedToken(page, '--color-success-border')));
  });

  test('role badge is a primary-family pill (MASTER role badge contract)', async ({ page }) => {
    const badge = page.locator('#comp-badges .badge-role').first();
    await expect(badge).toBeVisible();
    await expect(badge).toHaveCSS('border-radius', '9999px');
    expect(await badge.evaluate((el) => getComputedStyle(el).backgroundColor))
      .toBe(await toRgb(page, await computedToken(page, '--color-primary-soft-bg')));
  });

  test('status pill is borderless with soft token background (MASTER shipped CSS)', async ({ page }) => {
    const pill = page.locator('#comp-badges .status-badge.status-submitted').first();
    await expect(pill).toBeVisible();
    await expect(pill).toHaveCSS('border-radius', '9999px');
    await expect(pill).toHaveCSS('font-weight', '700');
    expect(await pill.evaluate((el) => getComputedStyle(el).backgroundColor))
      .toBe(await toRgb(page, await computedToken(page, '--color-success-soft-bg')));
    expect(await pill.evaluate((el) => getComputedStyle(el).borderStyle)).toBe('none');
  });

  test('alert banner uses role=alert and the error token family', async ({ page }) => {
    const banner = page.locator('#comp-banner .alert-banner').first();
    await expect(banner).toBeVisible();
    await expect(banner).toHaveAttribute('role', 'alert');
    expect(await banner.evaluate((el) => getComputedStyle(el).backgroundColor))
      .toBe(await toRgb(page, await computedToken(page, '--color-error-bg')));
    expect(await banner.evaluate((el) => getComputedStyle(el).borderColor))
      .toBe(await toRgb(page, await computedToken(page, '--color-error-border')));
    expect(await banner.evaluate((el) => getComputedStyle(el).color))
      .toBe(await toRgb(page, await computedToken(page, '--color-error')));
  });

  test('success toast floats top-center at z-400 and auto-dismisses at 3000ms', async ({ page }) => {
    await page.locator('#comp-toast [data-toast-variant="success"]').click();
    const toast = page.locator('#toast');
    await expect(toast).toBeVisible();
    await expect(toast).toHaveCSS('position', 'fixed');
    await expect(toast).toHaveCSS('z-index', '400');
    await expect(toast).toHaveAttribute('aria-live', 'polite');
    // UXC-07: success auto-dismisses after 3000ms (+150ms fade)
    await expect(toast).toBeHidden({ timeout: 4500 });
  });

  test('error toast never auto-dismisses and closes manually (UXC-07)', async ({ page }) => {
    await page.locator('#comp-toast [data-toast-variant="error"]').click();
    const toast = page.locator('#toast');
    await expect(toast).toBeVisible();
    // outlives the success duration — still visible well past 3000ms
    await page.waitForTimeout(3500);
    await expect(toast).toBeVisible();
    await toast.locator('[aria-label]').click();
    await expect(toast).toBeHidden();
  });

  test('a new toast replaces the current one (single instance, UXC-07)', async ({ page }) => {
    await page.locator('#comp-toast [data-toast-variant="success"]').click();
    await page.locator('#comp-toast [data-toast-variant="warning"]').click();
    const cards = page.locator('#toast .toast-card');
    await expect(cards).toHaveCount(1);
    expect(await cards.first().evaluate((el) => getComputedStyle(el).backgroundColor))
      .toBe(await toRgb(page, await computedToken(page, '--color-warning-bg')));
  });

  test('skeleton pulse lines use the border token and the canonical keyframes', async ({ page }) => {
    const line = page.locator('#comp-skeleton .skeleton-line').first();
    await expect(line).toBeVisible();
    expect(await line.evaluate((el) => getComputedStyle(el).backgroundColor))
      .toBe(await toRgb(page, await computedToken(page, '--color-border')));
    expect(await line.evaluate((el) => getComputedStyle(el).animationName)).toBe('skeleton-pulse');
    await expect(page.locator('#comp-skeleton .skeleton-stack').first())
      .toHaveAttribute('aria-busy', 'true');
  });

  test('skeleton shimmer avatar is the 72px circle with the 1.5s sweep', async ({ page }) => {
    const avatar = page.locator('#comp-skeleton .skeleton.skel-avatar').first();
    await expect(avatar).toBeVisible();
    await expect(avatar).toHaveCSS('width', '72px');
    await expect(avatar).toHaveCSS('height', '72px');
    await expect(avatar).toHaveCSS('border-radius', '9999px');
    expect(await avatar.evaluate((el) => getComputedStyle(el).animationName)).toBe('skeleton-shimmer');
    expect(await avatar.evaluate((el) => getComputedStyle(el).animationDuration)).toBe('1.5s');
  });
});
