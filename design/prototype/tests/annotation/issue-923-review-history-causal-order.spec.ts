/**
 * Review history renders in causal order even when boot-time seed events
 * share the same millisecond timestamp (issue #923).
 *
 * seedReviewFlowDemo() (annotation-workspace.data.js ~line 3299) writes the
 * annotator submit, reviewer decision, and arbitration events for a row in
 * one synchronous forEach pass, and every appendHistoryEvent() call stamps
 * `at: new Date().toISOString()` (~line 329) independently -- so the three
 * events written for the SAME sample land within the same millisecond, and
 * getSampleHistory()'s `String(a.at).localeCompare(String(b.at))` sort
 * (~line 535-537) is a STABLE sort: when `at` ties, whichever event arrived
 * first in the pre-sort concat order stays first.
 *
 * That concat order comes from listSubmissionBucketKeys(), which sorts
 * bucket keys lexicographically (~line 167: `keys.sort()`). For T016's
 * ofm-01-reviewer-corrects-b (annotator kioleemg12, reviewer reviewer_wang
 * modifies, arbiter reviewer_chen adopts the correction -- see the scripts[]
 * row at annotation-workspace.data.js:3429):
 *   - the 'submitted' event AND the 'adjudicated' event both land in the
 *     ANNOTATOR bucket -- submitArbitration() always writes through
 *     appendSampleTimelineEvent(), which hardcodes
 *     submissionBucketKey(taskId, 'annotator', runType, identity) regardless
 *     of the `role` argument it is passed (annotation-workspace.data.js:656),
 *     so they land there in write order: [submitted, adjudicated];
 *   - the 'modified' event lands in the reviewer_wang bucket.
 * `...::annotator::...` sorts lexicographically before `...::reviewer::...`,
 * so listSubmissionBucketKeys() concatenates the merged history as
 * [submitted, adjudicated, modified] -- and because all three `at` values
 * tie, the stable sort leaves that order untouched.
 *
 * The history panel renders newest-first (a `.slice().reverse()` of the
 * sorted array), so the actual DOM order becomes
 * [modified, adjudicated, submitted]: the reviewer's correction renders
 * ABOVE the arbitration that adopted it, inverting the real causal chain
 * (submit -> reviewer correction -> arbitration).
 *
 * This is the only spec that exercises the "same-millisecond timestamp ->
 * stable sort falls back to bucket-key lexicographic order" path.
 * issue-596-history-chain.spec.ts covers the same rendering surface but
 * seeds its own events with strictly INCREASING `at` values via a local
 * `at()` helper, so it never hits a tie. This spec does not seed anything
 * itself -- it navigates a clean browser context straight to the workspace
 * URL and lets seedReviewFlowDemo() run for real (per
 * annotation-review-flow-demo-workspace.spec.ts's pattern), so the
 * timestamp collision under test is the real one the seeder produces, not a
 * simulated one.
 */
import { test, expect } from '@playwright/test';

const WORKSPACE_URL = '/pages/annotation/annotation-workspace.html';

test('T016 ofm-01-reviewer-corrects-b: history panel renders submit -> reviewer correction -> arbitration in causal order', async ({ page }) => {
  await page.goto(
    `${WORKSPACE_URL}?task_id=T016&sample_id=ofm-01-reviewer-corrects-b` +
      `&role=reviewer&run_type=official_run&reviewer_id=reviewer_chen`,
  );

  await page.getByTestId('ws-guideline-tab-history').click();

  const badges = page.locator('.history-item .history-action-badge');
  await expect(badges).toHaveCount(3);

  const actions = await badges.evaluateAll((nodes) =>
    nodes.map((node) => node.getAttribute('data-action')),
  );

  /* Newest-first DOM order, in causal order: arbitration adopted the
     reviewer's correction, which corrected the annotator's submission. */
  expect(actions).toEqual(['adjudicated', 'modified', 'submitted']);
});
