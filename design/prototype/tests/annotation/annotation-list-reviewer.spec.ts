import { test, expect } from '@playwright/test';
import { buildListUrl } from './_workspace-helpers';

/* Reviewer rows on the annotation list (spec 015 v3.0.0 FR-047/FR-048,
 * BREAKING): presentation now splits by run_type.
 *
 * dry_run: keeps the legacy expandable multi-annotator comparison (標記分布
 * 統計 column, list-review-expand, list-review-annotator-row), but it is now
 * READ-ONLY -- all decision buttons are removed (adjudication happens only
 * in the workspace's consensus-merge review card). The sole row action is
 * 編輯, and the toolbar submit button never renders for dry_run.
 *
 * official_run: a single flat row per sample -- no expansion, no stats
 * column, no IAA. The row carries exactly one approve/reject decision
 * (list-review-row-approve/list-review-row-reject) plus 編輯, and the
 * toolbar 送出審核 button validates one decision per sample (across the
 * whole task, not just the current page) before submitting.
 *
 * Stats reuse the same algorithm as the workspace aggregate review card
 * (one algorithm per output-type category, in annotation-workspace.data.js),
 * so list and workspace numbers can never drift. */

test.describe('dry_run reviewer rows — read-only multi-annotator overview', () => {
  test('table shows the label distribution column with per-sample stats', async ({ page }) => {
    await page.goto(buildListUrl({ task_id: 'T001', role: 'reviewer', run_type: 'dry_run' }));

    await expect(page.locator('#taskTable thead')).toContainText('標記分布統計');
    // Pinned fixture: T001 sent-001 ships positive/negative/positive.
    await expect(page.getByTestId('list-review-stats').first()).toHaveText('positive×2 · negative×1');
  });

  test('annotator view keeps the original columns and no review controls', async ({ page }) => {
    await page.goto(buildListUrl({ task_id: 'T001', role: 'annotator', run_type: 'dry_run' }));

    await expect(page.locator('#taskTable thead')).not.toContainText('標記分布統計');
    await expect(page.getByTestId('list-review-expand')).toHaveCount(0);
    await expect(page.locator('#submitReviewBtn')).toBeHidden();
  });

  test('the toolbar submit button never renders for dry_run reviewer', async ({ page }) => {
    await page.goto(buildListUrl({ task_id: 'T001', role: 'reviewer', run_type: 'dry_run' }));

    await expect(page.locator('#submitReviewBtn')).toBeHidden();
  });

  test('expanding a row reveals one read-only annotator row per mock annotator, no decision buttons', async ({ page }) => {
    await page.goto(buildListUrl({ task_id: 'T001', role: 'reviewer', run_type: 'dry_run' }));

    await page.getByTestId('list-review-expand').first().click();
    const annotatorRows = page.getByTestId('list-review-annotator-row');
    await expect(annotatorRows).toHaveCount(3);
    await expect(annotatorRows.first()).toContainText('kioleemg12');
    await expect(annotatorRows.first()).toContainText('positive');
    await expect(annotatorRows.first().getByRole('button')).toHaveCount(0);
    await expect(page.getByTestId('list-review-approve-all')).toHaveCount(0);
    await expect(page.getByTestId('list-review-reject-all')).toHaveCount(0);
  });

  test('the sole row action is 編輯, which navigates to the workspace', async ({ page }) => {
    await page.goto(buildListUrl({ task_id: 'T001', role: 'reviewer', run_type: 'dry_run' }));

    const row = page.getByTestId('ws-sample-item').first();
    await expect(row.getByRole('button', { name: '編輯' })).toBeVisible();
    await expect(row.getByRole('button', { name: /通過/ })).toHaveCount(0);
    await expect(row.getByRole('button', { name: /退回/ })).toHaveCount(0);

    await row.getByRole('button', { name: '編輯' }).click();
    await expect(page).toHaveURL(/annotation-workspace\.html/);
    await expect(page).toHaveURL(/run_type=dry_run/);
  });

  test('multi-output task stats are prefixed per output type', async ({ page }) => {
    await page.goto(buildListUrl({ task_id: 'T010', role: 'reviewer', run_type: 'dry_run' }));

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
    await page.goto(buildListUrl({ task_id: 'T005', role: 'reviewer', run_type: 'dry_run' }));

    const stats = page.getByTestId('list-review-stats').nth(1);
    await expect(stats).toContainText('mean [3.33, 4.00, 3.00]');
    await expect(stats).toContainText('std [0.47, 0.00, 0.00]');
    await expect(stats).toContainText('±1.5std fluency : 2.626~4.040');
    await expect(stats).toContainText('±1.5std adequacy : 4.000~4.000');
    await expect(stats).toContainText('±1.5std coherence : 3.000~3.000');
  });

  test('multi_dim annotator result tags render as bracketed value arrays', async ({ page }) => {
    await page.goto(buildListUrl({ task_id: 'T005', role: 'reviewer', run_type: 'dry_run' }));

    await page.getByTestId('list-review-expand').nth(1).click();
    const resultTags = page.getByTestId('list-review-annotator-row').locator('.annotator-result-tag');
    await expect(resultTags.first()).toHaveText('[3, 4, 3]');
    await expect(resultTags.nth(2)).toHaveText('[4, 4, 3]');
  });

  test('multi-output task with multi_dim keeps the multi-line dim block inside the prefixed stats', async ({ page }) => {
    // T013 absa-001 multi_dim: valence 3/3/4, arousal 6/6/5.
    await page.goto(buildListUrl({ task_id: 'T013', role: 'reviewer', run_type: 'dry_run' }));

    const stats = page.getByTestId('list-review-stats').first();
    await expect(stats).toContainText('mean [3.33, 5.67]');
    await expect(stats).toContainText('±1.5std valence :');
  });

  test('switching to English localizes the reviewer chrome', async ({ page }) => {
    await page.goto(buildListUrl({ task_id: 'T001', role: 'reviewer', run_type: 'dry_run' }));

    await page.locator('#langToggle').click();
    await expect(page.locator('#taskTable thead')).toContainText('Label Distribution');
  });
});

