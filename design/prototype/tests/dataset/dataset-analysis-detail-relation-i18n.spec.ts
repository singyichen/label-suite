import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

const DETAIL_URL = '/pages/dataset/dataset-analysis-detail.html?task_id=T004&tab=stats';

async function gotoWithLang(page: Page, lang: 'zh' | 'en') {
  await page.addInitScript((storedLang: 'zh' | 'en') => {
    window.localStorage.setItem('labelsuite.lang', storedLang);
  }, lang);

  await page.goto(DETAIL_URL);
}

test.describe('Dataset analysis detail relation stats i18n', () => {
  test('renders relation statistics overview labels in English mode without mixed Chinese labels', async ({ page }) => {
    await gotoWithLang(page, 'en');

    const relationDistribution = page.locator('section[aria-labelledby="statsRelRelDistTitle"]');
    const tripleSummary = page.locator('section[aria-labelledby="statsRelTripleTitle"]');

    await expect(page.locator('#bcCurrent')).toHaveText('Medical Relation Extraction (Entity / Triple)');
    // FR-009K: relation_identification must not duplicate entity-type distribution
    // (that belongs to entity_recognition's own stats block).
    await expect(page.locator('section[aria-labelledby="statsRelEntityDistTitle"]')).toHaveCount(0);

    await expect(relationDistribution.locator('.panel-title')).toHaveText('Relation Type Distribution');
    await expect(relationDistribution.locator('.panel-subtitle')).toHaveText('Triple annotation count per relation type');
    await expect(relationDistribution.locator('.stats-hbar-label')).toHaveText([
      'treats',
      'causes',
      'inhibits',
      'binds',
      'regulates',
    ]);
    await expect(relationDistribution).not.toContainText(/[治療導致抑制結合調控]/);

    await expect(tripleSummary.locator('.panel-title')).toHaveText('Triple Count Summary');
    await expect(tripleSummary.locator('.stats-metric-label').first()).toHaveText('Total triples');
    await expect(tripleSummary).not.toContainText(/[總數唯一平均標記員單句最多]/);
  });
});
