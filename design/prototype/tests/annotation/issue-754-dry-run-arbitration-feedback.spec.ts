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
const ADOPT_A_SAMPLE_ID = 'arb-fb-754-02';
const REJECT_SAMPLE_ID = 'arb-fb-754-03';
const MY_VALUE = 'negative'; // the annotator's own original single_label answer.
const REVIEWER_VALUE = 'positive'; // the reviewer's `modify` correction -- what B/adopt_b must finalize to.
const REASON_TEXT = '仲裁定案理由（issue #754 迴歸測試）：採納審核員修正值。';
const ADOPT_A_REASON_TEXT = '仲裁定案理由（issue #754 迴歸測試）：維持標記員原答案。';
const REJECT_REASON_TEXT = '仲裁定案理由（issue #754 迴歸測試）：兩者皆非，兩造答案皆不可採。';

/* Reuses the already-tested data-layer primitives directly (same convention
 * as issue-596-dry-run-feedback.spec.ts's seedModifiedFeedbackScript): an
 * annotator submit, a reviewer `modify` submit that creates a real diff on
 * `single_label` (a no-merge-key output type, so getDisputeItems() always
 * yields exactly one item whose `key` equals its `outKey` -- see
 * annotation-workspace.data.js:2194's "Granularity is the outKey itself"
 * comment -- keeping the arbitration itemId deterministic), then an arbiter
 * resolving the one dispute item via submitArbitration(). `valueExpr` is
 * raw JS (not a JSON literal) evaluated inside the injected script, so a
 * caller can hand it `items[0].annotatorValue` / `items[0].reviewerValues[...]`
 * -- values the dispute item only knows once seeded in-page, not something
 * this Node-side generator could precompute. */
function seedAndArbitrateScript(sampleId: string, choice: string, valueExpr: string, reason: string): string {
  return `
    (function () {
      var data = window.LabelSuiteAnnotationWorkspaceData;
      var identity = { annotatorId: ${JSON.stringify(MY_ANNOTATOR_ID)}, reviewerId: ${JSON.stringify(REVIEWER_ID)} };
      data.markSampleSubmitted(${JSON.stringify(TASK_ID)}, 'annotator', 'dry_run', ${JSON.stringify(sampleId)},
        { previewState: { single_label: { selected: ${JSON.stringify(MY_VALUE)} } } }, '', identity);
      data.markSampleSubmitted(${JSON.stringify(TASK_ID)}, 'reviewer', 'dry_run', ${JSON.stringify(sampleId)},
        {
          previewState: { single_label: { selected: ${JSON.stringify(REVIEWER_VALUE)} } },
          decisions: { single_label: 'modify' },
          reasons: { single_label: '審核修正（fixture）' }
        }, '', identity);

      var items = data.getDisputeItems(
        ${JSON.stringify(TASK_ID)}, 'dry_run', ${JSON.stringify(sampleId)}, identity, ['single_label']
      );
      if (items.length !== 1) {
        throw new Error('fixture assumption broken: expected exactly 1 dispute item, got ' + items.length);
      }
      var itemId = items[0].outKey + '::' + items[0].key;

      var arbiterIdentity = { annotatorId: ${JSON.stringify(MY_ANNOTATOR_ID)}, reviewerId: ${JSON.stringify(ARBITER_ID)} };
      data.submitArbitration(${JSON.stringify(TASK_ID)}, 'dry_run', ${JSON.stringify(sampleId)}, arbiterIdentity, [
        { itemId: itemId, choice: ${JSON.stringify(choice)}, value: ${valueExpr}, reason: ${JSON.stringify(reason)} }
      ]);
    })();
  `;
}

function seedAdjudicatedFeedbackScript(): string {
  return seedAndArbitrateScript(
    SAMPLE_ID, 'adopt_b', `items[0].reviewerValues[${JSON.stringify(REVIEWER_ID)}]`, REASON_TEXT
  );
}

/* Raw history event, bypassing convertSubmissionAnswer/getDryRunFeedback's
 * summarization -- the two new tests below assert the RAW `result_snapshot`
 * field the Green fix writes (or, for `reject`, its absence), not a
 * formatted-for-display value.
 *
 * Filters to `action` explicitly instead of taking `history[length - 1]`:
 * getSampleHistory() merges the annotator bucket and every reviewer bucket
 * for this sample, then sorts by `at` (an ISO string built from
 * `new Date().toISOString()`). This fixture's three writes -- the
 * annotator's own 'submitted', the reviewer's 'submitted', and the
 * arbiter's 'adjudicated' -- happen synchronously in the same script tick
 * and can land on the exact same millisecond, at which point Array.sort's
 * stability (not timestamp order) decides their relative position, and
 * which bucket's 'submitted' event sorts after 'adjudicated' is an
 * implementation detail of getSampleHistory()'s bucket-iteration order --
 * NOT something this test should depend on. Filtering to the one action
 * this test cares about sidesteps that tie entirely, matching the same
 * defensive pattern buildDryRunFeedbackRow() itself already uses
 * (DRY_RUN_FEEDBACK_SOURCE_ACTIONS filter before taking the last item). */
