import { test, expect, type Page } from '@playwright/test';
import { buildListUrl } from './_workspace-helpers';

/* Review-flow demo: the reject branch (issue #502).
 *
 * The three review-flow diagrams (docs/diagrams/workflow/) agree on every
 * branch except one: reject is the ONLY node with zero demo data behind it,
 * and it is exactly where dry_run and official_run diverge --
 * markSampleRejected() (annotation-workspace.data.js:466) already early-
 * returns for anything but official_run, but seedReviewFlowDemo()'s 29
 * scripted rows never exercised that branch at all.
 *
 * This file pins two additions to the existing T014/T017 seed rows (no new
 * dataset records, no new REVIEWER_MOCK_ROWS entries -- both samples already
 * existed as unreviewed "pending" rows before this issue):
 *   - T014 dry-05-pending-review x kioleemg12: reviewer_wang's decision is
 *     now `reject`, but dry_run has no rollback channel -- the annotator
 *     stays 'submitted' and the unit still finalizes normally (agree value).
 *   - T017 oft-05-pending-review x kioleemg12: reviewer_wang's decision is
 *     `reject` on official_run -- markSampleRejected() rolls the annotator
 *     back to 'pending' (existing answers kept), opening a rework backlog,
 *     while the reviewer's own decision still counts as a real review.
 *
 * Traceability: specs/annotation/015-annotation-workspace/spec.md
 *   FR-014I, AC-3.15, AC-6.4
 */

interface Identity {
  annotatorId?: string;
  reviewerId?: string;
}

interface HistoryEvent {
  action: string;
  role: string;
  actorId: string | null;
  summary: string;
}

interface WorkspaceData {
  getSampleStatus: (taskId: string, role: string, runType: string, sampleId: string, identity: Identity) => string;
  getSampleAnswers: (taskId: string, role: string, runType: string, sampleId: string, identity: Identity) => unknown;
  getSubmission: (taskId: string, role: string, runType: string, sampleId: string, identity: Identity) => unknown;
  getSampleHistory: (taskId: string, runType: string, sampleId: string, identity: Identity) => HistoryEvent[];
  getReviewUnitStatus: (
    taskId: string, runType: string, sampleId: string, identity: Identity, outKeys: string[], opts?: { minReviewers?: number }
  ) => string | null;
  REVIEW_UNIT_STATUS: Record<string, string>;
}

async function getSampleStatus(page: Page, taskId: string, role: string, runType: string, sampleId: string, identity: Identity) {
  return page.evaluate(
    ([t, r, rt, s, id]) =>
      (window as unknown as { LabelSuiteAnnotationWorkspaceData: WorkspaceData }).LabelSuiteAnnotationWorkspaceData
        .getSampleStatus(t, r, rt, s, id as Identity),
    [taskId, role, runType, sampleId, identity] as const
  );
}

async function getSampleAnswers(page: Page, taskId: string, role: string, runType: string, sampleId: string, identity: Identity) {
  return page.evaluate(
    ([t, r, rt, s, id]) =>
      (window as unknown as { LabelSuiteAnnotationWorkspaceData: WorkspaceData }).LabelSuiteAnnotationWorkspaceData
        .getSampleAnswers(t, r, rt, s, id as Identity),
    [taskId, role, runType, sampleId, identity] as const
  );
}

async function getSubmission(page: Page, taskId: string, role: string, runType: string, sampleId: string, identity: Identity) {
  return page.evaluate(
    ([t, r, rt, s, id]) =>
      (window as unknown as { LabelSuiteAnnotationWorkspaceData: WorkspaceData }).LabelSuiteAnnotationWorkspaceData
        .getSubmission(t, r, rt, s, id as Identity),
    [taskId, role, runType, sampleId, identity] as const
  );
}

