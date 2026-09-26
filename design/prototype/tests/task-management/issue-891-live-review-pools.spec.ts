/*
 * Issue #891: review-pool counts are item-level live state.
 *
 * `disputed` remains a review-unit status used by Dashboard. Member
 * Management's awaiting-arbitration and pending-exception figures instead
 * count unresolved dispute items. They share one public data query with the
 * Annotation Progress exception table so arbitration and disposition writes
 * cannot leave any surface behind on a hand-authored number.
 */
import { expect, test, type Page } from '@playwright/test';
import {
  buildWorkspaceUrl,
  fillArbitrationReasons,
  patchDataFile,
  skipGuidelineModal,
  type RunType,
} from '../annotation/_workspace-helpers';

const TASK_DETAIL_URL = '/pages/task-management/task-detail.html';
const DASHBOARD_URL = '/pages/dashboard/dashboard.html?scenario=reviewer';
const PANEL_LOAD_TIMEOUT = 15_000;
const T016_ANNOTATOR = 'kioleemg12';
const T016_ARBITER = 'reviewer_chen';
const MULTI_OUTPUT_TASK = 'T891M';
const MULTI_OUTPUT_SAMPLE = 'multi-output-review-unit';
const MULTI_OUTPUT_ANNOTATOR = 'fixture_annotator';
const MULTI_OUTPUT_REVIEWER = 'reviewer_wang';
const MULTI_OUTPUT_ARBITER = 'reviewer_chen';
const MULTI_OUTPUT_KEYS = ['single_label', 'free_text', 'single_dim'] as const;

type ReviewPoolItem = {
  taskId: string;
  runType: RunType;
  sampleId: string;
  annotatorId: string;
  outKey: string;
  key: string;
  outputType?: string;
  reviewerIds?: string[];
  arbiterId?: string;
  reason?: string;
  fellAt?: string;
};

type ReviewPoolItems = {
  awaitingArbitration: ReviewPoolItem[];
  pendingExceptions: ReviewPoolItem[];
};

type WorkspaceData = {
  listReviewPoolItems?: (taskId: string, runType: RunType) => ReviewPoolItems;
  listReviewUnits: (
    taskId: string,
    runType: RunType,
  ) => Array<{ sampleId: string; annotatorId: string; status: string }>;
  markSampleSubmitted: (
    taskId: string,
    role: 'annotator' | 'reviewer',
    runType: RunType,
    sampleId: string,
    payload: Record<string, unknown>,
    summary: string,
    identity: { annotatorId: string; reviewerId?: string },
  ) => void;
  getDisputeItems: (
    taskId: string,
    runType: RunType,
    sampleId: string,
    identity: { annotatorId: string },
    outKeys: readonly string[],
  ) => Array<{
    outKey: string;
    key: string;
    annotatorValue: unknown;
    reviewerValues: Record<string, unknown>;
  }>;
  submitArbitration: (
    taskId: string,
    runType: RunType,
    sampleId: string,
    identity: { annotatorId: string; reviewerId: string },
    decisions: Array<{
      itemId: string;
      choice: 'adopt_a' | 'adopt_b' | 'reject';
      value?: unknown;
      reason: string;
    }>,
  ) => void;
  getArbitrationState: (
    taskId: string,
    runType: RunType,
    sampleId: string,
    identity: { annotatorId: string },
  ) => Record<string, { finalized_by?: string }>;
  resolveExceptionPoolItem: (
    taskId: string,
    runType: RunType,
    sampleId: string,
    identity: { annotatorId: string },
    outKey: string,
    action: 'adopt_annotator',
    value: unknown,
    reason: string,
  ) => void;
  getExceptionPool: (
    taskId: string,
    runType: RunType,
    sampleId: string,
    identity: { annotatorId: string },
  ) => Record<string, { action?: string }>;
};

