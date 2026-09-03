import { test, expect } from '@playwright/test';
import {
  assertNoPageErrors,
  buildListUrl,
  patchDataFile,
  skipGuidelineModal,
  trackPageErrors,
} from './_workspace-helpers';

/* AC-1.27 (FR-096 試標歷史回饋 disclosure gate, Data Fairness NON-NEGOTIABLE).
 *
 * Sources (verified via grep -an on the change's delta spec/design):
 *   openspec/changes/2026-09-01-single-owner-review-relay/specs/annotation/
 *     015-annotation-workspace/spec.md:378 "### Requirement: FR-096 試標歷史回饋"
 *   同檔 :387 "揭露時機（Data Fairness NON-NEGOTIABLE）：本列表 MUST 僅在該試標回合
 *     全部標記提交、任務轉入 waiting_iaa_confirmation 之後對標記員開放。回合進行中
 *     MUST NOT 對標記員揭露任何定案結果、他人答案或審核判斷"
 *   同檔 :391-393 "#### Scenario: AC-1.27 回合結束後才開放試標歷史回饋"
 *   openspec/changes/2026-09-01-single-owner-review-relay/design.md:99-101
 *     "### D5：試標歷史回饋的揭露閘門（Data Fairness NON-NEGOTIABLE）... FR-096 的
 *     資料 MUST 以任務狀態為閘門...回合進行中查詢 MUST 回傳空集合並顯示說明，而
 *     （不是）回傳資料後在 UI 隱藏。"
 *   同檔 :103 "資料一旦進到前端就等於已洩漏...閘門必須在資料層。"
 *
 * Contract this Red spec fixes for the Green tasks (7.2 data layer / 7.3 UI),
 * since neither spec.md nor design.md names a JS symbol or testid:
 *   - `window.LabelSuiteAnnotationWorkspaceData.getDryRunFeedback(taskId,
 *     'dry_run', { annotatorId })` -- mirrors the existing
 *     `getReworkReasons(taskId, runType, sampleId, identity)` /
 *     `getSubmittedSampleCount(taskId, role, runType, identity)` calling
 *     convention in this same file. MUST return `[]` while the task's
 *     `LabelSuiteTaskListData` status is not `waiting_iaa_confirmation` --
 *     this is the literal data-layer assertion D5 requires: an
 *     implementation that computes the full row set and only withholds it
 *     in the DOM renderer (not in this function) fails the first test
 *     below even though its rendered page would look identical.
 *   - Rendered on annotation-list.html (design.md:153 "FR-096 試標歷史回饋
 *     ...落在 annotation-list.html 標記員視角，不另開畫面"), gated behind these
 *     testids: `ws-dry-run-feedback-pending` (explanation shown while the
 *     round is still in progress), `ws-dry-run-feedback-summary` (modified
 *     count once open), `ws-dry-run-feedback-row` (one row per modified
 *     sample), and inside a row: `ws-dry-run-feedback-source` (finalization
 *     source + named decider), `ws-dry-run-feedback-reason` (verbatim
 *     reason), `ws-dry-run-feedback-guideline-link` (clickable jump to the
 *     referenced guideline section).
 *   - Source/decider label text reuses the already-shared vocabulary in
 *     pages/shared/annotation-history.js (ACTION_LABEL.modified = '審核修正',
 *     verified at that file's line 85) rather than inventing a second label
 *     set, so the row's source area is expected to contain '審核修正' plus
 *     the deciding reviewer's actorId (`reviewer_wang`, REVIEWER_ROSTER[0],
 *     annotation-workspace.data.js:215).
 *
 * Disagreement flagged, not silently resolved: spec.md:378-388 point 1
 * ("被修改筆數...與其占比") and point 3's source enumeration ("定案來源（審核員
 * 通過／仲裁採 A／仲裁採 B／例外池收尾）") are not obviously the same list --
 * point 3 names "審核員通過" (reviewer APPROVED, i.e. unchanged) as a possible
 * finalization source, while point 1 frames the whole feature around
 * "被修改" (MODIFIED) items only. An approved-unchanged row has no
 * before/after diff worth a feedback entry. This spec exercises only the
 * unambiguous case both readings agree on -- a reviewer-modified row -- and
 * does not assert what "審核員通過" rows do inside this list; that
 * discrepancy should be resolved with the maintainer before task 7.2/7.3
 * lock in a row-inclusion rule for approved-unchanged samples.
 */

