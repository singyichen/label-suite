import { test, expect } from '@playwright/test';
import { buildListUrl, buildWorkspaceUrl, skipGuidelineModal } from './_workspace-helpers';

/* Issue #400: the annotation list's 標記結果 (and 標記分布統計) columns kept
 * showing the annotator's ORIGINAL answer for a finalized review unit even
 * after the reviewers' majority vote converged it to a different value --
 * the workspace already shows the converged value
 * ("已依審核員多數決收斂"), but the list, used as a scan-only entry point,
 * silently disagreed with it.
 *
 * Repro (from the issue): T016 ofm-02-approved-interim ships the annotator
 * answer `negative` and is seeded with one agreeing review
 * (reviewer_wang: negative), so it starts APPROVED (1 < minReviewers=3). This
 * test files the two remaining reviews (reviewer_li, reviewer_lin: both
 * `positive`) to reach the 3-reviewer quorum, which the majority-convergence
 * algorithm (annotation-workspace.data.js resolveDisputeConvergence) resolves
 * to `positive` (2 positive > 3/2) and finalizes the unit -- then asserts the
 * list reflects that converged value instead of the stale `negative`.
 */

function reviewerWorkspaceUrl(reviewerId: string): string {
  return buildWorkspaceUrl({
    task_id: 'T016',
    sample_id: 'ofm-02-approved-interim',
    role: 'reviewer',
    run_type: 'official_run',
    reviewer_id: reviewerId,
  });
}

async function fileConvergingReview(page: import('@playwright/test').Page, reviewerId: string) {
  await skipGuidelineModal(page);
  await page.goto(reviewerWorkspaceUrl(reviewerId));

  const row = page.getByTestId('ws-review-row').first();
  await row.getByTestId('ws-review-correct-single_label').getByTestId('ws-single-label-chip-positive').click();
  await row.getByTestId('ws-review-row-approve').click();
  await page.getByTestId('ws-review-submit-btn').click();
  await expect(page.locator('#toastMsg')).toHaveText('審核已送出');
}

test('issue #400: a finalized unit\'s list row shows the reviewer-majority-converged answer, not the annotator\'s original one', async ({ page }) => {
  // Two more reviewers (beyond the already-seeded reviewer_wang) both pick
  // `positive`, converging the unit away from the annotator's `negative`.
  await fileConvergingReview(page, 'reviewer_li');
  await fileConvergingReview(page, 'reviewer_lin');

  // Sanity check: the workspace itself now reports the unit as finalized
  // with the converged value, confirming the fixture reached the state the
  // issue describes before asserting on the list.
  await skipGuidelineModal(page);
  await page.goto(reviewerWorkspaceUrl('reviewer_wang'));
  await expect(page.locator('[data-testid="ws-review-unit-context"] .rv-unit-state')).toHaveText('目前：已定稿 · 已鎖定');
  await expect(page.getByTestId('ws-finalized-resolved')).toContainText('positive');

  await page.goto(buildListUrl({
    task_id: 'T016', role: 'reviewer', run_type: 'official_run', reviewer_id: 'reviewer_wang',
  }));

  const row = page.getByTestId('ws-sample-item').filter({ hasText: 'ofm-02-approved-interim' });
  await expect(row.locator('.status-badge')).toHaveText('已定稿 · 已鎖定');
  await expect(row.getByTestId('list-review-answer')).toHaveText('positive');
});
