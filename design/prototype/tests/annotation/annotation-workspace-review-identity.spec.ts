import { test, expect, type Page } from '@playwright/test';
import { buildWorkspaceUrl, dismissGuidelineModal, skipGuidelineModal } from './_workspace-helpers';

/* Review identity foundation (spec 015 v3.8.0, issue #145).
 *
 * Before this version a submission bucket was keyed (task, role, run_type)
 * only: every reviewer wrote into the same bucket, and official_run recorded
 * the annotator as the literal string 'current'. "Who annotated this and who
 * reviewed it" was therefore not merely unbuilt -- it was unrepresentable.
 *
 * These tests pin the identity dimensions themselves, not a layout: they
 * assert through getSampleHistory()'s trail (annotator -> reviewer, each
 * event carrying its actor id) rather than through bucket key strings, so
 * the storage key format stays an implementation detail. */

type TrailEvent = { action: string; role: string; actorId: string | null; at: string; summary: string };

const ANNOTATOR_A = 'kioleemg12';
const ANNOTATOR_B = '113450022';
const REVIEWER_A = 'reviewer_wang';
const REVIEWER_B = 'reviewer_li';

async function readTrail(
  page: Page,
  args: { taskId: string; runType: string; sampleId: string; annotatorId: string }
): Promise<TrailEvent[]> {
  return page.evaluate((a) => {
    const data = (window as unknown as {
      LabelSuiteAnnotationWorkspaceData: {
        getSampleHistory: (
          taskId: string,
          runType: string,
          sampleId: string,
          identity: { annotatorId: string }
        ) => TrailEvent[];
      };
    }).LabelSuiteAnnotationWorkspaceData;
    return data.getSampleHistory(a.taskId, a.runType, a.sampleId, { annotatorId: a.annotatorId });
  }, args);
}

async function readSampleStatus(
  page: Page,
  args: { taskId: string; role: string; runType: string; sampleId: string; annotatorId: string }
): Promise<string> {
  return page.evaluate((a) => {
    const data = (window as unknown as {
      LabelSuiteAnnotationWorkspaceData: {
        getSampleStatus: (
          taskId: string,
          role: string,
          runType: string,
          sampleId: string,
          identity: { annotatorId: string }
        ) => string;
      };
    }).LabelSuiteAnnotationWorkspaceData;
    return data.getSampleStatus(a.taskId, a.role, a.runType, a.sampleId, { annotatorId: a.annotatorId });
  }, args);
}

/* T001 ships a single output type (single_label), so official_run renders
 * exactly one approve/reject pair -- one click completes the decision set
 * handleOfficialRunSubmit() validates. */
async function approveAndSubmitAsReviewer(page: Page, reviewerId: string) {
  await page.goto(
    buildWorkspaceUrl({
      task_id: 'T001',
      sample_id: 'sent-001',
      role: 'reviewer',
      run_type: 'official_run',
      reviewer_id: reviewerId,
    })
  );
  await dismissGuidelineModal(page);
  await page.getByTestId('ws-review-row-approve').click();
  await page.getByTestId('ws-review-submit-btn').click();
}

const TRAIL = { taskId: 'T001', runType: 'official_run', sampleId: 'sent-001', annotatorId: ANNOTATOR_A };

test.beforeEach(async ({ page }) => {
  await skipGuidelineModal(page);
});

