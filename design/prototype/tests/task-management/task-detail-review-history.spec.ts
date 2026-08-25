/*
 * Traceability: specs/task-management/014-task-detail/spec.md
 *   FR-015a, FR-015a-1, FR-015d, FR-015d-4, SC-035
 */
import { test, expect } from '@playwright/test';

/* Spec 014 v2.5.0 (issue #149 P5) — annotation-results review history timeline
   + reviewer / review-status filters.

   Out of scope (needs backend): real review submission, auth-scoped reviewer
   identity, persisted filter state. Prototype validates seed-driven rendering,
   filter behavior, and bilingual vocabulary only. */

const TASK_DETAIL_URL = '/pages/task-management/task-detail.html';
const PANEL_LOAD_TIMEOUT = 15000;

/* AR_REVIEW_STATUS five-state vocabulary reused from spec 015 REVIEW_UNIT_STATUS. */
const REVIEW_STATUS_OPTION_VALUES = ['all', 'pending', 'approved', 'modified', 'disputed', 'finalized'];

test.describe('Task detail annotation results review history', () => {
  test('renders five-state review badges and a timeline line only for reviewed entries', async ({ page }) => {
    await page.goto(`${TASK_DETAIL_URL}?task_id=T001&tab=annotation-results`);
    await expect(page.locator('#arTableSection')).toBeVisible({ timeout: PANEL_LOAD_TIMEOUT });

    const firstRow = page.locator('#arResultTableBody tr.ar-summary-row').filter({ hasText: 'CLS-001' });
    await firstRow.click();

    const detailRows = page.locator('#arResultTableBody .annotator-row');
    await expect(detailRows).toHaveCount(3);
    await expect(detailRows.filter({ hasText: 'kioleemg12' }).locator('.ar-review-badge .badge')).toHaveText('已同意');
    await expect(detailRows.filter({ hasText: 'tony0950127' }).locator('.ar-review-badge .badge')).toHaveText('待審');

    // Only the reviewed (approved) entry carries a history line; pending entries show none.
    const historyLines = page.locator('#arResultTableBody .ar-history-line');
    await expect(historyLines).toHaveCount(1);
    await expect(historyLines.first()).toContainText('審核員');
    await expect(historyLines.first()).toContainText('wangxm88');
    await expect(historyLines.first()).toContainText('同意');
    await expect(historyLines.first()).toContainText('2026-04-25 15:02');
  });

  test('shows corrected result on modified review lines', async ({ page }) => {
    await page.goto(`${TASK_DETAIL_URL}?task_id=T001&tab=annotation-results`);
    await expect(page.locator('#arTableSection')).toBeVisible({ timeout: PANEL_LOAD_TIMEOUT });

    await page.locator('#arResultTableBody tr.ar-summary-row').filter({ hasText: 'CLS-002' }).click();

    const modifiedRow = page.locator('#arResultTableBody .annotator-row').filter({ hasText: '113450022' });
    await expect(modifiedRow.locator('.ar-review-badge .badge')).toHaveText('已修改');

    const reviewLine = page.locator('#arResultTableBody .ar-history-line.ar-history-review');
    await expect(reviewLine).toHaveCount(1);
    await expect(reviewLine).toContainText('dahua_lee');
    await expect(reviewLine).toContainText('修改');
    await expect(reviewLine).toContainText('娛樂');
  });

  test('renders arbitration line after reviewer line for finalized entries', async ({ page }) => {
    await page.goto(`${TASK_DETAIL_URL}?task_id=T001&tab=annotation-results`);
    await expect(page.locator('#arTableSection')).toBeVisible({ timeout: PANEL_LOAD_TIMEOUT });

    await page.locator('#arResultTableBody tr.ar-summary-row').filter({ hasText: 'CLS-004' }).click();

    const finalizedRow = page.locator('#arResultTableBody .annotator-row').filter({ hasText: '113450022' });
    await expect(finalizedRow.locator('.ar-review-badge .badge')).toHaveText('已定稿');

    const arbitrationLine = page.locator('#arResultTableBody .ar-history-line.ar-history-arbitration');
    await expect(arbitrationLine).toHaveCount(1);
    await expect(arbitrationLine).toContainText('仲裁');
    await expect(arbitrationLine).toContainText('meiling.c');
    await expect(arbitrationLine).toContainText('採 B');

    // The arbitration line follows a reviewer decision line for the same entry.
    await expect(page.locator('#arResultTableBody .ar-history-line.ar-history-review').filter({ hasText: 'dahua_lee' })).toHaveCount(1);
  });

  test('renders every review decision line for disputed entries', async ({ page }) => {
    await page.goto(`${TASK_DETAIL_URL}?task_id=T001&tab=annotation-results`);
    await expect(page.locator('#arTableSection')).toBeVisible({ timeout: PANEL_LOAD_TIMEOUT });

    await page.locator('#arResultTableBody tr.ar-summary-row').filter({ hasText: 'CLS-006' }).click();

    const disputedRow = page.locator('#arResultTableBody .annotator-row').filter({ hasText: '113450022' });
    await expect(disputedRow.locator('.ar-review-badge .badge')).toHaveText('爭議中');

    // The disputed entry keeps every decision line (approve + modify), per-annotator scoped.
    const disputedLines = page.locator('#arResultTableBody .ar-history-line.ar-history-review[data-annotator="113450022"]');
    await expect(disputedLines).toHaveCount(2);
    await expect(disputedLines.filter({ hasText: 'wangxm88' })).toHaveCount(1);
    await expect(disputedLines.filter({ hasText: 'dahua_lee' })).toHaveCount(1);
    await expect(page.locator('#arResultTableBody .ar-history-line.ar-history-arbitration')).toHaveCount(0);
  });

  test('filters samples by reviewer including arbitration participation', async ({ page }) => {
    await page.goto(`${TASK_DETAIL_URL}?task_id=T001&tab=annotation-results`);
    await expect(page.locator('#arTableSection')).toBeVisible({ timeout: PANEL_LOAD_TIMEOUT });

    const reviewerSelect = page.locator('#arReviewerSelect');
    await expect(page.locator('#arReviewerFilterLabel')).toHaveText('審核員');
    await expect(reviewerSelect.locator('option').first()).toHaveText('全部審核員');
    // Options are derived from seed reviews[] + arbitration arbiter (deduped).
    await expect(reviewerSelect.locator('option')).toHaveCount(4);

    await reviewerSelect.selectOption('meiling.c');
    const rows = page.locator('#arResultTableBody tr.ar-summary-row');
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText('CLS-004');
  });

  test('filters samples by five-state review status with constant-derived options', async ({ page }) => {
    await page.goto(`${TASK_DETAIL_URL}?task_id=T001&tab=annotation-results`);
    await expect(page.locator('#arTableSection')).toBeVisible({ timeout: PANEL_LOAD_TIMEOUT });

    const statusSelect = page.locator('#arReviewStatusSelect');
    await expect(page.locator('#arReviewStatusFilterLabel')).toHaveText('審核狀態');
    const optionValues = await statusSelect.locator('option').evaluateAll(
      (options) => options.map((option) => (option as HTMLOptionElement).value),
    );
    expect(optionValues).toEqual(REVIEW_STATUS_OPTION_VALUES);

    await statusSelect.selectOption('disputed');
    const rows = page.locator('#arResultTableBody tr.ar-summary-row');
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText('CLS-006');
  });

  test('combines reviewer and review-status filters with AND semantics', async ({ page }) => {
    await page.goto(`${TASK_DETAIL_URL}?task_id=T001&tab=annotation-results`);
    await expect(page.locator('#arTableSection')).toBeVisible({ timeout: PANEL_LOAD_TIMEOUT });

    await page.locator('#arReviewerSelect').selectOption('wangxm88');
    await expect(page.locator('#arResultTableBody tr.ar-summary-row')).not.toHaveCount(1);

    await page.locator('#arReviewStatusSelect').selectOption('finalized');
    const rows = page.locator('#arResultTableBody tr.ar-summary-row');
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText('CLS-004');
  });

  test('translates review history vocabulary in English mode', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('labelsuite.lang', 'en');
    });
    await page.goto(`${TASK_DETAIL_URL}?task_id=T001&tab=annotation-results`);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en', { timeout: PANEL_LOAD_TIMEOUT });
    await expect(page.locator('#arTableSection')).toBeVisible({ timeout: PANEL_LOAD_TIMEOUT });

    await expect(page.locator('#arReviewerFilterLabel')).toHaveText('Reviewer');
    await expect(page.locator('#arReviewStatusFilterLabel')).toHaveText('Review status');
    await expect(page.locator('#arReviewerSelect option').first()).toHaveText('All reviewers');
    await expect(page.locator('#arReviewStatusSelect option[value="finalized"]')).toHaveText('Finalized');

    await page.locator('#arResultTableBody tr.ar-summary-row').filter({ hasText: 'CLS-002' }).click();
    const modifiedRow = page.locator('#arResultTableBody .annotator-row').filter({ hasText: '113450022' });
    await expect(modifiedRow.locator('.ar-review-badge .badge')).toHaveText('Modified');
    const reviewLine = page.locator('#arResultTableBody .ar-history-line.ar-history-review');
    await expect(reviewLine).toContainText('Modified');
    await expect(reviewLine).toContainText('Entertainment');
    await expect(reviewLine).not.toContainText('娛樂');
  });

  test('drops the legacy three-state review vocabulary', async ({ page }) => {
    await page.goto(`${TASK_DETAIL_URL}?task_id=T001&tab=annotation-results`);
    await expect(page.locator('#arTableSection')).toBeVisible({ timeout: PANEL_LOAD_TIMEOUT });

    await page.locator('#arResultTableBody tr.ar-summary-row').filter({ hasText: 'CLS-001' }).click();

    const badges = page.locator('#arResultTableBody .ar-review-badge .badge');
    await expect(badges).toHaveCount(3);
    const badgeTexts = await badges.allTextContents();
    expect(badgeTexts).not.toContain('通過');
    expect(badgeTexts).not.toContain('退回');
    expect(badgeTexts).not.toContain('待審核');
  });
});
