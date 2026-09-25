/**
 * The answer's Bypass chip ("無法判定 (Bypass)", `OutputAnswer.bypass`) and
 * the reviewer's three-way decision buttons ("無法裁決" etc.,
 * `REVIEW_DECISIONS.bypass`) are two distinct vocabularies (issue #811,
 * FR-092 v6.8.0) that must not share one visual row, or the two easily read
 * as the same concept (issue #927).
 * Source spec: specs/annotation/015-annotation-workspace/spec.md FR-014P, FR-053
 *
 * Today `dockDecisionsOnBypassRow()` docks the decision buttons
 * (`.rv-choice-group`) directly inside `.preview-bypass-row`, as direct
 * siblings of the answer's Bypass chip. This pins the target structure:
 * the decision buttons must live in `.rv-decision-row` instead, as a
 * sibling container -- not nested inside `.preview-bypass-row` -- while the
 * actual answer Bypass chip stays exactly where it is.
 */
import { expect, test } from '@playwright/test';
import { dismissGuidelineModal, gotoReviewerWorkspace, skipGuidelineModal } from './_workspace-helpers';

test.beforeEach(async ({ page }) => {
  await skipGuidelineModal(page);
});

test.describe('Decision buttons are separated from the answer Bypass row (issue #927)', () => {
  test('the answer Bypass row no longer contains the decision button group', async ({ page }) => {
    await gotoReviewerWorkspace(page, { task_id: 'T015', sample_id: 'ofs-04-pending-review', run_type: 'official_run' });
    await dismissGuidelineModal(page);

    await expect(page.locator('.preview-bypass-row .rv-choice-group')).toHaveCount(0);
  });

  test('the decision buttons live in the new .rv-decision-row sibling container', async ({ page }) => {
    await gotoReviewerWorkspace(page, { task_id: 'T015', sample_id: 'ofs-04-pending-review', run_type: 'official_run' });
    await dismissGuidelineModal(page);

    await expect(page.locator('.rv-decision-row').getByTestId('ws-review-row-approve')).toHaveCount(1);
  });

  test('the actual answer Bypass chip stays inside .preview-bypass-row (unchanged)', async ({ page }) => {
    await gotoReviewerWorkspace(page, { task_id: 'T015', sample_id: 'ofs-04-pending-review', run_type: 'official_run' });
    await dismissGuidelineModal(page);

    await expect(page.locator('.preview-bypass-row').getByTestId('ws-bypass-single_label')).toHaveCount(1);
  });
});
