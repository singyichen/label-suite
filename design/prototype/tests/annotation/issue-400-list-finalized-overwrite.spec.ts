import { test, expect } from '@playwright/test';
import { buildListUrl, buildWorkspaceUrl, fillArbitrationReasons, skipGuidelineModal } from './_workspace-helpers';

type WorkspaceData = {
  markSampleSubmitted: (
    taskId: string, role: string, runType: string, sampleId: string,
    payload: unknown, historySummary: string,
    identity: { annotatorId?: string; reviewerId?: string }
  ) => void;
};

/* Issue #400: the annotation list's 標記結果 column kept showing the
 * annotator's ORIGINAL answer for a finalized review unit even after the
 * unit resolved to a different value -- the workspace's finalized card
 * already showed the resolved value, but the list, used as a scan-only
 * entry point, silently disagreed with it.
 *
 * issue #596 (FR-093) replaced the mechanism that used to produce that
 * divergence. There is no reviewer quorum and no per-item majority
 * convergence any more: exactly one reviewer owns a unit, and a unit whose
 * reviewer disagrees with the annotator goes to arbitration, where the
 * arbiter's 採 A／採 B writes the finalized value (FR-061). The list bug this
 * file guards is unchanged -- only the way a unit reaches a finalized value
 * that differs from the annotator's is. So the fixture is now the
 * arbitration path: the reviewer's dissent is seeded in-test on top of
 * T015's PENDING sample rather than relying on a demo seed whose reviewer
 * roster group 7 rewrites (task 7.4).
 *
 * Traceability: FR-061 (arbitration finalizes), FR-093 (single owner),
 * getFinalizedOverwrites() in annotation-list.html.
 */

const TASK = 'T015';
const SAMPLE = 'ofs-04-pending-review';
// The demo seed already files the annotator's `positive` for this sample
// (annotation-workspace.data.js seed matrix) and leaves it PENDING with no
// reviewer, so only the reviewer's dissenting answer has to be seeded here.
const ANNOTATOR_ANSWER = 'positive';
const REVIEWER_ANSWER = 'negative';
/* FR-093 derives the owner of each unit positionally from the roster, so the
   dissent has to be filed by whoever actually owns this unit -- reviewer_lin
   for ofs-04 -- and the list has to be read back as that same reviewer. Any
   other identity is filtered off the row entirely (filterToAssignedUnits),
   which is why this file's fixture names the assignee explicitly instead of
   picking an arbitrary reviewer. reviewer_chen stays the arbiter: they carry
   can_arbitrate and hold no submission on this unit (FR-060). */
const ASSIGNED_REVIEWER = 'reviewer_lin';
const ARBITER = 'reviewer_chen';

function reviewerWorkspaceUrl(reviewerId: string): string {
  return buildWorkspaceUrl({
    task_id: TASK, sample_id: SAMPLE, role: 'reviewer',
    run_type: 'official_run', reviewer_id: reviewerId,
  });
}

test('issue #400: a finalized unit\'s list row shows the arbitrated answer, not the annotator\'s original one', async ({ page }) => {
  await skipGuidelineModal(page);

  // The data-layer global only exists once the app script has loaded, so
  // navigate first, seed, then reload to pick the seeded bucket up.
  await page.goto(reviewerWorkspaceUrl(ARBITER));
  await page.evaluate(({ task, sample, reviewerAnswer, assignedReviewer }) => {
    const data = (window as unknown as { LabelSuiteAnnotationWorkspaceData: WorkspaceData })
      .LabelSuiteAnnotationWorkspaceData;
    data.markSampleSubmitted(
      task, 'reviewer', 'official_run', sample,
      { previewState: { single_label: { selected: reviewerAnswer } } }, '',
      { reviewerId: assignedReviewer }
    );
  }, { task: TASK, sample: SAMPLE, reviewerAnswer: REVIEWER_ANSWER, assignedReviewer: ASSIGNED_REVIEWER });
  await page.reload();

  // The arbiter filed no review of their own, so they are the arbiter
  // candidate (isArbiterCandidate) for this now-disputed unit.
  await expect(page.getByTestId('ws-arbitration-card')).toBeVisible();
  await page.getByTestId('ws-arbitration-choose-b').click();
  await fillArbitrationReasons(page);
  await page.getByTestId('ws-arbitration-submit').click();

  // Sanity check: the workspace itself now reports the unit as finalized on
  // the reviewer's value, confirming the fixture reached the state the issue
  // describes before asserting on the list.
  await expect(page.locator('[data-testid="ws-review-unit-context"] .rv-unit-state'))
    .toHaveText('已定稿 · 已鎖定');
  await expect(page.getByTestId('ws-finalized-resolved')).toContainText(REVIEWER_ANSWER);

  await page.goto(buildListUrl({
    task_id: TASK, role: 'reviewer', run_type: 'official_run', reviewer_id: ASSIGNED_REVIEWER,
  }));

  const row = page.getByTestId('ws-sample-item').filter({ hasText: SAMPLE });
  await expect(row.locator('.status-badge')).toHaveText('已定稿 · 已鎖定');
  // The regression this file exists for: the cell must follow the finalized
  // value, not freeze on the annotator's original mockRow answer.
  await expect(row.getByTestId('list-review-answer')).toHaveText(REVIEWER_ANSWER);
  await expect(row.getByTestId('list-review-answer')).not.toHaveText(ANNOTATOR_ANSWER);
  await expect(row.getByTestId('list-review-overwritten-badge')).toBeVisible();
});
