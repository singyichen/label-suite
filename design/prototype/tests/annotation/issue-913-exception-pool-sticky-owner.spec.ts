import { test, expect, type Page } from '@playwright/test';
import { buildWorkspaceUrl, skipGuidelineModal, fillArbitrationReasons, type RunType } from './_workspace-helpers';

/* issue #913: two call sites in annotation-workspace.config.js resolve "the"
 * reviewer submission for a review unit off
 * `data.readReviewerSubmissions(taskId, runType, sampleId, identity)[0]`
 * (buildArbitrationItemRow's `bValue`/arbitrationBChoiceText() at ~config.js
 * :4074/:4295, and buildExceptionPoolItemRow's `reviewerValue` at ~config.js
 * :4492/:4495). That `[0]` is whatever sorts first out of
 * listSubmissionBucketKeys()'s lexicographic key sort (data.js :169), NOT the
 * FR-093 sticky owner -- the reviewer who deterministically holds the unit
 * (earliest submittedAt wins, reviewerId breaks a timestamp tie; see
 * stickyPrecedes()/getStickyReviewers(), data.js :2304-2345).
 *
 * FR-093 normally guarantees exactly one reviewer submission per unit, but a
 * pre-existing shape (leftover submissions from a roster change, or
 * historically-collected junk data) can leave TWO submitted reviewer buckets
 * on the same unit. getDisputeItems() (data.js :2540) only writes an entry
 * into `item.reviewerValues[reviewerId]` for a reviewer whose diff (or
 * bypass/modify/reject decision) actually produced a dispute item -- an
 * AGREEING reviewer contributes nothing there. So when the alphabetically
 * first reviewerId out of `[0]` happens to be one who agreed with the
 * annotator, `item.reviewerValues[thatReviewerId]` is `undefined`:
 *   - buildArbitrationItemRow's `bValue` becomes that `undefined`, so 採 B
 *     finalizes the arbitration item to the WRONG value instead of the
 *     sticky owner's real (disagreeing) value.
 *   - buildExceptionPoolItemRow's `reviewerValue` becomes that `undefined`,
 *     so 採審核員答案 persists `finalized_value: undefined` into the pool
 *     record -- and JSON.stringify silently drops an `undefined`-valued key
 *     on write, so the persisted record ends up with NO `finalized_value`
 *     property at all even though the unit reads as finalized/resolved.
 *
 * The fix (a separate Green pass, not this file) resolves both call sites via
 * the existing sticky-owner derivation instead of `[0]`. This file only
 * proves today's `[0]` pick is wrong, for both entry points.
 *
 * Fixture: T001/sent-001, single_label (positive/neutral/negative options,
 * task-detail.data.js :28), annotator kioleemg12. Two reviewer submissions
 * on the same unit:
 *   - reviewer_wang (the intended FR-093 sticky owner): submits FIRST so it
 *     holds the earlier submittedAt; answers `negative`, DISAGREEING with
 *     the annotator's `positive`, so it produces the dispute item and a
 *     `reviewerValues['reviewer_wang']` entry.
 *   - reviewer_aaa (leftover/extra reviewer): submits SECOND; answers
 *     `positive`, AGREEING with the annotator, so it contributes NO
 *     `reviewerValues` entry. `'reviewer_aaa' < 'reviewer_wang'`
 *     lexicographically, so today's `readReviewerSubmissions(...)[0]` picks
 *     it regardless of submission order or timestamps -- proving the bug is
 *     about bucket-key sort order, not an id tie-break.
 *
 * Traceability: FR-093 (single sticky owner), FR-061 (arbitration finalizes),
 * FR-095 (final exception pool), getStickyReviewers()/stickyPrecedes()
 * (data.js :2304-2345), getDisputeItems() (data.js :2540),
 * buildArbitrationItemRow()/buildExceptionPoolItemRow() (config.js).
 */

type Identity = { annotatorId?: string; reviewerId?: string };

type ReviewerSubmission = { reviewerId: string; submittedAt: string | null };

type ExceptionPoolRecord = {
  resolver_id?: string;
  action?: string;
  finalized_value?: unknown;
  reason?: string;
  resolved_at?: string;
};

type ArbitrationItem = {
  votes?: Array<{ arbiter_id: string; choice: string; voted_at: string; reason?: string }>;
  finalized_value?: unknown;
  finalized_by?: string;
};

