/*
 * Traceability: specs/_archive/014-task-detail/spec.md FR-013(3) (:622) --
 *   creating R{n} (n>=2) from waiting_iaa_confirmation and switching the
 *   status to dry_run_in_progress is one action with no observable
 *   intermediate state, and FR-008a must not flip the task back to
 *   waiting_iaa_confirmation before any submission in the new round.
 * specs/annotation/015-annotation-workspace/spec.md :212/:214 (the
 *   annotation list reads the list task-detail created, per trial_round),
 *   :1027 (materializedRuns is created by the task-detail run publish
 *   event), AC-1.28 (:171, per-round feedback disclosure). Issue #850.
 *
 * Defect: task-detail.html and the annotation pages share no state.
 * task-detail keeps TASK_DATA in memory only (lost on navigation/reload --
 * see issue-791-trial-round-from-waiting.spec.ts's comment on the same
 * point). The annotation pages instead read two independent STATIC seeds:
 * the round from task-detail.data.js profiles[taskId].materializedRuns
 * (currentTrialRound() in annotation-workspace.data.js, and annotation-list
 * .html's own runCtx.round read), and the status from
 * task-list.data.js tasks[i].status. Creating R2 in task-detail therefore
 * has no effect on what the annotation pages disclose. The round and the
 * status must move together as one write: moving only the round would let
 * getDryRunFeedback()'s DISCLOSED_ROUND_OFFSET disclose the in-progress
 * round's own submissions -- a Data Fairness leak.
 *
 * Green picks the storage/sharing mechanism; this file asserts only
 * observable UI/state, never a specific localStorage key name.
 */
import { test, expect, type Page } from '@playwright/test';
import { buildListUrl, patchDataFile } from '../annotation/_workspace-helpers';

const TASK_ID = 'T002';
const TASK_DETAIL_URL = '/pages/task-management/task-detail.html';
const MY_ANNOTATOR_ID = 'kioleemg12';
const REVIEWER_ID = 'reviewer_wang';
const DRY_RUN_PROGRESS_KEY = 'labelsuite.prototypeDryRunProgress';
const R1_SAMPLE = 'emo-004';
// T002 (multi-label.json) ships exactly these 5 dataset records
// (task-detail.data.js profiles.T002.datasetRecords).
const ALL_SAMPLES = ['emo-001', 'emo-002', 'emo-003', 'emo-004', 'emo-005'];

type WorkspaceDataGlobal = {
  markSampleSubmitted: (
    taskId: string,
    role: 'annotator' | 'reviewer',
    runType: 'dry_run' | 'official_run',
    sampleId: string,
    payload: Record<string, unknown>,
    historySummary: string,
    identity: { annotatorId?: string; reviewerId?: string }
  ) => void;
  syncDryRunProgress: (
    taskId: string,
    role: 'annotator' | 'reviewer',
    runType: 'dry_run' | 'official_run',
    totalSamples: number,
    identity: { annotatorId?: string; reviewerId?: string }
  ) => void;
};

/* Same pattern as issue-791-trial-round-from-waiting.spec.ts's
 * publishDryRunRound(): canPublish()'s isolation risk-confirm modal can open
 * before the FR-017 revision-note dialog; T002 does not seed
 * isolationEnabled, so this is kept for parity rather than relied upon. */
async function publishDryRunRound(page: Page) {
  await page.locator('#publishDryRunBtn').click();
  const riskModal = page.locator('#riskModal');
  if (await riskModal.isVisible()) {
    await page.locator('#riskConfirmBtn').click();
  }
}

/* Drives the same FR-017 revision-note gate as
 * issue-838-fr017-revision-note-gate.spec.ts's openRevisionModalFromWaiting,
 * through to a completed R2 creation. */