test.describe('review identity foundation', () => {
  test('two reviewers on the same annotator keep independent submission buckets', async ({ page }) => {
    await approveAndSubmitAsReviewer(page, REVIEWER_A);
    await approveAndSubmitAsReviewer(page, REVIEWER_B);

    const reviewerEvents = (await readTrail(page, TRAIL)).filter((e) => e.role === 'reviewer');
    expect(reviewerEvents.map((e) => e.actorId)).toEqual([REVIEWER_A, REVIEWER_B]);
  });

  test('a review decision records the real reviewer id and never the string current', async ({ page }) => {
    await approveAndSubmitAsReviewer(page, REVIEWER_A);

    const reviewerEvents = (await readTrail(page, TRAIL)).filter((e) => e.role === 'reviewer');
    expect(reviewerEvents).toHaveLength(1);
    expect(reviewerEvents[0].actorId).toBe(REVIEWER_A);
    expect(reviewerEvents[0].summary).toContain(ANNOTATOR_A);
    expect(reviewerEvents[0].summary).not.toContain('current');
  });

  test('an official_run annotator submission is stored under the real annotator id', async ({ page }) => {
    await page.goto(
      buildWorkspaceUrl({
        task_id: 'T001',
        sample_id: 'sent-001',
        run_type: 'official_run',
        annotator_id: ANNOTATOR_A,
      })
    );
    await dismissGuidelineModal(page);
    await page.getByTestId('ws-single-label-chip-negative').click();
    await page.getByTestId('ws-submit-btn').click();

    const annotatorEvents = (await readTrail(page, TRAIL)).filter((e) => e.role === 'annotator');
    expect(annotatorEvents.map((e) => e.actorId)).toEqual([ANNOTATOR_A]);

    /* The annotator dimension is real, not decorative: a second annotator on
       the same sample has nothing submitted. */
    const otherStatus = await readSampleStatus(page, {
      taskId: 'T001',
      role: 'annotator',
      runType: 'official_run',
      sampleId: 'sent-001',
      annotatorId: ANNOTATOR_B,
    });
    expect(otherStatus).toBe('pending');
  });

  test('the trail reads annotator then reviewer in submission order', async ({ page }) => {
    await page.goto(
      buildWorkspaceUrl({
        task_id: 'T001',
        sample_id: 'sent-001',
        run_type: 'official_run',
        annotator_id: ANNOTATOR_A,
      })
    );
    await dismissGuidelineModal(page);
    await page.getByTestId('ws-single-label-chip-negative').click();
    await page.getByTestId('ws-submit-btn').click();

    await approveAndSubmitAsReviewer(page, REVIEWER_A);

    const trail = await readTrail(page, TRAIL);
    expect(trail.map((e) => [e.role, e.actorId])).toEqual([
      ['annotator', ANNOTATOR_A],
      ['reviewer', REVIEWER_A],
    ]);
  });

  /* w6-resilience-a11y.md CONT-04 ("re-login" approximation): every other
   * test in this file operates a single `page` sequentially; this one opens
   * a SECOND Page in the same BrowserContext with the same annotator_id and
   * reads the first Page's submission back through it.
   * 限制標注: the prototype has no real session/JWT -- this only verifies
   * that re-entering with the same identity params reads back one's own
   * localStorage-bucketed data; token expiry / cross-device sync belong to
   * the real-backend E2E tier. */
  test('a second Page with the same annotator identity reads back the prior submission (CONT-04)', async ({ page, context }) => {
    await page.goto(
      buildWorkspaceUrl({
        task_id: 'T001',
        sample_id: 'sent-001',
        run_type: 'official_run',
        annotator_id: ANNOTATOR_A,
      })
    );
    await dismissGuidelineModal(page);
    await page.getByTestId('ws-single-label-chip-negative').click();
    await page.getByTestId('ws-submit-btn').click();

    const relogin = await context.newPage();
    await skipGuidelineModal(relogin);
    await relogin.goto(
      buildWorkspaceUrl({
        task_id: 'T001',
        sample_id: 'sent-001',
        run_type: 'official_run',
        annotator_id: ANNOTATOR_A,
      })
    );
    await dismissGuidelineModal(relogin);

    const status = await readSampleStatus(relogin, {
      taskId: 'T001',
      role: 'annotator',
      runType: 'official_run',
      sampleId: 'sent-001',
      annotatorId: ANNOTATOR_A,
    });
    expect(status).toBe('submitted');

    const annotatorEvents = (await readTrail(relogin, TRAIL)).filter((e) => e.role === 'annotator');
    expect(annotatorEvents.map((e) => e.actorId)).toEqual([ANNOTATOR_A]);

    await relogin.close();
  });

  test('omitting the identity params resolves to the default roster identity', async ({ page }) => {
    await page.goto(buildWorkspaceUrl({ task_id: 'T001', sample_id: 'sent-001', run_type: 'official_run' }));
    await dismissGuidelineModal(page);
    await page.getByTestId('ws-single-label-chip-negative').click();
    await page.getByTestId('ws-submit-btn').click();

    const status = await readSampleStatus(page, {
      taskId: 'T001',
      role: 'annotator',
      runType: 'official_run',
      sampleId: 'sent-001',
      annotatorId: ANNOTATOR_A,
    });
    expect(status).toBe('submitted');
  });
});