async function getSampleHistory(page: Page, taskId: string, runType: string, sampleId: string, identity: Identity) {
  return page.evaluate(
    ([t, rt, s, id]) =>
      (window as unknown as { LabelSuiteAnnotationWorkspaceData: WorkspaceData }).LabelSuiteAnnotationWorkspaceData
        .getSampleHistory(t, rt, s, id as Identity),
    [taskId, runType, sampleId, identity] as const
  );
}

async function getReviewUnitStatus(
  page: Page, taskId: string, runType: string, sampleId: string, identity: Identity, outKeys: string[], minReviewers: number
) {
  return page.evaluate(
    ([t, rt, s, id, keys, min]) =>
      (window as unknown as { LabelSuiteAnnotationWorkspaceData: WorkspaceData }).LabelSuiteAnnotationWorkspaceData
        .getReviewUnitStatus(t, rt, s, id as Identity, keys as string[], { minReviewers: min as number }),
    [taskId, runType, sampleId, identity, outKeys, minReviewers] as const
  );
}

async function knownReviewUnitStatusValues(page: Page) {
  return page.evaluate(
    () =>
      Object.values(
        (window as unknown as { LabelSuiteAnnotationWorkspaceData: WorkspaceData }).LabelSuiteAnnotationWorkspaceData
          .REVIEW_UNIT_STATUS
      )
  );
}

test.describe('issue #502 -- dry_run reject: decision recorded, no rework backlog', () => {
  test('reviewer_wang rejecting dry-05 x kioleemg12 leaves the annotator submitted', async ({ page }) => {
    await page.goto(buildListUrl({ task_id: 'T014', role: 'reviewer', run_type: 'dry_run' }));

    const annotatorIdentity = { annotatorId: 'kioleemg12' };
    const reviewerIdentity = { annotatorId: 'kioleemg12', reviewerId: 'reviewer_wang' };

    const annotatorStatus = await getSampleStatus(
      page, 'T014', 'annotator', 'dry_run', 'dry-05-pending-review', annotatorIdentity
    );
    expect(annotatorStatus).toBe('submitted');

    // The reviewer's own decision is still a real, stored submission --
    // this IS what "退回也計入已審人數" means: the review happened.
    const reviewerSubmission = await getSubmission(
      page, 'T014', 'reviewer', 'dry_run', 'dry-05-pending-review', reviewerIdentity
    );
    expect(reviewerSubmission).not.toBeNull();

    // The decision text is traceable on the reviewer's own history.
    const history = await getSampleHistory(page, 'T014', 'dry_run', 'dry-05-pending-review', annotatorIdentity);
    const reviewerEntry = history.find((event) => event.role === 'reviewer' && event.actorId === 'reviewer_wang');
    expect(reviewerEntry?.summary ?? '').toContain('reject');

    // No 'rejected' event on the ANNOTATOR's own history -- dry_run never
    // calls markSampleRejected's rollback path.
    expect(history.some((event) => event.action === 'rejected')).toBe(false);
  });

  test('the unit still derives a known REVIEW_UNIT_STATUS value, not a special "rejected" state', async ({ page }) => {
    await page.goto(buildListUrl({ task_id: 'T014', role: 'reviewer', run_type: 'dry_run' }));

    const identity = { annotatorId: 'kioleemg12', reviewerId: 'reviewer_wang' };
    const status = await getReviewUnitStatus(
      page, 'T014', 'dry_run', 'dry-05-pending-review', identity, ['single_label'], 1
    );
    const knownValues = await knownReviewUnitStatusValues(page);
    expect([...knownValues, null]).toContain(status);
    // Agree-valued reject with 1/1 reviewers reached: finalizes like any
    // other agreeing review -- reject is a decision, not a value change.
    expect(status).toBe('finalized');
  });

  test('the reviewer list badge for dry-05 x kioleemg12 reads 已定稿, same as a non-reject finalize', async ({ page }) => {
    await page.goto(buildListUrl({ task_id: 'T014', role: 'reviewer', run_type: 'dry_run' }));

    const target = page.getByTestId('ws-sample-item')
      .filter({ hasText: 'dry-05-pending-review' })
      .filter({ hasText: 'kioleemg12' });
    await expect(target).toHaveCount(1);
    await expect(target.locator('.status-badge')).toHaveText('已定稿 · 已鎖定');
  });
});

