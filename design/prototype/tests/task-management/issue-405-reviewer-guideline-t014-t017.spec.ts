/*
 * Traceability: specs/task-management/014-task-detail/spec.md
 *   FR-014f-1
 * Issue #405: T014-T017 (the review-flow demo tasks introduced by PR #305)
 * never had any "提供給審核員" guideline content seeded in
 * task-detail.data.js's profiles, so the overview's reviewer guideline
 * card always fell back to the shared empty state ("未上傳" /
 * "尚無說明內容") on all four tasks -- even though each one demonstrates a
 * different review model (dry_run consensus arbitration / single-reviewer
 * approval / three-reviewer majority convergence / two-reviewer even tie)
 * that a reviewer opening the task needs guidance for.
 *
 * This asserts each task's profile now carries reviewer guideline text
 * that (a) states the shared single_label sentiment label-boundary
 * criteria and (b) names that task's own review model, and that
 * task-detail.html's overview renders it instead of the empty-state
 * copy.
 */
import { test, expect } from '@playwright/test';

const TASK_DETAIL_URL = '/pages/task-management/task-detail.html';

const CASES = [
  { taskId: 'T014', reviewModelMarker: '審核門檻為 1 位審核員' },
  { taskId: 'T015', reviewModelMarker: '審核門檻為 1 位審核員' },
  { taskId: 'T016', reviewModelMarker: '審核門檻為 3 位審核員' },
  { taskId: 'T017', reviewModelMarker: '審核門檻為 2 位審核員' },
];

test.describe('Task detail reviewer guideline content for T014-T017 (issue #405)', () => {
  for (const { taskId, reviewModelMarker } of CASES) {
    test(`${taskId} overview shows reviewer guideline content, not the empty state`, async ({ page }) => {
      await page.goto(`${TASK_DETAIL_URL}?task_id=${taskId}`);

      await expect(page.locator('#valueReviewerGuidelineStatus')).toHaveText('已上傳');
      await expect(page.locator('#valueReviewerGuidelineContentSummary')).toContainText('審核判準');
      await expect(page.locator('#valueReviewerGuidelineContentSummary')).toContainText(taskId);
      await expect(page.locator('#valueReviewerGuidelineContentSummary')).toContainText(reviewModelMarker);
      await expect(page.locator('#valueReviewerGuidelineContentSummary')).not.toContainText('尚無說明內容');
    });
  }
});
