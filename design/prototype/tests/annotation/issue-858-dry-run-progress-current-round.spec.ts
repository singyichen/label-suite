/*
 * Traceability: specs/annotation/015-annotation-workspace/spec.md AC-2.9
 * (:246, "中欄頂部樣本導覽列 ... 進度摘要顯示『已提交筆數 / 總筆數』，並於
 * 提交後即時更新") and the interface definition at :268 ("annotator 為
 * `已提交筆數 / 總筆數`"). FR-096 v6.7.0 (:974, issue #834) already
 * establishes that dry-run progress must be computed PER TRIAL ROUND ("被
 * 修改筆數與占比逐回合分列計算，不得將多個回合合併為單一分母") for the
 * dry-run feedback surface; this file pins the same per-round contract for
 * AC-2.9's own progress counter, which the current implementation violates
 * (getSubmittedSampleCount() in annotation-workspace.data.js is round-
 * agnostic). This is a restore-to-spec bug fix, not a new requirement --
 * AC-2.9's "已提交筆數" for a dry_run task is only meaningful over the round
 * the annotator can currently act on; the same round-scoping precedent
 * task-detail.html already applies via getCurrentRoundSubmittedCount()
 * (issue #850, PR #857) is asserted here for annotation-workspace.html's own
 * nav progress instead. Issue #858.
 *
 * Defect: countSubmittedUnits()'s annotator branch
 * (annotation-workspace.config.js ~:1549-1553) calls
 * getSubmittedSampleCount(), which counts every 'submitted' bucket entry
 * regardless of entry.trialRound (annotation-workspace.data.js
 * ~:514-519) -- submissionBucketKey() carries no round dimension, so R{n}'s
 * stale entries are never excluded once R{n+1} starts. After R1 is fully
 * submitted (5/5) and R2 begins, submitting 1 sample in R2 overwrites only
 * that one bucket entry (issue #834 D1) -- the other 4 stay stamped
 * trialRound: 1 and keep counting, so the nav still reads 5/5 instead of
 * 1/5.
 *
 * Green picks the fix (most likely: route the annotator dry_run branch
 * through getCurrentRoundSubmittedCount(), the same helper task-detail.html
 * already uses); this file asserts only the observable #wsProgressText
 * rendering, never a specific internal function name.
 */
import { test, expect, type Page } from '@playwright/test';
import { buildWorkspaceUrl, skipGuidelineModal } from './_workspace-helpers';

const TASK_ID = 'T002';
const MY_ANNOTATOR_ID = 'kioleemg12';
// T002 (multi-label.json) ships exactly these 5 dataset records
// (task-detail.data.js profiles.T002.datasetRecords).
const ALL_SAMPLES = ['emo-001', 'emo-002', 'emo-003', 'emo-004', 'emo-005'];
// Mirrors task-detail.html's own TRIAL_RUN_STATE_KEY / task-list.data.js's
// loadTrialRunState() -- the shared {trialRounds: [...]} record
// annotation-workspace.data.js's currentTrialRound() reads back via
// task-detail.data.js's profiles overlay (task-detail.data.js :1336-1365).
const TRIAL_RUN_STATE_KEY = 'labelsuite.trialRunState';

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
};

function workspaceUrl(runType: 'dry_run' | 'official_run', sampleId = 'emo-001'): string {
  return buildWorkspaceUrl({ task_id: TASK_ID, sample_id: sampleId, role: 'annotator', run_type: runType });
}

/* Submits `sampleIds` as the annotator, in the given round context (round
 * is whatever currentTrialRound(TASK_ID) resolves to AT CALL TIME on the
 * already-loaded page -- task-detail.data.js's profiles overlay only
 * recomputes on a fresh script load, so this must run on a page already
 * reflecting the desired round). */
