import { test, expect } from '@playwright/test';

const TASK_DETAIL_WORK_LOG_URL = '/pages/task-management/task-detail.html?task_id=T001&tab=work-log';

/*
 * TDD Red update (issue #1101, tasks.md 2.2). The two independent
 * `#workLogDateFrom`/`#workLogDateTo` inputs and their placeholder spans are
 * replaced by a single `#workLogDateRangeTrigger` control (design.md D4).
 * Its unselected-state text is NOT page-chosen copy -- it is the literal
 * `STRINGS.zh.placeholder` / `STRINGS.en.placeholder` read from the shared
 * `design/prototype/pages/shared/date-range-picker.js` contract, selected
 * via `handle.setLang(state.lang)` on the existing `applyLang()` flow -- so
 * asserting on this exact text is grounded in real component behavior, not
 * a guess at Green's copy.
 */
test.describe('Task detail work log i18n', () => {
  test('translates the date-range control to English mode', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('labelsuite.lang', 'en');
    });

    await page.goto(TASK_DETAIL_WORK_LOG_URL);

    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.locator('#workLogDateFrom')).toHaveCount(0);
    await expect(page.locator('#workLogDateTo')).toHaveCount(0);
    await expect(page.locator('#workLogDateRangeTrigger .date-range-trigger-text')).toHaveText('Select date range');
  });

  test('keeps the date-range control localized in Chinese mode', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('labelsuite.lang', 'zh');
    });

    await page.goto(TASK_DETAIL_WORK_LOG_URL);

    await expect(page.locator('html')).toHaveAttribute('lang', 'zh-TW');
    await expect(page.locator('#workLogDateFrom')).toHaveCount(0);
    await expect(page.locator('#workLogDateTo')).toHaveCount(0);
    await expect(page.locator('#workLogDateRangeTrigger .date-range-trigger-text')).toHaveText('選擇日期區間');
  });
});
