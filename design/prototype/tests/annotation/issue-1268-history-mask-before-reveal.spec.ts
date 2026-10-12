import { test, expect } from '../fixtures';
import type { Page } from '@playwright/test';
import { buildListUrl, buildWorkspaceUrl, patchDataFile, skipGuidelineModal } from './_workspace-helpers';

/* issue #1268 -- FR-090 x FR-096: before a trial round is revealed, the
 * annotator's history must hold ONLY the annotator's own events.
 *
 * Sources (change `annotation-history-mask-before-reveal`):
 *   spec 015 FR-090 layered masking (data supply layer, not CSS)
 *   spec 015 FR-096 per-round reveal gate (issue #834): the in-progress round
 *     is never disclosed; an entry with no `trialRound` stamp while the task
 *     is `dry_run_in_progress` counts as unrevealed (fail closed).
 *
 * The leak this pins: getSampleHistory() only masks PEER ANNOTATORS, so the
 * reviewer's modify, the arbiter's adjudication (with reason / result_snapshot)
 * and the project leader's exception_resolved all reach the annotator while the
 * round is still running -- even though getDryRunFeedback() withholds the very
 * same data. Every assertion on masking reads the data-layer output (or the
 * DOM that is fed by it), never a CSS-hidden node.
 *
 * Fixture: T002 (dry_run, multi_label). Per sample the seed writes
 *   annotator submit -> reviewer `modify` -> arbiter `adopt_b` (adjudicated)
 *   -> project-leader exception pool resolve (exception_resolved),
 * i.e. all three non-annotator origins in one trail. exception_resolved has a
 * realistic dry_run path: resolveExceptionPoolItem() is runType-agnostic and
 * the dry-run completion gate specs already drive it for dry_run.
 */

const TASK_ID = 'T002';
const ME = 'kioleemg12';
const REVIEWER_ID = 'reviewer_wang';
const ARBITER_ID = 'reviewer_chen';
const R1_SAMPLE = 'emo-001';
const R2_SAMPLE = 'emo-002';

const ARB_MARKER = 'ARB-REASON-1268-a1';
const EXC_MARKER = 'EXC-REASON-1268-b2';
const R2_ARB_MARKER = 'ARB-REASON-1268-r2';

type Status = 'dry_run_in_progress' | 'waiting_iaa_confirmation';

type HistoryEvent = {
  action: string;
  role: string;
  actorId: string | null;
  result_snapshot?: unknown;
  reason?: string | null;
};
type Viewer = { role: 'annotator' | 'reviewer'; actorId: string };

function setRoundJs(round: number): string {
  return `window.LabelSuiteTaskDetailData.profiles[${JSON.stringify(TASK_ID)}].materializedRuns = { dry_run: { round: ${round}, total: 10 } };`;
}

function setStatusJs(status: Status): string {
  return `window.LabelSuiteTaskListData.tasks.find(function (t) { return t.id === ${JSON.stringify(TASK_ID)}; }).status = ${JSON.stringify(status)};`;
}

/* One trail with every non-annotator origin. Guarded by a localStorage flag so
 * re-running the patch on a later navigation of the same test does not
 * duplicate events. */
function seedTrailJs(sampleId: string, arbMarker: string, excMarker: string): string {
  const flag = `seed1268::${sampleId}`;
  return `
    (function () {
      if (window.localStorage.getItem(${JSON.stringify(flag)})) return;
      window.localStorage.setItem(${JSON.stringify(flag)}, '1');
      var data = window.LabelSuiteAnnotationWorkspaceData;
      var task = ${JSON.stringify(TASK_ID)};
      var sample = ${JSON.stringify(sampleId)};
      var identity = { annotatorId: ${JSON.stringify(ME)}, reviewerId: ${JSON.stringify(REVIEWER_ID)} };
      data.markSampleSubmitted(task, 'annotator', 'dry_run', sample,
        { previewState: { multi_label: { selected: ['sad', 'fear'] } } }, '', identity);
      data.markSampleSubmitted(task, 'reviewer', 'dry_run', sample,
        {
          previewState: { multi_label: { selected: ['sad', 'angry'] } },
          decisions: { multi_label: 'modify' },
          reasons: { multi_label: 'REVIEWER-REASON-1268' }
        }, '', identity);
      var items = data.getDisputeItems(task, 'dry_run', sample, identity, ['multi_label']);
      if (!items.length) throw new Error('fixture assumption broken: no dispute items');
      data.submitArbitration(task, 'dry_run', sample,
        { annotatorId: ${JSON.stringify(ME)}, reviewerId: ${JSON.stringify(ARBITER_ID)} },
        items.map(function (item) {
          return { itemId: item.outKey + '::' + item.key, choice: 'adopt_b',
            value: item.reviewerValues[${JSON.stringify(REVIEWER_ID)}], reason: ${JSON.stringify(arbMarker)} };
        }));
      data.resolveExceptionPoolItem(task, 'dry_run', sample, { annotatorId: ${JSON.stringify(ME)} },
        'multi_label', 'custom_answer', ['sad'], ${JSON.stringify(excMarker)});
    })();
  `;
}

