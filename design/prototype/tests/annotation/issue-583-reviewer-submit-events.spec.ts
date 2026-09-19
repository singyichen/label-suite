import { test, expect, type Page } from '@playwright/test';
import {
  buildWorkspaceUrl,
  buildListUrl,
  skipGuidelineModal,
  trackPageErrors,
  assertNoPageErrors,
} from './_workspace-helpers';

/* issue #583 / OpenSpec change drop-reviewer-submit-wrapper-event
 * (proposal.md, design.md, maintainer ruling R1-R3, 2026-09-19).
 *
 * markSampleSubmitted() (annotation-workspace.data.js) currently writes an
 * envelope `submitted` event before appendReviewDecisionEvents() writes one
 * accepted/modified/bypassed event per outKey -- for a reviewer submit, ALL
 * of those events (envelope + decisions) carry the same payload.timing, so
 * lead_time is duplicated N+1 times, and a `submitted` action with no
 * result_snapshot exists alongside FR-086's closed action-value semantics
 * (FR-086 defines `submitted` as annotator-only).
 *
 * Maintainer ruling this file pins as a contract:
 *   R1: a reviewer submit MUST NOT write `submitted` -- only decision events.
 *   R2: started_at/lead_time is carried by the FIRST decision event only, in
 *       Object.keys(decisions) (== append) order; later decision events in
 *       the same submit carry no timing.
 *   R3: FR-091 "last action" on same-timestamp decision events resolves to
 *       the last-appended one (getSampleHistory()'s stable sort already
 *       does this today -- test E below is expected GREEN under both the
 *       current and the fixed implementation; it exists to fix the
 *       behavior as a contract, not to catch a regression).
 *
 * Expected failure under the CURRENT (pre-Green) implementation:
 *   - Test A and Test B's `submitted`-absence assertions fail because
 *     markSampleSubmitted() still writes the envelope event unconditionally.
 *   - Test B's single-timed-card assertion fails because
 *     appendReviewDecisionEvents() still copies payload.timing onto every
 *     decision event, not just the first.
 *
 * Type declarations use a local cast on `window` per call site (no second
 * `declare global` -- a duplicate global augmentation across spec files
 * trips TS2717).
 */

type WorkspaceDataGlobal = {
  markSampleSubmitted: (
    taskId: string,
    role: string,
    runType: string,
    sampleId: string,
    payload: unknown,
    historySummary: string,
    identity: { annotatorId?: string; reviewerId?: string }
  ) => void;
  getSampleHistory: (
    taskId: string,
    runType: string,
    sampleId: string,
    identity: { annotatorId?: string; reviewerId?: string }
  ) => Array<{
    action: string;
    role: string;
    actorId: string | null;
    at: string;
    summary: string;
    started_at?: string | null;
    lead_time?: number | null;
    result_snapshot?: unknown;
  }>;
};

const TASK = 'T001';
const SAMPLE = 'sent-001';
const RUN_TYPE = 'official_run';
const ANNOTATOR = 'kioleemg12'; // DEFAULT_ANNOTATOR_ID (annotation-workspace.data.js)
const REVIEWER = 'reviewer_wang'; // DEFAULT_REVIEWER_ID (REVIEWER_ROSTER[0])

function submit(
  page: Page,
  args: { role: string; payload: unknown; identity: { annotatorId?: string; reviewerId?: string } }
): Promise<void> {
  return page.evaluate(
    (a) =>
      (window as unknown as { LabelSuiteAnnotationWorkspaceData: WorkspaceDataGlobal })
        .LabelSuiteAnnotationWorkspaceData.markSampleSubmitted(
          TASK,
          a.role,
          RUN_TYPE,
          SAMPLE,
          a.payload,
          '',
          a.identity
        ),
    args
  );
}

function readHistory(page: Page, identity: { annotatorId?: string; reviewerId?: string } = {}) {
  return page.evaluate(
    (a) =>
      (window as unknown as { LabelSuiteAnnotationWorkspaceData: WorkspaceDataGlobal })
        .LabelSuiteAnnotationWorkspaceData.getSampleHistory(TASK, RUN_TYPE, SAMPLE, a),
    identity
  );
}

type SeededEvent = { action: string; role: string; actorId: string; at: string; summary?: string };

/* Writes one bucket's single-sample entry directly into localStorage --
 * mirrors issue-601-collapse-reviewer-submit.spec.ts's seedBucket(), used
 * here only for Test D/E's pre-existing-data scenarios (Test A/B/C exercise
 * the data-layer write path directly via submit() above). */
