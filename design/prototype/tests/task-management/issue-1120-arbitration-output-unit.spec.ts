/*
 * Issue #1120: FR-061 "arbitration output item" counting unit.
 *
 * Every arbitration-progress count is aggregated per FR-059 dispute item
 * (outKey x merge key), never per review unit or per output type. One
 * official_run unit whose multi_label reviewer modification yields two FR-052
 * diffs must therefore read as 2 pending arbitration items on task-detail's
 * Annotation Progress tab, and the final-exception count must follow the
 * per-item `reject` outcome.
 */
import { expect, test, type Page } from '@playwright/test';
import { patchDataFile, skipGuidelineModal } from '../annotation/_workspace-helpers';

const TASK_ID = 'T1120M';
const SAMPLE_ID = 'multi-label-dispute-unit';
const ANNOTATOR_ID = 'fixture_annotator';
const REVIEWER_ID = 'reviewer_wang';
const ARBITER_ID = 'reviewer_chen';
const PROGRESS_URL = `/pages/task-management/task-detail.html?task_id=${TASK_ID}&tab=annotation-progress&ap_stage=official`;
const PANEL_LOAD_TIMEOUT = 15_000;

type PoolItem = { outKey: string; key: string };
type WorkspaceData = {
  listReviewPoolItems: (
    taskId: string,
    runType: 'official_run',
  ) => { awaitingArbitration: PoolItem[]; pendingExceptions: PoolItem[] };
  markSampleSubmitted: (
    taskId: string,
    role: 'annotator' | 'reviewer',
    runType: 'official_run',
    sampleId: string,
    payload: Record<string, unknown>,
    summary: string,
    identity: { annotatorId: string; reviewerId?: string },
  ) => void;
  getDisputeItems: (
    taskId: string,
    runType: 'official_run',
    sampleId: string,
    identity: { annotatorId: string },
    outKeys: readonly string[],
  ) => Array<PoolItem & { annotatorValue: unknown }>;
  submitArbitration: (
    taskId: string,
    runType: 'official_run',
    sampleId: string,
    identity: { annotatorId: string; reviewerId: string },
    decisions: Array<{
      itemId: string;
      choice: 'adopt_a' | 'adopt_b' | 'reject';
      value?: unknown;
      reason: string;
    }>,
  ) => void;
};

async function installMultiLabelFixture(page: Page): Promise<string[]> {
  await patchDataFile(page, 'task-list.data.js', `
    var task = JSON.parse(JSON.stringify(
      window.LabelSuiteTaskListData.tasks.find(function (item) { return item.id === 'T016'; })
    ));
    task.id = '${TASK_ID}';
    task.nameZh = 'Arbitration output unit fixture';
    task.nameEn = 'Arbitration output unit fixture';
    task.sourceFile = 'arbitration-output-unit.json';
    task.outputTypes = ['multi_label'];
    task.runType = 'official_run';
    window.LabelSuiteTaskListData.tasks.push(task);
  `);
  await patchDataFile(page, 'task-detail.data.js', `
    var profiles = window.LabelSuiteTaskDetailData.profiles;
    var profile = JSON.parse(JSON.stringify(profiles.T016));
    profile.outputs = [JSON.parse(JSON.stringify(profiles.T002.outputs[0]))];
    profile.fieldRoleMap = { text: 'input' };
    profile.datasetFileName = 'arbitration-output-unit.json';
    profile.datasetRecords = [{ id: '${SAMPLE_ID}', text: 'One disputed unit with a set-type output.' }];
    profile.reviewerIds = ['${REVIEWER_ID}', '${ARBITER_ID}'];
    profile.arbiterIds = ['${ARBITER_ID}'];
    profile.materializedRuns = { official_run: { total: 1 } };
    profiles.${TASK_ID} = profile;
  `);

  await page.goto(`/pages/task-management/task-detail.html?task_id=${TASK_ID}`);
  await page.locator('#workLogPanel').waitFor({ state: 'attached', timeout: PANEL_LOAD_TIMEOUT });
  return page.evaluate(
    ({ taskId, sampleId, annotatorId, reviewerId }) => {
      const data = (window as unknown as {
        LabelSuiteAnnotationWorkspaceData: WorkspaceData;
      }).LabelSuiteAnnotationWorkspaceData;
      data.markSampleSubmitted(
        taskId, 'annotator', 'official_run', sampleId,
        { previewState: { multi_label: { selected: ['sad'] } } }, '',
        { annotatorId },
      );
      data.markSampleSubmitted(
        taskId, 'reviewer', 'official_run', sampleId,
        {
          previewState: { multi_label: { selected: ['fear'] } },
          decisions: { multi_label: 'modify' },
          reasons: { multi_label: 'Fixture swaps the label set' },
        },
        '',
        { annotatorId, reviewerId },
      );
      return data
        .getDisputeItems(taskId, 'official_run', sampleId, { annotatorId }, ['multi_label'])
        .map((item) => `${item.outKey}::${item.key}`)
        .sort();
    },
    { taskId: TASK_ID, sampleId: SAMPLE_ID, annotatorId: ANNOTATOR_ID, reviewerId: REVIEWER_ID },
  );
}

