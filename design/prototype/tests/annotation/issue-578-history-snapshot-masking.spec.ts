import { test, expect, type Page } from '@playwright/test';
import {
  buildWorkspaceUrl,
  skipGuidelineModal,
  trackPageErrors,
  assertNoPageErrors,
} from './_workspace-helpers';

/* issue #578 / spec 015 v4.61.0 -- FR-087 result_snapshot + diff, FR-090
 * layered masking, and the FR-086 emission points that never existed
 * (accepted / modified).
 *
 * Two things this file deliberately does NOT assert through the DOM:
 *
 * (1) Masking. FR-090 requires the mask to happen in the data supply layer,
 *     so the assertion has to be "the value is absent from what this viewer
 *     can obtain", not "the value is not painted". A style-hidden answer is
 *     still in the DOM and in memory, which is exactly the Data Fairness
 *     hole the requirement exists to close -- asserting on the rendered
 *     card would pass against an implementation that leaks.
 *
 * (2) accepted / modified emission. Today the whole codebase only ever
 *     writes `submitted`, `saved` and `rejected`; a reviewer's approve /
 *     correct decision never became a history event at all, so two of
 *     FR-086's seven values were unreachable. The writer is the contract
 *     here, so the assertion reads the event list, not a badge.
 */

const TASK = 'T001';
const SAMPLE = 'sent-001';
const ANNOTATOR_A = 'kioleemg12';
const ANNOTATOR_B = '113450022';
const REVIEWER = 'reviewer_wang';
const PEER_REVIEWER = 'reviewer_li';

type Snapshot = { previewState?: Record<string, unknown> };

type HistoryEvent = {
  action: string;
  role: string;
  actorId: string | null;
  at: string;
  summary: string;
  result_snapshot?: Snapshot | null;
  reason?: string | null;
};

type Identity = { annotatorId?: string; reviewerId?: string };
type Viewer = { role: 'annotator' | 'reviewer'; actorId: string; canArbitrate?: boolean };

type SubmitArgs = {
  role: string;
  runType: string;
  payload: Record<string, unknown>;
  summary: string;
  identity: Identity;
};

function submit(page: Page, args: SubmitArgs): Promise<void> {
  return page.evaluate((a: SubmitArgs) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).LabelSuiteAnnotationWorkspaceData.markSampleSubmitted(
      'T001', a.role, a.runType, 'sent-001', a.payload, a.summary, a.identity
    );
  }, args);
}

function saveDraft(page: Page, args: SubmitArgs): Promise<void> {
  return page.evaluate((a: SubmitArgs) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).LabelSuiteAnnotationWorkspaceData.markSampleSaved(
      'T001', a.role, a.runType, 'sent-001', a.payload, a.summary, a.identity
    );
  }, args);
}

/* FR-090: the viewer is an argument to the data supply layer, not a render
   flag -- that is what makes "absent from the output" assertable at all. */
function history(
  page: Page,
  args: { runType: string; identity: Identity; viewer: Viewer }
): Promise<HistoryEvent[]> {
  return page.evaluate(
    (a: { runType: string; identity: Identity; viewer: Viewer }) =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).LabelSuiteAnnotationWorkspaceData.getSampleHistory(
        'T001', a.runType, 'sent-001', a.identity, a.viewer
      ) as HistoryEvent[],
    args
  );
}

const answer = (selected: string) => ({ previewState: { single_label: { selected } } });

const reviewerPayload = (selected: string, decision: string) => ({
  previewState: { single_label: { selected } },
  decisions: { single_label: decision },
  reasons: {} as Record<string, string>,
});

