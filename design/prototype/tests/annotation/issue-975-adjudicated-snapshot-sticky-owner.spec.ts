import { test, expect, type Page } from '@playwright/test';
import { buildWorkspaceUrl, skipGuidelineModal, fillArbitrationReasons, type RunType } from './_workspace-helpers';

/* issue #975: arbitrationFinalizedSnapshot()'s `adopt_b` branch
 * (annotation-workspace.data.js, ~line 2917-2926) still resolves the unit's
 * reviewer via `readReviewerSubmissions(taskId, runType, sampleId, identity)[0]`
 * -- whatever sorts first out of listSubmissionBucketKeys()'s lexicographic
 * key sort (data.js :169) -- instead of the FR-093 sticky owner
 * (getStickyReviewers()/getStickyReviewerId(), data.js ~2354-2387).
 *
 * That return value feeds submitArbitration()'s `resultSnapshot` argument
 * (~line 2942-2963) into appendSampleTimelineEvent(), which stores it as the
 * `result_snapshot` field on the sample's 'adjudicated' history event (the
 * annotator's own submission bucket, read back via getSampleHistory()).
 *
 * The SIBLING read path -- `finalized_value` on the same arbitration item,
 * read via getArbitrationState() -- already resolves the sticky owner
 * correctly: buildArbitrationCard() (annotation-workspace.config.js) was
 * fixed in issue #913 to go through resolveStickyReviewerSubmission()
 * instead of `[0]`. `arbitrationFinalizedSnapshot()`'s `adopt_b` branch is a
 * SEPARATE call site issue #913 did not touch, so today it can disagree
 * with `finalized_value` about which reviewer's answer the same arbitration
 * decision actually adopted -- exactly the shape FR-061 point 2 (v6.20.0
 * clarification, issue #913) already forbids for B's value and its dynamic
 * rendering: "B 值與其動態渲染所讀取之「該單位審核員」，必須沿用 FR-093（1）
 * 已定義之 sticky 擁有者（getStickyReviewers()），不得依儲存掃描順序（如
 * bucket key 字典序）挑選". This issue applies that same principle to the
 * one read site it left uncovered: `result_snapshot`.
 *
 * Fixture: T001/sent-001, single_label (positive/neutral/negative options,
 * task-detail.data.js :28), annotator kioleemg12. TWO reviewer submissions
 * on the same unit -- the leftover-data shape FR-093 normally forbids but
 * that issue #913's sibling test already proves can occur:
 *   - reviewer_wang (the intended FR-093 sticky owner): submits FIRST so it
 *     holds the earlier submittedAt; answers `negative`.
 *   - reviewer_aaa (leftover/extra reviewer): submits SECOND; answers
 *     `neutral` -- a THIRD value, distinct from both the annotator's
 *     `positive` and the owner's `negative`, so a bug hit is unambiguous in
 *     the assertion output. `'reviewer_aaa' < 'reviewer_wang'`
 *     lexicographically (already established by the sibling
 *     issue-913-exception-pool-sticky-owner.spec.ts), so today's
 *     `readReviewerSubmissions(...)[0]` picks reviewer_aaa regardless of
 *     submission order or timestamps.
 *
 * Traceability: FR-061 point 2 (B value must follow the FR-093（1）sticky
 * owner), FR-093（1）(single sticky owner per review unit), issue #913
 * (fixed the finalized_value/UI read site), issue #975 (this file --
 * result_snapshot read site still unfixed).
 */

type Identity = { annotatorId?: string; reviewerId?: string };

type ReviewerSubmission = { reviewerId: string; submittedAt: string | null };

type ArbitrationItem = {
  votes?: Array<{ arbiter_id: string; choice: string; voted_at: string; reason?: string }>;
  finalized_value?: unknown;
  finalized_by?: string;
};

type ResultSnapshot = { previewState?: Record<string, { selected?: string }> } | null;

type HistoryEvent = {
  action?: string;
  role?: string;
  result_snapshot?: ResultSnapshot;
};

type WorkspaceData = {
  markSampleSubmitted: (
    taskId: string, role: string, runType: string, sampleId: string,
    payload: unknown, historySummary: string, identity: Identity
  ) => void;
  readReviewerSubmissions: (
    taskId: string, runType: string, sampleId: string, identity: Identity
  ) => ReviewerSubmission[];
  getArbitrationState: (
    taskId: string, runType: string, sampleId: string, identity: Identity
  ) => Record<string, ArbitrationItem>;
  getSampleHistory: (
    taskId: string, runType: string, sampleId: string, identity: Identity
  ) => HistoryEvent[];
};

