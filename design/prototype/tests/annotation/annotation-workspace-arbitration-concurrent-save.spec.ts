import { test, expect, type Page } from '@playwright/test';
import { buildWorkspaceUrl, fillArbitrationReasons, skipGuidelineModal } from './_workspace-helpers';

/* Regression test for issue #319: the arbitration store had the same
 * whole-blob read-modify-write shape issue #283 already fixed for
 * `labelsuite.wsSubmissions` -- but the arbitration bucket key
 * (taskId::runType::annotatorId) deliberately excludes reviewerId (arbiters
 * share a bucket, annotation-workspace.data.js arbitrationBucketKey), and one
 * bucket also spans EVERY sample/item of that annotator's review units. So
 * splitting only at the #283 bucket granularity would still let two arbiters
 * finalizing DIFFERENT samples inside the SAME bucket clobber each other's
 * stale snapshot. This test targets exactly that: two disputed units under
 * the same task/annotator (same bucket) but different samples, submitted via
 * Promise.all so the race is deterministic rather than a rare CI flake --
 * same technique as annotation-workspace-concurrent-save.spec.ts (issue
 * #283).
 *
 * Traceability: specs/annotation/015-annotation-workspace/spec.md
 *   FR-059, FR-061
 */

const TASK = 'T001';
const ANNOTATOR = 'kioleemg12';
const PARTICIPANT = 'reviewer_wang';
const ARBITER = 'reviewer_chen'; // can_arbitrate: true
const FILLER = 'reviewer_lin'; // issue #551 -- silent agree, keeps N=2 (no can_arbitrate)
const ITEM_ID = 'single_label::single_label';

type WorkspaceData = {
  markSampleSubmitted: (
    taskId: string, role: string, runType: string, sampleId: string,
    payload: unknown, historySummary: string,
    identity: { annotatorId?: string; reviewerId?: string }
  ) => void;
  getArbitrationState: (
    taskId: string, runType: string, sampleId: string,
    identity: { annotatorId?: string }
  ) => Record<string, {
    votes: Array<{ arbiter_id: string; choice: 'A' | 'B'; voted_at: string }>;
    finalized_value?: unknown;
    finalized_by?: string;
  }>;
};

const labelPayload = (selected: string) => ({ previewState: { single_label: { selected } } });

/* issue #551 (v4.54.0): min_reviewers = 1 (T001's default) now converges a
 * SOLE reviewer's correction on submit instead of unconditionally requiring
 * arbitration, so a third, silently agreeing reviewer (FILLER) is seeded
 * alongside the dissenting PARTICIPANT to keep each unit a genuine 1:1 tie
 * at N=2 -- otherwise wang's correction alone would already finalize both
 * samples before either arbiter's concurrent submit races the store. */
async function seedDisputedUnit(page: Page, sampleId: string, annotatorValue: string, reviewerValue: string) {
  await page.evaluate((a) => {
    (window as unknown as { LabelSuiteAnnotationWorkspaceData: WorkspaceData })
      .LabelSuiteAnnotationWorkspaceData.markSampleSubmitted(
        a.task, 'annotator', 'official_run', a.sampleId, a.annotatorPayload, '', { annotatorId: a.annotator }
      );
    (window as unknown as { LabelSuiteAnnotationWorkspaceData: WorkspaceData })
      .LabelSuiteAnnotationWorkspaceData.markSampleSubmitted(
        a.task, 'reviewer', 'official_run', a.sampleId, a.reviewerPayload, '',
        { annotatorId: a.annotator, reviewerId: a.participant }
      );
    (window as unknown as { LabelSuiteAnnotationWorkspaceData: WorkspaceData })
      .LabelSuiteAnnotationWorkspaceData.markSampleSubmitted(
        a.task, 'reviewer', 'official_run', a.sampleId, a.annotatorPayload, '',
        { annotatorId: a.annotator, reviewerId: a.filler }
      );
  }, {
    task: TASK, sampleId, annotator: ANNOTATOR, participant: PARTICIPANT, filler: FILLER,
    annotatorPayload: labelPayload(annotatorValue), reviewerPayload: labelPayload(reviewerValue),
  });
}

