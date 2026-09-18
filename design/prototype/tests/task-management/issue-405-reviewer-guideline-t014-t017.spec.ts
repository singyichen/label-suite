/*
 * Traceability: specs/task-management/014-task-detail/spec.md
 *   FR-014f-1
 * Issue #405: T014-T017 (the review-flow demo tasks introduced by PR #305)
 * never had any "提供給審核員" guideline content seeded in
 * task-detail.data.js's profiles, so the overview's reviewer guideline
 * card always fell back to the shared empty state ("未上傳" /
 * "尚無說明內容") on all four tasks.
 *
 * Issue #815: the guideline text seeded for #405 described the pre-#596
 * review model -- it named a per-task `審核門檻為 N 位審核員` and, on
 * T016/T017, explained majority convergence and even-tie handling in full
 * sentences. specs/annotation/015-annotation-workspace/spec.md v5.0.0
 * retired `MIN_REVIEWERS_DEFAULT` (015:63) and `DISPUTE_CONVERGENCE_RULE`
 * (015:66) as BREAKING, names reserved and not reused: FR-093 gives every
 * assignment target exactly one reviewer, so there is no threshold, no
 * vote count and no majority. This prose was the most explicit surviving
 * description of the dead model anywhere in the prototype -- a reviewer
 * opening T016 read a step-by-step account of how to converge by majority.
 *
 * This now asserts each task's profile states (a) the shared single_label
 * sentiment label-boundary criteria, (b) its own review scenario in terms
 * of FR-093's assignment granularity rather than a reviewer head count,
 * and (c) none of the retired vocabulary.
 */
import { test, expect } from '@playwright/test';

const TASK_DETAIL_URL = '/pages/task-management/task-detail.html';

/* FR-093: dry_run assigns by sample, official_run by review unit. That is
 * the only review-model difference between these four demo tasks now. */
const CASES = [
  { taskId: 'T014', reviewModelMarker: '以樣本為單位指派' },
  { taskId: 'T015', reviewModelMarker: '以審核單位為單位指派' },
  { taskId: 'T016', reviewModelMarker: '以審核單位為單位指派' },
  { taskId: 'T017', reviewModelMarker: '以審核單位為單位指派' },
];

/* Retired with 015 v5.0.0 (issue #596); names reserved and not reused. */
const BANNED_COPY = ['審核門檻', '定稿門檻', '多數決', 'min_reviewers', 'per-item-strict-majority', '核可', '退回'];

test.describe('Task detail reviewer guideline content for T014-T017 (issue #405, #815)', () => {
  for (const { taskId, reviewModelMarker } of CASES) {
    test(`${taskId} overview shows reviewer guideline content, not the empty state`, async ({ page }) => {
      await page.goto(`${TASK_DETAIL_URL}?task_id=${taskId}`);

      await expect(page.locator('#valueReviewerGuidelineStatus')).toHaveText('已上傳');
      await expect(page.locator('#valueReviewerGuidelineContentSummary')).toContainText('審核判準');
      await expect(page.locator('#valueReviewerGuidelineContentSummary')).toContainText(taskId);
      await expect(page.locator('#valueReviewerGuidelineContentSummary')).toContainText(reviewModelMarker);
      await expect(page.locator('#valueReviewerGuidelineContentSummary')).not.toContainText('尚無說明內容');
    });

    test(`${taskId} reviewer guideline carries no vocabulary retired by 015 v5.0.0`, async ({ page }) => {
      await page.goto(`${TASK_DETAIL_URL}?task_id=${taskId}`);

      const summary = page.locator('#valueReviewerGuidelineContentSummary');
      await expect(summary).toContainText('審核判準');
      for (const banned of BANNED_COPY) {
        await expect(summary).not.toContainText(banned);
      }
    });
  }
});
