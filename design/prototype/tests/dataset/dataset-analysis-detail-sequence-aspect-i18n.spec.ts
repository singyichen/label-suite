import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

const DETAIL_URL = '/pages/dataset/dataset-analysis-detail.html?task_id=T003';

async function gotoWithLang(page: Page, lang: 'zh' | 'en', tab: 'stats' | 'quality') {
  await page.addInitScript((storedLang: 'zh' | 'en') => {
    window.localStorage.setItem('labelsuite.lang', storedLang);
  }, lang);

  await page.goto(`${DETAIL_URL}&tab=${tab}`);
}

test.describe('Dataset analysis detail sequence_aspect i18n', () => {
  test('renders sequence_aspect stats panel in zh', async ({ page }) => {
    await gotoWithLang(page, 'zh', 'stats');

    await expect(page.locator('#statsAspKPITitle')).toHaveText('Aspect 分析摘要');
    await expect(page.locator('#statsAspLblSentCount')).toHaveText('句子數量');
    await expect(page.locator('#statsAspCoverageTitle')).toHaveText('Aspect Coverage 分析');
    await expect(page.locator('#statsAspCoverageDesc')).toHaveText('各 Aspect taxonomy 的樣本覆蓋率；低於目標分佈最小樣本數時標示偏斜警告');
  });

  test('renders sequence_aspect quality panel in en', async ({ page }) => {
    await gotoWithLang(page, 'en', 'quality');

    await expect(page.locator('#iaaAspMethodSuffix')).toHaveText('— Primary metric group');
    await expect(page.locator('#lblAspExactCalc')).toHaveText('Exact match on boundary + label');
    await expect(page.locator('#boundaryErrTitle')).toHaveText('Boundary Error Analysis');
    await expect(page.locator('#highDisagreeTitle')).toHaveText('High-disagreement Sample Analysis');
    await expect(page.locator('#aspRiskGroupAvg')).toHaveText('Group avg — Aspect F1 (exact): 0.68 / Avg speed: 45.3s/sent');
    await expect(page.locator('#consistencyNote')).toHaveText('For aspect labeling, aligned spans with matching aspect taxonomy form the comparison pool. Boundary high_divergence samples remain separate sample-level flags.');
  });
});
