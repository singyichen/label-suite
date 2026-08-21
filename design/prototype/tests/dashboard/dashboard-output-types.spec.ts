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
  'review-flow-dry-run.json',
  'review-flow-official-single.json',
  'review-flow-official-multi.json',
  'review-flow-official-tie.json',
] as const;

/* T014-T017 are the review-flow demo tasks: annotation-workspace.data.js
 * stages their submission/review states in localStorage at boot (the
 * labelsuite.reviewFlowDemoSeed.v1 seeder), so their first sample rows may
 * legitimately start out submitted. The fresh-first-sample invariant below
 * only holds for the un-staged T001-T013 baseline. */
const DEMO_STAGED_TASK_IDS = new Set(['T014', 'T015', 'T016', 'T017']);

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
      'T014', 'T015', 'T016', 'T017',
    ],
  },
  reviewer: {
    testId: 'reviewer-view',
    listId: 'reviewerTaskList',
    taskIds: [
      'T001', 'T002', 'T003', 'T004', 'T005', 'T006', 'T007',
      'T008', 'T009', 'T010', 'T011', 'T012', 'T013',
      'T014', 'T015', 'T016', 'T017',
    ],
  },
} as const;

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
  latestUnfinishedSampleId: string;
  runType: string;
  progress: number;
  detail: LocalizedText;
  runTypeText: LocalizedText;
  runTypeClass: string;
  statusText: LocalizedText;
  statusClass: string;
  actionText: LocalizedText;
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

/* Same TaskProfile shape the annotation workspace/list pages load via
 * <script src="task-detail.data.js">; used to verify the workspace
 * genuinely resolved task_id/sample_id from the URL without depending on
 * any workspace-internal global (e.g. the old SAMPLES/state.currentIdx). */
type TaskDetailProfile = {
  fieldRoleMap: Record<string, string>;
  datasetRecords: Array<Record<string, unknown>>;
};

