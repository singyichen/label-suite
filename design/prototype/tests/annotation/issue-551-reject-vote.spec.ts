import { test, expect, type Page } from '@playwright/test';
import { buildWorkspaceUrl, fillArbitrationReasons, skipGuidelineModal } from './_workspace-helpers';

/* Pure-reject vote counting and N=1 quorum convergence (issue #551).
 *
 * Two independent defects in the FR-061 per-item majority rule:
 *   1. A reviewer who rejects an outKey WITHOUT changing its value was
 *      indistinguishable from one who approved it -- compareOutputAnswer()
 *      only compares values, so a naked reject silently counted as an
 *      implicit agreement vote and the unit finalized on the annotator's
 *      original answer (review-flow-dry-run.html's own diagram admitted
 *      this: "退回而未改動答案的單位仍會定稿").
 *   2. min_reviewers = 1 tasks could never converge a genuine correction:
 *      resolveDisputeConvergence() hard-blocked N < 2 unconditionally, so
 *      the sole reviewer's edit always fell into the dispute pool even
 *      though no second reviewer exists to out-vote it, and a small task
 *      with no can_arbitrate reviewer could never clear the "no unresolved
 *      dispute" completion gate.
 *
 * Traceability: specs/annotation/015-annotation-workspace/spec.md
 *   FR-051, FR-061 (v4.54.0, issue #551)
 */

type Identity = { annotatorId?: string; reviewerId?: string };

/* Not `declare global`: several sibling spec files already augment
   `Window.LabelSuiteAnnotationWorkspaceData` with their own (differently
   shaped) local `WorkspaceData` type, and TypeScript requires every merged
   declaration of the same global member to be identical -- an inline cast
   per call site avoids that cross-file collision. */
type WorkspaceData = {
  markSampleSubmitted: (
    taskId: string, role: string, runType: string, sampleId: string,
    payload: unknown, historySummary: string, identity: Identity
  ) => void;
  getReviewUnitStatus: (
    taskId: string, runType: string, sampleId: string,
    identity: Identity, outKeys: string[], opts?: { minReviewers?: number }
  ) => string | null;
  getSubmission: (
    taskId: string, role: string, runType: string, sampleId: string, identity: Identity
  ) => unknown;
  getSampleAnswers: (
    taskId: string, role: string, runType: string, sampleId: string, identity: Identity
  ) => unknown;
};

const TASK = 'T001';
const SAMPLE = 'sent-001';
const ANNOTATOR = 'kioleemg12';
const REVIEWER = 'reviewer_wang';
const ARBITER = 'reviewer_chen';

function labelPayload(selected: string, decision?: 'approve' | 'reject') {
  return {
    previewState: { single_label: { selected } },
    ...(decision ? { decisions: { single_label: decision } } : {}),
  };
}

function seed(
  page: Page,
  args: { role: string; payload: unknown; identity: Identity }
): Promise<void> {
  return page.evaluate((a) => {
    (window as unknown as { LabelSuiteAnnotationWorkspaceData: WorkspaceData })
      .LabelSuiteAnnotationWorkspaceData.markSampleSubmitted(
        'T001', a.role, 'official_run', 'sent-001', a.payload, '', a.identity
      );
  }, args);
}

function unitStatus(page: Page, identity: Identity) {
  return page.evaluate(
    (a) =>
      (window as unknown as { LabelSuiteAnnotationWorkspaceData: WorkspaceData })
        .LabelSuiteAnnotationWorkspaceData.getReviewUnitStatus(
          'T001', 'official_run', 'sent-001', a.identity, ['single_label'], { minReviewers: 1 }
        ),
    { identity }
  );
}

