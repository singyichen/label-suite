import { test, expect } from '@playwright/test';
import { buildListUrl, patchDataFile, skipGuidelineModal } from './_workspace-helpers';

/* issue #834 -- FR-096 試標歷史回饋: the disclosure gate is judged PER ROUND,
 * not per task status (Data Fairness NON-NEGOTIABLE).
 *
 * Sources (change `annotation-dry-run-feedback-by-round`):
 *   specs/annotation/015-annotation-workspace/spec.md delta, FR-096
 *     "揭露閘門 MUST 以**回合**為單位判定，MUST NOT 以任務狀態整體判定"
 *     "開放後 MUST NOT 因任務建立 R{n+1}（任務狀態回到 `dry_run_in_progress`）
 *      或轉入 `official_run_in_progress`／`completed` 而收回"
 *     "無法判定所屬回合之提交，於任務處於 `dry_run_in_progress` 時 MUST 視為
 *      屬於進行中回合而不揭露（fail closed）"
 *   design.md D1 (submit-time `trialRound` stamp, source =
 *     `materializedRuns.dry_run.round`, default 1), D2 (disclosable-round
 *     table), D4 (untagged entries: withheld while in progress, attributed
 *     to the current round from `waiting_iaa_confirmation` on).
 *
 * Data-layer contract fixed here for Green 1.2:
 *   `getDryRunFeedback(taskId, 'dry_run', { annotatorId })` returns only the
 *   rows of disclosable rounds, and every row carries a numeric `round`.
 *
 * Multi-round scenario is built by flipping
 * `LabelSuiteTaskDetailData.profiles.T002.materializedRuns.dry_run.round`
 * between seeded submissions -- the same field the annotation pages already
 * read for "試標回合 R{n}" -- then setting the task-list status.
 */

const TASK_ID = 'T002'; // dry_run, multi_label; baseline status waiting_iaa_confirmation (task-list.data.js).
const MY_ANNOTATOR_ID = 'kioleemg12'; // DEFAULT_ANNOTATOR_ID.
const REVIEWER_ID = 'reviewer_wang'; // proposes the `modify`.
const ARBITER_ID = 'reviewer_chen'; // can_arbitrate: true; settles the dispute.

const R1_SAMPLE = 'emo-001';
const R2_SAMPLE = 'emo-002';
const UNTAGGED_SAMPLE = 'emo-003';
const R1_MARKER = 'ROUND1-REASON-834-a1';
const R2_MARKER = 'ROUND2-REASON-834-b2';
const UNTAGGED_MARKER = 'UNTAGGED-REASON-834-c3';

type Status = 'dry_run_in_progress' | 'waiting_iaa_confirmation' | 'official_run_in_progress' | 'completed';

function setRoundJs(round: number): string {
  return `window.LabelSuiteTaskDetailData.profiles[${JSON.stringify(TASK_ID)}].materializedRuns = { dry_run: { round: ${round}, total: 10 } };`;
}

/* submit -> reviewer `modify` -> arbiter `adopt_b`, the settled chain
 * issue-596-dry-run-feedback.spec.ts already proves yields one feedback row. */
function seedSettledJs(sampleId: string, reason: string): string {
  return `
    (function () {
      var data = window.LabelSuiteAnnotationWorkspaceData;
      var identity = { annotatorId: ${JSON.stringify(MY_ANNOTATOR_ID)}, reviewerId: ${JSON.stringify(REVIEWER_ID)} };
      data.markSampleSubmitted(${JSON.stringify(TASK_ID)}, 'annotator', 'dry_run', ${JSON.stringify(sampleId)},
        { previewState: { multi_label: { selected: ['sad', 'fear'] } } }, '', identity);
      data.markSampleSubmitted(${JSON.stringify(TASK_ID)}, 'reviewer', 'dry_run', ${JSON.stringify(sampleId)},
        {
          previewState: { multi_label: { selected: ['sad', 'angry'] } },
          decisions: { multi_label: 'modify' },
          reasons: { multi_label: 'fixture modify reason' }
        }, '', identity);
      var items = data.getDisputeItems(${JSON.stringify(TASK_ID)}, 'dry_run', ${JSON.stringify(sampleId)}, identity, ['multi_label']);
      if (!items.length) throw new Error('fixture assumption broken: no dispute items');
      data.submitArbitration(${JSON.stringify(TASK_ID)}, 'dry_run', ${JSON.stringify(sampleId)},
        { annotatorId: ${JSON.stringify(MY_ANNOTATOR_ID)}, reviewerId: ${JSON.stringify(ARBITER_ID)} },
        items.map(function (item) {
          return { itemId: item.outKey + '::' + item.key, choice: 'adopt_b',
            value: item.reviewerValues[${JSON.stringify(REVIEWER_ID)}], reason: ${JSON.stringify(reason)} };
        }));
    })();
  `;
}

/* Legacy/untagged entry: strips any round stamp from the annotator's
 * bucket entry for `sampleId`, simulating a submission written before the
 * round stamp existed (design.md D4). */
