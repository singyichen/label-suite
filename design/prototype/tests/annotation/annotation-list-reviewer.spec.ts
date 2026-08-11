import { test, expect } from '@playwright/test';
import { buildListUrl } from './_workspace-helpers';

/* Reviewer aggregate review rows on the annotation list (spec 015): the
 * reviewer view restores the legacy per-sample review affordances -- a
 * 標記分布統計 column computed from the shared REVIEWER_MOCK_ROWS, an
 * expandable per-annotator decision row set, bulk 全部通過/全部退回 on the
 * summary row, and a toolbar 送出審核 button that validates every
 * annotator decision before submitting. Stats reuse the same algorithm as
 * the workspace aggregate review card (one algorithm per output-type
 * category), so list and workspace numbers can never drift. */

test.describe('Annotation list reviewer aggregate review rows', () => {
  test('reviewer table shows the label distribution column with per-sample stats', async ({ page }) => {
    await page.goto(buildListUrl({ task_id: 'T001', role: 'reviewer', run_type: 'official_run' }));

    await expect(page.locator('#taskTable thead')).toContainText('標記分布統計');
    // Pinned fixture: T001 sent-001 ships positive/negative/positive.
    await expect(page.getByTestId('list-review-stats').first()).toHaveText('positive×2 · negative×1');
  });

  test('annotator view keeps the original columns and no review controls', async ({ page }) => {
    await page.goto(buildListUrl({ task_id: 'T001', role: 'annotator', run_type: 'official_run' }));

    await expect(page.locator('#taskTable thead')).not.toContainText('標記分布統計');
    await expect(page.getByTestId('list-review-expand')).toHaveCount(0);
    await expect(page.locator('#submitReviewBtn')).toBeHidden();
  });

  test('expanding a row reveals one decision row per annotator', async ({ page }) => {
    await page.goto(buildListUrl({ task_id: 'T001', role: 'reviewer', run_type: 'official_run' }));

    await page.getByTestId('list-review-expand').first().click();
    const annotatorRows = page.getByTestId('list-review-annotator-row');
    await expect(annotatorRows).toHaveCount(3);
    await expect(annotatorRows.first()).toContainText('kioleemg12');
    await expect(annotatorRows.first()).toContainText('positive');
    await expect(annotatorRows.first().getByRole('button', { name: /通過/ })).toBeVisible();
    await expect(annotatorRows.first().getByRole('button', { name: /退回/ })).toBeVisible();
  });

  test('bulk approve toggles every annotator decision', async ({ page }) => {
    await page.goto(buildListUrl({ task_id: 'T001', role: 'reviewer', run_type: 'official_run' }));

    const bulkApprove = page.getByTestId('list-review-approve-all').first();
    await bulkApprove.click();
    // Bulk decisions auto-expand the detail so the per-row state is visible.
    const rowApproveBtns = page.getByTestId('list-review-annotator-row').locator('.mini-btn-approve');
    await expect(rowApproveBtns).toHaveCount(3);
    for (let i = 0; i < 3; i += 1) {
      await expect(rowApproveBtns.nth(i)).toHaveClass(/mini-btn-active-approve/);
    }
    await expect(bulkApprove).toHaveClass(/mini-btn-active-approve/);

    // Clicking the active bulk decision cancels it back to undecided.
    await bulkApprove.click();
    for (let i = 0; i < 3; i += 1) {
      await expect(rowApproveBtns.nth(i)).not.toHaveClass(/mini-btn-active-approve/);
    }
    await expect(bulkApprove).not.toHaveClass(/mini-btn-active-approve/);
  });

  test('deciding every annotator individually lights the bulk button', async ({ page }) => {
    await page.goto(buildListUrl({ task_id: 'T001', role: 'reviewer', run_type: 'official_run' }));

    await page.getByTestId('list-review-expand').first().click();
    const rowApproveBtns = page.getByTestId('list-review-annotator-row').locator('.mini-btn-approve');
    for (let i = 0; i < 3; i += 1) {
      await rowApproveBtns.nth(i).click();
    }
    await expect(page.getByTestId('list-review-approve-all').first()).toHaveClass(/mini-btn-active-approve/);
  });

  test('submit review blocks until every annotator decision is made', async ({ page }) => {
    await page.goto(buildListUrl({ task_id: 'T001', role: 'reviewer', run_type: 'official_run' }));

    const submitBtn = page.locator('#submitReviewBtn');
    await expect(submitBtn).toBeVisible();
    await submitBtn.click();
    await expect(page.locator('#toastMsg')).toHaveText('請完成每位標記員的審核決策');

    const bulkApproveBtns = page.getByTestId('list-review-approve-all');
    await expect(bulkApproveBtns).toHaveCount(5);
    for (let i = 0; i < 5; i += 1) {
      await bulkApproveBtns.nth(i).click();
    }
    await submitBtn.click();
    await expect(page.locator('#toastMsg')).toHaveText('審核結果已送出。');
  });

  test('multi-output task stats are prefixed per output type', async ({ page }) => {
    await page.goto(buildListUrl({ task_id: 'T010', role: 'reviewer', run_type: 'official_run' }));

    const stats = page.getByTestId('list-review-stats').first();
    await expect(stats).toContainText('實體辨識');
    await expect(stats).toContainText('關係識別');
    await expect(stats).toContainText('×');
  });

  test('single_dim rows expose mean/std stats and deviation-colored result tags', async ({ page }) => {
    // T004 read-001 ships scores 4 / 4 / 3 -> mean 3.67, std 0.47; the
    // 3-score row deviates by more than 1std but less than 1.5std (blue).
    await page.goto(buildListUrl({ task_id: 'T004', role: 'reviewer', run_type: 'dry_run' }));

    await expect(page.getByTestId('list-review-stats').first()).toHaveText('mean : 3.67 , std : 0.47');
    await page.getByTestId('list-review-expand').first().click();
    const resultTags = page.getByTestId('list-review-annotator-row').locator('.annotator-result-tag');
    await expect(resultTags.first()).toHaveClass(/result-tag-green/);
    await expect(resultTags.nth(2)).toHaveClass(/result-tag-blue/);
  });

  test('multi_dim stats render the legacy multi-line mean/std/±1.5std block', async ({ page }) => {
    // T005 mt-002 ships fluency 3/3/4, adequacy 4/4/4, coherence 3/3/3.
    await page.goto(buildListUrl({ task_id: 'T005', role: 'reviewer', run_type: 'official_run' }));

    const stats = page.getByTestId('list-review-stats').nth(1);
    await expect(stats).toContainText('mean [3.33, 4.00, 3.00]');
    await expect(stats).toContainText('std [0.47, 0.00, 0.00]');
    await expect(stats).toContainText('±1.5std fluency : 2.626~4.040');
    await expect(stats).toContainText('±1.5std adequacy : 4.000~4.000');
    await expect(stats).toContainText('±1.5std coherence : 3.000~3.000');
  });

  test('multi_dim annotator result tags render as bracketed value arrays', async ({ page }) => {
    await page.goto(buildListUrl({ task_id: 'T005', role: 'reviewer', run_type: 'official_run' }));

    await page.getByTestId('list-review-expand').nth(1).click();
    const resultTags = page.getByTestId('list-review-annotator-row').locator('.annotator-result-tag');
    await expect(resultTags.first()).toHaveText('[3, 4, 3]');
    await expect(resultTags.nth(2)).toHaveText('[4, 4, 3]');
  });

  test('multi-output task with multi_dim keeps the multi-line dim block inside the prefixed stats', async ({ page }) => {
    // T013 absa-001 multi_dim: valence 3/3/4, arousal 6/6/5.
    await page.goto(buildListUrl({ task_id: 'T013', role: 'reviewer', run_type: 'official_run' }));

    const stats = page.getByTestId('list-review-stats').first();
    await expect(stats).toContainText('mean [3.33, 5.67]');
    await expect(stats).toContainText('±1.5std valence :');
  });

  test('switching to English localizes the reviewer chrome', async ({ page }) => {
    await page.goto(buildListUrl({ task_id: 'T001', role: 'reviewer', run_type: 'official_run' }));

    await page.locator('#langToggle').click();
    await expect(page.locator('#taskTable thead')).toContainText('Label Distribution');
    await expect(page.locator('#submitReviewBtn')).toContainText('Submit Review');
  });
});
