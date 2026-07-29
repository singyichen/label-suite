import { expect, test, type Page } from '@playwright/test';

const DASHBOARD_URL = '/pages/dashboard/dashboard.html';

test.describe.configure({ mode: 'serial' });

const OUTPUT_TYPE_KEYS = [
  'single_label',
  'multi_label',
  'single_dim',
  'multi_dim',
  'sequence_tagging',
  'entity_recognition',
  'relation_identification',
  'free_text',
] as const;

const EXAMPLE_DATA_FILES = [
  'single-label.json',
  'multi-label.json',
  'multi-label-hierarchical.json',
  'single-dim.json',
  'multi-dim.json',
  'sequence-tagging.json',
  'entity-recognition.json',
  'relation-identification.json',
  'free-text.json',
  'medical-ner-re.json',
  'nli.json',
  'mrc.json',
  'absa-va.json',
] as const;

const ROLE_EXPECTATIONS = {
  super_admin_data: {
    testId: 'super-admin-view',
    listId: 'adminTaskList',
    taskIds: ['T002', 'T005', 'T010'],
  },
  project_leader: {
    testId: 'project-leader-view',
    listId: 'plTaskList',
    taskIds: ['T003', 'T007', 'T010'],
  },
  annotator: {
    testId: 'annotator-view',
    listId: 'annotatorTaskList',
    taskIds: [
      'T001', 'T002', 'T003', 'T004', 'T005', 'T006', 'T007',
      'T008', 'T009', 'T010', 'T011', 'T012', 'T013',
    ],
  },
  reviewer: {
    testId: 'reviewer-view',
    listId: 'reviewerTaskList',
    taskIds: [
      'T001', 'T002', 'T003', 'T004', 'T005', 'T006', 'T007',
      'T008', 'T009', 'T010', 'T011', 'T012', 'T013',
    ],
  },
} as const;

const ANNOTATION_ROUTE_TYPES = [
  'single_sentence_classification',
  'single_sentence_va_scoring',
  'sequence_labeling',
  'relation_extraction',
  'sentence_pairs',
] as const;

type LocalizedText = {
  zh: string;
  en: string;
};

type DashboardTask = {
  id: string;
  nameZh: string;
  nameEn: string;
  sourceFile: string;
  outputTypes: string[];
};

type DashboardRoleTask = {
  exampleTaskId: string;
  navigationTaskId: string;
  latestUnfinishedSampleId: string;
  annotationTaskType: string;
  runType: string;
  progress: number;
  detail: LocalizedText;
  runTypeText: LocalizedText;
  runTypeClass: string;
  statusText: LocalizedText;
  statusClass: string;
  actionText: LocalizedText;
  subType?: string;
};

type DashboardWindow = Window & {
  LabelSuiteDashboard: {
    data: {
      outputTypes: Array<{ key: string }>;
      tasks: DashboardTask[];
      roleLists: Record<string, DashboardRoleTask[]>;
    };
    renderTaskLists: () => void;
  };
};

async function openScenario(
  page: Page,
  scenario: keyof typeof ROLE_EXPECTATIONS,
) {
  await page.goto(DASHBOARD_URL);
  await page
    .locator(`.scenario-pill[data-scenario="${scenario}"]`)
    .click();
}

