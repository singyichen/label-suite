import { test, expect } from '@playwright/test';
import { buildListUrl, buildWorkspaceUrl, skipGuidelineModal } from './_workspace-helpers';

/* Issue #903: canonical spec 015 v5.0.0 retired majority-of-N convergence
 * together with DISPUTE_CONVERGENCE_RULE, but annotation-list.html kept
 * resolveDisputeConvergence() as a fallback for choosing the answer a
 * FINALIZED review unit displays. Historical `votes` therefore could still
 * decide the 標記結果 column.
 *
 * Reaching that fallback needs all three of these at once:
 *   1. the unit derives as FINALIZED -- getReviewUnitStatus()'s allResolved
 *      accepts any exception-pool record whose action is not
 *      `exclude_from_dataset`, WITHOUT checking it carries a value;
 *   2. the stored arbitration item has no `finalized_by`, so
 *      getFinalizedOverwrites() falls past its first branch;
 *   3. the pool record has no `finalized_value` property, so the
 *      pool early-return does not fire either.
 * Production reaches state 3 on its own: the exception pool's 採審核員答案
 * button resolves the reviewer value off readReviewerSubmissions(...)[0]
 * -- the lexicographically first bucket rather than the FR-093 sticky
 * owner -- which is `undefined` when that reviewer agreed with the
 * annotator, and JSON.stringify drops an `undefined`-valued key on write.
 * That producer is tracked separately as issue #913, and the status-vs-value
 * asymmetry in (1) as issue #914; this file seeds the resulting state
 * directly so the contract it guards stays meaningful no matter how those
 * two are fixed.
 *
 * The contract: the answer a finalized unit shows may come only from
 * arbitration (`finalized_by`) or from an exception-pool disposition that
 * actually carries a value. A tally of historical reviewer values must
 * never choose it.
 *
 * Traceability: FR-061 (arbitration finalizes), FR-093 (single owner),
 * spec 015 v5.0.0 (DISPUTE_CONVERGENCE_RULE / FR-074 retired),
 * getFinalizedOverwrites() in annotation-list.html.
 */

type WorkspaceData = {
  markSampleSubmitted: (
    taskId: string, role: string, runType: string, sampleId: string,
    payload: unknown, historySummary: string,
    identity: { annotatorId?: string; reviewerId?: string }
  ) => void;
};

const TASK = 'T015';
const SAMPLE = 'ofs-04-pending-review';
const OUT_KEY = 'single_label';
// The demo seed files kioleemg12's `positive` for this sample and leaves it
// PENDING with no reviewer (annotation-workspace.data.js seed matrix).
const ANNOTATOR = 'kioleemg12';
const ANNOTATOR_ANSWER = 'positive';
/* The value a majority tally WOULD converge on: two of the three reviewer
   submissions hold it, which clears the retired rule's strict > N/2 bar. */
const CONVERGENCE_ANSWER = 'negative';
/* FR-093 derives this unit's owner positionally; reviewer_lin owns ofs-04,
   so the list must be read back as reviewer_lin or filterToAssignedUnits
   drops the row entirely. The two extra submissions exist only to push the
   reviewer count to 3 -- both ids sort AFTER `reviewer_lin`, so the sticky
   owner stays lin even when every submittedAt lands in the same
   millisecond (stickyPrecedes falls back to the reviewer id). */
const ASSIGNED_REVIEWER = 'reviewer_lin';
const EXTRA_DISSENTER = 'reviewer_zzz';
const EXTRA_AGREER = 'reviewer_maa';

const POOL_KEY = `labelsuite.wsExceptionPool.${TASK}::official_run::${ANNOTATOR}::${SAMPLE}`;

test('issue #903: historical majority votes never decide a finalized unit\'s list answer', async ({ page }) => {
  await skipGuidelineModal(page);

  // The data-layer global only exists once the app script has loaded.
  await page.goto(buildWorkspaceUrl({
    task_id: TASK, sample_id: SAMPLE, role: 'reviewer',
    run_type: 'official_run', reviewer_id: ASSIGNED_REVIEWER,
  }));

  await page.evaluate((a) => {
    const data = (window as unknown as { LabelSuiteAnnotationWorkspaceData: WorkspaceData })
      .LabelSuiteAnnotationWorkspaceData;
    const submit = (reviewerId: string, selected: string) =>
      data.markSampleSubmitted(
        a.task, 'reviewer', 'official_run', a.sample,
        { previewState: { [a.outKey]: { selected } } }, '',
        { annotatorId: a.annotator, reviewerId }
      );
    // Seed the owner first so it also holds the earliest submittedAt.
    submit(a.owner, a.convergence);
    submit(a.dissenter, a.convergence);
    // Agrees with the annotator, so it contributes no dispute item and is
    // absent from reviewerValues -- an implicit vote for the annotator.
    submit(a.agreer, a.annotatorAnswer);

    /* A disposition that finalizes the unit but carries NO value -- exactly
       what issue #913's producer writes. No arbitration record is seeded,
       so no item carries `finalized_by` either. */
    window.localStorage.setItem(a.poolKey, JSON.stringify({
      [a.outKey]: {
        resolver_id: 'lead@labelsuite.io',
        action: 'adopt_reviewer',
        reason: '',
        resolved_at: new Date().toISOString(),
      },
    }));
  }, {
    task: TASK, sample: SAMPLE, outKey: OUT_KEY, annotator: ANNOTATOR,
    owner: ASSIGNED_REVIEWER, dissenter: EXTRA_DISSENTER, agreer: EXTRA_AGREER,
    convergence: CONVERGENCE_ANSWER, annotatorAnswer: ANNOTATOR_ANSWER,
    poolKey: POOL_KEY,
  });

  await page.goto(buildListUrl({
    task_id: TASK, role: 'reviewer', run_type: 'official_run',
    reviewer_id: ASSIGNED_REVIEWER,
  }));

  const row = page.getByTestId('ws-sample-item').filter({ hasText: SAMPLE });

  /* Fixture sanity: the unit must actually derive as finalized, otherwise
     getFinalizedOverwrites() is never called and this test would pass
     without ever exercising the fallback. */
  await expect(row.locator('.status-badge')).toHaveText('已定稿 · 已鎖定');

  // The regression: no disposition supplied a value and no arbitration
  // finalized an item, so the tally must not get to choose one.
  await expect(row.getByTestId('list-review-answer')).not.toHaveText(CONVERGENCE_ANSWER);
  await expect(row.getByTestId('list-review-answer')).toHaveText(ANNOTATOR_ANSWER);
});