test.describe('issue #502 -- official_run reject: rollback to pending, rework backlog', () => {
  test('reviewer_wang rejecting oft-05 x kioleemg12 rolls the sample back to pending', async ({ page }) => {
    await page.goto(buildListUrl({ task_id: 'T017', role: 'reviewer', run_type: 'official_run' }));

    const annotatorIdentity = { annotatorId: 'kioleemg12' };
    const reviewerIdentity = { annotatorId: 'kioleemg12', reviewerId: 'reviewer_wang' };

    // Rework backlog: the annotator's own sample is back to 'pending'.
    const annotatorStatus = await getSampleStatus(
      page, 'T017', 'annotator', 'official_run', 'oft-05-pending-review', annotatorIdentity
    );
    expect(annotatorStatus).toBe('pending');

    // The annotator's original answers are kept, not wiped (they revise,
    // they don't re-label from scratch).
    const answers = await getSampleAnswers(
      page, 'T017', 'annotator', 'official_run', 'oft-05-pending-review', annotatorIdentity
    );
    expect(answers).toEqual({ previewState: { single_label: { selected: 'positive' } } });

    // The reviewer's own decision is still a real, stored submission --
    // official_run reject counts as a completed review too.
    const reviewerSubmission = await getSubmission(
      page, 'T017', 'reviewer', 'official_run', 'oft-05-pending-review', reviewerIdentity
    );
    expect(reviewerSubmission).not.toBeNull();

    // A 'rejected' event is traceable on the annotator's own history,
    // attributed to the reviewer who acted.
    const history = await getSampleHistory(page, 'T017', 'official_run', 'oft-05-pending-review', annotatorIdentity);
    const rejectedEvent = history.find((event) => event.action === 'rejected');
    expect(rejectedEvent).toBeTruthy();
    expect(rejectedEvent?.actorId).toBe('reviewer_wang');
  });

  test('the rolled-back unit derives a known REVIEW_UNIT_STATUS value, not a special "rejected" state', async ({ page }) => {
    await page.goto(buildListUrl({ task_id: 'T017', role: 'reviewer', run_type: 'official_run' }));

    const identity = { annotatorId: 'kioleemg12', reviewerId: 'reviewer_wang' };
    const status = await getReviewUnitStatus(
      page, 'T017', 'official_run', 'oft-05-pending-review', identity, ['single_label'], 2
    );
    const knownValues = await knownReviewUnitStatusValues(page);
    expect([...knownValues, null]).toContain(status);
    // No stored annotator submission anymore (it was rolled back) --
    // getReviewUnitStatus has nothing to review yet.
    expect(status).toBeNull();
  });

  test('the reviewer list still renders the unit as 待審, matching a never-reviewed pending unit', async ({ page }) => {
    await page.goto(buildListUrl({ task_id: 'T017', role: 'reviewer', run_type: 'official_run' }));

    const rows = page.getByTestId('ws-sample-item').filter({ hasText: 'oft-05-pending-review' });
    await expect(rows).toHaveCount(1);
    await expect(rows.locator('.status-badge')).toHaveText('待審');
  });

  test('the annotator list surfaces the rework backlog as a pending item', async ({ page }) => {
    await page.goto(buildListUrl({ task_id: 'T017', role: 'annotator', run_type: 'official_run' }));

    const rows = page.getByTestId('ws-sample-item').filter({ hasText: 'oft-05-pending-review' });
    await expect(rows).toHaveCount(1);
    await expect(rows.locator('.status-badge')).not.toHaveText('已提交');
  });
});
