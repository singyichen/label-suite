import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { test, expect } from '../fixtures';
import type { Page } from '@playwright/test';

// Issue #1451 — the IAA score card state class (card-pass / card-warn / card-fail) must be
// derived by JS from the same computed result as the card value, never hardcoded in a
// quality-*.html partial; the header badge must agree with the card. Ruling (#1109 comment):
// "not computable" (De = 0, FR-039 point 4) is NOT counted in x but IS counted in y, and the
// badge stays advisory (FR-039 point 1, AC-3.16).

const DETAIL_URL = '/pages/dataset/dataset-analysis-detail.html';
const PARTIALS_DIR = resolve(__dirname, '../../pages/dataset/dataset-analysis-detail.partials');

async function gotoQuality(page: Page, taskId: string) {
  await page.addInitScript(() => {
    window.localStorage.setItem('labelsuite.lang', 'zh');
  });
  await page.goto(`${DETAIL_URL}?task_id=${taskId}&tab=quality`);
  await expect(page.locator('#qualityPanelMount .iaa-score-card').first()).toBeVisible();
}

function qualityPartials(): string[] {
  return readdirSync(PARTIALS_DIR).filter((f) => /^quality-.*\.html$/.test(f));
}

test.describe('Issue #1451: IAA card state is derived, not hardcoded', () => {
  test('T014 (computed alpha below threshold): card is card-fail, not card-pass, value agrees', async ({ page }) => {
    await gotoQuality(page, 'T014');
    const card = page.locator('#qualityPanelMount section[aria-labelledby="iaaTitle"] .iaa-score-card');
    await expect(card.locator('.iaa-card-value')).toHaveClass(/\bfail\b/);
    await expect(card).toHaveClass(/\bcard-fail\b/);
    await expect(card).not.toHaveClass(/\bcard-pass\b/);
  });

  for (const taskId of ['T001', 'T011']) {
    test(`${taskId} (single_label, not computable): card reuses card-warn and badge reads 0/1 (advisory, non-blocking)`, async ({ page }) => {
      await gotoQuality(page, taskId);
      const card = page.locator('#qualityPanelMount section[aria-labelledby="iaaTitle"] .iaa-score-card');
      await expect(card.locator('.iaa-card-value')).toHaveText('無法計算');
      await expect(card).toHaveClass(/\bcard-warn\b/);
      await expect(card).not.toHaveClass(/\bcard-pass\b/);

      // Ruling: De = 0 is excluded from x, included in y -> 0/1, consistent with the card.
      const badge = page.locator('#iaaSummaryBadge');
      await expect(badge).toHaveText('0/1 達標');
      await expect(badge).toHaveClass(/\bbadge-fail\b/);
      await expect(badge).not.toHaveClass(/\bbadge-pass\b/);
    });
  }

  test('T105 (single_label, not computable, seeded via static meta pass:true): badge agrees with card', async ({ page }) => {
    await gotoQuality(page, 'T105');
    const card = page.locator('#qualityPanelMount section[aria-labelledby="iaaTitle"] .iaa-score-card');
    await expect(card.locator('.iaa-card-value')).toHaveText('無法計算');
    await expect(card).toHaveClass(/\bcard-warn\b/);
    await expect(page.locator('#iaaSummaryBadge')).toHaveText('0/1 達標');
  });

  test('T107 secondary single_label card (not computable) is card-warn, not card-pass', async ({ page }) => {
    await gotoQuality(page, 'T107');
    const card = page.locator('section[data-output-type="single_label"] .iaa-score-card');
    await expect(card.locator('.iaa-card-value')).toHaveText('無法計算');
    await expect(card).toHaveClass(/\bcard-warn\b/);
    await expect(card).not.toHaveClass(/\bcard-pass\b/);
  });

  // No seeded single_label task is computable AND >= threshold (T014 is the only computable
  // one, alpha 0.59). The card-pass + x-count path therefore cannot be asserted in the prototype
  // fixtures; the card-fail test above plus the non-single_label mirror test below cover state
  // derivation, and the pass branch is covered by the mirror test on T013/T007 pass cards.

  test('source guard: no quality-*.html partial hardcodes a card state class', () => {
    const offenders: string[] = [];
    for (const file of qualityPartials()) {
      const src = readFileSync(resolve(PARTIALS_DIR, file), 'utf8');
      for (const cls of ['card-pass', 'card-warn', 'card-fail']) {
        if (src.includes(cls)) offenders.push(`${file}: ${cls}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  test('regression guard: every quality partial declares #iaaTitle as h2.panel-title', () => {
    for (const file of qualityPartials()) {
      const src = readFileSync(resolve(PARTIALS_DIR, file), 'utf8');
      expect(src, file).toMatch(/<h2\b[^>]*class="[^"]*\bpanel-title\b[^"]*"[^>]*\bid="iaaTitle"|<h2\b[^>]*\bid="iaaTitle"[^>]*class="[^"]*\bpanel-title\b/);
    }
  });

  test('regression guard: T013 rendered #iaaTitle is h2.panel-title', async ({ page }) => {
    await gotoQuality(page, 'T013');
    const tag = await page.locator('#iaaTitle').evaluate((el) => el.tagName.toLowerCase());
    expect(tag).toBe('h2');
    await expect(page.locator('#iaaTitle')).toHaveClass(/\bpanel-title\b/);
  });

  for (const taskId of ['T013', 'T007']) {
    test(`${taskId}: every rendered card's state class mirrors its value class (applied by JS)`, async ({ page }) => {
      await gotoQuality(page, taskId);
      const cards = page.locator('#qualityPanelMount .iaa-score-card');
      const count = await cards.count();
      expect(count).toBeGreaterThan(0);
      for (let i = 0; i < count; i += 1) {
        const card = cards.nth(i);
        const valueClass = (await card.locator('.iaa-card-value').getAttribute('class')) ?? '';
        const state = (valueClass.match(/\b(pass|warn|fail)\b/) ?? [])[1];
        expect(state, `card ${i} value class "${valueClass}"`).toBeTruthy();
        await expect(card).toHaveClass(new RegExp(`\\bcard-${state}\\b`));
      }
    });
  }
});