const SEED_MATRIX = [
  {
    taskId: 'T014',
    runType: 'dry_run',
    awaiting: 3,
    exceptions: 0,
  },
  {
    taskId: 'T015',
    runType: 'official_run',
    awaiting: 1,
    exceptions: 0,
  },
  {
    taskId: 'T016',
    runType: 'official_run',
    awaiting: 2,
    exceptions: 1,
  },
] as const satisfies ReadonlyArray<{
  taskId: string;
  runType: RunType;
  awaiting: number;
  exceptions: number;
}>;

const MEMBER_MATRIX = [
  { taskId: 'T001', awaiting: 0, exceptions: 0 },
  ...SEED_MATRIX.map(({ taskId, awaiting, exceptions }) => ({
    taskId,
    awaiting,
    exceptions,
  })),
] as const;

function readReviewPoolItems(
  page: Page,
  taskId: string,
  runType: RunType,
): Promise<ReviewPoolItems> {
  return page.evaluate(
    ({ id, run }) => {
      const data = (window as unknown as {
        LabelSuiteAnnotationWorkspaceData: WorkspaceData;
      }).LabelSuiteAnnotationWorkspaceData;
      if (!data.listReviewPoolItems) {
        throw new Error('listReviewPoolItems is not exported');
      }
      return data.listReviewPoolItems(id, run);
    },
    { id: taskId, run: runType },
  );
}

function poolItemIdentity(item: ReviewPoolItem): string {
  return [
    item.taskId,
    item.runType,
    item.sampleId,
    item.annotatorId,
    item.outKey,
    item.key,
  ].join('::');
}

async function openMemberManagement(
  page: Page,
  taskId: string,
  progressStage?: 'official',
): Promise<void> {
  const stageQuery = progressStage ? `&ap_stage=${progressStage}` : '';
  await page.goto(`${TASK_DETAIL_URL}?task_id=${taskId}${stageQuery}`);
  await page
    .locator('#workLogPanel')
    .waitFor({ state: 'attached', timeout: PANEL_LOAD_TIMEOUT });
  await page.locator('#tabMemberManagement').click();
  await expect(page.locator('#memberManagementPanel')).not.toHaveClass(/hidden/);
}

async function expectMemberPools(
  page: Page,
  taskId: string,
  awaiting: number,
  exceptions: number,
  progressStage?: 'official',
): Promise<void> {
  await openMemberManagement(page, taskId, progressStage);
  await expect.soft(
    page.locator('#disputePoolText'),
    `${taskId} awaiting-arbitration items`,
  ).toHaveText(`爭議池 ${awaiting} 項待仲裁`, { timeout: 2_000 });
  await expect.soft(
    page.locator('#exceptionPoolText'),
    `${taskId} pending-exception items`,
  ).toHaveText(`例外池 ${exceptions} 項待處置`, { timeout: 2_000 });
}

async function openAnnotationProgress(
  page: Page,
  taskId: string,
  progressStage: string,
): Promise<void> {
  await page.goto(
    `${TASK_DETAIL_URL}?task_id=${taskId}&tab=annotation-progress&ap_stage=${progressStage}`,
  );
  await page
    .locator('#workLogPanel')
    .waitFor({ state: 'attached', timeout: PANEL_LOAD_TIMEOUT });
  await expect(page.locator('#annotationProgressPanel')).not.toHaveClass(/hidden/);
}

async function expectProgressExceptions(
  page: Page,
  taskId: string,
  progressStage: string,
  sampleIds: readonly string[],
): Promise<void> {
  await openAnnotationProgress(page, taskId, progressStage);
  await expect(page.locator('#finalExceptionPoolTitle')).toHaveText(
    `最終例外池 · ${sampleIds.length} 項待處置`,
  );
  const rows = page.getByTestId('final-exception-pool-row');
  await expect(rows).toHaveCount(sampleIds.length);
  expect(
    (await rows.getByTestId('fep-sample-id').allTextContents()).sort(),
  ).toEqual([...sampleIds].sort());
}

async function expectDashboardDisputed(page: Page, count: number): Promise<void> {
  await page.goto(DASHBOARD_URL);
  const detail = page.locator(
    '#reviewerTaskList [data-example-task-id="T016"] .list-item-detail',
  );
  await expect(detail).toBeVisible();
  await expect(detail).toContainText(`爭議中 ${count} 個`);
}

