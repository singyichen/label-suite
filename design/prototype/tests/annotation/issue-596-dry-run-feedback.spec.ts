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
 *     pages/shared/annotation-history.js (ACTION_LABEL.adjudicated =
 *     '仲裁定案', verified at that file's line 88) rather than inventing a
 *     second label set. FR-092 point 2 (specs/annotation/015-annotation-
 *     workspace/spec.md:966, verified via /usr/bin/grep -n -- the repo's
 *     default `grep` wrapper silently skips this file, see issue #627's
 *     note on the same quirk) and AC-2.21's v5.0.0 revision (spec.md:257)
 *     settle a disagreement this file originally left open here: a
 *     reviewer's `modify` never takes effect on its own -- it only opens a
 *     dispute -- so the row's source area must show the ARBITER who
 *     resolved that dispute (`reviewer_chen`, REVIEWER_ROSTER[2],
 *     can_arbitrate: true, annotation-workspace.data.js:214), not the
 *     reviewer who merely proposed the correction. `DRY_RUN_FEEDBACK_
 *     SOURCE_ACTIONS` (annotation-workspace.data.js:1883) encodes this by
 *     excluding `modified`/`bypassed` from the set of actions that settle a
 *     row (issue #804).
 *
 * issue #804 correction (this file previously seeded only a reviewer
 * `modify` decision and asserted its '審核修正' label as the finalization
 * source -- exactly the bug FR-092 point 2 rules out: "修正不立即生效，該項
 * 改為進入爭議池待仲裁（FR-061），修正值成為仲裁的 B 選項" (spec.md:966). A
 * modify-only fixture now produces no feedback row at all -- buildDryRun
 * FeedbackRow (annotation-workspace.data.js:1896) returns null when no
 * `DRY_RUN_FEEDBACK_SOURCE_ACTIONS` member exists on the sample's trail --
 * so the fixtures below carry every sample through submit -> reviewer
 * `modify` -> arbiter `adopt_b`, the same pattern already proven in
 * issue-754-dry-run-arbitration-feedback.spec.ts. The previously-open
 * "does 審核員通過 belong in this list" question is moot for these fixtures
 * -- they never produce an `accepted` row -- and is left for whichever spec
 * exercises that case.
 */

const TASK_ID = 'T002'; // dry_run, multi_label; task-list.data.js:87 status baseline is already 'waiting_iaa_confirmation'.
const MY_ANNOTATOR_ID = 'kioleemg12'; // DEFAULT_ANNOTATOR_ID, annotation-workspace.data.js:210.
const DECIDER_ID = 'reviewer_wang'; // REVIEWER_ROSTER[0].id, annotation-workspace.data.js:212 ("王小明"). The assigned reviewer who PROPOSES the `modify` correction -- FR-092 point 2 means this id is never the finalization source shown to the annotator; see ARBITER_ID below.
const ARBITER_ID = 'reviewer_chen'; // REVIEWER_ROSTER[2].id, can_arbitrate: true, annotation-workspace.data.js:214 ("陳美玲"). Resolves the dispute `modify` opens (FR-061); its `adjudicated` decision is FR-096's actual "具名決策者".
const SAMPLE_ID = 'emo-001';
const MY_ANSWER = ['sad', 'fear'];
const REVIEWER_ANSWER = ['sad', 'angry']; // the reviewer's `modify` proposal -- the arbiter's `adopt_b` below finalizes to this (arbitrationFinalizedSnapshot() snapshots the reviewer's whole submission, annotation-workspace.data.js:2507).
const REASON_TEXT = '依標註指南「情緒詞判讀原則」章節：語句缺少明確語氣詞，不成立 surprise，應改標為 angry。'; // the ARBITER's reason for adopting B -- FR-096's "理由原文" is the settling action's reason, not the reviewer's `modify` reason.

const PEER_SAMPLE_ID = 'emo-002';
const PEER_ANNOTATOR_ID = '113450022';
const PEER_ANSWER = ['happy', 'disgust'];
const PEER_REVIEWER_ANSWER = ['happy', 'surprise'];
const PEER_MARKER = 'PEER-FEEDBACK-MARKER-b7e2'; // used as the PEER's arbitration reason -- must never leak into MY_ANNOTATOR_ID's feedback rows.

/* Used ONLY by the `dry_run_in_progress` test below: a reviewer `modify`
 * decision alone (annotator submit + reviewer submit with
 * decisions.multi_label = 'modify') is enough to prove the status gate
 * reacts to TASK STATUS, not to whether any settling data exists yet --
 * `modify` never becomes a settled row by itself (FR-092 point 2,
 * DRY_RUN_FEEDBACK_SOURCE_ACTIONS excludes it, issue #804), so this seed
 * deliberately stops short of arbitration. The `waiting_iaa_confirmation`
 * and peer-isolation tests further below need an actual settled row and
 * use seedAdjudicatedFeedbackScript() instead. Reuses the two
 * already-exported, already-tested primitives the T014-T016 review-flow
 * demo seeder (annotation-workspace.data.js ~L2779) builds fixtures from,
 * rather than hand-writing the localStorage bucket schema. */
function seedModifiedFeedbackScript(
  sampleId: string,
  annotatorId: string,
  myAnswer: string[],
  reviewerAnswer: string[],
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
          previewState: { multi_label: { selected: ${JSON.stringify(reviewerAnswer)} } },
          decisions: { multi_label: 'modify' },
          reasons: { multi_label: ${JSON.stringify(reason)} }
        }, '', identity);
    })();
  `;
}

/* issue #804 fix: the real v5.0.0 flow FR-096's feedback row reads from --
 * submit -> reviewer `modify` -> arbiter `adopt_b` -- the same chain
 * issue-754-dry-run-arbitration-feedback.spec.ts's seedAndArbitrateScript
 * already proves out, adapted to `multi_label` (T002's one configured
 * output type, task-list.data.js:78) instead of that file's `single_label`.
 * `multi_label`'s diffItemSets() (annotation-workspace.data.js ~1750) is
 * set-shaped, not scalar: a one-label swap (`fear` -> `angry`, `sad`
 * unchanged) produces TWO dispute items ('fear' present only on the
 * annotator's side, 'angry' present only on the reviewer's side), not issue
 * #754's single deterministic item -- so this resolves every item
 * getDisputeItems() returns instead of hardcoding `items[0]`. Each
 * decision's `value` is NOT what determines the row's finalized answer --
 * arbitrationFinalizedSnapshot() (annotation-workspace.data.js:2507) ignores
 * it for `adopt_b` and instead snapshots the reviewer's WHOLE submitted
 * payload, so `reviewerAnswer` below is what ends up as the row's
 * finalizedAnswer regardless of which item's value is passed. */
function seedAdjudicatedFeedbackScript(
  sampleId: string,
  annotatorId: string,
  myAnswer: string[],
  reviewerAnswer: string[],
  arbitrationReason: string
): string {
  return `
    (function () {
      var data = window.LabelSuiteAnnotationWorkspaceData;
      var identity = { annotatorId: ${JSON.stringify(annotatorId)}, reviewerId: ${JSON.stringify(DECIDER_ID)} };
      data.markSampleSubmitted(${JSON.stringify(TASK_ID)}, 'annotator', 'dry_run', ${JSON.stringify(sampleId)},
        { previewState: { multi_label: { selected: ${JSON.stringify(myAnswer)} } } }, '', identity);
      data.markSampleSubmitted(${JSON.stringify(TASK_ID)}, 'reviewer', 'dry_run', ${JSON.stringify(sampleId)},
        {
          previewState: { multi_label: { selected: ${JSON.stringify(reviewerAnswer)} } },
          decisions: { multi_label: 'modify' },
          reasons: { multi_label: '審核修正（fixture，FR-016A 理由必填）' }
        }, '', identity);

      var items = data.getDisputeItems(
        ${JSON.stringify(TASK_ID)}, 'dry_run', ${JSON.stringify(sampleId)}, identity, ['multi_label']
      );
      if (!items.length) {
        throw new Error('fixture assumption broken: expected at least 1 dispute item, got 0');
      }

      var arbiterIdentity = { annotatorId: ${JSON.stringify(annotatorId)}, reviewerId: ${JSON.stringify(ARBITER_ID)} };
      var decisions = items.map(function (item) {
        return {
          itemId: item.outKey + '::' + item.key,
          choice: 'adopt_b',
          value: item.reviewerValues[${JSON.stringify(DECIDER_ID)}],
          reason: ${JSON.stringify(arbitrationReason)}
        };
      });
      data.submitArbitration(${JSON.stringify(TASK_ID)}, 'dry_run', ${JSON.stringify(sampleId)}, arbiterIdentity, decisions);
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
      seedModifiedFeedbackScript(SAMPLE_ID, MY_ANNOTATOR_ID, MY_ANSWER, REVIEWER_ANSWER, REASON_TEXT)
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
      seedAdjudicatedFeedbackScript(SAMPLE_ID, MY_ANNOTATOR_ID, MY_ANSWER, REVIEWER_ANSWER, REASON_TEXT)
    );

    await page.goto(buildListUrl({ task_id: TASK_ID, run_type: 'dry_run' }));

    const rows = await readDryRunFeedback(page, MY_ANNOTATOR_ID);
    expect(rows.length).toBeGreaterThan(0);

    await expect(page.getByTestId('ws-dry-run-feedback-summary')).toContainText('1');

    const row = page.getByTestId('ws-dry-run-feedback-row').first();
    await expect(row).toContainText('fear'); // my original answer's distinguishing label
    await expect(row).toContainText('angry'); // arbiter-adjudicated result's distinguishing label (adopt_b -> the reviewer's proposed value)
    await expect(row.getByTestId('ws-dry-run-feedback-source')).toContainText('仲裁定案'); // ACTION_LABEL.adjudicated -- FR-092 point 2: `modify` alone never finalizes.
    await expect(row.getByTestId('ws-dry-run-feedback-source')).toContainText(ARBITER_ID); // the named decider is the arbiter, not the proposing reviewer.
    await expect(row.getByTestId('ws-dry-run-feedback-reason')).toHaveText(REASON_TEXT); // the settling action's (arbitration) reason, not the reviewer's `modify` reason.

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
      seedAdjudicatedFeedbackScript(SAMPLE_ID, MY_ANNOTATOR_ID, MY_ANSWER, REVIEWER_ANSWER, REASON_TEXT) +
        seedAdjudicatedFeedbackScript(PEER_SAMPLE_ID, PEER_ANNOTATOR_ID, PEER_ANSWER, PEER_REVIEWER_ANSWER, PEER_MARKER)
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