async function poolCounts(page: Page) {
  return page.evaluate((taskId) => {
    const data = (window as unknown as {
      LabelSuiteAnnotationWorkspaceData: WorkspaceData;
    }).LabelSuiteAnnotationWorkspaceData;
    const pools = data.listReviewPoolItems(taskId, 'official_run');
    return {
      awaiting: pools.awaitingArbitration.map((i) => `${i.outKey}::${i.key}`).sort(),
      exceptions: pools.pendingExceptions.map((i) => `${i.outKey}::${i.key}`).sort(),
    };
  }, TASK_ID);
}

async function openProgress(page: Page): Promise<void> {
  await page.goto(PROGRESS_URL);
  await page.locator('#workLogPanel').waitFor({ state: 'attached', timeout: PANEL_LOAD_TIMEOUT });
  await expect(page.locator('#annotationProgressPanel')).not.toHaveClass(/hidden/);
}

test.beforeEach(async ({ page }) => {
  await skipGuidelineModal(page);
});

test.describe('Issue #1120 - arbitration output item counting unit (FR-061)', () => {
  test('two merge keys in one multi_label outKey count as 2 pending arbitration items', async ({
    page,
  }) => {
    const disputeIds = await installMultiLabelFixture(page);
    expect(disputeIds, 'fixture must yield two dispute items in the same outKey').toEqual([
      'multi_label::fear',
      'multi_label::sad',
    ]);

    expect((await poolCounts(page)).awaiting).toEqual(['multi_label::fear', 'multi_label::sad']);

    await openProgress(page);
    const review = page.getByTestId('review-progress-breakdown');
    await expect(review.getByTestId('review-pending-arbitration-count')).toHaveText('待仲裁 2');
    await expect(review.getByTestId('review-exception-count')).toHaveText('最終例外待處置 0');
  });

  test('adopt_a plus reject leaves 0 pending arbitration and 1 final exception after reload', async ({
    page,
  }) => {
    await installMultiLabelFixture(page);

    await page.evaluate(
      ({ taskId, sampleId, annotatorId, arbiterId }) => {
        const data = (window as unknown as {
          LabelSuiteAnnotationWorkspaceData: WorkspaceData;
        }).LabelSuiteAnnotationWorkspaceData;
        const sad = data
          .getDisputeItems(taskId, 'official_run', sampleId, { annotatorId }, ['multi_label'])
          .find((item) => item.key === 'sad');
        data.submitArbitration(
          taskId, 'official_run', sampleId,
          { annotatorId, reviewerId: arbiterId },
          [
            {
              itemId: 'multi_label::sad',
              choice: 'adopt_a',
              value: sad?.annotatorValue,
              reason: 'Keep the annotator label',
            },
            { itemId: 'multi_label::fear', choice: 'reject', reason: 'Neither side is acceptable' },
          ],
        );
      },
      { taskId: TASK_ID, sampleId: SAMPLE_ID, annotatorId: ANNOTATOR_ID, arbiterId: ARBITER_ID },
    );

    await openProgress(page);
    expect(await poolCounts(page)).toEqual({
      awaiting: [],
      exceptions: ['multi_label::fear'],
    });
    const review = page.getByTestId('review-progress-breakdown');
    await expect(review.getByTestId('review-pending-arbitration-count')).toHaveText('待仲裁 0');
    await expect(review.getByTestId('review-exception-count')).toHaveText('最終例外待處置 1');
  });
});
