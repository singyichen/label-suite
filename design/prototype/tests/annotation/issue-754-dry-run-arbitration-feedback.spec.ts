import { test, expect } from '@playwright/test';
import { buildListUrl, patchDataFile, skipGuidelineModal } from './_workspace-helpers';

/* issue #754 (found during PR #752 / issue #750 code review): submitArbitration()
 * (annotation-workspace.data.js:2460) writes an 'adjudicated' history event via
 * appendSampleTimelineEvent() (:594) without ever passing a result snapshot --
 * appendSampleTimelineEvent()'s `extra` only ever carried
 * `{ reason, ...timingFields(timing) }`. buildDryRunFeedbackRow() (:1884) then
 * falls back to `entry.answers` (the annotator's OWN original answer) whenever
 * the sample's last settling action is `adjudicated`, so FR-096's "我的答案 →
 * 定案結果" pairing silently collapses into "我的答案 → 我的答案" instead of
 * showing what the arbiter actually decided.
 *
 * Sources (specs/annotation/015-annotation-workspace/spec.md, verified via
 * `/usr/bin/grep -n` -- the repo's default `grep` wrapper silently skips this
 * spec file, see issue #627's note on the same quirk):
 *   :966 "FR-096 ... 試標歷史回饋 ... 逐筆「我的答案 → 定案結果」對照 ..."
 *   :170 "AC-1.27 ... 任務轉入 waiting_iaa_confirmation 後，同一標記員可看到
 *         被修改筆數、逐筆「我的答案 → 定案結果」、定案來源與具名決策者 ..."
 * Neither line carves out an exception for a sample whose settling action was
 * an arbitration -- "定案結果" must be the arbiter's decision whenever
 * `adjudicated` is the last settling action, exactly as it already is for
 * `accepted`/`modified` (both built via buildResultSnapshot(payload) at
 * annotation-workspace.data.js:408). This is a bug fix restoring already-
 * specified behavior, not a new requirement (Team Lead bug-fix track, no
 * OpenSpec change / no spec.md text change; see team-lead's 2026-09-14
 * Planner report for #754/#753).
 */

const TASK_ID = 'T002'; // dry_run baseline status is already waiting_iaa_confirmation (task-list.data.js).
const MY_ANNOTATOR_ID = 'kioleemg12'; // DEFAULT_ANNOTATOR_ID, annotation-workspace.data.js:210.
const REVIEWER_ID = 'reviewer_wang'; // REVIEWER_ROSTER[0].id -- the unit's one assigned reviewer (FR-093).
const ARBITER_ID = 'reviewer_chen'; // REVIEWER_ROSTER[2], can_arbitrate: true, non-participant.
const SAMPLE_ID = 'arb-fb-754-01';
const MY_VALUE = 'negative'; // the annotator's own original single_label answer.
const REVIEWER_VALUE = 'positive'; // the reviewer's `modify` correction -- what B/adopt_b must finalize to.
const REASON_TEXT = '仲裁定案理由（issue #754 迴歸測試）：採納審核員修正值。';

/* Reuses the already-tested data-layer primitives directly (same convention
 * as issue-596-dry-run-feedback.spec.ts's seedModifiedFeedbackScript): an
 * annotator submit, a reviewer `modify` submit that creates a real diff on
 * `single_label` (a no-merge-key output type, so getDisputeItems() always
 * yields exactly one item whose `key` equals its `outKey` -- see
 * annotation-workspace.data.js:2194's "Granularity is the outKey itself"
 * comment -- keeping the arbitration itemId deterministic), then an arbiter
 * adopting B (the reviewer's corrected value) via submitArbitration(). */
function seedAdjudicatedFeedbackScript(): string {
  return `
    (function () {
      var data = window.LabelSuiteAnnotationWorkspaceData;
      var identity = { annotatorId: ${JSON.stringify(MY_ANNOTATOR_ID)}, reviewerId: ${JSON.stringify(REVIEWER_ID)} };
      data.markSampleSubmitted(${JSON.stringify(TASK_ID)}, 'annotator', 'dry_run', ${JSON.stringify(SAMPLE_ID)},
        { previewState: { single_label: { selected: ${JSON.stringify(MY_VALUE)} } } }, '', identity);
      data.markSampleSubmitted(${JSON.stringify(TASK_ID)}, 'reviewer', 'dry_run', ${JSON.stringify(SAMPLE_ID)},
        {
          previewState: { single_label: { selected: ${JSON.stringify(REVIEWER_VALUE)} } },
          decisions: { single_label: 'modify' },
          reasons: { single_label: '審核修正（fixture）' }
        }, '', identity);

      var items = data.getDisputeItems(
        ${JSON.stringify(TASK_ID)}, 'dry_run', ${JSON.stringify(SAMPLE_ID)}, identity, ['single_label']
      );
      if (items.length !== 1) {
        throw new Error('fixture assumption broken: expected exactly 1 dispute item, got ' + items.length);
      }
      var itemId = items[0].outKey + '::' + items[0].key;

      var arbiterIdentity = { annotatorId: ${JSON.stringify(MY_ANNOTATOR_ID)}, reviewerId: ${JSON.stringify(ARBITER_ID)} };
      data.submitArbitration(${JSON.stringify(TASK_ID)}, 'dry_run', ${JSON.stringify(SAMPLE_ID)}, arbiterIdentity, [
        { itemId: itemId, choice: 'adopt_b', value: items[0].reviewerValues[${JSON.stringify(REVIEWER_ID)}], reason: ${JSON.stringify(REASON_TEXT)} }
      ]);
    })();
  `;
}

