import { test, expect, type Page } from '@playwright/test';
import { buildListUrl } from './_workspace-helpers';

/* Review-flow demo: dry-05's blocking decision (issues #502, #837).
 *
 * T014 dry-05-pending-review x kioleemg12 used to demonstrate the reject
 * branch (issue #502): reviewer_wang's decision was `reject`, and dry_run
 * has no rollback channel (markSampleRejected(),
 * annotation-workspace.data.js:559, already early-returns for anything but
 * official_run) -- so the annotator stayed 'submitted'.
 *
 * issue #837 (maintainer ruling, 2026-09-19): `REVIEW_DECISIONS` has been
 * `approve | modify | bypass` only since v5.0.0 (issue #596), and no code
 * path has produced a reviewer-level `reject` decision that way since --
 * dry-05 was the last seed row still writing one directly. It is now a
 * `bypass` instead: same blocking effect (a decision carrying no correction
 * forces the unit into dispute, per DISPUTE_FORCING_DECISIONS), same
 * dry_run-has-no-rollback-channel shape, just expressed with a decision
 * value the current product can actually produce.
 *
 * issue #551 (v4.54.0) established the underlying rule this file still
 * pins: a decision carrying no value change (previously a pure reject, now
 * dry-05's bypass) does not read as an implicit AGREEMENT vote
 * (compareOutputAnswer sees no diff) -- it blocks finalization instead, so
 * the unit stays disputed until an arbiter resolves it (or a later reviewer
 * submits a correction).
 *
 * issue #815: the official_run companion describe block that used to live
 * here (T017 oft-05-pending-review, `rejectBy` simulating a reviewer-level
 * `reject` decision on official_run) is deleted, not retargeted --
 * `REVIEW_DECISIONS` has been `approve | modify | bypass` only since v5.0.0
 * (issue #596), so no seed row anywhere can produce a reviewer-level reject
 * for official_run to witness.
 *
 * Traceability: specs/annotation/015-annotation-workspace/spec.md
 *   FR-014I, FR-044, FR-051, FR-061, FR-092, AC-1.25, AC-3.15, AC-6.4
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

test.describe('issue #502/#837 -- dry_run bypass: decision recorded, no rework backlog', () => {
  test('reviewer_li bypassing dry-05 x kioleemg12 leaves the annotator submitted', async ({ page }) => {
    await page.goto(buildListUrl({ task_id: 'T014', role: 'reviewer', run_type: 'dry_run' }));

    const annotatorIdentity = { annotatorId: 'kioleemg12' };
    const reviewerIdentity = { annotatorId: 'kioleemg12', reviewerId: 'reviewer_li' };

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
    const reviewerEntry = history.find((event) => event.role === 'reviewer' && event.actorId === 'reviewer_li');
    expect(reviewerEntry?.summary ?? '').toContain('bypass');

    // No 'rejected' event on the ANNOTATOR's own history -- dry_run never
    // calls markSampleRejected's rollback path.
    expect(history.some((event) => event.action === 'rejected')).toBe(false);
  });

  test('the unit still derives a known REVIEW_UNIT_STATUS value, not a special "rejected" state', async ({ page }) => {
    await page.goto(buildListUrl({ task_id: 'T014', role: 'reviewer', run_type: 'dry_run' }));

    const identity = { annotatorId: 'kioleemg12', reviewerId: 'reviewer_li' };
    const status = await getReviewUnitStatus(
      page, 'T014', 'dry_run', 'dry-05-pending-review', identity, ['single_label'], 1
    );
    const knownValues = await knownReviewUnitStatusValues(page);
    expect([...knownValues, null]).toContain(status);
    // issue #551 (superseded by issue #837's bypass rewrite): a decision
    // carrying no correction does not read as an agreement vote -- it
    // blocks finalization, so the unit stays disputed (this was 'finalized'
    // before v4.54.0; see the file header).
    expect(status).toBe('disputed');
  });

  test('the reviewer list badge for dry-05 x kioleemg12 reads 爭議中, not a silent finalize (issue #551)', async ({ page }) => {
    await page.goto(buildListUrl({ task_id: 'T014', role: 'reviewer', run_type: 'dry_run', reviewer_id: 'reviewer_li' }));

    const target = page.getByTestId('ws-sample-item')
      .filter({ hasText: 'dry-05-pending-review' })
      .filter({ hasText: 'kioleemg12' });
    await expect(target).toHaveCount(1);
    await expect(target.locator('.status-badge')).toHaveText('爭議中 · 未定稿');
  });
});