function stripRoundJs(sampleId: string): string {
  return `
    (function () {
      for (var i = 0; i < window.localStorage.length; i++) {
        var key = window.localStorage.key(i);
        if (!key || key.indexOf('labelsuite.wsSubmissions.') !== 0) continue;
        if (key.indexOf(${JSON.stringify(`${TASK_ID}::annotator::dry_run::${ME}::`)}) === -1) continue;
        var bucket = JSON.parse(window.localStorage.getItem(key) || '{}');
        if (!bucket[${JSON.stringify(sampleId)}]) continue;
        delete bucket[${JSON.stringify(sampleId)}].trialRound;
        window.localStorage.setItem(key, JSON.stringify(bucket));
      }
    })();
  `;
}

function readHistory(page: Page, sampleId: string, viewer?: Viewer): Promise<HistoryEvent[]> {
  return page.evaluate(
    ({ taskId, sampleId, me, viewer }) =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).LabelSuiteAnnotationWorkspaceData.getSampleHistory(
        taskId, 'dry_run', sampleId, { annotatorId: me }, viewer
      ) as HistoryEvent[],
    { taskId: TASK_ID, sampleId, me: ME, viewer }
  );
}

const asAnnotator: Viewer = { role: 'annotator', actorId: ME };
const asReviewer: Viewer = { role: 'reviewer', actorId: REVIEWER_ID };
const foreign = (e: HistoryEvent) => e.role !== 'annotator' || e.actorId !== ME;

/* The seed really carries every non-annotator origin; without this the
 * masking assertions could pass on an empty fixture. */
async function expectFixtureHasForeignOrigins(page: Page, sampleId: string, arbMarker: string) {
  const unmasked = await readHistory(page, sampleId);
  const actions = unmasked.filter(foreign).map((e) => e.action);
  expect(actions).toContain('adjudicated');
  expect(actions).toContain('exception_resolved');
  expect(unmasked.filter((e) => e.role === 'reviewer' && e.actorId === REVIEWER_ID).length).toBeGreaterThan(0);
  expect(JSON.stringify(unmasked)).toContain(arbMarker);
}

test.beforeEach(async ({ page }) => {
  await skipGuidelineModal(page);
});

test.describe('issue #1268: pre-reveal annotator history holds only own events', () => {
  test('data layer: R1 in progress -> annotator viewer gets no reviewer / adjudicated / exception_resolved event', async ({ page }) => {
    await patchDataFile(
      page,
      'annotation-workspace.data.js',
      setRoundJs(1) + seedTrailJs(R1_SAMPLE, ARB_MARKER, EXC_MARKER) + setStatusJs('dry_run_in_progress')
    );
    await page.goto(buildListUrl({ task_id: TASK_ID, run_type: 'dry_run' }));

    await expectFixtureHasForeignOrigins(page, R1_SAMPLE, ARB_MARKER);

    const events = await readHistory(page, R1_SAMPLE, asAnnotator);
    expect(events.filter(foreign).map((e) => `${e.role}:${e.action}`)).toEqual([]);
    const serialized = JSON.stringify(events);
    expect(serialized).not.toContain(ARB_MARKER);
    expect(serialized).not.toContain(EXC_MARKER);
    expect(serialized).not.toContain('REVIEWER-REASON-1268');
  });

  test('data layer: the annotator\'s own events survive the mask (guard)', async ({ page }) => {
    await patchDataFile(
      page,
      'annotation-workspace.data.js',
      setRoundJs(1) + seedTrailJs(R1_SAMPLE, ARB_MARKER, EXC_MARKER) + setStatusJs('dry_run_in_progress')
    );
    await page.goto(buildListUrl({ task_id: TASK_ID, run_type: 'dry_run' }));

    const events = await readHistory(page, R1_SAMPLE, asAnnotator);
    expect(events.some((e) => e.role === 'annotator' && e.actorId === ME && e.action === 'submitted')).toBe(true);
  });

  test('data layer: a reviewer viewer is unaffected pre-reveal (guard)', async ({ page }) => {
    await patchDataFile(
      page,
      'annotation-workspace.data.js',
      setRoundJs(1) + seedTrailJs(R1_SAMPLE, ARB_MARKER, EXC_MARKER) + setStatusJs('dry_run_in_progress')
    );
    await page.goto(buildListUrl({ task_id: TASK_ID, run_type: 'dry_run' }));

    const events = await readHistory(page, R1_SAMPLE, asReviewer);
    const actions = events.map((e) => e.action);
    expect(actions).toContain('adjudicated');
    expect(events.some((e) => e.role === 'reviewer' && e.actorId === REVIEWER_ID)).toBe(true);
  });

  test('DOM: the workspace 歷程 tab renders only the annotator\'s own cards', async ({ page }) => {
    await patchDataFile(
      page,
      'annotation-workspace.data.js',
      setRoundJs(1) + seedTrailJs(R1_SAMPLE, ARB_MARKER, EXC_MARKER) + setStatusJs('dry_run_in_progress')
    );
    await page.goto(buildWorkspaceUrl({ task_id: TASK_ID, sample_id: R1_SAMPLE, run_type: 'dry_run' }));
    await page.getByTestId('ws-guideline-tab-history').click();

    const cards = page.locator('.history-item');
    await expect(cards.filter({ has: page.locator('.history-action-badge[data-action="submitted"]') })).not.toHaveCount(0);
    for (const action of ['adjudicated', 'exception_resolved', 'modified', 'accepted']) {
      await expect(page.locator(`.history-action-badge[data-action="${action}"]`)).toHaveCount(0);
    }
    await expect(page.locator('#wsHistoryContainer')).not.toContainText(ARB_MARKER);
    await expect(page.locator('#wsHistoryContainer')).not.toContainText(EXC_MARKER);
  });

  test('list summary: the annotator\'s last action is their own submit, not a reviewer decision', async ({ page }) => {
    await patchDataFile(
      page,
      'annotation-workspace.data.js',
      setRoundJs(1) + seedTrailJs(R1_SAMPLE, ARB_MARKER, EXC_MARKER) + setStatusJs('dry_run_in_progress')
    );
    await page.goto(buildListUrl({ task_id: TASK_ID, run_type: 'dry_run' }));

    const row = page.getByTestId('ws-sample-item').filter({ hasText: R1_SAMPLE }).first();
    await expect(row.getByTestId('list-summary-last-action')).toHaveAttribute('data-action', 'submitted');
  });

  test('untagged entry while a round is in progress is unrevealed (fail closed)', async ({ page }) => {
    await patchDataFile(
      page,
      'annotation-workspace.data.js',
      setRoundJs(1) + seedTrailJs(R1_SAMPLE, ARB_MARKER, EXC_MARKER) + stripRoundJs(R1_SAMPLE) +
        setStatusJs('dry_run_in_progress')
    );
    await page.goto(buildListUrl({ task_id: TASK_ID, run_type: 'dry_run' }));

    await expectFixtureHasForeignOrigins(page, R1_SAMPLE, ARB_MARKER);
    const events = await readHistory(page, R1_SAMPLE, asAnnotator);
    expect(events.filter(foreign).map((e) => `${e.role}:${e.action}`)).toEqual([]);
  });
});