function stripRoundJs(sampleId: string): string {
  return `
    (function () {
      for (var i = 0; i < window.localStorage.length; i++) {
        var key = window.localStorage.key(i);
        if (!key || key.indexOf('labelsuite.wsSubmissions.') !== 0) continue;
        if (key.indexOf(${JSON.stringify(`${TASK_ID}::annotator::dry_run::${MY_ANNOTATOR_ID}::`)}) === -1) continue;
        var bucket = JSON.parse(window.localStorage.getItem(key) || '{}');
        if (!bucket[${JSON.stringify(sampleId)}]) continue;
        delete bucket[${JSON.stringify(sampleId)}].trialRound;
        window.localStorage.setItem(key, JSON.stringify(bucket));
      }
    })();
  `;
}

function setStatusJs(status: Status): string {
  return `window.LabelSuiteTaskListData.tasks.find(function (t) { return t.id === ${JSON.stringify(TASK_ID)}; }).status = ${JSON.stringify(status)};`;
}

async function seedTwoRounds(
  page: import('@playwright/test').Page,
  status: Status,
  opts: { untagged?: boolean } = {}
) {
  await patchDataFile(
    page,
    'annotation-workspace.data.js',
    setRoundJs(1) +
      seedSettledJs(R1_SAMPLE, R1_MARKER) +
      setRoundJs(2) +
      seedSettledJs(R2_SAMPLE, R2_MARKER) +
      (opts.untagged ? seedSettledJs(UNTAGGED_SAMPLE, UNTAGGED_MARKER) + stripRoundJs(UNTAGGED_SAMPLE) : '') +
      setStatusJs(status)
  );
}

function readFeedback(page: import('@playwright/test').Page) {
  return page.evaluate(
    ({ taskId, annotatorId }) =>
      (window as any).LabelSuiteAnnotationWorkspaceData.getDryRunFeedback(taskId, 'dry_run', { annotatorId }) as Array<{
        sampleId: string;
        round: number;
        reason: string | null;
      }>,
    { taskId: TASK_ID, annotatorId: MY_ANNOTATOR_ID }
  );
}

test.beforeEach(async ({ page }) => {
  await skipGuidelineModal(page);
});

test.describe('issue #834: FR-096 dry-run feedback gated per round (data layer)', () => {
  test('R2 in progress: ended R1 rows are returned with round 1, R2 rows are withheld', async ({ page }) => {
    await seedTwoRounds(page, 'dry_run_in_progress');
    await page.goto(buildListUrl({ task_id: TASK_ID, run_type: 'dry_run' }));

    const rows = await readFeedback(page);
    expect(rows.map((r) => r.sampleId)).toEqual([R1_SAMPLE]);
    expect(rows[0].round).toBe(1);
    expect(JSON.stringify(rows)).not.toContain(R2_MARKER);
  });

  test('R1 in progress: nothing is returned', async ({ page }) => {
    await patchDataFile(
      page,
      'annotation-workspace.data.js',
      setRoundJs(1) + seedSettledJs(R1_SAMPLE, R1_MARKER) + setStatusJs('dry_run_in_progress')
    );
    await page.goto(buildListUrl({ task_id: TASK_ID, run_type: 'dry_run' }));

    expect(await readFeedback(page)).toEqual([]);
  });

  test('waiting_iaa_confirmation after R2: both rounds returned, each row tagged with its own round', async ({ page }) => {
    await seedTwoRounds(page, 'waiting_iaa_confirmation');
    await page.goto(buildListUrl({ task_id: TASK_ID, run_type: 'dry_run' }));

    const rows = await readFeedback(page);
    const byId = Object.fromEntries(rows.map((r) => [r.sampleId, r.round]));
    expect(byId).toEqual({ [R1_SAMPLE]: 1, [R2_SAMPLE]: 2 });
  });

  for (const status of ['official_run_in_progress', 'completed'] as const) {
    test(`${status}: ended trial rounds stay disclosed`, async ({ page }) => {
      await seedTwoRounds(page, status);
      await page.goto(buildListUrl({ task_id: TASK_ID, run_type: 'dry_run' }));

      const rows = await readFeedback(page);
      const byId = Object.fromEntries(rows.map((r) => [r.sampleId, r.round]));
      expect(byId).toEqual({ [R1_SAMPLE]: 1, [R2_SAMPLE]: 2 });
    });
  }

  test('untagged submission is withheld (fail closed) while a round is in progress', async ({ page }) => {
    await seedTwoRounds(page, 'dry_run_in_progress', { untagged: true });
    await page.goto(buildListUrl({ task_id: TASK_ID, run_type: 'dry_run' }));

    const rows = await readFeedback(page);
    expect(rows.map((r) => r.sampleId)).toEqual([R1_SAMPLE]);
    expect(JSON.stringify(rows)).not.toContain(UNTAGGED_MARKER);
  });

  test('untagged submission is attributed to the current round once waiting_iaa_confirmation', async ({ page }) => {
    await seedTwoRounds(page, 'waiting_iaa_confirmation', { untagged: true });
    await page.goto(buildListUrl({ task_id: TASK_ID, run_type: 'dry_run' }));

    const rows = await readFeedback(page);
    const untagged = rows.find((r) => r.sampleId === UNTAGGED_SAMPLE);
    expect(untagged?.round).toBe(2);
  });
});