async function openT016Arbitration(page: Page, sampleId: string): Promise<void> {
  await page.goto(
    buildWorkspaceUrl({
      task_id: 'T016',
      sample_id: sampleId,
      role: 'reviewer',
      run_type: 'official_run',
      annotator_id: T016_ANNOTATOR,
      reviewer_id: T016_ARBITER,
    }),
  );
  await expect(page.getByTestId('ws-arbitration-card')).toBeVisible();
}

function projectLeaderExceptionUrl(sampleId: string): string {
  return '/pages/annotation/annotation-workspace.html'
    + `?task_id=T016&sample_id=${sampleId}&role=project_leader`
    + `&run_type=official_run&annotator_id=${T016_ANNOTATOR}`;
}

type ReviewPoolIdentity = Pick<
  ReviewPoolItem,
  'taskId' | 'runType' | 'sampleId' | 'annotatorId' | 'outKey' | 'key'
>;
type DisputeIdentity = readonly [outKey: string, key: string];
type ArbitrationDecision = {
  itemId: string;
  choice: 'adopt_a' | 'adopt_b' | 'reject';
  value?: unknown;
  reason: string;
};

function reviewPoolIdentities(items: ReviewPoolItem[]): ReviewPoolIdentity[] {
  return items
    .map(({ taskId, runType, sampleId, annotatorId, outKey, key }) => ({
      taskId,
      runType,
      sampleId,
      annotatorId,
      outKey,
      key,
    }))
    .sort((left, right) => poolItemIdentity(left).localeCompare(poolItemIdentity(right)));
}

function expectedMultiOutputIdentities(
  identities: readonly DisputeIdentity[],
): ReviewPoolIdentity[] {
  return identities
    .map(([outKey, key]) => ({
      taskId: 'T891M',
      runType: 'official_run' as const,
      sampleId: 'multi-output-review-unit',
      annotatorId: 'fixture_annotator',
      outKey,
      key,
    }))
    .sort((left, right) => poolItemIdentity(left).localeCompare(poolItemIdentity(right)));
}

