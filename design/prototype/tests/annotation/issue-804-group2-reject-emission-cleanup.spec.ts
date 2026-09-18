import { test, expect, type Page } from '@playwright/test';
import { buildListUrl, buildWorkspaceUrl, fillArbitrationReasons, skipGuidelineModal } from './_workspace-helpers';

/* issue #804 group 2 (FR-092): the retired `reject` decision must have no
 * live history-event emission point left in EITHER run_type. Group 1
 * (PR #812, f86acfe0) added the missing modify/bypass emission points;
 * this group removes markSampleRejected()'s two remaining callers:
 *   - submitArbitration()'s "upheld pure reject" branch (arbitration path,
 *     annotation-workspace.data.js ~L2565)
 *   - seedReviewFlowDemo()'s T017 oft-05 seed row (demo-data path,
 *     annotation-workspace.data.js ~L3195)
 *
 * FR-092: "reject（退回重標）不在集合內：兩種 run_type 皆不得出現退回控件、
 * 退回決策值或退回歷程產生點". AC-1.25 (v5.0.0): "新資料不再產生 rejected"
 * -- render-side compatibility for PRE-EXISTING 'rejected' events (FR-086)
 * is untouched; only the write side is in scope here.
 *
 * Both tests below are real-behavior, UI-driven assertions per project TDD
 * rules -- no history event is seeded directly into a bucket. The
 * arbitration test drives an actual arbiter submit through the real UI
 * (seeding only the two PRECONDITION submissions via the production
 * markSampleSubmitted() function, the same legitimate pattern
 * annotation-workspace-arbitration.spec.ts uses); the demo-seed test drives
 * the real seedReviewFlowDemo() by loading the page, the same path every
 * T014-T017 visitor goes through.
 */

interface Identity {
  annotatorId?: string;
  reviewerId?: string;
}

interface HistoryEvent {
  action: string;
  role: string;
  actorId: string | null;
}

interface WorkspaceData {
  markSampleSubmitted: (
    taskId: string, role: string, runType: string, sampleId: string,
    payload: unknown, historySummary: string, identity: Identity
  ) => void;
  getSampleStatus: (taskId: string, role: string, runType: string, sampleId: string, identity: Identity) => string;
  getSampleHistory: (taskId: string, runType: string, sampleId: string, identity: Identity) => HistoryEvent[];
}

declare global {
  interface Window {
    LabelSuiteAnnotationWorkspaceData: WorkspaceData;
  }
}

async function getSampleStatus(page: Page, taskId: string, role: string, runType: string, sampleId: string, identity: Identity) {
  return page.evaluate(
    ([t, r, rt, s, id]) => window.LabelSuiteAnnotationWorkspaceData.getSampleStatus(t, r, rt, s, id as Identity),
    [taskId, role, runType, sampleId, identity] as const
  );
}

async function getSampleHistory(page: Page, taskId: string, runType: string, sampleId: string, identity: Identity) {
  return page.evaluate(
    ([t, rt, s, id]) => window.LabelSuiteAnnotationWorkspaceData.getSampleHistory(t, rt, s, id as Identity),
    [taskId, runType, sampleId, identity] as const
  );
}

const TASK = 'T001';
const SAMPLE = 'sent-001';
const ANNOTATOR = 'kioleemg12';
const PARTICIPANT = 'reviewer_wang';
const ARBITER = 'reviewer_chen'; // can_arbitrate: true

function seedAnnotator(page: Page, value: string) {
  return page.evaluate(
    ([v, annotator]) => {
      window.LabelSuiteAnnotationWorkspaceData.markSampleSubmitted(
        'T001', 'annotator', 'official_run', 'sent-001',
        { previewState: { single_label: { selected: v } } }, '', { annotatorId: annotator }
      );
    },
    [value, ANNOTATOR] as const
  );
}

/* A reviewer `reject` decision that proposes no replacement value (same
 * value as the annotator's own answer) is a "pure reject" -- getDisputeItems()
 * synthesizes a dispute item whose B candidate is the PURE_REJECT_VALUE
 * sentinel (annotation-workspace.data.js:2245), and the arbitration card's
 * "choose B" button (annotation-workspace.config.js ~L3685) offers exactly
 * that sentinel as the reviewer's proposed value. */
function seedPureRejectReviewer(page: Page) {
  return page.evaluate(
    ([annotator, reviewer]) => {
      window.LabelSuiteAnnotationWorkspaceData.markSampleSubmitted(
        'T001', 'reviewer', 'official_run', 'sent-001',
        { previewState: { single_label: { selected: 'sad' } }, decisions: { single_label: 'reject' } }, '',
        { annotatorId: annotator, reviewerId: reviewer }
      );
    },
    [ANNOTATOR, PARTICIPANT] as const
  );
}

test.describe('issue #804 group 2 -- arbitration no longer upholds a pure reject as a rollback', () => {
  test('adopting B on a pure-reject dispute item leaves the annotator submitted with no rejected event', async ({ page }) => {
    await skipGuidelineModal(page);
    await page.goto(buildWorkspaceUrl({
      task_id: TASK, sample_id: SAMPLE, role: 'reviewer', run_type: 'official_run',
      annotator_id: ANNOTATOR, reviewer_id: ARBITER,
    }));
    await seedAnnotator(page, 'sad');
    await seedPureRejectReviewer(page);
    await page.reload();

    await expect(page.getByTestId('ws-arbitration-card')).toBeVisible();
    await page.getByTestId('ws-arbitration-choose-b').click();
    await fillArbitrationReasons(page);
    await page.getByTestId('ws-arbitration-submit').click();

    // FR-092: upholding a pure reject via arbitration must not roll the
    // annotator's own sample back to 'pending' any more.
    const status = await getSampleStatus(page, TASK, 'annotator', 'official_run', SAMPLE, { annotatorId: ANNOTATOR });
    expect(status).toBe('submitted');

    // FR-092 / AC-1.25: no fresh 'rejected' event may be produced.
    const history = await getSampleHistory(page, TASK, 'official_run', SAMPLE, { annotatorId: ANNOTATOR });
    expect(history.some((event) => event.action === 'rejected')).toBe(false);
  });
});

test.describe('issue #804 group 2 -- seedReviewFlowDemo no longer rolls T017 oft-05 back to pending', () => {
  test('oft-05-pending-review keeps the annotator submitted with no rejected event', async ({ page }) => {
    // Loading any reviewer/official_run page for T017 triggers the demo
    // seeder (seedReviewFlowDemo(), idempotent via a localStorage marker) --
    // this is the same real path every T017 visitor goes through, not a
    // fixture seeded directly into the bucket.
    await page.goto(buildListUrl({ task_id: 'T017', role: 'reviewer', run_type: 'official_run' }));

    const annotatorIdentity = { annotatorId: 'kioleemg12' };
    const status = await getSampleStatus(page, 'T017', 'annotator', 'official_run', 'oft-05-pending-review', annotatorIdentity);
    expect(status).toBe('submitted');

    const history = await getSampleHistory(page, 'T017', 'official_run', 'oft-05-pending-review', annotatorIdentity);
    expect(history.some((event) => event.action === 'rejected')).toBe(false);
  });
});