test.describe('issue #551 -- pure reject blocks finalization instead of counting as agreement', () => {
  test('reject with no correction derives disputed, not finalized', async ({ page }) => {
    await page.goto(buildWorkspaceUrl({ task_id: TASK, sample_id: SAMPLE, role: 'annotator' }));
    await seed(page, { role: 'annotator', payload: labelPayload('positive'), identity: { annotatorId: ANNOTATOR } });
    await seed(page, {
      role: 'reviewer',
      payload: labelPayload('positive', 'reject'), // same value as the annotator, pure reject
      identity: { annotatorId: ANNOTATOR, reviewerId: REVIEWER },
    });

    expect(await unitStatus(page, { annotatorId: ANNOTATOR })).toBe('disputed');
  });

  test('the arbitration card renders a B side with no replacement value for a pure reject', async ({ page }) => {
    await skipGuidelineModal(page);
    await page.goto(buildWorkspaceUrl({
      task_id: TASK, sample_id: SAMPLE, role: 'reviewer', run_type: 'official_run',
      annotator_id: ANNOTATOR, reviewer_id: ARBITER,
    }));
    await seed(page, { role: 'annotator', payload: labelPayload('positive'), identity: { annotatorId: ANNOTATOR } });
    await seed(page, {
      role: 'reviewer',
      payload: labelPayload('positive', 'reject'),
      identity: { annotatorId: ANNOTATOR, reviewerId: REVIEWER },
    });
    await page.reload();

    await expect(page.getByTestId('ws-arbitration-card')).toBeVisible();
    const bBtn = page.getByTestId('ws-arbitration-choose-b');
    await expect(bBtn).toHaveCount(1);
    await expect(bBtn).not.toContainText('positive');
    await expect(bBtn).toContainText('無替代值');
  });

  test('an arbiter upholding a pure reject (choice B) rolls the annotator back to pending in official_run', async ({ page }) => {
    await skipGuidelineModal(page);
    await page.goto(buildWorkspaceUrl({
      task_id: TASK, sample_id: SAMPLE, role: 'reviewer', run_type: 'official_run',
      annotator_id: ANNOTATOR, reviewer_id: ARBITER,
    }));
    await seed(page, { role: 'annotator', payload: labelPayload('positive'), identity: { annotatorId: ANNOTATOR } });
    await seed(page, {
      role: 'reviewer',
      payload: labelPayload('positive', 'reject'),
      identity: { annotatorId: ANNOTATOR, reviewerId: REVIEWER },
    });
    await page.reload();

    await page.getByTestId('ws-arbitration-choose-b').click();
    await fillArbitrationReasons(page);
    await page.getByTestId('ws-arbitration-submit').click();

    const submitted = await page.evaluate((a) =>
      (window as unknown as { LabelSuiteAnnotationWorkspaceData: WorkspaceData })
        .LabelSuiteAnnotationWorkspaceData.getSubmission(
          'T001', 'annotator', 'official_run', 'sent-001', { annotatorId: a }
        ), ANNOTATOR
    );
    const savedAnswers = await page.evaluate((a) =>
      (window as unknown as { LabelSuiteAnnotationWorkspaceData: WorkspaceData })
        .LabelSuiteAnnotationWorkspaceData.getSampleAnswers(
          'T001', 'annotator', 'official_run', 'sent-001', { annotatorId: a }
        ), ANNOTATOR
    );
    // markSampleRejected flips status to 'pending' while keeping the
    // existing answers -- getSubmission (submitted-only) must read null,
    // while the answers themselves survive for the annotator to revise.
    expect(submitted).toBeNull();
    expect(savedAnswers).not.toBeNull();
  });
});

test.describe('issue #551 -- min_reviewers = 1 quorum converges a lone correction immediately', () => {
  test('the sole reviewer differing from the annotator finalizes without entering the dispute pool', async ({ page }) => {
    await page.goto(buildWorkspaceUrl({ task_id: TASK, sample_id: SAMPLE, role: 'annotator' }));
    await seed(page, { role: 'annotator', payload: labelPayload('sad'), identity: { annotatorId: ANNOTATOR } });
    await seed(page, {
      role: 'reviewer',
      payload: labelPayload('fear'),
      identity: { annotatorId: ANNOTATOR, reviewerId: REVIEWER },
    });

    expect(await unitStatus(page, { annotatorId: ANNOTATOR })).toBe('finalized');
  });

  test('an arbiter opening the same unit sees the read-only finalized card, not the arbitration layout', async ({ page }) => {
    await skipGuidelineModal(page);
    await page.goto(buildWorkspaceUrl({
      task_id: TASK, sample_id: SAMPLE, role: 'reviewer', run_type: 'official_run',
      annotator_id: ANNOTATOR, reviewer_id: ARBITER,
    }));
    await seed(page, { role: 'annotator', payload: labelPayload('sad'), identity: { annotatorId: ANNOTATOR } });
    await seed(page, {
      role: 'reviewer',
      payload: labelPayload('fear'),
      identity: { annotatorId: ANNOTATOR, reviewerId: REVIEWER },
    });
    await page.reload();

    await expect(page.getByTestId('ws-review-finalized-card')).toBeVisible();
    await expect(page.getByTestId('ws-arbitration-card')).toHaveCount(0);
  });
});
