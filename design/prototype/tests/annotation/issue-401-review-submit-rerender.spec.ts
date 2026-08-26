import { test, expect } from '@playwright/test';
import { buildWorkspaceUrl, skipGuidelineModal } from './_workspace-helpers';

/* Reviewer submit re-render (issue #401, RV-06).
 *
 * Before this fix, handleReviewSubmit() persisted the decision (toast +
 * history entry both landed) but never re-rendered the review-unit context
 * banner or the review card themselves. On a min_reviewers=1 unit the first
 * submit finalizes it, yet the banner kept showing the pre-submit "待審"
 * pill and the interactive ✕/✓ + submit chrome stayed on screen -- only a
 * manual page reload revealed the FINALIZED lock. A reviewer who clicked
 * "送出審核" a second time (believing nothing had happened) got no toast,
 * no history entry, and no visual feedback at all.
 *
 * T015 ofs-04-pending-review (min_reviewers = 1) is the exact repro sample
 * from the issue: one approve + one submit must finalize AND lock the
 * screen in the same render pass, with no reload required.
 */

function reviewerUrl(sampleId: string): string {
  return buildWorkspaceUrl({
    task_id: 'T015', sample_id: sampleId, role: 'reviewer', run_type: 'official_run',
  });
}

test.describe('issue #401 -- reviewer submit re-renders the finalized lock immediately', () => {
  test('T015 ofs-04 (min=1): banner and card lock without a reload after the finalizing submit', async ({ page }) => {
    await skipGuidelineModal(page);
    await page.goto(reviewerUrl('ofs-04-pending-review'));

    await expect(page.locator('[data-testid="ws-review-unit-context"] .rv-unit-state'))
      .not.toHaveText('已定稿');
    await expect(page.getByTestId('ws-review-row-approve')).toBeVisible();

    await page.getByTestId('ws-review-row-approve').click();
    await page.getByTestId('ws-review-submit-btn').click();
    await expect(page.locator('#toastMsg')).toHaveText('審查已提交');

    // No reload: the render must reflect FINALIZED immediately.
    await expect(page.locator('[data-testid="ws-review-unit-context"] .rv-unit-state'))
      .toHaveText('已定稿 · 已鎖定');
    await expect(page.getByTestId('ws-review-finalized-card')).toBeVisible();
    await expect(page.getByTestId('ws-review-row-approve')).toHaveCount(0);
    await expect(page.getByTestId('ws-review-submit-btn')).toBeHidden();
  });
});
