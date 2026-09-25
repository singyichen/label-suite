import { test, expect } from '@playwright/test';
import { buildListUrl, buildWorkspaceUrl, skipGuidelineModal } from './_workspace-helpers';

/* Issue #903: canonical spec 015 v5.0.0 retired majority-of-N convergence
 * together with DISPUTE_CONVERGENCE_RULE, but annotation-list.html kept
 * resolveDisputeConvergence() as a fallback for choosing the answer a
 * FINALIZED review unit displays. Historical `votes` therefore could still
 * decide the 標記結果 column.
 *
 * The contract: the answer a finalized unit shows may come only from
 * arbitration (`finalized_by`) or from an exception-pool disposition that
 * actually carries a value. A tally of historical reviewer values must
 * never choose it.
 *
 * Fixture history (issue #914): this file originally reached FINALIZED via
 * a pool record with NO `finalized_value` property at all -- exactly
 * issue #913's producer-bug shape (採審核員答案 resolving off
 * `readReviewerSubmissions(...)[0]`, the lexicographic-first bucket, not
 * the FR-093 sticky owner, whose value went missing to JSON.stringify
 * dropping an `undefined` key). That shape let a valueless record still
 * derive `finalized` under the pre-#914 `getReviewUnitStatus()`, exercising
 * the retired-fallback question this file guards.
 *
 * Both producer bugs are now fixed (issue #913's `[0]` -> sticky owner;
 * issue #914's `getReviewUnitStatus()` / `getFinalizedOverwrites()` /
 * `getFinalizationSourceKeys()` now share `hasLegitimateFinalizedValue()`,
 * which requires the pool record to actually carry `finalized_value`). A
 * valueless `adopt_reviewer` record can no longer reach FINALIZED at all --
 * `getReviewUnitStatus()` now keeps it `disputed`, so this file's old
 * scaffold is not a shape the system can produce, and asserting against it
 * would no longer exercise `getFinalizedOverwrites()` in the first place
 * (CI: `.status-badge` derived `爭議中 · 未定稿`, never reaching the
 * fallback-vs-disposition comparison this file exists to make).
 *
 * The scaffold below reaches FINALIZED the way #913+#914-fixed production
 * code actually does: `adopt_reviewer` resolves to the FR-093 sticky
 * owner's (`reviewer_lin`) real submitted value (`OWNER_ANSWER`). The
 * majority-fallback question stays meaningful because the two OTHER
 * reviewer submissions are constructed to both agree with the annotator --
 * under the retired rule, an implicit annotator vote is exactly how a
 * reviewer whose answer matches the annotator's counted (no diff item, see
 * getDisputeItems()), so 2 of 3 submissions (both extras) would converge the
 * retired algorithm on `ANNOTATOR_ANSWER`, a value distinct from the real,
 * legitimate `OWNER_ANSWER` the pool record actually carries. If a majority
 * tally still secretly decided the display, it would show
 * `ANNOTATOR_ANSWER`; the legitimate disposition must win instead.
 *
 * Traceability: FR-061 (arbitration finalizes), FR-093 (single owner),
 * FR-095 (adopt_reviewer), spec 015 v5.0.0 (DISPUTE_CONVERGENCE_RULE /
 * FR-074 retired), v6.21.0 (issue #914, hasLegitimateFinalizedValue()),
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
/* FR-093 derives this unit's owner positionally; reviewer_lin owns ofs-04,
   so the list must be read back as reviewer_lin or filterToAssignedUnits
   drops the row entirely. The value it submits here is what `adopt_reviewer`
   legitimately resolves to (issue #914: the pool record's finalized_value
   must be the sticky owner's real answer, not a fabricated or absent one). */
const ASSIGNED_REVIEWER = 'reviewer_lin';
const OWNER_ANSWER = 'negative';
/* Two extra reviewer submissions exist only to push the reviewer count to 3,
   clearing the retired majority rule's strict > N/2 bar -- both ids sort
   AFTER `reviewer_lin`, so the sticky owner stays lin even when every
   submittedAt lands in the same millisecond (stickyPrecedes falls back to
   the reviewer id). Both agree with the annotator (contribute no dispute
   item, an implicit vote for ANNOTATOR_ANSWER under the retired rule) so
   the retired algorithm's would-be answer (2 of 3: both extras) is a value
   DISTINCT from OWNER_ANSWER -- the only way this file can still tell
   "used the real disposition" apart from "fell back to a historical tally"
   now that the disposition itself must carry a real value (issue #914). */
const EXTRA_AGREER_ONE = 'reviewer_zzz';
const EXTRA_AGREER_TWO = 'reviewer_maa';

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
    submit(a.owner, a.ownerAnswer);
    // Both extras agree with the annotator -- no dispute item, an implicit
    // vote for ANNOTATOR_ANSWER under the retired majority rule.
    submit(a.agreerOne, a.annotatorAnswer);
    submit(a.agreerTwo, a.annotatorAnswer);

    /* issue #914: a legitimate `adopt_reviewer` disposition -- the sticky
       owner's real submitted value, matching what production code (issue
       #913's fix) now resolves to and what issue #914's
       hasLegitimateFinalizedValue() now requires the record to carry. */
    window.localStorage.setItem(a.poolKey, JSON.stringify({
      [a.outKey]: {
        resolver_id: 'lead@labelsuite.io',
        action: 'adopt_reviewer',
        finalized_value: a.ownerAnswer,
        reason: '',
        resolved_at: new Date().toISOString(),
      },
    }));
  }, {
    task: TASK, sample: SAMPLE, outKey: OUT_KEY, annotator: ANNOTATOR,
    owner: ASSIGNED_REVIEWER, agreerOne: EXTRA_AGREER_ONE, agreerTwo: EXTRA_AGREER_TWO,
    ownerAnswer: OWNER_ANSWER, annotatorAnswer: ANNOTATOR_ANSWER,
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

  // The regression: a historical tally across all reviewer submissions
  // (2 of 3 implicitly favor the annotator's answer under the retired rule)
  // must not get to choose the displayed value -- only the real
  // adopt_reviewer disposition (the sticky owner's actual answer) may.
  await expect(row.getByTestId('list-review-answer')).not.toHaveText(ANNOTATOR_ANSWER);
  await expect(row.getByTestId('list-review-answer')).toHaveText(OWNER_ANSWER);
});
