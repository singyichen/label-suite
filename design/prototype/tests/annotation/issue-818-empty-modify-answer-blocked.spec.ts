import { test, expect, type Page } from '@playwright/test';
import { buildWorkspaceUrl, dismissGuidelineModal, skipGuidelineModal } from './_workspace-helpers';

/* issue #818 (FR-083, spec 015): submit validation gains a third per-outKey
 * blocker -- decision `modify` (修正) with a non-empty reason but an EMPTY
 * corrected answer. Before this change the invariant "values[outKey] exists
 * only for modify; bypass deliberately stores no value" lived only in an
 * implementation comment, so an empty 修正 reached storage and was
 * indistinguishable from 無法判定 at the data layer.
 *
 * The delta pins three things, and only those are asserted here:
 *   1. the submit aborts, the toast names the outKey, and NO reviewer
 *      submission is written (verified through the data layer, not the UI);
 *   2. the block comes from the same per-outKey derivation as the other two
 *      blockers -- observable as the outKey joining the same toast list;
 *   3. 無法判定 (bypass) with an empty answer is NOT blocked.
 * The toast copy/key for the new blocker is deliberately left to Green.
 *
 * The correction control for single_label is the engine chip row: clicking
 * the already-selected chip toggles it off (task-config.engine.js
 * `ps.selected = ps.selected === label.name ? null : label.name`), which is
 * how a reviewer empties the pre-filled answer.
 */

type Identity = { annotatorId?: string; reviewerId?: string };

type WorkspaceData = {
  getSubmission: (taskId: string, role: string, runType: string, sampleId: string, identity: Identity) => unknown;
};

const TASK = 'T001';
const SAMPLE = 'sent-001';
const REVIEWER_IDENTITY: Identity = { annotatorId: 'kioleemg12', reviewerId: 'reviewer_wang' };

async function readReviewerSubmission(page: Page) {
  return page.evaluate(
    ([t, s, id]) =>
      (window as unknown as { LabelSuiteAnnotationWorkspaceData: WorkspaceData }).LabelSuiteAnnotationWorkspaceData
        .getSubmission(t, 'reviewer', 'official_run', s, id as Identity),
    [TASK, SAMPLE, REVIEWER_IDENTITY] as const
  );
}

async function openReviewerWithAnnotatorAnswer(page: Page) {
  await page.goto(buildWorkspaceUrl({ task_id: TASK, sample_id: SAMPLE, role: 'annotator' }));
  await dismissGuidelineModal(page);
  await page.getByTestId('ws-single-label-chip-negative').click();
  await page.getByTestId('ws-submit-btn').click();

  await page.goto(buildWorkspaceUrl({ task_id: TASK, sample_id: SAMPLE, role: 'reviewer', run_type: 'official_run' }));
  await dismissGuidelineModal(page);
}

/* AC-3.42: a decision never outlives the answer it judged -- editing the
 * correction after deciding resets the decision. So the answer is emptied
 * FIRST and the decision taken against the empty value, the only order in
 * which an empty 修正 can reach submit. */
async function emptyCorrection(page: Page) {
  const chip = page.getByTestId('ws-single-label-chip-negative');
  await chip.click();
  await expect(chip).toHaveAttribute('aria-pressed', 'false');
}

test.beforeEach(async ({ page }) => {
  await skipGuidelineModal(page);
  test.setTimeout(60_000);
});

test.describe('issue #818: 修正 with an empty corrected answer blocks review submit', () => {
  test('修正 + reason + emptied answer aborts submit, names the outKey, writes nothing', async ({ page }) => {
    await openReviewerWithAnnotatorAnswer(page);

    const row = page.getByTestId('ws-review-row').first();
    await emptyCorrection(page);
    await row.getByTestId('ws-review-row-modify').click();
    await row.getByTestId('ws-review-reason').fill('修正（測試理由，答案已清空）');

    await page.getByTestId('ws-review-submit-btn').click();

    await expect(page.locator('#toast')).toHaveClass(/toast-warning/);
    await expect(page.locator('#toastMsg')).toContainText('single_label');
    await expect(page.locator('#toastMsg')).not.toHaveText('審核已送出');
    expect(await readReviewerSubmission(page)).toBeNull();
  });

  test('無法判定 with an empty answer is not blocked', async ({ page }) => {
    await openReviewerWithAnnotatorAnswer(page);

    const row = page.getByTestId('ws-review-row').first();
    // 無法判定 leaves the pre-filled answer on the panel (issue #750), so
    // empty it explicitly to make the answer-empty case real.
    await emptyCorrection(page);
    await row.getByTestId('ws-review-row-bypass').click();
    await row.getByTestId('ws-review-reason').fill('無法判定（測試理由）');

    await page.getByTestId('ws-review-submit-btn').click();

    await expect(page.locator('#toastMsg')).toHaveText('審核已送出');
    expect(await readReviewerSubmission(page)).not.toBeNull();
  });
});
