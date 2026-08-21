import { expect, test } from '@playwright/test';

const TASK_LIST_URL =
  '/pages/task-management/task-list.html?task_role=super_admin';

const OUTPUT_TYPE_KEYS = [
  'single_label',
  'multi_label',
  'single_dim',
  'multi_dim',
  'sequence_tagging',
  'entity_recognition',
  'relation_identification',
  'free_text',
];

const EXAMPLE_DATA_FILES = [
  'absa-va.json',
  'entity-recognition.json',
  'free-text.json',
  'medical-ner-re.json',
  'mrc.json',
  'multi-dim.json',
  'multi-label-hierarchical.json',
  'multi-label.json',
  'nli.json',
  'relation-identification.json',
  'review-flow-dry-run.json',
  'review-flow-official-multi.json',
  'review-flow-official-single.json',
  'review-flow-official-tie.json',
  'sequence-tagging.json',
  'single-dim.json',
  'single-label.json',
];

const FILTER_COUNTS: Record<string, number> = {
  single_label: 6,
  multi_label: 2,
  single_dim: 1,
  multi_dim: 2,
  sequence_tagging: 1,
  entity_recognition: 3,
  relation_identification: 3,
  free_text: 2,
};

type TaskListWindow = Window & {
  TASKS: Array<{
    id: string;
    nameZh: string;
    nameEn: string;
    sourceFile: string;
    outputTypes: string[];
    runType: string;
    status: string;
    updatedAt: string;
    canViewDetail: boolean;
    isMine: boolean;
    deletedAt: string;
  }>;
  render: () => void;
};

async function visibleSourceFiles(
  rows: import('@playwright/test').Locator,
): Promise<string[]> {
  return rows.evaluateAll((elements) =>
    elements
      .map((element) => element.getAttribute('data-source-file'))
      .filter((value): value is string => value !== null),
  );
}

