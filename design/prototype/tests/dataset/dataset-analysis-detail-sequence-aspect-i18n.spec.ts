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

    await expect(page.locator('#bcCurrent')).toHaveText('產品評論序列標註（NER / Aspect）');
    await expect(page.locator('#pageTitle')).toHaveText('任務詳情');
    await expect(page.locator('#pageSubtitle')).toHaveText('檢視統計總覽與品質監控');
    await expect(page.locator('section[aria-labelledby="statsSharedTitle"] .stats-metric-card')).toHaveCount(5);
    await expect(page.locator('#statsLblSentence')).toHaveText('句子數量');
    await expect(page.locator('#statsDescSentence')).toHaveText('分析母體');
    await expect(page.locator('#statsLblToken')).toHaveText('Token 數量');
    await expect(page.locator('#statsDescToken')).toHaveText('空格分詞');
    await expect(page.locator('#statsLblCompletion')).toHaveText('完成率');
    await expect(page.locator('#statsDescCompletion')).toHaveText('1,092 / 1,248 已完成');
    await expect(page.locator('#statsLblSubmitted')).toHaveText('已提交樣本');
    await expect(page.locator('#statsDescSubmitted')).toHaveText('至少 1 位已提交');
    await expect(page.locator('#statsLblAvgTime')).toHaveText('平均標記時間');
    await expect(page.locator('#statsDescAvgTime')).toHaveText('每句平均用時');
    await expect(page.locator('#statsAspDistTitle')).toHaveText('Aspect 類型分佈');
    await expect(page.locator('#statsAspCoverageTitle')).toHaveText('Aspect Coverage 分析');
    await expect(page.locator('#statsAspCoverageDesc')).toHaveText('各 Aspect taxonomy 的樣本覆蓋率；低於目標分佈最小樣本數時標示偏斜警告');
  });

  test('renders sequence_aspect stats panel in en', async ({ page }) => {
    await gotoWithLang(page, 'en', 'stats');

    const aspectDistribution = page.locator('section[aria-labelledby="statsAspDistTitle"]');

    await expect(page.locator('#bcCurrent')).toHaveText('Product Review Sequence Labeling (NER / Aspect)');
    await expect(page.locator('#pageTitle')).toHaveText('Task detail');
    await expect(page.locator('#pageSubtitle')).toHaveText('Review statistics and quality monitoring');
    await expect(page.locator('#statsAspDistTitle')).toHaveText('Aspect Type Distribution');
    await expect(aspectDistribution.locator('.stats-hbar-label')).toHaveText([
      'Product Quality',
      'Value for Money',
      'Appearance Design',
      'Customer Service',
      'Packaging Quality',
      'Functionality',
    ]);
    await expect(aspectDistribution).not.toContainText(/[產品品質性價比外觀設計客戶服務包裝功能性]/);
    await expect(page.locator('svg[data-i18n-aria-label="sequenceAspectStats.spanLenAria"]')).toHaveAttribute(
      'aria-label',
      'Aspect span length histogram'
    );
    await expect(page.locator('table[data-i18n-aria-label="sequenceAspectStats.cooccAria"]')).toHaveAttribute(
      'aria-label',
      'Aspect co-occurrence matrix'
    );
    await expect(page.locator('#statsAspCoverageTitle')).toHaveText('Aspect Coverage Analysis');
    await expect(page.locator('#statsAspCoverageDesc')).toHaveText('Sample coverage of each aspect taxonomy; show a skew warning when the count falls below the target minimum');
  });

  test('renders sequence_aspect quality panel in en', async ({ page }) => {
    await gotoWithLang(page, 'en', 'quality');

    await expect(page.locator('#bcCurrent')).toHaveText('Product Review Sequence Labeling (NER / Aspect)');
    await expect(page.locator('#pageTitle')).toHaveText('Task detail');
    await expect(page.locator('#pageSubtitle')).toHaveText('Review statistics and quality monitoring');
    await expect(page.locator('#iaaAspMethodSuffix')).toHaveText('— Primary metric group');
    await expect(page.locator('#lblAspExactCalc')).toHaveText('Exact match on boundary + label');
    await expect(page.locator('#boundaryErrTitle')).toHaveText('Boundary Error Analysis');
    await expect(page.locator('#highDisagreeTitle')).toHaveText('High-disagreement Sample Analysis');
    await expect(page.locator('#aspRiskGroupAvg')).toHaveText('Group avg — Aspect F1 (exact): 0.68 / Avg speed: 45.3s/sent');
    await expect(page.locator('#consistencyNote')).toHaveText('For aspect labeling, aligned spans with matching aspect taxonomy form the comparison pool. Boundary high_divergence samples remain separate sample-level flags.');
  });
});