test.describe('official_run reviewer rows — single-annotator decision', () => {
  test('table drops the stats column and expansion, keeping the 5-column layout', async ({ page }) => {
    await page.goto(buildListUrl({ task_id: 'T001', role: 'reviewer', run_type: 'official_run' }));

    await expect(page.locator('#taskTable thead')).not.toContainText('標記分布統計');
    await expect(page.getByTestId('list-review-expand')).toHaveCount(0);
    await expect(page.getByTestId('list-review-stats')).toHaveCount(0);
  });

  test('each row carries exactly one approve/reject decision plus 編輯', async ({ page }) => {
    await page.goto(buildListUrl({ task_id: 'T001', role: 'reviewer', run_type: 'official_run' }));

    const row = page.getByTestId('ws-sample-item').first();
    await expect(row.getByTestId('list-review-row-approve')).toBeVisible();
    await expect(row.getByTestId('list-review-row-reject')).toBeVisible();
    await expect(row.getByRole('button', { name: '編輯' })).toBeVisible();
  });

  test('clicking approve then reject switches the active decision; clicking the active one again cancels it', async ({ page }) => {
    await page.goto(buildListUrl({ task_id: 'T001', role: 'reviewer', run_type: 'official_run' }));

    const row = page.getByTestId('ws-sample-item').first();
    const approveBtn = row.getByTestId('list-review-row-approve');
    const rejectBtn = row.getByTestId('list-review-row-reject');

    await approveBtn.click();
    await expect(approveBtn).toHaveClass(/mini-btn-active-approve/);
    await expect(rejectBtn).not.toHaveClass(/mini-btn-active-reject/);

    await rejectBtn.click();
    await expect(rejectBtn).toHaveClass(/mini-btn-active-reject/);
    await expect(approveBtn).not.toHaveClass(/mini-btn-active-approve/);

    await rejectBtn.click();
    await expect(rejectBtn).not.toHaveClass(/mini-btn-active-reject/);
  });

  test('submit review blocks until every sample in the task has a decision', async ({ page }) => {
    await page.goto(buildListUrl({ task_id: 'T001', role: 'reviewer', run_type: 'official_run' }));

    const submitBtn = page.locator('#submitReviewBtn');
    await expect(submitBtn).toBeVisible();
    await submitBtn.click();
    await expect(page.locator('#toastMsg')).toHaveText('請完成每筆樣本的審核決策');

    // T001 ships 5 dataset records, all on one page (pageSize 20).
    const approveBtns = page.getByTestId('list-review-row-approve');
    await expect(approveBtns).toHaveCount(5);
    for (let i = 0; i < 5; i += 1) {
      await approveBtns.nth(i).click();
    }
    await submitBtn.click();
    await expect(page.locator('#toastMsg')).toHaveText('審核結果已送出。');
  });

  test('clicking a row (outside the action buttons) navigates to the workspace', async ({ page }) => {
    await page.goto(buildListUrl({ task_id: 'T001', role: 'reviewer', run_type: 'official_run' }));

    await page.getByTestId('ws-sample-item').first().click();
    await expect(page).toHaveURL(/annotation-workspace\.html/);
    await expect(page).toHaveURL(/run_type=official_run/);
  });

  test('switching to English localizes the reviewer chrome and the toolbar submit button', async ({ page }) => {
    await page.goto(buildListUrl({ task_id: 'T001', role: 'reviewer', run_type: 'official_run' }));

    await page.locator('#langToggle').click();
    await expect(page.locator('#submitReviewBtn')).toContainText('Submit Review');
  });
});
