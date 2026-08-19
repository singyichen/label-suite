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
    await gotoStatsWithLang(page, 'T102', 'en');

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
    await gotoStatsWithLang(page, 'T106', 'en');

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

  test('renders single_label statistics overview labels in English mode without mixed Chinese labels', async ({ page }) => {
    await gotoStatsWithLang(page, 'T105', 'en');

    const distribution = page.locator('section[aria-labelledby="statsSingleLabelDistTitle"]');

    await expect(page.locator('#bcCurrent')).toHaveText('Customer Service Sentiment Single-label Classification');
    await expect(distribution.locator('.panel-title')).toHaveText('Label Distribution');
    await expect(distribution.locator('.stats-hbar-label')).toHaveText([
      'Positive',
      'Neutral',
      'Negative',
      'Mixed',
    ]);
    await expect(distribution).not.toContainText(/[正向中立負向混合]/);
  });
});