async function installMultiOutputFixture(page: Page): Promise<void> {
  await patchDataFile(page, 'task-list.data.js', `
    var task = JSON.parse(JSON.stringify(
      window.LabelSuiteTaskListData.tasks.find(function (item) { return item.id === 'T016'; })
    ));
    task.id = '${MULTI_OUTPUT_TASK}';
    task.nameZh = 'Live pool multi-output fixture';
    task.nameEn = 'Live pool multi-output fixture';
    task.sourceFile = 'live-pool-multi-output.json';
    task.outputTypes = ['single_label', 'free_text', 'single_dim'];
    task.runType = 'official_run';
    window.LabelSuiteTaskListData.tasks.push(task);
  `);
  await patchDataFile(page, 'task-detail.data.js', `
    var profiles = window.LabelSuiteTaskDetailData.profiles;
    var profile = JSON.parse(JSON.stringify(profiles.T016));
    profile.outputs = [
      JSON.parse(JSON.stringify(profiles.T016.outputs[0])),
      JSON.parse(JSON.stringify(profiles.T009.outputs[0])),
      JSON.parse(JSON.stringify(profiles.T004.outputs[0]))
    ];
    profile.fieldRoleMap = { text: 'input' };
    profile.datasetFileName = 'live-pool-multi-output.json';
    profile.datasetRecords = [{
      id: '${MULTI_OUTPUT_SAMPLE}',
      text: 'One disputed unit with three configured output items.'
    }];
    profile.reviewerIds = ['${MULTI_OUTPUT_REVIEWER}', '${MULTI_OUTPUT_ARBITER}'];
    profile.arbiterIds = ['${MULTI_OUTPUT_ARBITER}'];
    profile.materializedRuns = { official_run: { total: 1 } };
    profiles.${MULTI_OUTPUT_TASK} = profile;
  `);

  await page.goto(`${TASK_DETAIL_URL}?task_id=${MULTI_OUTPUT_TASK}`);
  await page
    .locator('#workLogPanel')
    .waitFor({ state: 'attached', timeout: PANEL_LOAD_TIMEOUT });
  const disputeIds = await page.evaluate(
    ({ taskId, sampleId, annotatorId, reviewerId, outKeys }) => {
      const data = (window as unknown as {
        LabelSuiteAnnotationWorkspaceData: WorkspaceData;
      }).LabelSuiteAnnotationWorkspaceData;
      data.markSampleSubmitted(
        taskId,
        'annotator',
        'official_run',
        sampleId,
        {
          previewState: {
            single_label: { selected: 'positive' },
            free_text: { text: 'Annotator explanation' },
            single_dim: { value: 1 },
          },
        },
        '',
        { annotatorId },
      );
      data.markSampleSubmitted(
        taskId,
        'reviewer',
        'official_run',
        sampleId,
        {
          previewState: {
            single_label: { selected: 'negative' },
            free_text: { text: 'Reviewer explanation' },
            single_dim: { value: 5 },
          },
          decisions: {
            single_label: 'modify',
            free_text: 'modify',
            single_dim: 'modify',
          },
          reasons: {
            single_label: 'Fixture changes label',
            free_text: 'Fixture changes text',
            single_dim: 'Fixture changes score',
          },
        },
        '',
        { annotatorId, reviewerId },
      );
      return data
        .getDisputeItems(taskId, 'official_run', sampleId, { annotatorId }, outKeys)
        .map((item) => `${item.outKey}::${item.key}`)
        .sort();
    },
    {
      taskId: MULTI_OUTPUT_TASK,
      sampleId: MULTI_OUTPUT_SAMPLE,
      annotatorId: MULTI_OUTPUT_ANNOTATOR,
      reviewerId: MULTI_OUTPUT_REVIEWER,
      outKeys: MULTI_OUTPUT_KEYS,
    },
  );
  expect(disputeIds, 'fixture must create one dispute item per configured output').toEqual([
    'free_text::free_text',
    'single_dim::single_dim',
    'single_label::single_label',
  ]);
}

async function expectMultiOutputPoolsAfterReload(
  page: Page,
  expected: {
    awaitingArbitration: readonly DisputeIdentity[];
    pendingExceptions: readonly DisputeIdentity[];
  },
): Promise<void> {
  await page.reload();
  await page
    .locator('#workLogPanel')
    .waitFor({ state: 'attached', timeout: PANEL_LOAD_TIMEOUT });

  const pools = await readReviewPoolItems(
    page,
    MULTI_OUTPUT_TASK,
    'official_run',
  );
  expect(reviewPoolIdentities(pools.awaitingArbitration)).toEqual(
    expectedMultiOutputIdentities(expected.awaitingArbitration),
  );
  expect(reviewPoolIdentities(pools.pendingExceptions)).toEqual(
    expectedMultiOutputIdentities(expected.pendingExceptions),
  );

  const units = await page.evaluate(
    ({ taskId }) => {
      const data = (window as unknown as {
        LabelSuiteAnnotationWorkspaceData: WorkspaceData;
      }).LabelSuiteAnnotationWorkspaceData;
      return data.listReviewUnits(taskId, 'official_run');
    },
    { taskId: MULTI_OUTPUT_TASK },
  );
  expect(units).toEqual([
    {
      sampleId: MULTI_OUTPUT_SAMPLE,
      annotatorId: MULTI_OUTPUT_ANNOTATOR,
      status: 'disputed',
    },
  ]);
  const pendingOutKeys = expected.pendingExceptions.map(([outKey]) => outKey);
  await expectMemberPools(
    page,
    MULTI_OUTPUT_TASK,
    expected.awaitingArbitration.length,
    pendingOutKeys.length,
    'official',
  );
  await expectProgressExceptions(
    page,
    MULTI_OUTPUT_TASK,
    'official',
    pendingOutKeys.map(() => MULTI_OUTPUT_SAMPLE),
  );
  const rows = page.getByTestId('final-exception-pool-row');
  await expect(rows.getByTestId('fep-annotator')).toHaveText(
    pendingOutKeys.map(() => MULTI_OUTPUT_ANNOTATOR),
  );
  await expect(rows.getByTestId('fep-output-type')).toHaveText(pendingOutKeys);
}