type TaskDetailWindow = Window & {
  LabelSuiteTaskDetailData?: {
    profiles: Record<string, TaskDetailProfile>;
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
  test('loads the eight-output registry and all 17 safe example summaries', async ({
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
    expect(dashboardData.tasks).toHaveLength(17);
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
    test(`${role} exposes all 17 tasks with independent workspace routes`, async ({
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
      expect(entries.every((entry) =>
        Boolean(entry.latestUnfinishedSampleId),
      )).toBe(true);

      for (const entry of entries) {
        const query = new URLSearchParams({
          task_id: entry.exampleTaskId,
          sample_id: entry.latestUnfinishedSampleId,
          role,
          run_type: entry.runType,
        });

        const response = await page.goto(
          `/pages/annotation/annotation-workspace.html?${query.toString()}`,
        );
        expect(response?.status()).toBe(200);

        // task_id consumed correctly: the rendered sample list length must
        // match what the resolved TaskProfile implies for this role, sourced
        // from the same public data globals the workspace itself loads.
        // An annotator's list is one entry per dataset record, but a reviewer
        // works one REVIEW UNIT at a time (sample × annotator, spec 015
        // v4.3.0 FR-056), so their list is the flattened annotator roster --
        // the same getReviewerMockRows() rows annotation-list flattens.
        const expectedCount = await page.evaluate(
          ({ taskId, roleKey }) => {
            const detailWindow = window as unknown as TaskDetailWindow;
            const profile = detailWindow.LabelSuiteTaskDetailData?.profiles[taskId];
            if (!profile) return null;
            if (roleKey !== 'reviewer') return profile.datasetRecords.length;
            const workspaceData = (
              window as unknown as {
                LabelSuiteAnnotationWorkspaceData: {
                  getRecordId: (record: Record<string, unknown>, index: number) => string;
                  getReviewerMockRows: (profileId: string, recordId: string) => unknown[];
                };
              }
            ).LabelSuiteAnnotationWorkspaceData;
            return profile.datasetRecords.reduce(
              (total, record, index) =>
                total +
                workspaceData.getReviewerMockRows(
                  taskId,
                  workspaceData.getRecordId(record, index),
                ).length,
              0,
            );
          },
          { taskId: entry.exampleTaskId, roleKey: role },
        );
        if (expectedCount === null) {
          throw new Error(`No TaskDetailData profile found for ${entry.exampleTaskId}`);
        }
        await expect(page.getByTestId('ws-sample-item')).toHaveCount(expectedCount);

        // sample_id consumed correctly: the input area must surface the
        // 'input'-role field of the exact record matching latestUnfinishedSampleId.
        const inputSnippet = await page.evaluate(
          ({ taskId, sampleId }) => {
            const detailWindow = window as unknown as TaskDetailWindow;
            const profile = detailWindow.LabelSuiteTaskDetailData?.profiles[taskId];
            if (!profile) return null;
            const record = profile.datasetRecords.find((candidate) => {
              const rawId = candidate['id'] ?? candidate['ID'] ?? candidate['article_id'];
              return String(rawId) === sampleId;
            });
            if (!record) return null;
            // A TaskProfile may declare multiple 'input'-role fields (e.g.
            // T013's absa_va composed input carries both a structured
            // `utterances` array and its flattened `text` string
            // representation). Only a string-shaped field can ever appear
            // verbatim as a substring of the rendered ws-input-content DOM
            // text, so skip non-string input-role fields instead of only
            // ever checking the first-declared one (mirrors
            // annotation-list.html's getRecordSnippet(), which stringifies
            // every input field rather than assuming the first is a scalar).
            const inputFields = Object.keys(profile.fieldRoleMap).filter(
              (field) => profile.fieldRoleMap[field] === 'input',
            );
            const stringField = inputFields.find(
              (field) => typeof record[field] === 'string',
            );
            const value = stringField ? record[stringField] : undefined;
            return typeof value === 'string' ? value.slice(0, 8) : null;
          },
          { taskId: entry.exampleTaskId, sampleId: entry.latestUnfinishedSampleId },
        );
        if (inputSnippet === null) {
          throw new Error(
            `No input-role snippet resolved for ${entry.exampleTaskId}/${entry.latestUnfinishedSampleId}`,
          );
        }
        await expect(page.getByTestId('ws-input-content')).toContainText(inputSnippet);

        // The URL's sample is a fresh, unfinished sample — the corresponding
        // row must not already carry the submitted contract flag. Demo-staged
        // tasks (T014-T017) are exempt: their boot-time localStorage seeder
        // legitimately pre-submits first rows (see DEMO_STAGED_TASK_IDS).
        if (!DEMO_STAGED_TASK_IDS.has(entry.exampleTaskId)) {
          await expect(
            page.getByTestId('ws-sample-item').first(),
          ).not.toHaveAttribute('data-submitted', 'true');
        }
      }
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
    await expect(page).toHaveURL(/task_id=T003/);
    await expect(page).not.toHaveURL(/task_type=/);
  });

  test('renders an extra legal output composition without a task-specific branch', async ({
    page,
  }) => {
    await openScenario(page, 'annotator');

    // T999 mirrors the impossible-id idiom used by the not-found specs;
    // T014 is now a real review-flow demo task and would collide.
    await page.evaluate(() => {
      const dashboardWindow = window as unknown as DashboardWindow;
      dashboardWindow.LabelSuiteDashboard.data.tasks.push({
        id: 'T999',
        nameZh: '可讀性理由補充',
        nameEn: 'Readability with rationale',
        sourceFile: 'synthetic-fourteenth.json',
        outputTypes: ['single_dim', 'free_text'],
      });
      dashboardWindow.LabelSuiteDashboard.data.roleLists.annotator.push({
        exampleTaskId: 'T999',
        latestUnfinishedSampleId: 'SYN-001',
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
      '#annotatorTaskList [data-example-task-id="T999"]',
    );
    await expect(syntheticRow.locator('.output-type-tag')).toHaveText([
      '單維度',
      '自由文字',
    ]);
  });
});