/* No `declare global` here: other specs in this directory already
 * declare/cast this window property with their own shapes -- cast per
 * evaluate call instead, same idiom (see issue-913-exception-pool-sticky
 * -owner.spec.ts, issue-914-finalized-value-validation.spec.ts). */

const TASK = 'T001';
const SAMPLE = 'sent-001';
const OUT_KEY = 'single_label';
const ITEM_ID = `${OUT_KEY}::${OUT_KEY}`;
const ANNOTATOR = 'kioleemg12';
const ANNOTATOR_ANSWER = 'positive';
/* Intended/sticky owner (FR-093（1）): submits FIRST, disagrees. */
const OWNER = 'reviewer_wang';
const OWNER_ANSWER = 'negative';
/* Extra leftover reviewer: submits SECOND -- sorts alphabetically BEFORE
   the owner, which is exactly what makes `[0]` pick it today. Answers a
   THIRD value distinct from both ANNOTATOR_ANSWER and OWNER_ANSWER so a bug
   hit is unambiguous. */
const EXTRA = 'reviewer_aaa';
const EXTRA_ANSWER = 'neutral';
/* Non-participant, can_arbitrate roster entry. */
const ARBITER = 'reviewer_chen';

const IDENTITY: Identity = { annotatorId: ANNOTATOR };

/* Seeds the annotator's answer plus the two reviewer submissions described
 * in the file header (owner first, extra second), then sanity-checks --
 * per the sibling issue-913 fixture -- that the two sequential reviewer
 * submissions landed at different, correctly-ordered millisecond
 * timestamps, so the sticky-owner derivation is really exercising sort
 * order (FR-093（1）'s stickyPrecedes()), not an accidental id tie-break. */
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
  // Extra reviewer submits SECOND.
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

function readSampleHistory(page: Page, runType: RunType): Promise<HistoryEvent[]> {
  return page.evaluate((a) =>
    (window as unknown as { LabelSuiteAnnotationWorkspaceData: WorkspaceData })
      .LabelSuiteAnnotationWorkspaceData.getSampleHistory(a.task, a.runType, a.sample, a.identity),
    { task: TASK, runType, sample: SAMPLE, identity: IDENTITY }
  );
}

test.beforeEach(async ({ page }) => {
  await skipGuidelineModal(page);
});

test.describe('issue #975: adjudicated history event result_snapshot must follow the FR-093 sticky owner, not bucket-key sort order [0]', () => {
  test('採 B finalizes result_snapshot to the sticky owner\'s value, matching the same arbitration\'s finalized_value', async ({ page }) => {
    await seedDisputedUnitWithExtraReviewer(page, 'official_run');

    await gotoArbiterWorkspace(page, 'official_run');
    const item = page.getByTestId('ws-arbitration-item').first();
    await item.getByTestId('ws-arbitration-choose-b').click();
    await fillArbitrationReasons(page);
    await page.getByTestId('ws-arbitration-submit').click();

    // Sanity check: finalized_value already reads correctly today (fixed by
    // issue #913's buildArbitrationCard() sticky-owner lookup). This is not
    // the Red assertion -- it establishes the baseline result_snapshot must
    // agree with. Poll (rather than read once) because submitArbitration()'s
    // write lands asynchronously relative to the click.
    await expect
      .poll(async () => (await readArbitrationState(page, 'official_run'))[ITEM_ID]?.finalized_by ?? null)
      .toBeTruthy();
    const finalizedItem = (await readArbitrationState(page, 'official_run'))[ITEM_ID];
    expect(finalizedItem?.finalized_value).toBe(OWNER_ANSWER);

    // Red: today's arbitrationFinalizedSnapshot() resolves `adopt_b`'s
    // reviewer via readReviewerSubmissions(...)[0] (reviewer_aaa, the
    // lexicographically-first bucket key), not the FR-093 sticky owner
    // reviewer_wang -- so the adjudicated event's result_snapshot ends up
    // describing EXTRA_ANSWER ('neutral') instead of OWNER_ANSWER
    // ('negative').
    const history = await readSampleHistory(page, 'official_run');
    const adjudicatedEvent = history.find((event) => event.action === 'adjudicated');
    expect(adjudicatedEvent, 'exactly one adjudicated history event must exist for this single-dispute-item unit').toBeDefined();
    expect(adjudicatedEvent?.result_snapshot?.previewState?.[OUT_KEY]?.selected).toBe(OWNER_ANSWER);

    // The same arbitration decision must not describe two different
    // reviewers' answers depending on which read path is used.
    expect(adjudicatedEvent?.result_snapshot?.previewState?.[OUT_KEY]?.selected).toBe(finalizedItem?.finalized_value);
  });
});