async function submitMultiOutputArbitration(
  page: Page,
  decision: ArbitrationDecision,
): Promise<void> {
  await page.evaluate(
    ({ taskId, sampleId, annotatorId, arbiterId, submittedDecision }) => {
      const data = (window as unknown as {
        LabelSuiteAnnotationWorkspaceData: WorkspaceData;
      }).LabelSuiteAnnotationWorkspaceData;
      data.submitArbitration(
        taskId,
        'official_run',
        sampleId,
        { annotatorId, reviewerId: arbiterId },
        [submittedDecision],
      );
    },
    {
      taskId: MULTI_OUTPUT_TASK,
      sampleId: MULTI_OUTPUT_SAMPLE,
      annotatorId: MULTI_OUTPUT_ANNOTATOR,
      arbiterId: MULTI_OUTPUT_ARBITER,
      submittedDecision: decision,
    },
  );
}

async function resolveMultiOutputException(page: Page): Promise<void> {
  await page.evaluate(
    ({ taskId, sampleId, annotatorId }) => {
      const data = (window as unknown as {
        LabelSuiteAnnotationWorkspaceData: WorkspaceData;
      }).LabelSuiteAnnotationWorkspaceData;
      data.resolveExceptionPoolItem(
        taskId,
        'official_run',
        sampleId,
        { annotatorId },
        'free_text',
        'adopt_annotator',
        'Annotator explanation',
        'Project leader accepts the annotator text',
      );
    },
    {
      taskId: MULTI_OUTPUT_TASK,
      sampleId: MULTI_OUTPUT_SAMPLE,
      annotatorId: MULTI_OUTPUT_ANNOTATOR,
    },
  );
}

test.beforeEach(async ({ page }) => {
  await skipGuidelineModal(page);
});