async function createRoundTwoFromWaiting(page: Page) {
  await publishDryRunRound(page);
  const revisionModal = page.locator('#trialRoundRevisionModal');
  await expect(revisionModal).toBeVisible();
  await page.locator('#priorRoundFindingsInput').fill('R1 的多標籤分類在少數樣本上分歧較大');
  await page.locator('#guidelineChangeSummaryInput').fill('補充邊界案例的正反例說明');
  await page.locator('#trialRoundRevisionConfirmBtn').click();
}

async function readTaskStatus(page: Page, taskId: string): Promise<string | null> {
  return page.evaluate((id) => {
    const win = window as unknown as { LabelSuiteTaskListData: { tasks: Array<{ id: string; status: string }> } };
    const found = (win.LabelSuiteTaskListData.tasks || []).find((t) => t.id === id);
    return found ? found.status : null;
  }, taskId);
}

/* Seeds one reviewed R1 submission (annotator answer + reviewer 'approve'),
 * so buildDryRunFeedbackRow() has a settling 'accepted' action to report.
 * T002 has no seeded materializedRuns, so currentTrialRound(T002) defaults
 * to 1 -- markSampleSubmitted() stamps entry.trialRound = 1 here, matching
 * the "reviewed R1 submission stamped trialRound: 1" precondition. */
function seedR1ReviewedSubmissionJs(): string {
  return `
    (function () {
      var data = window.LabelSuiteAnnotationWorkspaceData;
      var identity = { annotatorId: ${JSON.stringify(MY_ANNOTATOR_ID)}, reviewerId: ${JSON.stringify(REVIEWER_ID)} };
      data.markSampleSubmitted(${JSON.stringify(TASK_ID)}, 'annotator', 'dry_run', ${JSON.stringify(R1_SAMPLE)},
        { previewState: { multi_label: { selected: ['sad'] } } }, '', identity);
      data.markSampleSubmitted(${JSON.stringify(TASK_ID)}, 'reviewer', 'dry_run', ${JSON.stringify(R1_SAMPLE)},
        {
          previewState: { multi_label: { selected: ['sad'] } },
          decisions: { multi_label: 'approve' },
          reasons: {}
        }, '', identity);
    })();
  `;
}

/* Seeds all 5 of T002's dataset records as submitted-by-annotator (R1 fully
 * submitted), then calls syncDryRunProgress() exactly like
 * annotation-workspace.config.js's real submit handler does -- writing
 * DRY_RUN_PROGRESS_KEY as {submittedSamples: 5, totalSamples: 5}. */
function seedFullR1SubmissionJs(): string {
  const calls = ALL_SAMPLES.map(
    (sampleId) =>
      `data.markSampleSubmitted(${JSON.stringify(TASK_ID)}, 'annotator', 'dry_run', ${JSON.stringify(sampleId)}, { previewState: { multi_label: { selected: ['sad'] } } }, '', identity);`
  ).join('\n      ');
  return `
    (function () {
      var data = window.LabelSuiteAnnotationWorkspaceData;
      var identity = { annotatorId: ${JSON.stringify(MY_ANNOTATOR_ID)}, reviewerId: ${JSON.stringify(REVIEWER_ID)} };
      ${calls}
      data.syncDryRunProgress(${JSON.stringify(TASK_ID)}, 'annotator', 'dry_run', ${ALL_SAMPLES.length}, identity);
    })();
  `;
}

