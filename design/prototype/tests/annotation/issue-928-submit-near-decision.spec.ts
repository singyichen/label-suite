/**
 * issue #928 introduced a decision-row "quick submit" control
 * (`ws-review-quick-submit-btn`) that appeared next to `.rv-decision-row`
 * once every outKey in the review unit was decided, driving the same
 * `handleReviewSubmit()` as the pre-existing fixed footer button
 * (`ws-review-submit-btn`). issue #1004: the maintainer ruled the two
 * visually-identical submit entry points were confusing and decided to keep
 * only the footer button -- the decision-row quick-submit control (and its
 * issue #930 consequence-hint sibling, `ws-review-quick-submit-consequence`)
 * is removed entirely.
 * Source spec: specs/annotation/015-annotation-workspace/spec.md FR-014P
 *
 * Target: `ws-review-quick-submit-btn` never renders, at any point in the
 * review unit's decision lifecycle -- the footer button
 * (`ws-review-submit-btn`) is the single submit entry point. The footer
 * button itself is NOT moved and keeps its current position/right-alignment
 * inside `.action-bar` (locked by issue #563's
 * issue-563-submit-btn-right-aligned.spec.ts).
 */
import { expect, test } from '@playwright/test';
import { dismissGuidelineModal, gotoReviewerWorkspace, skipGuidelineModal } from './_workspace-helpers';

const SAMPLE = { task_id: 'T015', sample_id: 'ofs-04-pending-review', run_type: 'official_run' as const };

test.beforeEach(async ({ page }) => {
  await skipGuidelineModal(page);
});

test.describe('the footer submit button is the single review submit entry point (issue #1004)', () => {
  test('the quick-submit control does not exist in the DOM before any decision is made', async ({ page }) => {
    await gotoReviewerWorkspace(page, SAMPLE);
    await dismissGuidelineModal(page);

    await expect(page.getByTestId('ws-review-quick-submit-btn')).toHaveCount(0);
  });

  test('the quick-submit control still does not exist once all outKeys are decided, leaving the footer button as the only visible submit control', async ({
    page,
  }) => {
    await gotoReviewerWorkspace(page, SAMPLE);
    await dismissGuidelineModal(page);

    /* T015/ofs-04-pending-review has a single output (single_label), so one
     * decision click clears pendingReviewOutputKeys() for this unit. */
    await page.getByTestId('ws-review-row-approve').click();

    await expect(page.getByTestId('ws-review-quick-submit-btn')).toHaveCount(0);
    await expect(page.getByTestId('ws-review-submit-btn')).toBeVisible();
  });

  test('clicking the footer submit button after all decisions are made submits the review', async ({ page }) => {
    await gotoReviewerWorkspace(page, SAMPLE);
    await dismissGuidelineModal(page);

    await page.getByTestId('ws-review-row-approve').click();
    await page.getByTestId('ws-review-submit-btn').click();

    await expect(page.locator('#toastMsg')).toHaveText('審核已送出');
  });

  /* issue #933 regression guard: the footer submit button must stay above
   * the bottom drawer handle on mobile. This mirrors the exact assertion in
   * annotation-mobile-collapsed-layout.spec.ts's
   * 'reviewer mode keeps single-column width and a reachable submit
   * control on mobile (RESP-01)' test, applied to this spec's target
   * sample, so a fix scoped to the decision row cannot silently regress
   * the mobile footer-vs-drawer-handle fix. */
  test('the footer submit button stays above the mobile drawer handle at 390x844 (issue #933 regression guard)', async ({
    page,
  }) => {
    await gotoReviewerWorkspace(page, SAMPLE);
    await dismissGuidelineModal(page);

    await page.getByTestId('ws-guideline-collapse-btn').click();
    await page.setViewportSize({ width: 390, height: 844 });

    const submitBtn = page.getByTestId('ws-review-submit-btn');
    await submitBtn.scrollIntoViewIfNeeded();
    await expect(submitBtn).toBeVisible();
    const box = await submitBtn.boundingBox();
    expect(box).not.toBeNull();

    const handleBox = await page.locator('#wsMobileDrawerHandle').boundingBox();
    expect(handleBox).not.toBeNull();
    expect(box!.y + box!.height).toBeLessThanOrEqual(handleBox!.y);
  });
});
