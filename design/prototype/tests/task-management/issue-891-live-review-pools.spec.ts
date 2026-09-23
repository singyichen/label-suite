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

async function openMemberManagement(page: Page, taskId: string): Promise<void> {
  await page.goto(`${TASK_DETAIL_URL}?task_id=${taskId}`);
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
): Promise<void> {
  await openMemberManagement(page, taskId);
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

  test('Member Management and Annotation Progress consume the same public pool query', async ({
    page,
  }) => {
    await patchDataFile(page, 'annotation-workspace.data.js', `
      var data = window.LabelSuiteAnnotationWorkspaceData;
      data.listReviewPoolItems = function(taskId, runType) {
        if (taskId !== 'T016' || runType !== 'official_run') {
          return { awaitingArbitration: [], pendingExceptions: [] };
        }
        function item(sampleId) {
          return {
            taskId: taskId,
            runType: runType,
            sampleId: sampleId,
            annotatorId: 'kioleemg12',
            outKey: 'single_label',
            outputType: 'single_label',
            key: 'single_label',
            reviewerIds: ['reviewer_li'],
            arbiterId: 'reviewer_chen',
            reason: 'seam fixture',
            fellAt: '2026-09-23T00:00:00.000Z'
          };
        }
        return {
          awaitingArbitration: [item('seam-awaiting-01'), item('seam-awaiting-02')],
          pendingExceptions: [item('seam-exception-01'), item('seam-exception-02')]
        };
      };
    `);

    await expectMemberPools(page, 'T016', 2, 2);
    // The helper now reports four pool items, but Dashboard must stay on its
    // independent review-unit count instead of displaying 2 + 2 as disputed.
    await expectDashboardDisputed(page, 3);
    await expectProgressExceptions(page, 'T016', 'official', [
      'seam-exception-01',
      'seam-exception-02',
    ]);
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
    await page
      .getByTestId('ws-exception-pool-action-adopt_annotator')
      .click();
    await expect(page.getByTestId('ws-exception-pool')).toHaveCount(0);

    await page.reload();
    await expect(page.getByTestId('ws-exception-pool')).toHaveCount(0);

    await expectProgressExceptions(page, 'T016', 'official', []);
    await expectDashboardDisputed(page, 2);
    await expectMemberPools(page, 'T016', 2, 0);
  });
});