type WorkspaceData = {
  markSampleSubmitted: (
    taskId: string, role: string, runType: string, sampleId: string,
    payload: unknown, historySummary: string, identity: Identity
  ) => void;
  readReviewerSubmissions: (
    taskId: string, runType: string, sampleId: string, identity: Identity
  ) => ReviewerSubmission[];
  getExceptionPool: (
    taskId: string, runType: string, sampleId: string, identity: Identity
  ) => Record<string, ExceptionPoolRecord>;
  getArbitrationState: (
    taskId: string, runType: string, sampleId: string, identity: Identity
  ) => Record<string, ArbitrationItem>;
};

/* No `declare global` here: other specs in this directory already
 * declare/cast this window property with their own shapes -- cast per
 * evaluate call instead, same idiom (see issue-596-exception-pool.spec.ts). */

const TASK = 'T001';
const SAMPLE = 'sent-001';
const OUT_KEY = 'single_label';
const ANNOTATOR = 'kioleemg12';
const ANNOTATOR_ANSWER = 'positive';
/* Intended/sticky owner: submits FIRST, disagrees. */
const OWNER = 'reviewer_wang';
const OWNER_ANSWER = 'negative';
/* Extra leftover reviewer: submits SECOND, agrees -- sorts alphabetically
   BEFORE the owner, which is exactly what makes `[0]` pick it today. */
const EXTRA = 'reviewer_aaa';
const EXTRA_ANSWER = ANNOTATOR_ANSWER;
/* Non-participant, can_arbitrate roster entry (same choice as the sibling
   issue-596-exception-pool.spec.ts). */
const ARBITER = 'reviewer_chen';

const IDENTITY: Identity = { annotatorId: ANNOTATOR };

/* Seeds the annotator's answer plus the two reviewer submissions described
 * in the file header, then verifies -- per the documented timestamp-ordering
 * hazard -- that the two sequential reviewer submissions actually landed at
 * different, correctly-ordered millisecond timestamps. markSampleSubmitted()
 * stamps `submittedAt` itself (no explicit-timestamp override), so this
 * empirical check is what makes the fixture trustworthy: the sticky-owner
 * tie-break falls back to comparing reviewerId only when two `submittedAt`
 * values are EXACTLY equal, and this test must prove the bug is really about
 * `[0]`/bucket-key sort order, not an accidental id tie-break. */
async function seedDisputedUnitWithExtraReviewer(page: Page, runType: RunType): Promise<void> {
  await page.goto(buildWorkspaceUrl({ task_id: TASK, sample_id: SAMPLE, role: 'annotator', run_type: runType }));

  const submit = (role: string, value: string, identity: Identity) =>
    page.evaluate((a) => {
      (window as unknown as { LabelSuiteAnnotationWorkspaceData: WorkspaceData })
        .LabelSuiteAnnotationWorkspaceData.markSampleSubmitted(
          a.task, a.role, a.runType, a.sample,
          { previewState: { [a.outKey]: { selected: a.value } } }, '', a.identity
        );
    }, { task: TASK, sample: SAMPLE, outKey: OUT_KEY, runType, role, value, identity });

  await submit('annotator', ANNOTATOR_ANSWER, IDENTITY);
  // Owner submits FIRST (sequential await, no sleep) so it also holds the
  // earlier submittedAt.
  await submit('reviewer', OWNER_ANSWER, { annotatorId: ANNOTATOR, reviewerId: OWNER });
  // Extra agreeing reviewer submits SECOND.
  await submit('reviewer', EXTRA_ANSWER, { annotatorId: ANNOTATOR, reviewerId: EXTRA });

  const submissions = await page.evaluate((a) =>
    (window as unknown as { LabelSuiteAnnotationWorkspaceData: WorkspaceData })
      .LabelSuiteAnnotationWorkspaceData.readReviewerSubmissions(a.task, a.runType, a.sample, a.identity),
    { task: TASK, runType, sample: SAMPLE, identity: IDENTITY }
  );
  const ownerSubmission = submissions.find((s) => s.reviewerId === OWNER);
  const extraSubmission = submissions.find((s) => s.reviewerId === EXTRA);
  expect(ownerSubmission?.submittedAt, 'owner submission must have landed with a timestamp').toBeTruthy();
  expect(extraSubmission?.submittedAt, 'extra submission must have landed with a timestamp').toBeTruthy();
  expect(
    ownerSubmission!.submittedAt,
    'owner and extra submissions must NOT collide on the same millisecond, or the reviewerId tie-break (not sort order) would decide the sticky owner'
  ).not.toEqual(extraSubmission!.submittedAt);
  expect(
    ownerSubmission!.submittedAt! < extraSubmission!.submittedAt!,
    'owner submitted first and must hold the earlier submittedAt'
  ).toBe(true);
}

