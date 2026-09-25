/**
 * The footer submit button (`#wsReviewSubmitBtn` / `ws-review-submit-btn`)
 * sits ~389px below the decision row (measured live at 1440x900 on
 * T015/ofs-04-pending-review, reviewer_wang), so every reviewed sample costs
 * a long pointer trip from decision to submit (issue #928).
 * Source spec: specs/annotation/015-annotation-workspace/spec.md FR-014P
 *
 * Target: once every outKey in the review unit has a decision
 * (`pendingReviewOutputKeys(...).length === 0`), a new secondary control
 * (`ws-review-quick-submit-btn`) appears near `.rv-decision-row` and drives
 * the same `handleReviewSubmit()` as the existing footer button. The footer
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

test.describe('A quick-submit control appears next to the decision row once decided (issue #928)', () => {
  test('the quick-submit control is hidden before any decision is made', async ({ page }) => {
    await gotoReviewerWorkspace(page, SAMPLE);
    await dismissGuidelineModal(page);

    await expect(page.getByTestId('ws-review-quick-submit-btn')).toBeHidden();
  });

  test('the quick-submit control appears near .rv-decision-row once all outKeys are decided', async ({ page }) => {
    await gotoReviewerWorkspace(page, SAMPLE);
    await dismissGuidelineModal(page);

    /* T015/ofs-04-pending-review has a single output (single_label), so one
     * decision click clears pendingReviewOutputKeys() for this unit. */
    await page.getByTestId('ws-review-row-approve').click();

    const quickSubmitBtn = page.getByTestId('ws-review-quick-submit-btn');
    await expect(quickSubmitBtn).toBeVisible();

    const decisionRowBox = await page.locator('.rv-decision-row').boundingBox();
    const quickSubmitBox = await quickSubmitBtn.boundingBox();
    expect(decisionRowBox, '.rv-decision-row bounding box').not.toBeNull();
    expect(quickSubmitBox, 'ws-review-quick-submit-btn bounding box').not.toBeNull();

    const gap = quickSubmitBox!.y - (decisionRowBox!.y + decisionRowBox!.height);
    expect(gap).toBeLessThanOrEqual(120);
  });

  test('clicking the quick-submit control submits the review, same as the footer submit button', async ({ page }) => {
    await gotoReviewerWorkspace(page, SAMPLE);
    await dismissGuidelineModal(page);

    await page.getByTestId('ws-review-row-approve').click();
    await page.getByTestId('ws-review-quick-submit-btn').click();

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
