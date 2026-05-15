import { test, expect } from '@playwright/test';

const TASK_DETAIL_WORK_LOG_URL = '/pages/task-management/task-detail.html?task_id=T001&tab=work-log';

test.describe('Task detail work log i18n', () => {
  test('translates date filter placeholders in English mode', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('labelsuite.lang', 'en');
    });

    await page.goto(TASK_DETAIL_WORK_LOG_URL);

    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.locator('#workLogDateFromLabel')).toHaveText('Date from');
    await expect(page.locator('#workLogDateToLabel')).toHaveText('Date to');
    await expect(page.locator('#workLogDateFrom')).toHaveAttribute('type', 'date');
    await expect(page.locator('#workLogDateTo')).toHaveAttribute('type', 'date');
    await expect(page.locator('#workLogDateFromPlaceholder')).toHaveText('YYYY-MM-DD');
    await expect(page.locator('#workLogDateToPlaceholder')).toHaveText('YYYY-MM-DD');
  });

  test('keeps localized date filter placeholders in Chinese mode', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('labelsuite.lang', 'zh');
    });

    await page.goto(TASK_DETAIL_WORK_LOG_URL);

    await expect(page.locator('html')).toHaveAttribute('lang', 'zh-TW');
    await expect(page.locator('#workLogDateFromLabel')).toHaveText('起始日期');
    await expect(page.locator('#workLogDateToLabel')).toHaveText('結束日期');
    await expect(page.locator('#workLogDateFrom')).toHaveAttribute('type', 'date');
    await expect(page.locator('#workLogDateTo')).toHaveAttribute('type', 'date');
    await expect(page.locator('#workLogDateFromPlaceholder')).toHaveText('年 / 月 / 日');
    await expect(page.locator('#workLogDateToPlaceholder')).toHaveText('年 / 月 / 日');
  });
});