test.describe('issue #1268: after the round is revealed FR-090 behaves as before', () => {
  test('waiting_iaa_confirmation: the annotator sees the reviewer / adjudicated / exception events (guard)', async ({ page }) => {
    await patchDataFile(
      page,
      'annotation-workspace.data.js',
      setRoundJs(1) + seedTrailJs(R1_SAMPLE, ARB_MARKER, EXC_MARKER) + setStatusJs('waiting_iaa_confirmation')
    );
    await page.goto(buildListUrl({ task_id: TASK_ID, run_type: 'dry_run' }));

    const events = await readHistory(page, R1_SAMPLE, asAnnotator);
    const actions = events.filter(foreign).map((e) => e.action);
    expect(actions).toContain('adjudicated');
    expect(actions).toContain('exception_resolved');
  });

  test('untagged entry at waiting_iaa_confirmation is attributed to the current round and visible (guard)', async ({ page }) => {
    await patchDataFile(
      page,
      'annotation-workspace.data.js',
      setRoundJs(1) + seedTrailJs(R1_SAMPLE, ARB_MARKER, EXC_MARKER) + stripRoundJs(R1_SAMPLE) +
        setStatusJs('waiting_iaa_confirmation')
    );
    await page.goto(buildListUrl({ task_id: TASK_ID, run_type: 'dry_run' }));

    const events = await readHistory(page, R1_SAMPLE, asAnnotator);
    expect(events.filter(foreign).map((e) => e.action)).toContain('adjudicated');
  });

  test('R2 in progress: ended R1 sample stays visible (guard), the R2 sample stays masked', async ({ page }) => {
    await patchDataFile(
      page,
      'annotation-workspace.data.js',
      setRoundJs(1) + seedTrailJs(R1_SAMPLE, ARB_MARKER, EXC_MARKER) +
        setRoundJs(2) + seedTrailJs(R2_SAMPLE, R2_ARB_MARKER, EXC_MARKER + '-r2') +
        setStatusJs('dry_run_in_progress')
    );
    await page.goto(buildListUrl({ task_id: TASK_ID, run_type: 'dry_run' }));

    await expectFixtureHasForeignOrigins(page, R2_SAMPLE, R2_ARB_MARKER);

    const r1 = await readHistory(page, R1_SAMPLE, asAnnotator);
    expect(r1.filter(foreign).map((e) => e.action)).toContain('adjudicated');

    const r2 = await readHistory(page, R2_SAMPLE, asAnnotator);
    expect(r2.filter(foreign).map((e) => `${e.role}:${e.action}`)).toEqual([]);
    expect(JSON.stringify(r2)).not.toContain(R2_ARB_MARKER);
  });
});
