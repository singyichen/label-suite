import { test, expect } from '@playwright/test';
import { buildWorkspaceUrl, dismissGuidelineModal, skipGuidelineModal } from './_workspace-helpers';

/* Reviewer decision / direct-correction desync after reload (issue #398).
 *
 * FR-014S (spec 015 v4.19.0, AC-6.10) persists the reviewer's per-row
 * approve/reject decision across a reload, but explicitly EXCLUDES the
 * direct-correction control's in-progress value from that persistence --
 * a correction always reseeds from the reviewed annotator's original
 * submitted answer on a fresh render (seedReviewRow() in
 * annotation-workspace.config.js).
 *
 * Before this fix that left a silent, potentially data-integrity-breaking
 * gap: if a reviewer edited the correction value AND THEN approved/rejected
 * before reloading, the kept decision (aria-pressed="true") rode along with
 * a correction value that had silently reverted to the annotator's
 * ORIGINAL answer -- not the value the reviewer actually decided on. A
 * reviewer who trusts the still-pressed button would submit an answer they
 * never actually confirmed.
 *
 * Design decision (see PR description): rather than expanding FR-014S's
 * persistence scope to cover the correction's raw value (which the spec's
 * AC-6.10 note explicitly puts out of scope), a corrected-but-now-reverted
 * decision is reset to undecided on restore, and the reviewer is warned via
 * toast so the mismatch is never silent.
 *
 * Traceability: specs/annotation/015-annotation-workspace/spec.md
 *   FR-014S, AC-6.10.
 */

const REVIEWER_URL = buildWorkspaceUrl({
  task_id: 'T001',
  sample_id: 'sent-001',
  role: 'reviewer',
  run_type: 'official_run',
});

test.beforeEach(async ({ page }) => {
  await skipGuidelineModal(page);
});

test.describe('A decision kept alongside a lost correction is reset, not silently kept (issue #398)', () => {
  test('reload after editing the correction resets the previously-kept decision and warns the reviewer', async ({ page }) => {
    await page.goto(REVIEWER_URL);
    await dismissGuidelineModal(page);

    const correction = page.getByTestId('ws-review-correct-single_label');
    const negativeChip = correction.getByTestId('ws-single-label-chip-negative');
    const positiveChip = correction.getByTestId('ws-single-label-chip-positive');

    // Pick whichever chip is NOT already the seeded answer, so this
    // actually changes the correction away from the original.
    const negativeAlreadyPressed = (await negativeChip.getAttribute('aria-pressed')) === 'true';
    const targetChip = negativeAlreadyPressed ? positiveChip : negativeChip;
    await targetChip.click();
    await expect(targetChip).toHaveAttribute('aria-pressed', 'true');

    const approveBtn = page.getByTestId('ws-review-row-approve');
    await approveBtn.click();
    await expect(approveBtn).toHaveAttribute('aria-pressed', 'true');

    await page.reload();
    await dismissGuidelineModal(page);

    // The correction control silently reverted to the annotator's original
    // answer (FR-014S explicitly excludes correction-value persistence).
    // The kept decision must NOT silently ride along with a value the
    // reviewer never actually confirmed -- it must reset to undecided.
    await expect(page.getByTestId('ws-review-row-approve')).toHaveAttribute('aria-pressed', 'false');

    // And the reviewer must be told why, instead of the reset being silent.
    await expect(page.locator('#toastMsg')).toHaveText(
      '偵測到直接修正的內容因重新整理而遺失，對應的通過／退回決策已重置，請重新確認後再送出'
    );
  });
});