async function submitSamples(page: Page, runType: 'dry_run' | 'official_run', sampleIds: string[]) {
  await page.evaluate(
    ({ taskId, runType, sampleIds, annotatorId }) => {
      const data = (window as unknown as { LabelSuiteAnnotationWorkspaceData: WorkspaceDataGlobal })
        .LabelSuiteAnnotationWorkspaceData;
      sampleIds.forEach((sampleId) => {
        data.markSampleSubmitted(
          taskId,
          'annotator',
          runType,
          sampleId,
          { previewState: { multi_label: { selected: ['sad'] } } },
          '',
          { annotatorId }
        );
      });
    },
    { taskId: TASK_ID, runType, sampleIds, annotatorId: MY_ANNOTATOR_ID }
  );
}

/* Writes the shared trial-round record directly (same mechanism PR #857's
 * tests use for task-detail.html) so a fresh page load resolves
 * currentTrialRound(TASK_ID) === 2, without driving task-detail.html's UI --
 * this issue is scoped to annotation-workspace.html's own nav progress. */
async function advanceToRoundTwo(page: Page) {
  await page.evaluate(
    ({ key, taskId }) => {
      window.localStorage.setItem(key, JSON.stringify({ [taskId]: { trialRounds: [{ round: 1 }, { round: 2 }] } }));
    },
    { key: TRIAL_RUN_STATE_KEY, taskId: TASK_ID }
  );
  await page.reload();
}

test.describe('issue #858: dry_run annotator nav progress must count only the current trial round', () => {
  test('R2 with exactly 1 current-round submission after R1 fully submitted reads 1/5, not 5/5', async ({ page }) => {
    await skipGuidelineModal(page);
    await page.goto(workspaceUrl('dry_run'));

    // R1 (round defaults to 1, no trial-round record seeded yet): submit all
    // 5 samples, stamping every entry trialRound: 1.
    await submitSamples(page, 'dry_run', ALL_SAMPLES);
    await page.reload();

    // Guard: R1's completion actually wrote all 5 as submitted before this
    // test starts exercising the round boundary.
    await expect(page.getByTestId('ws-progress-text')).toContainText('5 / 5');

    // Advance to R2. Per issue #834 D1, R2 reuses the same 5-sample batch;
    // none of R1's entries are R2 submissions.
    await advanceToRoundTwo(page);

    // Real R2 submission of exactly ONE sample -- overwrites that sample's
    // bucket entry (issue #834 D1), stamping it trialRound: 2. The other 4
    // samples remain stamped trialRound: 1 from R1.
    await submitSamples(page, 'dry_run', ['emo-001']);
    await page.reload();

    // Only 1 of R2's 5 samples has actually been submitted in R2 -- must not
    // read as complete off R1's 4 leftover entries.
    await expect(page.getByTestId('ws-progress-text')).toContainText('1 / 5');
    await expect(page.getByTestId('ws-progress-text')).not.toContainText('5 / 5');
  });

  test('regression guard: official_run progress still counts every submission (no round scoping applies)', async ({
    page,
  }) => {
    await skipGuidelineModal(page);
    await page.goto(workspaceUrl('official_run'));

    // Advance the task's dry_run round context to R2 first -- official_run
    // submissions carry no trialRound stamp at all (markSampleSubmitted only
    // stamps it for role === 'annotator' && runType === 'dry_run'), so a fix
    // that keys off currentTrialRound() for every runType, instead of
    // gating explicitly on dry_run, would wrongly filter these out.
    await advanceToRoundTwo(page);

    await submitSamples(page, 'official_run', ['emo-001', 'emo-002', 'emo-003']);
    await page.reload();

    await expect(page.getByTestId('ws-progress-text')).toContainText('3 / 5');
  });

  test('R1 (single round) is unaffected: 2 of 5 submitted reads 2/5', async ({ page }) => {
    await skipGuidelineModal(page);
    await page.goto(workspaceUrl('dry_run'));

    // No trial-round record seeded -- currentTrialRound(TASK_ID) defaults to
    // 1, matching the trialRound: 1 stamp every entry below gets.
    await submitSamples(page, 'dry_run', ['emo-001', 'emo-002']);
    await page.reload();

    await expect(page.getByTestId('ws-progress-text')).toContainText('2 / 5');
  });
});