/* Widens the race window so the lost update is deterministic, mirroring
 * annotation-workspace-concurrent-save.spec.ts's delayArmedSubmissionStoreRead.
 * Matches BOTH the legacy whole-blob key ('labelsuite.wsArbitration') and any
 * post-fix prefixed key ('labelsuite.wsArbitration.<...>') by prefix. */
async function delayArmedArbitrationStoreRead(page: Page) {
  await page.addInitScript(() => {
    const originalGetItem = Storage.prototype.getItem;
    Storage.prototype.getItem = function (key: string) {
      const value = originalGetItem.call(this, key);
      const w = window as unknown as { __delayNextArbitrationRead?: boolean };
      if (key.indexOf('labelsuite.wsArbitration') === 0 && w.__delayNextArbitrationRead) {
        w.__delayNextArbitrationRead = false;
        const until = Date.now() + 400;
        while (Date.now() < until) {
          // busy-wait: synchronous by design, matches localStorage's own
          // synchronous API so the delay lands inside the submit block.
        }
      }
      return value;
    };
  });
}

async function armArbitrationStoreReadDelay(page: Page) {
  await page.evaluate(() => {
    (window as unknown as { __delayNextArbitrationRead?: boolean }).__delayNextArbitrationRead = true;
  });
}

function readState(page: Page, sampleId: string) {
  return page.evaluate((a) =>
    (window as unknown as { LabelSuiteAnnotationWorkspaceData: WorkspaceData })
      .LabelSuiteAnnotationWorkspaceData.getArbitrationState(
        a.task, 'official_run', a.sampleId, { annotatorId: a.annotator }
      ),
    { task: TASK, sampleId, annotator: ANNOTATOR }
  );
}

test('two arbiters finalizing different disputes in the same bucket never lose either decision (issue #319)', async ({ page, context }) => {
  const t1 = page;
  const t2 = await context.newPage();

  await skipGuidelineModal(t1);
  await skipGuidelineModal(t2);
  await delayArmedArbitrationStoreRead(t1);
  await delayArmedArbitrationStoreRead(t2);

  await t1.goto(buildWorkspaceUrl({
    task_id: TASK, sample_id: 'sent-001', role: 'reviewer', run_type: 'official_run',
    annotator_id: ANNOTATOR, reviewer_id: ARBITER,
  }));
  await seedDisputedUnit(t1, 'sent-001', 'positive', 'negative');
  await seedDisputedUnit(t1, 'sent-002', 'negative', 'neutral');
  await t1.reload();

  await t2.goto(buildWorkspaceUrl({
    task_id: TASK, sample_id: 'sent-002', role: 'reviewer', run_type: 'official_run',
    annotator_id: ANNOTATOR, reviewer_id: ARBITER,
  }));

  await t1.getByTestId('ws-arbitration-choose-b').click();
  await t2.getByTestId('ws-arbitration-choose-b').click();
  await fillArbitrationReasons(t1);
  await fillArbitrationReasons(t2);

  // Dispatch both arbitration submits concurrently -- the exact shape of
  // #283's CONC-03: two pages racing a whole-blob RMW.
  await armArbitrationStoreReadDelay(t1);
  await armArbitrationStoreReadDelay(t2);
  await Promise.all([
    t1.getByTestId('ws-arbitration-submit').click(),
    t2.getByTestId('ws-arbitration-submit').click(),
  ]);
  await expect(t1.locator('#toastMsg')).toHaveText('仲裁已提交');
  await expect(t2.locator('#toastMsg')).toHaveText('仲裁已提交');

  const state1 = await readState(t1, 'sent-001');
  expect(state1[ITEM_ID]?.finalized_value).toBe('negative');
  expect(state1[ITEM_ID]?.finalized_by).toBe(ARBITER);
  expect(state1[ITEM_ID]?.votes).toHaveLength(1);

  const state2 = await readState(t1, 'sent-002');
  expect(state2[ITEM_ID]?.finalized_value).toBe('neutral');
  expect(state2[ITEM_ID]?.finalized_by).toBe(ARBITER);
  expect(state2[ITEM_ID]?.votes).toHaveLength(1);

  await t2.close();
});