test.describe('Issue #891 — live review pools', () => {
  test('public item query classifies the seeded matrix and preserves T016 identities', async ({
    page,
  }) => {
    await page.goto(
      buildWorkspaceUrl({
        task_id: 'T016',
        sample_id: 'ofm-03-awaiting-arbitration',
        role: 'reviewer',
        run_type: 'official_run',
        annotator_id: T016_ANNOTATOR,
        reviewer_id: T016_ARBITER,
      }),
    );

    const hasPublicQuery = await page.evaluate(() => {
      const data = (window as unknown as {
        LabelSuiteAnnotationWorkspaceData: WorkspaceData;
      }).LabelSuiteAnnotationWorkspaceData;
      return typeof data.listReviewPoolItems === 'function';
    });
    expect(
      hasPublicQuery,
      'annotation-workspace data must export listReviewPoolItems',
    ).toBe(true);

    for (const seed of SEED_MATRIX) {
      const pools = await readReviewPoolItems(page, seed.taskId, seed.runType);
      expect(pools.awaitingArbitration, `${seed.taskId} awaiting`).toHaveLength(
        seed.awaiting,
      );
      expect(pools.pendingExceptions, `${seed.taskId} exceptions`).toHaveLength(
        seed.exceptions,
      );
      const identities = [
        ...pools.awaitingArbitration,
        ...pools.pendingExceptions,
      ].map(poolItemIdentity);
      expect(new Set(identities).size, `${seed.taskId} item identities`).toBe(
        identities.length,
      );
    }

    const t016 = await readReviewPoolItems(page, 'T016', 'official_run');
    expect(
      t016.awaitingArbitration
        .map(({ sampleId, annotatorId, outKey, key }) => ({
          sampleId,
          annotatorId,
          outKey,
          key,
        }))
        .sort((left, right) => left.sampleId.localeCompare(right.sampleId)),
    ).toEqual([
      {
        sampleId: 'ofm-03-awaiting-arbitration',
        annotatorId: 'kioleemg12',
        outKey: 'single_label',
        key: 'single_label',
      },
      {
        sampleId: 'ofm-04-reviewer-bypass',
        annotatorId: 'kioleemg12',
        outKey: 'single_label',
        key: 'single_label',
      },
    ]);
    expect(
      t016.pendingExceptions.map(({ sampleId, annotatorId, outKey, key }) => ({
        sampleId,
        annotatorId,
        outKey,
        key,
      })),
    ).toEqual([
      {
        sampleId: 'ofm-05-final-exception',
        annotatorId: 'kioleemg12',
        outKey: 'single_label',
        key: 'single_label',
      },
    ]);
  });

  test('Member Management renders the live seed matrix instead of fallback counters', async ({
    page,
  }) => {
    for (const seed of MEMBER_MATRIX) {
      await expectMemberPools(
        page,
        seed.taskId,
        seed.awaiting,
        seed.exceptions,
      );
    }
  });

  test('Annotation Progress and Dashboard retain their seeded item and unit semantics', async ({
    page,
  }) => {
    await expectProgressExceptions(page, 'T014', 'r1', []);
    await expectProgressExceptions(page, 'T015', 'official', []);
    await expectProgressExceptions(page, 'T016', 'official', [
      'ofm-05-final-exception',
    ]);

    // Dashboard counts disputed review units, not either item pool and not a
    // general `awaitingArbitration + pendingExceptions` formula.
    await expectDashboardDisputed(page, 3);
  });

  test('one multi-output unit keeps item identities through every live pool state', async ({
    page,
  }) => {
    await installMultiOutputFixture(page);

    // Mutation guards: the first state fails a per-unit collapse or a
    // single_label-only derivation; the last two states fail if either the
    // item-level finalized_by or exception-pool filter is removed.
    await test.step('all three configured output items initially await arbitration', async () => {
      await expectMultiOutputPoolsAfterReload(page, {
        awaitingArbitration: [
          ['free_text', 'free_text'],
          ['single_dim', 'single_dim'],
          ['single_label', 'single_label'],
        ],
        pendingExceptions: [],
      });
    });

    await test.step('reject moves only the addressed item to pending exceptions', async () => {
      await submitMultiOutputArbitration(page, {
        itemId: 'free_text::free_text',
        choice: 'reject',
        reason: 'Neither text answer is acceptable',
      });
      await expectMultiOutputPoolsAfterReload(page, {
        awaitingArbitration: [
          ['single_dim', 'single_dim'],
          ['single_label', 'single_label'],
        ],
        pendingExceptions: [['free_text', 'free_text']],
      });
    });

    await test.step('a partially finalized item leaves both live pools', async () => {
      await submitMultiOutputArbitration(page, {
        itemId: 'single_dim::single_dim',
        choice: 'adopt_b',
        value: 5,
        reason: 'Adopt the reviewer score',
      });
      await expectMultiOutputPoolsAfterReload(page, {
        awaitingArbitration: [['single_label', 'single_label']],
        pendingExceptions: [['free_text', 'free_text']],
      });
      const finalizedBy = await page.evaluate(
        ({ taskId, sampleId, annotatorId }) => {
          const data = (window as unknown as {
            LabelSuiteAnnotationWorkspaceData: WorkspaceData;
          }).LabelSuiteAnnotationWorkspaceData;
          return data.getArbitrationState(
            taskId,
            'official_run',
            sampleId,
            { annotatorId },
          )['single_dim::single_dim']?.finalized_by;
        },
        {
          taskId: MULTI_OUTPUT_TASK,
          sampleId: MULTI_OUTPUT_SAMPLE,
          annotatorId: MULTI_OUTPUT_ANNOTATOR,
        },
      );
      expect(finalizedBy).toBe('reviewer_chen');
    });

    await test.step('an exception-pool record removes only its pending item', async () => {
      await resolveMultiOutputException(page);
      await expectMultiOutputPoolsAfterReload(page, {
        awaitingArbitration: [['single_label', 'single_label']],
        pendingExceptions: [],
      });
      const exceptionAction = await page.evaluate(
        ({ taskId, sampleId, annotatorId }) => {
          const data = (window as unknown as {
            LabelSuiteAnnotationWorkspaceData: WorkspaceData;
          }).LabelSuiteAnnotationWorkspaceData;
          return data.getExceptionPool(
            taskId,
            'official_run',
            sampleId,
            { annotatorId },
          ).free_text?.action;
        },
        {
          taskId: MULTI_OUTPUT_TASK,
          sampleId: MULTI_OUTPUT_SAMPLE,
          annotatorId: MULTI_OUTPUT_ANNOTATOR,
        },
      );
      expect(exceptionAction).toBe('adopt_annotator');
    });
  });

  test('adopting A finalizes one item and persists reduced pools after reload', async ({
    page,
  }) => {
    await openT016Arbitration(page, 'ofm-03-awaiting-arbitration');
    await page.getByTestId('ws-arbitration-choose-a').click();
    await page.getByTestId('ws-arbitration-submit').click();
    await expect(page.getByTestId('ws-review-finalized-card')).toBeVisible();

    await page.reload();
    await expect(page.getByTestId('ws-review-finalized-card')).toBeVisible();
    await expect(page.getByTestId('ws-arbitration-card')).toHaveCount(0);

    await expectProgressExceptions(page, 'T016', 'official', [
      'ofm-05-final-exception',
    ]);
    await expectDashboardDisputed(page, 2);
    await expectMemberPools(page, 'T016', 1, 1);
  });

  test('reject moves an item to exceptions while reload keeps the re-vote entry', async ({
    page,
  }) => {
    await openT016Arbitration(page, 'ofm-03-awaiting-arbitration');
    await page.getByTestId('ws-arbitration-choose-reject').click();
    await fillArbitrationReasons(page, 'Both proposed values lack support');
    await page.getByTestId('ws-arbitration-submit').click();
    await expect(page.getByTestId('ws-arbitration-card')).toBeVisible();

    await page.reload();
    const item = page.getByTestId('ws-arbitration-item').first();
    await expect(page.getByTestId('ws-arbitration-card')).toBeVisible();
    await expect(item.getByTestId('ws-arbitration-choose-a')).toBeVisible();
    await expect(item.getByTestId('ws-arbitration-choose-b')).toBeVisible();
    await expect(item.getByTestId('ws-arbitration-choose-reject')).toBeVisible();

    await expectProgressExceptions(page, 'T016', 'official', [
      'ofm-03-awaiting-arbitration',
      'ofm-05-final-exception',
    ]);
    await expectDashboardDisputed(page, 3);
    await expectMemberPools(page, 'T016', 1, 2);
  });

  test('project-leader disposition clears the exception and updates unit state after reload', async ({
    page,
  }) => {
    await page.goto(projectLeaderExceptionUrl('ofm-05-final-exception'));
    await expect(page.getByTestId('ws-exception-pool')).toBeVisible();
    // issue #920: disposition is now select-then-confirm -- selecting the
    // action alone no longer writes, so a reason must be filled and the
    // unified confirm control clicked before the pool clears.
    await page
      .getByTestId('ws-exception-pool-action-adopt_annotator')
      .click();
    await page.getByTestId('ws-exception-pool-reason').fill('採用標記員原答案（測試理由）');
    await page.getByTestId('ws-exception-pool-confirm').click();
    await expect(page.getByTestId('ws-exception-pool')).toHaveCount(0);

    await page.reload();
    await expect(page.getByTestId('ws-exception-pool')).toHaveCount(0);

    await expectProgressExceptions(page, 'T016', 'official', []);
    await expectDashboardDisputed(page, 2);
    await expectMemberPools(page, 'T016', 2, 0);
  });
});
