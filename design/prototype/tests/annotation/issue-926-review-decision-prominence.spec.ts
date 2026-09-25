/**
 * Reviewer decision buttons are the primary action on a review card; they
 * must not be visually smaller than the answer value they sit beside
 * (issue #926).
 * Source spec: specs/annotation/015-annotation-workspace/spec.md FR-014P
 *
 * Baseline measured live at 1440x900 on
 * annotation-workspace.html?task_id=T015&role=reviewer&reviewer_id=reviewer_wang&sample_id=ofs-04-pending-review
 * (2026-09-24 Impeccable+uxaudit run): the three decision buttons
 * (`.mini-btn`, ~59.7x22px = ~1313px^2 each) sit below the WCAG 2.5.5 44px
 * touch-target guideline, and their combined area (~4548px^2) is smaller
 * than the answer chip they sit beside (`ws-single-label-chip-positive`,
 * ~107.9x44.5px = ~4800px^2).
 */
import { expect, test } from '@playwright/test';
import { dismissGuidelineModal, gotoReviewerWorkspace, skipGuidelineModal } from './_workspace-helpers';

const DECISION_TESTIDS = ['ws-review-row-approve', 'ws-review-row-modify', 'ws-review-row-bypass'] as const;

function boxArea(box: { width: number; height: number } | null, label: string): number {
  if (!box) throw new Error(`${label}: bounding box unavailable`);
  return box.width * box.height;
}

test.beforeEach(async ({ page }) => {
  await skipGuidelineModal(page);
});

test.describe('Reviewer decision buttons are visually prominent (issue #926)', () => {
  test('each decision button meets the 44px WCAG 2.5.5 touch-target height', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await gotoReviewerWorkspace(page, { task_id: 'T015', sample_id: 'ofs-04-pending-review', run_type: 'official_run' });
    await dismissGuidelineModal(page);

    for (const testid of DECISION_TESTIDS) {
      const box = await page.getByTestId(testid).boundingBox();
      expect(box, `${testid} bounding box`).not.toBeNull();
      expect(box!.height, `${testid} height`).toBeGreaterThanOrEqual(44);
    }
  });

  test('combined decision-button area is at least the answer chip area', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await gotoReviewerWorkspace(page, { task_id: 'T015', sample_id: 'ofs-04-pending-review', run_type: 'official_run' });
    await dismissGuidelineModal(page);

    let combinedDecisionArea = 0;
    for (const testid of DECISION_TESTIDS) {
      const box = await page.getByTestId(testid).boundingBox();
      combinedDecisionArea += boxArea(box, testid);
    }

    /* Sum of the three individual button areas, NOT the `.rv-choice-group`
     * bounding box -- the group box also spans the gaps between buttons, so
     * it can already exceed the chip area today even though no single
     * button is prominent, which would hide the bug this test targets. */
    const answerChipBox = await page.getByTestId('ws-single-label-chip-positive').boundingBox();
    const answerChipArea = boxArea(answerChipBox, 'ws-single-label-chip-positive');

    expect(combinedDecisionArea).toBeGreaterThanOrEqual(answerChipArea);
  });
});