test.describe('Task list output-type model', () => {
  test('renders the 17 illustrative example-data tasks and canonical filter', async ({
    page,
  }) => {
    await page.goto(TASK_LIST_URL);

    await expect(page.locator('#thTaskType')).toHaveText('輸出類型');

    const rows = page.locator('#taskTableBody tr[data-source-file]');
    await expect(rows).toHaveCount(17);

    const sourceFiles = await rows.evaluateAll((elements) =>
      elements
        .map((element) => element.getAttribute('data-source-file'))
        .filter((value): value is string => value !== null)
        .sort(),
    );
    expect(sourceFiles).toEqual([...EXAMPLE_DATA_FILES].sort());

    const filter = page.locator('#outputTypeFilter');
    await expect(filter).toHaveValue('');
    await expect(filter.locator('option')).toHaveCount(9);
    expect(await filter.locator('option').evaluateAll((options) =>
      options.map((option) => (option as HTMLOptionElement).value),
    )).toEqual(['', ...OUTPUT_TYPE_KEYS]);
    await expect(filter.locator('option').first()).toHaveText('全部輸出類型');
  });

  test('treats a missing task-list data module as a load failure', async ({
    page,
  }) => {
    await page.route('**/task-list.data.js', (route) => route.abort('failed'));
    await page.goto(TASK_LIST_URL);

    await expect(page.locator('#taskTableBody tr.error-row')).toContainText(
      '任務列表載入失敗',
    );
  });

  test('renders one read-only tag per output in composite tasks', async ({
    page,
  }) => {
    await page.goto(TASK_LIST_URL);

    const medicalRow = page.locator(
      '#taskTableBody tr[data-source-file="medical-ner-re.json"]',
    );
    await expect(medicalRow.locator('.output-type-tag')).toHaveText([
      '實體辨識',
      '關係識別',
    ]);

    const absaRow = page.locator(
      '#taskTableBody tr[data-source-file="absa-va.json"]',
    );
    await expect(absaRow.locator('.output-type-tag')).toHaveText([
      '實體辨識',
      '關係識別',
      '多維度',
    ]);
  });

  test('matches composite tasks when they contain the selected output type', async ({
    page,
  }) => {
    await page.goto(TASK_LIST_URL);
    const filter = page.locator('#outputTypeFilter');
    const rows = page.locator('#taskTableBody tr[data-source-file]');

    await filter.selectOption('entity_recognition');
    await expect(rows).toHaveCount(3);
    expect(await visibleSourceFiles(rows)).toEqual([
      'entity-recognition.json',
      'medical-ner-re.json',
      'absa-va.json',
    ]);

    await filter.selectOption('relation_identification');
    await expect(rows).toHaveCount(3);
    expect(await visibleSourceFiles(rows)).toEqual([
      'relation-identification.json',
      'medical-ner-re.json',
      'absa-va.json',
    ]);

    await filter.selectOption('multi_dim');
    await expect(rows).toHaveCount(2);
    expect(await visibleSourceFiles(rows)).toEqual([
      'multi-dim.json',
      'absa-va.json',
    ]);
  });

  test('returns the documented task count for every canonical output filter', async ({
    page,
  }) => {
    await page.goto(TASK_LIST_URL);
    const filter = page.locator('#outputTypeFilter');
    const rows = page.locator('#taskTableBody tr[data-source-file]');

    for (const [outputType, count] of Object.entries(FILTER_COUNTS)) {
      await filter.selectOption(outputType);
      await expect(rows).toHaveCount(count);
    }
  });

  test('renders and filters a fourteenth legal task without a task-specific branch', async ({
    page,
  }) => {
    await page.goto(TASK_LIST_URL);

    await page.evaluate(() => {
      const taskListWindow = window as unknown as TaskListWindow;
      taskListWindow.TASKS.push({
        id: 'EX014',
        nameZh: '分類附理由',
        nameEn: 'Classification with rationale',
        sourceFile: 'synthetic-fourteenth.json',
        outputTypes: ['single_label', 'free_text'],
        runType: 'official_run',
        status: 'draft',
        updatedAt: '2026-07-29',
        canViewDetail: true,
        isMine: true,
        deletedAt: '',
      });
      taskListWindow.render();
    });

    const row = page.locator(
      '#taskTableBody tr[data-source-file="synthetic-fourteenth.json"]',
    );
    await expect(row.locator('.output-type-tag')).toHaveText([
      '單一標籤',
      '自由文字',
    ]);

    await page.locator('#outputTypeFilter').selectOption('free_text');
    await expect(row).toBeVisible();
  });

  test('keeps a three-tag composite row contained at every required viewport', async ({
    page,
  }) => {
    for (const width of [375, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(TASK_LIST_URL);

      const tagGroup = page
        .locator('#taskTableBody tr[data-source-file="absa-va.json"]')
        .locator('.output-type-tags');
      await expect(tagGroup.locator('.output-type-tag')).toHaveCount(3);
      await expect(tagGroup).toHaveCSS('flex-wrap', 'wrap');

      const dimensions = await tagGroup.evaluate((element) => ({
        clientWidth: element.clientWidth,
        scrollWidth: element.scrollWidth,
      }));
      expect(dimensions.scrollWidth).toBeLessThanOrEqual(
        dimensions.clientWidth,
      );
    }
  });

  test('updates filter and output tags to the English peer labels', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('labelsuite.lang', 'en');
    });
    await page.goto(TASK_LIST_URL);

    await expect(page.locator('#thTaskType')).toHaveText('Output types');
    await expect(page.locator('#outputTypeFilter option')).toHaveText([
      'All output types',
      'Single label',
      'Multi-label',
      'Single dimension',
      'Multi-dimension',
      'Sequence Tagging',
      'Entity Recognition',
      'Relation Identification',
      'Free text',
    ]);

    await expect(
      page
        .locator(
          '#taskTableBody tr[data-source-file="medical-ner-re.json"]',
        )
        .locator('.output-type-tag'),
    ).toHaveText(['Entity Recognition', 'Relation Identification']);
  });
});
