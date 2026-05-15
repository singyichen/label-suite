import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

const DETAIL_URL = '/pages/dataset/dataset-analysis-detail.html';

async function gotoStatsWithLang(page: Page, taskId: string, lang: 'zh' | 'en') {
  await page.addInitScript((storedLang: 'zh' | 'en') => {
    window.localStorage.setItem('labelsuite.lang', storedLang);
  }, lang);

  await page.goto(`${DETAIL_URL}?task_id=${taskId}&tab=stats`);
}

test.describe('Dataset analysis detail stats i18n across task types', () => {
  test('renders VA statistics overview in English mode', async ({ page }) => {
    await gotoStatsWithLang(page, 'T002', 'en');

    const histogram = page.locator('section[aria-labelledby="statsVAHistTitle"]');

    await expect(page.locator('#bcCurrent')).toHaveText('Sentiment VA Dual-axis Scoring');
    await expect(histogram.locator('.panel-title')).toHaveText('Valence / Arousal Distribution');
    await expect(page.locator('#statsVALblValence')).toHaveText('Valence (V)');
    await expect(page.locator('#statsVALblArousal')).toHaveText('Arousal (A)');
    await expect(page.locator('svg[data-i18n-aria-label="statsVAValenceAria"]')).toHaveAttribute(
      'aria-label',
      'Valence histogram'
    );
    await expect(page.locator('svg[data-i18n-aria-label="statsVAArousalAria"]')).toHaveAttribute(
      'aria-label',
      'Arousal histogram'
    );
    await expect(page.locator('svg[data-i18n-aria-label="statsVAScatterAria"]')).toHaveAttribute(
      'aria-label',
      'V-A 2D scatter plot'
    );
    await expect(histogram).not.toContainText(/[分佈直方圖標記員評分量表]/);
  });

  test('renders sequence statistics overview labels in English mode without mixed Chinese labels', async ({ page }) => {
    await gotoStatsWithLang(page, 'T006', 'en');

    const entityDistribution = page.locator('section[aria-labelledby="statsSeqEntityDistTitle"]');

    await expect(page.locator('#bcCurrent')).toHaveText('NER Named Entity Recognition');
    await expect(entityDistribution.locator('.panel-title')).toHaveText('Entity Type Distribution');
    await expect(entityDistribution.locator('.stats-hbar-label')).toHaveText([
      'PER',
      'ORG',
      'LOC',
      'MISC',
    ]);
    await expect(entityDistribution).not.toContainText(/[人名組織地點其他]/);
    await expect(page.locator('svg[data-i18n-aria-label="statsSeqSpanLenAria"]')).toHaveAttribute(
      'aria-label',
      'Entity span length histogram'
    );
  });

  test('renders sentence-pair statistics overview labels in English mode without mixed Chinese labels', async ({ page }) => {
    await gotoStatsWithLang(page, 'T005', 'en');

    const distribution = page.locator('section[aria-labelledby="statsSpDistTitle"]');

    await expect(page.locator('#bcCurrent')).toHaveText('Sentence Pair Similarity / Entailment');
    await expect(distribution.locator('.sp-toggle')).toHaveAttribute('aria-label', 'Subtype toggle');
    await expect(distribution.locator('#spBtnCls')).toHaveText('Classification');
    await expect(distribution.locator('#spBtnScore')).toHaveText('Scoring');
    await expect(distribution.locator('.stats-hbar-label')).toHaveText([
      'Similar',
      'Dissimilar',
      'Entailment',
      'Contradiction',
    ]);
    await expect(distribution.locator('.stats-metric-card').nth(2).locator('.stats-metric-value')).toHaveText('Similar');
    await expect(distribution).not.toContainText(/[相似不相似蘊含矛盾分類型評分型]/);
  });
});
