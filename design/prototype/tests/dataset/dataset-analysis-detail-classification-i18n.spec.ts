import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

const DETAIL_URL = '/pages/dataset/dataset-analysis-detail.html?task_id=T101';

async function gotoWithLang(page: Page, lang: 'zh' | 'en', tab: 'stats' | 'quality') {
  await page.addInitScript((storedLang: 'zh' | 'en') => {
    window.localStorage.setItem('labelsuite.lang', storedLang);
  }, lang);

  await page.goto(`${DETAIL_URL}&tab=${tab}`);
}

test.describe('Dataset analysis detail classification i18n', () => {
  test('renders classification stats labels in English mode without mixed Chinese labels', async ({ page }) => {
    await gotoWithLang(page, 'en', 'stats');

    const labelDistribution = page.locator('section[aria-labelledby="statsClsDistTitle"]');
    await expect(page.locator('#bcCurrent')).toHaveText('News Headline Multi-label Classification');
    await expect(labelDistribution.locator('.stats-hbar-label')).toHaveText([
      'Politics',
      'Technology',
      'Finance',
      'Sports',
      'Entertainment',
    ]);
    await expect(labelDistribution).not.toContainText(/[政治科技財經體育娛樂]/);
  });

  test('renders classification quality risk table in English mode', async ({ page }) => {
    await gotoWithLang(page, 'en', 'quality');

    const riskTable = page.locator('table[aria-label="Classification annotator risk assessment"]');
    await expect(riskTable.locator('thead th')).toHaveText([
      'Annotator',
      'Avg Speed',
      'Alpha',
      'Risk Level',
      'Cause',
      'Sample Count',
      'Recommended Action',
    ]);
    await expect(riskTable.locator('[data-risk-level]')).toHaveText([
      'Normal',
      'Insufficient Data',
      'Watch',
    ]);
    await expect(riskTable.locator('.cause-muted')).toHaveText([
      'No anomaly cause',
      '8 / 10, not evaluated yet',
    ]);
    await expect(riskTable.locator('.cause-chip')).toHaveText('Systematic bias');
    await expect(riskTable.locator('[data-role-action]')).toHaveText([
      'Review annotations',
      'Review annotations',
      'Review annotations',
    ]);
    await expect(page.locator('#clsGroupAvg')).toHaveText('Group avg — Alpha: 0.83 / Avg speed: 31.3s/sent');
    await expect(riskTable).not.toContainText(/[標記員平均速度風險等級異常原因樣本數建議行動審核資料不足觀察正常系統性偏差無異常原因]/);
  });
});