test.describe('issue #578 -- history snapshots, diffs and layered masking', () => {
  test('AC-2.21: a reviewer approve writes `accepted` and a reviewer correction writes `modified`, once each', async ({ page }) => {
    const errors = trackPageErrors(page);
    await skipGuidelineModal(page);
    await page.goto(buildWorkspaceUrl({ task_id: TASK, sample_id: SAMPLE }));

    await submit(page, {
      role: 'annotator', runType: 'official_run', payload: answer('neutral'),
      summary: 'single_label: neutral', identity: { annotatorId: ANNOTATOR_A },
    });
    /* approve, value unchanged -> accepted */
    await submit(page, {
      role: 'reviewer', runType: 'official_run', payload: reviewerPayload('neutral', 'approve'),
      summary: 'single_label: neutral', identity: { annotatorId: ANNOTATOR_A, reviewerId: REVIEWER },
    });
    /* approve, value changed -> modified (a correction is not a rejection) */
    await submit(page, {
      role: 'reviewer', runType: 'official_run', payload: reviewerPayload('positive', 'approve'),
      summary: 'single_label: positive', identity: { annotatorId: ANNOTATOR_A, reviewerId: PEER_REVIEWER },
    });

    const events = await history(page, {
      runType: 'official_run',
      identity: { annotatorId: ANNOTATOR_A },
      viewer: { role: 'reviewer', actorId: REVIEWER },
    });

    const accepted = events.filter((e) => e.action === 'accepted');
    const modified = events.filter((e) => e.action === 'modified');
    expect(accepted).toHaveLength(1);
    expect(modified).toHaveLength(1);
    expect(accepted[0].actorId).toBe(REVIEWER);
    expect(modified[0].actorId).toBe(PEER_REVIEWER);
    assertNoPageErrors(errors);
  });

  test('AC-2.17: a plain-value correction renders as a before/after diff, and a first submission renders as new content', async ({ page }) => {
    const errors = trackPageErrors(page);
    await skipGuidelineModal(page);
    await page.goto(buildWorkspaceUrl({
      task_id: TASK, sample_id: SAMPLE, role: 'reviewer',
      reviewer_id: REVIEWER, annotator_id: ANNOTATOR_A,
    }));

    await submit(page, {
      role: 'annotator', runType: 'official_run', payload: answer('neutral'),
      summary: 'single_label: neutral', identity: { annotatorId: ANNOTATOR_A },
    });
    await submit(page, {
      role: 'reviewer', runType: 'official_run', payload: reviewerPayload('positive', 'approve'),
      summary: 'single_label: positive', identity: { annotatorId: ANNOTATOR_A, reviewerId: REVIEWER },
    });

    await page.reload();
    await skipGuidelineModal(page);
    await page.getByTestId('ws-guideline-tab-history').click();

    const modifiedCard = page.locator('.history-item', {
      has: page.locator('.history-action-badge[data-action="modified"]'),
    });
    const diff = modifiedCard.locator('.history-diff-item');
    await expect(diff).toHaveCount(1);
    await expect(diff).toContainText('neutral');
    await expect(diff).toContainText('positive');

    /* First submission on that actor dimension: whole answer, no arrow. */
    const firstSubmit = page.locator('.history-item', {
      has: page.locator('.history-action-badge[data-action="submitted"]'),
    });
    await expect(firstSubmit.locator('.history-diff-item')).toHaveCount(0);
    await expect(firstSubmit.locator('.history-snapshot')).toContainText('neutral');
    assertNoPageErrors(errors);
  });

  test('AC-4.51: an annotator can never obtain a peer annotator\'s events, and an unsubmitted review draft stays out of every trail', async ({ page }) => {
    const errors = trackPageErrors(page);
    await skipGuidelineModal(page);
    await page.goto(buildWorkspaceUrl({ task_id: TASK, sample_id: SAMPLE, run_type: 'dry_run' }));

    await submit(page, {
      role: 'annotator', runType: 'dry_run', payload: answer('neutral'),
      summary: 'single_label: neutral', identity: { annotatorId: ANNOTATOR_A },
    });
    await submit(page, {
      role: 'annotator', runType: 'dry_run', payload: answer('positive'),
      summary: 'single_label: positive', identity: { annotatorId: ANNOTATOR_B },
    });
    /* Never submitted: FR-062 keeps it out even for an arbiter. */
    await saveDraft(page, {
      role: 'reviewer', runType: 'dry_run', payload: reviewerPayload('negative', 'approve'),
      summary: 'single_label: negative',
      identity: { annotatorId: ANNOTATOR_A, reviewerId: PEER_REVIEWER },
    });

    const asAnnotatorA = await history(page, {
      runType: 'dry_run',
      identity: { annotatorId: ANNOTATOR_A },
      viewer: { role: 'annotator', actorId: ANNOTATOR_A },
    });
    /* FR-090 rule 1: B's events do not exist for A at all -- the event row
       carries the per-output answer summary, so masking only the snapshot
       would still hand A the answer. */
    expect(asAnnotatorA.some((e) => e.actorId === ANNOTATOR_B)).toBe(false);
    expect(JSON.stringify(asAnnotatorA)).not.toContain('positive');
    /* A's own snapshot is A's to see. */
    const ownSubmit = asAnnotatorA.find((e) => e.actorId === ANNOTATOR_A && e.action === 'submitted');
    expect(ownSubmit?.result_snapshot?.previewState).toBeTruthy();

    /* FR-090 rule 2: the reviewer sees each unit's snapshot in that unit. */
    for (const [annotatorId, expected] of [[ANNOTATOR_A, 'neutral'], [ANNOTATOR_B, 'positive']] as const) {
      const asReviewer = await history(page, {
        runType: 'dry_run',
        identity: { annotatorId },
        viewer: { role: 'reviewer', actorId: REVIEWER, canArbitrate: true },
      });
      const submitted = asReviewer.find((e) => e.actorId === annotatorId && e.action === 'submitted');
      expect(JSON.stringify(submitted?.result_snapshot)).toContain(expected);
      /* FR-062 stacks BEFORE FR-090: an unsubmitted peer review draft is
         absent even for an arbiter -- masking its snapshot is not enough. */
      expect(asReviewer.some((e) => e.actorId === PEER_REVIEWER)).toBe(false);
    }
    assertNoPageErrors(errors);
  });
});