const TASK_ID = 'T002'; // dry_run, multi_label; task-list.data.js:87 status baseline is already 'waiting_iaa_confirmation'.
const MY_ANNOTATOR_ID = 'kioleemg12'; // DEFAULT_ANNOTATOR_ID, annotation-workspace.data.js:213.
const DECIDER_ID = 'reviewer_wang'; // REVIEWER_ROSTER[0].id, annotation-workspace.data.js:215 ("王小明").
const SAMPLE_ID = 'emo-001';
const MY_ANSWER = ['sad', 'fear'];
const FINAL_ANSWER = ['sad', 'angry'];
const REASON_TEXT = '依標註指南「情緒詞判讀原則」章節：語句缺少明確語氣詞，不成立 surprise，應改標為 angry。';

const PEER_SAMPLE_ID = 'emo-002';
const PEER_ANNOTATOR_ID = '113450022';
const PEER_ANSWER = ['happy', 'disgust'];
const PEER_FINAL_ANSWER = ['happy', 'surprise'];
const PEER_MARKER = 'PEER-FEEDBACK-MARKER-b7e2';

/* Reuses the two already-exported, already-tested primitives the T014-T017
 * review-flow demo seeder (annotation-workspace.data.js ~L2779) builds
 * fixtures from, rather than hand-writing the localStorage bucket schema:
 * an annotator submit followed by a reviewer submit whose `decisions` map
 * marks the output APPROVE with a changed value, which
 * appendReviewDecisionEvents (annotation-workspace.data.js:399-412) turns
 * into a 'modified' history event carrying `reason` and the reviewer's
 * `actorId`. */
function seedModifiedFeedbackScript(
  sampleId: string,
  annotatorId: string,
  myAnswer: string[],
  finalAnswer: string[],
  reason: string
): string {
  return `
    (function () {
      var data = window.LabelSuiteAnnotationWorkspaceData;
      var identity = { annotatorId: ${JSON.stringify(annotatorId)}, reviewerId: ${JSON.stringify(DECIDER_ID)} };
      data.markSampleSubmitted(${JSON.stringify(TASK_ID)}, 'annotator', 'dry_run', ${JSON.stringify(sampleId)},
        { previewState: { multi_label: { selected: ${JSON.stringify(myAnswer)} } } }, '', identity);
      data.markSampleSubmitted(${JSON.stringify(TASK_ID)}, 'reviewer', 'dry_run', ${JSON.stringify(sampleId)},
        {
          previewState: { multi_label: { selected: ${JSON.stringify(finalAnswer)} } },
          decisions: { multi_label: 'approve' },
          reasons: { multi_label: ${JSON.stringify(reason)} }
        }, '', identity);
    })();
  `;
}

function readDryRunFeedback(page: import('@playwright/test').Page, annotatorId: string) {
  return page.evaluate(
    ({ taskId, annotatorId: id }) => {
      return (window as any).LabelSuiteAnnotationWorkspaceData.getDryRunFeedback(taskId, 'dry_run', {
        annotatorId: id,
      });
    },
    { taskId: TASK_ID, annotatorId }
  );
}

test.beforeEach(async ({ page }) => {
  await skipGuidelineModal(page);
});