function seedBucket(page: Page, bucketKey: string, sampleId: string, history: SeededEvent[]) {
  return page.addInitScript(
    ([key, sample, events]) => {
      window.localStorage.setItem(
        key as string,
        JSON.stringify({
          [sample as string]: {
            status: 'submitted',
            submittedAt: '2026-09-19T09:00:00.000Z',
            answers: {},
            history: events,
          },
        })
      );
    },
    [bucketKey, sampleId, history] as const
  );
}

const ANNOTATOR_BUCKET_KEY = `labelsuite.wsSubmissions.${TASK}::annotator::${RUN_TYPE}::${ANNOTATOR}::-`;
const REVIEWER_BUCKET_KEY = `labelsuite.wsSubmissions.${TASK}::reviewer::${RUN_TYPE}::${ANNOTATOR}::${REVIEWER}`;

test.describe('issue #583 -- reviewer submit stops writing a wrapper submitted event', () => {
  test('a multi-outKey reviewer submit writes exactly one decision event per outKey and zero submitted', async ({ page }) => {
    await skipGuidelineModal(page);
    await page.goto(buildWorkspaceUrl({ task_id: TASK, sample_id: SAMPLE, role: 'reviewer', run_type: RUN_TYPE }));

    // Seed an annotator submission first so the review unit this reviewer
    // decides on actually exists -- the real UI path (handleReviewSubmit)
    // always has one; a bare reviewer submit with no prior annotator answer
    // is an unrealistic shape this test does not need to cover.
    await submit(page, {
      role: 'annotator',
      payload: { previewState: { single_label: { selected: 'sad' } } },
      identity: { annotatorId: ANNOTATOR },
    });
    // Synthetic outKeys (alpha/beta/gamma), not T001's real single_label --
    // appendReviewDecisionEvents() iterates Object.keys(decisions) generically
    // with no task-specific branching (Generalization-First), so a
    // multi-outKey shape a real multi-output-type task would produce is
    // exercised directly at the data layer without needing task config for it.
    await submit(page, {
      role: 'reviewer',
      payload: { decisions: { alpha: 'approve', beta: 'modify', gamma: 'bypass' } },
      identity: { annotatorId: ANNOTATOR, reviewerId: REVIEWER },
    });

    const reviewerEvents = (await readHistory(page, { annotatorId: ANNOTATOR })).filter((e) => e.role === 'reviewer');

    expect(reviewerEvents).toHaveLength(3);
    expect(reviewerEvents.map((e) => e.action).sort()).toEqual(['accepted', 'bypassed', 'modified']);
    expect(reviewerEvents.some((e) => e.action === 'submitted')).toBe(false);
  });

  test('only the first-written decision event of one submit carries timing, and 歷程 shows exactly one timed card', async ({ page }) => {
    await skipGuidelineModal(page);
    await page.goto(buildWorkspaceUrl({ task_id: TASK, sample_id: SAMPLE, role: 'reviewer', run_type: RUN_TYPE }));

    await submit(page, {
      role: 'annotator',
      payload: { previewState: { single_label: { selected: 'sad' } } },
      identity: { annotatorId: ANNOTATOR },
    });
    await submit(page, {
      role: 'reviewer',
      payload: {
        decisions: { alpha: 'approve', beta: 'modify', gamma: 'bypass' },
        timing: { startedAt: '2026-09-19T09:00:00.000Z', leadTime: 12_000 },
      },
      identity: { annotatorId: ANNOTATOR, reviewerId: REVIEWER },
    });

    const reviewerEvents = (await readHistory(page, { annotatorId: ANNOTATOR })).filter((e) => e.role === 'reviewer');
    const timed = reviewerEvents.filter((e) => typeof e.lead_time === 'number');

    // Object.keys({alpha, beta, gamma}) iterates in insertion order, so
    // alpha -> accepted is the first-written decision event and the only one
    // that may carry timing (R2).
    expect(timed).toHaveLength(1);
    expect(timed[0].action).toBe('accepted');
    expect(timed[0].started_at).toBe('2026-09-19T09:00:00.000Z');
    expect(timed[0].lead_time).toBe(12_000);

    // renderHistoryPanel() re-reads getSampleHistory() fresh on every tab
    // click (setupGuidelineTabs(), annotation-workspace.config.js), so the
    // events written above via page.evaluate are already visible without a
    // reload.
    await page.getByTestId('ws-guideline-tab-history').click();
    await expect(page.getByTestId('ws-history-lead-time')).toHaveCount(1);
  });

  test('an annotator submission still writes exactly one submitted event carrying result_snapshot and timing', async ({ page }) => {
    await skipGuidelineModal(page);
    await page.goto(buildWorkspaceUrl({ task_id: TASK, sample_id: SAMPLE, role: 'annotator', run_type: RUN_TYPE }));

    await submit(page, {
      role: 'annotator',
      payload: {
        previewState: { single_label: { selected: 'sad' } },
        timing: { startedAt: '2026-09-19T09:00:00.000Z', leadTime: 5_000 },
      },
      identity: { annotatorId: ANNOTATOR },
    });

    const trail = await readHistory(page, { annotatorId: ANNOTATOR });
    expect(trail).toHaveLength(1);
    expect(trail[0].action).toBe('submitted');
    expect(trail[0].role).toBe('annotator');
    expect(trail[0].result_snapshot).not.toBeNull();
    expect(trail[0].started_at).toBe('2026-09-19T09:00:00.000Z');
    expect(trail[0].lead_time).toBe(5_000);
  });

  /* This scenario exercises collapseHistory() (shared/annotation-history.js),
   * which design.md D3 explicitly keeps unchanged -- it must keep folding
   * legacy pre-this-version wrapper events. Written to prove R1's write-side
   * fix does not disturb legacy read-side rendering; expected GREEN under
   * both the current and the fixed implementation (same non-goal issue-601
   * already covers), not a regression signal like Test A/B above. */
  test('a pre-seeded legacy reviewer wrapper submitted event still collapses in 歷程 without throwing', async ({ page }) => {
    const pageErrors = trackPageErrors(page);
    await skipGuidelineModal(page);
    await seedBucket(page, ANNOTATOR_BUCKET_KEY, SAMPLE, [
      { action: 'submitted', role: 'annotator', actorId: ANNOTATOR, at: '2026-09-19T09:00:00.000Z', summary: '標記員提交' },
    ]);
    await seedBucket(page, REVIEWER_BUCKET_KEY, SAMPLE, [
      { action: 'submitted', role: 'reviewer', actorId: REVIEWER, at: '2026-09-19T09:01:00.000Z', summary: '審核員提交' },
      { action: 'accepted', role: 'reviewer', actorId: REVIEWER, at: '2026-09-19T09:02:00.000Z', summary: '審核通過' },
    ]);

    await page.goto(buildWorkspaceUrl({ task_id: TASK, sample_id: SAMPLE, role: 'reviewer', run_type: RUN_TYPE }));
    await page.getByTestId('ws-guideline-tab-history').click();

    // Three events were written; the reviewer's legacy wrapper submitted
    // collapses away, leaving two rendered cards -- the one surviving
    // submitted card belongs to the annotator.
    await expect(page.locator('#wsHistoryContainer .history-item')).toHaveCount(2);
    await expect(page.locator('#wsHistoryContainer .history-action-badge[data-action="submitted"]')).toHaveCount(1);

    assertNoPageErrors(pageErrors);
  });

  /* R3: same-timestamp decision events resolve to the last-appended one.
   * Uses reviewer_li rather than the file's default REVIEWER constant
   * because FR-093 single-owner relay assigns T001/sent-001/kioleemg12 to
   * reviewer_li specifically (issue-606-lead-time-dedup.spec.ts precedent),
   * and annotation-list.html's reviewer view filters to assigned units. */
  test('annotation-list reads the last-written of two same-timestamp decision events as the last action (R3)', async ({ page }) => {
    const LIST_REVIEWER = 'reviewer_li';
    const LIST_REVIEWER_BUCKET = `labelsuite.wsSubmissions.${TASK}::reviewer::${RUN_TYPE}::${ANNOTATOR}::${LIST_REVIEWER}`;
    const tieAt = '2026-09-19T09:05:00.000Z';

    await seedBucket(page, ANNOTATOR_BUCKET_KEY, SAMPLE, [
      { action: 'submitted', role: 'annotator', actorId: ANNOTATOR, at: '2026-09-19T09:00:00.000Z', summary: '標記員提交' },
    ]);
    await seedBucket(page, LIST_REVIEWER_BUCKET, SAMPLE, [
      // Identical `at`, append order accepted -> modified.
      { action: 'accepted', role: 'reviewer', actorId: LIST_REVIEWER, at: tieAt, summary: '審核通過' },
      { action: 'modified', role: 'reviewer', actorId: LIST_REVIEWER, at: tieAt, summary: '審核修正' },
    ]);

    await page.goto(buildListUrl({ task_id: TASK, role: 'reviewer', run_type: RUN_TYPE, reviewer_id: LIST_REVIEWER }));

    const row = page.getByTestId('ws-sample-item').filter({ hasText: SAMPLE }).filter({ hasText: ANNOTATOR }).first();
    await expect(row.getByTestId('list-summary-last-action')).toHaveAttribute('data-action', 'modified');
  });
});
