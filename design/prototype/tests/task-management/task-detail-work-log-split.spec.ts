import { test, expect } from '@playwright/test';

/* Spec 014 v2.5.0 (issue #149 P5) — work-log completed-count split into
   annotate / review / arbitrate columns with per-role summary cards.

   Out of scope (needs backend): real work-log aggregation, auth-scoped
   reviewer data. Prototype validates seed-driven rendering, per-role dash
   display, summary math, and bilingual vocabulary only. */

const WORK_LOG_URL = '/pages/task-management/task-detail.html?task_id=T001&tab=work-log';
const PANEL_LOAD_TIMEOUT = 15000;

/* Column order: date | member | role | login/logout | online | duration
   | annotated | reviewed | arbitrated | speed | stage */
const COL_ANNOTATED = 6;
const COL_REVIEWED = 7;
const COL_ARBITRATED = 8;

test.describe('Task detail work log completed-count split', () => {
  test('splits completed count into annotate/review/arbitrate columns with dashes for inapplicable roles', async ({ page }) => {
    await page.goto(WORK_LOG_URL);
    await expect(page.locator('#workLogTableSection')).toBeVisible({ timeout: PANEL_LOAD_TIMEOUT });

    await expect(page.locator('#thWorkLogAnnotated')).toHaveText('標記筆數');
    await expect(page.locator('#thWorkLogReviewed')).toHaveText('審核筆數');
    await expect(page.locator('#thWorkLogArbitrated')).toHaveText('仲裁筆數');
    await expect(page.locator('#workLogTableSection thead')).not.toContainText('完成筆數');

    const annotatorRow = page.locator('#workLogTableBody tr').first();
    await expect(annotatorRow).toContainText('Alex Wang');
    await expect(annotatorRow.locator('td').nth(COL_ANNOTATED)).toHaveText('72');
    await expect(annotatorRow.locator('td').nth(COL_REVIEWED)).toHaveText('—');
    await expect(annotatorRow.locator('td').nth(COL_ARBITRATED)).toHaveText('—');

    const reviewerRow = page.locator('#workLogTableBody tr').filter({ hasText: 'Mandy Chen' });
    await expect(reviewerRow.locator('td').nth(COL_ANNOTATED)).toHaveText('—');
    await expect(reviewerRow.locator('td').nth(COL_REVIEWED)).toHaveText('7');
    await expect(reviewerRow.locator('td').nth(COL_ARBITRATED)).toHaveText('2');
  });

  test('renders four summary cards with per-role totals, weighted speed, and avg time per item', async ({ page }) => {
    await page.goto(WORK_LOG_URL);
    await expect(page.locator('#workLogTableSection')).toBeVisible({ timeout: PANEL_LOAD_TIMEOUT });

    await expect(page.locator('#workLogSummaryHoursLabel')).toHaveText('總工時');
    await expect(page.locator('#workLogSummaryAnnotatedLabel')).toHaveText('總標記筆數');
    await expect(page.locator('#workLogSummaryReviewedLabel')).toHaveText('總審核筆數');
    await expect(page.locator('#workLogSummarySpeedLabel')).toHaveText('加權平均速度');
    await expect(page.locator('#workLogSummaryCompletedLabel')).toHaveCount(0);

    // Seeds: annotated 270, reviewed 7, arbitrated 2, hours 19.8 → 19h48m,
    // weighted speed (270+7+2)/19.8 = 14.1, avg 1188min/279 items = 4.3.
    await expect(page.locator('#workLogSummaryHoursValue')).toHaveText('19 小時 48 分');
    await expect(page.locator('#workLogSummaryAnnotatedValue')).toHaveText('270');
    await expect(page.locator('#workLogSummaryReviewedValue')).toHaveText('7');
    await expect(page.locator('#workLogSummarySpeedValue')).toContainText('14.1');
    await expect(page.locator('#workLogSummaryAvgPerItemValue')).toContainText('每筆平均耗時');
    await expect(page.locator('#workLogSummaryAvgPerItemValue')).toContainText('4.3');
  });

  test('recomputes split summaries when the stage filter changes', async ({ page }) => {
    await page.goto(WORK_LOG_URL);
    await expect(page.locator('#workLogTableSection')).toBeVisible({ timeout: PANEL_LOAD_TIMEOUT });

    await page.locator('#workLogStageSelect').selectOption('official');

    // Official seeds: annotated 18+44=62, reviewed 7, arbitrated 2, hours 7.8 → 7h48m.
    await expect(page.locator('#workLogSummaryHoursValue')).toHaveText('7 小時 48 分');
    await expect(page.locator('#workLogSummaryAnnotatedValue')).toHaveText('62');
    await expect(page.locator('#workLogSummaryReviewedValue')).toHaveText('7');
  });

  test('translates split columns and summary cards in English mode', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('labelsuite.lang', 'en');
    });
    await page.goto(WORK_LOG_URL);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en', { timeout: PANEL_LOAD_TIMEOUT });
    await expect(page.locator('#workLogTableSection')).toBeVisible({ timeout: PANEL_LOAD_TIMEOUT });

    await expect(page.locator('#thWorkLogAnnotated')).toHaveText('Annotated');
    await expect(page.locator('#thWorkLogReviewed')).toHaveText('Reviewed');
    await expect(page.locator('#thWorkLogArbitrated')).toHaveText('Arbitrated');
    await expect(page.locator('#workLogSummaryAnnotatedLabel')).toHaveText('Total annotated');
    await expect(page.locator('#workLogSummaryReviewedLabel')).toHaveText('Total reviewed');
    await expect(page.locator('#workLogSummaryAvgPerItemValue')).toContainText('per item');

    const reviewerRow = page.locator('#workLogTableBody tr').filter({ hasText: 'Mandy Chen' });
    await expect(reviewerRow.locator('td').nth(COL_ANNOTATED)).toHaveText('—');
  });
});
