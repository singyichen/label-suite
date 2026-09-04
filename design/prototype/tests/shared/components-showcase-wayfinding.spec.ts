/**
 * components-showcase.html — Components section, wayfinding batch (issue #456)
 *
 * Validates the reviewer wayfinding pair: the three-level Breadcrumb and the
 * new branching Review Status Track. Asserted values come verbatim from
 * design/system/MASTER.md §Breadcrumb and §Review Status Track.
 *
 * The track is deliberately NOT a linear Step Indicator: annotation-015 FR-051
 * determines REVIEW_UNIT_STATUS through two mutually exclusive lanes
 * (reviewer keeps the annotator's answer → finalized, reviewer differs →
 * disputed → finalized), so the same-answer lane never passes through
 * `disputed`. A linear track would render a transition the state machine does
 * not have. These tests pin that branch down.
 *
 * issue #596 (single-owner review relay) / issue #626: FR-093 gives each review
 * unit exactly ONE reviewer, so `已同意` and `已修改` — the two interim nodes
 * that only existed while a quorum of reviewers was still being collected — can
 * no longer occur, and with them the `min_reviewers >= 2` 9-column variant and
 * its `unconverged` rail caption. The track is now a single 7-column grid with
 * three nodes (待審 / 爭議中 / 已定稿); the lane a unit walked is named by the
 * `.review-track-branch[data-branch]` captions instead of by which interim node
 * it landed on. Shipped reference: annotation-workspace.html's
 * buildReviewStatusTrack(), pinned by
 * design/prototype/tests/annotation/annotation-review-status-track.spec.ts.
 *
 * This file verifies a design-system contract rather than a feature-spec FR
 * (spec 008 Prototype Traceability lists the showcase as reference-only).
 * Traceability: design/system/MASTER.md §Breadcrumb, §Review Status Track
 *   · specs/annotation/015-annotation-workspace/spec.md FR-051
 */
import { test, expect } from '@playwright/test';

const SHOWCASE_URL = '/components-showcase.html';
const CARD = '#comp-review-track';

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

test.describe('Components showcase — wayfinding batch', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(SHOWCASE_URL);
  });

  test('wayfinding card is present', async ({ page }) => {
    await expect(page.locator(CARD)).toBeVisible();
  });

  test('breadcrumb carries three semantic levels with hidden separators', async ({ page }) => {
    const nav = page.locator(`${CARD} nav.breadcrumb[aria-label="breadcrumb"]`);
    await expect(nav).toBeVisible();
    // Root → task → current review unit. MASTER §Breadcrumb allows the third
    // level only for the reviewer path (see the "Max depth" row).
    await expect(nav.locator('a')).toHaveCount(2);
    await expect(nav.locator('.breadcrumb-sep')).toHaveCount(2);
    for (const sep of await nav.locator('.breadcrumb-sep').all()) {
      await expect(sep).toHaveAttribute('aria-hidden', 'true');
      await expect(sep).toHaveText('›');
    }
    await expect(nav.locator('[aria-current="page"]')).toHaveCount(1);
  });

  test('both breadcrumb links sit in the tab order', async ({ page }) => {
    const links = page.locator(`${CARD} nav.breadcrumb a`);
    await links.first().focus();
    await expect(links.first()).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(links.nth(1)).toBeFocused();
  });

  test('track exposes list semantics with three status nodes', async ({ page }) => {
    const track = page.locator(`${CARD} .review-track[role="list"]`);
    await expect(track).toHaveAttribute('aria-label', /審核單位狀態/);
    await expect(track.locator('[role="listitem"]')).toHaveCount(3);
    await expect(track.locator('[role="listitem"]')).toHaveText([
      /待審/,
      /爭議中/,
      /已定稿/,
    ]);
  });

  test('the retired quorum interim nodes are gone from the showcase', async ({ page }) => {
    // FR-093: one reviewer per unit, so `已同意` / `已修改` (answered but below
    // quorum) are unreachable, and so is the `unconverged` rail caption that
    // sat between `已修改` and `爭議中`. The `min_reviewers >= 2` demo card and
    // the `.review-track-single` variant class went with them.
    const track = page.locator(`${CARD} .review-track`);
    await expect(track).not.toHaveClass(/review-track-single/);
    await expect(track).not.toContainText('已同意');
    await expect(track).not.toContainText('已修改');
    await expect(track.locator('[data-branch="unconverged"]')).toHaveCount(0);
    await expect(page.locator('#comp-review-track-single')).toHaveCount(0);
  });

  test('the two lanes are drawn on separate rows, not as one line', async ({ page }) => {
    // FR-051 branches after `pending`: the same-answer lane runs straight to
    // `已定稿` on row 1 while the differing lane drops to `爭議中` on row 2, so
    // the middle node must not share a row with the two that span both rows.
    const rows = await page.locator(`${CARD} .review-track [role="listitem"]`).evaluateAll(
      (els) => els.map((el) => Math.round(el.getBoundingClientRect().top)),
    );
    expect(rows[1]).not.toBe(rows[0]);
    expect(rows[1]).not.toBe(rows[2]);
    expect(rows[0]).toBe(rows[2]);
    // With the interim nodes gone the captions are the only thing naming which
    // lane the unit walked, so they must survive and stay distinguishable.
    await expect(page.locator(`${CARD} .review-track-branch[data-branch="differing"]`))
      .toHaveClass(/\bdone\b/);
    await expect(page.locator(`${CARD} .review-track-branch[data-branch="same"]`))
      .not.toHaveClass(/\bdone\b/);
    // The fork connectors are decoration only.
    for (const fork of await page.locator(`${CARD} .review-track-fork`).all()) {
      await expect(fork).toHaveAttribute('aria-hidden', 'true');
    }
    await expect(page.locator(`${CARD} .review-track-fork`)).toHaveCount(2);
  });

  test('current position is marked by text, not colour alone (AC-7)', async ({ page }) => {
    const current = page.locator(`${CARD} .review-track [aria-current="step"]`);
    await expect(current).toHaveCount(1);
    await expect(current.locator('.review-track-marker')).toHaveText('目前：');
  });

  test('node states are token-rendered', async ({ page }) => {
    const border = async (sel: string) =>
      page.locator(sel).first().evaluate((el) => getComputedStyle(el).borderColor);

    expect(await border(`${CARD} .review-track-node.current`))
      .toBe(await toRgb(page, await computedToken(page, '--color-primary')));
    expect(await border(`${CARD} .review-track-node.done`))
      .toBe(await toRgb(page, await computedToken(page, '--color-cta')));
    expect(await border(`${CARD} .review-track-node:not(.done):not(.current)`))
      .toBe(await toRgb(page, await computedToken(page, '--color-border')));
  });

  test('nodes carry the MASTER pill chrome', async ({ page }) => {
    const node = page.locator(`${CARD} .review-track-node`).first();
    await expect(node).toHaveCSS('border-radius', '9999px');
    await expect(node).toHaveCSS('font-size', '13px');
  });
});
