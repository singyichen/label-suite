import { test, expect, type Page } from '@playwright/test';
import { buildWorkspaceUrl, fillArbitrationReasons, skipGuidelineModal } from './_workspace-helpers';

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
 * The test below is a real-behavior, UI-driven assertion per project TDD
 * rules -- no history event is seeded directly into a bucket. It drives an
 * actual arbiter submit through the real UI (seeding only the two
 * PRECONDITION submissions via the production markSampleSubmitted()
 * function, the same legitimate pattern
 * annotation-workspace-arbitration.spec.ts uses).
 *
 * issue #815: the seedReviewFlowDemo() demo-data companion test that used to
 * follow it (T017 oft-05-pending-review, loading the page to drive the real
 * seeder) is deleted, not retargeted -- T017 is retired, and no seed row
 * anywhere (official_run or otherwise) still carries the `rejectBy` this
 * test needed; the same reasoning already deleted the equivalent block in
 * issue-502-reject-branch-seed.spec.ts. The bullet above documenting group
 * 2's removal of that seed row's markSampleRejected() call stays as an
 * accurate historical record of the code change; only the row itself, and
 * the test that exercised it, are gone.
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

/* Cast rather than `declare global`: annotation-workspace-arbitration.spec.ts
 * already augments `Window.LabelSuiteAnnotationWorkspaceData` with a
 * differently shaped WorkspaceData, and TS requires merged global
 * declarations to be structurally identical (see
 * issue-199-arbitration-vote-dedup.spec.ts for the same pattern). */
type WorkspaceWindow = { LabelSuiteAnnotationWorkspaceData: WorkspaceData };

async function getSampleStatus(page: Page, taskId: string, role: string, runType: string, sampleId: string, identity: Identity) {
  return page.evaluate(
    ([t, r, rt, s, id]) => (window as unknown as WorkspaceWindow)
      .LabelSuiteAnnotationWorkspaceData.getSampleStatus(t, r, rt, s, id as Identity),
    [taskId, role, runType, sampleId, identity] as const
  );
}

async function getSampleHistory(page: Page, taskId: string, runType: string, sampleId: string, identity: Identity) {
  return page.evaluate(
    ([t, rt, s, id]) => (window as unknown as WorkspaceWindow)
      .LabelSuiteAnnotationWorkspaceData.getSampleHistory(t, rt, s, id as Identity),
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
      (window as unknown as WorkspaceWindow).LabelSuiteAnnotationWorkspaceData.markSampleSubmitted(
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
      (window as unknown as WorkspaceWindow).LabelSuiteAnnotationWorkspaceData.markSampleSubmitted(
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