test.describe('AC-1.27: dry-run history feedback disclosure gate (FR-096)', () => {
  test('dry_run_in_progress: data layer withholds the round even though a modified sample already exists', async ({ page }) => {
    // Force the task's status DOWN to in-progress despite the seed's
    // baseline waiting_iaa_confirmation (task-list.data.js:87), so this
    // test proves the gate reacts to status, not to whether feedback DATA
    // happens to exist.
    await patchDataFile(
      page,
      'task-list.data.js',
      `window.LabelSuiteTaskListData.tasks.find(function (t) { return t.id === ${JSON.stringify(TASK_ID)}; }).status = 'dry_run_in_progress';`
    );
    await patchDataFile(
      page,
      'annotation-workspace.data.js',
      seedModifiedFeedbackScript(SAMPLE_ID, MY_ANNOTATOR_ID, MY_ANSWER, FINAL_ANSWER, REASON_TEXT)
    );

    await page.goto(buildListUrl({ task_id: TASK_ID, run_type: 'dry_run' }));

    // Data-layer contract (design.md D5): the query itself MUST return an
    // empty set while in progress -- NOT a full result the UI merely hides.
    const rows = await readDryRunFeedback(page, MY_ANNOTATOR_ID);
    expect(rows).toEqual([]);

    // UI-level: an explanation that the round is still in progress, not a
    // silently empty list.
    await expect(page.getByTestId('ws-dry-run-feedback-pending')).toBeVisible();
    await expect(page.getByTestId('ws-dry-run-feedback-row')).toHaveCount(0);

    // No finalization detail leaks into the DOM either, even hidden.
    await expect(page.locator('body')).not.toContainText(REASON_TEXT);
    await expect(page.locator('body')).not.toContainText(DECIDER_ID);
  });

  test('waiting_iaa_confirmation: reveals modified count, my-answer -> finalized-result, named source, verbatim reason, and a guideline jump link', async ({ page }) => {
    await patchDataFile(
      page,
      'annotation-workspace.data.js',
      seedModifiedFeedbackScript(SAMPLE_ID, MY_ANNOTATOR_ID, MY_ANSWER, FINAL_ANSWER, REASON_TEXT)
    );

    await page.goto(buildListUrl({ task_id: TASK_ID, run_type: 'dry_run' }));

    const rows = await readDryRunFeedback(page, MY_ANNOTATOR_ID);
    expect(rows.length).toBeGreaterThan(0);

    await expect(page.getByTestId('ws-dry-run-feedback-summary')).toContainText('1');

    const row = page.getByTestId('ws-dry-run-feedback-row').first();
    await expect(row).toContainText('fear'); // my original answer's distinguishing label
    await expect(row).toContainText('angry'); // finalized result's distinguishing label
    await expect(row.getByTestId('ws-dry-run-feedback-source')).toContainText('審核修正'); // ACTION_LABEL.modified
    await expect(row.getByTestId('ws-dry-run-feedback-source')).toContainText(DECIDER_ID);
    await expect(row.getByTestId('ws-dry-run-feedback-reason')).toHaveText(REASON_TEXT);

    const errors = trackPageErrors(page);
    const guidelineLink = row.getByTestId('ws-dry-run-feedback-guideline-link');
    await expect(guidelineLink).toBeVisible();
    await guidelineLink.click();
    assertNoPageErrors(errors);
  });

  test('never shows another annotator\'s answers, in progress or after confirmation', async ({ page }) => {
    await patchDataFile(
      page,
      'annotation-workspace.data.js',
      seedModifiedFeedbackScript(SAMPLE_ID, MY_ANNOTATOR_ID, MY_ANSWER, FINAL_ANSWER, REASON_TEXT) +
        seedModifiedFeedbackScript(PEER_SAMPLE_ID, PEER_ANNOTATOR_ID, PEER_ANSWER, PEER_FINAL_ANSWER, PEER_MARKER)
    );

    await page.goto(buildListUrl({ task_id: TASK_ID, run_type: 'dry_run' }));

    const rows = await readDryRunFeedback(page, MY_ANNOTATOR_ID);
    expect(rows.length).toBeGreaterThan(0);
    expect(JSON.stringify(rows)).not.toContain(PEER_MARKER);
    expect(JSON.stringify(rows)).not.toContain('disgust');

    await expect(page.locator('body')).not.toContainText(PEER_MARKER);
    await expect(page.locator('body')).not.toContainText('disgust');
  });
});