test.describe('Dashboard output-type task summaries', () => {
  test('loads the eight-output registry and all 13 safe example summaries', async ({
    page,
  }) => {
    await page.goto(DASHBOARD_URL);

    const dashboardData = await page.evaluate(() => {
      const dashboardWindow = window as unknown as DashboardWindow;
      return dashboardWindow.LabelSuiteDashboard.data;
    });

    expect(dashboardData.outputTypes.map((item) => item.key)).toEqual(
      OUTPUT_TYPE_KEYS,
    );
    expect(dashboardData.tasks).toHaveLength(13);
    expect(dashboardData.tasks.map((task) => task.sourceFile).sort()).toEqual(
      [...EXAMPLE_DATA_FILES].sort(),
    );
    const outputsBySource = Object.fromEntries(
      dashboardData.tasks.map((task) => [
        task.sourceFile,
        task.outputTypes,
      ]),
    );
    expect(outputsBySource['medical-ner-re.json']).toEqual([
      'entity_recognition',
      'relation_identification',
    ]);
    expect(outputsBySource['absa-va.json']).toEqual([
      'entity_recognition',
      'relation_identification',
      'multi_dim',
    ]);
    expect(
      dashboardData.tasks.every(
        (task) =>
          task.outputTypes.length > 0
          && task.outputTypes.every((outputType) =>
            OUTPUT_TYPE_KEYS.includes(
              outputType as (typeof OUTPUT_TYPE_KEYS)[number],
            ),
          ),
      ),
    ).toBe(true);

    const serialized = JSON.stringify(dashboardData).toLowerCase();
    for (const forbidden of [
      'ground_truth',
      'gold_label',
      'reference',
      'correct_label',
      'solution',
    ]) {
      expect(serialized).not.toContain(forbidden);
    }
  });

  for (const [scenario, expectation] of Object.entries(ROLE_EXPECTATIONS)) {
    test(`${scenario} renders output tags from its example-task subset`, async ({
      page,
    }) => {
      await openScenario(
        page,
        scenario as keyof typeof ROLE_EXPECTATIONS,
      );

      const view = page.getByTestId(expectation.testId);
      const rows = view.locator(`#${expectation.listId} [data-example-task-id]`);
      await expect(rows).toHaveCount(expectation.taskIds.length);
      expect(await rows.evaluateAll((elements) =>
        elements.map((element) => element.getAttribute('data-example-task-id')),
      )).toEqual(expectation.taskIds);

      for (const row of await rows.all()) {
        const group = row.locator('.output-type-tags');
        await expect(group).toHaveAttribute('role', 'group');
        await expect(group.locator('.output-type-tag')).not.toHaveCount(0);
      }
    });
  }

  test('renders every output of composite tasks in source order', async ({
    page,
  }) => {
    await openScenario(page, 'super_admin_data');

    const compositeRow = page.locator(
      '#adminTaskList [data-example-task-id="T010"]',
    );
    await expect(compositeRow.locator('.output-type-tag')).toHaveText([
      '實體辨識',
      '關係識別',
    ]);
    await expect(compositeRow.locator('.output-type-tags')).toHaveAttribute(
      'aria-label',
      '輸出類型：實體辨識、關係識別',
    );
  });

  for (const role of ['annotator', 'reviewer'] as const) {
    test(`${role} exposes all 13 tasks with independent workspace routes`, async ({
      page,
    }) => {
      await openScenario(page, role);

      const entries = await page.evaluate((roleKey) => {
        const dashboardWindow = window as unknown as DashboardWindow;
        return dashboardWindow.LabelSuiteDashboard.data.roleLists[roleKey];
      }, role);
      expect(entries.map((entry) => entry.exampleTaskId)).toEqual(
        ROLE_EXPECTATIONS[role].taskIds,
      );
      expect(new Set(entries.map((entry) => entry.navigationTaskId)).size)
        .toBe(13);
      expect(entries.every((entry) =>
        Boolean(entry.latestUnfinishedSampleId)
        && ANNOTATION_ROUTE_TYPES.includes(
          entry.annotationTaskType as (typeof ANNOTATION_ROUTE_TYPES)[number],
        ),
      )).toBe(true);

      const lastTask = page.locator(
        `#${ROLE_EXPECTATIONS[role].listId} `
        + '[data-example-task-id="T013"]',
      );
      const [response] = await Promise.all([
        page.waitForNavigation(),
        lastTask.getByRole('button').click(),
      ]);
      expect(response?.status()).toBe(200);
      await expect(page).toHaveURL(
        new RegExp(`role=${role}.*task_type=relation_extraction`),
      );
      await expect(page).toHaveURL(
        new RegExp(`task_id=TASK-015-${role === 'annotator' ? 'A' : 'R'}13`),
      );
    });
  }

  test('translates output tags without changing annotation routing metadata', async ({
    page,
  }) => {
    await openScenario(page, 'annotator');

    const firstRow = page.locator(
      '#annotatorTaskList [data-example-task-id="T003"]',
    );
    await expect(firstRow.locator('.output-type-tag')).toHaveText(['多標籤']);
    await page.getByTestId('lang-toggle').click();
    await expect(firstRow.locator('.output-type-tag')).toHaveText([
      'Multi-label',
    ]);

    await firstRow.getByRole('button', { name: /Continue/ }).click();
    await expect(page).toHaveURL(/task_type=single_sentence_classification/);
    await expect(page).toHaveURL(/task_id=TASK-015-A1/);
  });

  test('renders a fourteenth legal output composition without a task-specific branch', async ({
    page,
  }) => {
    await openScenario(page, 'annotator');

    await page.evaluate(() => {
      const dashboardWindow = window as unknown as DashboardWindow;
      dashboardWindow.LabelSuiteDashboard.data.tasks.push({
        id: 'T014',
        nameZh: '可讀性理由補充',
        nameEn: 'Readability with rationale',
        sourceFile: 'synthetic-fourteenth.json',
        outputTypes: ['single_dim', 'free_text'],
      });
      dashboardWindow.LabelSuiteDashboard.data.roleLists.annotator.push({
        exampleTaskId: 'T014',
        navigationTaskId: 'TASK-SYNTHETIC',
        latestUnfinishedSampleId: 'SYN-001',
        annotationTaskType: 'synthetic_config',
        runType: 'official_run',
        progress: 33,
        detail: {
          zh: '已完成 33% · 今日 3 筆',
          en: '33% Completed · 3 Today',
        },
        runTypeText: { zh: '正式標記', en: 'Official Run' },
        runTypeClass: 'badge-official',
        statusText: { zh: '進行中', en: 'In Progress' },
        statusClass: 'badge-info',
        actionText: { zh: '快速繼續', en: 'Continue' },
      });
      dashboardWindow.LabelSuiteDashboard.renderTaskLists();
    });

    const syntheticRow = page.locator(
      '#annotatorTaskList [data-example-task-id="T014"]',
    );
    await expect(syntheticRow.locator('.output-type-tag')).toHaveText([
      '單維度',
      '自由文字',
    ]);
  });
});