function readLastEventByAction(page: import('@playwright/test').Page, sampleId: string, action: string) {
  return page.evaluate(
    ({ taskId, sampleId: id, annotatorId, action: wantedAction }) => {
      const data = (window as any).LabelSuiteAnnotationWorkspaceData;
      const history = data.getSampleHistory(taskId, 'dry_run', id, { annotatorId });
      const matches = history.filter((event: any) => event.action === wantedAction);
      return matches[matches.length - 1] || null;
    },
    { taskId: TASK_ID, sampleId, annotatorId: MY_ANNOTATOR_ID, action }
  );
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

  /* Code-review finding (PR #762): the adopt_b test above only proves the
   * B branch. adopt_a and reject are exercised elsewhere (e.g.
   * issue-750-bypass-modify-dispute.spec.ts's adopt_a case) but only via an
   * indirect "unit reaches 已定稿" assertion -- nothing compares the raw
   * `result_snapshot` value adopt_a writes. This test closes that gap with
   * a direct field-level comparison instead of another indirect proxy. */
  test('arbiter adopts A (keep annotator\'s own answer): result_snapshot must equal the annotator\'s own submitted payload exactly', async ({ page }) => {
    await patchDataFile(
      page,
      'annotation-workspace.data.js',
      seedAndArbitrateScript(ADOPT_A_SAMPLE_ID, 'adopt_a', 'items[0].annotatorValue', ADOPT_A_REASON_TEXT)
    );
    await page.goto(buildListUrl({ task_id: TASK_ID, run_type: 'dry_run' }));

    const event = await readLastEventByAction(page, ADOPT_A_SAMPLE_ID, 'adjudicated');
    expect(event).not.toBeNull();
    expect(event.actorId).toBe(ARBITER_ID);
    expect(event.reason).toBe(ADOPT_A_REASON_TEXT);

    // Direct field comparison, not the convertSubmissionAnswer-mediated
    // check the adopt_b test above uses: this is exactly what
    // buildResultSnapshot(annotatorAnswers) must produce from the payload
    // seeded above (previewEntities/previewTriples absent from that
    // payload, so buildResultSnapshot's `payload[field] != null` guard
    // omits both keys entirely -- they must NOT appear as `null`).
    expect(event.result_snapshot).toEqual({ previewState: { single_label: { selected: MY_VALUE } } });

    // FR-096 feedback must also read the (unchanged) annotator value as
    // the finalized result for this sample.
    const finalizedValue = await page.evaluate(
      ({ taskId, annotatorId, sampleId }) => {
        const data = (window as any).LabelSuiteAnnotationWorkspaceData;
        const rows = data.getDryRunFeedback(taskId, 'dry_run', { annotatorId });
        const row = rows.filter((r: any) => r.sampleId === sampleId)[0];
        return row ? data.convertSubmissionAnswer('single_label', row.finalizedAnswer) : null;
      },
      { taskId: TASK_ID, annotatorId: MY_ANNOTATOR_ID, sampleId: ADOPT_A_SAMPLE_ID }
    );
    expect(finalizedValue).toBe(MY_VALUE);
  });

  test('arbiter rejects both sides (兩者皆非): result_snapshot stays absent, and FR-096 feedback keeps falling back to entry.answers unchanged', async ({ page }) => {
    await patchDataFile(
      page,
      'annotation-workspace.data.js',
      // design.md D2 / config.js's own `select('reject', null, rejectBtn)`:
      // the reject choice's UI-supplied value is `null`, not a sentinel.
      seedAndArbitrateScript(REJECT_SAMPLE_ID, 'reject', 'null', REJECT_REASON_TEXT)
    );
    await page.goto(buildListUrl({ task_id: TASK_ID, run_type: 'dry_run' }));

    const event = await readLastEventByAction(page, REJECT_SAMPLE_ID, 'adjudicated');
    expect(event).not.toBeNull();
    expect(event.actorId).toBe(ARBITER_ID);
    expect(event.reason).toBe(REJECT_REASON_TEXT);

    // arbitrationFinalizedSnapshot() must return null for `reject`
    // (design.md D2's "bypass 不存值" convention extended to "no adopted
    // side"), and appendHistoryEvent's `!= null` filter must then leave the
    // key off the stored event entirely -- not present as a stored `null`.
    expect(event.result_snapshot).toBeUndefined();
    expect(Object.prototype.hasOwnProperty.call(event, 'result_snapshot')).toBe(false);

    // Pre-#754 fallback behavior for "no snapshot to show" must be
    // unaffected by this change: FR-096 still shows the annotator's own
    // answer rather than nothing at all.
    const finalizedValue = await page.evaluate(
      ({ taskId, annotatorId, sampleId }) => {
        const data = (window as any).LabelSuiteAnnotationWorkspaceData;
        const rows = data.getDryRunFeedback(taskId, 'dry_run', { annotatorId });
        const row = rows.filter((r: any) => r.sampleId === sampleId)[0];
        return row ? data.convertSubmissionAnswer('single_label', row.finalizedAnswer) : null;
      },
      { taskId: TASK_ID, annotatorId: MY_ANNOTATOR_ID, sampleId: REJECT_SAMPLE_ID }
    );
    expect(finalizedValue).toBe(MY_VALUE);
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