function readAdjudicatedFeedbackRow(page: import('@playwright/test').Page) {
  return page.evaluate(
    ({ taskId, annotatorId, sampleId }) => {
      const data = (window as any).LabelSuiteAnnotationWorkspaceData;
      const rows = data.getDryRunFeedback(taskId, 'dry_run', { annotatorId });
      const row = rows.filter((r: any) => r.sampleId === sampleId)[0];
      if (!row) return null;
      return {
        action: row.action,
        actorId: row.actorId,
        reason: row.reason,
        myValue: data.convertSubmissionAnswer('single_label', row.myAnswer),
        finalizedValue: data.convertSubmissionAnswer('single_label', row.finalizedAnswer),
      };
    },
    { taskId: TASK_ID, annotatorId: MY_ANNOTATOR_ID, sampleId: SAMPLE_ID }
  );
}

test.beforeEach(async ({ page }) => {
  await skipGuidelineModal(page);
});

test.describe('issue #754: FR-096 dry-run feedback must show the arbiter-adjudicated result, not the annotator\'s own answer', () => {
  test('arbiter adopts B (reviewer correction): finalizedAnswer must convert to the adopted value, not myAnswer', async ({ page }) => {
    await patchDataFile(page, 'annotation-workspace.data.js', seedAdjudicatedFeedbackScript());
    await page.goto(buildListUrl({ task_id: TASK_ID, run_type: 'dry_run' }));

    const result = await readAdjudicatedFeedbackRow(page);
    expect(result).not.toBeNull();
    expect(result!.action).toBe('adjudicated');
    expect(result!.actorId).toBe(ARBITER_ID);
    expect(result!.reason).toBe(REASON_TEXT);
    expect(result!.myValue).toBe(MY_VALUE);

    // The actual regression: today this reads MY_VALUE ('negative', the
    // entry.answers fallback) instead of the arbiter's adopted B value.
    expect(result!.finalizedValue).toBe(REVIEWER_VALUE);
  });

  test('regression guard: markSampleSkipped() keeps its existing reason-only event shape after appendSampleTimelineEvent()\'s signature extension', async ({ page }) => {
    const skipSampleId = 'skip-fb-754-01';
    const skipReason = '暫時跳過（issue #754 回歸保護測試）';
    await patchDataFile(
      page,
      'annotation-workspace.data.js',
      `
      (function () {
        var data = window.LabelSuiteAnnotationWorkspaceData;
        var identity = { annotatorId: ${JSON.stringify(MY_ANNOTATOR_ID)}, reviewerId: ${JSON.stringify(REVIEWER_ID)} };
        data.markSampleSkipped(${JSON.stringify(TASK_ID)}, 'dry_run', ${JSON.stringify(skipSampleId)}, ${JSON.stringify(skipReason)}, '', identity);
      })();
      `
    );
    await page.goto(buildListUrl({ task_id: TASK_ID, run_type: 'dry_run' }));

    const event = await page.evaluate(
      ({ taskId, sampleId, annotatorId }) => {
        const data = (window as any).LabelSuiteAnnotationWorkspaceData;
        const history = data.getSampleHistory(taskId, 'dry_run', sampleId, { annotatorId });
        return history[history.length - 1];
      },
      { taskId: TASK_ID, sampleId: skipSampleId, annotatorId: MY_ANNOTATOR_ID }
    );

    expect(event.action).toBe('skipped');
    expect(event.reason).toBe(skipReason);
    // markSampleSkipped() never had a result to snapshot -- the new
    // optional parameter must stay undefined for this call site, so
    // appendHistoryEvent's `!= null` filter must keep the field absent.
    expect(event.result_snapshot).toBeUndefined();
  });
});