/* Reaches the arbiter's open dispute item for the seeded unit. */
async function gotoArbiterWorkspace(page: Page, runType: RunType): Promise<void> {
  await page.goto(buildWorkspaceUrl({
    task_id: TASK, sample_id: SAMPLE, role: 'reviewer', run_type: runType,
    annotator_id: ANNOTATOR, reviewer_id: ARBITER,
  }));
}

function readArbitrationState(page: Page, runType: RunType): Promise<Record<string, ArbitrationItem>> {
  return page.evaluate((a) =>
    (window as unknown as { LabelSuiteAnnotationWorkspaceData: WorkspaceData })
      .LabelSuiteAnnotationWorkspaceData.getArbitrationState(a.task, a.runType, a.sample, a.identity),
    { task: TASK, runType, sample: SAMPLE, identity: IDENTITY }
  );
}

/* No shared helper builds a `role=project_leader` URL: _workspace-helpers.ts's
 * `Role` type is intentionally `'annotator' | 'reviewer'` only (out of scope
 * to edit here), so this local builder mirrors the sibling
 * issue-596-exception-pool.spec.ts's exact path/query convention. */
function buildProjectLeaderUrl(runType: RunType): string {
  return `/pages/annotation/annotation-workspace.html?task_id=${TASK}&sample_id=${SAMPLE}&role=project_leader&run_type=${runType}&annotator_id=${ANNOTATOR}`;
}

function readExceptionPool(page: Page, runType: RunType): Promise<Record<string, ExceptionPoolRecord>> {
  return page.evaluate((a) =>
    (window as unknown as { LabelSuiteAnnotationWorkspaceData: WorkspaceData })
      .LabelSuiteAnnotationWorkspaceData.getExceptionPool(a.task, a.runType, a.sample, a.identity),
    { task: TASK, runType, sample: SAMPLE, identity: IDENTITY }
  );
}

test.beforeEach(async ({ page }) => {
  await skipGuidelineModal(page);
});

test.describe('issue #913: exception pool / arbitration must pick the FR-093 sticky owner, not bucket-key sort order [0]', () => {
  test('exception pool 採審核員答案 (adopt_reviewer) finalizes to the sticky owner\'s value, not the agreeing reviewer\'s', async ({ page }) => {
    await seedDisputedUnitWithExtraReviewer(page, 'official_run');

    await gotoArbiterWorkspace(page, 'official_run');
    const item = page.getByTestId('ws-arbitration-item').first();
    await item.getByTestId('ws-arbitration-choose-reject').click();
    await fillArbitrationReasons(page);
    await page.getByTestId('ws-arbitration-submit').click();
    await expect
      .poll(async () => JSON.stringify(await readArbitrationState(page, 'official_run')))
      .toContain('"choice":"reject"');

    await page.goto(buildProjectLeaderUrl('official_run'));
    await page.getByTestId('ws-exception-pool-item').first()
      .getByTestId('ws-exception-pool-action-adopt_reviewer').click();

    const pool = await readExceptionPool(page, 'official_run');
    // Red: today's code resolves `reviewerValue` off `readReviewerSubmissions(...)[0]`
    // (`reviewer_aaa`, the agreeing reviewer), whose reviewerValues entry is
    // `undefined` -- JSON.stringify drops it, so `finalized_value` is absent.
    // Once fixed, the sticky owner `reviewer_wang`'s value (`negative`) must
    // be what gets persisted.
    expect(pool[OUT_KEY]).toMatchObject({
      action: 'adopt_reviewer',
      finalized_value: OWNER_ANSWER,
    });
  });

  test('arbitration 採 B finalizes to the sticky owner\'s value, not the agreeing reviewer\'s', async ({ page }) => {
    await seedDisputedUnitWithExtraReviewer(page, 'official_run');

    await gotoArbiterWorkspace(page, 'official_run');
    const item = page.getByTestId('ws-arbitration-item').first();
    await item.getByTestId('ws-arbitration-choose-b').click();
    await fillArbitrationReasons(page);
    await page.getByTestId('ws-arbitration-submit').click();

    const state = await readArbitrationState(page, 'official_run');
    const stored = state[`${OUT_KEY}::${OUT_KEY}`];
    // Arbitration completed (a value got finalized)...
    expect(stored?.finalized_by, 'arbitration must have finalized this item').toBeTruthy();
    // ...but Red: today's `bValue` is `item.reviewerValues['reviewer_aaa']`
    // (`undefined`, since the agreeing reviewer produced no dispute value),
    // not the sticky owner reviewer_wang's real `negative`.
    expect(stored?.finalized_value).toBe(OWNER_ANSWER);
  });
});