test.describe('issue #850: task-detail and annotation pages share no trial-round/status source', () => {
  test('key scenario: R2 created in task-detail shows up as R2 + pending cue on the annotation side, R1 feedback stays visible, no R2 row leaks', async ({
    page,
  }) => {
    await patchDataFile(page, 'annotation-workspace.data.js', seedR1ReviewedSubmissionJs());

    // T002 is seeded waiting_iaa_confirmation (task-list.data.js), so no
    // &status= URL override is needed -- this is the task's real seed state.
    await page.goto(`${TASK_DETAIL_URL}?task_id=${TASK_ID}`);
    await expect(page.locator('#statusBadge')).toContainText('待 IAA 確認');

    await createRoundTwoFromWaiting(page);
    await expect(page.locator('#statusBadge')).toContainText('試標進行中');
    await expect(page.locator('#trialRoundTimeline .round-timeline-item')).toHaveCount(2);

    await page.goto(buildListUrl({ task_id: TASK_ID, role: 'annotator', run_type: 'dry_run' }));

    // Vacuous-pass guards: R1's feedback group must genuinely exist before
    // asserting anything is absent from it.
    const groups = page.getByTestId('ws-dry-run-feedback-round');
    await expect(groups).toHaveCount(1);
    await expect(groups.first()).toHaveAttribute('data-round', '1');
    await expect(groups.first().getByTestId('ws-dry-run-feedback-round-title')).toContainText('R1');

    // The task info card must reflect task-detail's R2, not the static seed's
    // round-1 fallback (annotation-list.html reads
    // profile.materializedRuns[run_type].round, which T002's static seed
    // never carries).
    await expect(page.locator('#taskInfoDetail')).toContainText('試標回合 R2');
    // The pending-feedback cue renders only when the annotation-side status
    // is NOT one of the "ended round" statuses (DRY_RUN_FEEDBACK_ENDED_
    // STATUSES in annotation-list.html) -- i.e. only once the status also
    // moved to dry_run_in_progress.
    await expect(page.getByTestId('ws-dry-run-feedback-pending')).toBeVisible();

    // Data Fairness guard: only R1 may ever be disclosed while R2 is
    // in-progress -- still true here, but this pins the invariant so a
    // half-fix (round moves, status doesn't) cannot silently start leaking
    // R2's own rows once the round advances for real.
    await expect(page.getByTestId('ws-dry-run-feedback-round')).toHaveCount(1);
  });

  test('status travels with the round: annotation-side task list resolves dry_run_in_progress, not waiting_iaa_confirmation', async ({
    page,
  }) => {
    await page.goto(`${TASK_DETAIL_URL}?task_id=${TASK_ID}`);
    await expect(page.locator('#statusBadge')).toContainText('待 IAA 確認');

    await createRoundTwoFromWaiting(page);
    await expect(page.locator('#statusBadge')).toContainText('試標進行中');

    await page.goto(buildListUrl({ task_id: TASK_ID, role: 'annotator', run_type: 'dry_run' }));
    const status = await readTaskStatus(page, TASK_ID);

    // Guard: the task must still resolve from the seed at all.
    expect(status).not.toBeNull();
    expect(status).toBe('dry_run_in_progress');
  });

  test('reload persistence, plus the synthetic-R1 trap: task-detail keeps R2 (and R1) across a reload instead of resetting to the seed', async ({
    page,
  }) => {
    await page.goto(`${TASK_DETAIL_URL}?task_id=${TASK_ID}`);
    await expect(page.locator('#statusBadge')).toContainText('待 IAA 確認');

    await createRoundTwoFromWaiting(page);
    await expect(page.locator('#statusBadge')).toContainText('試標進行中');
    await expect(page.locator('#trialRoundTimeline .round-timeline-item')).toHaveCount(2);

    await page.reload();

    await expect(page.locator('#statusBadge')).toContainText('試標進行中');
    // getTrialRounds()'s synthetic fallback re-synthesizes only R1 on a
    // fresh TASK_DATA -- so a naive reload drops R2 straight back to 1 round.
    await expect(page.locator('#trialRoundTimeline .round-timeline-item')).toHaveCount(2);
    await expect(page.locator('#trialRoundTimeline .round-timeline-item').nth(0)).toContainText('R1');
    await expect(page.locator('#trialRoundTimeline .round-timeline-item').nth(1)).toContainText('R2');
  });

  test('no immediate flip-back (FR-013(3)): R2 created after a fully-submitted R1 stays dry_run_in_progress across reload', async ({
    page,
  }) => {
    await page.addInitScript(
      ({ key, taskId }) => {
        window.localStorage.setItem(
          key,
          JSON.stringify({ runType: 'dry_run', taskId, submittedSamples: 5, totalSamples: 5 })
        );
      },
      { key: DRY_RUN_PROGRESS_KEY, taskId: TASK_ID }
    );

    await page.goto(`${TASK_DETAIL_URL}?task_id=${TASK_ID}&status=dry_run_in_progress`);
    // R1's dry-run progress is fully submitted, so
    // syncStatusFromDryRunProgress() flips the task into
    // waiting_iaa_confirmation on load (same setup as issue-791's second
    // test).
    await expect(page.locator('#statusBadge')).toContainText('待 IAA 確認');

    await createRoundTwoFromWaiting(page);
    await expect(page.locator('#statusBadge')).toContainText('試標進行中');

    await page.reload();

    await expect(page.locator('#statusBadge')).toContainText('試標進行中');
  });

  test('per-round progress count: exactly one R2 submission must not read as R2 fully done', async ({ page }) => {
    await patchDataFile(page, 'annotation-workspace.data.js', seedFullR1SubmissionJs());
    await page.goto(buildListUrl({ task_id: TASK_ID, role: 'annotator', run_type: 'dry_run' }));

    // Guard: R1's completion actually wrote the fully-submitted progress
    // flag this test's mechanism depends on.
    const initialProgress = await page.evaluate((key) => window.localStorage.getItem(key), DRY_RUN_PROGRESS_KEY);
    expect(initialProgress).not.toBeNull();
    expect(JSON.parse(initialProgress as string)).toMatchObject({ submittedSamples: 5, totalSamples: 5 });

    await page.goto(`${TASK_DETAIL_URL}?task_id=${TASK_ID}&status=dry_run_in_progress`);
    await expect(page.locator('#statusBadge')).toContainText('待 IAA 確認');

    await createRoundTwoFromWaiting(page);
    await expect(page.locator('#statusBadge')).toContainText('試標進行中');

    // Exactly one R2 submission: re-submitting the same dataset record on
    // the annotation side overwrites its bucket entry, because the
    // submission bucket key carries no round dimension
    // (submissionBucketKey() in annotation-workspace.data.js). So
    // getSubmittedSampleCount() still reports all 5 of R1's stale entries as
    // submitted after only 1 real R2 submission.
    await page.goto(buildListUrl({ task_id: TASK_ID, role: 'annotator', run_type: 'dry_run' }));
    await page.evaluate(
      ({ taskId, sampleId, annotatorId, reviewerId }) => {
        const data = (window as unknown as { LabelSuiteAnnotationWorkspaceData: WorkspaceDataGlobal })
          .LabelSuiteAnnotationWorkspaceData;
        const identity = { annotatorId, reviewerId };
        data.markSampleSubmitted(
          taskId,
          'annotator',
          'dry_run',
          sampleId,
          { previewState: { multi_label: { selected: ['sad', 'fear'] } } },
          '',
          identity
        );
        data.syncDryRunProgress(taskId, 'annotator', 'dry_run', 5, identity);
      },
      { taskId: TASK_ID, sampleId: 'emo-001', annotatorId: MY_ANNOTATOR_ID, reviewerId: REVIEWER_ID }
    );

    await page.goto(`${TASK_DETAIL_URL}?task_id=${TASK_ID}&status=dry_run_in_progress`);

    await expect(page.locator('#statusBadge')).toContainText('試標進行中');
  });

  test('fallback regression (guard, not Red): seeded tasks still show their own seed rounds with no task-detail action', async ({
    page,
  }) => {
    // Cross-checks annotation-list-task-info.spec.ts's existing assertions
    // for the same two tasks -- must keep passing untouched by #850's fix.
    await page.goto(buildListUrl({ task_id: 'T004', role: 'annotator', run_type: 'dry_run' }));
    await expect(page.locator('#taskInfoDetail')).toContainText('試標回合 R2');

    await page.goto(buildListUrl({ task_id: 'T009', role: 'annotator', run_type: 'dry_run' }));
    await expect(page.locator('#taskInfoDetail')).toContainText('試標回合 R1');
  });
});
